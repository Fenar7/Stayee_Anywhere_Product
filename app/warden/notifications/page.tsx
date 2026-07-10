import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { HostelWorkspaceLayout } from "@/components/hostel-management/HostelWorkspaceLayout";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Notifications | Warden | NextHome",
};

export default async function WardenNotificationsPage() {
  const session = await requireRole([UserRole.WARDEN]);
  const warden = await prisma.warden.findUnique({
    where: { userId: session.user.id },
    include: { hostel: true }
  });

  if (!warden) {
    redirect("/");
  }

  return (
    <HostelWorkspaceLayout
      hostelId={warden.hostelId}
      hostelName={warden.hostel.name}
      title="Notifications"
      subtitle="Stay updated with the latest alerts"
      hideAdminNav={true}
    >
      <div className="-mt-4">
        <NotificationsPanel role="WARDEN" />
      </div>
    </HostelWorkspaceLayout>
  );
}
