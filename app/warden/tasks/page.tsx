import { requireRole } from "@/lib/auth";
import { UserRole, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { TasksPageClient } from "./TasksPageClient";
import { listTasksWarden } from "@/services/tasks/task.service";

export const metadata = {
  title: "My Tasks | Warden | NextHome",
};

export default async function WardenTasksPage({
  searchParams,
}: {
  searchParams: { tab?: string; page?: string };
}) {
  const session = await requireRole([UserRole.WARDEN]);
  
  const warden = await prisma.warden.findUnique({
    where: { userId: session.user.id }
  });

  if (!warden) {
    redirect("/");
  }

  const tab = searchParams.tab || "PENDING";
  const page = parseInt(searchParams.page || "1") || 1;
  const limit = 20;

  // Map UI tab to API status
  let statusFilter: TaskStatus | 'OVERDUE' | undefined = undefined;
  if (tab === "PENDING") statusFilter = TaskStatus.PENDING;
  if (tab === "IN_PROGRESS") statusFilter = TaskStatus.IN_PROGRESS;
  if (tab === "COMPLETED") statusFilter = TaskStatus.COMPLETED;
  if (tab === "OVERDUE") statusFilter = "OVERDUE";

  const { data: rawTasks, totalPages } = await listTasksWarden({
    wardenId: warden.id,
    filters: { status: statusFilter },
    pagination: { page, limit }
  });

  // Serialize Date objects to ISO strings to match TaskDTO expected by Client Component
  const tasks = JSON.parse(JSON.stringify(rawTasks));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            My Tasks
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and track your assigned work.
          </p>
        </div>
      </div>

      <TasksPageClient 
        tasks={tasks} 
        currentTab={tab} 
        currentPage={page} 
        totalPages={totalPages} 
      />
    </div>
  );
}
