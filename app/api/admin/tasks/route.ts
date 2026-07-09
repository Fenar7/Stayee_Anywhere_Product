import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { UserRole, TaskStatus, TaskPriority } from "@prisma/client";
import { createTask, listTasksAdmin } from "@/services/tasks/task.service";
import { createTaskSchema } from "@/lib/validation/task";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN]);
    const body = await request.json();
    const data = createTaskSchema.parse(body);

    const task = await createTask({
      organizationId: session.user.organizationId,
      createdByUserId: session.user.id,
      ...data,
    });

    return Response.json(task, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN]);
    const { searchParams } = new URL(request.url);
    
    const parsedPage = parseInt(searchParams.get("page") || "1");
    const parsedLimit = parseInt(searchParams.get("limit") || "20");
    
    const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const limit = isNaN(parsedLimit) || parsedLimit < 1 ? 20 : Math.min(parsedLimit, 100);
    const status = searchParams.get("status") as TaskStatus | undefined;
    const hostelId = searchParams.get("hostelId") || undefined;
    const wardenId = searchParams.get("wardenId") || undefined;
    const priority = searchParams.get("priority") as TaskPriority | undefined;
    const dateFrom = searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom")!) : undefined;
    const dateTo = searchParams.get("dateTo") ? new Date(searchParams.get("dateTo")!) : undefined;
    const sort = searchParams.get("sort") || undefined;

    const tasks = await listTasksAdmin({
      organizationId: session.user.organizationId,
      filters: { status, hostelId, wardenId, priority, dateFrom, dateTo },
      sort,
      pagination: { page, limit },
    });

    return Response.json(tasks);
  } catch (error) {
    return handleApiError(error);
  }
}
