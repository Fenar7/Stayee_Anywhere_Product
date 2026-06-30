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
    <div className="h-full bg-white dark:bg-black">
      {children}
    </div>
  );
}
