"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface NavbarProps {
  userName: string;
  role: string;
}

export function Navbar({ userName, role }: NavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const roleBadgeColors: Record<string, string> = {
    MAIN_ADMIN: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    WARDEN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    TENANT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  return (
    <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/anywhere-node-squre-icon.png" alt="Anywhere Node" width={24} height={24} className="rounded shrink-0" />
          <span className="text-lg font-bold tracking-tight">Anywhere Node</span>
        </Link>

        {role === "MAIN_ADMIN" && (
          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/admin"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/wardens"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Wardens
            </Link>
            <Link
              href="/admin/leads"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Leads
            </Link>
            <Link
              href="/admin/onboards"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Onboards
            </Link>
            <Link
              href="/admin/users"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Users
            </Link>
            <Link
              href="/warden/onboard"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Onboard Tenant
            </Link>
            <Link
              href="/admin/hostels/new"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Add Hostel
            </Link>
          </div>
        )}

        {role === "WARDEN" && (
          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/warden"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/warden/onboard"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Onboard
            </Link>
            <Link
              href="/warden/leads"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Leads
            </Link>
            <Link
              href="/warden/onboards"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Onboards
            </Link>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{userName}</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            roleBadgeColors[role] || "bg-gray-100 text-gray-800"
          }`}
        >
          {role === "MAIN_ADMIN" ? "Admin" : role.charAt(0) + role.slice(1).toLowerCase()}
        </span>
        <button
          onClick={handleLogout}
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
