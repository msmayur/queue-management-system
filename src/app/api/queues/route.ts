
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createQueueSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Queue name must contain at least 2 characters")
    .max(50, "Queue name cannot exceed 50 characters"),
});

// GET /api/queues
// Fetch queues belonging to the logged-in manager.
export async function GET() {
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

    const queues = await prisma.queue.findMany({
      where: {
        managerId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            tokens: true,
          },
        },
      },
    });

    return NextResponse.json({ queues });
  } catch (error) {
    console.error("GET /api/queues error:", error);

    return NextResponse.json(
      { message: "Failed to fetch queues" },
      { status: 500 }
    );
  }
}

// POST /api/queues
// Create a queue for the logged-in manager.
export async function POST(request: Request) {
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

    const body: unknown = await request.json();
    const result = createQueueSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Invalid queue data",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const queue = await prisma.queue.create({
      data: {
        name: result.data.name,
        managerId: session.user.id,
      },
    });

    return NextResponse.json(
      {
        message: "Queue created successfully",
        queue,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/queues error:", error);

    return NextResponse.json(
      { message: "Failed to create queue" },
      { status: 500 }
    );
  }
}
