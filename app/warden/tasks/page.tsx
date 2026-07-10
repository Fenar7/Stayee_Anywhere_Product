import { requireRole } from "@/lib/auth";
import { UserRole, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { TasksPageClient } from "./TasksPageClient";
import { listTasksWarden } from "@/services/tasks/task.service";
import { HostelWorkspaceLayout } from "@/components/hostel-management/HostelWorkspaceLayout";

export const metadata = {
  title: "My Tasks | Warden | NextHome",
};

export default async function WardenTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const session = await requireRole([UserRole.WARDEN]);

  const warden = await prisma.warden.findUnique({
    where: { userId: session.user.id },
    include: { hostel: true },
  });

  if (!warden) {
    redirect("/");
  }

  const { tab: rawTab, page: rawPage } = await searchParams;
  const tab = rawTab || "PENDING";
  const page = parseInt(rawPage || "1") || 1;
  const limit = 20;

  let statusFilter: TaskStatus | "OVERDUE" | undefined = undefined;
  if (tab === "PENDING")     statusFilter = TaskStatus.PENDING;
  if (tab === "IN_PROGRESS") statusFilter = TaskStatus.IN_PROGRESS;
  if (tab === "COMPLETED")   statusFilter = TaskStatus.COMPLETED;
  if (tab === "OVERDUE")     statusFilter = "OVERDUE";

  const { data: rawTasks, totalPages } = await listTasksWarden({
    wardenId: warden.id,
    filters: { status: statusFilter },
    pagination: { page, limit },
  });

  // Serialise Date objects for the client
  const tasks = rawTasks.map((t) => ({
    ...t,
    deadline:    t.deadline.toISOString(),
    createdAt:   t.createdAt.toISOString(),
    updatedAt:   t.updatedAt.toISOString(),
    completedAt: t.completedAt?.toISOString() || null,
  }));

  return (
    <HostelWorkspaceLayout
      hostelId={warden.hostelId}
      hostelName={warden.hostel.name}
      title="My Tasks"
      subtitle="Manage and track your assigned work"
      hideAdminNav={true}
    >
      <TasksPageClient
        tasks={tasks}
        currentTab={tab}
        currentPage={page}
        totalPages={totalPages}
      />
    </HostelWorkspaceLayout>
  );
}

