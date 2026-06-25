/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StayStatus, PaymentStatus, UserRole } from "@prisma/client";

// ============================================================
// Mock Infrastructure
// ============================================================

const mockPrisma = vi.hoisted(() => ({
  stay: { findMany: vi.fn() },
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

vi.mock("@/lib/auth/resolve-hostel", () => ({
  resolveHostelId: vi.fn().mockResolvedValue("hostel-1"),
}));

import { normalizePhoneNumber, buildWaMeLink } from "@/lib/whatsapp/utils";
import {
  onboardingLink,
  applicationApprovedPaymentRequest,
  paymentReceiptReady,
  extensionConfirmed,
  rentDueReminder,
  refundProcessed,
} from "@/lib/whatsapp/templates";
import { GET as worklistsGET } from "@/app/api/warden/worklists/route";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================================
// normalizePhoneNumber Tests
// ============================================================
describe("normalizePhoneNumber", () => {
  it("strips spaces and returns E.164 format", () => {
    expect(normalizePhoneNumber("+91 98765 43210")).toBe("919876543210");
  });

  it("strips dashes and returns E.164 format", () => {
    expect(normalizePhoneNumber("098765-43210")).toBe("919876543210");
  });

  it("strips parentheses and spaces", () => {
    expect(normalizePhoneNumber("+91(98765)43210")).toBe("919876543210");
  });

  it("handles bare 10-digit number by prefixing India code 91", () => {
    expect(normalizePhoneNumber("9876543210")).toBe("919876543210");
  });

  it("strips leading zero before applying country code", () => {
    expect(normalizePhoneNumber("09876543210")).toBe("919876543210");
  });

  it("handles number with country code 91 already present", () => {
    expect(normalizePhoneNumber("919876543210")).toBe("919876543210");
  });

  it("handles US number with country code 1", () => {
    expect(normalizePhoneNumber("+1 800 555 0199")).toBe("18005550199");
  });

  it("handles number with multiple formatting characters", () => {
    expect(normalizePhoneNumber("+91-987-654-3210")).toBe("919876543210");
  });

  it("handles number with stray plus sign", () => {
    expect(normalizePhoneNumber("+9876543210")).toBe("919876543210");
  });

  it("throws ValidationError for number with fewer than 10 digits", () => {
    expect(() => normalizePhoneNumber("12345")).toThrow("too short");
  });

  it("throws ValidationError for empty string after cleaning", () => {
    expect(() => normalizePhoneNumber("++++++++")).toThrow("too short");
  });

  it("throws ValidationError for 9-digit number", () => {
    expect(() => normalizePhoneNumber("123456789")).toThrow("too short");
  });

  it("handles number with leading zeros and dashes", () => {
    expect(normalizePhoneNumber("00-98765-43210")).toBe("919876543210");
  });
});

// ============================================================
// buildWaMeLink Tests
// ============================================================
describe("buildWaMeLink", () => {
  it("returns correct wa.me URL with phone and message", () => {
    const url = buildWaMeLink("9876543210", "Hello");
    expect(url).toBe("https://wa.me/919876543210?text=Hello");
  });

  it("URL-encodes emojis correctly", () => {
    const url = buildWaMeLink("9876543210", "Hello 🏠");
    expect(url).toContain("https://wa.me/919876543210?text=");
    expect(url).toContain("%F0%9F%8F%A0");
  });

  it("URL-encodes newlines correctly", () => {
    const url = buildWaMeLink("9876543210", "Line1\nLine2");
    expect(url).toContain("Line1%0ALine2");
  });

  it("URL-encodes Rupee symbol (₹) correctly", () => {
    const url = buildWaMeLink("9876543210", "Amount: ₹500");
    expect(url).toContain("%E2%82%B9500");
  });

  it("URL-encodes HTTP links correctly", () => {
    const url = buildWaMeLink("9876543210", "Visit https://example.com");
    expect(url).toContain("https%3A%2F%2Fexample.com");
  });

  it("handles empty phone by omitting phone segment", () => {
    const url = buildWaMeLink("", "Hello");
    expect(url).toBe("https://wa.me/?text=Hello");
  });

  it("handles complex multi-line message with special chars", () => {
    const msg = "Hello! 🎉\nAmount: ₹1,000\nLink: https://anywherenode.com";
    const url = buildWaMeLink("9876543210", msg);
    expect(url).toContain("https://wa.me/919876543210?text=");
    expect(url).toContain("%F0%9F%8E%89");
    expect(url).toContain("%0A");
    expect(url).toContain("%E2%82%B91%2C000");
  });
});

// ============================================================
// Template Function Tests
// ============================================================
describe("Message Templates", () => {
  describe("onboardingLink", () => {
    it("returns correct message without name", () => {
      const msg = onboardingLink("https://anywherenode.com/newuser?id=abc");
      expect(msg).toBe(
        "Hello, welcome to Anywhere Node. Please complete your registration here: https://anywherenode.com/newuser?id=abc"
      );
    });

    it("returns correct message with name", () => {
      const msg = onboardingLink("https://anywherenode.com/newuser?id=abc", "Rahul");
      expect(msg).toBe(
        "Hello Rahul, welcome to Anywhere Node. Please complete your registration here: https://anywherenode.com/newuser?id=abc"
      );
    });
  });

  describe("applicationApprovedPaymentRequest", () => {
    it("returns default short message without breakdown", () => {
      const msg = applicationApprovedPaymentRequest({
        name: "Priya",
        amount: 25000,
        paymentUrl: "https://anywherenode.com/login",
      });
      expect(msg).toContain("Hi Priya");
      expect(msg).toContain("approved");
      expect(msg).toContain("\u20B925,000");
      expect(msg).toContain("https://anywherenode.com/login");
    });

    it("returns detailed breakdown message when breakdown is provided", () => {
      const msg = applicationApprovedPaymentRequest({
        name: "Amit",
        amount: 30000,
        paymentUrl: "https://anywherenode.com/login",
        breakdown: {
          admissionFee: 5000,
          monthlyRent: 10000,
          securityDeposit: 10000,
          foodCharges: 5000,
          discount: 0,
          roomBedLabel: "101-A",
        },
      });
      expect(msg).toContain("Hello Amit");
      expect(msg).toContain("101-A");
      expect(msg).toContain("Anywhere Node Hostel has been approved");
      expect(msg).toContain("Admission Fee: \u20B95,000");
      expect(msg).toContain("Monthly Rent: \u20B910,000");
      expect(msg).toContain("Security Deposit: \u20B910,000");
      expect(msg).toContain("Food Charges: \u20B95,000");
      expect(msg).toContain("Discount: \u20B90");
      expect(msg).toContain("payments@anywherenode.com");
      expect(msg).toContain("Thank you!");
    });

    it("uses default room label when roomBedLabel is not provided", () => {
      const msg = applicationApprovedPaymentRequest({
        name: "Test",
        amount: 10000,
        paymentUrl: "https://example.com",
        breakdown: {
          admissionFee: 2000,
          monthlyRent: 5000,
          securityDeposit: 3000,
          foodCharges: 0,
          discount: 0,
        },
      });
      expect(msg).toContain("your room");
    });
  });

  describe("paymentReceiptReady", () => {
    it("returns correct receipt message", () => {
      const msg = paymentReceiptReady("Rahul", 15000, "https://anywherenode.com/receipt/123");
      expect(msg).toBe(
        "Hello Rahul, your payment of \u20B9 15,000 has been verified. Download your receipt: https://anywherenode.com/receipt/123"
      );
    });
  });

  describe("extensionConfirmed", () => {
    it("returns correct extension message", () => {
      const msg = extensionConfirmed("Priya", "31 Jul 2026");
      expect(msg).toBe(
        "Hi Priya, your stay extension is confirmed. Your new exit date is 31 Jul 2026."
      );
    });
  });

  describe("rentDueReminder", () => {
    const baseParams = {
      name: "Amit",
      dueDate: "15 Jul 2026",
      amount: 10000,
      paymentUrl: "https://anywherenode.com/tenant",
      daysRemaining: 7,
    };

    it("returns 3-day variant when daysRemaining <= 3", () => {
      const msg = rentDueReminder({ ...baseParams, daysRemaining: 2 });
      expect(msg).toContain("Dear Amit");
      expect(msg).toContain("due in 2 days");
      expect(msg).toContain("(15 Jul 2026)");
      expect(msg).toContain("\u20B910,000");
      expect(msg).toContain("Pay here:");
    });

    it("returns URGENT variant when daysRemaining is 0", () => {
      const msg = rentDueReminder({ ...baseParams, daysRemaining: 0 });
      expect(msg).toContain("URGENT: Amit");
      expect(msg).toContain("due today");
      expect(msg).toContain("\u20B910,000");
      expect(msg).toContain("Please complete your payment");
    });

    it("returns default variant for daysRemaining between 4 and 14", () => {
      const msg = rentDueReminder({ ...baseParams, daysRemaining: 10 });
      expect(msg).toContain("Hi Amit");
      expect(msg).toContain("due on 15 Jul 2026");
      expect(msg).toContain("\u20B910,000");
      expect(msg).toContain("Pay here:");
    });
  });

  describe("refundProcessed", () => {
    it("returns correct refund message", () => {
      const msg = refundProcessed("Rahul", 8500, "stay-abc-123");
      expect(msg).toBe(
        "Hello Rahul, your early checkout settlement is processed. A refund of \u20B98,500 has been credited for Stay stay-abc-123."
      );
    });
  });
});

// ============================================================
// Worklists API Tests
// ============================================================
describe("Warden Worklists API", () => {
  const today = new Date("2026-06-22T10:00:00.000+05:30");
  const tomorrow = new Date("2026-06-23T00:00:00.000+05:30");
  const in5Days = new Date("2026-06-27T00:00:00.000+05:30");
  const in20Days = new Date("2026-07-12T00:00:00.000+05:30");

  const MOCK_RENT_DUE_STAYS = [
    {
      id: "stay-1",
      status: StayStatus.ACTIVE,
      joiningDate: new Date("2026-05-01"),
      endDate: tomorrow,
      monthlyRentPaise: 1000000,
      tenant: {
        id: "tenant-1",
        fullName: "Rahul Sharma",
        user: { email: "rahul@test.com", phone: "9876543210" },
      },
      bed: { id: "bed-1", label: "A1", room: { roomNumber: "101" } },
    },
    {
      id: "stay-2",
      status: StayStatus.EXTENDED,
      joiningDate: new Date("2026-04-01"),
      endDate: in5Days,
      monthlyRentPaise: 1250000,
      tenant: {
        id: "tenant-2",
        fullName: "Priya Patel",
        user: { email: "priya@test.com", phone: "9876543211" },
      },
      bed: { id: "bed-2", label: "B2", room: { roomNumber: "102" } },
    },
    {
      id: "stay-3",
      status: StayStatus.ACTIVE,
      joiningDate: new Date("2026-06-01"),
      endDate: in20Days,
      monthlyRentPaise: 800000,
      tenant: {
        id: "tenant-3",
        fullName: "Amit Kumar",
        user: { email: null, phone: null },
      },
      bed: { id: "bed-3", label: "C1", room: { roomNumber: "201" } },
    },
  ];

  const MOCK_PAYMENTS_PENDING = [
    {
      id: "stay-4",
      status: StayStatus.APPROVED_AWAITING_PAYMENT,
      totalPayablePaise: 2500000,
      joiningDate: new Date("2026-06-01"),
      endDate: new Date("2026-07-01"),
      tenant: {
        id: "tenant-4",
        fullName: "Sneha Reddy",
        user: { email: "sneha@test.com", phone: "9876543212" },
      },
      bed: { id: "bed-4", label: "D1", room: { roomNumber: "301" } },
      payments: [
        {
          id: "pmt-1",
          amountPaidPaise: 2500000,
          transactionRefNo: "UTR123456",
          paymentStatus: PaymentStatus.PENDING,
        },
      ],
    },
  ];

  const MOCK_APPLICATIONS_PENDING = [
    {
      id: "stay-5",
      status: StayStatus.ONBOARDING_PENDING,
      joiningDate: new Date("2026-06-25"),
      endDate: new Date("2026-07-25"),
      tenant: {
        id: "tenant-5",
        fullName: "Vikram Singh",
        user: { email: "vikram@test.com", phone: "9876543213" },
      },
      bed: { id: "bed-5", label: "E1", room: { roomNumber: "401" } },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(today);
    vi.mocked(authModule.requireRole).mockResolvedValue(fakeWardenSession as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns three queues in a single GET call", async () => {
    mockPrisma.stay.findMany
      .mockResolvedValueOnce(MOCK_RENT_DUE_STAYS)
      .mockResolvedValueOnce(MOCK_PAYMENTS_PENDING)
      .mockResolvedValueOnce(MOCK_APPLICATIONS_PENDING);

    const res = await worklistsGET(
      new Request("http://localhost/api/warden/worklists") as any
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.rentDueStays).toBeDefined();
    expect(data.paymentsPending).toBeDefined();
    expect(data.applicationsPending).toBeDefined();
  });

  it("returns rent due stays with daysRemaining and rentAmount calculated", async () => {
    mockPrisma.stay.findMany
      .mockResolvedValueOnce(MOCK_RENT_DUE_STAYS)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await worklistsGET(
      new Request("http://localhost/api/warden/worklists") as any
    );
    const data = await res.json();

    const rahul = data.rentDueStays.find((s: any) => s.tenant.fullName === "Rahul Sharma");
    expect(rahul).toBeDefined();
    expect(rahul.daysRemaining).toBe(1);
    expect(rahul.bed.roomNumber).toBe("101");
    expect(rahul.rentAmount).toBe(10000);

    const priya = data.rentDueStays.find((s: any) => s.tenant.fullName === "Priya Patel");
    expect(priya).toBeDefined();
    expect(priya.daysRemaining).toBe(5);
    expect(priya.rentAmount).toBe(12500);
  });

  it("excludes stays with endDate beyond 14 days from rentDueStays", async () => {
    // The third stay (Amit) has endDate 20 days out — should not appear
    mockPrisma.stay.findMany
      .mockResolvedValueOnce([MOCK_RENT_DUE_STAYS[0], MOCK_RENT_DUE_STAYS[1]])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await worklistsGET(
      new Request("http://localhost/api/warden/worklists") as any
    );
    const data = await res.json();

    expect(data.rentDueStays).toHaveLength(2);
    expect(data.rentDueStays.find((s: any) => s.tenant.fullName === "Amit Kumar")).toBeUndefined();
  });

  it("returns payments pending with correct structure", async () => {
    mockPrisma.stay.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(MOCK_PAYMENTS_PENDING)
      .mockResolvedValueOnce([]);

    const res = await worklistsGET(
      new Request("http://localhost/api/warden/worklists") as any
    );
    const data = await res.json();

    expect(data.paymentsPending).toHaveLength(1);
    const payment = data.paymentsPending[0];
    expect(payment.tenant.fullName).toBe("Sneha Reddy");
    expect(payment.pendingPayments).toHaveLength(1);
    expect(payment.pendingPayments[0].transactionRefNo).toBe("UTR123456");
    expect(payment.pendingPayments[0].amount).toBe(25000);
  });

  it("returns applications pending with completed registration only", async () => {
    mockPrisma.stay.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(MOCK_APPLICATIONS_PENDING);

    const res = await worklistsGET(
      new Request("http://localhost/api/warden/worklists") as any
    );
    const data = await res.json();

    expect(data.applicationsPending).toHaveLength(1);
    expect(data.applicationsPending[0].tenant.fullName).toBe("Vikram Singh");
    expect(data.applicationsPending[0].bed.roomNumber).toBe("401");
  });

  it("allows MAIN_ADMIN to access worklists", async () => {
    vi.mocked(authModule.requireRole).mockResolvedValue(fakeAdminSession as any);
    mockPrisma.stay.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await worklistsGET(
      new Request("http://localhost/api/warden/worklists?hostelId=hostel-1") as any
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.rentDueStays).toEqual([]);
    expect(data.paymentsPending).toEqual([]);
    expect(data.applicationsPending).toEqual([]);
  });

  it("enriches tenant with phone and email from user profile", async () => {
    mockPrisma.stay.findMany
      .mockResolvedValueOnce([MOCK_RENT_DUE_STAYS[0]])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await worklistsGET(
      new Request("http://localhost/api/warden/worklists") as any
    );
    const data = await res.json();

    const tenant = data.rentDueStays[0].tenant;
    expect(tenant.email).toBe("rahul@test.com");
    expect(tenant.phone).toBe("9876543210");
  });

  it("handles null user profile gracefully", async () => {
    mockPrisma.stay.findMany
      .mockResolvedValueOnce([MOCK_RENT_DUE_STAYS[2]])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await worklistsGET(
      new Request("http://localhost/api/warden/worklists") as any
    );
    const data = await res.json();

    const tenant = data.rentDueStays[0].tenant;
    expect(tenant.email).toBeNull();
    expect(tenant.phone).toBeNull();
  });

  it("returns 401 for unauthenticated requests", async () => {
    vi.mocked(authModule.requireRole).mockRejectedValue(
      new (await import("@/lib/errors")).UnauthorizedError("Session invalid")
    );

    const res = await worklistsGET(
      new Request("http://localhost/api/warden/worklists") as any
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.code).toBe("UNAUTHORIZED");
  });
});
