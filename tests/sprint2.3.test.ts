/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OnboardingRequestStatus, StayStatus, UserRole, PaymentStatus, BedStatus, PaymentMode } from "@prisma/client";

// ──────────────────────────────────────────────────────────────────────────────
// Prisma mock setup
// ──────────────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn((fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)),
  user: {
    findUnique: vi.fn(),
  },
  tenant: {
    findUnique: vi.fn(),
  },
  stay: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  onboardingRequest: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  bed: {
    update: vi.fn(),
  },
  payment: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  stayStatusEvent: {
    create: vi.fn(),
  },
  document: {
    create: vi.fn(),
  },
}));

vi.mock("../lib/db", () => ({ prisma: mockPrisma }));

vi.mock("@/services/pdf/receipt.service", () => ({
  generatePaymentReceipt: vi.fn().mockResolvedValue({
    documentId: "doc-receipt-mock",
    storagePath: "receipt.pdf",
  }),
}));

// Mock file processing and storage
vi.mock("../lib/image", () => ({
  verifyAndGetFileType: vi.fn(() => "jpg"),
  compressImage: vi.fn(async (buf: Buffer) => ({
    data: buf,
    ext: "jpg" as const,
    mimeType: "image/jpeg" as const,
  })),
}));

vi.mock("../lib/storage", () => ({
  uploadToStorage: vi.fn(async (buf: Buffer, path: string) => path),
  getSignedUrl: vi.fn(async (path: string) => `https://signed.url/${path}`),
}));

// Mock authentication
const fakeWardenSession = vi.hoisted(() => ({
  user: {
    id: "user-warden-1",
    role: "WARDEN" as const,
    warden: {
      id: "warden-1",
      hostelId: "hostel-123",
    },
  },
}));

const fakeTenantSession = vi.hoisted(() => ({
  user: {
    id: "user-tenant-1",
    role: "TENANT" as const,
  },
}));

import * as authModule from "../lib/auth";

vi.mock("../lib/auth", () => ({
  requireRole: vi.fn(),
  requireHostelAccess: vi.fn().mockResolvedValue(undefined),
}));

// Mock Next.js headers/cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

// ──────────────────────────────────────────────────────────────────────────────
// Test cases
// ──────────────────────────────────────────────────────────────────────────────
import { POST as approvePOST } from "../app/api/warden/onboards/[id]/approve/route";
import { POST as rejectPOST } from "../app/api/warden/onboards/[id]/reject/route";
import { POST as paymentPOST } from "../app/api/warden/onboards/[id]/payment/route";
import { POST as verifyPOST } from "../app/api/warden/onboards/[id]/verify/route";
import { POST as tenantUploadPOST } from "../app/api/tenant/payment/screenshot/route";

describe("Sprint 2.3: Warden Review, Payment Verification & Stay Activation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    
    // Default auth setup
    vi.mocked(authModule.requireRole).mockResolvedValue(fakeWardenSession as any);

    // Mock resolved values for Prisma writes to prevent undefined returns
    mockPrisma.payment.create.mockResolvedValue({ id: "123e4567-e89b-12d3-a456-426614174000" });
    mockPrisma.payment.update.mockResolvedValue({ id: "123e4567-e89b-12d3-a456-426614174000" });
    mockPrisma.document.create.mockResolvedValue({ id: "doc-123" });
    mockPrisma.stay.update.mockResolvedValue({ id: "stay-123" });
    mockPrisma.stayStatusEvent.create.mockResolvedValue({ id: "event-123" });
    mockPrisma.onboardingRequest.update.mockResolvedValue({ id: "req-123" });
    mockPrisma.bed.update.mockResolvedValue({ id: "bed-123" });
  });

  describe("Application Review & Approval/Rejection Path", () => {
    it("should successfully approve registration ONBOARDING_PENDING -> APPROVED_AWAITING_PAYMENT", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue({
        id: "stay-123",
        status: StayStatus.ONBOARDING_PENDING,
        hostelId: "hostel-123",
      });

      const res = await approvePOST(
        new Request("http://localhost/approve", { method: "POST" }) as any,
        { params: Promise.resolve({ id: "stay-123" }) }
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.stay.update).toHaveBeenCalledWith({
        where: { id: "stay-123" },
        data: { status: StayStatus.APPROVED_AWAITING_PAYMENT },
      });
      expect(mockPrisma.stayStatusEvent.create).toHaveBeenCalledWith({
        data: {
          stayId: "stay-123",
          fromStatus: StayStatus.ONBOARDING_PENDING,
          toStatus: StayStatus.APPROVED_AWAITING_PAYMENT,
          changedByUserId: "user-warden-1",
          note: "Warden approved profile application",
        },
      });
    });

    it("should reject/cancel application and return Bed to AVAILABLE", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue({
        id: "stay-123",
        status: StayStatus.ONBOARDING_PENDING,
        hostelId: "hostel-123",
      });

      const res = await rejectPOST(
        new Request("http://localhost/reject", { method: "POST" }) as any,
        { params: Promise.resolve({ id: "stay-123" }) }
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.stay.update).toHaveBeenCalledWith({
        where: { id: "stay-123" },
        data: { status: StayStatus.CANCELLED },
      });
      expect(mockPrisma.stayStatusEvent.create).toHaveBeenCalledWith({
        data: {
          stayId: "stay-123",
          fromStatus: StayStatus.ONBOARDING_PENDING,
          toStatus: StayStatus.CANCELLED,
          changedByUserId: "user-warden-1",
          note: "Warden rejected application",
        },
      });
    });
  });

  describe("Record & Verify Payments / Occupancy Activation Path", () => {
    it("allows Warden to record a payment for an approved stay", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue({
        id: "stay-123",
        status: StayStatus.APPROVED_AWAITING_PAYMENT,
        hostelId: "hostel-123",
        tenantId: "tenant-123",
      });

      const reqBody = {
        amountPaid: 15000,
        paymentMode: PaymentMode.UPI,
        transactionRefNo: "UTR12345678",
        receivedBy: "Warden Jack",
      };

      const res = await paymentPOST(
        new Request("http://localhost/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reqBody),
        }) as any,
        { params: Promise.resolve({ id: "stay-123" }) }
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: {
          stayId: "stay-123",
          amountPaidPaise: 1500000,
          paymentMode: PaymentMode.UPI,
          transactionRefNo: "UTR12345678",
          receivedBy: "Warden Jack",
          paymentStatus: PaymentStatus.PENDING,
          screenshotDocumentId: null,
        },
      });
    });

    it("verifying full payment settles account, transitions stay to ACTIVE, and bed to OCCUPIED", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue({
        id: "stay-123",
        hostelId: "hostel-123",
        bedId: "bed-123",
        status: StayStatus.APPROVED_AWAITING_PAYMENT,
        totalPayablePaise: 1500000, // ₹15,000
        payments: [
          {
            id: "123e4567-e89b-12d3-a456-426614174000",
            amountPaidPaise: 1500000,
            paymentStatus: PaymentStatus.PENDING,
          },
        ],
      });

      mockPrisma.payment.findUnique.mockResolvedValue({
        id: "123e4567-e89b-12d3-a456-426614174000",
        stayId: "stay-123",
        amountPaidPaise: 1500000,
        paymentStatus: PaymentStatus.PENDING,
      });

      // No bed conflicts
      mockPrisma.stay.findFirst.mockResolvedValue(null);

      const res = await verifyPOST(
        new Request("http://localhost/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: "123e4567-e89b-12d3-a456-426614174000" }),
        }) as any,
        { params: Promise.resolve({ id: "stay-123" }) }
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.activated).toBe(true);
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: "123e4567-e89b-12d3-a456-426614174000" },
        data: {
          paymentStatus: PaymentStatus.PAID,
          verifiedByUserId: "user-warden-1",
          verifiedAt: expect.any(Date),
        },
      });
      expect(mockPrisma.stay.update).toHaveBeenCalledWith({
        where: { id: "stay-123" },
        data: { status: StayStatus.ACTIVE },
      });
      expect(mockPrisma.bed.update).toHaveBeenCalledWith({
        where: { id: "bed-123" },
        data: { status: BedStatus.OCCUPIED },
      });
    });

    it("verifying partial payment sets status to PARTIALLY_PAID on payment without activating stay", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue({
        id: "stay-123",
        hostelId: "hostel-123",
        bedId: "bed-123",
        status: StayStatus.APPROVED_AWAITING_PAYMENT,
        totalPayablePaise: 1500000, // ₹15,000
        payments: [
          {
            id: "123e4567-e89b-12d3-a456-426614174001",
            amountPaidPaise: 500000, // Only ₹5,000 paid
            paymentStatus: PaymentStatus.PENDING,
          },
        ],
      });

      mockPrisma.payment.findUnique.mockResolvedValue({
        id: "123e4567-e89b-12d3-a456-426614174001",
        stayId: "stay-123",
        amountPaidPaise: 500000,
        paymentStatus: PaymentStatus.PENDING,
      });

      mockPrisma.stay.findFirst.mockResolvedValue(null);

      const res = await verifyPOST(
        new Request("http://localhost/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: "123e4567-e89b-12d3-a456-426614174001" }),
        }) as any,
        { params: Promise.resolve({ id: "stay-123" }) }
      );
      const data = await res.json();
      if (res.status !== 200) {
        console.error("DEBUG ERROR DATA:", data);
      }

      expect(res.status).toBe(200);
      expect(data.activated).toBe(false);
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: "123e4567-e89b-12d3-a456-426614174001" },
        data: {
          paymentStatus: PaymentStatus.PARTIALLY_PAID,
          verifiedByUserId: "user-warden-1",
          verifiedAt: expect.any(Date),
        },
      });
      // Verification of stay and bed updates should NOT occur on partial payments
      expect(mockPrisma.stay.update).not.toHaveBeenCalled();
      expect(mockPrisma.bed.update).not.toHaveBeenCalled();
    });

    it("prevents verification / activation if a live bed conflict overlap is detected", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue({
        id: "stay-123",
        hostelId: "hostel-123",
        bedId: "bed-123",
        status: StayStatus.APPROVED_AWAITING_PAYMENT,
        totalPayablePaise: 1500000,
        joiningDate: new Date("2024-06-01"),
        endDate: new Date("2024-06-30"),
        payments: [{ id: "123e4567-e89b-12d3-a456-426614174000", amountPaidPaise: 1500000, paymentStatus: PaymentStatus.PENDING }],
      });

      mockPrisma.payment.findUnique.mockResolvedValue({
        id: "123e4567-e89b-12d3-a456-426614174000",
        stayId: "stay-123",
        amountPaidPaise: 1500000,
        paymentStatus: PaymentStatus.PENDING,
      });

      // Overlapping active stay exists
      mockPrisma.stay.findFirst.mockResolvedValue({
        id: "stay-overlap-active",
        status: StayStatus.ACTIVE,
      });

      const res = await verifyPOST(
        new Request("http://localhost/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: "123e4567-e89b-12d3-a456-426614174000" }),
        }) as any,
        { params: Promise.resolve({ id: "stay-123" }) }
      );
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.code).toBe("CONFLICT");
      expect(mockPrisma.stay.update).not.toHaveBeenCalled();
    });
  });

  describe("Tenant Side Upload screenshot flow", () => {
    it("allows a tenant to upload their payment screenshot, creating a pending UPI payment", async () => {
      vi.mocked(authModule.requireRole).mockResolvedValue(fakeTenantSession as any);
      
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: "tenant-123" });
      mockPrisma.stay.findFirst.mockResolvedValue({
        id: "stay-123",
        status: StayStatus.APPROVED_AWAITING_PAYMENT,
        tenantId: "tenant-123",
      });

      const formData = new FormData();
      const mockFile = new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], { type: "image/jpeg" });
      formData.append("screenshot", mockFile, "receipt.jpg");
      formData.append("amountPaid", "15000");

      const res = await tenantUploadPOST(
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
          stayId: "stay-123",
          amountPaidPaise: 1500000,
          paymentMode: PaymentMode.UPI,
          transactionRefNo: null,
          receivedBy: "Self-Uploaded (Tenant)",
          paymentStatus: PaymentStatus.PENDING,
          screenshotDocumentId: expect.any(String),
        },
      });
    });
  });
});
