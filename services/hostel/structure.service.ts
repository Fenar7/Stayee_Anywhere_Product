import { prisma } from "@/lib/db";
import { ValidationError, NotFoundError, ConflictError } from "@/lib/errors";
import { SharingType, BedStatus, BedType } from "@prisma/client";

const SHARING_BED_COUNT: Record<SharingType, number> = {
  SINGLE: 1,
  DOUBLE: 2,
  TRIPLE: 3,
  FOUR: 4,
  SIX: 6,
  EIGHT: 8,
};

function generateBedLabels(roomNumber: string, sharingType: SharingType): string[] {
  const count = SHARING_BED_COUNT[sharingType];
  return Array.from({ length: count }, (_, i) => `${roomNumber}-B${i + 1}`);
}

function inferBedType(index: number, sharingType: SharingType): BedType | null {
  if (sharingType === SharingType.SINGLE) return BedType.SINGLE_COT;
  return index % 2 === 0 ? BedType.LOWER_BERTH : BedType.UPPER_BERTH;
}

async function hasAnyStaysInRoom(roomId: string): Promise<boolean> {
  const count = await prisma.stay.count({
    where: { bed: { roomId } },
  });
  return count > 0;
}

async function hasAnyStaysInBed(bedId: string): Promise<boolean> {
  const count = await prisma.stay.count({
    where: { bedId },
  });
  return count > 0;
}

async function hasAnyStaysInFloor(floorId: string): Promise<boolean> {
  const count = await prisma.stay.count({
    where: {
      bed: {
        room: {
          OR: [
            { floorId },
            { flat: { floorId } },
          ],
        },
      },
    },
  });
  return count > 0;
}

async function hasAnyStaysInFlat(flatId: string): Promise<boolean> {
  const count = await prisma.stay.count({
    where: {
      bed: {
        room: { flatId },
      },
    },
  });
  return count > 0;
}

async function hasActiveStayOnBed(bedId: string): Promise<boolean> {
  const count = await prisma.stay.count({
    where: {
      bedId,
      status: { in: ["ACTIVE", "EXTENDED"] },
      joiningDate: { lte: new Date() },
      endDate: { gte: new Date() },
    },
  });
  return count > 0;
}

export async function createFloor(data: { hostelId: string; name: string; sortOrder: number }) {
  const hostel = await prisma.hostel.findUnique({ where: { id: data.hostelId } });
  if (!hostel) throw new NotFoundError("Hostel not found");

  return prisma.floor.create({ data });
}

export async function updateFloor(id: string, data: { name?: string; sortOrder?: number }) {
  const floor = await prisma.floor.findUnique({ where: { id } });
  if (!floor) throw new NotFoundError("Floor not found");

  return prisma.floor.update({ where: { id }, data });
}

export async function deleteFloor(id: string) {
  const floor = await prisma.floor.findUnique({ where: { id } });
  if (!floor) throw new NotFoundError("Floor not found");

  if (await hasAnyStaysInFloor(id)) {
    throw new ConflictError("Cannot delete floor: one or more beds in this floor have stay records");
  }

  await prisma.floor.delete({ where: { id } });
}

export async function createFlat(data: { floorId: string; name: string; isPrivate?: boolean }) {
  const floor = await prisma.floor.findUnique({ where: { id: data.floorId } });
  if (!floor) throw new NotFoundError("Floor not found");

  return prisma.flat.create({
    data: {
      floorId: data.floorId,
      name: data.name,
      isPrivate: data.isPrivate ?? false,
    },
  });
}

export async function updateFlat(id: string, data: { name?: string; isPrivate?: boolean }) {
  const flat = await prisma.flat.findUnique({ where: { id } });
  if (!flat) throw new NotFoundError("Flat not found");

  return prisma.flat.update({ where: { id }, data });
}

export async function deleteFlat(id: string) {
  const flat = await prisma.flat.findUnique({ where: { id } });
  if (!flat) throw new NotFoundError("Flat not found");

  if (await hasAnyStaysInFlat(id)) {
    throw new ConflictError("Cannot delete flat: one or more beds in this flat have stay records");
  }

  await prisma.flat.delete({ where: { id } });
}

export async function createRoom(data: {
  flatId?: string | null;
  floorId?: string | null;
  roomNumber: string;
  sharingType: SharingType;
  isPrivate?: boolean;
}) {
  const hasFlat = !!data.flatId;
  const hasFloor = !!data.floorId;

  if (hasFlat === hasFloor) {
    throw new ValidationError("Exactly one of flatId or floorId must be provided");
  }

  if (data.flatId) {
    const flat = await prisma.flat.findUnique({ where: { id: data.flatId } });
    if (!flat) throw new NotFoundError("Flat not found");
  }

  if (data.floorId) {
    const floor = await prisma.floor.findUnique({ where: { id: data.floorId } });
    if (!floor) throw new NotFoundError("Floor not found");
  }

  const bedLabels = generateBedLabels(data.roomNumber, data.sharingType);

  const room = await prisma.room.create({
    data: {
      flatId: data.flatId ?? null,
      floorId: data.floorId ?? null,
      roomNumber: data.roomNumber,
      sharingType: data.sharingType,
      isPrivate: data.isPrivate ?? false,
      beds: {
        create: bedLabels.map((label, i) => ({
          label,
          bedType: inferBedType(i, data.sharingType),
          status: BedStatus.AVAILABLE,
        })),
      },
    },
    include: { beds: true },
  });

  return room;
}

export async function updateRoom(
  id: string,
  data: {
    roomNumber?: string;
    sharingType?: SharingType;
    isPrivate?: boolean;
    flatId?: string | null;
    floorId?: string | null;
  }
) {
  const room = await prisma.room.findUnique({
    where: { id },
    include: { beds: true },
  });
  if (!room) throw new NotFoundError("Room not found");

  if (data.sharingType && data.sharingType !== room.sharingType) {
    const currentBeds = room.beds.length;
    const newBeds = SHARING_BED_COUNT[data.sharingType];

    if (newBeds < currentBeds) {
      const bedsToRemove = room.beds.slice(newBeds);
      for (const bed of bedsToRemove) {
        if (await hasAnyStaysInBed(bed.id)) {
          throw new ConflictError(
            `Cannot reduce sharing type: bed ${bed.label} has stay records`
          );
        }
      }
    }
  }

  if (data.flatId !== undefined && data.floorId !== undefined) {
    throw new ValidationError("Exactly one of flatId or floorId must be set");
  }

  return prisma.room.update({
    where: { id },
    data: {
      ...(data.roomNumber !== undefined && { roomNumber: data.roomNumber }),
      ...(data.sharingType !== undefined && { sharingType: data.sharingType }),
      ...(data.isPrivate !== undefined && { isPrivate: data.isPrivate }),
      ...(data.flatId !== undefined && { flatId: data.flatId }),
      ...(data.floorId !== undefined && { floorId: data.floorId }),
    },
    include: { beds: true },
  });
}

export async function deleteRoom(id: string) {
  const room = await prisma.room.findUnique({
    where: { id },
    include: { beds: true },
  });
  if (!room) throw new NotFoundError("Room not found");

  if (await hasAnyStaysInRoom(id)) {
    throw new ConflictError("Cannot delete room: one or more beds in this room have stay records");
  }

  await prisma.room.delete({ where: { id } });
}

export async function updateBed(
  id: string,
  data: {
    label?: string;
    bedType?: BedType | null;
    status?: BedStatus;
  }
) {
  const bed = await prisma.bed.findUnique({
    where: { id },
    include: {
      room: true,
    },
  });
  if (!bed) throw new NotFoundError("Bed not found");

  if (data.status === BedStatus.AVAILABLE) {
    const isOccupied = await hasActiveStayOnBed(id);
    if (isOccupied) {
      throw new ConflictError("Cannot set bed to AVAILABLE: bed has an active or extended stay");
    }
  }

  return prisma.bed.update({
    where: { id },
    data: {
      ...(data.label !== undefined && { label: data.label }),
      ...(data.bedType !== undefined && { bedType: data.bedType }),
      ...(data.status !== undefined && { status: data.status }),
    },
    include: { room: true },
  });
}

export async function deleteBed(id: string) {
  const bed = await prisma.bed.findUnique({ where: { id } });
  if (!bed) throw new NotFoundError("Bed not found");

  if (await hasAnyStaysInBed(id)) {
    throw new ConflictError("Cannot delete bed: this bed has stay records");
  }

  await prisma.bed.delete({ where: { id } });
}

export async function getFullHierarchy(hostelId: string) {
  const hostel = await prisma.hostel.findUnique({ where: { id: hostelId } });
  if (!hostel) throw new NotFoundError("Hostel not found");

  const floors = await prisma.floor.findMany({
    where: { hostelId },
    orderBy: { sortOrder: "asc" },
    include: {
      flats: {
        include: {
          rooms: {
            include: {
              beds: {
                orderBy: { label: "asc" },
              },
            },
            orderBy: { roomNumber: "asc" },
          },
        },
        orderBy: { name: "asc" },
      },
      rooms: {
        include: {
          beds: {
            orderBy: { label: "asc" },
          },
        },
        orderBy: { roomNumber: "asc" },
      },
    },
  });

  const activeStays = await prisma.stay.findMany({
    where: {
      hostelId,
      status: { in: ["ACTIVE", "EXTENDED"] },
      joiningDate: { lte: new Date() },
      endDate: { gte: new Date() },
    },
    select: {
      bedId: true,
      id: true,
      status: true,
      tenant: {
        select: {
          fullName: true,
        },
      },
    },
  });

  const occupiedBedIds = new Set(activeStays.map((s) => s.bedId));
  const stayByBedId = new Map(activeStays.map((s) => [s.bedId, s]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function enrichBeds(beds: any[]) {
    return beds.map((bed) => ({
      ...bed,
      derivedStatus: occupiedBedIds.has(bed.id) ? "OCCUPIED" : bed.status,
      currentStay: stayByBedId.get(bed.id) || null,
    }));
  }

  return {
    ...hostel,
    floors: floors.map((floor) => ({
      ...floor,
      flats: floor.flats.map((flat) => ({
        ...flat,
        rooms: flat.rooms.map((room) => ({
          ...room,
          beds: enrichBeds(room.beds),
        })),
      })),
      rooms: floor.rooms.map((room) => ({
        ...room,
        beds: enrichBeds(room.beds),
      })),
    })),
  };
}

export async function updateBedStatus(
  bedId: string,
  status: BedStatus,
  hostelId: string
) {
  const bed = await prisma.bed.findUnique({
    where: { id: bedId },
    include: {
      room: {
        include: {
          floor: true,
          flat: { include: { floor: true } },
        },
      },
    },
  });

  if (!bed) throw new NotFoundError("Bed not found");

  const bedHostelId = bed.room.floor?.hostelId || bed.room.flat?.floor.hostelId;
  if (bedHostelId !== hostelId) {
    throw new ValidationError("Bed does not belong to your hostel");
  }

  if (status === BedStatus.AVAILABLE || status === BedStatus.OCCUPIED) {
    const isOccupied = await hasActiveStayOnBed(bedId);
    if (isOccupied) {
      throw new ConflictError("Cannot change status: bed has an active or extended stay");
    }
  }

  if (status === BedStatus.OCCUPIED) {
    throw new ValidationError("Status OCCUPIED is derived from active stays and cannot be set manually");
  }

  return prisma.bed.update({
    where: { id: bedId },
    data: { status },
  });
}
