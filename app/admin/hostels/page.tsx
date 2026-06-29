import { prisma } from "@/lib/db";
import { Building2, MapPin, Users, Layers, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminHostelsPage() {
  const hostels = await prisma.hostel.findMany({
    include: {
      warden: true,
      _count: {
        select: {
          floors: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full px-4 md:px-6 xl:px-8 py-5 bg-white dark:bg-black min-h-screen">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-5 border-b border-[#dedede]">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-black dark:text-white">
            Hostels
          </h1>
          <p className="text-[#767676] text-[14px] mt-0.5">
            Manage all hostel properties and branches.
          </p>
        </div>
        <Link
          href="/admin/hostels/new"
          className="inline-flex items-center gap-2 h-10 px-5 rounded-[6px] bg-[#282828] text-white text-[14px] font-semibold hover:bg-black transition-colors whitespace-nowrap self-start"
        >
          <Plus className="size-4 text-[#58ff48]" />
          Add Hostel
        </Link>
      </div>

      {/* ── Empty State ── */}
      {hostels.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center gap-4 text-center">
          <div className="size-16 rounded-[10px] bg-[#5c5c5c] flex items-center justify-center">
            <Building2 className="size-8 text-[#58ff48]" />
          </div>
          <div>
            <h3 className="text-[18px] font-bold text-black dark:text-white">No Hostels Found</h3>
            <p className="text-[14px] text-[#767676] mt-1">
              Get started by creating your first hostel branch.
            </p>
          </div>
          <Link
            href="/admin/hostels/new"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-[6px] bg-[#282828] text-white text-[14px] font-semibold hover:bg-black transition-colors"
          >
            <Plus className="size-4 text-[#58ff48]" />
            Create Hostel
          </Link>
        </div>
      ) : (
        <>
          {/* ── Summary Bar ── */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 border-b border-[#f2f2f2] dark:border-zinc-800 mb-5">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-[#767676]" />
              <span className="text-[14px] text-[#767676]">
                <span className="font-bold text-black dark:text-white">{hostels.length}</span> Hostels
              </span>
            </div>
            <div className="w-px h-4 bg-[#dedede]" />
            <div className="flex items-center gap-2">
              <Users className="size-4 text-[#767676]" />
              <span className="text-[14px] text-[#767676]">
                <span className="font-bold text-black dark:text-white">
                  {hostels.filter((h) => h.warden).length}
                </span>{" "}
                Wardens assigned
              </span>
            </div>
          </div>

          {/* ── Hostel Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {hostels.map((hostel) => (
              <HostelCard key={hostel.id} hostel={hostel} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Hostel Card ──────────────────────────────────────────────────────────────

function HostelCard({
  hostel,
}: {
  hostel: {
    id: string;
    name: string;
    address: string;
    accommodationType: string;
    warden: { id: string; name?: string | null } | null;
    _count: { floors: number };
  };
}) {
  const typeColor =
    hostel.accommodationType === "MENS"
      ? "bg-[#e8f5e9] text-[#1b5e20] dark:bg-green-900/20 dark:text-green-400"
      : hostel.accommodationType === "WOMENS"
      ? "bg-[#fce4ec] text-[#880e4f] dark:bg-pink-900/20 dark:text-pink-400"
      : "bg-[#e3f2fd] text-[#0d47a1] dark:bg-blue-900/20 dark:text-blue-400";

  return (
    <Link href={`/admin/hostels/${hostel.id}`} className="group block">
      <div className="rounded-[7px] border border-[#dedede] bg-white dark:bg-zinc-900 hover:border-[#c0c0c0] hover:shadow-sm transition-all duration-150 overflow-hidden">
        {/* Card Header */}
        <div className="p-5 pb-4 border-b border-[#f2f2f2] dark:border-zinc-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[16px] font-bold text-black dark:text-white leading-tight truncate group-hover:text-[#282828] transition-colors">
                {hostel.name}
              </h2>
              <div className="flex items-center gap-1.5 mt-1.5">
                <MapPin className="size-3.5 text-[#a1a1a1] shrink-0" />
                <span className="text-[13px] text-[#767676] truncate">{hostel.address}</span>
              </div>
            </div>
            <div className="size-10 rounded-[7px] bg-[#5c5c5c] flex items-center justify-center shrink-0">
              <Building2 className="size-5 text-[#58ff48]" />
            </div>
          </div>
        </div>

        {/* Card Stats */}
        <div className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#f2f2f2] dark:border-zinc-800">
          <div className="flex items-center gap-1.5 text-[#767676]">
            <Users className="size-4" />
            <span className="text-[13px]">
              {hostel.warden ? "1" : "0"} Warden{hostel.warden ? "" : "s"}
            </span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-[#dedede]" />
          <div className="flex items-center gap-1.5 text-[#767676]">
            <Layers className="size-4" />
            <span className="text-[13px]">{hostel._count.floors} Floor{hostel._count.floors !== 1 ? "s" : ""}</span>
          </div>
          {hostel.warden ? (
            <div className="flex items-center gap-1.5 text-[#767676]">
              <div className="size-5 rounded-full bg-[#e0e0e0] dark:bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-[#5c5c5c] dark:text-zinc-300 uppercase">
                {(hostel.warden.name ?? "W").slice(0, 1)}
              </div>
              <span className="text-[13px] truncate max-w-[80px]">{hostel.warden.name ?? "Warden"}</span>
            </div>
          ) : (
            <span className="text-[13px] text-[#e23030]">No warden</span>
          )}
        </div>

        {/* Card Footer */}
        <div className="px-5 py-3 flex items-center justify-between">
          <span
            className={`text-[12px] font-semibold px-3 py-1 rounded-full ${typeColor}`}
          >
            {hostel.accommodationType}
          </span>
          <span className="text-[13px] font-semibold text-[#767676] group-hover:text-black dark:group-hover:text-white transition-colors flex items-center gap-1">
            Manage <ArrowRight className="size-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
