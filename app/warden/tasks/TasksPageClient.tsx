"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { TaskDTO } from "@/types/tasks";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, AlertCircle } from "lucide-react";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const tabs = [
    { id: "PENDING", label: "Pending", icon: Clock },
    { id: "IN_PROGRESS", label: "In Progress", icon: Clock },
    { id: "COMPLETED", label: "Completed", icon: CheckCircle2 },
    { id: "OVERDUE", label: "Overdue", icon: AlertCircle },
  ];

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    if (key === "tab") params.set("page", "1"); // Reset page on tab change
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
        
        {/* Tabs Bar */}
        <div className="flex border-b border-gray-100 dark:border-white/5 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => updateFilters("tab", tab.id)}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-4 text-sm font-bold tracking-wide transition-all border-b-2 ${
                  isActive 
                    ? "border-black text-black dark:border-white dark:text-white bg-gray-50/50 dark:bg-white/5" 
                    : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Task Grid */}
        <div className="p-4 sm:p-6 bg-gray-50/30 dark:bg-black/20 min-h-[400px]">
          {tasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center">
              <CheckCircle2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">No tasks found</h3>
              <p className="text-gray-500 mt-1 max-w-sm">
                You're all caught up in this category! Enjoy the peace and quiet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onClick={() => setSelectedTaskId(task.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-[#0a0a0a]">
            <p className="text-sm font-medium text-gray-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateFilters("page", (currentPage - 1).toString())}
                disabled={currentPage <= 1}
                className="rounded-xl border-gray-200 dark:border-white/10"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateFilters("page", (currentPage + 1).toString())}
                disabled={currentPage >= totalPages}
                className="rounded-xl border-gray-200 dark:border-white/10"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
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
