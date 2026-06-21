import { describe, it, expect, vi, beforeEach } from "vitest";
import { StayStatus, DurationType, SharingType, OccupationType, FoodPlan, PaymentMode, PaymentStatus } from "@prisma/client";

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn((fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)),
  user: { findUnique: vi.fn() },
  tenant: { findUnique: vi.fn() },
  stay: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  bed: { update: vi.fn() },
  payment: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  stayStatusEvent: { create: vi.fn() },
  document: { create: vi.fn() },
  hostel: { findUnique: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/image", () => ({
  verifyAndGetFileType: vi.fn(() => "jpg"),
  compressImage: vi.fn(async (buf: Buffer) => ({
    data: buf,
    ext: "jpg" as const,
    mimeType: "image/jpeg" as const,
  })),
}));

vi.mock("@/lib/storage", () => ({
  uploadToStorage: vi.fn(async (buf: Buffer, path: string) => path),
  getSignedUrl: vi.fn(async (path: string) => `https://signed.url/${path}`),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

const fakeTenantSession = vi.hoisted(() => ({
  user: { id: "user-tenant-1", role: "TENANT" as const },
}));

import * as authModule from "@/lib/auth";

vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn(),
  requireHostelAccess: vi.fn().mockResolvedValue(undefined),
}));

import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

import { GET as stayGET } from "@/app/api/tenant/stay/route";
import { POST as screenshotPOST } from "@/app/api/tenant/payment/screenshot/route";

/* eslint-disable @typescript-eslint/no-explicit-any */

describe("Sprint 3.1: Tenant Portal & Stay Renewal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    vi.mocked(authModule.requireRole).mockResolvedValue(fakeTenantSession as any);

    mockPrisma.payment.create.mockResolvedValue({ id: "pay-1" });
    mockPrisma.document.create.mockResolvedValue({ id: "doc-1" });
    mockPrisma.stay.update.mockResolvedValue({ id: "stay-1" });
    mockPrisma.stayStatusEvent.create.mockResolvedValue({ id: "event-1" });
    mockPrisma.bed.update.mockResolvedValue({ id: "bed-1" });
  });

  describe("Task A: Stay Retrieval (GET /api/tenant/stay)", () => {
    it("fetches stay, bed, hostel, payments, next due date, and roommates for an active tenant", async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: "tenant-1",
        userId: "user-tenant-1",
      });
      mockPrisma.stay.findFirst.mockResolvedValueOnce({
        id: "stay-1",
        status: StayStatus.ACTIVE,
        tenantId: "tenant-1",
        hostelId: "hostel-1",
        durationType: DurationType.MONTHLY,
        joiningDate: new Date("2025-06-01T00:00:00.000Z"),
        endDate: new Date("2025-07-01T00:00:00.000Z"),
        bedId: "bed-1",
        admissionFeePaise: 100000,
        monthlyRentPaise: 500000,
        securityDepositPaise: 500000,
        foodChargesPaise: 0,
        foodPlan: FoodPlan.NOT_INCLUDED,
        totalPayablePaise: 1100000,
        discountPaise: 0,
        createdAt: new Date(),
        bed: {
          id: "bed-1",
          label: "A1",
          room: {
            id: "room-1",
            roomNumber: "101",
            sharingType: SharingType.DOUBLE,
          },
        },
        payments: [
          {
            id: "pay-1",
            amountPaidPaise: 1100000,
            paymentMode: PaymentMode.UPI,
            transactionRefNo: "UTR123",
            paymentStatus: PaymentStatus.PAID,
            createdAt: new Date("2025-06-01"),
          },
        ],
      });
      mockPrisma.hostel.findUnique.mockResolvedValue({
        id: "hostel-1",
        name: "Test Hostel",
        address: "123 Test St",
      });
      mockPrisma.stay.findMany.mockResolvedValue([
        {
          tenant: {
            fullName: "Roommate One",
            photoUrl: "tenants/roommate1/photo.jpg",
            occupationType: OccupationType.STUDENT,
            collegeName: "ABC College",
            companyName: null,
            designation: null,
          },
          bed: { label: "A2" },
        },
      ]);

      const res = await stayGET(new Request("http://localhost/api/tenant/stay") as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.stay).toBeDefined();
      expect(data.stay.id).toBe("stay-1");
      expect(data.stay.status).toBe("ACTIVE");
      expect(data.stay.durationType).toBe("MONTHLY");
      expect(data.stay.monthlyRent).toBe(5000);
      expect(data.stay.joiningDate).toBeDefined();
      expect(data.stay.endDate).toBeDefined();

      expect(data.hostel).toBeDefined();
      expect(data.hostel.name).toBe("Test Hostel");

      expect(data.bed).toBeDefined();
      expect(data.bed.roomNumber).toBe("101");
      expect(data.bed.label).toBe("A1");

      expect(data.payments).toHaveLength(1);
      expect(data.payments[0].amountPaid).toBe(11000);
      expect(data.payments[0].paymentStatus).toBe("PAID");

      expect(data.roommates).toHaveLength(1);
      expect(data.roommates[0].fullName).toBe("Roommate One");
      expect(data.roommates[0].photoUrl).toBe("https://signed.url/tenants/roommate1/photo.jpg");
      expect(data.roommates[0].bedLabel).toBe("A2");
      expect(data.roommates[0].occupationType).toBe("STUDENT");
      expect(data.roommates[0].collegeName).toBe("ABC College");

      expect(data.nextDueDate).toBeDefined();
      const nextDue = new Date(data.nextDueDate);
      expect(nextDue.getMonth()).toBe(6);
      expect(nextDue.getFullYear()).toBe(2025);
    });

    it("returns empty roommates and null nextDueDate for APPROVED_AWAITING_PAYMENT stay", async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: "tenant-1",
        userId: "user-tenant-1",
      });
      mockPrisma.stay.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: "stay-2",
          status: StayStatus.APPROVED_AWAITING_PAYMENT,
          tenantId: "tenant-1",
          hostelId: "hostel-1",
          durationType: DurationType.MONTHLY,
          joiningDate: new Date("2025-06-01"),
          endDate: new Date("2025-07-01"),
          bedId: "bed-2",
          admissionFeePaise: 100000,
          monthlyRentPaise: 500000,
          securityDepositPaise: 500000,
          foodChargesPaise: 0,
          foodPlan: FoodPlan.NOT_INCLUDED,
          totalPayablePaise: 1100000,
          discountPaise: 0,
          createdAt: new Date(),
          bed: {
            id: "bed-2",
            label: "B1",
            room: {
              id: "room-2",
              roomNumber: "102",
              sharingType: SharingType.DOUBLE,
            },
          },
          payments: [],
        });
      mockPrisma.hostel.findUnique.mockResolvedValue({
        id: "hostel-1",
        name: "Test Hostel",
        address: "123 Test St",
      });

      const res = await stayGET(new Request("http://localhost/api/tenant/stay") as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.stay.status).toBe("APPROVED_AWAITING_PAYMENT");
      expect(data.roommates).toEqual([]);
      expect(data.nextDueDate).toBeNull();
    });

    it("returns stay: null when no stay exists", async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: "tenant-1",
        userId: "user-tenant-1",
      });
      mockPrisma.stay.findFirst.mockResolvedValue(null);

      const res = await stayGET(new Request("http://localhost/api/tenant/stay") as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.stay).toBeNull();
    });
  });

  describe("Task A: Roommate Security Scope", () => {
    it("limits roommates to ACTIVE/EXTENDED stays in the same room only", async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: "tenant-1",
        userId: "user-tenant-1",
      });
      mockPrisma.stay.findFirst.mockResolvedValueOnce({
        id: "stay-1",
        status: StayStatus.ACTIVE,
        tenantId: "tenant-1",
        hostelId: "hostel-1",
        durationType: DurationType.MONTHLY,
        joiningDate: new Date("2025-06-01"),
        endDate: new Date("2025-07-01"),
        bedId: "bed-1",
        admissionFeePaise: 100000,
        monthlyRentPaise: 500000,
        securityDepositPaise: 500000,
        foodChargesPaise: 0,
        foodPlan: FoodPlan.NOT_INCLUDED,
        totalPayablePaise: 1100000,
        discountPaise: 0,
        createdAt: new Date(),
        bed: {
          id: "bed-1",
          label: "A1",
          room: { id: "room-1", roomNumber: "101", sharingType: SharingType.DOUBLE },
        },
        payments: [],
      });
      mockPrisma.hostel.findUnique.mockResolvedValue({
        id: "hostel-1",
        name: "Test Hostel",
        address: "123 Test St",
      });

      mockPrisma.stay.findMany.mockResolvedValue([
        {
          tenant: {
            fullName: "Safe Roommate",
            photoUrl: null,
            occupationType: OccupationType.STUDENT,
            collegeName: "ABC College",
            companyName: null,
            designation: null,
          },
          bed: { label: "A2" },
        },
      ]);

      const res = await stayGET(new Request("http://localhost/api/tenant/stay") as any);
      const data = await res.json();

      expect(mockPrisma.stay.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            "bed": expect.objectContaining({
              roomId: "room-1",
            }),
            tenantId: { not: "tenant-1" },
            status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
          }),
        })
      );

      const roommate = data.roommates[0];
      expect(roommate.fullName).toBe("Safe Roommate");
      expect(roommate.emergencyContactName).toBeUndefined();
      expect(roommate.permanentAddress).toBeUndefined();
      expect(roommate.dateOfBirth).toBeUndefined();
      expect(roommate.gender).toBeUndefined();
      expect(roommate.email).toBeUndefined();
    });
  });

  describe("Task B: Active/Extended Renewal Payments", () => {
    it("allows payment upload for ACTIVE stay", async () => {
      vi.mocked(authModule.requireRole).mockResolvedValue(fakeTenantSession as any);

      mockPrisma.tenant.findUnique.mockResolvedValue({ id: "tenant-1" });
      mockPrisma.stay.findFirst.mockResolvedValue({
        id: "stay-1",
        status: StayStatus.ACTIVE,
        tenantId: "tenant-1",
      });

      const formData = new FormData();
      const mockFile = new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], { type: "image/jpeg" });
      formData.append("screenshot", mockFile, "receipt.jpg");
      formData.append("amountPaid", "5000");

      const res = await screenshotPOST(
        new Request("http://localhost/tenant/screenshot", {
          method: "POST",
          body: formData,
        }) as any
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.document.create).toHaveBeenCalled();
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: {
          stayId: "stay-1",
          amountPaidPaise: 500000,
          paymentMode: PaymentMode.UPI,
          transactionRefNo: null,
          receivedBy: "Self-Uploaded (Tenant)",
          paymentStatus: PaymentStatus.PENDING,
          screenshotDocumentId: expect.any(String),
        },
      });
    });

    it("allows payment upload for EXTENDED stay", async () => {
      vi.mocked(authModule.requireRole).mockResolvedValue(fakeTenantSession as any);

      mockPrisma.tenant.findUnique.mockResolvedValue({ id: "tenant-1" });
      mockPrisma.stay.findFirst.mockResolvedValue({
        id: "stay-1",
        status: StayStatus.EXTENDED,
        tenantId: "tenant-1",
      });

      const formData = new FormData();
      const mockFile = new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: "image/png" });
      formData.append("screenshot", mockFile, "receipt.png");
      formData.append("amountPaid", "3000");

      const res = await screenshotPOST(
        new Request("http://localhost/tenant/screenshot", {
          method: "POST",
          body: formData,
        }) as any
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.stay.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
          }),
        })
      );
    });

    it("compresses image and uploads to storage inside a transaction", async () => {
      vi.mocked(authModule.requireRole).mockResolvedValue(fakeTenantSession as any);

      mockPrisma.tenant.findUnique.mockResolvedValue({ id: "tenant-1" });
      mockPrisma.stay.findFirst.mockResolvedValue({
        id: "stay-1",
        status: StayStatus.ACTIVE,
        tenantId: "tenant-1",
      });

      const formData = new FormData();
      const mockFile = new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], { type: "image/jpeg" });
      formData.append("screenshot", mockFile, "receipt.jpg");
      formData.append("amountPaid", "5000");
      formData.append("transactionRefNo", "UTR99999");

      const { compressImage } = await import("@/lib/image");
      const { uploadToStorage } = await import("@/lib/storage");

      await screenshotPOST(
        new Request("http://localhost/tenant/screenshot", {
          method: "POST",
          body: formData,
        }) as any
      );

      expect(compressImage).toHaveBeenCalledWith(expect.any(Buffer), "document");
      expect(uploadToStorage).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringMatching(/^tenants\/tenant-1\/payment_screenshot_\d+\.jpg$/),
        "image/jpeg"
      );
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("Task D: Access Control", () => {
    it("returns 401 if session is invalid", async () => {
      vi.mocked(authModule.requireRole).mockRejectedValue(new UnauthorizedError("Session invalid or expired"));

      const res = await stayGET(new Request("http://localhost/api/tenant/stay") as any);
      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 if user is not a TENANT", async () => {
      vi.mocked(authModule.requireRole).mockRejectedValue(new ForbiddenError("Access denied: requires one of the roles [TENANT]"));

      const res = await screenshotPOST(
        new Request("http://localhost/tenant/screenshot", { method: "POST" }) as any
      );
      expect(res.status).toBe(403);
    });

    it("returns 401 for invalid auth token on screenshot upload", async () => {
      vi.mocked(authModule.requireRole).mockRejectedValue(new UnauthorizedError("Session invalid or expired"));

      const res = await screenshotPOST(
        new Request("http://localhost/tenant/screenshot", { method: "POST" }) as any
      );
      expect(res.status).toBe(401);
    });
  });
});
