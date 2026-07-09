import { TaskPriority, TaskStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const styles: Record<TaskPriority, string> = {
    LOW: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
    MEDIUM: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50",
    HIGH: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-900/50",
    URGENT: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50",
  };

  return (
    <Badge 
      variant="outline" 
      className={cn("uppercase font-bold text-[10px] tracking-wider", styles[priority], className)}
    >
      {priority}
    </Badge>
  );
}

export function StatusBadge({ status, isOverdue, className }: { status: TaskStatus; isOverdue?: boolean; className?: string }) {
  if (isOverdue && status !== TaskStatus.COMPLETED && status !== TaskStatus.CANCELLED) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "uppercase font-bold text-[10px] tracking-wider bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50", 
          className
        )}
      >
        OVERDUE
      </Badge>
    );
  }

  const styles: Record<string, string> = {
    PENDING: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800",
    IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50",
    COMPLETED: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50",
    CANCELLED: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800",
    OVERDUE: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50", // Fallback
  };

  return (
    <Badge 
      variant="outline" 
      className={cn("uppercase font-bold text-[10px] tracking-wider", styles[status], className)}
    >
      {status.replace("_", " ")}
    </Badge>
  );
}
