"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

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
    <nav className="flex h-14 items-center justify-between border-b px-6">
      <Link href="/" className="text-lg font-bold">
        NextHome
      </Link>

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
