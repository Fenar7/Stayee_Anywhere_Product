"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { TaskDTO } from "@/types/tasks";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, AlertCircle, Loader2, ClipboardList } from "lucide-react";
import { TaskStatus, TaskPriority } from "@/lib/constants/tasks";
import { formatRelativeTime } from "@/lib/dates";

// ─── Config ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "PENDING",     label: "Pending",     icon: Clock },
  { id: "IN_PROGRESS", label: "In Progress", icon: Loader2 },
  { id: "COMPLETED",   label: "Completed",   icon: CheckCircle2 },
  { id: "OVERDUE",     label: "Overdue",     icon: AlertCircle },
];

const PRIORITY_STRIP: Record<TaskPriority, string> = {
  LOW:    "bg-slate-300",
  MEDIUM: "bg-blue-400",
  HIGH:   "bg-amber-400",
  URGENT: "bg-red-500",
};

const PRIORITY_LABEL: Record<TaskPriority, { text: string; color: string }> = {
  LOW:    { text: "Low",    color: "text-slate-500" },
  MEDIUM: { text: "Medium", color: "text-blue-500"  },
  HIGH:   { text: "High",   color: "text-amber-500" },
  URGENT: { text: "Urgent", color: "text-red-500"   },
};

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  PENDING:     { label: "Pending",     cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  IN_PROGRESS: { label: "In Progress", cls: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  COMPLETED:   { label: "Completed",   cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
  CANCELLED:   { label: "Cancelled",   cls: "bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500" },
};

// ─── Task Row ───────────────────────────────────────────────────────────────

function TaskRow({ task, onClick }: { task: TaskDTO; onClick: () => void }) {
  const isOverdue =
    task.status !== TaskStatus.COMPLETED &&
    task.status !== TaskStatus.CANCELLED &&
    new Date(task.deadline) < new Date();

  const priority = PRIORITY_STRIP[task.priority as TaskPriority] ?? "bg-slate-300";
  const pLabel   = PRIORITY_LABEL[task.priority as TaskPriority] ?? PRIORITY_LABEL.MEDIUM;
  const status   = isOverdue
    ? { label: "Overdue", cls: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" }
    : (STATUS_PILL[task.status] ?? STATUS_PILL.PENDING);

  const deadlineDate = new Date(task.deadline);
  const dateStr = deadlineDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const relStr  = formatRelativeTime(task.deadline);

  return (
    <div
      onClick={onClick}
      className="group relative flex items-center gap-0 bg-white dark:bg-[#111] border-b border-[#f0f0f0] dark:border-white/5 last:border-b-0 cursor-pointer hover:bg-[#fafafa] dark:hover:bg-white/[0.02] transition-colors duration-100"
    >
      {/* Priority colour strip */}
      <div className={`w-[3px] shrink-0 self-stretch ${priority}`} />

      {/* Main content */}
      <div className="flex-1 flex items-center gap-4 px-5 py-4 min-w-0">

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <p className={`text-[14px] font-semibold leading-snug truncate ${isOverdue ? "text-red-600 dark:text-red-400" : "text-[#0f0f0f] dark:text-[#f0f0f0]"}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-[12.5px] text-[#888] dark:text-[#666] truncate mt-0.5">
              {task.description}
            </p>
          )}
        </div>

        {/* Hostel chip */}
        <span className="hidden sm:inline-flex items-center shrink-0 text-[11.5px] font-medium text-[#666] dark:text-[#888] bg-[#f5f5f5] dark:bg-white/5 px-2.5 py-1 rounded-[6px] max-w-[160px] truncate">
          {task.hostel.name}
        </span>

        {/* Priority */}
        <span className={`hidden md:inline text-[12px] font-semibold shrink-0 ${pLabel.color}`}>
          {pLabel.text}
        </span>

        {/* Status pill */}
        <span className={`inline-flex items-center gap-1 shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${status.cls}`}>
          {status.label}
        </span>

        {/* Deadline */}
        <div className="shrink-0 text-right hidden sm:block">
          <p className={`text-[13px] font-bold ${isOverdue ? "text-red-500" : "text-[#222] dark:text-[#ddd]"}`}>{dateStr}</p>
          <p className={`text-[11px] mt-0.5 ${isOverdue ? "text-red-400" : "text-[#aaa]"}`}>{relStr}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Page Client ────────────────────────────────────────────────────────────

export function TasksPageClient({
  tasks,
  currentTab,
  currentPage,
  totalPages,
}: {
  tasks: TaskDTO[];
  currentTab: string;
  currentPage: number;
  totalPages: number;
}) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    if (key === "tab") params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      {/* Tab bar — flush with layout */}
      <div className="flex items-center gap-1 mb-5 border-b border-[#ebebeb] dark:border-white/5 -mx-5 px-5 pb-0">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = currentTab === id;
          return (
            <button
              key={id}
              onClick={() => updateFilters("tab", id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                isActive
                  ? "border-[#0f0f0f] dark:border-white text-[#0f0f0f] dark:text-white"
                  : "border-transparent text-[#999] dark:text-[#666] hover:text-[#555] dark:hover:text-[#aaa]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Task list */}
      <div className="rounded-[10px] border border-[#ebebeb] dark:border-white/8 overflow-hidden bg-white dark:bg-[#111]">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center mb-4">
              <ClipboardList className="w-7 h-7 text-[#ccc] dark:text-[#555]" />
            </div>
            <h3 className="text-[15px] font-bold text-[#222] dark:text-white">No tasks here</h3>
            <p className="mt-1 text-[13px] text-[#888] max-w-xs">
              You're all caught up in this category.
            </p>
          </div>
        ) : (
          <div>
            {/* Header row */}
            <div className="flex items-center gap-4 px-5 py-2.5 bg-[#fafafa] dark:bg-white/[0.02] border-b border-[#ebebeb] dark:border-white/5">
              <div className="flex-1 text-[11px] font-bold text-[#bbb] dark:text-[#555] uppercase tracking-widest pl-[3px]">Task</div>
              <span className="hidden sm:block text-[11px] font-bold text-[#bbb] dark:text-[#555] uppercase tracking-widest w-[160px]">Hostel</span>
              <span className="hidden md:block text-[11px] font-bold text-[#bbb] dark:text-[#555] uppercase tracking-widest w-[60px]">Priority</span>
              <span className="text-[11px] font-bold text-[#bbb] dark:text-[#555] uppercase tracking-widest w-[80px]">Status</span>
              <span className="hidden sm:block text-[11px] font-bold text-[#bbb] dark:text-[#555] uppercase tracking-widest w-[72px] text-right">Due</span>
            </div>

            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onClick={() => setSelectedTaskId(task.id)}
              />
            ))}
          </div>
        )}

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#f0f0f0] dark:border-white/5 bg-[#fafafa] dark:bg-white/[0.02]">
            <p className="text-[12px] font-medium text-[#aaa]">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => updateFilters("page", (currentPage - 1).toString())}
                disabled={currentPage <= 1}
                className="flex items-center justify-center w-8 h-8 rounded-[6px] border border-[#dedede] dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-[#555] dark:text-[#aaa] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateFilters("page", (currentPage + 1).toString())}
                disabled={currentPage >= totalPages}
                className="flex items-center justify-center w-8 h-8 rounded-[6px] border border-[#dedede] dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-[#555] dark:text-[#aaa] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <TaskDetailDrawer
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
        onTaskUpdated={() => router.refresh()}
        mode="warden"
      />
    </>
  );
}
