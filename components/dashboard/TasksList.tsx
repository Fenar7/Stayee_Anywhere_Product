import { getTasksWidgetData } from "@/services/tasks/task.service";
import { TasksListClient } from "./TasksListClient";
import { formatRelativeTime } from "@/lib/dates";
import { PriorityBadge } from "@/components/tasks/TaskBadge";
import { CheckCircle2, Building2, User } from "lucide-react";
import Link from "next/link";

export async function TasksList({ organizationId }: { organizationId?: string }) {
  if (!organizationId) return null;

  const rawTasks = await getTasksWidgetData({ scope: "admin", organizationId });


  if (rawTasks.length === 0) {
    return (
      <TasksListClient>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
          <h4 className="text-[15px] font-bold text-gray-900 dark:text-white">All clear!</h4>
          <p className="text-[13px] text-gray-500 mt-1">No upcoming tasks for the next 7 days.</p>
        </div>
      </TasksListClient>
    );
  }

  const groupedTasks = rawTasks.reduce((acc, task) => {
    const d = new Date(task.deadline);
    const dayKey = d.toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' });
    if (!acc[dayKey]) acc[dayKey] = [];
    acc[dayKey].push(task);
    return acc;
  }, {} as Record<string, typeof rawTasks>);

  return (
    <TasksListClient>
      {Object.entries(groupedTasks).map(([dayKey, tasksForDay], groupIndex) => {
        const isFirstGroup = groupIndex === 0;
        const d = new Date(tasksForDay[0].deadline);
        const dayNum = d.getDate();
        const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });

        return (
          <div key={dayKey} className="py-4 first:pt-0 last:pb-0 flex gap-4 min-w-0">
            {/* Group Label / Day Badge */}
            <div className="hidden sm:flex flex-col items-center gap-0.5 shrink-0 w-10 mt-1">
              <div
                className={`size-6 rounded-md flex items-center justify-center text-[12px] font-bold ${
                  tasksForDay.some(t => t.isOverdue)
                    ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                    : isFirstGroup 
                      ? "bg-[#282828] text-white dark:bg-white dark:text-black"
                      : "bg-[#f5f5f5] dark:bg-white/5 text-[#767676]"
                }`}
              >
                {dayNum}
              </div>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  tasksForDay.some(t => t.isOverdue)
                    ? "text-red-500"
                    : isFirstGroup ? "text-gray-900 dark:text-white" : "text-[#767676]"
                }`}
              >
                {dayLabel}
              </span>
            </div>

            {/* Tasks in this group */}
            <div className="flex-1 flex flex-col gap-3 min-w-0">
              {/* Mobile group label */}
              <div className="sm:hidden text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                {dayKey}
              </div>
              
              {tasksForDay.map(task => (
                <Link href={`/admin/tasks?taskId=${task.id}`} key={task.id}>
                  <div className="bg-white dark:bg-[#151515] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors border border-gray-200 dark:border-white/10 rounded-xl p-4 h-full block">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="text-[15px] font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2 flex-1">
                        {task.title}
                      </h4>
                      <PriorityBadge priority={task.priority} />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md">
                        <Building2 className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 truncate max-w-[120px]">
                          {task.hostel.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 truncate max-w-[150px]">
                          {task.assignedToWarden.user.email || task.assignedToWarden.user.phone}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${task.isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                        {task.isOverdue ? 'OVERDUE' : 'DUE'}
                      </p>
                      <p className={`text-[12px] font-medium ${task.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
                        {formatRelativeTime(task.deadline.toISOString())}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </TasksListClient>
  );
}
