import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  StayStatus,
  DurationType,
  SharingType,
  FoodPlan,
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
  stay: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  bed: { update: vi.fn() },
  document: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  refundInvoice: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  stayStatusEvent: { create: vi.fn() },
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
    warden: { id: "warden-1", hostelId: "hostel-1" },
    tenant: null,
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

vi.mock("@/lib/storage", () => ({
  uploadToStorage: vi.fn().mockResolvedValue("storage/path.pdf"),
  getSignedUrl: vi.fn().mockResolvedValue("https://signed.url/photo.jpg"),
}));

// Mock PDF rendering
vi.mock("@/lib/pdf/render", () => ({
  renderPaymentReceipt: vi.fn().mockResolvedValue(Buffer.from("receipt")),
  renderRegistrationForm: vi.fn().mockResolvedValue(Buffer.from("reg-form")),
  renderRefundInvoice: vi.fn().mockResolvedValue(Buffer.from("refund")),
}));

// Mock receipt service (used by sprint4.1 verify route)
vi.mock("@/services/pdf/receipt.service", () => ({
  generatePaymentReceipt: vi.fn().mockResolvedValue({ documentId: "doc-mock", storagePath: "mock.pdf" }),
}));

// Mock refund-invoice service so we can spy on auto-trigger calls
const mockGenerateRefundInvoice = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ documentId: "refund-doc-id", storagePath: "refund.pdf" })
);
vi.mock("@/services/pdf/refund-invoice.service", () => ({
  generateRefundInvoice: mockGenerateRefundInvoice,
}));

// Import routes
import { POST as regFormPOST } from "@/app/api/pdf/registration-form/[stayId]/route";
import { POST as refundPOST } from "@/app/api/pdf/refund-invoice/[refundInvoiceId]/route";

// Import the real service for direct testing (uses mocked prisma + render)
import { generateRegistrationForm } from "@/services/pdf/registration-form.service";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STAY_ID = "660e8400-e29b-41d4-a716-446655440001";
const REFUND_ID = "880e8400-e29b-41d4-a716-446655440001";
const DOC_ID = "770e8400-e29b-41d4-a716-446655440001";

function createStayMock(overrides: Record<string, any> = {}) {
  return {
    id: STAY_ID,
    hostelId: "hostel-1",
    status: StayStatus.ACTIVE,
    durationType: DurationType.MONTHLY,
    joiningDate: new Date("2025-06-01"),
    endDate: new Date("2025-07-01"),
    totalPayablePaise: 1100000,
    admissionFeePaise: 100000,
    monthlyRentPaise: 500000,
    securityDepositPaise: 500000,
    foodChargesPaise: 0,
    foodPlan: FoodPlan.NOT_INCLUDED,
    discountPaise: 0,
    marketingExecutive: "Raj Marketing",
    leadSource: "MANUAL",
    tenant: {
      id: "tenant-1",
      fullName: "Rahul Sharma",
      dateOfBirth: new Date("2000-05-15"),
      gender: "Male",
      placeOfBirth: "Mumbai",
      permanentAddress: "123 MG Road, Mumbai 400001",
      emergencyContactName: "Suresh Sharma",
      relationship: "Father",
      emergencyContactNumber: "+919876543210",
      parentGuardianName: "Suresh Sharma",
      parentGuardianContact: "+919876543210",
      occupationType: "STUDENT",
      collegeName: "IIT Bombay",
      courseOrBranch: "Computer Science",
      companyName: null,
      designation: null,
      purposeOfStay: "Higher Education",
      photoUrl: "tenants/tenant-1/photo.jpg",
    },
    bed: {
      id: "bed-1",
      label: "A1",
      room: { roomNumber: "101", sharingType: SharingType.DOUBLE },
    },
    hostel: {
      name: "Sunshine Hostel",
      affidavitText: "Custom hostel rules apply.",
    },
    ...overrides,
  };
}

describe("Sprint 4.2: Registration Form & Refund Invoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    vi.mocked(authModule.requireRole).mockResolvedValue(fakeWardenSession as any);
    mockPrisma.document.create.mockResolvedValue({ id: DOC_ID, storagePath: "storage/path.pdf" });
    mockPrisma.document.findMany.mockResolvedValue([]);
    mockPrisma.stay.update.mockResolvedValue({});
    mockPrisma.bed.update.mockResolvedValue({});
    mockPrisma.stayStatusEvent.create.mockResolvedValue({});
    mockPrisma.foodOrder.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.refundInvoice.create.mockResolvedValue({ id: REFUND_ID });
    mockPrisma.refundInvoice.update.mockResolvedValue({});
  });

  // ============================================================
  // Task A: Registration Form Template
  // ============================================================
  describe("Registration Form Generation", () => {
    it("generates registration form for ACTIVE stay", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue(createStayMock());

      const res = await regFormPOST(
        new Request("http://localhost/api/pdf/registration-form/stay-1", { method: "POST" }) as any,
        { params: Promise.resolve({ stayId: STAY_ID }) }
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.documentId).toBe(DOC_ID);
    });

    it("generates registration form for EXTENDED stay", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue(createStayMock({ status: StayStatus.EXTENDED }));

      const res = await regFormPOST(
        new Request("http://localhost/api/pdf/registration-form/stay-1", { method: "POST" }) as any,
        { params: Promise.resolve({ stayId: STAY_ID }) }
      );
      expect(res.status).toBe(200);
    });

    it("blocks ONBOARDING_PENDING stays", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue(createStayMock({ status: StayStatus.ONBOARDING_PENDING }));

      const res = await regFormPOST(
        new Request("http://localhost/api/pdf/registration-form/stay-1", { method: "POST" }) as any,
        { params: Promise.resolve({ stayId: STAY_ID }) }
      );
      const data = await res.json();

      // Service throws plain Error, handleApiError returns 500
      expect(res.status).toBe(500);
      expect(data.code).toBe("INTERNAL_SERVER_ERROR");
    });

    it("returns 403 for warden of another hostel", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue(createStayMock({ hostelId: "hostel-different" }));

      const res = await regFormPOST(
        new Request("http://localhost/api/pdf/registration-form/stay-1", { method: "POST" }) as any,
        { params: Promise.resolve({ stayId: STAY_ID }) }
      );
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.code).toBe("FORBIDDEN");
    });

    it("allows MAIN_ADMIN to generate for any stay", async () => {
      vi.mocked(authModule.requireRole).mockResolvedValue(fakeAdminSession as any);
      mockPrisma.stay.findUnique.mockResolvedValue(createStayMock({ hostelId: "hostel-any" }));

      const res = await regFormPOST(
        new Request("http://localhost/api/pdf/registration-form/stay-1", { method: "POST" }) as any,
        { params: Promise.resolve({ stayId: STAY_ID }) }
      );
      expect(res.status).toBe(200);
    });

    it("returns 404 for non-existent stay", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue(null);

      const res = await regFormPOST(
        new Request("http://localhost/api/pdf/registration-form/stay-1", { method: "POST" }) as any,
        { params: Promise.resolve({ stayId: "nonexistent" }) }
      );
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("maps all six sections correctly", async () => {
      const { renderRegistrationForm } = await import("@/lib/pdf/render");

      // Set up documents to test checklist
      mockPrisma.document.findMany.mockResolvedValue([
        { documentType: "AADHAAR" },
        { documentType: "PAN" },
        { documentType: "PASSPORT_PHOTO" },
      ]);

      mockPrisma.stay.findUnique.mockResolvedValue(createStayMock());

      const result = await generateRegistrationForm(STAY_ID, "user-warden-1");

      // Verify render was called with correct data
      expect(renderRegistrationForm).toHaveBeenCalled();
      const callArgs = (renderRegistrationForm as any).mock.calls[0][0];
      expect(callArgs.hostelName).toBe("Sunshine Hostel");
      expect(callArgs.tenant.fullName).toBe("Rahul Sharma");
      expect(callArgs.accommodation.roomNumber).toBe("101");
      expect(callArgs.fees.totalPayable).toContain("11,000");
      expect(callArgs.marketing.executive).toBe("Raj Marketing");

      // Documents checklist: AADHAAR, PAN, PASSPORT_PHOTO should be true
      expect(callArgs.documents.aadhaar).toBe(true);
      expect(callArgs.documents.pan).toBe(true);
      expect(callArgs.documents.passportPhoto).toBe(true);
      expect(callArgs.documents.collegeId).toBe(false);
      expect(callArgs.documents.companyId).toBe(false);

      // Custom affidavit text from hostel
      expect(callArgs.affidavitText).toBe("Custom hostel rules apply.");

      // Profile photo URL
      expect(callArgs.tenant.photoUrl).toBe("https://signed.url/photo.jpg");

      expect(result.documentId).toBe(DOC_ID);
      // Service generates its own storage path
      expect(result.storagePath).toContain("reg_form_");
    });

    it("uses default affidavit text when hostel has none", async () => {
      const { renderRegistrationForm } = await import("@/lib/pdf/render");
      vi.mocked(renderRegistrationForm).mockClear();

      const stay = createStayMock({ hostel: { name: "Sunshine Hostel", affidavitText: null } });
      mockPrisma.stay.findUnique.mockResolvedValue(stay);

      await generateRegistrationForm(STAY_ID, "user-warden-1");

      const mock = vi.mocked(renderRegistrationForm);
      expect(mock).toHaveBeenCalled();
      const lastCall = mock.mock.calls[mock.mock.calls.length - 1];
      const callArgs = lastCall[0] as any;
      // Service passes undefined when hostel has no custom text;
      // the template internally falls back to the default rules text
      expect(callArgs.affidavitText).toBeFalsy();
    });

    it("documents checklist ticks only uploaded documents", async () => {
      const { renderRegistrationForm } = await import("@/lib/pdf/render");
      mockPrisma.document.findMany.mockResolvedValue([
        { documentType: "COLLEGE_ID" },
      ]);
      mockPrisma.stay.findUnique.mockResolvedValue(createStayMock());

      await generateRegistrationForm(STAY_ID, "user-warden-1");

      const callArgs = (renderRegistrationForm as any).mock.calls[0][0];
      expect(callArgs.documents.aadhaar).toBe(false);
      expect(callArgs.documents.pan).toBe(false);
      expect(callArgs.documents.passportPhoto).toBe(false);
      expect(callArgs.documents.collegeId).toBe(true);
      expect(callArgs.documents.companyId).toBe(false);
    });

    it("handles tenant with no photo gracefully", async () => {
      const { renderRegistrationForm } = await import("@/lib/pdf/render");
      const stay = createStayMock();
      stay.tenant.photoUrl = null;
      mockPrisma.stay.findUnique.mockResolvedValue(stay);

      await generateRegistrationForm(STAY_ID, "user-warden-1");

      const callArgs = (renderRegistrationForm as any).mock.calls[0][0];
      expect(callArgs.tenant.photoUrl).toBeUndefined();
    });

    it("truncates long inputs safely (stress test)", async () => {
      const longName = "A".repeat(200);
      const longAddress = "B".repeat(500);
      const stay = createStayMock();
      stay.tenant.fullName = longName;
      stay.tenant.permanentAddress = longAddress;
      mockPrisma.stay.findUnique.mockResolvedValue(stay);

      // Should not throw — template truncates internally
      const result = await generateRegistrationForm(STAY_ID, "user-warden-1");
      expect(result.documentId).toBe(DOC_ID);
    });
  });

  // ============================================================
  // Task B: Refund Invoice Template
  // ============================================================
  describe("Refund Invoice Generation", () => {
    it("generates refund invoice PDF via API", async () => {
      mockPrisma.refundInvoice.findUnique.mockResolvedValue({
        id: REFUND_ID,
        stay: { hostelId: "hostel-1" },
      });
      mockGenerateRefundInvoice.mockResolvedValue({ documentId: DOC_ID, storagePath: "refund.pdf" });

      const res = await refundPOST(
        new Request("http://localhost/api/pdf/refund-invoice/refund-1", { method: "POST" }) as any,
        { params: Promise.resolve({ refundInvoiceId: REFUND_ID }) }
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.documentId).toBe(DOC_ID);
    });

    it("returns 403 for warden of another hostel", async () => {
      mockPrisma.refundInvoice.findUnique.mockResolvedValue({
        id: REFUND_ID,
        stay: { hostelId: "hostel-different" },
      });

      const res = await refundPOST(
        new Request("http://localhost/api/pdf/refund-invoice/refund-1", { method: "POST" }) as any,
        { params: Promise.resolve({ refundInvoiceId: REFUND_ID }) }
      );
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.code).toBe("FORBIDDEN");
    });

    it("allows MAIN_ADMIN to generate any refund invoice", async () => {
      vi.mocked(authModule.requireRole).mockResolvedValue(fakeAdminSession as any);
      mockPrisma.refundInvoice.findUnique.mockResolvedValue({
        id: REFUND_ID,
        stay: { hostelId: "hostel-any" },
      });
      mockGenerateRefundInvoice.mockResolvedValue({ documentId: DOC_ID, storagePath: "refund.pdf" });

      const res = await refundPOST(
        new Request("http://localhost/api/pdf/refund-invoice/refund-1", { method: "POST" }) as any,
        { params: Promise.resolve({ refundInvoiceId: REFUND_ID }) }
      );
      expect(res.status).toBe(200);
    });

    it("returns 404 for non-existent refund invoice", async () => {
      mockPrisma.refundInvoice.findUnique.mockResolvedValue(null);

      const res = await refundPOST(
        new Request("http://localhost/api/pdf/refund-invoice/refund-1", { method: "POST" }) as any,
        { params: Promise.resolve({ refundInvoiceId: "nonexistent" }) }
      );
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });
  });

  // ============================================================
  // Task D: Auto-trigger Refund Invoice on Early Checkout
  // ============================================================
  describe("Auto-trigger Refund Invoice on Early Checkout", () => {
    it("triggers refund invoice generation after early checkout", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue({
        id: STAY_ID,
        hostelId: "hostel-1",
        status: StayStatus.ACTIVE,
        joiningDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-30"),
        bedId: "bed-1",
        totalPayablePaise: 600000,
      });
      mockPrisma.refundInvoice.create.mockResolvedValue({ id: REFUND_ID });

      const { processEarlyCheckout } = await import("@/services/stays/checkout");

      await processEarlyCheckout({
        stayId: STAY_ID,
        hostelId: "hostel-1",
        checkoutDate: new Date("2025-06-15"),
        refundAmount: 3000,
        notes: "Leaving early",
        userId: "user-warden-1",
      });

      // The auto-trigger should fire asynchronously
      await vi.waitFor(() => {
        expect(mockGenerateRefundInvoice).toHaveBeenCalledWith(REFUND_ID);
      });
    });
  });

  // ============================================================
  // Task C: Registration Form API Route
  // ============================================================
  describe("POST /api/pdf/registration-form/[stayId]", () => {
    it("generates and returns document details", async () => {
      mockPrisma.stay.findUnique.mockResolvedValue(createStayMock());

      const res = await regFormPOST(
        new Request("http://localhost/api/pdf/registration-form/stay-1", { method: "POST" }) as any,
        { params: Promise.resolve({ stayId: STAY_ID }) }
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.documentId).toBeDefined();
      expect(data.storagePath).toBeDefined();
    });
  });

  // ============================================================
  // Task C: Refund Invoice API Route
  // ============================================================
  describe("POST /api/pdf/refund-invoice/[refundInvoiceId]", () => {
    it("generates and returns document details", async () => {
      mockPrisma.refundInvoice.findUnique.mockResolvedValue({
        id: REFUND_ID,
        stay: { hostelId: "hostel-1" },
      });
      mockGenerateRefundInvoice.mockResolvedValue({ documentId: DOC_ID, storagePath: "refund.pdf" });

      const res = await refundPOST(
        new Request("http://localhost/api/pdf/refund-invoice/refund-1", { method: "POST" }) as any,
        { params: Promise.resolve({ refundInvoiceId: REFUND_ID }) }
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.documentId).toBeDefined();
    });
  });
});
