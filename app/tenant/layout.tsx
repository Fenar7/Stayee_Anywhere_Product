import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import RoleShell from "./shell";

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireRole([UserRole.TENANT]);

  return (
    <RoleShell userName={user.phone} role={user.role}>
      {children}
    </RoleShell>
  );
}
