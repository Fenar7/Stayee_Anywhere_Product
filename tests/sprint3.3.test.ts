import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addDays,
  diffInDays,
  getEndOfDayIST,
  getStartOfDayIST,
  toISTMidnightISO,
  isFutureDateIST,
  calculateMonthlyNextDueDate,
} from "@/lib/dates";
import { rupeesToPaise, paiseToRupees, formatRupees } from "@/lib/money";

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn((fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)),
  stay: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  bed: { update: vi.fn() },
  stayStatusEvent: { create: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

describe("lib/dates", () => {
  describe("addDays", () => {
    it("adds days correctly across month boundaries", () => {
      const jan31 = new Date("2025-01-31T00:00:00.000Z");
      const result = addDays(jan31, 1);
      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(1); // February
    });

    it("adds zero days and returns same date", () => {
      const date = new Date("2025-06-15T10:30:00.000Z");
      const result = addDays(date, 0);
      expect(result.getTime()).toBe(date.getTime());
    });

    it("adds 30 days for monthly stay calculations", () => {
      const jun1 = new Date("2025-06-01T00:00:00.000Z");
      const result = addDays(jun1, 30);
      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(6); // July
    });

    it("adds 360 days (12 months * 30) correctly", () => {
      const jan1 = new Date("2025-01-01T00:00:00.000Z");
      const result = addDays(jan1, 360);
      expect(result.getDate()).toBe(27);
      expect(result.getMonth()).toBe(11); // December (Jan 1 + 360 = Dec 27)
    });

    it("handles leap year correctly", () => {
      const feb28 = new Date("2024-02-28T00:00:00.000Z");
      const result = addDays(feb28, 1);
      expect(result.getDate()).toBe(29);
      expect(result.getMonth()).toBe(1); // February (leap year)
    });
  });

  describe("diffInDays", () => {
    it("calculates difference between two dates", () => {
      const start = new Date("2025-06-01T00:00:00.000Z");
      const end = new Date("2025-06-15T00:00:00.000Z");
      expect(diffInDays(start, end)).toBe(14);
    });

    it("returns 0 for same date", () => {
      const date = new Date("2025-06-15T00:00:00.000Z");
      expect(diffInDays(date, date)).toBe(0);
    });

    it("returns 0 when end is before start", () => {
      const start = new Date("2025-06-20T00:00:00.000Z");
      const end = new Date("2025-06-10T00:00:00.000Z");
      expect(diffInDays(start, end)).toBe(0);
    });

    it("rounds to nearest whole day", () => {
      const start = new Date("2025-06-01T00:00:00.000Z");
      const end = new Date("2025-06-02T12:00:00.000Z");
      // 36 hours = 1.5 days, rounds to 2
      expect(diffInDays(start, end)).toBe(2);
    });
  });

  describe("getEndOfDayIST", () => {
    it("returns 23:59:59.999 in IST timezone", () => {
      const result = getEndOfDayIST(new Date("2025-06-21T10:00:00Z"));
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });
  });

  describe("toISTMidnightISO", () => {
    it("formats date as ISO midnight IST string", () => {
      const date = new Date("2025-06-15T14:30:00Z");
      const result = toISTMidnightISO(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
    });
  });

  describe("isFutureDateIST", () => {
    it("returns true for a date far in the future", () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);
      expect(isFutureDateIST(future)).toBe(true);
    });

    it("returns false for a date far in the past", () => {
      const past = new Date();
      past.setDate(past.getDate() - 10);
      expect(isFutureDateIST(past)).toBe(false);
    });
  });

  describe("calculateMonthlyNextDueDate", () => {
    it("adds exactly 30 days per month paid", () => {
      const jun1 = new Date("2025-06-01T00:00:00.000Z");
      const result = calculateMonthlyNextDueDate(jun1, 1);
      expect(result.toISOString().split("T")[0]).toBe("2025-07-01");
    });

    it("adds exactly 60 days for 2 months", () => {
      const jun1 = new Date("2025-06-01T00:00:00.000Z");
      const result = calculateMonthlyNextDueDate(jun1, 2);
      expect(result.toISOString().split("T")[0]).toBe("2025-07-31");
    });

    it("does not use setMonth (PRD compliance)", () => {
      const jan31 = new Date("2025-01-31T00:00:00.000Z");
      const result = calculateMonthlyNextDueDate(jan31, 1);
      // setMonth would give Mar 3 (Feb overflow), but +30 days gives Mar 2
      expect(result.getDate()).toBe(2);
      expect(result.getMonth()).toBe(2); // March
    });
  });
});

describe("lib/money", () => {
  describe("rupeesToPaise", () => {
    it("converts 5000 rupees to 500000 paise", () => {
      expect(rupeesToPaise(5000)).toBe(500000);
    });

    it("rounds fractional paise", () => {
      expect(rupeesToPaise(99.999)).toBe(10000);
    });

    it("handles zero", () => {
      expect(rupeesToPaise(0)).toBe(0);
    });
  });

  describe("paiseToRupees", () => {
    it("converts 500000 paise to 5000 rupees", () => {
      expect(paiseToRupees(500000)).toBe(5000);
    });

    it("handles zero", () => {
      expect(paiseToRupees(0)).toBe(0);
    });
  });

  describe("formatRupees", () => {
    it("formats with Indian locale", () => {
      const result = formatRupees(150000);
      expect(result).toBe("₹ 1,500");
    });

    it("formats zero", () => {
      expect(formatRupees(0)).toBe("₹ 0");
    });
  });
});

describe("Natural Checkout Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    mockPrisma.stay.update.mockResolvedValue({});
    mockPrisma.bed.update.mockResolvedValue({});
    mockPrisma.stayStatusEvent.create.mockResolvedValue({});
  });

  it("returns empty result when no expired stays exist", async () => {
    mockPrisma.stay.findMany.mockResolvedValue([]);
    const { processNaturalCheckouts } = await import("@/services/stays/natural-checkout");
    const result = await processNaturalCheckouts();
    expect(result.checkedOutCount).toBe(0);
    expect(result.stayIds).toEqual([]);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("transitions expired ACTIVE stays to CHECKED_OUT and frees beds", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    mockPrisma.stay.findMany.mockResolvedValue([
      { id: "stay-expired-1", bedId: "bed-1", endDate: pastDate, status: "ACTIVE" },
    ]);

    const { processNaturalCheckouts } = await import("@/services/stays/natural-checkout");
    const result = await processNaturalCheckouts();

    expect(result.checkedOutCount).toBe(1);
    expect(result.stayIds).toEqual(["stay-expired-1"]);
    expect(mockPrisma.stay.update).toHaveBeenCalledWith({
      where: { id: "stay-expired-1" },
      data: { status: "CHECKED_OUT" },
    });
    expect(mockPrisma.bed.update).toHaveBeenCalledWith({
      where: { id: "bed-1" },
      data: { status: "AVAILABLE" },
    });
    expect(mockPrisma.stayStatusEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        stayId: "stay-expired-1",
        fromStatus: "ACTIVE",
        toStatus: "CHECKED_OUT",
        changedByUserId: "system",
      }),
    });
  });

  it("processes multiple expired stays in sequence", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);

    mockPrisma.stay.findMany.mockResolvedValue([
      { id: "stay-1", bedId: "bed-1", endDate: pastDate, status: "ACTIVE" },
      { id: "stay-2", bedId: "bed-2", endDate: pastDate, status: "EXTENDED" },
    ]);

    const { processNaturalCheckouts } = await import("@/services/stays/natural-checkout");
    const result = await processNaturalCheckouts();

    expect(result.checkedOutCount).toBe(2);
    expect(result.stayIds).toEqual(["stay-1", "stay-2"]);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
  });
});
