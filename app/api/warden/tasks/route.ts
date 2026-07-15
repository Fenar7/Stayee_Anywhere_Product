import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError, ForbiddenError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { TaskStatus } from "@/lib/constants/tasks";
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
    
    const parsedPage = parseInt(searchParams.get("page") || "1");
    const parsedLimit = parseInt(searchParams.get("limit") || "20");
    
    const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const limit = isNaN(parsedLimit) || parsedLimit < 1 ? 20 : Math.min(parsedLimit, 100);
    const status = searchParams.get("status") as TaskStatus | undefined;

    const tasks = await listTasksWarden({
      wardenId: warden.id,
      filters: { status },
      pagination: { page, limit },
    });

    return Response.json({
      tasks: tasks.data,
      pagination: {
        total: tasks.total,
        page: tasks.page,
        pages: tasks.totalPages,
        limit,
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
