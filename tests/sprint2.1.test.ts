import { describe, it, expect, vi, beforeEach } from "vitest";
import { OnboardingRequestStatus } from "@prisma/client";

// ──────────────────────────────────────────────────────────────────────────────
// Prisma mock — hoisted so the vi.mock() factory can reference it
// ──────────────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
    fn(mockPrisma)
  ),
  user: { findUnique: vi.fn() },
  tenant: { create: vi.fn().mockResolvedValue({ id: "tenant-123" }) },
  bed: { findUnique: vi.fn(), findMany: vi.fn() },
  stay: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn().mockResolvedValue({ id: "stay-123" }),
  },
  onboardingRequest: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn().mockResolvedValue({ id: "request-123" }),
  },
  warden: { findUnique: vi.fn().mockResolvedValue({ id: "warden-1" }) },
  room: { findMany: vi.fn() },
}));

// Fake warden session — hoisted so the vi.mock() factory can reference it.
// NOTE: vi.hoisted() runs before imports, so we must use raw string literals
// for enum values (e.g. "WARDEN" instead of UserRole.WARDEN).
const fakeWardenSession = vi.hoisted(() => ({
  user: {
    id: "user-warden-1",
    role: "WARDEN" as const,
    supabaseAuthId: "auth-1",
    phone: "+910000000000",
    email: "warden@test.com",
    passwordSetAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    warden: {
      id: "warden-1",
      userId: "user-warden-1",
      hostelId: "hostel-123",
      createdAt: new Date(),
    },
    tenant: null,
  },
}));

// ──────────────────────────────────────────────────────────────────────────────
// Module mocks
// ──────────────────────────────────────────────────────────────────────────────
vi.mock("../lib/db", () => ({ prisma: mockPrisma }));

// Mock the entire auth module — requireRole returns a fake warden session
// requireHostelAccess resolves silently (no-op)
vi.mock("../lib/auth", () => ({
  requireRole: vi.fn().mockResolvedValue(fakeWardenSession),
  requireHostelAccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/auth/resolve-hostel", () => ({
  resolveHostelId: vi.fn().mockResolvedValue("hostel-123"),
}));

// Needed for transitive imports inside route files
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));

// ──────────────────────────────────────────────────────────────────────────────
// Static import of the mocked auth module (safe to use vi.mocked() on this)
// ──────────────────────────────────────────────────────────────────────────────
import * as authModule from "../lib/auth";

// ──────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ──────────────────────────────────────────────────────────────────────────────

/** Mock bed whose room is linked via flat → floor */
const mockBedWithFlat = {
  id: "bed-123",
  label: "101-A",
  status: "AVAILABLE",
  bedType: null,
  roomId: "r-1",
  room: {
    id: "r-1",
    roomNumber: "101",
    sharingType: "SINGLE",
    flat: {
      id: "f-1",
      name: "Flat A",
      floor: { id: "fl-1", hostelId: "hostel-123", name: "Floor 1" },
    },
    floor: null,
  },
};

/** Factory: build a POST Request for /api/warden/onboard */
function makeOnboardRequest(overrides: Record<string, unknown> = {}) {
  return new Request("http://localhost:3000/api/warden/onboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: "+919876543210",
      bedId: "123e4567-e89b-12d3-a456-426614174000",
      joiningDate: "2024-06-21T00:00:00.000Z",
      endDate: "2024-07-21T00:00:00.000Z",
      durationType: "MONTHLY",
      foodPlan: "NOT_INCLUDED",
      isNewAdmission: true,
      admissionFee: 5000,
      monthlyRent: 10000,
      securityDeposit: 20000,
      foodCharges: 0,
      discount: 0,
      ...overrides,
    }),
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────
describe("Sprint 2.1: Warden Initiation — Onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore defaults after clearAllMocks()
    mockPrisma.tenant.create.mockResolvedValue({ id: "tenant-123" });
    mockPrisma.stay.create.mockResolvedValue({ id: "stay-123" });
    mockPrisma.onboardingRequest.create.mockResolvedValue({ id: "request-123" });
    mockPrisma.$transaction.mockImplementation(
      (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)
    );
    // Re-establish auth mocks (cleared above)
    vi.mocked(authModule.requireRole).mockResolvedValue(fakeWardenSession as never);
    vi.mocked(authModule.requireHostelAccess).mockResolvedValue(undefined);
  });

  // ────────────────────────────────────────────────────────
  // Duplicate Phone Guards
  // ────────────────────────────────────────────────────────
  describe("Duplicate Phone Guards", () => {
    it("should return 409 CONFLICT if an existing user has the same phone", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "existing-user-id",
        phone: "+919876543210",
      });

      const { POST } = await import("../app/api/warden/onboard/route");
      const res = await POST(makeOnboardRequest() as never);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.code).toBe("CONFLICT");
    });

    it("should return 409 CONFLICT if a PENDING onboarding request already exists for the phone", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.onboardingRequest.findFirst.mockResolvedValue({
        id: "pending-req-id",
        phone: "+919876543210",
        status: "PENDING",
      });

      const { POST } = await import("../app/api/warden/onboard/route");
      const res = await POST(makeOnboardRequest() as never);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.code).toBe("CONFLICT");
    });
  });

  // ────────────────────────────────────────────────────────
  // Bed Overlap Check
  // ────────────────────────────────────────────────────────
  describe("Bed Overlap Check", () => {
    it("should return 409 CONFLICT if an ACTIVE stay overlaps the requested date range", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.onboardingRequest.findFirst.mockResolvedValue(null);
      mockPrisma.bed.findUnique.mockResolvedValue(mockBedWithFlat);
      mockPrisma.stay.findFirst.mockResolvedValue({
        id: "existing-stay-id",
        bedId: "bed-123",
        status: "ACTIVE",
      });

      const { POST } = await import("../app/api/warden/onboard/route");
      const res = await POST(makeOnboardRequest() as never);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.code).toBe("CONFLICT");
    });

    it("should return 409 CONFLICT if an EXTENDED stay overlaps the requested date range", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.onboardingRequest.findFirst.mockResolvedValue(null);
      mockPrisma.bed.findUnique.mockResolvedValue(mockBedWithFlat);
      mockPrisma.stay.findFirst.mockResolvedValue({
        id: "existing-stay-id",
        bedId: "bed-123",
        status: "EXTENDED",
      });

      const { POST } = await import("../app/api/warden/onboard/route");
      const res = await POST(makeOnboardRequest() as never);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.code).toBe("CONFLICT");
    });
  });

  // ────────────────────────────────────────────────────────
  // Onboarding Link Validation (Public GET route)
  // ────────────────────────────────────────────────────────
  describe("Onboarding Link Validation (Public Route)", () => {
    it("should return 404 NOT_FOUND if the request ID does not exist", async () => {
      mockPrisma.onboardingRequest.findUnique.mockResolvedValue(null);

      const { GET } = await import(
        "../app/api/public/onboard-request/[id]/route"
      );
      const req = new Request(
        "http://localhost:3000/api/public/onboard-request/non-existent"
      );
      const res = await GET(req as never, {
        params: Promise.resolve({ id: "non-existent" }),
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("should return 400 VALIDATION_ERROR if status is COMPLETED", async () => {
      mockPrisma.onboardingRequest.findUnique.mockResolvedValue({
        id: "req-123",
        phone: "+919876543210",
        status: OnboardingRequestStatus.COMPLETED,
        hostel: { id: "h-1", name: "Hostel Alpha" },
        bed: { id: "b-1", label: "101-A" },
      });

      const { GET } = await import(
        "../app/api/public/onboard-request/[id]/route"
      );
      const req = new Request(
        "http://localhost:3000/api/public/onboard-request/req-123"
      );
      const res = await GET(req as never, {
        params: Promise.resolve({ id: "req-123" }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 VALIDATION_ERROR if status is EXPIRED", async () => {
      mockPrisma.onboardingRequest.findUnique.mockResolvedValue({
        id: "req-456",
        phone: "+919876543210",
        status: OnboardingRequestStatus.EXPIRED,
        hostel: { id: "h-1", name: "Hostel Alpha" },
        bed: { id: "b-1", label: "101-A" },
      });

      const { GET } = await import(
        "../app/api/public/onboard-request/[id]/route"
      );
      const req = new Request(
        "http://localhost:3000/api/public/onboard-request/req-456"
      );
      const res = await GET(req as never, {
        params: Promise.resolve({ id: "req-456" }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 200 with onboarding data for a valid PENDING request", async () => {
      mockPrisma.onboardingRequest.findUnique.mockResolvedValue({
        id: "req-789",
        phone: "+919876543210",
        status: OnboardingRequestStatus.PENDING,
        hostel: { id: "h-1", name: "Hostel Alpha" },
        bed: { id: "b-1", label: "101-A" },
      });

      const { GET } = await import(
        "../app/api/public/onboard-request/[id]/route"
      );
      const req = new Request(
        "http://localhost:3000/api/public/onboard-request/req-789"
      );
      const res = await GET(req as never, {
        params: Promise.resolve({ id: "req-789" }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe("req-789");
      expect(data.phone).toBe("+919876543210");
      expect(data.hostelName).toBe("Hostel Alpha");
      expect(data.bedLabel).toBe("101-A");
    });
  });
});