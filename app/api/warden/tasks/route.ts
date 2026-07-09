import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError, ForbiddenError } from "@/lib/errors";
import { UserRole, TaskStatus } from "@prisma/client";
import { listTasksWarden } from "@/services/tasks/task.service";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    
    const warden = await prisma.warden.findUnique({
      where: { userId: session.user.id }
    });

    if (!warden) {
      throw new ForbiddenError("Warden profile not found.");
    }

    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") as TaskStatus | undefined;

    const tasks = await listTasksWarden({
      wardenId: warden.id,
      filters: { status },
      pagination: { page, limit: Math.min(limit, 100) },
    });

    return Response.json(tasks);
  } catch (error) {
    return handleApiError(error);
  }
}
