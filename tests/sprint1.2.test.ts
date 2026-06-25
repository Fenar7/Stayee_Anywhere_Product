/* eslint-disable */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole, AccommodationType, SharingType, BedStatus } from "@prisma/client";
import { ValidationError, NotFoundError, ConflictError } from "../lib/errors";

const mockPrisma = vi.hoisted(() => ({
   
  $transaction: vi.fn((fn: any) => fn(mockPrisma as any)),
  hostel: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  warden: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  floor: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  flat: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
  room: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  bed: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
  stay: {
    count: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  $disconnect: vi.fn(),
}));

vi.mock("../lib/db", () => ({ prisma: mockPrisma }));

const mockCreateUser = vi.fn();
const mockDeleteUser = vi.fn();
const mockUpdateUserById = vi.fn();
const mockAdminClient = {
  auth: {
    admin: {
      createUser: mockCreateUser,
      deleteUser: mockDeleteUser,
      updateUserById: mockUpdateUserById,
    },
  },
};

vi.mock("../lib/auth/server", () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(() => mockAdminClient),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { createHostelWithWarden } from "../services/hostel/hostel.service";
import {
  createFloor,
  deleteFloor,
  createFlat,
  deleteFlat,
  createRoom,
  updateRoom,
  deleteRoom,
  updateBed,
  deleteBed,
  getFullHierarchy,
  updateBedStatus,
} from "../services/hostel/structure.service";

describe("Task A: Hostel Creation with Warden Provisioning", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockDeleteUser.mockResolvedValue({ data: {}, error: null });
  });

  it("should create hostel, supabase auth user, db user, and warden record", async () => {
    const supabaseUserId = "sb-warden-123";
    mockCreateUser.mockResolvedValue({
      data: { user: { id: supabaseUserId } },
      error: null,
    });

    const createdUser = {
      id: "db-user-123",
      supabaseAuthId: supabaseUserId,
      phone: "+919876543210",
      email: "warden@test.com",
      role: UserRole.WARDEN,
      passwordSetAt: null,
    };

    const createdHostel = {
      id: "hostel-123",
      name: "Test Hostel",
      address: "123 Test St",
      accommodationType: AccommodationType.MENS,
    };

    const txMock = {
      user: { create: vi.fn().mockResolvedValue(createdUser) },
      hostel: { create: vi.fn().mockResolvedValue(createdHostel) },
      warden: { create: vi.fn().mockResolvedValue({ id: "warden-123", userId: "db-user-123", hostelId: "hostel-123" }) },
    };

    mockPrisma.$transaction.mockImplementation(async (fn: { (tx: Record<string, unknown>): unknown }) => fn(txMock));

    const result = await createHostelWithWarden({
      name: "Test Hostel",
      address: "123 Test St",
      accommodationType: AccommodationType.MENS,
      wardenEmail: "warden@test.com",
      wardenPhone: "+919876543210",
      wardenPassword: "securePassword123",
    });

    expect(mockCreateUser).toHaveBeenCalledWith({
      email: "warden@test.com",
      password: "securePassword123",
      email_confirm: true,
    });

    expect(txMock.user.create).toHaveBeenCalledWith({
      data: {
        supabaseAuthId: supabaseUserId,
        phone: "+919876543210",
        email: "warden@test.com",
        passwordSetAt: null,
        plainTextPassword: "securePassword123",
        role: UserRole.WARDEN,
      },
    });

    expect(txMock.hostel.create).toHaveBeenCalledWith({
      data: {
        name: "Test Hostel",
        address: "123 Test St",
        accommodationType: AccommodationType.MENS,
        locationId: null,
      },
    });

    expect(txMock.warden.create).toHaveBeenCalledWith({
      data: {
        userId: "db-user-123",
        hostelId: "hostel-123",
      },
    });

    expect(result).toEqual({
      hostel: {
        id: "hostel-123",
        name: "Test Hostel",
        address: "123 Test St",
        accommodationType: AccommodationType.MENS,
        locationId: null,
      },
      warden: {
        id: "db-user-123",
        email: "warden@test.com",
        phone: "+919876543210",
      },
    });
  });

  it("should rollback supabase user on database failure", async () => {
    const supabaseUserId = "sb-warden-rollback";
    mockCreateUser.mockResolvedValue({
      data: { user: { id: supabaseUserId } },
      error: null,
    });

    mockPrisma.$transaction.mockRejectedValue(new Error("DB error"));

    await expect(
      createHostelWithWarden({
        name: "Fail Hostel",
        address: "456 Fail St",
        accommodationType: AccommodationType.WOMENS,
        wardenEmail: "fail@test.com",
        wardenPhone: "+919999999999",
        wardenPassword: "password123",
      })
    ).rejects.toThrow("DB error");

    expect(mockDeleteUser).toHaveBeenCalledWith(supabaseUserId);
  });

  it("should reject duplicate email or phone", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "existing-user",
      email: "existing@test.com",
    });

    await expect(
      createHostelWithWarden({
        name: "Dup Hostel",
        address: "789 Dup St",
        accommodationType: AccommodationType.MENS,
        wardenEmail: "existing@test.com",
        wardenPhone: "+918888888888",
        wardenPassword: "password123",
      })
    ).rejects.toThrow("A user with this email or phone already exists");
  });
});

describe("Task B: Building Structure CRUD", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("Floors", () => {
    it("should create a floor", async () => {
      const hostelData = { id: "hostel-1", name: "H1" };
      mockPrisma.hostel.findUnique.mockResolvedValue(hostelData);
      mockPrisma.floor.create.mockResolvedValue({
        id: "floor-1",
        hostelId: "hostel-1",
        name: "Ground Floor",
        sortOrder: 0,
      });

      const result = await createFloor({
        hostelId: "hostel-1",
        name: "Ground Floor",
        sortOrder: 0,
      });

      expect(result).toMatchObject({ name: "Ground Floor", sortOrder: 0 });
    });

    it("should throw if hostel not found for floor creation", async () => {
      mockPrisma.hostel.findUnique.mockResolvedValue(null);

      await expect(
        createFloor({ hostelId: "nonexistent", name: "Floor", sortOrder: 1 })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Flats", () => {
    it("should create a flat on a floor", async () => {
      mockPrisma.floor.findUnique.mockResolvedValue({ id: "floor-1", hostelId: "h-1" });
      mockPrisma.flat.create.mockResolvedValue({
        id: "flat-1",
        floorId: "floor-1",
        name: "Flat A",
        isPrivate: false,
      });

      const result = await createFlat({ floorId: "floor-1", name: "Flat A" });
      expect(result.name).toBe("Flat A");
    });
  });

  describe("Rooms", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it("should create a room with auto-generated beds", async () => {
      mockPrisma.room.findFirst.mockResolvedValue(null);
      mockPrisma.flat.findUnique.mockResolvedValue({
        id: "flat-1",
        floorId: "floor-1",
        floor: { hostelId: "h-1" },
      });

      mockPrisma.room.create.mockResolvedValue({
        id: "room-1",
        flatId: "flat-1",
        floorId: null,
        roomNumber: "101",
        sharingType: SharingType.DOUBLE,
        isPrivate: false,
        beds: [
          { id: "bed-1", label: "101-B1", bedType: "LOWER_BERTH", status: "AVAILABLE" },
          { id: "bed-2", label: "101-B2", bedType: "UPPER_BERTH", status: "AVAILABLE" },
        ],
      });

      const result = await createRoom({
        flatId: "flat-1",
        roomNumber: "101",
        sharingType: SharingType.DOUBLE,
      });

      expect(mockPrisma.room.create).toHaveBeenCalled();

      const createCall = mockPrisma.room.create.mock.calls[0][0];
      expect(createCall.data.beds.create).toHaveLength(2);
      expect(createCall.data.beds.create[0].label).toBe("101-B1");
      expect(createCall.data.beds.create[1].label).toBe("101-B2");
      expect(result).toBeDefined();
      expect(result.roomNumber).toBe("101");
    });

    it("should create correct bed count for TRIPLE sharing", async () => {
      mockPrisma.room.findFirst.mockResolvedValue(null);
      mockPrisma.floor.findUnique.mockResolvedValue({ id: "floor-1", hostelId: "h-1" });
      mockPrisma.room.create.mockResolvedValue({
        id: "room-2",
        flatId: null,
        floorId: "floor-1",
        roomNumber: "201",
        sharingType: SharingType.TRIPLE,
        isPrivate: false,
        beds: [
          { id: "b1", label: "201-B1", bedType: "LOWER_BERTH", status: "AVAILABLE" },
          { id: "b2", label: "201-B2", bedType: "UPPER_BERTH", status: "AVAILABLE" },
          { id: "b3", label: "201-B3", bedType: "LOWER_BERTH", status: "AVAILABLE" },
        ],
      });

      const result = await createRoom({
        floorId: "floor-1",
        roomNumber: "201",
        sharingType: SharingType.TRIPLE,
      });

      const createCall = mockPrisma.room.create.mock.calls[0][0];
      expect(createCall.data.beds.create).toHaveLength(3);
    });

    it("should reject when both flatId and floorId are provided", async () => {
      await expect(
        createRoom({
          flatId: "flat-1",
          floorId: "floor-1",
          roomNumber: "301",
          sharingType: SharingType.SINGLE,
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should reject when neither flatId nor floorId is provided", async () => {
      await expect(
        createRoom({
          roomNumber: "301",
          sharingType: SharingType.SINGLE,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("Delete Safety", () => {
    it("should block deleting a bed with stay history", async () => {
      mockPrisma.bed.findUnique.mockResolvedValue({ id: "bed-1", roomId: "room-1" });
      mockPrisma.stay.count.mockResolvedValue(1);

      await expect(deleteBed("bed-1")).rejects.toThrow(ConflictError);
    });

    it("should block deleting a room with beds that have stay records", async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        id: "room-1",
        beds: [{ id: "bed-1" }],
      });
      mockPrisma.stay.count.mockResolvedValue(1);

      await expect(deleteRoom("room-1")).rejects.toThrow(ConflictError);
    });

    it("should block deleting a floor with beds that have stay records", async () => {
      mockPrisma.floor.findUnique.mockResolvedValue({ id: "floor-1" });
      mockPrisma.stay.count.mockResolvedValue(1);

      await expect(deleteFloor("floor-1")).rejects.toThrow(ConflictError);
    });

    it("should block deleting a flat with beds that have stay records", async () => {
      mockPrisma.flat.findUnique.mockResolvedValue({ id: "flat-1" });
      mockPrisma.stay.count.mockResolvedValue(1);

      await expect(deleteFlat("flat-1")).rejects.toThrow(ConflictError);
    });

    it("should allow deleting a bed with no stay records", async () => {
      mockPrisma.bed.findUnique.mockResolvedValue({ id: "bed-1", roomId: "room-1" });
      mockPrisma.stay.count.mockResolvedValue(0);
      mockPrisma.bed.delete.mockResolvedValue({ id: "bed-1" });

      await expect(deleteBed("bed-1")).resolves.not.toThrow();
      expect(mockPrisma.bed.delete).toHaveBeenCalledWith({ where: { id: "bed-1" } });
    });
  });

  describe("Bed Updates", () => {
    it("should block setting status to AVAILABLE when bed has active stay", async () => {
      mockPrisma.bed.findUnique.mockResolvedValue({
        id: "bed-1",
        roomId: "room-1",
        room: { floorId: "floor-1", flatId: null, floor: { hostelId: "h-1" }, flat: null },
      });
      mockPrisma.stay.count.mockResolvedValue(1);

      await expect(
        updateBed("bed-1", { status: BedStatus.AVAILABLE })
      ).rejects.toThrow(ConflictError);
    });

    it("should allow updating label and bedType", async () => {
      mockPrisma.bed.findUnique.mockResolvedValue({
        id: "bed-1",
        roomId: "room-1",
        room: { floorId: "floor-1", flatId: null, floor: { hostelId: "h-1" }, flat: null },
      });
      mockPrisma.stay.count.mockResolvedValue(0);
      mockPrisma.bed.update.mockResolvedValue({
        id: "bed-1",
        label: "New Label",
        bedType: "LOWER_BERTH",
        status: "AVAILABLE",
        room: { floorId: "floor-1", flatId: null, floor: { hostelId: "h-1" }, flat: null },
      });

      const result = await updateBed("bed-1", {
        label: "New Label",
        bedType: "LOWER_BERTH",
      });

      expect(result.label).toBe("New Label");
    });

    it("should block room sharing type reduction if beds have stay history", async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        id: "room-1",
        sharingType: SharingType.TRIPLE,
        beds: [
          { id: "bed-1", label: "B1" },
          { id: "bed-2", label: "B2" },
          { id: "bed-3", label: "B3" },
        ],
      });

      mockPrisma.stay.count.mockResolvedValue(0);
      mockPrisma.stay.count.mockResolvedValueOnce(1);

      await expect(
        updateRoom("room-1", { sharingType: SharingType.DOUBLE })
      ).rejects.toThrow(ConflictError);
    });
  });
});

describe("Task C: Access Protection and Scoping", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should throw NotFoundError when fetching hierarchy for nonexistent hostel", async () => {
    mockPrisma.hostel.findUnique.mockResolvedValue(null);

    await expect(getFullHierarchy("nonexistent")).rejects.toThrow(NotFoundError);
  });

  it("should include derived occupancy status for beds", async () => {
    mockPrisma.hostel.findUnique.mockResolvedValue({
      id: "h-1",
      name: "H1",
      address: "Addr",
      accommodationType: "MENS",
    });

    mockPrisma.floor.findMany.mockResolvedValue([
      {
        id: "f-1",
        hostelId: "h-1",
        name: "Floor 1",
        sortOrder: 1,
        flats: [],
        rooms: [
          {
            id: "r-1",
            flatId: null,
            floorId: "f-1",
            roomNumber: "101",
            sharingType: "DOUBLE",
            isPrivate: false,
            beds: [
              { id: "b-1", roomId: "r-1", label: "101-B1", bedType: "LOWER_BERTH", status: "AVAILABLE" },
              { id: "b-2", roomId: "r-1", label: "101-B2", bedType: "UPPER_BERTH", status: "AVAILABLE" },
            ],
          },
        ],
      },
    ]);

    mockPrisma.stay.findMany.mockResolvedValue([
      {
        bedId: "b-1",
        id: "stay-1",
        status: "ACTIVE",
        tenant: { fullName: "John Doe" },
      },
    ]);

    const result = await getFullHierarchy("h-1");

    const bed1 = result.floors[0].rooms[0].beds.find((b: any) => b.id === "b-1");
    const bed2 = result.floors[0].rooms[0].beds.find((b: any) => b.id === "b-2");

    expect(bed1?.derivedStatus).toBe("OCCUPIED");
    expect(bed2?.derivedStatus).toBe("AVAILABLE");
    expect(bed1?.currentStay).toBeTruthy();
    expect(bed1?.currentStay?.tenant.fullName).toBe("John Doe");
  });

  it("should block changing bed to AVAILABLE if occupied by active stay (bed status update)", async () => {
    mockPrisma.bed.findUnique.mockResolvedValue({
      id: "bed-1",
      roomId: "room-1",
      room: {
        floor: { hostelId: "h-1" },
        flat: null,
      },
    });

    mockPrisma.stay.count.mockResolvedValue(1);

    await expect(
      updateBedStatus("bed-1", BedStatus.AVAILABLE, "h-1")
    ).rejects.toThrow(ConflictError);
  });

  it("should block setting OCCUPIED status manually via updateBedStatus", async () => {
    mockPrisma.bed.findUnique.mockResolvedValue({
      id: "bed-1",
      roomId: "room-1",
      room: {
        floor: { hostelId: "h-1" },
        flat: null,
      },
    });

    await expect(
      updateBedStatus("bed-1", BedStatus.OCCUPIED, "h-1")
    ).rejects.toThrow(ValidationError);
  });

  it("should reject warden updating bed in another hostel", async () => {
    mockPrisma.bed.findUnique.mockResolvedValue({
      id: "bed-1",
      roomId: "room-1",
      room: {
        floor: { hostelId: "hostel-A" },
        flat: null,
      },
    });

    await expect(
      updateBedStatus("bed-1", BedStatus.IN_MAINTENANCE, "hostel-B")
    ).rejects.toThrow("Bed does not belong to your hostel");
  });
});

describe("Room Validation Guards", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should reject creation when both flatId and floorId are provided (exact error checking)", async () => {
    await expect(
      createRoom({
        flatId: "flat-1",
        floorId: "floor-1",
        roomNumber: "X",
        sharingType: SharingType.SINGLE,
      })
    ).rejects.toThrow(ValidationError);
  });

  it("should reject creation when neither flatId nor floorId is provided", async () => {
    await expect(
      createRoom({
        roomNumber: "X",
        sharingType: SharingType.SINGLE,
      })
    ).rejects.toThrow(ValidationError);
  });
});
