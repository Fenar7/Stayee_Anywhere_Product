import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import RoleShell from "./shell";

export default async function WardenLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireRole([UserRole.WARDEN]);

  return (
    <RoleShell userName={user.phone} role={user.role}>
      {children}
    </RoleShell>
  );
}
