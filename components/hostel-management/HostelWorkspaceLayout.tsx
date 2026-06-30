import AdminHostelNav from "@/components/admin/AdminHostelNav";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function HostelWorkspaceLayout({
  hostelId,
  hostelName,
  title,
  subtitle,
  actions,
  children,
}: {
  hostelId: string;
  hostelName?: string;
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col bg-white dark:bg-black w-full min-h-full">
      {/* Top Bar: Breadcrumbs + Title + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 md:px-6 xl:px-8 py-2.5 border-b border-[#dedede] dark:border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[18px] font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
            {title}
          </h1>
          
          {(hostelName || subtitle) && (
            <div className="flex items-center gap-3 text-[13px] text-[#767676]">
              {hostelName && (
                <>
                  <span className="w-px h-4 bg-[#dedede] dark:bg-white/20" />
                  <div className="flex items-center gap-1.5">
                    <Link href="/admin/hostels" className="hover:text-black dark:hover:text-white transition-colors">
                      Hostels
                    </Link>
                    <ChevronRight className="size-3.5" />
                    <span className="text-black dark:text-white font-medium">{hostelName}</span>
                  </div>
                </>
              )}
              {subtitle && (
                <>
                  <span className="w-px h-4 bg-[#dedede] dark:bg-white/20" />
                  <span className="font-medium">{subtitle}</span>
                </>
              )}
            </div>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-2 mt-3 sm:mt-0 flex-wrap sm:flex-nowrap">
            {actions}
          </div>
        )}
      </div>

      {/* Tabs Row */}
      <div className="px-4 md:px-6 xl:px-8 border-b border-[#dedede] dark:border-white/10 shrink-0">
        <AdminHostelNav hostelId={hostelId} />
      </div>

      {/* Content */}
      <div className="w-full">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full px-4 md:px-6 xl:px-8 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
