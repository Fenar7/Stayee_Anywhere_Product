"use client";

import { useEffect, useState, useRef } from "react";
import { TaskDTO } from "@/types/tasks";
import { TaskPriority, TaskStatus } from "@/lib/constants/tasks";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PriorityBadge, StatusBadge } from "./TaskBadge";
import { TaskComments } from "./TaskComments";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/toast";
import { Loader2, Mail, Phone, Calendar, Clock, User, Ban, Building2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function TaskDetailDrawer({
  taskId,
  open,
  onOpenChange,
  onTaskUpdated,
  mode = "admin",
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => void;
  mode?: "admin" | "warden";
}) {
  const [task, setTask] = useState<TaskDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  
  // Edit states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");
  const titleRef = useRef("");
  const descRef = useRef("");
  const [completionNote, setCompletionNote] = useState("");

  useEffect(() => {
    if (open && taskId) {
      fetchTask();
    } else {
      setTask(null);
    }
  }, [open, taskId]);

  const fetchTask = async () => {
    setLoading(true);
    try {
      const endpoint = mode === "warden" ? `/api/warden/tasks/${taskId}` : `/api/admin/tasks/${taskId}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to fetch task");
      const data = await res.json();
      setTask(data);
      setTitle(data.title);
      setDescription(data.description || "");
      const tzoffset = new Date().getTimezoneOffset() * 60000;
      setDeadlineInput(new Date(new Date(data.deadline).getTime() - tzoffset).toISOString().slice(0, 16));
      titleRef.current = data.title;
      descRef.current = data.description || "";
    } catch (err) {
      notify.error("Could not load task details");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const updateField = async (field: "title" | "description" | "priority" | "deadline", value: string) => {
    if (!task) return;
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update");
      }
      
      const updatedTask = await res.json();
      setTask(updatedTask);
      onTaskUpdated();
      notify.success("Updated");
      
      if (field === "title") titleRef.current = updatedTask.title;
      if (field === "description") descRef.current = updatedTask.description || "";
      
    } catch (err) {
      const error = err as Error;
      notify.error(error.message);
      // Revert local state
      if (field === "title") setTitle(titleRef.current);
      if (field === "description") setDescription(descRef.current);
    }
  };

  const handleCancelTask = async () => {
    if (!task) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to cancel task");
      
      notify.success("Task cancelled");
      onTaskUpdated();
      setConfirmCancelOpen(false);
      onOpenChange(false);
    } catch (err) {
      const error = err as Error;
      notify.error(error.message || "Could not cancel task");
    } finally {
      setCancelling(false);
    }
  };

  if (!task && loading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg p-0 flex items-center justify-center border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a]">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </SheetContent>
      </Sheet>
    );
  }

  if (!task) return null;

  const isOverdue = task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED && new Date(task.deadline) < new Date();
  const isReadOnly = task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED;
  
  const handleWardenStatusUpdate = async (newStatus: TaskStatus, note?: string) => {
    try {
      const res = await fetch(`/api/warden/tasks/${task.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, completionNote: note }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update status");
      }
      const updatedTask = await res.json();
      setTask(updatedTask);
      onTaskUpdated();
      notify.success("Status updated successfully");
    } catch (err) {
      const error = err as Error;
      notify.error(error.message);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] overflow-hidden">
          
          <SheetHeader className="p-6 pb-4 border-b border-gray-100 dark:border-white/5 bg-[#fcfcfc] dark:bg-white/5 shrink-0 relative">
            {task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED ? (
              <div className="mb-4 px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center gap-2">
                <Ban className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  This task is {task.status.toLowerCase()} and cannot be edited.
                </span>
              </div>
            ) : null}

            <div className="flex items-center gap-2 mb-5 pr-8">
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} isOverdue={isOverdue} />
              <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-md shadow-sm">
                <Building2 className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-300">
                  {task.hostel.name}
                </span>
              </div>
            </div>
            
            <SheetTitle className="sr-only">Task Details</SheetTitle>
            
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                if (title !== titleRef.current && title.trim().length >= 3) {
                  updateField("title", title);
                } else {
                  setTitle(titleRef.current);
                }
              }}
              readOnly={isReadOnly || mode === "warden"}
              className="text-[26px] font-bold bg-transparent outline-none w-full text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700 leading-tight tracking-tight focus:ring-0"
              placeholder="Task Title"
            />
            
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => {
                if (description !== descRef.current) {
                  updateField("description", description);
                }
              }}
              readOnly={isReadOnly || mode === "warden"}
              className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400 bg-transparent outline-none w-full resize-none min-h-[60px] focus:ring-0"
              placeholder="Add a description..."
            />
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex flex-col justify-center">
                  <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Assigned To</span>
                  <div className="flex items-center gap-2 text-[14px] font-medium text-gray-900 dark:text-white truncate">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{task.assignedToWarden.user.email || 'Warden'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-gray-500 mt-1.5">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    {task.assignedToWarden.user.phone}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex flex-col justify-center">
                  <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Deadline</span>
                  <div className={`flex items-center gap-2 text-[14px] font-bold ${isOverdue ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                    <Calendar className="w-4 h-4 shrink-0" />
                    {new Date(task.deadline).toLocaleDateString()}
                  </div>
                  <div className={`flex items-center gap-2 text-[13px] font-medium ${isOverdue ? 'text-red-500' : 'text-gray-500'} mt-1.5`}>
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {!isReadOnly && mode === "admin" && (
                <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-white/5">
                  <div className="space-y-3">
                    <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">Priority Level</span>
                    <div className="flex flex-wrap gap-2">
                      {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[]).map((p) => {
                        const isSelected = task.priority === p;
                        return (
                          <button
                            key={p}
                            onClick={() => updateField("priority", p)}
                            className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all border ${
                              isSelected
                                ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white shadow-md"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm dark:bg-transparent dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                            }`}
                          >
                            {p.charAt(0) + p.slice(1).toLowerCase()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">Adjust Deadline</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="datetime-local"
                        value={deadlineInput}
                        min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                        onChange={(e) => setDeadlineInput(e.target.value)}
                        className="flex-1 text-[14px] font-medium bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-gray-900/10 transition-shadow shadow-sm"
                      />
                      <Button 
                        size="sm" 
                        onClick={() => {
                          if (deadlineInput) {
                            updateField("deadline", new Date(deadlineInput).toISOString());
                          }
                        }}
                        className="rounded-xl h-[42px] px-5 font-semibold bg-gray-900 text-white hover:bg-gray-800 shadow-sm"
                      >
                        Update
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {!isReadOnly && mode === "warden" && task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED && (
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Update Status</span>
                    {task.status === TaskStatus.PENDING && (
                      <Button 
                        onClick={() => handleWardenStatusUpdate(TaskStatus.IN_PROGRESS)} 
                        className="w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold"
                      >
                        Start Task (In Progress)
                      </Button>
                    )}
                    {task.status === TaskStatus.IN_PROGRESS && (
                      <div className="space-y-3">
                        <textarea
                          value={completionNote}
                          onChange={(e) => setCompletionNote(e.target.value)}
                          className="w-full text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none resize-none min-h-[80px]"
                          placeholder="Add a completion note (required)..."
                        />
                        <Button 
                          onClick={() => {
                            if (!completionNote || completionNote.trim().length < 3) {
                              notify.error("Completion note is required");
                              return;
                            }
                            handleWardenStatusUpdate(TaskStatus.COMPLETED, completionNote);
                          }} 
                          className="w-full rounded-xl bg-green-600 text-white hover:bg-green-700 font-bold"
                        >
                          Mark as Completed
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!isReadOnly && mode === "admin" && (
                <div className="pt-8">
                  <button 
                    className="w-full py-3 rounded-xl text-[14px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 transition-colors border border-red-100 dark:border-red-900/30"
                    onClick={() => setConfirmCancelOpen(true)}
                  >
                    Delete / Cancel Task
                  </button>
                </div>
              )}
            </div>
            
            {/* Threaded Comments */}
            <TaskComments taskId={task.id} />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <AlertDialogContent className="bg-white dark:bg-[#0a0a0a] border-gray-200 dark:border-white/10 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the task as cancelled. The assigned warden will no longer need to complete it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-gray-200 dark:border-white/10">Keep Task</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleCancelTask();
              }}
              className="rounded-xl bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Yes, Cancel Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
