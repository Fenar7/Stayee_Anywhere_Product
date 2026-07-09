"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Loader2, Plus, CheckCircle2, Search } from "lucide-react";
import { notify } from "@/lib/toast";
import { TaskDTO, TasksListResponse } from "@/types/tasks";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskCreateModal } from "@/components/tasks/TaskCreateModal";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { Button } from "@/components/ui/button";

export default function AdminTasksPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL State
  const status = searchParams.get("status") || "ALL";
  const hostelId = searchParams.get("hostelId") || "ALL";
  const wardenId = searchParams.get("wardenId") || "ALL";
  const priority = searchParams.get("priority") || "ALL";
  const sort = searchParams.get("sort") || "deadline_asc";
  const dateRange = searchParams.get("dateRange") || "ALL";
  const pageStr = searchParams.get("page") || "1";
  const page = parseInt(pageStr, 10);

  // Data State
  const [data, setData] = useState<TasksListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter Options State
  const [hostels, setHostels] = useState<{id: string; name: string; warden?: { id: string; user: { email: string | null; phone: string } }}[]>([]);
  
  // UI State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchHostels();
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    fetchTasks(abortController.signal);
    return () => abortController.abort();
  }, [status, hostelId, wardenId, priority, sort, dateRange, page]);

  const fetchHostels = async () => {
    try {
      const res = await fetch("/api/admin/hostels");
      if (res.ok) {
        const data = await res.json();
        setHostels(data);
      }
    } catch (error) {
      // ignore
    }
  };

  const fetchTasks = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "ALL") params.set("status", status);
      if (hostelId !== "ALL") params.set("hostelId", hostelId);
      if (wardenId !== "ALL") params.set("wardenId", wardenId);
      if (priority !== "ALL") params.set("priority", priority);
      if (sort) params.set("sort", sort);
      
      if (dateRange !== "ALL") {
        const today = new Date();
        let fromDate = new Date();
        if (dateRange === "TODAY") {
          fromDate.setHours(0, 0, 0, 0);
        } else if (dateRange === "WEEK") {
          fromDate.setDate(today.getDate() - 7);
        } else if (dateRange === "MONTH") {
          fromDate.setMonth(today.getMonth() - 1);
        }
        params.set("dateFrom", fromDate.toISOString());
        params.set("dateTo", new Date().toISOString());
      }

      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/admin/tasks?${params.toString()}`, { signal });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      setData(json);
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        notify.error("Could not load tasks");
      }
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      if (value === "ALL") {
        current.delete(key);
      } else {
        current.set(key, value);
      }
      // Reset pagination on any filter change
      if (key !== "page") {
        current.set("page", "1");
      }
      // If hostel changed, reset warden filter because wardens are hostel-specific in the UI flow
      if (key === "hostelId") {
        current.delete("wardenId");
      }
      
      const search = current.toString();
      const query = search ? `?${search}` : "";
      router.push(`${pathname}${query}`);
    },
    [pathname, router, searchParams]
  );

  const selectedHostel = hostels.find(h => h.id === hostelId);

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#050505] p-6 lg:p-8 font-sans">
      <div className="max-w-[1200px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">Task Management</h1>
            <p className="text-sm text-gray-500 mt-1">Assign, track, and manage all operational tasks.</p>
          </div>
          
          <Button 
            onClick={() => setCreateModalOpen(true)}
            className="rounded-xl bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Assign Task
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-[#111111] p-4 rounded-2xl border border-gray-200 dark:border-white/10 flex flex-wrap gap-4 items-center shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</span>
            <select 
              value={status}
              onChange={e => updateFilter("status", e.target.value)}
              className="h-9 px-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[13px] font-medium outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Priority</span>
            <select 
              value={priority}
              onChange={e => updateFilter("priority", e.target.value)}
              className="h-9 px-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[13px] font-medium outline-none cursor-pointer"
            >
              <option value="ALL">All Priority</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Hostel</span>
            <select 
              value={hostelId}
              onChange={e => updateFilter("hostelId", e.target.value)}
              className="h-9 px-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[13px] font-medium outline-none cursor-pointer"
            >
              <option value="ALL">All Hostels</option>
              {hostels.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>

          {hostelId !== "ALL" && selectedHostel?.warden && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Warden</span>
              <select 
                value={wardenId}
                onChange={e => updateFilter("wardenId", e.target.value)}
                className="h-9 px-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[13px] font-medium outline-none cursor-pointer"
              >
                <option value="ALL">All Wardens in Hostel</option>
                <option value={selectedHostel.warden.id}>
                  {selectedHostel.warden.user.email || selectedHostel.warden.user.phone}
                </option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date</span>
            <select 
              value={dateRange}
              onChange={e => updateFilter("dateRange", e.target.value)}
              className="h-9 px-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[13px] font-medium outline-none cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">Last 30 Days</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Sort</span>
            <select 
              value={sort}
              onChange={e => updateFilter("sort", e.target.value)}
              className="h-9 px-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[13px] font-medium outline-none cursor-pointer"
            >
              <option value="deadline_asc">Deadline (Nearest)</option>
              <option value="deadline_desc">Deadline (Furthest)</option>
              <option value="createdAt_desc">Newest First</option>
              <option value="createdAt_asc">Oldest First</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-3 relative min-h-[400px]">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 z-10 backdrop-blur-[1px] rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : null}

          {(!data || data.tasks.length === 0) && !loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111111] rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm">
              <CheckCircle2 className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No tasks found</h3>
              <p className="text-gray-500 mt-1 text-sm">Try adjusting your filters or assign a new task.</p>
              <Button 
                variant="outline" 
                onClick={() => setCreateModalOpen(true)}
                className="mt-6 rounded-xl border-gray-200 dark:border-white/10"
              >
                Assign Task
              </Button>
            </div>
          ) : (
            data?.tasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onClick={() => {
                  setSelectedTaskId(task.id);
                  setDrawerOpen(true);
                }} 
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {data && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <span className="text-sm text-gray-500 font-medium">
              Page {data.pagination.page} of {data.pagination.pages}
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                disabled={data.pagination.page <= 1}
                onClick={() => updateFilter("page", (data.pagination.page - 1).toString())}
                className="rounded-lg border-gray-200 dark:border-white/10"
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={data.pagination.page >= data.pagination.pages}
                onClick={() => updateFilter("page", (data.pagination.page + 1).toString())}
                className="rounded-lg border-gray-200 dark:border-white/10"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <TaskCreateModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen} 
        onTaskCreated={() => fetchTasks()} 
      />

      <TaskDetailDrawer 
        taskId={selectedTaskId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onTaskUpdated={() => fetchTasks()}
      />
    </div>
  );
}
