"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import {
  Bell,
  Plus,
  Search,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HostelWorkspaceLayout } from "./HostelWorkspaceLayout";

// ─── Types ──────────────────────────────────────────────────────────────────────
type Bed = {
  id: string;
  label: string;
  bedType: string | null;
  status: string;
  derivedStatus?: string;
  currentStay?: {
    id: string;
    status: string;
    tenant: { fullName: string };
  } | null;
};

type Room = {
  id: string;
  roomNumber: string;
  sharingType: string;
  isPrivate: boolean;
  beds: Bed[];
};

type Flat = {
  id: string;
  name: string;
  isPrivate: boolean;
  rooms: Room[];
};

type Floor = {
  id: string;
  name: string;
  flats: Flat[];
  rooms: Room[];
};

type HostelHierarchy = {
  id: string;
  name: string;
  address: string;
  accommodationType: string;
  floors: Floor[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
const formatSharing = (sharing: string, isPrivate: boolean) => {
  if (isPrivate && sharing === "SINGLE") return "Studio | Premium";
  switch (sharing) {
    case "SINGLE": return "Single | AC";
    case "DOUBLE": return "2 Sharing | AC";
    case "TRIPLE": return "3 Sharing | AC";
    case "FOUR": return "4 Sharing | AC";
    case "SIX": return "6 Sharing | AC";
    case "EIGHT": return "8 Sharing | AC";
    default: return `${sharing} | AC`;
  }
};

const getBedColor = (status: string) => {
  if (status === "OCCUPIED") return "bg-[#ef4444] text-white border-[#ef4444]"; // Red
  if (status === "AVAILABLE") return "bg-white text-[#22c55e] border-[#22c55e]"; // Green Outline
  if (status === "ON_HOLD") return "bg-[#eab308] text-white border-[#eab308]"; // Yellow Fill
  if (status === "BOOKED" || status === "RESERVED") return "bg-[#2563eb] text-white border-[#2563eb]"; // Blue Fill
  if (status === "IN_MAINTENANCE" || status === "NOT_IN_USE") return "bg-[#1a1a1a] text-white border-[#1a1a1a]"; // Black Fill for Blocked
  
  return "bg-gray-100 text-gray-400 border-gray-200";
};

// ─── Main Component ──────────────────────────────────────────────────────────────
export default function HostelOccupancyView({ hostelId, hostelName, baseRoute }: { hostelId: string | null; hostelName?: string; baseRoute: string }) {
  const [data, setData] = useState<HostelHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const router = useRouter();

  function loadData() {
    setLoading(true);
    fetch(`/api/warden/stays/natural-checkout${hostelId ? `?hostelId=${hostelId}` : ""}`, { method: "POST" })
      .catch(() => {})
      .then(() => {
        const url = hostelId
          ? `/api/hostel-structure/mine?hostelId=${hostelId}`
          : "/api/hostel-structure/mine";
        return fetch(url, { cache: "no-store" });
      })
      .then((res) => {
        if (!res.ok) return res.json().then((err) => Promise.reject(new Error(err.error || "Failed to fetch")));
        return res.json();
      })
      .then((json) => {
        setData(json);
        setError(null);
      })
      .catch((e: Error) => {
        setError(e.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadData();
  }, [hostelId]);

  // ── Stats Calculation ──
  const stats = useMemo(() => {
    let totalBeds = 0;
    let availableBeds = 0;
    let singleBerth = 0;
    let lowerBerth = 0;
    let upperBerth = 0;
    let studio = 0;
    let totalRooms = 0;
    let booked = 0;
    let blocked = 0;

    if (!data) return null;

    data.floors.forEach(floor => {
      const allRooms = [...floor.rooms, ...floor.flats.flatMap(f => f.rooms)];
      totalRooms += allRooms.length;

      allRooms.forEach(room => {
        if (room.isPrivate && room.sharingType === "SINGLE") {
          studio += room.beds.length;
        }

        room.beds.forEach(bed => {
          totalBeds++;
          const status = bed.derivedStatus || bed.status;
          
          if (status === "AVAILABLE") availableBeds++;
          if (status === "ON_HOLD") booked++;
          if (status === "IN_MAINTENANCE" || status === "NOT_IN_USE") blocked++;

          if (bed.bedType === "SINGLE_COT" && !(room.isPrivate && room.sharingType === "SINGLE")) singleBerth++;
          if (bed.bedType === "LOWER_BERTH") lowerBerth++;
          if (bed.bedType === "UPPER_BERTH") upperBerth++;
        });
      });
    });

    return {
      totalBeds, availableBeds, singleBerth, lowerBerth, upperBerth, studio,
      totalRooms, booked, blocked, totalFloors: data.floors.length
    };
  }, [data]);


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm font-medium text-gray-500 animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  if (!hostelId) {
    return (
      <div className="space-y-4 p-8">
        <h1 className="text-3xl font-bold tracking-tight">Occupancy</h1>
        <p className="text-muted-foreground">No hostel selected.</p>
      </div>
    );
  }

  const Actions = (
    <>
      <button className="flex items-center justify-center gap-2 premium-button-outline whitespace-nowrap">
        Export Data
      </button>
      <button
        onClick={() => router.push(`${baseRoute}/builder`)}
        className="flex items-center justify-center gap-2 premium-button whitespace-nowrap"
      >
        Manage Rooms <Plus className="size-4" />
      </button>
    </>
  );

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error || "Failed to load data"}
        </div>
      </div>
    );
  }

  return (
    <HostelWorkspaceLayout
      hostelId={hostelId}
      hostelName={hostelName}
      title="Hostel Occupancy"
      subtitle="View and manage room assignments"
      actions={Actions}
    >
      <div className="w-full">

        {/* ── Stats ── */}
        <div className="flex flex-col gap-2.5 text-[14px] font-medium text-[#1a1a1a] mb-6">
          <div className="flex items-center gap-6 flex-wrap">
            <span>Total Available Beds : {stats?.availableBeds}</span>
            <span>Single Berth : {stats?.singleBerth}</span>
            <span>Lower Berth : {stats?.lowerBerth}</span>
            <span>Upper Berth : {stats?.upperBerth}</span>
            <span>Studio : {stats?.studio}</span>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <span>Total Floors : {stats?.totalFloors}</span>
            <span>Total Rooms : {stats?.totalRooms}</span>
            <span>Available : {stats?.availableBeds}</span>
            <span>Booked : {stats?.booked}</span>
            <span>Blocked : {stats?.blocked}</span>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex items-center gap-3 flex-wrap pb-2">
          <div className="relative w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search Room"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[36px] pl-9 pr-3 rounded-md border border-[#e5e7eb] text-[13px] outline-none focus:border-[#4b5563]"
            />
          </div>
          <select className="h-[36px] px-3 w-[120px] rounded-md border border-[#e5e7eb] text-[13px] text-[#4b5563] outline-none bg-white">
            <option>Floor</option>
          </select>
          <select className="h-[36px] px-3 w-[120px] rounded-md border border-[#e5e7eb] text-[13px] text-[#4b5563] outline-none bg-white">
            <option>Tier</option>
          </select>
          <select className="h-[36px] px-3 w-[120px] rounded-md border border-[#e5e7eb] text-[13px] text-[#4b5563] outline-none bg-white">
            <option>Status</option>
          </select>
        </div>
      </div>

      {/* ── Floors & Rooms ── */}
      <div className="p-6">
        {data.floors.map((floor) => {
          // Flatten rooms (direct + flat rooms)
          const allRooms = [...floor.rooms, ...floor.flats.flatMap(f => f.rooms)];
          
          // Filter by search
          const filteredRooms = allRooms.filter(r => 
            !search.trim() || r.roomNumber.toLowerCase().includes(search.toLowerCase())
          );

          if (filteredRooms.length === 0) return null;

          return (
            <div key={floor.id} className="mb-10 last:mb-0">
              <h2 className="text-[16px] font-semibold text-[#1a1a1a] mb-5">{floor.name}</h2>
              <div className="flex flex-wrap gap-4">
                {filteredRooms.map((room) => {
                  const lbs = room.beds.filter(b => b.bedType === "LOWER_BERTH");
                  const ubs = room.beds.filter(b => b.bedType === "UPPER_BERTH");
                  const singles = room.beds.filter(b => b.bedType === "SINGLE_COT" || b.bedType === null);

                  const hasColumns = lbs.length > 0 || ubs.length > 0;

                  return (
                    <div key={room.id} className="w-[160px] rounded-[8px] border border-[#e5e7eb] bg-white p-4 flex flex-col items-center hover:border-[#d1d5db] transition-colors">
                      {/* Room Header */}
                      <div className="flex items-center justify-center gap-1.5 mb-1 w-full">
                        <span className="text-[15px] font-semibold text-[#1a1a1a]">Room {room.roomNumber}</span>
                        <button className="text-[#1a1a1a] hover:text-[#4b5563] transition-colors">
                          <Pencil className="size-3.5" strokeWidth={2.5} />
                        </button>
                      </div>
                      <p className="text-[12px] text-[#6b7280] mb-5 text-center">
                        {formatSharing(room.sharingType, room.isPrivate)}
                      </p>

                      {/* Beds Layout */}
                      {hasColumns ? (
                        <div className="flex justify-center gap-4 mt-auto w-full">
                          {/* Lower Berth Column */}
                          {lbs.length > 0 && (
                            <div className="flex flex-col items-center">
                              <span className="text-[13px] font-semibold text-[#1a1a1a] mb-2">LB</span>
                              <div className="flex flex-col gap-2">
                                {lbs.map(bed => (
                                  <div
                                    key={bed.id}
                                    onClick={() => {
                                      if (bed.currentStay) router.push(`${baseRoute}/stays/${bed.currentStay.id}`);
                                    }}
                                    className={cn(
                                      "h-[40px] min-w-[40px] px-2 w-fit rounded-[6px] border flex items-center justify-center text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-80",
                                      getBedColor(bed.derivedStatus || bed.status)
                                    )}
                                    title={bed.currentStay ? `Occupied by ${bed.currentStay.tenant.fullName}` : bed.label}
                                  >
                                    {bed.label}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Upper Berth Column */}
                          {ubs.length > 0 && (
                            <div className="flex flex-col items-center">
                              <span className="text-[13px] font-semibold text-[#1a1a1a] mb-2">UB</span>
                              <div className="flex flex-col gap-2">
                                {ubs.map(bed => (
                                  <div
                                    key={bed.id}
                                    onClick={() => {
                                      if (bed.currentStay) router.push(`${baseRoute}/stays/${bed.currentStay.id}`);
                                    }}
                                    className={cn(
                                      "h-[40px] min-w-[40px] px-2 w-fit rounded-[6px] border flex items-center justify-center text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-80",
                                      getBedColor(bed.derivedStatus || bed.status)
                                    )}
                                    title={bed.currentStay ? `Occupied by ${bed.currentStay.tenant.fullName}` : bed.label}
                                  >
                                    {bed.label}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap justify-center gap-2 mt-auto w-full">
                          {singles.map(bed => (
                            <div
                              key={bed.id}
                              onClick={() => {
                                if (bed.currentStay) router.push(`${baseRoute}/stays/${bed.currentStay.id}`);
                              }}
                              className={cn(
                                "h-[40px] min-w-[40px] px-2 rounded-[6px] border flex items-center justify-center text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-80",
                                getBedColor(bed.derivedStatus || bed.status)
                              )}
                              title={bed.currentStay ? `Occupied by ${bed.currentStay.tenant.fullName}` : bed.label}
                            >
                              {bed.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </HostelWorkspaceLayout>
  );
}
