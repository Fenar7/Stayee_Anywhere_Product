"use client";

import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TaskPriority } from "@/lib/constants/tasks";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/toast";
import { Loader2, AlertCircle } from "lucide-react";
import { createTaskSchema } from "@/lib/validation/task";

type CreateTaskForm = z.input<typeof createTaskSchema>;

interface Hostel {
  id: string;
  name: string;
  warden?: {
    id: string;
    user: { email: string | null; phone: string };
  } | null;
}

export function TaskCreateModal({
  open,
  onOpenChange,
  onTaskCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: () => void;
}) {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loadingHostels, setLoadingHostels] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      priority: TaskPriority.MEDIUM,
    },
  });

  const selectedHostelId = watch("hostelId");

  useEffect(() => {
    if (open) {
      fetchHostels();
    } else {
      reset(); // Reset form on close
    }
  }, [open, reset]);

  useEffect(() => {
    if (selectedHostelId) {
      const hostel = hostels.find((h) => h.id === selectedHostelId);
      if (hostel?.warden) {
        setValue("assignedToWardenId", hostel.warden.id, { shouldValidate: true });
      } else {
        setValue("assignedToWardenId", "", { shouldValidate: true });
      }
    }
  }, [selectedHostelId, hostels, setValue]);

  const fetchHostels = async () => {
    setLoadingHostels(true);
    try {
      const res = await fetch("/api/admin/hostels");
      if (res.ok) {
        const data = await res.json();
        setHostels(data);
      }
    } catch (err) {
      const error = err as Error;
      notify.error(error.message || "Failed to load hostels");
    } finally {
      setLoadingHostels(false);
    }
  };

  const onSubmit: SubmitHandler<CreateTaskForm> = async (data) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to create task");
      }

      notify.success("Task assigned successfully!");
      onTaskCreated();
      onOpenChange(false);
    } catch (err) {
      const error = err as Error;
      notify.error(error.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedHostel = hostels.find((h) => h.id === selectedHostelId);
  const noWarden = selectedHostelId && !selectedHostel?.warden;

  // Min date for deadline (now)
  const now = new Date();
  // Format for datetime-local: YYYY-MM-DDThh:mm
  const minDateString = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-[#0a0a0a] border-gray-200 dark:border-white/10 p-0 overflow-hidden rounded-2xl shadow-xl">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
          <DialogTitle className="text-xl font-bold">Assign New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Task Title</Label>
            <Input 
              {...register("title")} 
              placeholder="e.g., Fix plumbing in room 101" 
              className="rounded-xl border-gray-200 dark:border-white/10"
            />
            {errors.title && <p className="text-xs text-red-500 font-medium">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Description (Optional)</Label>
            <Textarea 
              {...register("description")} 
              placeholder="Provide more details..." 
              className="resize-none rounded-xl border-gray-200 dark:border-white/10 h-24"
            />
            {errors.description && <p className="text-xs text-red-500 font-medium">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Hostel</Label>
              <div className="relative">
                <select
                  {...register("hostelId")}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-sm outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-black dark:focus:ring-white transition-all disabled:opacity-50"
                  disabled={loadingHostels}
                >
                  <option value="">Select a hostel</option>
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
                {loadingHostels && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                )}
              </div>
              {errors.hostelId && <p className="text-xs text-red-500 font-medium">{errors.hostelId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Assigned Warden</Label>
              <Input
                readOnly
                value={
                  selectedHostel?.warden
                    ? selectedHostel.warden.user.email || selectedHostel.warden.user.phone
                    : ""
                }
                placeholder="Auto-selected"
                className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 rounded-xl text-gray-500 cursor-not-allowed"
              />
              <input type="hidden" {...register("assignedToWardenId")} />
            </div>
          </div>

          {noWarden && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-700 dark:text-red-400 leading-snug">
                This hostel has no warden assigned. You must assign a warden in the Hostels page before creating a task.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Priority</Label>
            <div className="flex flex-wrap gap-2">
              {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[]).map((p) => {
                const isSelected = watch("priority") === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setValue("priority", p)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
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
            <Label className="text-sm font-semibold">Deadline</Label>
            <Input
              type="datetime-local"
              {...register("deadline")}
              min={minDateString}
              className="rounded-xl border-gray-200 dark:border-white/10 w-full sm:w-auto"
            />
            {errors.deadline && <p className="text-xs text-red-500 font-medium">{errors.deadline.message}</p>}
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-white/5">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-gray-200 dark:border-white/10"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !!noWarden}
              className="rounded-xl bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Assign Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
