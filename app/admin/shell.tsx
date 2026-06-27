import { Sidebar } from "@/components/shared/Sidebar";

/**
 * AdminShell — wraps all /admin pages with the shared sidebar layout.
 * Receives hydrated user info from the server-side AdminLayout.
 */
export default function AdminShell({
  children,
  userName,
  role,
}: {
  children: React.ReactNode;
  userName: string;
  role: string;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar role="MAIN_ADMIN" userName={userName} />
      {/* Offset for mobile hamburger button */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
