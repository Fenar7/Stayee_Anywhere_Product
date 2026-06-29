/* eslint-disable */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "../lib/errors";
import { UserRole } from "@prisma/client";

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  warden: {
    findUnique: vi.fn(),
  },
  stay: {
    findFirst: vi.fn(),
  },
}));

vi.mock("../lib/db", () => ({
  prisma: mockPrisma,
}));

vi.mock("../lib/auth/server", () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

import { authorizePasswordReset, resetPasswordViaAdmin } from "../services/auth/password.service";
import { authenticateUser, fetchUserBySupabaseId, setUserPasswordSetAt } from "../services/auth/auth.service";
import { createAdminClient } from "../lib/auth/server";
import { proxy } from "../proxy";
import { createServerClient } from "@supabase/ssr";

describe("authorizePasswordReset", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should not throw when MAIN_ADMIN resets any user's password", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "target-123", supabaseAuthId: "sb-target", role: UserRole.TENANT });

    await expect(
      authorizePasswordReset("admin-123", UserRole.MAIN_ADMIN, "target-123")
    ).resolves.not.toThrow();
  });

  it("should throw NotFoundError when MAIN_ADMIN targets a non-existent user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      authorizePasswordReset("admin-123", UserRole.MAIN_ADMIN, "nonexistent-id")
    ).rejects.toThrow(NotFoundError);
  });

  it("should throw ForbiddenError when Warden targets a tenant from a different hostel (IDOR)", async () => {
    mockPrisma.warden.findUnique.mockResolvedValue({
      id: "warden-a",
      userId: "warden-user-a",
      hostelId: "hostel-A",
      hostel: { id: "hostel-A" },
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: "tenant-user-B",
      supabaseAuthId: "sb-tenant-B",
      role: UserRole.TENANT,
      tenant: { id: "tenant-B", stays: [] },
    });

    mockPrisma.stay.findFirst.mockResolvedValue(null);

    await expect(
      authorizePasswordReset("warden-user-a", UserRole.WARDEN, "tenant-user-B")
    ).rejects.toThrow(ForbiddenError);
  });

  it("should not throw when Warden resets a tenant from their own hostel", async () => {
    const hostelId = "hostel-A";

    mockPrisma.warden.findUnique.mockResolvedValue({
      id: "warden-a",
      userId: "warden-user-a",
      hostelId,
      hostel: { id: hostelId },
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: "tenant-user-A",
      supabaseAuthId: "sb-tenant-A",
      role: UserRole.TENANT,
      tenant: { id: "tenant-A" },
    });

    mockPrisma.stay.findFirst.mockResolvedValue({
      id: "stay-1",
      tenantId: "tenant-A",
      hostelId,
    });

    await expect(
      authorizePasswordReset("warden-user-a", UserRole.WARDEN, "tenant-user-A")
    ).resolves.not.toThrow();
  });

  it("should throw ForbiddenError when Warden tries to reset a non-tenant user's password", async () => {
    mockPrisma.warden.findUnique.mockResolvedValue({
      id: "warden-a",
      userId: "warden-user-a",
      hostelId: "hostel-A",
      hostel: { id: "hostel-A" },
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: "some-admin",
      supabaseAuthId: "sb-admin",
      role: UserRole.MAIN_ADMIN,
      tenant: null,
    });

    await expect(
      authorizePasswordReset("warden-user-a", UserRole.WARDEN, "some-admin")
    ).rejects.toThrow(ForbiddenError);
  });

  it("should throw ForbiddenError for a user with no role authorization", async () => {
    await expect(
      authorizePasswordReset("tenant-user", UserRole.TENANT, "someone-else")
    ).rejects.toThrow(ForbiddenError);
  });
});

describe("resetPasswordViaAdmin", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should call Supabase admin API to update password", async () => {
    const mockAdminClient = {
      auth: {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      },
    };
    (createAdminClient as any).mockReturnValue(mockAdminClient);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-123",
      supabaseAuthId: "sb-user-123",
      role: UserRole.TENANT,
    });

    await resetPasswordViaAdmin("user-123", "new-secure-password-123");

    expect(mockAdminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
      "sb-user-123",
      { password: "new-secure-password-123" }
    );
  });

  it("should throw NotFoundError if user not found in database", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      resetPasswordViaAdmin("nonexistent", "password123")
    ).rejects.toThrow(NotFoundError);
  });
});

describe("firstLoginRedirect", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return passwordSetAt=null for a first-time user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-123",
      supabaseAuthId: "sb-123",
      phone: "+1234567890",
      role: UserRole.TENANT,
      passwordSetAt: null,
    });

    const result = await authenticateUser({ identifier: "+1234567890", password: "ignored" });
    expect(result.user.passwordSetAt).toBeNull();
  });

  it("should return passwordSetAt set for a returning user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-123",
      supabaseAuthId: "sb-123",
      phone: "+1234567890",
      role: UserRole.WARDEN,
      passwordSetAt: new Date("2025-01-01"),
    });

    const result = await authenticateUser({ identifier: "+1234567890", password: "ignored" });
    expect(result.user.passwordSetAt).toBeInstanceOf(Date);
  });

  it("should throw UnauthorizedError when user is not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      authenticateUser({ identifier: "+9999999999", password: "somepassword" })
    ).rejects.toThrow(UnauthorizedError);
  });

  it("should return correct redirect URL for each role", async () => {
    const testCases = [
      { role: UserRole.MAIN_ADMIN, expected: "/admin" },
      { role: UserRole.WARDEN, expected: "/warden" },
      { role: UserRole.TENANT, expected: "/tenant" },
    ];

    for (const { role, expected } of testCases) {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-xyz",
        supabaseAuthId: "sb-xyz",
        phone: "+1111111111",
        role,
        passwordSetAt: new Date(),
      });

      const result = await authenticateUser({ identifier: "+1111111111", password: "ignored" });
      expect(result.redirectUrl).toBe(expected);
    }
  });
});

describe("fetchUserBySupabaseId", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return user with warden and tenant includes", async () => {
    const mockUser = {
      id: "user-1",
      supabaseAuthId: "sb-1",
      role: UserRole.WARDEN,
      warden: { id: "w-1", hostelId: "h-1" },
      tenant: null,
    };
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await fetchUserBySupabaseId("sb-1");
    expect(result).toEqual(mockUser);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { supabaseAuthId: "sb-1" },
      include: { warden: true, tenant: true },
    });
  });

  it("should throw UnauthorizedError when user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(fetchUserBySupabaseId("nonexistent")).rejects.toThrow(UnauthorizedError);
  });
});

describe("setUserPasswordSetAt", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should update passwordSetAt to current timestamp", async () => {
    mockPrisma.user.update.mockResolvedValue({ id: "user-1", passwordSetAt: new Date() });

    await setUserPasswordSetAt("user-1");

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordSetAt: expect.any(Date) },
    });
  });
});

describe("Next.js proxy", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it("should allow public routes like /login without checking session", async () => {
    const mockRequest = {
      nextUrl: { pathname: "/login" },
      url: "http://localhost:3000/login",
      cookies: { get: vi.fn(), getAll: vi.fn(), set: vi.fn() },
      headers: new Headers(),
    } as any;

    const res = await proxy(mockRequest);
    expect(res).toBeDefined();
  });

  it("should redirect to /login if there is no Supabase session for a protected route", async () => {
    const mockRequest = {
      nextUrl: { pathname: "/warden/dashboard" },
      url: "http://localhost:3000/warden/dashboard",
      cookies: { get: vi.fn(), getAll: vi.fn(), set: vi.fn() },
      headers: new Headers(),
    } as any;

    const mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
    };
    (createServerClient as any).mockReturnValue(mockSupabase);

    const res = await proxy(mockRequest);
    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toContain("/login");
  });

  it("should redirect to /set-password if the user has null passwordSetAt and attempts to access their dashboard", async () => {
    const mockRequest = {
      nextUrl: { pathname: "/warden/dashboard" },
      url: "http://localhost:3000/warden/dashboard",
      cookies: { get: vi.fn(), getAll: vi.fn(), set: vi.fn() },
      headers: new Headers(),
    } as any;

    const mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: "sb-uid-1" } } },
          error: null,
        }),
      },
    };
    (createServerClient as any).mockReturnValue(mockSupabase);

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        dbUser: { role: UserRole.WARDEN, passwordSetAt: null }
      })
    });

    const res = await proxy(mockRequest);
    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toContain("/set-password");
  });

  it("should allow access if user role matches and password is set", async () => {
    const mockRequest = {
      nextUrl: { pathname: "/warden/dashboard" },
      url: "http://localhost:3000/warden/dashboard",
      cookies: { get: vi.fn(), getAll: vi.fn(), set: vi.fn() },
      headers: new Headers(),
    } as any;

    const mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: "sb-uid-1" } } },
          error: null,
        }),
      },
    };
    (createServerClient as any).mockReturnValue(mockSupabase);

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        dbUser: { role: UserRole.WARDEN, passwordSetAt: new Date() }
      })
    });

    const res = await proxy(mockRequest);
    expect(res).toBeDefined();
    expect(res.status).not.toBe(307);
  });
});
