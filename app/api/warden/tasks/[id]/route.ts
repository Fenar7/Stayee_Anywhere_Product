import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError, ForbiddenError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { getTaskWarden } from "@/services/tasks/task.service";
import { prisma } from "@/lib/db";

export async function GET(
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

    const task = await getTaskWarden(taskId, warden.id);

    return Response.json(task);
  } catch (error) {
    return handleApiError(error);
  }
}
