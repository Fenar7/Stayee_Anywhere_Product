import { TaskDTO } from "@/types/tasks";
import { TaskStatus, TaskPriority } from "@/lib/constants/tasks";
import { formatRelativeTime } from "@/lib/dates";
import { Building2, User, Clock, AlertCircle, CheckCircle2, Loader, Ban } from "lucide-react";

const PRIORITY_CONFIG: Record<TaskPriority, { accent: string; dot: string; label: string }> = {
  LOW:    { accent: "bg-slate-400",  dot: "bg-slate-400",  label: "Low" },
  MEDIUM: { accent: "bg-blue-500",   dot: "bg-blue-500",   label: "Medium" },
  HIGH:   { accent: "bg-amber-500",  dot: "bg-amber-500",  label: "High" },
  URGENT: { accent: "bg-red-500",    dot: "bg-red-500",    label: "Urgent" },
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  PENDING:     { icon: Clock,         label: "Pending",     color: "text-zinc-500",  bg: "bg-zinc-100 dark:bg-zinc-800/50" },
  IN_PROGRESS: { icon: Loader,        label: "In Progress", color: "text-blue-600",  bg: "bg-blue-50 dark:bg-blue-900/20" },
  COMPLETED:   { icon: CheckCircle2,  label: "Completed",   color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
  CANCELLED:   { icon: Ban,           label: "Cancelled",   color: "text-zinc-400",  bg: "bg-zinc-50 dark:bg-zinc-900/50" },
};

export function TaskCard({ task, onClick }: { task: TaskDTO; onClick: () => void }) {
  const isOverdue = task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED && new Date(task.deadline) < new Date();
  const priority = PRIORITY_CONFIG[task.priority as TaskPriority];
  const statusConf = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = isOverdue ? AlertCircle : statusConf.icon;
  const deadlineDate = new Date(task.deadline);
  const deadlineFormatted = deadlineDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const deadlineTime = deadlineDate.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

  return (
    <div
      onClick={onClick}
      className="group relative flex gap-0 bg-white dark:bg-[#111111] border border-[#ebebeb] dark:border-white/8 rounded-[10px] cursor-pointer hover:border-[#d0d0d0] dark:hover:border-white/15 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_2px_12px_rgba(0,0,0,0.3)] transition-all duration-150 overflow-hidden"
    >
      {/* Priority Color Accent — left edge strip */}
      <div className={`w-[3px] shrink-0 ${priority.accent} rounded-l-[10px]`} />

      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4 px-4 py-4">
        {/* Left: Main Info */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Row 1: Title + Status pill */}
          <div className="flex items-start gap-2.5 flex-wrap">
            <h4 className={`text-[14.5px] font-semibold leading-snug ${isOverdue ? "text-red-600 dark:text-red-400" : "text-[#0f0f0f] dark:text-[#f0f0f0]"} group-hover:text-black dark:group-hover:text-white transition-colors`}>
              {task.title}
            </h4>
            {/* Status pill */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${isOverdue ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : `${statusConf.bg} ${statusConf.color}`}`}>
              <StatusIcon className="w-3 h-3" />
              {isOverdue ? "Overdue" : statusConf.label}
            </span>
          </div>

          {/* Row 2: Description */}
          {task.description && (
            <p className="text-[13px] text-[#6b6b6b] dark:text-[#888] line-clamp-1 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Row 3: Metadata chips */}
          <div className="flex flex-wrap items-center gap-3 pt-0.5">
            {/* Priority dot + label */}
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${priority.dot}`} />
              <span className="text-[12px] font-medium text-[#555] dark:text-[#999]">{priority.label}</span>
            </div>

            <span className="w-px h-3 bg-[#e0e0e0] dark:bg-white/10" />

            <div className="flex items-center gap-1.5 text-[12px] text-[#6b6b6b] dark:text-[#888]">
              <Building2 className="w-3.5 h-3.5 text-[#aaa] dark:text-[#555]" />
              <span className="max-w-[130px] truncate font-medium text-[#444] dark:text-[#aaa]">{task.hostel.name}</span>
            </div>

            <span className="w-px h-3 bg-[#e0e0e0] dark:bg-white/10" />

            <div className="flex items-center gap-1.5 text-[12px] text-[#6b6b6b] dark:text-[#888]">
              <User className="w-3.5 h-3.5 text-[#aaa] dark:text-[#555]" />
              <span className="max-w-[160px] truncate font-medium text-[#444] dark:text-[#aaa]">
                {task.assignedToWarden.user.email || task.assignedToWarden.user.phone}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Deadline block */}
        <div className={`flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 sm:min-w-[130px] sm:border-l sm:border-[#f0f0f0] dark:sm:border-white/5 sm:pl-4 gap-1`}>
          <div className="text-[11px] uppercase tracking-widest font-semibold text-[#bbb] dark:text-[#555] mb-0.5">
            {isOverdue ? "⚠ Deadline" : "Deadline"}
          </div>
          <div className="text-right">
            <div className={`text-[14px] font-bold leading-tight ${isOverdue ? "text-red-600 dark:text-red-400" : "text-[#111] dark:text-[#eee]"}`}>
              {deadlineTime}
            </div>
            <div className="text-[12px] text-[#999] dark:text-[#555] mt-0.5">
              {deadlineFormatted}
            </div>
            <div className={`text-[11.5px] font-medium mt-1 ${isOverdue ? "text-red-500" : "text-[#777] dark:text-[#666]"}`}>
              {formatRelativeTime(task.deadline)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
