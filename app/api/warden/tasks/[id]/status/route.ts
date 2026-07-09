import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError, ForbiddenError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { updateTaskStatus } from "@/services/tasks/task.service";
import { updateTaskStatusWardenSchema } from "@/lib/validation/task";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    
    const warden = await prisma.warden.findUnique({
      where: { userId: session.user.id }
    });

    if (!warden) {
      throw new ForbiddenError("Warden profile not found.");
    }

    const { id: taskId } = await params;
    
    const body = await request.json();
    const data = updateTaskStatusWardenSchema.parse(body);

    const updated = await updateTaskStatus({
      taskId,
      wardenId: warden.id,
      newStatus: data.status,
      completionNote: data.completionNote,
    });

    return Response.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
