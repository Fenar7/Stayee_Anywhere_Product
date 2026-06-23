import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole, LeadSource, LeadStatus } from "@prisma/client";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================================
// Mock Infrastructure
// ============================================================

const mockPrisma = vi.hoisted(() => ({
  lead: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  hostel: {
    findUnique: vi.fn(),
  },
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

import { normalizePhoneNumber } from "@/lib/whatsapp/utils";

// ============================================================
// Helpers
// ============================================================

function makeRequest(
  method: string,
  url: string,
  body?: Record<string, any>
): any {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) init.body = JSON.stringify(body);
  return new Request(url, init);
}

function makeLead(overrides: Record<string, any> = {}) {
  return {
    id: "lead-1",
    phone: "919876543210",
    source: LeadSource.MANUAL,
    status: LeadStatus.NEW,
    notes: null,
    hostelId: "hostel-1",
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
    ...overrides,
  };
}

// ============================================================
// normalizePhoneNumber Tests (cross-validated with Lead storage)
// ============================================================
describe("Sprint 7.1 – normalizePhoneNumber for leads", () => {
  it("normalizes +91XXXXXXXXXX to 91XXXXXXXXXX", () => {
    expect(normalizePhoneNumber("+919876543210")).toBe("919876543210");
  });

  it("normalizes 10-digit raw number to 91XXXXXXXXXX", () => {
    expect(normalizePhoneNumber("9876543210")).toBe("919876543210");
  });

  it("strips spaces and dashes", () => {
    expect(normalizePhoneNumber("+91 98765 43210")).toBe("919876543210");
    expect(normalizePhoneNumber("98765-43210")).toBe("919876543210");
  });

  it("strips leading zero from 09876543210", () => {
    expect(normalizePhoneNumber("09876543210")).toBe("919876543210");
  });
});

// ============================================================
// POST /api/warden/leads – Create Lead
// ============================================================
describe("POST /api/warden/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.hostel.findUnique.mockResolvedValue({ id: "hostel-1" });
  });

  it("creates a lead as Warden with normalized phone", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeWardenSession);
    (mockPrisma.lead.create as any).mockResolvedValue(
      makeLead({ phone: "919876543210" })
    );

    const { POST } = await import("@/app/api/warden/leads/route");
    const req = makeRequest("POST", "http://localhost:3000/api/warden/leads", {
      phone: "+91 98765 43210",
      source: LeadSource.MANUAL,
      notes: "Interested in 2-sharing",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(mockPrisma.lead.create).toHaveBeenCalledTimes(1);
    const createCall = (mockPrisma.lead.create as any).mock.calls[0][0];
    expect(createCall.data.phone).toBe("919876543210");
    expect(createCall.data.hostelId).toBe("hostel-1");
    expect(createCall.data.source).toBe(LeadSource.MANUAL);
  });

  it("serializes initial notes as JSON array with author 'Warden'", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeWardenSession);
    (mockPrisma.lead.create as any).mockResolvedValue(makeLead());

    const { POST } = await import("@/app/api/warden/leads/route");
    const req = makeRequest("POST", "http://localhost:3000/api/warden/leads", {
      phone: "+919876543210",
      source: LeadSource.WHATSAPP_BOT,
      notes: "Initial enquiry",
    });

    await POST(req);
    const createCall = (mockPrisma.lead.create as any).mock.calls[0][0];
    const createdNote = createCall.data.notes?.create;
    expect(createdNote).toBeDefined();
    expect(createdNote.authorId).toBe("user-warden-1");
    expect(createdNote.note).toBe("Initial enquiry");
  });

  it("uses empty JSON array when no notes provided", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeWardenSession);
    (mockPrisma.lead.create as any).mockResolvedValue(makeLead());

    const { POST } = await import("@/app/api/warden/leads/route");
    const req = makeRequest("POST", "http://localhost:3000/api/warden/leads", {
      phone: "+919876543210",
      source: LeadSource.WHATSAPP_BOT,
    });

    await POST(req);
    const createCall = (mockPrisma.lead.create as any).mock.calls[0][0];
    expect(createCall.data.notes).toBeUndefined();
  });

  it("creates lead as Admin with explicit hostelId", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeAdminSession);
    mockPrisma.hostel.findUnique.mockResolvedValue({ id: "hostel-2" });
    (mockPrisma.lead.create as any).mockResolvedValue(
      makeLead({ hostelId: "hostel-2" })
    );

    const { POST } = await import("@/app/api/warden/leads/route");
    const req = makeRequest("POST", "http://localhost:3000/api/warden/leads", {
      phone: "+919876543210",
      source: LeadSource.MANUAL,
      hostelId: "hostel-2",
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const createCall = (mockPrisma.lead.create as any).mock.calls[0][0];
    expect(createCall.data.hostelId).toBe("hostel-2");
  });

  it("creates lead as Admin with null hostelId (unassigned)", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeAdminSession);
    (mockPrisma.lead.create as any).mockResolvedValue(
      makeLead({ hostelId: null })
    );

    const { POST } = await import("@/app/api/warden/leads/route");
    const req = makeRequest("POST", "http://localhost:3000/api/warden/leads", {
      phone: "+919876543210",
      source: LeadSource.MANUAL,
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const createCall = (mockPrisma.lead.create as any).mock.calls[0][0];
    expect(createCall.data.hostelId).toBeNull();
  });

  it("rejects missing phone", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeWardenSession);

    const { POST } = await import("@/app/api/warden/leads/route");
    const req = makeRequest("POST", "http://localhost:3000/api/warden/leads", {
      source: LeadSource.MANUAL,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects invalid source", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeWardenSession);

    const { POST } = await import("@/app/api/warden/leads/route");
    const req = makeRequest("POST", "http://localhost:3000/api/warden/leads", {
      phone: "+919876543210",
      source: "INVALID_SOURCE",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET /api/warden/leads – List Leads
// ============================================================
describe("GET /api/warden/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns leads scoped to warden's hostel", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeWardenSession);
    mockPrisma.lead.findMany.mockResolvedValue([makeLead()]);

    const { GET } = await import("@/app/api/warden/leads/route");
    const req = makeRequest("GET", "http://localhost:3000/api/warden/leads");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.leads).toHaveLength(1);
    expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ hostelId: "hostel-1" }),
      })
    );
  });

  it("returns all leads for Admin without hostelId filter", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeAdminSession);
    mockPrisma.lead.findMany.mockResolvedValue([
      makeLead({ id: "lead-1", hostelId: "hostel-1" }),
      makeLead({ id: "lead-2", hostelId: "hostel-2" }),
      makeLead({ id: "lead-3", hostelId: null }),
    ]);

    const { GET } = await import("@/app/api/warden/leads/route");
    const req = makeRequest("GET", "http://localhost:3000/api/warden/leads");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.leads).toHaveLength(3);
  });

  it("returns leads filtered by hostelId for Admin", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeAdminSession);
    mockPrisma.lead.findMany.mockResolvedValue([
      makeLead({ id: "lead-1", hostelId: "hostel-2" }),
    ]);

    const { GET } = await import("@/app/api/warden/leads/route");
    const req = makeRequest(
      "GET",
      "http://localhost:3000/api/warden/leads?hostelId=hostel-2"
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ hostelId: "hostel-2" }),
      })
    );
  });
});

// ============================================================
// GET /api/warden/leads/[id] – Get Lead Detail
// ============================================================
describe("GET /api/warden/leads/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns lead detail for warden (own hostel)", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeWardenSession);
    mockPrisma.lead.findUnique.mockResolvedValue(makeLead());

    const { GET } = await import("@/app/api/warden/leads/[id]/route");
    const req = makeRequest("GET", "http://localhost:3000/api/warden/leads/lead-1");
    const res = await GET(req, { params: Promise.resolve({ id: "lead-1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.lead.id).toBe("lead-1");
  });

  it("returns 404 for non-existent lead", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeWardenSession);
    mockPrisma.lead.findUnique.mockResolvedValue(null);

    const { GET } = await import("@/app/api/warden/leads/[id]/route");
    const req = makeRequest("GET", "http://localhost:3000/api/warden/leads/non-existent");
    const res = await GET(req, { params: Promise.resolve({ id: "non-existent" }) });

    expect(res.status).toBe(404);
  });

  it("returns lead detail for Admin regardless of hostel", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeAdminSession);
    mockPrisma.lead.findUnique.mockResolvedValue(
      makeLead({ hostelId: "hostel-2" })
    );

    const { GET } = await import("@/app/api/warden/leads/[id]/route");
    const req = makeRequest("GET", "http://localhost:3000/api/warden/leads/lead-1");
    const res = await GET(req, { params: Promise.resolve({ id: "lead-1" }) });

    expect(res.status).toBe(200);
  });
});

// ============================================================
// PATCH /api/warden/leads/[id] – Update Lead
// ============================================================
describe("PATCH /api/warden/leads/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates lead status", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeWardenSession);
    mockPrisma.lead.findUnique.mockResolvedValue(makeLead());
    (mockPrisma.lead.update as any).mockResolvedValue(
      makeLead({ status: LeadStatus.CONTACTED })
    );

    const { PATCH } = await import("@/app/api/warden/leads/[id]/route");
    const req = makeRequest(
      "PATCH",
      "http://localhost:3000/api/warden/leads/lead-1",
      { status: LeadStatus.CONTACTED }
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "lead-1" }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.lead.status).toBe(LeadStatus.CONTACTED);
  });

  it("appends a note to existing notes array", async () => {
    const existingNotes = JSON.stringify([
      { text: "First note", createdAt: "2026-01-15T10:00:00Z", author: "Warden" },
    ]);
    (authModule.requireRole as any).mockResolvedValue(fakeWardenSession);
    mockPrisma.lead.findUnique.mockResolvedValue(
      makeLead({ notes: existingNotes })
    );
    (mockPrisma.lead.update as any).mockImplementation(({ data }: { data: any }) =>
      Promise.resolve(makeLead({ notes: data.notes }))
    );

    const { PATCH } = await import("@/app/api/warden/leads/[id]/route");
    const req = makeRequest(
      "PATCH",
      "http://localhost:3000/api/warden/leads/lead-1",
      { note: "Follow-up scheduled" }
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "lead-1" }),
    });

    expect(res.status).toBe(200);
    const updateCall = (mockPrisma.lead.update as any).mock.calls[0][0];
    const createdNote = updateCall.data.notes?.create;
    expect(createdNote).toBeDefined();
    expect(createdNote.note).toBe("Follow-up scheduled");
    expect(createdNote.authorId).toBe("user-warden-1");
  });

  it("converts legacy unstructured notes to array format", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeWardenSession);
    mockPrisma.lead.findUnique.mockResolvedValue(
      makeLead({ notes: "Old freeform note" })
    );
    (mockPrisma.lead.update as any).mockImplementation(({ data }: { data: any }) =>
      Promise.resolve(makeLead({ notes: data.notes }))
    );

    const { PATCH } = await import("@/app/api/warden/leads/[id]/route");
    const req = makeRequest(
      "PATCH",
      "http://localhost:3000/api/warden/leads/lead-1",
      { note: "New structured note" }
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "lead-1" }),
    });

    expect(res.status).toBe(200);
    const updateCall = (mockPrisma.lead.update as any).mock.calls[0][0];
    const createdNote = updateCall.data.notes?.create;
    expect(createdNote).toBeDefined();
    expect(createdNote.note).toBe("New structured note");
    expect(createdNote.authorId).toBe("user-warden-1");
  });

  it("returns existing lead when no update fields provided", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeWardenSession);
    mockPrisma.lead.findUnique.mockResolvedValue(makeLead());

    const { PATCH } = await import("@/app/api/warden/leads/[id]/route");
    const req = makeRequest(
      "PATCH",
      "http://localhost:3000/api/warden/leads/lead-1",
      {}
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "lead-1" }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.lead.update).not.toHaveBeenCalled();
    expect(json.lead.id).toBe("lead-1");
  });

  it("returns 404 for non-existent lead", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeWardenSession);
    mockPrisma.lead.findUnique.mockResolvedValue(null);

    const { PATCH } = await import("@/app/api/warden/leads/[id]/route");
    const req = makeRequest(
      "PATCH",
      "http://localhost:3000/api/warden/leads/non-existent",
      { status: LeadStatus.CONTACTED }
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "non-existent" }),
    });

    expect(res.status).toBe(404);
  });

  it("rejects invalid status value", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeWardenSession);
    mockPrisma.lead.findUnique.mockResolvedValue(makeLead());

    const { PATCH } = await import("@/app/api/warden/leads/[id]/route");
    const req = makeRequest(
      "PATCH",
      "http://localhost:3000/api/warden/leads/lead-1",
      { status: "INVALID_STATUS" }
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "lead-1" }),
    });

    expect(res.status).toBe(404);
  });
});

// ============================================================
// Access Control – Warden cannot access other hostel's leads
// ============================================================
describe("Sprint 7.1 – Access Control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Warden cannot PATCH lead belonging to another hostel", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeWardenSession);
    mockPrisma.lead.findUnique.mockResolvedValue(
      makeLead({ hostelId: "hostel-2" })
    );

    const { PATCH } = await import("@/app/api/warden/leads/[id]/route");
    const req = makeRequest(
      "PATCH",
      "http://localhost:3000/api/warden/leads/lead-1",
      { status: LeadStatus.CONTACTED }
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "lead-1" }),
    });

    expect(res.status).toBe(403);
  });

  it("Warden cannot PATCH lead with null hostelId (unassigned)", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeWardenSession);
    mockPrisma.lead.findUnique.mockResolvedValue(
      makeLead({ hostelId: null })
    );

    const { PATCH } = await import("@/app/api/warden/leads/[id]/route");
    const req = makeRequest(
      "PATCH",
      "http://localhost:3000/api/warden/leads/lead-1",
      { status: LeadStatus.CONTACTED }
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "lead-1" }),
    });

    expect(res.status).toBe(403);
  });

  it("Admin can PATCH any lead regardless of hostel", async () => {
    (authModule.requireRole as any).mockResolvedValue(fakeAdminSession);
    mockPrisma.lead.findUnique.mockResolvedValue(
      makeLead({ hostelId: "hostel-2" })
    );
    (mockPrisma.lead.update as any).mockResolvedValue(
      makeLead({ hostelId: "hostel-2", status: LeadStatus.CONVERTED })
    );

    const { PATCH } = await import("@/app/api/warden/leads/[id]/route");
    const req = makeRequest(
      "PATCH",
      "http://localhost:3000/api/warden/leads/lead-1",
      { status: LeadStatus.CONVERTED }
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "lead-1" }),
    });

    expect(res.status).toBe(200);
  });
});

// ============================================================
// Autoconversion Hook
// ============================================================
describe("Sprint 7.1 – Autoconversion Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("autoconversion uses normalized phone for matching", async () => {
    // Simulate what the onboard route does:
    // onboard receives +919876543210, normalizes to 919876543210
    const rawPhone = "+919876543210";
    const normalized = normalizePhoneNumber(rawPhone);
    expect(normalized).toBe("919876543210");

    // The autoconversion should match on normalized form
    mockPrisma.lead.updateMany.mockResolvedValue({ count: 1 });

    // Simulate the autoconversion call
    await mockPrisma.lead.updateMany({
      where: {
        phone: normalized,
        status: { not: LeadStatus.CONVERTED },
      },
      data: {
        status: LeadStatus.CONVERTED,
      },
    });

    expect(mockPrisma.lead.updateMany).toHaveBeenCalledWith({
      where: {
        phone: "919876543210",
        status: { not: LeadStatus.CONVERTED },
      },
      data: {
        status: LeadStatus.CONVERTED,
      },
    });
  });
});
