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

  const taskIdParam = searchParams.get("taskId");
  useEffect(() => {
    if (taskIdParam) {
      setSelectedTaskId(taskIdParam);
      setDrawerOpen(true);
      
      // Clean up the URL quietly so refreshing doesn't keep opening it
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("taskId");
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [taskIdParam]);

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

  const taskCount = data?.tasks.length ?? 0;
  const overdueCount = data?.tasks.filter(t => t.status !== "COMPLETED" && t.status !== "CANCELLED" && new Date(t.deadline) < new Date()).length ?? 0;

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#050505] p-6 lg:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#0f0f0f] dark:text-white">Task Management</h1>
            <p className="text-[13.5px] text-[#888] dark:text-[#555] mt-0.5">Assign, track, and manage all operational tasks.</p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-[8px] bg-[#0f0f0f] dark:bg-white text-white dark:text-[#0f0f0f] text-[14px] font-semibold hover:bg-[#2a2a2a] dark:hover:bg-gray-100 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Assign Task
          </button>
        </div>

        {/* ── Stats Row ── */}
        {data && !loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total", value: data.pagination.total, color: "text-[#0f0f0f] dark:text-white" },
              { label: "Overdue", value: overdueCount, color: overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-[#0f0f0f] dark:text-white" },
              { label: "In Progress", value: data.tasks.filter(t => t.status === "IN_PROGRESS").length, color: "text-blue-600 dark:text-blue-400" },
              { label: "Completed", value: data.tasks.filter(t => t.status === "COMPLETED").length, color: "text-green-600 dark:text-green-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white dark:bg-[#111] border border-[#ebebeb] dark:border-white/8 rounded-[10px] px-4 py-3">
                <div className="text-[12px] text-[#999] dark:text-[#555] font-medium">{label}</div>
                <div className={`text-[24px] font-bold mt-0.5 leading-none ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Filter Bar ── */}
        <div className="bg-white dark:bg-[#111] border border-[#ebebeb] dark:border-white/8 rounded-[10px] px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-3">
          {[
            {
              key: "status", label: "Status", value: status,
              options: [
                { value: "ALL", label: "All Status" },
                { value: "PENDING", label: "Pending" },
                { value: "IN_PROGRESS", label: "In Progress" },
                { value: "COMPLETED", label: "Completed" },
                { value: "CANCELLED", label: "Cancelled" },
              ]
            },
            {
              key: "priority", label: "Priority", value: priority,
              options: [
                { value: "ALL", label: "All Priority" },
                { value: "LOW", label: "Low" },
                { value: "MEDIUM", label: "Medium" },
                { value: "HIGH", label: "High" },
                { value: "URGENT", label: "Urgent" },
              ]
            },
            {
              key: "hostelId", label: "Hostel", value: hostelId,
              options: [
                { value: "ALL", label: "All Hostels" },
                ...hostels.map(h => ({ value: h.id, label: h.name }))
              ]
            },
            {
              key: "dateRange", label: "Date", value: dateRange,
              options: [
                { value: "ALL", label: "All Time" },
                { value: "TODAY", label: "Today" },
                { value: "WEEK", label: "Last 7 Days" },
                { value: "MONTH", label: "Last 30 Days" },
              ]
            },
            {
              key: "sort", label: "Sort", value: sort,
              options: [
                { value: "deadline_asc", label: "Deadline ↑" },
                { value: "deadline_desc", label: "Deadline ↓" },
                { value: "createdAt_desc", label: "Newest" },
                { value: "createdAt_asc", label: "Oldest" },
                { value: "priority", label: "Priority" },
              ]
            },
          ].map(({ key, label, value: val, options }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#b0b0b0] dark:text-[#444] shrink-0">{label}</span>
              <select
                value={val}
                onChange={e => updateFilter(key, e.target.value)}
                className="h-8 px-2.5 pr-7 rounded-[6px] bg-[#f4f4f4] dark:bg-white/5 border border-[#e5e5e5] dark:border-white/8 text-[13px] font-medium text-[#111] dark:text-[#eee] outline-none cursor-pointer appearance-none hover:border-[#ccc] transition-colors"
              >
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
          {hostelId !== "ALL" && selectedHostel?.warden && (
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#b0b0b0] dark:text-[#444]">Warden</span>
              <select
                value={wardenId}
                onChange={e => updateFilter("wardenId", e.target.value)}
                className="h-8 px-2.5 pr-7 rounded-[6px] bg-[#f4f4f4] dark:bg-white/5 border border-[#e5e5e5] dark:border-white/8 text-[13px] font-medium text-[#111] dark:text-[#eee] outline-none cursor-pointer appearance-none hover:border-[#ccc] transition-colors"
              >
                <option value="ALL">All Wardens</option>
                <option value={selectedHostel.warden.id}>
                  {selectedHostel.warden.user.email || selectedHostel.warden.user.phone}
                </option>
              </select>
            </div>
          )}
        </div>

        {/* ── Task List ── */}
        <div className="space-y-2 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#f9f9f9]/70 dark:bg-[#080808]/70 z-10 backdrop-blur-[2px] rounded-[10px]">
              <Loader2 className="w-7 h-7 animate-spin text-[#999]" />
            </div>
          )}

          {(!data || data.tasks.length === 0) && !loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111] rounded-[10px] border border-[#ebebeb] dark:border-white/8">
              <CheckCircle2 className="w-10 h-10 text-[#ddd] dark:text-[#333] mb-4" />
              <h3 className="text-[15px] font-semibold text-[#333] dark:text-[#ccc]">No tasks found</h3>
              <p className="text-[13px] text-[#999] mt-1">Try adjusting your filters or assign a new task.</p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="mt-5 h-9 px-4 rounded-[7px] bg-[#0f0f0f] dark:bg-white text-white dark:text-[#0f0f0f] text-[13px] font-semibold hover:bg-[#2a2a2a] transition-colors"
              >
                + Assign Task
              </button>
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

        {/* ── Pagination ── */}
        {data && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-[13px] text-[#999]">
              Page {data.pagination.page} of {data.pagination.pages} &bull; {data.pagination.total} tasks total
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={data.pagination.page <= 1}
                onClick={() => updateFilter("page", (data.pagination.page - 1).toString())}
                className="h-9 px-4 rounded-[7px] border border-[#e5e5e5] dark:border-white/10 bg-white dark:bg-[#111] text-[13px] font-medium text-[#333] dark:text-[#ccc] hover:bg-[#f4f4f4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <button
                disabled={data.pagination.page >= data.pagination.pages}
                onClick={() => updateFilter("page", (data.pagination.page + 1).toString())}
                className="h-9 px-4 rounded-[7px] border border-[#e5e5e5] dark:border-white/10 bg-white dark:bg-[#111] text-[13px] font-medium text-[#333] dark:text-[#ccc] hover:bg-[#f4f4f4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
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
