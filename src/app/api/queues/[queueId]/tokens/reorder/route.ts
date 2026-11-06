
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const reorderSchema = z.object({
    tokenId: z.string().min(1),
    direction: z.enum(["up", "down"]),
});

type RouteContext = {
    params: Promise<{
        queueId: string;
    }>;
};

// POST /api/queues/[queueId]/tokens/reorder
export async function POST(
    request: Request,
    { params }: RouteContext
) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const { queueId } = await params;

        const body: unknown = await request.json();
        const result = reorderSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { message: "Invalid reorder request" },
                { status: 400 }
            );
        }

        const { tokenId, direction } = result.data;

        const outcome = await prisma.$transaction(async (tx) => {
            const lockedQueues = await tx.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM "Queue"
        WHERE id = ${queueId}
          AND "managerId" = ${session.user.id}
        FOR UPDATE
      `;

            if (lockedQueues.length === 0) {
                return { error: "QUEUE_NOT_FOUND" as const };
            }

            const waitingTokens = await tx.token.findMany({
                where: {
                    queueId,
                    status: "WAITING",
                },
                orderBy: {
                    position: "asc",
                },
            });

            const currentIndex = waitingTokens.findIndex(
                (token) => token.id === tokenId
            );

            if (currentIndex === -1) {
                return { error: "TOKEN_NOT_WAITING" as const };
            }

            const targetIndex =
                direction === "up"
                    ? currentIndex - 1
                    : currentIndex + 1;

            if (
                targetIndex < 0 ||
                targetIndex >= waitingTokens.length
            ) {
                return { error: "ALREADY_AT_BOUNDARY" as const };
            }

            const currentToken = waitingTokens[currentIndex];
            const targetToken = waitingTokens[targetIndex];

            // Swap the two positions.
            await tx.token.update({
                where: { id: currentToken.id },
                data: { position: targetToken.position },
            });

            await tx.token.update({
                where: { id: targetToken.id },
                data: { position: currentToken.position },
            });

            await tx.queueEvent.create({
                data: {
                    type: "TOKEN_REORDERED",
                    queueId,
                    tokenId: currentToken.id,
                    metadata: {
                        direction,
                        fromPosition: currentToken.position,
                        toPosition: targetToken.position,
                        swappedWithTokenId: targetToken.id,
                    },
                },
            });

            return {
                success: true as const,
            };
        });



        if ("error" in outcome) {
            switch (outcome.error) {
                case "QUEUE_NOT_FOUND":
                    return NextResponse.json(
                        { message: "Queue not found" },
                        { status: 404 }
                    );

                case "TOKEN_NOT_WAITING":
                    return NextResponse.json(
                        { message: "Waiting token not found" },
                        { status: 404 }
                    );

                case "ALREADY_AT_BOUNDARY":
                    return NextResponse.json(
                        { message: "Token cannot move further in that direction" },
                        { status: 409 }
                    );
            }
        }
        return NextResponse.json({
            message: "Token reordered successfully",
        });
    } catch (error) {
        console.error("POST reorder token error:", error);

        return NextResponse.json(
            { message: "Failed to reorder token" },
            { status: 500 }
        );
    }
}
