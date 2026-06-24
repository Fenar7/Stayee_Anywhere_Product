import { describe, it, expect, vi, beforeEach } from "vitest";
import { StayStatus, DurationType, SharingType, FoodPlan, PaymentMode, PaymentStatus, BedStatus, DocumentOwnerType, DocumentType } from "@prisma/client";

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
  payment: { create: vi.fn() },
  stayStatusEvent: { create: vi.fn() },
  document: { create: vi.fn() },
  hostel: { findUnique: vi.fn() },
  refundInvoice: { create: vi.fn() },
  foodOrder: { deleteMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

vi.mock("@/services/pdf/refund-invoice.service", () => ({
  generateRefundInvoice: vi.fn().mockResolvedValue({
    documentId: "doc-new",
    storagePath: "refund.pdf",
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

const fakeWardenSession = vi.hoisted(() => ({
  user: {
    id: "user-warden-1",
    role: "WARDEN" as const,
    warden: {
      id: "warden-1",
      hostelId: "hostel-1",
    },
  },
}));

import * as authModule from "@/lib/auth";

vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn(),
  requireHostelAccess: vi.fn().mockResolvedValue(undefined),
}));

import { ValidationError, ForbiddenError, ConflictError, NotFoundError } from "@/lib/errors";

import { GET as stayDetailsGET } from "@/app/api/warden/stays/[id]/route";
import { POST as extendPOST } from "@/app/api/warden/stays/[id]/extend/route";
import { POST as earlyCheckoutPOST } from "@/app/api/warden/stays/[id]/early-checkout/route";

/* eslint-disable @typescript-eslint/no-explicit-any */

describe("Sprint 3.2: Warden Stay Lifecycle Controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    vi.mocked(authModule.requireRole).mockResolvedValue(fakeWardenSession as any);

    mockPrisma.payment.create.mockResolvedValue({ id: "pay-new" });
    mockPrisma.document.create.mockResolvedValue({ id: "doc-new" });
    mockPrisma.refundInvoice.create.mockResolvedValue({ id: "refund-new" });
    mockPrisma.stay.update.mockResolvedValue({ id: "stay-1" });
    mockPrisma.stayStatusEvent.create.mockResolvedValue({ id: "event-new" });
    mockPrisma.bed.update.mockResolvedValue({ id: "bed-1" });
    mockPrisma.foodOrder.deleteMany.mockResolvedValue({ count: 5 });
  });

  describe("GET /api/warden/stays/[id]", () => {
    it("fetches stay, tenant details, bed, and payments successfully for a warden", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue({
        id: "stay-1",
        hostelId: "hostel-1",
        status: StayStatus.ACTIVE,
        durationType: DurationType.MONTHLY,
        joiningDate: new Date("2025-06-01T00:00:00.000Z"),
        endDate: new Date("2025-07-01T00:00:00.000Z"),
        bedId: "bed-1", payments: [{ amountPaise: 10000000, paymentStatus: "SUCCESS", receiptNumber: 123, receiptNumber: 123 }],
        admissionFeePaise: 100000,
        monthlyRentPaise: 500000,
        securityDepositPaise: 500000,
        foodChargesPaise: 0,
        foodPlan: FoodPlan.NOT_INCLUDED,
        totalPayablePaise: 1100000,
        discountPaise: 0,
        tenant: {
          fullName: "Tenant One",
          photoUrl: "tenant1.jpg",
          occupationType: "STUDENT",
          collegeName: "ABC College",
          companyName: null,
          designation: null,
        },
        bed: {
          id: "bed-1",
          label: "A1",
          room: {
            roomNumber: "101",
            sharingType: SharingType.DOUBLE,
          },
        },
        payments: [
          {
            id: "pay-1",
            amountPaidPaise: 1100000,
            paymentMode: PaymentMode.UPI,
            transactionRefNo: "UTR1",
            paymentStatus: PaymentStatus.PAID,
            createdAt: new Date(),
          },
        ],
        refundInvoices: [],
      });

      const res = await stayDetailsGET(
        new Request("http://localhost/api/warden/stays/stay-1") as any,
        { params: Promise.resolve({ id: "stay-1" }) }
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.stay.id).toBe("stay-1");
      expect(data.stay.tenant.fullName).toBe("Tenant One");
      expect(data.stay.bed.roomNumber).toBe("101");
      expect(data.stay.monthlyRent).toBe(5000);
      expect(data.stay.payments).toHaveLength(1);
    });

    it("throws ForbiddenError if warden tries to query stay in another hostel", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue({
        id: "stay-2",
        hostelId: "hostel-different",
      });

      const res = await stayDetailsGET(
        new Request("http://localhost/api/warden/stays/stay-2") as any,
        { params: Promise.resolve({ id: "stay-2" }) }
      );
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.code).toBe("FORBIDDEN");
    });
  });

  describe("POST /api/warden/stays/[id]/extend", () => {
    it("successfully extends an active stay and creates a pending payment", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue({
        id: "stay-1",
        hostelId: "hostel-1",
        status: StayStatus.ACTIVE,
        endDate: new Date("2025-07-01T00:00:00.000Z"),
        bedId: "bed-1", payments: [{ amountPaise: 10000000, paymentStatus: "SUCCESS", receiptNumber: 123, receiptNumber: 123 }],
        totalPayablePaise: 100000,
      });

      mockPrisma.stay.findFirst.mockResolvedValue(null); // No conflicts

      const res = await extendPOST(
        new Request("http://localhost/api/warden/stays/stay-1/extend", {
          method: "POST",
          body: JSON.stringify({
            newEndDate: "2025-08-01T00:00:00.000Z",
            additionalRent: 5000,
            additionalFoodCharges: 1000,
          }),
        }) as any,
        { params: Promise.resolve({ id: "stay-1" }) }
      );

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify transaction queries
      expect(mockPrisma.stay.update).toHaveBeenCalledWith({
        where: { id: "stay-1" },
        data: expect.objectContaining({
          status: StayStatus.EXTENDED,
          endDate: new Date("2025-08-01T00:00:00.000Z"),
          totalPayablePaise: 700000, // 100000 + 500000 + 100000
        }),
      });

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: {
          stayId: "stay-1",
          amountPaidPaise: 600000, // 5000 + 1000
          paymentMode: PaymentMode.UPI,
          receivedBy: "System (Extension Request)",
          paymentStatus: PaymentStatus.PENDING,
        },
      });
    });

    it("throws ValidationError if newEndDate is not after current endDate", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue({
        id: "stay-1",
        hostelId: "hostel-1",
        status: StayStatus.ACTIVE,
        endDate: new Date("2025-07-01T00:00:00.000Z"),
      });

      const res = await extendPOST(
        new Request("http://localhost/api/warden/stays/stay-1/extend", {
          method: "POST",
          body: JSON.stringify({
            newEndDate: "2025-06-30T00:00:00.000Z",
            additionalRent: 5000,
            additionalFoodCharges: 0,
          }),
        }) as any,
        { params: Promise.resolve({ id: "stay-1" }) }
      );

      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("throws ValidationError if additionalRent exceeds transaction limit of 100k", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue({
        id: "stay-1",
        hostelId: "hostel-1",
        status: StayStatus.ACTIVE,
        endDate: new Date("2025-07-01T00:00:00.000Z"),
      });

      const res = await extendPOST(
        new Request("http://localhost/api/warden/stays/stay-1/extend", {
          method: "POST",
          body: JSON.stringify({
            newEndDate: "2025-08-01T00:00:00.000Z",
            additionalRent: 150000, // Exceeds limit
            additionalFoodCharges: 0,
          }),
        }) as any,
        { params: Promise.resolve({ id: "stay-1" }) }
      );

      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("throws ConflictError if bed has overlapping active stay during the extension window", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue({
        id: "stay-1",
        hostelId: "hostel-1",
        status: StayStatus.ACTIVE,
        endDate: new Date("2025-07-01T00:00:00.000Z"),
        bedId: "bed-1", payments: [{ amountPaise: 10000000, paymentStatus: "SUCCESS", receiptNumber: 123, receiptNumber: 123 }],
      });

      mockPrisma.stay.findFirst.mockResolvedValue({ id: "stay-overlapping" }); // Conflict exists

      const res = await extendPOST(
        new Request("http://localhost/api/warden/stays/stay-1/extend", {
          method: "POST",
          body: JSON.stringify({
            newEndDate: "2025-08-01T00:00:00.000Z",
            additionalRent: 5000,
            additionalFoodCharges: 0,
          }),
        }) as any,
        { params: Promise.resolve({ id: "stay-1" }) }
      );

      const data = await res.json();
      expect(res.status).toBe(409);
      expect(data.code).toBe("CONFLICT");
    });
  });

  describe("POST /api/warden/stays/[id]/early-checkout", () => {
    it("successfully checks out a tenant early, frees the bed, issues refund, and deletes future food orders", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue({
        id: "stay-1",
        hostelId: "hostel-1",
        status: StayStatus.ACTIVE,
        joiningDate: new Date("2025-06-01T00:00:00.000Z"),
        endDate: new Date("2025-06-30T00:00:00.000Z"),
        bedId: "bed-1", payments: [{ amountPaise: 10000000, paymentStatus: "SUCCESS", receiptNumber: 123, receiptNumber: 123 }],
        totalPayablePaise: 600000,
      });

      const res = await earlyCheckoutPOST(
        new Request("http://localhost/api/warden/stays/stay-1/early-checkout", {
          method: "POST",
          body: JSON.stringify({
            checkoutDate: "2025-06-15T00:00:00.000Z",
            refundAmount: 3000,
            notes: "Leaving early due to college holidays",
          }),
        }) as any,
        { params: Promise.resolve({ id: "stay-1" }) }
      );

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.refundInvoiceId).toBe("refund-new");

      // Verify RefundInvoice creation
      expect(mockPrisma.refundInvoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          stayId: "stay-1",
          originalAmountPaise: 600000,
          daysUsed: 14, // June 1 to June 15
          daysRemaining: 15, // total 29 days (June 1 to June 30) - 14 used = 15 remaining
          refundAmountPaise: 300000, // ₹3,000
          processedByUserId: "user-warden-1",
          notes: "Leaving early due to college holidays",
          pdfDocumentId: "doc-new",
        }),
      });

      // Verify stay update
      expect(mockPrisma.stay.update).toHaveBeenCalledWith({
        where: { id: "stay-1" },
        data: {
          status: StayStatus.EARLY_EXIT,
          endDate: new Date("2025-06-15T00:00:00.000Z"),
        },
      });

      // Verify bed release
      expect(mockPrisma.bed.update).toHaveBeenCalledWith({
        where: { id: "bed-1" },
        data: {
          status: BedStatus.AVAILABLE,
        },
      });

      // Verify future food orders deleted
      expect(mockPrisma.foodOrder.deleteMany).toHaveBeenCalledWith({
        where: {
          stayId: "stay-1",
          forDate: { gt: new Date("2025-06-15T00:00:00.000Z") },
        },
      });
    });

    it("throws ValidationError if checkoutDate is outside the stay boundary", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue({
        id: "stay-1",
        hostelId: "hostel-1",
        status: StayStatus.ACTIVE,
        joiningDate: new Date("2025-06-01T00:00:00.000Z"),
        endDate: new Date("2025-06-30T00:00:00.000Z"),
        bedId: "bed-1", payments: [{ amountPaise: 10000000, paymentStatus: "SUCCESS", receiptNumber: 123, receiptNumber: 123 }],
      });

      const res = await earlyCheckoutPOST(
        new Request("http://localhost/api/warden/stays/stay-1/early-checkout", {
          method: "POST",
          body: JSON.stringify({
            checkoutDate: "2025-07-02T00:00:00.000Z", // Outside endDate
            refundAmount: 1000,
          }),
        }) as any,
        { params: Promise.resolve({ id: "stay-1" }) }
      );

      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("throws ValidationError if checkoutDate is in the future", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue({
        id: "stay-1",
        hostelId: "hostel-1",
        status: StayStatus.ACTIVE,
        joiningDate: new Date("2025-06-01T00:00:00.000Z"),
        endDate: new Date("2025-06-30T00:00:00.000Z"),
        bedId: "bed-1", payments: [{ amountPaise: 10000000, paymentStatus: "SUCCESS", receiptNumber: 123, receiptNumber: 123 }],
      });

      // Set date to 10 days in the future
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const futureDateStr = futureDate.toISOString();

      const res = await earlyCheckoutPOST(
        new Request("http://localhost/api/warden/stays/stay-1/early-checkout", {
          method: "POST",
          body: JSON.stringify({
            checkoutDate: futureDateStr, // Future date
            refundAmount: 1000,
          }),
        }) as any,
        { params: Promise.resolve({ id: "stay-1" }) }
      );

      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("throws ValidationError if refundAmount exceeds 100k limit", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue({
        id: "stay-1",
        hostelId: "hostel-1",
        status: StayStatus.ACTIVE,
        joiningDate: new Date("2025-06-01T00:00:00.000Z"),
        endDate: new Date("2025-06-30T00:00:00.000Z"),
        bedId: "bed-1", payments: [{ amountPaise: 10000000, paymentStatus: "SUCCESS", receiptNumber: 123, receiptNumber: 123 }],
      });

      const res = await earlyCheckoutPOST(
        new Request("http://localhost/api/warden/stays/stay-1/early-checkout", {
          method: "POST",
          body: JSON.stringify({
            checkoutDate: "2025-06-15T00:00:00.000Z",
            refundAmount: 150000, // Exceeds limit
          }),
        }) as any,
        { params: Promise.resolve({ id: "stay-1" }) }
      );

      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });
  });
});
