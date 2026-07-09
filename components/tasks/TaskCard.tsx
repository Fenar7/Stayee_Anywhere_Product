import { TaskDTO } from "@/types/tasks";
import { TaskStatus } from "@prisma/client";
import { PriorityBadge, StatusBadge } from "./TaskBadge";
import { formatRelativeTime } from "@/lib/dates";

export function TaskCard({ task, onClick }: { task: TaskDTO; onClick: () => void }) {
  const isOverdue = task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED && new Date(task.deadline) < new Date();
  
  return (
    <div 
      onClick={onClick}
      className={`group flex flex-col sm:flex-row sm:items-center gap-4 p-4 md:p-5 bg-white dark:bg-[#111111] border rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm ${
        isOverdue ? 'border-red-200 dark:border-red-900/50' : 'border-gray-200 dark:border-white/10'
      }`}
    >
      {/* Overdue indicator strip */}
      {isOverdue && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-2xl" />
      )}

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-1">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} isOverdue={isOverdue} />
        </div>
        <h4 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
          {task.title}
        </h4>
        {task.description && (
          <p className="text-[13px] text-gray-500 truncate max-w-full">
            {task.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1 text-[13px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-900 dark:text-gray-300">Hostel:</span>
            <span className="truncate max-w-[120px]">{task.hostel.name}</span>
          </div>
          <div className="hidden sm:block w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-900 dark:text-gray-300">Warden:</span>
            <span className="truncate max-w-[150px]">{task.assignedToWarden.user.email || task.assignedToWarden.user.phone}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 min-w-[120px] gap-1 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-white/5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Deadline
        </div>
        <div className={`text-[14px] font-bold text-right leading-tight ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
          {formatRelativeTime(task.deadline)}
          <div className="text-[11px] font-medium text-gray-500 mt-0.5">
            {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>
      </div>
    </div>
  );
}
