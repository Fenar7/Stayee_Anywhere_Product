import { prisma } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { UserRole, Prisma } from "@prisma/client";
import { TaskStatus, TaskPriority } from "@/lib/constants/tasks";

// ==========================================
// SHARED UTILS
// ==========================================

/**
 * Computes whether a task is overdue based on its status and deadline.
 * This satisfies the CTO Audit requirement to avoid an OVERDUE database state.
 */
function isTaskOverdue(status: TaskStatus, deadline: Date): boolean {
  return status !== TaskStatus.COMPLETED && status !== TaskStatus.CANCELLED && deadline < new Date();
}

/**
 * Formats a raw Prisma task to include the computed `isOverdue` flag.
 */
function formatTask<T extends { status: TaskStatus; deadline: Date }>(task: T): T & { isOverdue: boolean } {
  return {
    ...task,
    isOverdue: isTaskOverdue(task.status, task.deadline),
  };
}

// ==========================================
// ADMIN FUNCTIONS
// ==========================================

export async function createTask(data: {
  organizationId: string;
  createdByUserId: string;
  assignedToWardenId: string;
  hostelId: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  deadline: Date;
}) {
  if (data.deadline <= new Date()) {
    throw new ValidationError("Deadline must be in the future.");
  }

  // Ensure Warden and Hostel exist in the same organization
  const warden = await prisma.warden.findUnique({
    where: { id: data.assignedToWardenId },
    include: { hostel: true },
  });

  if (!warden || warden.hostel.organizationId !== data.organizationId) {
    throw new ForbiddenError("Warden not found or belongs to a different organization.");
  }

  // Ensure strict mapping between Warden and Hostel
  if (warden.hostelId !== data.hostelId) {
    throw new ValidationError("The assigned Warden does not belong to the selected Hostel.");
  }

  const task = await prisma.task.create({
    data: {
      organizationId: data.organizationId,
      createdByUserId: data.createdByUserId,
      assignedToWardenId: data.assignedToWardenId,
      hostelId: data.hostelId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      deadline: data.deadline,
    },
  });

  // TODO: Trigger notification to Warden
  
  return formatTask(task);
}

export async function updateTask(data: {
  taskId: string;
  organizationId: string;
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  deadline?: Date;
  status?: TaskStatus;
}) {
  const task = await prisma.task.findUnique({ where: { id: data.taskId } });
  
  if (!task || task.organizationId !== data.organizationId) {
    throw new NotFoundError("Task not found.");
  }

  if (data.deadline && data.deadline <= new Date()) {
    throw new ValidationError("Deadline must be in the future.");
  }

  const updated = await prisma.task.update({
    where: { id: data.taskId },
    data: {
      title: data.title,
      description: data.description,
      priority: data.priority,
      deadline: data.deadline,
      status: data.status,
    },
  });

  return formatTask(updated);
}

export async function cancelTask(taskId: string, organizationId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  
  if (!task || task.organizationId !== organizationId) {
    throw new NotFoundError("Task not found.");
  }

  if (task.status === TaskStatus.COMPLETED) {
    throw new ValidationError("Cannot cancel a completed task.");
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.CANCELLED },
  });

  return formatTask(updated);
}

export async function listTasksAdmin(params: {
  organizationId: string;
  filters: { status?: TaskStatus; hostelId?: string; wardenId?: string; priority?: TaskPriority; dateFrom?: Date; dateTo?: Date };
  sort?: string;
  pagination: { page: number; limit: number };
}) {
  const skip = (params.pagination.page - 1) * params.pagination.limit;
  
  const where: Prisma.TaskWhereInput = {
    organizationId: params.organizationId,
    ...(params.filters.status && { status: params.filters.status }),
    ...(params.filters.hostelId && { hostelId: params.filters.hostelId }),
    ...(params.filters.wardenId && { assignedToWardenId: params.filters.wardenId }),
    ...(params.filters.priority && { priority: params.filters.priority }),
    ...(params.filters.dateFrom && params.filters.dateTo && { 
      deadline: { gte: params.filters.dateFrom, lte: params.filters.dateTo } 
    }),
  };

  let orderBy: Prisma.TaskOrderByWithRelationInput = { deadline: 'asc' };
  if (params.sort === 'deadline_desc') orderBy = { deadline: 'desc' };
  if (params.sort === 'createdAt_asc') orderBy = { createdAt: 'asc' };
  if (params.sort === 'createdAt_desc') orderBy = { createdAt: 'desc' };
  if (params.sort === 'priority') orderBy = { priority: 'desc' };

  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      skip,
      take: params.pagination.limit,
      orderBy,
      include: {
        assignedToWarden: { include: { user: { select: { email: true, phone: true } } } },
        hostel: { select: { name: true } },
      }
    }),
  ]);

  return {
    data: tasks.map(formatTask),
    total,
    page: params.pagination.page,
    totalPages: Math.ceil(total / params.pagination.limit),
  };
}

export async function getTaskAdmin(taskId: string, organizationId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignedToWarden: { include: { user: { select: { email: true, phone: true } } } },
      hostel: { select: { name: true } },
      createdBy: { select: { email: true, phone: true } },
      comments: { 
        include: { user: { select: { email: true, phone: true } } },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!task || task.organizationId !== organizationId) {
    throw new NotFoundError("Task not found.");
  }

  return formatTask(task);
}

// ==========================================
// WARDEN FUNCTIONS
// ==========================================

export async function listTasksWarden(params: {
  wardenId: string;
  filters: { status?: TaskStatus | 'OVERDUE' };
  pagination: { page: number; limit: number };
}) {
  const skip = (params.pagination.page - 1) * params.pagination.limit;
  
  const where: Prisma.TaskWhereInput = {
    assignedToWardenId: params.wardenId,
  };

  if (params.filters.status === 'OVERDUE') {
    where.status = { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] };
    where.deadline = { lt: new Date() };
  } else if (params.filters.status) {
    where.status = params.filters.status;
    if (params.filters.status === TaskStatus.PENDING || params.filters.status === TaskStatus.IN_PROGRESS) {
      where.deadline = { gte: new Date() };
    }
  }

  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      skip,
      take: params.pagination.limit,
      orderBy: { deadline: 'asc' },
      include: {
        assignedToWarden: { include: { user: { select: { email: true, phone: true } } } },
        hostel: { select: { name: true } },
        createdBy: { select: { email: true, phone: true } },
      }
    }),
  ]);

  return {
    data: tasks.map(formatTask),
    total,
    page: params.pagination.page,
    totalPages: Math.ceil(total / params.pagination.limit),
  };
}

export async function getTaskWarden(taskId: string, wardenId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      createdBy: { select: { email: true, phone: true } },
      comments: { 
        include: { user: { select: { email: true, phone: true } } },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!task || task.assignedToWardenId !== wardenId) {
    throw new NotFoundError("Task not found.");
  }

  return formatTask(task);
}

export async function updateTaskStatus(data: {
  taskId: string;
  wardenId: string;
  newStatus: TaskStatus;
  completionNote?: string;
}) {
  const task = await prisma.task.findUnique({ where: { id: data.taskId } });
  
  if (!task || task.assignedToWardenId !== data.wardenId) {
    throw new NotFoundError("Task not found.");
  }

  if (task.status === TaskStatus.CANCELLED) {
    throw new ValidationError("Cannot update a cancelled task.");
  }

  if (data.newStatus === TaskStatus.COMPLETED && !data.completionNote) {
    throw new ValidationError("Completion note is required when marking a task as completed.");
  }

  const updated = await prisma.task.update({
    where: { id: data.taskId },
    data: {
      status: data.newStatus,
      completedAt: data.newStatus === TaskStatus.COMPLETED ? new Date() : null,
      completionNote: data.newStatus === TaskStatus.COMPLETED ? data.completionNote : null,
    },
  });

  // TODO: Trigger notification to Admin if COMPLETED

  return formatTask(updated);
}

// ==========================================
// SHARED FUNCTIONS
// ==========================================

export async function addTaskComment(data: {
  taskId: string;
  organizationId: string;
  userId: string;
  userRole: UserRole;
  message: string;
}) {
  const task = await prisma.task.findUnique({ 
    where: { id: data.taskId },
    include: { assignedToWarden: true } 
  });

  if (!task || task.organizationId !== data.organizationId) {
    throw new NotFoundError("Task not found.");
  }

  if (data.userRole === UserRole.WARDEN && task.assignedToWarden.userId !== data.userId) {
    throw new ForbiddenError("You are not authorized to comment on this task.");
  }

  return prisma.taskComment.create({
    data: {
      taskId: data.taskId,
      organizationId: data.organizationId,
      userId: data.userId,
      message: data.message,
    },
    include: {
      user: { select: { email: true, phone: true } }
    },
  });
}

export async function getTaskComments(
  taskId: string, 
  organizationId: string, 
  userId: string, 
  userRole: UserRole
) {
  const task = await prisma.task.findUnique({ 
    where: { id: taskId },
    include: { assignedToWarden: true } 
  });

  if (!task || task.organizationId !== organizationId) {
    throw new NotFoundError("Task not found.");
  }

  if (userRole === UserRole.WARDEN && task.assignedToWarden.userId !== userId) {
    throw new ForbiddenError("You are not authorized to view comments on this task.");
  }

  return prisma.taskComment.findMany({
    where: { taskId },
    include: {
      user: { select: { email: true, phone: true, role: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getTasksWidgetData(params: {
  scope: 'admin' | 'warden';
  organizationId: string;
  wardenId?: string;
}) {
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);

  const where = {
    organizationId: params.organizationId,
    status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
    deadline: { lte: nextWeek },
    ...(params.scope === 'warden' && { assignedToWardenId: params.wardenId }),
  };

  const tasks = await prisma.task.findMany({
    where,
    take: params.scope === 'admin' ? 8 : 6,
    orderBy: { deadline: 'asc' },
    include: {
      assignedToWarden: { include: { user: { select: { email: true, phone: true } } } },
      hostel: { select: { name: true } },
    }
  });

  return tasks.map(formatTask);
}
