import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { getTaskAdmin, updateTask, cancelTask } from "@/services/tasks/task.service";
import { updateTaskAdminSchema } from "@/lib/validation/task";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN]);
    const { id: taskId } = await params;

    const task = await getTaskAdmin(taskId, session.user.organizationId);

    return Response.json(task);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN]);
    const { id: taskId } = await params;
    
    const body = await request.json();
    const data = updateTaskAdminSchema.parse(body);

    const updated = await updateTask({
      taskId,
      organizationId: session.user.organizationId,
      ...data,
    });

    return Response.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN]);
    const { id: taskId } = await params;

    const cancelled = await cancelTask(taskId, session.user.organizationId);

    return Response.json(cancelled);
  } catch (error) {
    return handleApiError(error);
  }
}
