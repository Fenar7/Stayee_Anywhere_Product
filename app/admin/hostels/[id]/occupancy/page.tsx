"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";

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

function BedPill({ bed }: { bed: Bed }) {
  const isOccupied = bed.derivedStatus === "OCCUPIED";
  const isAvailable = (bed.derivedStatus || bed.status) === "AVAILABLE" && !isOccupied;
  const isMaintenance = bed.status === "IN_MAINTENANCE";
  const isOnHold = bed.status === "ON_HOLD";
  const isNotInUse = bed.status === "NOT_IN_USE";

  let bgColor = "bg-gray-100 text-gray-800 border-gray-200";
  let label = "N/A";

  if (isOccupied) {
    bgColor = "bg-red-500 text-white border-red-600";
    label = "Occupied";
  } else if (isAvailable) {
    bgColor = "bg-green-500 text-white border-green-600";
    label = "Available";
  } else if (isMaintenance) {
    bgColor = "bg-orange-400 text-white border-orange-500";
    label = "Maintenance";
  } else if (isOnHold) {
    bgColor = "bg-yellow-400 text-yellow-900 border-yellow-500";
    label = "On Hold";
  } else if (isNotInUse) {
    bgColor = "bg-gray-400 text-white border-gray-500";
    label = "Not In Use";
  }

  return (
    <div
      className={`group relative inline-flex cursor-default items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-shadow hover:shadow-md ${bgColor}`}
      title={`${bed.label} - ${label}`}
    >
      <span>{bed.label}</span>
      {bed.currentStay && (
        <span className="ml-1 hidden group-hover:inline">- {bed.currentStay.tenant.fullName}</span>
      )}
    </div>
  );
}

function RoomBlock({ room }: { room: Room }) {
  return (
    <div className={`rounded-lg border p-3 ${room.isPrivate ? "border-dashed border-gray-300 bg-gray-50" : "bg-white"}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{room.roomNumber}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {room.sharingType}
          </span>
          {room.isPrivate && (
            <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-500">Private</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{room.beds.length} bed(s)</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {room.beds.map((bed) => (
          <BedPill key={bed.id} bed={bed} />
        ))}
      </div>
    </div>
  );
}

function FlatBlock({ flat }: { flat: Flat }) {
  return (
    <div className={`rounded-lg border-2 p-4 ${flat.isPrivate ? "border-dashed border-gray-300 bg-gray-50/50" : "border-gray-200"}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="font-semibold">{flat.name}</span>
        {flat.isPrivate && (
          <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-500">Private Flat</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {flat.rooms.map((room) => (
          <RoomBlock key={room.id} room={room} />
        ))}
      </div>
      {flat.rooms.length === 0 && (
        <p className="py-2 text-center text-sm text-muted-foreground">No rooms</p>
      )}
    </div>
  );
}

function FloorSection({ floor }: { floor: Floor }) {
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="border-b bg-muted/20 px-5 py-3">
        <h2 className="text-lg font-bold">{floor.name}</h2>
      </div>

      {floor.flats.length > 0 && (
        <div className="space-y-4 p-5">
          {floor.flats.map((flat) => (
            <FlatBlock key={flat.id} flat={flat} />
          ))}
        </div>
      )}

      <div className="space-y-3 p-5 pt-0">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {floor.rooms.map((room) => (
            <RoomBlock key={room.id} room={room} />
          ))}
        </div>
        {floor.rooms.length === 0 && floor.flats.length > 0 && (
          <p className="py-2 text-center text-sm text-muted-foreground">No direct rooms on this floor</p>
        )}
      </div>
    </div>
  );
}

export default function AdminOccupancyPage() {
  const params = useParams();
  const hostelId = params.id as string;

  const [data, setData] = useState<HostelHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadData() {
    setLoading(true);
    fetch(`/api/hostel-structure/${hostelId}`)
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
    fetch(`/api/hostel-structure/${hostelId}`)
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
  }, [hostelId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading occupancy map...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Occupancy Map</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error || "Failed to load occupancy data"}
        </div>
        <button onClick={loadData} className="text-sm text-blue-600 hover:underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title={`${data.name} - Occupancy`}
        description={`${data.address} · ${data.accommodationType}`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Hostels", href: "/admin/hostels" },
          { label: data.name },
          { label: "Occupancy Map" }
        ]}
      />
      <div className="space-y-6 p-6">


      <div className="flex flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
          <span>Occupied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-orange-400" />
          <span>Maintenance</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-yellow-400" />
          <span>On Hold</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-gray-400" />
          <span>Not In Use / Private</span>
        </div>
      </div>

      {data.floors.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No structure data available.
        </div>
      ) : (
        <div className="space-y-5">
          {data.floors.map((floor) => (
            <FloorSection key={floor.id} floor={floor} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
