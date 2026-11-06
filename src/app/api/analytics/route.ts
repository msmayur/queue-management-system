
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";




const querySchema = z.object({
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
        .optional(),
});

const TIME_ZONE = "Asia/Kolkata";

function getIndiaDate() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

function getDayRange(date: string) {
    // India does not observe daylight saving time.
    const start = new Date(`${date}T00:00:00+05:30`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    return { start, end };
}

function averageMinutes(
    records: {
        start: Date | null;
        end: Date | null;
    }[]
) {
    const validRecords = records.filter(
        (
            record
        ): record is {
            start: Date;
            end: Date;
        } => record.start !== null && record.end !== null
    );

    if (validRecords.length === 0) {
        return 0;
    }

    const totalMilliseconds = validRecords.reduce(
        (total, record) =>
            total + (record.end.getTime() - record.start.getTime()),
        0
    );

    return Number(
        (totalMilliseconds / validRecords.length / 60000).toFixed(2)
    );
}

// GET /api/analytics?date=2026-11-05

export async function GET(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);

        const parsedQuery = querySchema.safeParse({
            date: searchParams.get("date") ?? undefined,
        });

        if (!parsedQuery.success) {
            return NextResponse.json(
                {
                    message: "Invalid date",
                    errors: parsedQuery.error.flatten().fieldErrors,
                },
                { status: 400 }
            );
        }

        const selectedDate = parsedQuery.data.date ?? getIndiaDate();

        const [year, month, day] = selectedDate.split("-").map(Number);

        const date = new Date(Date.UTC(year, month - 1, day));

        const isValidDate =
            date.getUTCFullYear() === year &&
            date.getUTCMonth() === month - 1 &&
            date.getUTCDate() === day;

        if (!isValidDate) {
            return NextResponse.json(
                { message: "Invalid calendar date" },
                { status: 400 }
            );
        }

        const { start, end } = getDayRange(selectedDate);

        if (start.getTime() > Date.now()) {
            return NextResponse.json(
                { message: "Future dates are not supported" },
                { status: 400 }
            );
        }

        // Get only queues belonging to the logged-in manager.
        const queues = await prisma.queue.findMany({
            where: {
                managerId: session.user.id,
            },
            select: {
                id: true,
                name: true,
            },
        });

        const queueIds = queues.map((queue) => queue.id);

        if (queueIds.length === 0) {
            return NextResponse.json({
                date: selectedDate,
                summary: {
                    totalQueues: 0,
                    totalTokens: 0,
                    tokensGeneratedToday: 0,
                    waitingTokens: 0,
                    servingTokens: 0,
                    completedToday: 0,
                    cancelledToday: 0,
                    averageWaitingTime: 0,
                    averageServiceTime: 0,
                },
                queueLengthTrend: [],
                queues: [],
            });
        }

        const queueFilter = {
            queueId: {
                in: queueIds,
            },
        };

        // Run independent database queries concurrently.
        const [
            totalTokens,
            tokensGeneratedToday,
            waitingTokens,
            servingTokens,
            completedToday,
            cancelledToday,
            waitingTimeRecords,
            serviceTimeRecords,
            previousEventCounts,
            todayEvents,
            queueStats,
        ] = await Promise.all([
            // All-time generated tokens.
            prisma.token.count({
                where: queueFilter,
            }),

            // Tokens created on the selected date.
            prisma.token.count({
                where: {
                    ...queueFilter,
                    createdAt: {
                        gte: start,
                        lt: end,
                    },
                },
            }),

            // Current waiting tokens.
            prisma.token.count({
                where: {
                    ...queueFilter,
                    status: "WAITING",
                },
            }),

            // Current serving tokens.
            prisma.token.count({
                where: {
                    ...queueFilter,
                    status: "SERVING",
                },
            }),

            // Tokens completed on the selected date.
            prisma.token.count({
                where: {
                    ...queueFilter,
                    status: "COMPLETED",
                    completedAt: {
                        gte: start,
                        lt: end,
                    },
                },
            }),

            // Tokens cancelled on the selected date.
            prisma.token.count({
                where: {
                    ...queueFilter,
                    status: "CANCELLED",
                    cancelledAt: {
                        gte: start,
                        lt: end,
                    },
                },
            }),

            // Waiting-time records for tokens assigned on this date.
            prisma.token.findMany({
                where: {
                    ...queueFilter,
                    assignedAt: {
                        gte: start,
                        lt: end,
                    },
                },
                select: {
                    createdAt: true,
                    assignedAt: true,
                },
            }),

            // Service-time records for tokens completed on this date.
            prisma.token.findMany({
                where: {
                    ...queueFilter,
                    status: "COMPLETED",
                    completedAt: {
                        gte: start,
                        lt: end,
                    },
                },
                select: {
                    assignedAt: true,
                    completedAt: true,
                },
            }),

            // Reconstruct the waiting count at the beginning of the day.
            prisma.queueEvent.groupBy({
                by: ["type"],
                where: {
                    ...queueFilter,
                    createdAt: {
                        lt: start,
                    },
                },
                _count: {
                    _all: true,
                },
            }),

            // Events occurring during the selected date.
            prisma.queueEvent.findMany({
                where: {
                    ...queueFilter,
                    createdAt: {
                        gte: start,
                        lt: end,
                    },
                },
                select: {
                    type: true,
                    createdAt: true,
                },
                orderBy: {
                    createdAt: "asc",
                },
            }),

            // Per-queue statistics.
            prisma.queue.findMany({
                where: {
                    managerId: session.user.id,
                },
                select: {
                    id: true,
                    name: true,
                    _count: {
                        select: {
                            tokens: true,
                        },
                    },
                },
            }),
        ]);

        const averageWaitingTime = averageMinutes(
            waitingTimeRecords.map((token) => ({
                start: token.createdAt,
                end: token.assignedAt,
            }))
        );

        const averageServiceTime = averageMinutes(
            serviceTimeRecords.map((token) => ({
                start: token.assignedAt,
                end: token.completedAt,
            }))
        );

        // Calculate waiting count before the selected date.
        let waitingAtStart = 0;

        for (const event of previousEventCounts) {
            const count = event._count._all;

            if (event.type === "TOKEN_CREATED") {
                waitingAtStart += count;
            } else if (
                event.type === "TOKEN_ASSIGNED" ||
                event.type === "TOKEN_CANCELLED"
            ) {
                waitingAtStart -= count;
            }
        }

        // Group today's events into hourly buckets.
        const hourlyChanges = Array.from(
            { length: 24 },
            () => 0
        );

        for (const event of todayEvents) {
            const hour = Math.floor(
                (event.createdAt.getTime() - start.getTime()) /
                (60 * 60 * 1000)
            );

            if (hour < 0 || hour >= 24) continue;

            if (event.type === "TOKEN_CREATED") {
                hourlyChanges[hour]++;
            } else if (
                event.type === "TOKEN_ASSIGNED" ||
                event.type === "TOKEN_CANCELLED"
            ) {
                hourlyChanges[hour]--;
            }
        }

        // For today, show only completed hours and the current hour.
        // For a previous date, show all 24 hours.
        const isToday = selectedDate === getIndiaDate();

        const currentHour = Number(
            new Intl.DateTimeFormat("en-US", {
                timeZone: TIME_ZONE,
                hour: "2-digit",
                hourCycle: "h23",
            }).format(new Date())
        );

        const numberOfHours = isToday ? currentHour + 1 : 24;

        let runningWaitingCount = waitingAtStart;

        const queueLengthTrend = Array.from(
            { length: numberOfHours },
            (_, hour) => {
                runningWaitingCount += hourlyChanges[hour];

                return {
                    hour: `${String(hour).padStart(2, "0")}:00`,
                    waitingTokens: Math.max(0, runningWaitingCount),
                };
            }
        );

        const perQueueStats = await Promise.all(
            queueStats.map(async (queue) => {
                const [waiting, serving, completed] = await Promise.all([
                    prisma.token.count({
                        where: {
                            queueId: queue.id,
                            status: "WAITING",
                        },
                    }),
                    prisma.token.count({
                        where: {
                            queueId: queue.id,
                            status: "SERVING",
                        },
                    }),
                    prisma.token.count({
                        where: {
                            queueId: queue.id,
                            status: "COMPLETED",
                            completedAt: {
                                gte: start,
                                lt: end,
                            },
                        },
                    }),
                ]);

                return {
                    id: queue.id,
                    name: queue.name,
                    totalTokens: queue._count.tokens,
                    waitingTokens: waiting,
                    servingTokens: serving,
                    completedToday: completed,
                };
            })
        );

        return NextResponse.json({
            date: selectedDate,

            summary: {
                totalQueues: queues.length,
                totalTokens,
                tokensGeneratedToday,
                waitingTokens,
                servingTokens,
                completedToday,
                cancelledToday,
                averageWaitingTime,
                averageServiceTime,
            },

            queueLengthTrend,

            queues: perQueueStats,
        });
    } catch (error) {
        console.error("GET /api/analytics error:", error);

        return NextResponse.json(
            { message: "Failed to fetch analytics" },
            { status: 500 }
        );
    }
}
