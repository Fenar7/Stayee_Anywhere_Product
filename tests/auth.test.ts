/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireRole, requireHostelAccess } from "../lib/auth";
import { prisma } from "../lib/db";
import { createClient } from "../lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "../lib/errors";
import { UserRole } from "@prisma/client";

// Mock the dependencies
vi.mock("../lib/auth/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("../lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    stay: {
      findFirst: vi.fn(),
    },
  },
}));

describe("requireRole", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should throw UnauthorizedError if user is not logged in to Supabase", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("No session") }),
      },
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    await expect(requireRole([UserRole.MAIN_ADMIN])).rejects.toThrow(UnauthorizedError);
  });

  it("should throw UnauthorizedError if user is not found in database", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "sb-uid-123" } }, error: null }),
      },
    };
    (createClient as any).mockResolvedValue(mockSupabase);
    (prisma.user.findUnique as any).mockResolvedValue(null);

    await expect(requireRole([UserRole.MAIN_ADMIN])).rejects.toThrow(UnauthorizedError);
  });

  it("should throw ForbiddenError if user role is not allowed", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "sb-uid-123" } }, error: null }),
      },
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-123",
      supabaseAuthId: "sb-uid-123",
      role: UserRole.WARDEN,
      warden: null,
      tenant: null,
    });

    await expect(requireRole([UserRole.MAIN_ADMIN])).rejects.toThrow(ForbiddenError);
  });

  it("should return user session if user has allowed role", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "sb-uid-123" } }, error: null }),
      },
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const mockDbUser = {
      id: "user-123",
      supabaseAuthId: "sb-uid-123",
      role: UserRole.WARDEN,
      warden: { id: "warden-123", userId: "user-123", hostelId: "hostel-abc" },
      tenant: null,
    };
    (prisma.user.findUnique as any).mockResolvedValue(mockDbUser);

    const session = await requireRole([UserRole.WARDEN]);
    expect(session.user).toEqual(mockDbUser);
  });
});

describe("requireHostelAccess", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should allow Main Admin to bypass hostel scoping checks", async () => {
    const session = {
      user: {
        id: "admin-123",
        supabaseAuthId: "sb-admin-123",
        role: UserRole.MAIN_ADMIN,
        warden: null,
        tenant: null,
        phone: "1234567890",
        email: "admin@nexthome.com",
        passwordSetAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    await expect(requireHostelAccess(session as any, "hostel-any")).resolves.not.toThrow();
  });

  it("should throw ForbiddenError if Warden tries to access a different hostel", async () => {
    const session = {
      user: {
        id: "warden-user-123",
        role: UserRole.WARDEN,
        warden: { id: "warden-123", hostelId: "hostel-authorized" },
        tenant: null,
      },
    };

    await expect(requireHostelAccess(session as any, "hostel-unauthorized")).rejects.toThrow(ForbiddenError);
  });

  it("should allow Warden to access their authorized hostel", async () => {
    const session = {
      user: {
        id: "warden-user-123",
        role: UserRole.WARDEN,
        warden: { id: "warden-123", hostelId: "hostel-authorized" },
        tenant: null,
      },
    };

    await expect(requireHostelAccess(session as any, "hostel-authorized")).resolves.not.toThrow();
  });
});
