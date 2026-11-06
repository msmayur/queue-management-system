
import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    queueId: string;
  }>;
};

export async function POST(
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

    const result = await prisma.$transaction(async (tx) => {
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

      const currentlyServing = await tx.token.findFirst({
        where: {
          queueId,
          status: "SERVING",
        },
      });

      if (currentlyServing) {
        return { error: "ALREADY_SERVING" as const };
      }

      const nextToken = await tx.token.findFirst({
        where: {
          queueId,
          status: "WAITING",
        },
        orderBy: {
          position: "asc",
        },
      });

      if (!nextToken) {
        return { error: "NO_WAITING_TOKENS" as const };
      }

      const assignedToken = await tx.token.update({
        where: {
          id: nextToken.id,
        },
        data: {
          status: "SERVING",
          assignedAt: new Date(),
        },
      });

      await tx.queueEvent.create({
        data: {
          type: "TOKEN_ASSIGNED",
          queueId,
          tokenId: assignedToken.id,
        },
      });

      return { token: assignedToken };
    });

    if ("error" in result) {
      switch (result.error) {
        case "QUEUE_NOT_FOUND":
          return NextResponse.json(
            { message: "Queue not found" },
            { status: 404 }
          );

        case "ALREADY_SERVING":
          return NextResponse.json(
            {
              message:
                "Complete the currently serving token before assigning another",
            },
            { status: 409 }
          );

        case "NO_WAITING_TOKENS":
          return NextResponse.json(
            { message: "There are no waiting tokens" },
            { status: 404 }
          );
      }
    }

    return NextResponse.json({
      message: "Token assigned successfully",
      token: result.token,
    });
  } catch (error) {
    console.error("POST assign token error:", error);

    return NextResponse.json(
      { message: "Failed to assign token" },
      { status: 500 }
    );
  }
}
