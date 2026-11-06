
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createTokenSchema = z.object({
  personName: z
    .string()
    .trim()
    .min(2, "Person name must contain at least 2 characters")
    .max(80, "Person name cannot exceed 80 characters"),
});

type RouteContext = {
  params: Promise<{
    queueId: string;
  }>;
};

// GET /api/queues/[queueId]/tokens
// Fetch waiting tokens for a queue.
export async function GET(
  _request: Request,
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

    const queue = await prisma.queue.findFirst({
      where: {
        id: queueId,
        managerId: session.user.id,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!queue) {
      return NextResponse.json(
        { message: "Queue not found" },
        { status: 404 }
      );
    }

    const tokens = await prisma.token.findMany({
      where: {
        queueId,
        status: "WAITING",
      },
      orderBy: {
        position: "asc",
      },
    });

    return NextResponse.json({
      queue,
      tokens,
    });
  } catch (error) {
    console.error("GET queue tokens error:", error);

    return NextResponse.json(
      { message: "Failed to fetch tokens" },
      { status: 500 }
    );
  }
}

// POST /api/queues/[queueId]/tokens
// Generate a token for a person.
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
    const result = createTokenSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Invalid token data",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const token = await prisma.$transaction(async (tx) => {
      // Lock this queue row so simultaneous token requests
      // cannot receive the same number or waiting position.
      const lockedQueues = await tx.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM "Queue"
        WHERE id = ${queueId}
          AND "managerId" = ${session.user.id}
        FOR UPDATE
      `;

      if (lockedQueues.length === 0) {
        return null;
      }

      const queue = await tx.queue.findUnique({
        where: {
          id: queueId,
        },
        select: {
          nextTokenNumber: true,
        },
      });

      if (!queue) {
        return null;
      }

      const waitingCount = await tx.token.count({
        where: {
          queueId,
          status: "WAITING",
        },
      });

      const newToken = await tx.token.create({
        data: {
          personName: result.data.personName,
          tokenNumber: queue.nextTokenNumber,
          position: waitingCount + 1,
          queueId,
        },
      });

      await tx.queue.update({
        where: {
          id: queueId,
        },
        data: {
          nextTokenNumber: {
            increment: 1,
          },
        },
      });

      await tx.queueEvent.create({
        data: {
          type: "TOKEN_CREATED",
          queueId,
          tokenId: newToken.id,
          metadata: {
            personName: newToken.personName,
            tokenNumber: newToken.tokenNumber,
          },
        },
      });

      return newToken;
    });

    if (!token) {
      return NextResponse.json(
        { message: "Queue not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Token generated successfully",
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST queue token error:", error);

    return NextResponse.json(
      { message: "Failed to generate token" },
      { status: 500 }
    );
  }
}
