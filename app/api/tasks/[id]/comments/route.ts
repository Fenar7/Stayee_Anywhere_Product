import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { addTaskComment, getTaskComments } from "@/services/tasks/task.service";
import { taskCommentSchema } from "@/lib/validation/task";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN, UserRole.WARDEN]);
    const { id: taskId } = await params;
    
    const body = await request.json();
    const data = taskCommentSchema.parse(body);

    const comment = await addTaskComment({
      taskId,
      organizationId: session.user.organizationId,
      userId: session.user.id,
      userRole: session.user.role,
      message: data.message,
    });

    return Response.json(comment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN, UserRole.WARDEN]);
    const { id: taskId } = await params;

    const comments = await getTaskComments(
      taskId, 
      session.user.organizationId,
      session.user.id,
      session.user.role
    );

    return Response.json(comments);
  } catch (error) {
    return handleApiError(error);
  }
}
