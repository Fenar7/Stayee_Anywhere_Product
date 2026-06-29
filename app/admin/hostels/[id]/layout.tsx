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
    <div className="flex flex-col h-full bg-white dark:bg-black">
      <div className="flex items-center px-8 py-4 border-b border-[#dedede] dark:border-white/10 shrink-0">
        <div className="flex items-center text-[13px] text-[#767676] font-medium uppercase tracking-wider">
          <Link href="/admin/hostels" className="hover:text-black dark:hover:text-white transition-colors">
            Hostels
          </Link>
          <ChevronRight className="size-4 mx-2" />
          <span className="text-black dark:text-white font-bold">{hostel.name}</span>
        </div>
      </div>

      <div className="px-8 border-b border-[#dedede] dark:border-white/10 shrink-0">
        <AdminHostelNav hostelId={id} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
