"use client";

import { useState } from "react";
import { formatRelativeTime } from "@/lib/dates";
import { PriorityBadge } from "@/components/tasks/TaskBadge";
import { TaskStatus } from "@/lib/constants/tasks";
import { Check } from "lucide-react";
import { notify } from "@/lib/toast";
import { useRouter } from "next/navigation";

export function TasksListWidgetClient({
  groupedTasks
}: {
  groupedTasks: Record<string, any[]>;
}) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);

  const handleStatusUpdate = async (taskId: string, currentStatus: TaskStatus) => {
    let newStatus: TaskStatus;
    let note: string | undefined = undefined;

    if (currentStatus === TaskStatus.PENDING) {
      newStatus = TaskStatus.IN_PROGRESS;
    } else if (currentStatus === TaskStatus.IN_PROGRESS) {
      const userInput = window.prompt("Enter a completion note to mark this task as done:");
      if (userInput === null) return; // User cancelled
      if (userInput.trim().length < 3) {
        notify.error("Completion note must be at least 3 characters.");
        return;
      }
      note = userInput.trim();
      newStatus = TaskStatus.COMPLETED;
    } else {
      return;
    }

    setUpdating(taskId);
    try {
      const res = await fetch(`/api/warden/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, completionNote: note }),
      });

      if (!res.ok) throw new Error("Failed to update status");
      notify.success(`Task marked as ${newStatus === TaskStatus.COMPLETED ? 'Completed' : 'In Progress'}`);
      router.refresh();
    } catch (error) {
      notify.error("Failed to update task status");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <>
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
                <div key={task.id} className="bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-xl p-3 flex items-start gap-3">
                  <div className="mt-1">
                    <button
                      onClick={() => handleStatusUpdate(task.id, task.status)}
                      disabled={updating === task.id || task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED}
                      className={`size-5 rounded flex items-center justify-center border-2 transition-colors ${
                        task.status === TaskStatus.COMPLETED ? 'border-green-500 bg-green-500' :
                        task.status === TaskStatus.IN_PROGRESS ? 'border-blue-500 text-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40' :
                        'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-[#1a1a1a]'
                      }`}
                      title={task.status === TaskStatus.PENDING ? "Mark In Progress" : task.status === TaskStatus.IN_PROGRESS ? "Mark Completed" : ""}
                    >
                      {updating === task.id ? (
                        <div className="size-2.5 rounded-full border-2 border-t-transparent border-blue-500 animate-spin" />
                      ) : task.status === TaskStatus.IN_PROGRESS ? (
                        <div className="size-2 rounded-sm bg-blue-500" />
                      ) : task.status === TaskStatus.COMPLETED ? (
                        <Check className="size-3 text-white" />
                      ) : null}
                    </button>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <PriorityBadge priority={task.priority} />
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider truncate max-w-[120px]">
                        {task.hostel.name}
                      </span>
                    </div>
                    <h4 className="text-[14px] font-bold text-gray-900 dark:text-white leading-snug truncate">
                      {task.title}
                    </h4>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[12px] font-medium text-gray-500 truncate">
                        From HQ
                      </p>
                      <p className={`text-[11px] font-bold ${task.isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                        {task.isOverdue ? 'OVERDUE' : formatRelativeTime(task.deadline)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
