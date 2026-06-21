import { Navbar } from "@/components/auth/navbar";

export default function AdminShell({ children, userName, role }: { children: React.ReactNode; userName: string; role: string }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userName={userName} role={role} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
