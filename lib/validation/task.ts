import { z } from "zod";
import { TaskPriority, TaskStatus } from "@/lib/constants/tasks";

export const createTaskSchema = z.object({
  assignedToWardenId: z.string().uuid("Invalid Warden ID"),
  hostelId: z.string().uuid("Invalid Hostel ID"),
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title is too long"),
  description: z.string().max(500, "Description is too long").optional().nullable(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  deadline: z.coerce.date().refine((date) => date > new Date(), {
    message: "Deadline must be in the future",
  }),
});

export const updateTaskAdminSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  priority: z.nativeEnum(TaskPriority).optional(),
  deadline: z.coerce.date().refine((date) => date > new Date(), {
    message: "Deadline must be in the future",
  }).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
});

export const updateTaskStatusWardenSchema = z.object({
  status: z.nativeEnum(TaskStatus).refine(val => val === TaskStatus.IN_PROGRESS || val === TaskStatus.COMPLETED, {
    message: "Wardens can only update status to IN_PROGRESS or COMPLETED"
  }),
  completionNote: z.string().max(500, "Completion note too long").optional(),
}).refine(data => {
  if (data.status === TaskStatus.COMPLETED && (!data.completionNote || data.completionNote.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Completion note is required when marking a task as completed",
  path: ["completionNote"]
});

export const taskCommentSchema = z.object({
  message: z.string().min(1, "Comment cannot be empty").max(1000, "Comment is too long"),
});
