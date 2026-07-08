import { prisma } from "@/lib/db";
import { ActivityEventType, ActivityLog } from "@prisma/client";

export interface LogActivityParams {
  organizationId: string;
  hostelId?: string;
  eventType: ActivityEventType;
  actorId?: string;
  actorName: string;
  subjectName: string;
  subjectId?: string;
  subjectType?: string;
  metadata?: Record<string, unknown>;
  targetUrl?: string;
}

export interface GetActivityFeedParams {
  organizationId: string;
  hostelId?: string;
  eventTypes?: ActivityEventType[];
  cursor?: string; // ISO datetime of the last seen item
  cursorId?: string; // UUID of the last seen item for tie-breaking
  take: number;
}

/**
 * Non-blocking, fire-and-forget event writer.
 * Wrapping in a try/catch so it never crashes the primary request.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        organizationId: params.organizationId,
        hostelId: params.hostelId,
        eventType: params.eventType,
        actorId: params.actorId,
        actorName: params.actorName,
        subjectName: params.subjectName,
        subjectId: params.subjectId,
        subjectType: params.subjectType,
        metadata: (params.metadata as any) ?? {},
        targetUrl: params.targetUrl,
      },
    });
  } catch (error) {
    // We intentionally swallow the error so that the primary API request (e.g. checkout, payment) doesn't fail
    console.error("Failed to log activity:", error, params);
  }
}

/**
 * Fetches the paginated activity feed.
 * Utilizes cursor-based pagination for O(1) performance on deep pages.
 */
export async function getActivityFeed(
  params: GetActivityFeedParams
): Promise<{ items: ActivityLog[]; nextCursor: string | null; nextCursorId: string | null; total?: number }> {
  const take = Math.min(params.take, 50); // cap max limit
  const where: any = {
    organizationId: params.organizationId,
  };

  if (params.hostelId) {
    where.hostelId = params.hostelId;
  }
  if (params.eventTypes && params.eventTypes.length > 0) {
    where.eventType = { in: params.eventTypes };
  }

  const cursorOpts: any = params.cursorId
    ? {
        cursor: {
          id: params.cursorId,
        },
        skip: 1, // Skip the cursor itself
      }
    : {};

  const items: any = await prisma.activityLog.findMany({
    where,
    take,
    ...cursorOpts,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      hostel: {
        select: {
          name: true,
        },
      },
    },
  });

  let nextCursor: string | null = null;
  let nextCursorId: string | null = null;

  if (items.length === take) {
    const lastItem = items[items.length - 1];
    nextCursor = lastItem.createdAt.toISOString();
    nextCursorId = lastItem.id;
  }

  return { items, nextCursor, nextCursorId };
}

export interface StreamCsvParams {
  organizationId: string;
  hostelId?: string;
  eventTypes?: ActivityEventType[];
  startDate?: Date;
  endDate?: Date;
}

/**
 * CSV export using an async generator for streaming the response.
 * Prevents memory issues with large result sets.
 */
export async function* streamActivityLogCsv(params: StreamCsvParams): AsyncGenerator<string> {
  const batchSize = 500;
  let cursorId: string | undefined = undefined;

  const where: any = {
    organizationId: params.organizationId,
  };

  if (params.hostelId) {
    where.hostelId = params.hostelId;
  }
  if (params.eventTypes && params.eventTypes.length > 0) {
    where.eventType = { in: params.eventTypes };
  }
  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) where.createdAt.gte = params.startDate;
    if (params.endDate) where.createdAt.lte = params.endDate;
  }

  // Yield CSV header
  yield "Date,Hostel,Event,Actor,Subject,Subject Type,Target URL\n";

  while (true) {
    const cursorOpts: any = cursorId ? { cursor: { id: cursorId }, skip: 1 } : {};
    
    const items: any = await prisma.activityLog.findMany({
      where,
      take: batchSize,
      ...cursorOpts,
      orderBy: { createdAt: "desc" },
      include: {
        hostel: { select: { name: true } }
      }
    });

    if (items.length === 0) break;

    for (const item of items) {
      const date = item.createdAt.toISOString();
      const hostel = item.hostel?.name ?? "";
      const event = item.eventType;
      const actor = item.actorName;
      const subject = item.subjectName;
      const type = item.subjectType ?? "";
      const url = item.targetUrl ?? "";

      // Escape quotes for CSV
      const row = [
        date,
        `"${hostel.replace(/"/g, '""')}"`,
        event,
        `"${actor.replace(/"/g, '""')}"`,
        `"${subject.replace(/"/g, '""')}"`,
        type,
        url,
      ].join(",");

      yield row + "\n";
    }

    if (items.length < batchSize) break;
    cursorId = items[items.length - 1].id;
  }
}
