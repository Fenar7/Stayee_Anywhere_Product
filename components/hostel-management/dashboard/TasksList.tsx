import { getTasksWidgetData } from "@/services/tasks/task.service";
import { TasksListClient } from "./TasksListClient";
import { formatRelativeTime } from "@/lib/dates";
import { TasksListWidgetClient } from "./TasksListWidgetClient";
import { CheckCircle2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function TasksList() {
  const session = await requireRole([UserRole.WARDEN]);
  const warden = await prisma.warden.findUnique({ where: { userId: session.user.id } });
  
  if (!warden) return null;

  const rawTasks = await getTasksWidgetData({ scope: "warden", organizationId: session.user.organizationId, wardenId: warden.id });

  if (rawTasks.length === 0) {
    return (
      <TasksListClient>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
          <h4 className="text-[15px] font-bold text-gray-900 dark:text-white">All caught up!</h4>
          <p className="text-[13px] text-gray-500 mt-1">No upcoming tasks for the next 7 days.</p>
        </div>
      </TasksListClient>
    );
  }

  // Serialize dates for Client Component
  const serializedTasks = JSON.parse(JSON.stringify(rawTasks));

  const groupedTasks = serializedTasks.reduce((acc: any, task: any) => {
    const d = new Date(task.deadline);
    const dayKey = d.toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' });
    if (!acc[dayKey]) acc[dayKey] = [];
    acc[dayKey].push(task);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <TasksListClient>
      <TasksListWidgetClient groupedTasks={groupedTasks} />
    </TasksListClient>
  );
}
