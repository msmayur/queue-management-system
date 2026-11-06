
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const actionSchema = z.object({
  action: z.enum(["complete", "cancel"]),
});

type RouteContext = {
  params: Promise<{
    queueId: string;
    tokenId: string;
  }>;
};

export async function PATCH(
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

    const { queueId, tokenId } = await params;

    const body: unknown = await request.json();
    const result = actionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Action must be complete or cancel" },
        { status: 400 }
      );
    }

    const action = result.data.action;

    const updatedToken = await prisma.$transaction(async (tx) => {
      // Serialize operations within this queue.
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

      const token = await tx.token.findFirst({
        where: {
          id: tokenId,
          queueId,
        },
      });

      if (!token) {
        return { error: "TOKEN_NOT_FOUND" as const };
      }

      if (action === "complete") {
        if (token.status !== "SERVING") {
          return { error: "TOKEN_NOT_SERVING" as const };
        }

        const completed = await tx.token.update({
          where: { id: tokenId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });

        await tx.queueEvent.create({
          data: {
            type: "TOKEN_COMPLETED",
            queueId,
            tokenId,
          },
        });

        return { token: completed };
      }

      if (token.status !== "WAITING") {
        return { error: "TOKEN_NOT_WAITING" as const };
      }

      const cancelled = await tx.token.update({
        where: { id: tokenId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      });

      // Compact the remaining waiting positions.
      const waitingTokens = await tx.token.findMany({
        where: {
          queueId,
          status: "WAITING",
        },
        orderBy: {
          position: "asc",
        },
        select: {
          id: true,
        },
      });

      for (const [index, waitingToken] of waitingTokens.entries()) {
        await tx.token.update({
          where: { id: waitingToken.id },
          data: { position: index + 1 },
        });
      }

      await tx.queueEvent.create({
        data: {
          type: "TOKEN_CANCELLED",
          queueId,
          tokenId,
        },
      });

      return { token: cancelled };
    });

    
if ("error" in updatedToken) {
  switch (updatedToken.error) {
    case "QUEUE_NOT_FOUND":
      return NextResponse.json(
        { message: "Queue not found" },
        { status: 404 }
      );

    case "TOKEN_NOT_FOUND":
      return NextResponse.json(
        { message: "Token not found" },
        { status: 404 }
      );

    case "TOKEN_NOT_SERVING":
      return NextResponse.json(
        {
          message:
            "Only a token currently being served can be completed",
        },
        { status: 409 }
      );

    case "TOKEN_NOT_WAITING":
      return NextResponse.json(
        {
          message: "Only a waiting token can be cancelled",
        },
        { status: 409 }
      );
  }
}


    return NextResponse.json({
      message:
        action === "complete"
          ? "Token completed successfully"
          : "Token cancelled successfully",
      token: updatedToken.token,
    });
  } catch (error) {
    console.error("PATCH token error:", error);

    return NextResponse.json(
      { message: "Failed to update token" },
      { status: 500 }
    );
  }
}
