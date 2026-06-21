"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type AccommodationType = "MENS" | "WOMENS";

type Bed = {
  id: string;
  roomId: string;
  label: string;
  bedType: "UPPER_BERTH" | "LOWER_BERTH" | "SINGLE_COT" | null;
  status: string;
  derivedStatus?: string;
};

type Room = {
  id: string;
  flatId: string | null;
  floorId: string | null;
  roomNumber: string;
  sharingType: string;
  isPrivate: boolean;
  beds: Bed[];
};

type Flat = {
  id: string;
  floorId: string;
  name: string;
  isPrivate: boolean;
  rooms: Room[];
};

type Floor = {
  id: string;
  hostelId: string;
  name: string;
  sortOrder: number;
  flats: Flat[];
  rooms: Room[];
};

type HostelHierarchy = {
  id: string;
  name: string;
  address: string;
  accommodationType: AccommodationType;
  floors: Floor[];
};

const SHARING_BED_COUNT: Record<string, number> = {
  SINGLE: 1,
  DOUBLE: 2,
  TRIPLE: 3,
  FOUR: 4,
  SIX: 6,
  EIGHT: 8,
};

function SharingBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    SINGLE: "bg-purple-100 text-purple-800",
    DOUBLE: "bg-blue-100 text-blue-800",
    TRIPLE: "bg-indigo-100 text-indigo-800",
    FOUR: "bg-teal-100 text-teal-800",
    SIX: "bg-orange-100 text-orange-800",
    EIGHT: "bg-pink-100 text-pink-800",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${colors[type] || "bg-gray-100"}`}>
      {type}
    </span>
  );
}

function StatusBadge({ status, derivedStatus }: { status: string; derivedStatus?: string }) {
  const effective = derivedStatus || status;
  const colors: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-800",
    OCCUPIED: "bg-red-100 text-red-800",
    IN_MAINTENANCE: "bg-orange-100 text-orange-800",
    ON_HOLD: "bg-yellow-100 text-yellow-800",
    NOT_IN_USE: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${colors[effective] || "bg-gray-100"}`}>
      {effective.replace(/_/g, " ")}
    </span>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === "error" ? "bg-red-600" : "bg-green-600";
  return (
    <div className={`fixed bottom-4 right-4 z-50 rounded-lg ${bg} px-4 py-3 text-white shadow-lg`}>
      {message}
    </div>
  );
}

export default function BuilderPage() {
  const params = useParams();
  const router = useRouter();
  const hostelId = params.id as string;

  const [data, setData] = useState<HostelHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [showAddFloor, setShowAddFloor] = useState(false);
  const [showAddFlat, setShowAddFlat] = useState<string | null>(null);
  const [showAddRoom, setShowAddRoom] = useState<{ floorId?: string; flatId?: string } | null>(null);
  const [showEditBed, setShowEditBed] = useState<Bed | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string; name: string } | null>(null);

  function loadData() {
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
    loadData();
  }, [hostelId]);

  async function apiCall(url: string, method: string, body?: Record<string, unknown>) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Request failed");
    }
    return res.json();
  }

  async function handleAddFloor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await apiCall("/api/admin/floors", "POST", {
        hostelId,
        name: form.get("name"),
        sortOrder: parseInt(form.get("sortOrder") as string, 10),
      });
      setShowAddFloor(false);
      setToast({ message: "Floor added successfully", type: "success" });
      loadData();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "Unknown error", type: "error" });
    }
  }

  async function handleAddFlat(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (!showAddFlat) return;
    try {
      await apiCall("/api/admin/flats", "POST", {
        floorId: showAddFlat,
        name: form.get("name"),
        isPrivate: form.get("isPrivate") === "on",
      });
      setShowAddFlat(null);
      setToast({ message: "Flat added successfully", type: "success" });
      loadData();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "Unknown error", type: "error" });
    }
  }

  async function handleAddRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (!showAddRoom) return;
    try {
      await apiCall("/api/admin/rooms", "POST", {
        ...(showAddRoom.floorId ? { floorId: showAddRoom.floorId } : {}),
        ...(showAddRoom.flatId ? { flatId: showAddRoom.flatId } : {}),
        roomNumber: form.get("roomNumber"),
        sharingType: form.get("sharingType"),
        isPrivate: form.get("isPrivate") === "on",
      });
      setShowAddRoom(null);
      setToast({ message: "Room added successfully", type: "success" });
      loadData();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "Unknown error", type: "error" });
    }
  }

  async function handleEditBed(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (!showEditBed) return;
    try {
      await apiCall(`/api/admin/beds/${showEditBed.id}`, "PUT", {
        label: form.get("label"),
        bedType: form.get("bedType") || null,
        status: form.get("status"),
      });
      setShowEditBed(null);
      setToast({ message: "Bed updated successfully", type: "success" });
      loadData();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "Unknown error", type: "error" });
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const urlMap: Record<string, string> = {
      floor: `/api/admin/floors/${confirmDelete.id}`,
      flat: `/api/admin/flats/${confirmDelete.id}`,
      room: `/api/admin/rooms/${confirmDelete.id}`,
      bed: `/api/admin/beds/${confirmDelete.id}`,
    };
    try {
      await apiCall(urlMap[confirmDelete.type], "DELETE");
      setConfirmDelete(null);
      setToast({ message: `${confirmDelete.type} deleted successfully`, type: "success" });
      loadData();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "Unknown error", type: "error" });
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading structure...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Building Structure Builder</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error || "Failed to load hostel structure"}
        </div>
          <button onClick={loadData} className="text-sm text-blue-600 hover:underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <p className="text-sm text-muted-foreground">{data.address} &middot; {data.accommodationType}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/admin/hostels/${hostelId}/occupancy`)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm hover:bg-muted"
          >
            View Occupancy
          </button>
          <button
            onClick={() => setShowAddFloor(true)}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            + Add Floor
          </button>
        </div>
      </div>

      {data.floors.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No floors yet. Click &ldquo;+ Add Floor&rdquo; to get started.
        </div>
      ) : (
        <div className="space-y-6">
          {data.floors.map((floor) => (
            <div key={floor.id} className="rounded-lg border bg-card">
              <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">{floor.name}</h2>
                  <span className="text-xs text-muted-foreground">Order: {floor.sortOrder}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddRoom({ floorId: floor.id })}
                    className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                  >
                    + Room
                  </button>
                  <button
                    onClick={() => setShowAddFlat(floor.id)}
                    className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                  >
                    + Flat
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ type: "floor", id: floor.id, name: floor.name })}
                    className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {floor.flats.length > 0 && (
                <div className="border-b px-4 py-3">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Flats
                  </h3>
                  <div className="space-y-3">
                    {floor.flats.map((flat) => (
                      <div key={flat.id} className="rounded-lg border bg-muted/20 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{flat.name}</span>
                            {flat.isPrivate && (
                              <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600">Private</span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setShowAddRoom({ flatId: flat.id })}
                              className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary hover:bg-primary/20"
                            >
                              + Room
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ type: "flat", id: flat.id, name: flat.name })}
                              className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-600 hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {flat.rooms.map((room) => (
                            <RoomCard key={room.id} room={room} onDelete={(id, name) => setConfirmDelete({ type: "room", id, name })} onEditBed={setShowEditBed} />
                          ))}
                        </div>
                        {flat.rooms.length === 0 && (
                          <p className="text-xs text-muted-foreground">No rooms in this flat.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="px-4 py-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Direct Rooms
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {floor.rooms.map((room) => (
                    <RoomCard key={room.id} room={room} onDelete={(id, name) => setConfirmDelete({ type: "room", id, name })} onEditBed={setShowEditBed} />
                  ))}
                </div>
                {floor.rooms.length === 0 && (
                  <p className="text-xs text-muted-foreground">No direct rooms on this floor.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddFloor && (
        <Modal title="Add Floor" onClose={() => setShowAddFloor(false)}>
          <form onSubmit={handleAddFloor} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Floor Name</label>
              <input name="name" required className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g. Ground Floor" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Sort Order</label>
              <input name="sortOrder" type="number" min="0" required className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="0" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddFloor(false)} className="rounded-lg border px-3 py-1.5 text-sm">Cancel</button>
              <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/80">Create</button>
            </div>
          </form>
        </Modal>
      )}

      {showAddFlat && (
        <Modal title="Add Flat" onClose={() => setShowAddFlat(null)}>
          <form onSubmit={handleAddFlat} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Flat Name</label>
              <input name="name" required className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g. Flat A" />
            </div>
            <div className="flex items-center gap-2">
              <input name="isPrivate" type="checkbox" id="flatPrivate" className="h-4 w-4" />
              <label htmlFor="flatPrivate" className="text-sm">Private Flat</label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddFlat(null)} className="rounded-lg border px-3 py-1.5 text-sm">Cancel</button>
              <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/80">Create</button>
            </div>
          </form>
        </Modal>
      )}

      {showAddRoom && (
        <Modal title="Add Room" onClose={() => setShowAddRoom(null)}>
          <form onSubmit={handleAddRoom} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Room Number</label>
              <input name="roomNumber" required className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g. 101" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Sharing Type</label>
              <select
                id="sharingType"
                name="sharingType"
                required
                className="w-full rounded-lg border px-3 py-2 text-sm"
                onChange={(e) => {
                  const preview = SHARING_BED_COUNT[e.target.value] || 0;
                  const el = document.getElementById("bedPreview");
                  if (el) el.textContent = `${preview} bed(s) will be auto-generated`;
                }}
              >
                {Object.entries(SHARING_BED_COUNT).map(([key, count]) => (
                  <option key={key} value={key}>{key} ({count} beds)</option>
                ))}
              </select>
              <p id="bedPreview" className="mt-1 text-xs text-muted-foreground">
                {SHARING_BED_COUNT.SINGLE} bed(s) will be auto-generated
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input name="isPrivate" type="checkbox" id="roomPrivate" className="h-4 w-4" />
              <label htmlFor="roomPrivate" className="text-sm">Private Room</label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddRoom(null)} className="rounded-lg border px-3 py-1.5 text-sm">Cancel</button>
              <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/80">Create</button>
            </div>
          </form>
        </Modal>
      )}

      {showEditBed && (
        <Modal title={`Edit Bed: ${showEditBed.label}`} onClose={() => setShowEditBed(null)}>
          <form onSubmit={handleEditBed} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Label</label>
              <input name="label" defaultValue={showEditBed.label} required className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Bed Type</label>
              <select name="bedType" defaultValue={showEditBed.bedType || ""} className="w-full rounded-lg border px-3 py-2 text-sm">
                <option value="">None</option>
                <option value="UPPER_BERTH">Upper Berth</option>
                <option value="LOWER_BERTH">Lower Berth</option>
                <option value="SINGLE_COT">Single Cot</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <select name="status" defaultValue={showEditBed.status} className="w-full rounded-lg border px-3 py-2 text-sm">
                <option value="AVAILABLE">Available</option>
                <option value="IN_MAINTENANCE">In Maintenance</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="NOT_IN_USE">Not In Use</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowEditBed(null)} className="rounded-lg border px-3 py-1.5 text-sm">Cancel</button>
              <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/80">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title={`Delete ${confirmDelete.type}`} onClose={() => setConfirmDelete(null)}>
          <div className="space-y-4">
            <p className="text-sm">
              Are you sure you want to delete &ldquo;{confirmDelete.name}&rdquo;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="rounded-lg border px-3 py-1.5 text-sm">Cancel</button>
              <button onClick={handleDelete} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function RoomCard({ room, onDelete, onEditBed }: { room: Room; onDelete: (id: string, name: string) => void; onEditBed: (bed: Bed) => void }) {
  return (
    <div className="rounded-md border bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{room.roomNumber}</span>
          <SharingBadge type={room.sharingType} />
          {room.isPrivate && (
            <span className="rounded bg-gray-200 px-1 py-0.5 text-xs text-gray-600">Private</span>
          )}
        </div>
        <button
          onClick={() => onDelete(room.id, room.roomNumber)}
          className="text-xs text-red-500 hover:text-red-700"
        >
          Delete
        </button>
      </div>
      <div className="space-y-1">
        {room.beds.map((bed) => (
          <div key={bed.id} className="flex items-center justify-between rounded bg-muted/30 px-2 py-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium">{bed.label}</span>
              {bed.bedType && (
                <span className="text-muted-foreground">
                  {bed.bedType === "UPPER_BERTH" ? "Upper" : bed.bedType === "LOWER_BERTH" ? "Lower" : "Cot"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <StatusBadge status={bed.status} derivedStatus={bed.derivedStatus} />
              <button
                onClick={() => onEditBed(bed)}
                className="text-blue-500 hover:text-blue-700"
                title="Edit bed"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
