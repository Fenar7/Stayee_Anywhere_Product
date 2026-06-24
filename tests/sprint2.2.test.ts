/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OnboardingRequestStatus, StayStatus, UserRole } from "@prisma/client";

// ──────────────────────────────────────────────────────────────────────────────
// Mocks
// ──────────────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn((fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)),
  user: {
    findUnique: vi.fn(),
    create: vi.fn().mockResolvedValue({ id: "user-123" }),
  },
  tenant: {
    update: vi.fn().mockResolvedValue({ id: "tenant-123" }),
  },
  stay: {
    findFirst: vi.fn(),
  },
  onboardingRequest: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  document: {
    create: vi.fn(),
  },
}));

vi.mock("../lib/db", () => ({ prisma: mockPrisma }));

vi.mock("../lib/image", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/image")>();
  return {
    ...original,
    compressImage: vi.fn(async (buf: Buffer) => ({
      data: buf,
      ext: "jpg" as const,
      mimeType: "image/jpeg" as const,
    })),
  };
});

vi.mock("../lib/storage", () => ({
  uploadToStorage: vi.fn(async (buf: Buffer, path: string) => path),
  getSignedUrl: vi.fn(async (path: string) => `https://signed.url/${path}`),
}));

const mockCreateUser = vi.fn();
const mockDeleteUser = vi.fn();
const mockListUsers = vi.fn().mockResolvedValue({ data: { users: [] }, error: null });

vi.mock("../lib/auth/server", () => ({
  createAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        createUser: mockCreateUser,
        deleteUser: mockDeleteUser,
        listUsers: mockListUsers,
      },
    },
  })),
}));

// Mock Next.js headers/cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

// ──────────────────────────────────────────────────────────────────────────────
// Helpers & Test Subjects
// ──────────────────────────────────────────────────────────────────────────────
import { verifyAndGetFileType } from "../lib/image";
import { POST } from "../app/api/public/onboard-request/[id]/register/route";

function makeRegistrationForm(overrides: Record<string, any> = {}, isRaw = false) {
  const formData = new FormData();
  
  // Standard fields
  const fields = {
    password: "securepassword123",
    fullName: "John Doe",
    dateOfBirth: "2000-05-15",
    gender: "MALE",
    placeOfBirth: "Mumbai",
    permanentAddress: "123 Street, Pune",
    emergencyContactName: "Jane Doe",
    relationship: "Mother",
    emergencyContactNumber: "+919876543210",
    parentGuardianName: "Jack Doe",
    parentGuardianContact: "+919876543211",
    occupationType: "STUDENT",
    collegeName: "IIT Bombay",
    courseOrBranch: "Computer Science",
    purposeOfStay: "Studies",
    email: "john.doe@test.com",
    ...overrides,
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      formData.append(key, value);
    }
  }

  // Files
  if (!overrides.hasOwnProperty("photo")) {
    const photoBlob = new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])], { type: "image/jpeg" });
    formData.append("photo", photoBlob, "profile.jpg");
  } else if (overrides.photo !== null) {
    formData.append("photo", overrides.photo);
  }

  if (!overrides.hasOwnProperty("idDocument")) {
    const docBlob = new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])], { type: "image/jpeg" });
    formData.append("idDocument", docBlob, "id.jpg");
  } else if (overrides.idDocument !== null) {
    formData.append("idDocument", overrides.idDocument);
  }

  if (!overrides.hasOwnProperty("idDocumentType")) {
    formData.append("idDocumentType", "AADHAAR");
  } else if (overrides.idDocumentType !== null) {
    formData.append("idDocumentType", overrides.idDocumentType);
  }

  // Optional 2nd/3rd docs if provided in overrides
  if (overrides.idDocument2) {
    formData.append("idDocument2", overrides.idDocument2);
    formData.append("idDocumentType2", overrides.idDocumentType2 || "PAN");
  }

  return new Request("http://localhost:3000/api/public/onboard-request/req-123/register", {
    method: "POST",
    body: isRaw ? overrides.body : formData,
  });
}

describe("Sprint 2.2: Tenant Self-Registration Form, Photo & ID Upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateUser.mockResolvedValue({
      data: { user: { id: "supabase-auth-123" } },
      error: null,
    });
    mockDeleteUser.mockResolvedValue({ error: null });

    // Setup typical successful db check defaults
    mockPrisma.onboardingRequest.findUnique.mockResolvedValue({
      id: "req-123",
      phone: "+919999999999",
      bedId: "bed-123",
      hostelId: "hostel-123",
      status: OnboardingRequestStatus.PENDING,
    });

    mockPrisma.user.findUnique.mockResolvedValue(null);

    mockPrisma.stay.findFirst.mockResolvedValue({
      id: "stay-123",
      tenantId: "tenant-placeholder-123",
      tenant: {
        id: "tenant-placeholder-123",
        userId: null,
      },
    });

    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
  });

  // ────────────────────────────────────────────────────────
  // Magic Bytes Type Validation Check
  // ────────────────────────────────────────────────────────
  describe("Magic Bytes Content Inspection", () => {
    it("correctly identifies PDF files based on magic bytes", () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 header content");
      expect(verifyAndGetFileType(pdfBuffer)).toBe("pdf");
    });

    it("correctly identifies PNG images based on magic bytes", () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
      expect(verifyAndGetFileType(pngBuffer)).toBe("png");
    });

    it("correctly identifies JPEG images based on magic bytes", () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      expect(verifyAndGetFileType(jpegBuffer)).toBe("jpg");
    });

    it("returns null for arbitrary/invalid file byte signatures", () => {
      const exeBuffer = Buffer.from("MZ\x00\x03\x00\x00\x00\x04\x00\x00\x00\x00\x00");
      expect(verifyAndGetFileType(exeBuffer)).toBeNull();
    });
  });

  // ────────────────────────────────────────────────────────
  // Onboarding API Validation
  // ────────────────────────────────────────────────────────
  describe("Registration Request API Handlers", () => {
    it("should return 404 NOT_FOUND if onboarding request ID is non-existent", async () => {
      mockPrisma.onboardingRequest.findUnique.mockResolvedValue(null);

      const res = await POST(makeRegistrationForm() as any, {
        params: Promise.resolve({ id: "non-existent" }),
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("should return 409 CONFLICT if onboarding status is COMPLETED or EXPIRED", async () => {
      mockPrisma.onboardingRequest.findUnique.mockResolvedValue({
        id: "req-123",
        status: OnboardingRequestStatus.COMPLETED,
      });

      const res = await POST(makeRegistrationForm() as any, {
        params: Promise.resolve({ id: "req-123" }),
      });
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.code).toBe("CONFLICT");
    });

    it("should return 400 VALIDATION_ERROR if password length is below 8 characters", async () => {
      const res = await POST(makeRegistrationForm({ password: "short" }) as any, {
        params: Promise.resolve({ id: "req-123" }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 VALIDATION_ERROR if profile photo is missing", async () => {
      // Exclude photo field
      const res = await POST(makeRegistrationForm({ photo: null }) as any, {
        params: Promise.resolve({ id: "req-123" }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
      expect(data.error).toContain("Profile photo is required");
    });

    it("should return 400 VALIDATION_ERROR if ID document is missing (mandatory gate test)", async () => {
      const res = await POST(makeRegistrationForm({ idDocument: null }) as any, {
        params: Promise.resolve({ id: "req-123" }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
      expect(data.error).toContain("At least one ID document is required");
    });

    it("should reject a disguised file with invalid magic bytes (security file type check)", async () => {
      const badBlob = new Blob([Buffer.from("MZ executables signatures")], { type: "image/jpeg" });
      const res = await POST(makeRegistrationForm({ photo: badBlob }) as any, {
        params: Promise.resolve({ id: "req-123" }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
      expect(data.error).toContain("Profile photo must be a JPEG or PNG image");
    });

    it("completes self-registration successfully end-to-end and links entities properly", async () => {
      const res = await POST(makeRegistrationForm() as any, {
        params: Promise.resolve({ id: "req-123" }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify Auth User creation and Prisma updates
      expect(mockCreateUser).toHaveBeenCalledWith({
        phone: "+919999999999",
        email: "john.doe@test.com",
        password: "securepassword123",
        phone_confirm: true,
        email_confirm: true,
      });

      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.tenant.update).toHaveBeenCalled();
      expect(mockPrisma.document.create).toHaveBeenCalled();
      expect(mockPrisma.onboardingRequest.update).toHaveBeenCalledWith({
        where: { id: "req-123" },
        data: { status: OnboardingRequestStatus.COMPLETED },
      });
    });

    it("cleans up / deletes created Supabase Auth user on subsequent database transaction errors (auth saga safety)", async () => {
      // Make database fail during transaction
      mockPrisma.user.create.mockRejectedValue(new Error("Database write error"));

      const res = await POST(makeRegistrationForm() as any, {
        params: Promise.resolve({ id: "req-123" }),
      });

      expect(res.status).toBe(500);
      expect(mockDeleteUser).toHaveBeenCalledWith("supabase-auth-123");
    });
  });
});
