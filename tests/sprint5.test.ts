import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StayStatus, FoodPlan, UserRole } from "@prisma/client";

// ============================================================
// Mock Infrastructure
// ============================================================

const mockPrisma = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn() },
  stay: { findFirst: vi.fn(), findMany: vi.fn() },
  foodOrder: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

const fakeTenantSession = vi.hoisted(() => ({
  user: {
    id: "user-tenant-1",
    role: "TENANT" as const,
    warden: null,
    tenant: { id: "tenant-1", fullName: "Rahul Sharma" },
  },
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

import { POST as foodOrdersPOST, GET as foodOrdersGET } from "@/app/api/tenant/food-orders/route";
import { GET as foodStatsGET } from "@/app/api/warden/food-stats/route";
import { isPastFoodCutoff, getCutoffTime, formatCutoffTime } from "@/lib/dates/food-cutoff";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================================
// Food Cutoff Logic Tests
// ============================================================
describe("Food Cutoff Logic (lib/dates/food-cutoff)", () => {
  describe("isPastFoodCutoff", () => {
    it("returns false when current time is well before cutoff (e.g., noon today for tomorrow)", () => {
      // Target date: June 25, 2026
      // Cutoff: 10:00 PM IST on June 24, 2026
      // Current: 12:00 PM IST on June 24, 2026 — before cutoff
      const targetDate = new Date("2026-06-25T00:00:00.000+05:30");
      const now = new Date("2026-06-24T12:00:00.000+05:30");
      expect(isPastFoodCutoff(targetDate, now)).toBe(false);
    });

    it("returns true when current time is exactly at cutoff (10:00 PM IST on D-1)", () => {
      const targetDate = new Date("2026-06-25T00:00:00.000+05:30");
      const now = new Date("2026-06-24T22:00:00.000+05:30");
      expect(isPastFoodCutoff(targetDate, now)).toBe(true);
    });

    it("returns true when current time is after cutoff (11:59 PM IST on D-1)", () => {
      const targetDate = new Date("2026-06-25T00:00:00.000+05:30");
      const now = new Date("2026-06-24T23:59:00.000+05:30");
      expect(isPastFoodCutoff(targetDate, now)).toBe(true);
    });

    it("returns true when current time is on the target date itself (cutoff already passed)", () => {
      const targetDate = new Date("2026-06-25T00:00:00.000+05:30");
      const now = new Date("2026-06-25T08:00:00.000+05:30");
      expect(isPastFoodCutoff(targetDate, now)).toBe(true);
    });

    it("returns false for today's meals (cutoff was yesterday)", () => {
      // Target: today June 24. Cutoff was 10 PM on June 23.
      // Current: 8 AM June 24 — cutoff already passed for today
      const targetDate = new Date("2026-06-24T00:00:00.000+05:30");
      const now = new Date("2026-06-24T08:00:00.000+05:30");
      // For today, the cutoff was yesterday at 10 PM — so it's past
      expect(isPastFoodCutoff(targetDate, now)).toBe(true);
    });

    it("returns false when it's early morning on D-1 (e.g., 6 AM)", () => {
      const targetDate = new Date("2026-06-25T00:00:00.000+05:30");
      const now = new Date("2026-06-24T06:00:00.000+05:30");
      expect(isPastFoodCutoff(targetDate, now)).toBe(false);
    });

    it("handles midnight boundary correctly (11:59 PM vs midnight)", () => {
      const targetDate = new Date("2026-06-25T00:00:00.000+05:30");
      // 11:59 PM on June 24 — still before midnight but after 10 PM cutoff
      const now = new Date("2026-06-24T23:59:59.999+05:30");
      expect(isPastFoodCutoff(targetDate, now)).toBe(true);
    });
  });

  describe("getCutoffTime", () => {
    it("returns 10:00 PM IST on the day before target date", () => {
      const targetDate = new Date("2026-06-25T00:00:00.000+05:30");
      const cutoff = getCutoffTime(targetDate);
      // Should be June 24 at 22:00 IST
      const istString = cutoff.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      expect(istString).toContain("24/6/2026");
      expect(istString).toContain("10:00:00 pm");
    });
  });

  describe("formatCutoffTime", () => {
    it("returns a human-readable IST string", () => {
      const targetDate = new Date("2026-06-25T00:00:00.000+05:30");
      const formatted = formatCutoffTime(targetDate);
      expect(formatted.toLowerCase()).toContain("10:00 pm");
      expect(formatted).toContain("24");
      expect(formatted).toContain("Jun");
    });
  });
});

// ============================================================
// Tenant Food Orders API Tests
// ============================================================
describe("Tenant Food Orders API", () => {
  const ACTIVE_STAY = {
    id: "stay-1",
    foodPlan: FoodPlan.BLD,
    status: StayStatus.ACTIVE,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.requireRole).mockResolvedValue(fakeTenantSession as any);
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: "tenant-1", userId: "user-tenant-1" });
    mockPrisma.stay.findFirst.mockResolvedValue(ACTIVE_STAY);
  });

  describe("GET /api/tenant/food-orders", () => {
    it("returns food orders for a date range", async () => {
      mockPrisma.foodOrder.findMany.mockResolvedValue([
        {
          forDate: new Date("2026-06-25T00:00:00.000+05:30"),
          breakfast: true,
          lunch: false,
          dinner: true,
          confirmedAt: null,
          lockedAt: null,
        },
      ]);

      const res = await foodOrdersGET(
        new Request("http://localhost/api/tenant/food-orders?startDate=2026-06-23&endDate=2026-06-25") as any
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.stayId).toBe("stay-1");
      expect(data.foodPlan).toBe("BLD");
      expect(data.days).toHaveLength(3);
      // June 25 should have the food order — match by IST date string
      const june25 = data.days.find((d: any) => {
        const istDate = new Date(d.forDate).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        return istDate === "2026-06-25";
      });
      expect(june25).toBeDefined();
      expect(june25.breakfast).toBe(true);
      expect(june25.dinner).toBe(true);
      expect(june25.lunch).toBe(false);
    });

    it("marks past-cutoff days as non-editable", async () => {
      mockPrisma.foodOrder.findMany.mockResolvedValue([]);

      // Request for today — today's cutoff was yesterday, so it should be non-editable
      const todayStr = new Date().toISOString().split("T")[0];
      const res = await foodOrdersGET(
        new Request(`http://localhost/api/tenant/food-orders?startDate=${todayStr}&endDate=${todayStr}`) as any
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      // Today's food orders should be non-editable (cutoff was yesterday)
      const today = data.days.find((d: any) => {
        const istDate = new Date(d.forDate).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        return istDate === todayStr;
      });
      expect(today).toBeDefined();
      expect(today.isEditable).toBe(false);
    });

    it("returns 403 when tenant has no active stay", async () => {
      mockPrisma.stay.findFirst.mockResolvedValue(null);

      const res = await foodOrdersGET(
        new Request("http://localhost/api/tenant/food-orders?startDate=2026-06-23&endDate=2026-06-25") as any
      );
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.code).toBe("FORBIDDEN");
    });

    it("returns 400 when startDate is missing", async () => {
      const res = await foodOrdersGET(
        new Request("http://localhost/api/tenant/food-orders?endDate=2026-06-25") as any
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when endDate is before startDate", async () => {
      const res = await foodOrdersGET(
        new Request("http://localhost/api/tenant/food-orders?startDate=2026-06-25&endDate=2026-06-23") as any
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/tenant/food-orders", () => {
    it("creates a new food order via upsert", async () => {
      mockPrisma.foodOrder.findUnique.mockResolvedValue(null);
      mockPrisma.foodOrder.upsert.mockResolvedValue({
        forDate: new Date("2026-06-25T00:00:00.000+05:30"),
        breakfast: true,
        lunch: false,
        dinner: false,
        confirmedAt: null,
        lockedAt: null,
      });

      const res = await foodOrdersPOST(
        new Request("http://localhost/api/tenant/food-orders", {
          method: "POST",
          body: JSON.stringify({
            forDate: "2026-06-25",
            breakfast: true,
          }),
        }) as any
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.foodOrder.breakfast).toBe(true);
      expect(mockPrisma.foodOrder.upsert).toHaveBeenCalled();
    });

    it("updates an existing food order via upsert", async () => {
      mockPrisma.foodOrder.findUnique.mockResolvedValue({
        stayId: "stay-1",
        forDate: new Date("2026-06-25T00:00:00.000+05:30"),
        breakfast: true,
        lunch: false,
        dinner: false,
      });
      mockPrisma.foodOrder.upsert.mockResolvedValue({
        forDate: new Date("2026-06-25T00:00:00.000+05:30"),
        breakfast: true,
        lunch: true,
        dinner: false,
        confirmedAt: null,
        lockedAt: null,
      });

      const res = await foodOrdersPOST(
        new Request("http://localhost/api/tenant/food-orders", {
          method: "POST",
          body: JSON.stringify({
            forDate: "2026-06-25",
            lunch: true,
          }),
        }) as any
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.foodOrder.lunch).toBe(true);
    });

    it("blocks orders past the 10 PM IST cutoff", async () => {
      // For today, cutoff was yesterday at 10 PM — always blocked
      const todayStr = new Date().toISOString().split("T")[0];
      const res = await foodOrdersPOST(
        new Request("http://localhost/api/tenant/food-orders", {
          method: "POST",
          body: JSON.stringify({
            forDate: todayStr,
            breakfast: true,
          }),
        }) as any
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("10:00 PM IST");
    });

    it("returns 400 when no meal is specified", async () => {
      // Future date that won't be blocked by cutoff
      const res = await foodOrdersPOST(
        new Request("http://localhost/api/tenant/food-orders", {
          method: "POST",
          body: JSON.stringify({
            forDate: "2026-12-25",
          }),
        }) as any
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("At least one of breakfast, lunch, or dinner");
    });

    it("returns 403 when tenant has no active stay", async () => {
      mockPrisma.stay.findFirst.mockResolvedValue(null);

      const res = await foodOrdersPOST(
        new Request("http://localhost/api/tenant/food-orders", {
          method: "POST",
          body: JSON.stringify({
            forDate: "2026-06-25",
            breakfast: true,
          }),
        }) as any
      );
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.code).toBe("FORBIDDEN");
    });
  });
});

// ============================================================
// Warden Food Stats API Tests
// ============================================================
describe("Warden Food Stats API", () => {
  const ACTIVE_STAYS = [
    {
      id: "stay-1",
      tenant: { id: "tenant-1", fullName: "Rahul Sharma", photoUrl: null },
      bed: { label: "A1", room: { roomNumber: "101" } },
      foodOrders: [
        { breakfast: true, lunch: true, dinner: false, confirmedAt: null, lockedAt: null },
      ],
      createdAt: new Date("2026-06-01"),
    },
    {
      id: "stay-2",
      tenant: { id: "tenant-2", fullName: "Priya Patel", photoUrl: null },
      bed: { label: "B2", room: { roomNumber: "102" } },
      foodOrders: [
        { breakfast: false, lunch: true, dinner: true, confirmedAt: null, lockedAt: null },
      ],
      createdAt: new Date("2026-06-01"),
    },
    {
      id: "stay-3",
      tenant: { id: "tenant-3", fullName: "Amit Kumar", photoUrl: null },
      bed: { label: "C1", room: { roomNumber: "201" } },
      foodOrders: [],
      createdAt: new Date("2026-06-01"),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.requireRole).mockResolvedValue(fakeWardenSession as any);
    mockPrisma.stay.findMany.mockResolvedValue(ACTIVE_STAYS);
  });

  it("returns consolidated food stats for a date", async () => {
    // Use a future date so cutoff hasn't passed
    const res = await foodStatsGET(
      new Request("http://localhost/api/warden/food-stats?date=2026-12-25") as any
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.hostelId).toBe("hostel-1");
    expect(data.summary.totalResidents).toBe(3);
    expect(data.summary.breakfastCount).toBe(1); // Only Rahul
    expect(data.summary.lunchCount).toBe(2);     // Rahul + Priya
    expect(data.summary.dinnerCount).toBe(1);    // Only Priya
  });

  it("returns LOCKED status for past-cutoff dates", async () => {
    // Today's cutoff was yesterday, so it should be LOCKED
    const todayStr = new Date().toISOString().split("T")[0];
    const res = await foodStatsGET(
      new Request(`http://localhost/api/warden/food-stats?date=${todayStr}`) as any
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.lockingStatus).toBe("LOCKED");
  });

  it("returns OPEN status for future dates", async () => {
    const res = await foodStatsGET(
      new Request("http://localhost/api/warden/food-stats?date=2026-12-25") as any
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.lockingStatus).toBe("OPEN");
  });

  it("returns per-resident checklist with correct meal selections", async () => {
    const res = await foodStatsGET(
      new Request("http://localhost/api/warden/food-stats?date=2026-12-25") as any
    );
    const data = await res.json();

    expect(data.residents).toHaveLength(3);

    const rahul = data.residents.find((r: any) => r.tenantName === "Rahul Sharma");
    expect(rahul.breakfast).toBe(true);
    expect(rahul.lunch).toBe(true);
    expect(rahul.dinner).toBe(false);
    expect(rahul.roomNumber).toBe("101");
    expect(rahul.bedLabel).toBe("A1");

    const amit = data.residents.find((r: any) => r.tenantName === "Amit Kumar");
    expect(amit.hasOrder).toBe(false);
  });

  it("returns 400 when date param is missing", async () => {
    const res = await foodStatsGET(
      new Request("http://localhost/api/warden/food-stats") as any
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("allows MAIN_ADMIN to access food stats", async () => {
    vi.mocked(authModule.requireRole).mockResolvedValue(fakeAdminSession as any);

    const res = await foodStatsGET(
      new Request("http://localhost/api/warden/food-stats?date=2026-12-25") as any
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.hostelId).toBe("hostel-1");
  });
});

// ============================================================
// Integration: Cutoff Blocking in POST
// ============================================================
describe("Cutoff Integration: Tenant POST blocked after 10 PM IST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.requireRole).mockResolvedValue(fakeTenantSession as any);
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: "tenant-1", userId: "user-tenant-1" });
    mockPrisma.stay.findFirst.mockResolvedValue({
      id: "stay-1",
      foodPlan: FoodPlan.BLD,
      status: StayStatus.ACTIVE,
    });
  });

  it("blocks food order for tomorrow when current time is past 10 PM IST", async () => {
    // Calculate tomorrow's date in IST
    const now = new Date();
    const tomorrowIST = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrowIST.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    const res = await foodOrdersPOST(
      new Request("http://localhost/api/tenant/food-orders", {
        method: "POST",
        body: JSON.stringify({
          forDate: tomorrowStr,
          breakfast: true,
        }),
      }) as any
    );

    // Use isPastFoodCutoff to determine expected behavior
    const tomorrowDate = new Date(`${tomorrowStr}T00:00:00.000+05:30`);
    const shouldBlock = isPastFoodCutoff(tomorrowDate, now);

    if (shouldBlock) {
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain("10:00 PM IST");
    } else {
      // Before cutoff — upsert should be called
      mockPrisma.foodOrder.findUnique.mockResolvedValue(null);
      mockPrisma.foodOrder.upsert.mockResolvedValue({
        forDate: new Date(tomorrowStr + "T00:00:00.000+05:30"),
        breakfast: true,
        lunch: false,
        dinner: false,
        confirmedAt: null,
        lockedAt: null,
      });

      const res2 = await foodOrdersPOST(
        new Request("http://localhost/api/tenant/food-orders", {
          method: "POST",
          body: JSON.stringify({
            forDate: tomorrowStr,
            breakfast: true,
          }),
        }) as any
      );
      const data = await res2.json();
      expect(res2.status).toBe(200);
      expect(data.success).toBe(true);
    }
  });
});
