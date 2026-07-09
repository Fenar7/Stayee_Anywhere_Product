import { TaskPriority, TaskStatus, UserRole } from "@prisma/client";

export interface TaskCommentDTO {
  id: string;
  taskId: string;
  userId: string;
  message: string;
  createdAt: string;
  user: {
    email: string | null;
    phone: string;
    role: UserRole;
  };
}

export interface TaskDTO {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string; // ISO string from API
  completedAt: string | null;
  completionNote: string | null;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  hostelId: string;
  assignedToWardenId: string;
  createdByUserId: string;

  // Joined fields
  hostel: {
    name: string;
  };
  assignedToWarden: {
    id: string;
    user: {
      email: string | null;
      phone: string;
    };
  };
  createdBy: {
    email: string | null;
    phone: string;
  };
  comments?: TaskCommentDTO[];
}

export interface TasksListResponse {
  tasks: TaskDTO[];
  pagination: {
    total: number;
    pages: number;
    page: number;
    limit: number;
  };
}

export interface DashboardTaskDTO {
  id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string;
  hostel: {
    name: string;
  };
  assignedToWarden: {
    user: {
      email: string | null;
      phone: string;
    };
  };
}
