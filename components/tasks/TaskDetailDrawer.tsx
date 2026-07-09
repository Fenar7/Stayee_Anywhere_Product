"use client";

import { useEffect, useState, useRef } from "react";
import { TaskDTO } from "@/types/tasks";
import { TaskPriority, TaskStatus } from "@prisma/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PriorityBadge, StatusBadge } from "./TaskBadge";
import { TaskComments } from "./TaskComments";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/toast";
import { Loader2, Mail, Phone, Calendar, Clock, User, Ban } from "lucide-react";
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
          
          <SheetHeader className="p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 shrink-0">
            {task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED ? (
              <div className="mb-4 px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center gap-2">
                <Ban className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  This task is {task.status.toLowerCase()} and cannot be edited.
                </span>
              </div>
            ) : null}

            <div className="flex items-center gap-2 mb-3">
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} isOverdue={isOverdue} />
              <span className="ml-auto text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                {task.hostel.name}
              </span>
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
              className="text-xl font-black bg-transparent outline-none w-full text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700"
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
              className="mt-2 text-sm text-gray-500 bg-transparent outline-none w-full resize-none min-h-[60px]"
              placeholder="Add a description..."
            />
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assigned To</span>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white truncate">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{task.assignedToWarden.user.email || 'Warden'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                    <Phone className="w-3 h-3 shrink-0" />
                    {task.assignedToWarden.user.phone}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deadline</span>
                  <div className={`flex items-center gap-1.5 text-sm font-bold ${isOverdue ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                    <Calendar className="w-4 h-4 shrink-0" />
                    {new Date(task.deadline).toLocaleDateString()}
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-red-400' : 'text-gray-500'} mt-1`}>
                    <Clock className="w-3 h-3 shrink-0" />
                    {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {!isReadOnly && mode === "admin" && (
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Update Priority</span>
                    <div className="flex flex-wrap gap-2">
                      {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[]).map((p) => {
                        const isSelected = task.priority === p;
                        return (
                          <button
                            key={p}
                            onClick={() => updateField("priority", p)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                              isSelected
                                ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 dark:bg-transparent dark:border-white/10 dark:hover:border-white/20"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Update Deadline</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="datetime-local"
                        value={deadlineInput}
                        min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                        onChange={(e) => setDeadlineInput(e.target.value)}
                        className="text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none"
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          if (deadlineInput) {
                            updateField("deadline", new Date(deadlineInput).toISOString());
                          }
                        }}
                        className="rounded-xl border-gray-200 dark:border-white/10 h-[38px]"
                      >
                        Save
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
                          id="completionNote"
                          className="w-full text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none resize-none min-h-[80px]"
                          placeholder="Add a completion note (required)..."
                        />
                        <Button 
                          onClick={() => {
                            const note = (document.getElementById('completionNote') as HTMLTextAreaElement)?.value;
                            if (!note || note.trim().length < 3) {
                              notify.error("Completion note is required");
                              return;
                            }
                            handleWardenStatusUpdate(TaskStatus.COMPLETED, note);
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
                <div className="pt-6">
                  <Button 
                    variant="outline" 
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
                    onClick={() => setConfirmCancelOpen(true)}
                  >
                    Cancel Task
                  </Button>
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
