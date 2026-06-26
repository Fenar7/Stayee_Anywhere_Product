import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { notFound } from "next/navigation";
import StayDetailsPageView from "@/components/hostel-management/StayDetailsPageView";
import { PageHeader } from "@/components/shared/PageHeader";
import { ResetPasswordButton } from "@/components/admin/ResetPasswordButton";

export default async function AdminUserDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole([UserRole.MAIN_ADMIN]);
  const { id: userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenant: true,
      warden: true,
    },
  });

  if (!user) {
    notFound();
  }

  // If the user is a tenant, try to find their most recent stay to show full details
  if (user.role === "TENANT" && user.tenant) {
    const latestStay = await prisma.stay.findFirst({
      where: { tenantId: user.tenant.id },
      orderBy: { createdAt: "desc" },
      include: {
        hostel: true,
        tenant: {
          include: {
            user: true,
            documents: true,
          },
        },
        bed: {
          include: {
            room: true,
          },
        },
        payments: true,
        foodOrders: {
          orderBy: { forDate: "desc" },
        },
      },
    });

    if (latestStay) {
      return <StayDetailsPageView stay={latestStay} baseRoute="/admin" backUrl="/admin/users" />;
    }
  }

  // Fallback for non-tenants or tenants with no stays
  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="User Profile"
        description="Detailed information for this user."
        breadcrumbs={[{ label: "Users", href: "/admin/users" }, { label: "Profile" }]}
      />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">User Information</h3>
            <ResetPasswordButton userId={user.id} userPhone={user.phone} />
          </div>
          <div className="space-y-4">
            <div>
              <span className="text-muted-foreground font-medium text-sm">Phone: </span>
              <span>{user.phone}</span>
            </div>
            {user.email && (
              <div>
                <span className="text-muted-foreground font-medium text-sm">Email: </span>
                <span>{user.email}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground font-medium text-sm">Role: </span>
              <span>{user.role}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
