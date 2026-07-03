"use client";

/**
 * Tenant Shell — wraps all /tenant pages.
 * The tenant dashboard is designed as a mobile-first consumer app, 
 * so it explicitly does NOT use the global admin Sidebar.
 * Navigation is handled internally via a Bottom Navigation Bar.
 */
export default function RoleShell({
  children,
  userName,
  role,
}: {
  children: React.ReactNode;
  userName: string;
  role: string;
}) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* 
        No Sidebar here. 
        The page component handles its own scroll container and bottom nav.
      */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
