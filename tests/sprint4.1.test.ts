import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  StayStatus,
  DurationType,
  SharingType,
  FoodPlan,
  PaymentMode,
  PaymentStatus,
  BedStatus,
  DocumentOwnerType,
  DocumentType,
  UserRole,
} from "@prisma/client";

// ============================================================
// Mock Infrastructure
// ============================================================

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
  payment: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  stayStatusEvent: { create: vi.fn() },
  document: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  hostel: { findUnique: vi.fn() },
  refundInvoice: { create: vi.fn() },
  foodOrder: { deleteMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

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
    tenant: null,
  },
}));

const fakeTenantSession = vi.hoisted(() => ({
  user: {
    id: "user-tenant-1",
    role: "TENANT" as const,
    warden: null,
    tenant: {
      id: "tenant-1",
      userId: "user-tenant-1",
    },
  },
}));

const fakeAdminSession = vi.hoisted(() => ({
  user: {
    id: "user-admin-1",
    role: "MAIN_ADMIN" as const,
    warden: null,
    tenant: null,
  },
}));

import * as authModule from "@/lib/auth";

vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn(),
  requireHostelAccess: vi.fn().mockResolvedValue(undefined),
}));

// Mock PDF rendering
vi.mock("@/lib/pdf/render", () => ({
  renderPaymentReceipt: vi.fn().mockResolvedValue(Buffer.from("fake-pdf-content")),
}));

// Mock storage
vi.mock("@/lib/storage", () => ({
  uploadToStorage: vi.fn().mockResolvedValue("receipts/receipt_pay.pdf"),
  getSignedUrl: vi.fn().mockResolvedValue("https://signed.url/receipt.pdf"),
}));

// Mock receipt service (so we can spy on generatePaymentReceipt calls)
const mockGeneratePaymentReceipt = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    documentId: "mock-doc-id",
    storagePath: "receipts/receipt_mock.pdf",
  })
);
vi.mock("@/services/pdf/receipt.service", () => ({
  generatePaymentReceipt: mockGeneratePaymentReceipt,
}));

import {
  ValidationError,
  ForbiddenError,
  ConflictError,
  NotFoundError,
} from "@/lib/errors";

// Valid UUIDs for tests (must pass Zod .uuid() validation)
const PAYMENT_ID = "550e8400-e29b-41d4-a716-446655440001";
const PAYMENT_ID_2 = "550e8400-e29b-41d4-a716-446655440002";
const STAY_ID = "660e8400-e29b-41d4-a716-446655440001";
const DOC_ID = "770e8400-e29b-41d4-a716-446655440001";
const DOC_EXISTING = "770e8400-e29b-41d4-a716-446655440002";

// Import routes
import { POST as verifyPOST } from "@/app/api/warden/onboards/[id]/verify/route";
import { POST as receiptPOST } from "@/app/api/pdf/receipt/[paymentId]/route";
import { GET as downloadGET } from "@/app/api/pdf/download/[documentId]/route";

// Import services
import { buildReceiptWhatsAppMessage, buildReceiptWhatsAppUrl } from "@/lib/pdf/whatsapp";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Helper to create a full payment mock with all nested relations
function createPaymentMock(overrides: Record<string, any> = {}) {
  return {
    id: PAYMENT_ID,
    stayId: STAY_ID,
    amountPaidPaise: 1100000,
    paymentMode: PaymentMode.UPI,
    transactionRefNo: "UTR123456",
    paymentStatus: PaymentStatus.PAID,
    verifiedByUserId: "user-warden-1",
    verifiedAt: new Date("2025-06-15T10:30:00Z"),
    screenshotDocumentId: null,
    createdAt: new Date(),
    stay: {
      id: STAY_ID,
      hostelId: "hostel-1",
      tenantId: "tenant-1",
      bedId: "bed-1",
      durationType: DurationType.MONTHLY,
      joiningDate: new Date("2025-06-01"),
      endDate: new Date("2025-07-01"),
      status: StayStatus.ACTIVE,
      totalPayablePaise: 1100000,
      tenant: { fullName: "Rahul Sharma" },
      bed: { label: "A1", room: { roomNumber: "101" } },
      hostel: { name: "Sunshine Hostel" },
    },
    verifiedByUser: { email: "warden@test.com", id: "user-warden-1" },
    ...overrides,
  };
}

describe("Sprint 4.1: PDF Infrastructure & Payment Receipts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    vi.mocked(authModule.requireRole).mockResolvedValue(fakeWardenSession as any);

    mockPrisma.payment.update.mockResolvedValue({ id: PAYMENT_ID });
    mockPrisma.stay.update.mockResolvedValue({ id: STAY_ID });
    mockPrisma.stayStatusEvent.create.mockResolvedValue({ id: "event-1" });
    mockPrisma.bed.update.mockResolvedValue({ id: "bed-1" });
    mockPrisma.document.create.mockResolvedValue({ id: DOC_ID, storagePath: `receipts/receipt_${PAYMENT_ID}.pdf` });
  });

  // ============================================================
  // Task D: Auto-trigger Receipt Generation on Verification
  // ============================================================
  describe("Auto-trigger Receipt Generation on Verification", () => {
    it("triggers receipt generation after full payment verification (stay activation)", async () => {
      const mockStay = {
        id: STAY_ID,
        hostelId: "hostel-1",
        bedId: "bed-1",
        status: StayStatus.ONBOARDING_PENDING,
        joiningDate: new Date("2025-06-01"),
        endDate: new Date("2025-07-01"),
        totalPayablePaise: 1100000,
        payments: [
          {
            id: PAYMENT_ID,
            amountPaidPaise: 1100000,
            paymentStatus: PaymentStatus.PENDING,
          },
        ],
      };

      mockPrisma.stay.findUnique.mockResolvedValue(mockStay);
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: PAYMENT_ID,
        stayId: STAY_ID,
        amountPaidPaise: 1100000,
        paymentStatus: PaymentStatus.PENDING,
      });
      mockPrisma.stay.findFirst.mockResolvedValue(null); // No bed conflict

      const res = await verifyPOST(
        new Request("http://localhost/api/warden/onboards/stay-1/verify", {
          method: "POST",
          body: JSON.stringify({ paymentId: PAYMENT_ID }),
        }) as any,
        { params: Promise.resolve({ id: STAY_ID }) }
      );

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.activated).toBe(true);

      // Verify receipt generation was triggered (async, fire-and-forget)
      await vi.waitFor(() => {
        expect(mockGeneratePaymentReceipt).toHaveBeenCalledWith(PAYMENT_ID);
      });
    });

    it("does NOT trigger receipt generation for partial payments", async () => {
      const mockStay = {
        id: STAY_ID,
        hostelId: "hostel-1",
        bedId: "bed-1",
        status: StayStatus.ONBOARDING_PENDING,
        joiningDate: new Date("2025-06-01"),
        endDate: new Date("2025-07-01"),
        totalPayablePaise: 1100000,
        payments: [
          {
            id: PAYMENT_ID_2,
            amountPaidPaise: 500000,
            paymentStatus: PaymentStatus.PAID,
          },
          {
            id: PAYMENT_ID,
            amountPaidPaise: 100000,
            paymentStatus: PaymentStatus.PENDING,
          },
        ],
      };

      mockPrisma.stay.findUnique.mockResolvedValue(mockStay);
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: PAYMENT_ID,
        stayId: STAY_ID,
        amountPaidPaise: 100000,
        paymentStatus: PaymentStatus.PENDING,
      });
      mockPrisma.stay.findFirst.mockResolvedValue(null);

      const res = await verifyPOST(
        new Request("http://localhost/api/warden/onboards/stay-1/verify", {
          method: "POST",
          body: JSON.stringify({ paymentId: PAYMENT_ID }),
        }) as any,
        { params: Promise.resolve({ id: STAY_ID }) }
      );

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.activated).toBe(false);

      // Receipt generation should NOT be called for partial payments
      await new Promise((r) => setTimeout(r, 50));
      expect(mockGeneratePaymentReceipt).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // PDF Generation Service & Isolation
  // ============================================================
  describe("PDF Generation Service (Isolation)", () => {
    it("generates receipt PDF and creates Document record", async () => {
      // Override mock to use real implementation for this test
      const { generatePaymentReceipt: realGenerate } = await vi.importActual<typeof import("@/services/pdf/receipt.service")>("@/services/pdf/receipt.service");
      mockGeneratePaymentReceipt.mockImplementation(realGenerate);

      mockPrisma.payment.findUnique.mockResolvedValue(createPaymentMock());

      const result = await mockGeneratePaymentReceipt(PAYMENT_ID);

      expect(result.documentId).toBe(DOC_ID);
      expect(result.storagePath).toBe(`receipts/receipt_${PAYMENT_ID}.pdf`);
      expect(mockPrisma.document.create).toHaveBeenCalledWith({
        data: {
          ownerType: DocumentOwnerType.STAY,
          stayId: STAY_ID,
          documentType: DocumentType.RECEIPT_PDF,
          storagePath: `receipts/receipt_${PAYMENT_ID}.pdf`,
          fileSizeBytes: expect.any(Number),
          uploadedByUserId: "user-warden-1",
        },
      });
    });

    it("throws error if payment is not found", async () => {
      const { generatePaymentReceipt: realGenerate } = await vi.importActual<typeof import("@/services/pdf/receipt.service")>("@/services/pdf/receipt.service");
      mockGeneratePaymentReceipt.mockImplementation(realGenerate);

      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(mockGeneratePaymentReceipt("nonexistent")).rejects.toThrow("Payment not found");
    });

    it("throws error if payment is not PAID status", async () => {
      const { generatePaymentReceipt: realGenerate } = await vi.importActual<typeof import("@/services/pdf/receipt.service")>("@/services/pdf/receipt.service");
      mockGeneratePaymentReceipt.mockImplementation(realGenerate);

      mockPrisma.payment.findUnique.mockResolvedValue({
        id: PAYMENT_ID,
        paymentStatus: PaymentStatus.PENDING,
      });

      await expect(mockGeneratePaymentReceipt(PAYMENT_ID)).rejects.toThrow("not verified");
    });
  });

  // ============================================================
  // Task C: PDF Generation API Route
  // ============================================================
  describe("POST /api/pdf/receipt/[paymentId]", () => {
    it("generates receipt for warden's own hostel payment", async () => {
      const fullPayment = createPaymentMock();
      mockPrisma.payment.findUnique.mockResolvedValue(fullPayment);
      mockPrisma.document.findFirst.mockResolvedValue(null); // No existing receipt

      const res = await receiptPOST(
        new Request("http://localhost/api/pdf/receipt/pay", { method: "POST" }) as any,
        { params: Promise.resolve({ paymentId: PAYMENT_ID }) }
      );

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.documentId).toBe(DOC_ID);
    });

    it("generates receipt for tenant's own payment", async () => {
      vi.mocked(authModule.requireRole).mockResolvedValue(fakeTenantSession as any);

      const fullPayment = createPaymentMock();
      mockPrisma.payment.findUnique.mockResolvedValue(fullPayment);
      mockPrisma.document.findFirst.mockResolvedValue(null);

      const res = await receiptPOST(
        new Request("http://localhost/api/pdf/receipt/pay", { method: "POST" }) as any,
        { params: Promise.resolve({ paymentId: PAYMENT_ID }) }
      );

      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("generates receipt for main admin (bypasses all checks)", async () => {
      vi.mocked(authModule.requireRole).mockResolvedValue(fakeAdminSession as any);

      const fullPayment = createPaymentMock();
      mockPrisma.payment.findUnique.mockResolvedValue(fullPayment);
      mockPrisma.document.findFirst.mockResolvedValue(null);

      const res = await receiptPOST(
        new Request("http://localhost/api/pdf/receipt/pay", { method: "POST" }) as any,
        { params: Promise.resolve({ paymentId: PAYMENT_ID }) }
      );

      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("returns 403 for warden accessing payment from another hostel", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: PAYMENT_ID,
        stayId: STAY_ID,
        paymentStatus: PaymentStatus.PAID,
        stay: {
          hostelId: "hostel-different",
          tenantId: "tenant-1",
        },
      });

      const res = await receiptPOST(
        new Request("http://localhost/api/pdf/receipt/pay", { method: "POST" }) as any,
        { params: Promise.resolve({ paymentId: PAYMENT_ID }) }
      );

      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.code).toBe("FORBIDDEN");
    });

    it("returns 403 for tenant accessing another tenant's payment", async () => {
      vi.mocked(authModule.requireRole).mockResolvedValue(fakeTenantSession as any);

      mockPrisma.payment.findUnique.mockResolvedValue({
        id: PAYMENT_ID,
        stayId: STAY_ID,
        paymentStatus: PaymentStatus.PAID,
        stay: {
          hostelId: "hostel-1",
          tenantId: "tenant-different",
        },
      });

      const res = await receiptPOST(
        new Request("http://localhost/api/pdf/receipt/pay", { method: "POST" }) as any,
        { params: Promise.resolve({ paymentId: PAYMENT_ID }) }
      );

      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.code).toBe("FORBIDDEN");
    });

    it("returns 400 for unverified payment", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: PAYMENT_ID,
        stayId: STAY_ID,
        paymentStatus: PaymentStatus.PENDING,
        stay: {
          hostelId: "hostel-1",
          tenantId: "tenant-1",
        },
      });

      const res = await receiptPOST(
        new Request("http://localhost/api/pdf/receipt/pay", { method: "POST" }) as any,
        { params: Promise.resolve({ paymentId: PAYMENT_ID }) }
      );

      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("returns existing receipt if already generated (idempotent)", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: PAYMENT_ID,
        stayId: STAY_ID,
        paymentStatus: PaymentStatus.PAID,
        stay: {
          hostelId: "hostel-1",
          tenantId: "tenant-1",
        },
      });
      mockPrisma.document.findFirst.mockResolvedValue({
        id: DOC_EXISTING,
        storagePath: `receipts/receipt_${PAYMENT_ID}.pdf`,
      });

      const res = await receiptPOST(
        new Request("http://localhost/api/pdf/receipt/pay", { method: "POST" }) as any,
        { params: Promise.resolve({ paymentId: PAYMENT_ID }) }
      );

      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.documentId).toBe(DOC_EXISTING);
      expect(data.message).toContain("already exists");
    });

    it("returns 404 for non-existent payment", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      const res = await receiptPOST(
        new Request("http://localhost/api/pdf/receipt/pay", { method: "POST" }) as any,
        { params: Promise.resolve({ paymentId: "nonexistent" }) }
      );

      const data = await res.json();
      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });
  });

  // ============================================================
  // Task E: Download Endpoint & Access Control
  // ============================================================
  describe("GET /api/pdf/download/[documentId]", () => {
    it("returns signed URL for warden accessing receipt in their hostel", async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: DOC_ID,
        ownerType: DocumentOwnerType.STAY,
        storagePath: `receipts/receipt_${PAYMENT_ID}.pdf`,
        documentType: DocumentType.RECEIPT_PDF,
        stayId: STAY_ID,
        tenantId: null,
        stay: {
          hostelId: "hostel-1",
          tenantId: "tenant-1",
        },
        tenant: null,
      });

      const res = await downloadGET(
        new Request("http://localhost/api/pdf/download/doc") as any,
        { params: Promise.resolve({ documentId: DOC_ID }) }
      );

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.signedUrl).toBe("https://signed.url/receipt.pdf");
      expect(data.expiresIn).toBe(900);
    });

    it("returns signed URL for tenant accessing their own receipt", async () => {
      vi.mocked(authModule.requireRole).mockResolvedValue(fakeTenantSession as any);

      mockPrisma.document.findUnique.mockResolvedValue({
        id: DOC_ID,
        ownerType: DocumentOwnerType.STAY,
        storagePath: `receipts/receipt_${PAYMENT_ID}.pdf`,
        documentType: DocumentType.RECEIPT_PDF,
        stayId: STAY_ID,
        tenantId: null,
        stay: {
          hostelId: "hostel-1",
          tenantId: "tenant-1",
        },
        tenant: null,
      });

      const res = await downloadGET(
        new Request("http://localhost/api/pdf/download/doc") as any,
        { params: Promise.resolve({ documentId: DOC_ID }) }
      );

      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("returns 403 for warden accessing receipt from another hostel", async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: DOC_ID,
        ownerType: DocumentOwnerType.STAY,
        storagePath: `receipts/receipt_${PAYMENT_ID}.pdf`,
        documentType: DocumentType.RECEIPT_PDF,
        stayId: STAY_ID,
        tenantId: null,
        stay: {
          hostelId: "hostel-different",
          tenantId: "tenant-1",
        },
        tenant: null,
      });

      const res = await downloadGET(
        new Request("http://localhost/api/pdf/download/doc") as any,
        { params: Promise.resolve({ documentId: DOC_ID }) }
      );

      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.code).toBe("FORBIDDEN");
    });

    it("returns 403 for tenant accessing another tenant's receipt", async () => {
      vi.mocked(authModule.requireRole).mockResolvedValue(fakeTenantSession as any);

      mockPrisma.document.findUnique.mockResolvedValue({
        id: DOC_ID,
        ownerType: DocumentOwnerType.STAY,
        storagePath: `receipts/receipt_${PAYMENT_ID}.pdf`,
        documentType: DocumentType.RECEIPT_PDF,
        stayId: STAY_ID,
        tenantId: null,
        stay: {
          hostelId: "hostel-1",
          tenantId: "tenant-different",
        },
        tenant: null,
      });

      const res = await downloadGET(
        new Request("http://localhost/api/pdf/download/doc") as any,
        { params: Promise.resolve({ documentId: DOC_ID }) }
      );

      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.code).toBe("FORBIDDEN");
    });

    it("returns 404 for non-existent document", async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);

      const res = await downloadGET(
        new Request("http://localhost/api/pdf/download/doc") as any,
        { params: Promise.resolve({ documentId: "nonexistent" }) }
      );

      const data = await res.json();
      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("main admin can download any document", async () => {
      vi.mocked(authModule.requireRole).mockResolvedValue(fakeAdminSession as any);

      mockPrisma.document.findUnique.mockResolvedValue({
        id: DOC_ID,
        ownerType: DocumentOwnerType.STAY,
        storagePath: `receipts/receipt_${PAYMENT_ID}.pdf`,
        documentType: DocumentType.RECEIPT_PDF,
        stayId: STAY_ID,
        tenantId: null,
        stay: {
          hostelId: "hostel-any",
          tenantId: "tenant-1",
        },
        tenant: null,
      });

      const res = await downloadGET(
        new Request("http://localhost/api/pdf/download/doc") as any,
        { params: Promise.resolve({ documentId: DOC_ID }) }
      );

      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  // ============================================================
  // WhatsApp Message Helper
  // ============================================================
  describe("WhatsApp Receipt Message", () => {
    it("builds correct receipt message", () => {
      const message = buildReceiptWhatsAppMessage({
        tenantName: "Rahul Sharma",
        amountFormatted: "₹ 5,000",
        downloadLink: "https://nexthome.app/api/pdf/download/doc-1",
      });

      expect(message).toBe(
        "Hello Rahul Sharma, your payment of ₹ 5,000 has been verified. Download your receipt: https://nexthome.app/api/pdf/download/doc-1"
      );
    });

    it("builds correct wa.me URL", () => {
      const url = buildReceiptWhatsAppUrl({
        phone: "+919876543210",
        tenantName: "Rahul Sharma",
        amountFormatted: "₹ 5,000",
        downloadLink: "https://nexthome.app/api/pdf/download/doc-1",
      });

      expect(url).toContain("https://wa.me/919876543210?text=");
      expect(url).toContain(encodeURIComponent("Hello Rahul Sharma"));
    });

    it("strips + from phone number in wa.me URL", () => {
      const url = buildReceiptWhatsAppUrl({
        phone: "+911234567890",
        tenantName: "Test",
        amountFormatted: "₹ 100",
        downloadLink: "https://test.com/doc",
      });

      expect(url).toMatch(/wa\.me\/911234567890/);
      expect(url).not.toContain("+91");
    });
  });

  // ============================================================
  // Isolation: Payment verification succeeds even if PDF generation fails
  // ============================================================
  describe("Isolation: Payment saves even if PDF fails", () => {
    it("payment verification transaction completes before receipt generation", async () => {
      // Make the receipt generation mock throw an error
      mockGeneratePaymentReceipt.mockRejectedValueOnce(new Error("PDF render failed"));

      const mockStay = {
        id: STAY_ID,
        hostelId: "hostel-1",
        bedId: "bed-1",
        status: StayStatus.ONBOARDING_PENDING,
        joiningDate: new Date("2025-06-01"),
        endDate: new Date("2025-07-01"),
        totalPayablePaise: 1100000,
        payments: [
          {
            id: PAYMENT_ID,
            amountPaidPaise: 1100000,
            paymentStatus: PaymentStatus.PENDING,
          },
        ],
      };

      mockPrisma.stay.findUnique.mockResolvedValue(mockStay);
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: PAYMENT_ID,
        stayId: STAY_ID,
        amountPaidPaise: 1100000,
        paymentStatus: PaymentStatus.PENDING,
      });
      mockPrisma.stay.findFirst.mockResolvedValue(null);

      const res = await verifyPOST(
        new Request("http://localhost/api/warden/onboards/stay-1/verify", {
          method: "POST",
          body: JSON.stringify({ paymentId: PAYMENT_ID }),
        }) as any,
        { params: Promise.resolve({ id: STAY_ID }) }
      );

      const data = await res.json();

      // Payment verification should still succeed
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.activated).toBe(true);

      // The transaction should have completed (payment updated, stay activated)
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: PAYMENT_ID },
        data: expect.objectContaining({
          paymentStatus: PaymentStatus.PAID,
        }),
      });
      expect(mockPrisma.stay.update).toHaveBeenCalledWith({
        where: { id: STAY_ID },
        data: { status: StayStatus.ACTIVE },
      });

      // Receipt generation was attempted but failed (logged, not thrown)
      await vi.waitFor(() => {
        expect(mockGeneratePaymentReceipt).toHaveBeenCalledWith(PAYMENT_ID);
      });
    });
  });
});
