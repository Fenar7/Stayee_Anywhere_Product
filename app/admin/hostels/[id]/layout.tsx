import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import AdminHostelNav from "@/components/admin/AdminHostelNav";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function AdminHostelWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  await requireRole([UserRole.MAIN_ADMIN]);
  const { id } = await params;

  const hostel = await prisma.hostel.findUnique({
    where: { id },
    select: { name: true },
  });

  if (!hostel) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center text-sm text-muted-foreground">
        <Link href="/admin/hostels" className="hover:text-foreground transition-colors">
          Hostels
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground">{hostel.name}</span>
      </div>

      <AdminHostelNav hostelId={id} />

      <div className="flex-1 rounded-xl bg-background border shadow-sm p-6 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
