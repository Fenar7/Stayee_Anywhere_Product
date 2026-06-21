import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole, StayStatus, OnboardingRequestStatus, BedStatus, OccupationType, DurationType, FoodPlan } from "@prisma/client";
import { ConflictError, ValidationError, NotFoundError, ForbiddenError } from "../lib/errors";

// Create mock prisma
const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn((fn: any) => fn(mockPrisma)),
  user: {
    findUnique: vi.fn(),
  },
  tenant: {
    create: vi.fn().mockReturnValue({ id: "tenant-123" }),
  },
  bed: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  stay: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn().mockReturnValue({ id: "stay-123" }),
  },
  onboardingRequest: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn().mockReturnValue({ id: "request-123" }),
  },
  room: {
    findMany: vi.fn(),
  },
}));

const mockCookies = vi.hoisted(() => ({
  getAll: vi.fn().mockReturnValue([]),
  set: vi.fn(),
}));

const mockCreateServerClient = vi.hoisted(() => vi.fn(() => ({
  auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("No session") }) },
})));

vi.mock("../lib/db", () => ({ prisma: mockPrisma }));
vi.mock("next/headers", () => ({ cookies: vi.fn().mockResolvedValue({ getAll: vi.fn().mockReturnValue([]), set: vi.fn() }) }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mockCreateServerClient }));

describe("Sprint 2.1: Warden Initiation - Onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Creation Success", () => {
    it("should create tenant, stay, and onboarding request via transaction", async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const result = await fn(mockPrisma);
        return mockPrisma.onboardingRequest.create();
      });

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.bed.findUnique.mockResolvedValue({
        id: "bed-123",
        label: "101-A",
        room: { id: "r-1", roomNumber: "101", sharingType: "SINGLE", flat: { id: "f-1", name: "Flat A", floor: { hostelId: "hostel-123" } } },
      });
      mockPrisma.stay.findFirst.mockResolvedValue(null);

      const { POST } = await import("../app/api/warden/onboard/route");

      const req = new Request("http://localhost:3000", {
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
        }),
      });

      const res = await POST(req as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.requestId).toBeDefined();
      expect(data.entryGateLink).toContain("newuser");
    });
  });

  describe("Duplicate Phone Guards", () => {
    it("should return ConflictError if existing user with phone exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "existing-user" });
      mockPrisma.onboardingRequest.findFirst.mockResolvedValue(null);

      const { POST } = await import("../app/api/warden/onboard/route");

      const req = new Request("http://localhost:3000", {
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
        }),
      });

      const res = await POST(req as any);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.code).toBe("CONFLICT");
    });

    it("should return ConflictError if pending onboarding request exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.onboardingRequest.findFirst.mockResolvedValue({ id: "pending-request" });

      const { POST } = await import("../app/api/warden/onboard/route");

      const req = new Request("http://localhost:3000", {
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
        }),
      });

      const res = await POST(req as any);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.code).toBe("CONFLICT");
    });
  });

  describe("Bed Overlap Check", () => {
    it("should return ConflictError if bed has overlapping active stay", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.onboardingRequest.findFirst.mockResolvedValue(null);
      mockPrisma.bed.findUnique.mockResolvedValue({
        id: "bed-123",
        label: "101-A",
        room: { id: "r-1", roomNumber: "101", sharingType: "SINGLE", flat: { id: "f-1", name: "Flat A", floor: { hostelId: "hostel-123" } } },
      });
      mockPrisma.stay.findFirst.mockResolvedValue({ id: "existing-stay", bedId: "bed-123" });

      const { POST } = await import("../app/api/warden/onboard/route");

      const req = new Request("http://localhost:3000", {
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
        }),
      });

      const res = await POST(req as any);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.code).toBe("CONFLICT");
    });
  });

  describe("Onboarding Link Validation", () => {
    it("should return NotFoundError if request does not exist", async () => {
      mockPrisma.onboardingRequest.findUnique.mockResolvedValue(null);

      const { GET } = await import("../app/api/public/onboard-request/[id]/route");
      const req = new Request("http://localhost:3000/api/public/onboard-request/non-existent");

      const res = await GET(req as any, { params: { id: "non-existent" } });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("should return ValidationError if status is not PENDING", async () => {
      mockPrisma.onboardingRequest.findUnique.mockResolvedValue({
        id: "req-123",
        phone: "+919876543210",
        status: OnboardingRequestStatus.COMPLETED,
        hostel: { id: "h-1", name: "Hostel Alpha" },
        bed: { id: "b-1", label: "101-A", room: { id: "r-1", roomNumber: "101", sharingType: "DOUBLE", flat: { id: "f-1", name: "Flat A", floor: { id: "fl-1", name: "First Floor" } } } },
      });

      const { GET } = await import("../app/api/public/onboard-request/[id]/route");
      const req = new Request("http://localhost:3000/api/public/onboard-request/req-123");

      const res = await GET(req as any, { params: { id: "req-123" } });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return onboarding data for valid PENDING request", async () => {
      mockPrisma.onboardingRequest.findUnique.mockResolvedValue({
        id: "req-123",
        phone: "+919876543210",
        status: OnboardingRequestStatus.PENDING,
        hostel: { id: "h-1", name: "Hostel Alpha" },
        bed: { id: "b-1", label: "101-A", room: { id: "r-1", roomNumber: "101", sharingType: "DOUBLE", flat: { id: "f-1", name: "Flat A", floor: { id: "fl-1", name: "First Floor" } } } },
      });

      const { GET } = await import("../app/api/public/onboard-request/[id]/route");
      const req = new Request("http://localhost:3000/api/public/onboard-request/req-123");

      const res = await GET(req as any, { params: { id: "req-123" } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe("req-123");
      expect(data.phone).toBe("+919876543210");
      expect(data.hostelName).toBe("Hostel Alpha");
      expect(data.bedLabel).toBe("101-A");
    });
  });
});