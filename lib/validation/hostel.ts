import { z } from "zod";
import { AccommodationType, SharingType, BedStatus } from "@prisma/client";

export const createHostelSchema = z.object({
  name: z.string().min(1, "Hostel name is required").max(100),
  address: z.string().min(1, "Address is required").max(500),
  accommodationType: z.nativeEnum(AccommodationType),
  locationId: z.string().uuid("Invalid location ID").optional(),
  wardenEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  wardenPhone: z.string().regex(/^\+?[0-9\s\-]{10,15}$/, "Invalid phone format").optional(),
  wardenPassword: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export const createLocationSchema = z.object({
  name: z.string().min(1, "Location name is required").max(100),
  city: z.string().min(1, "City is required").max(100),
});

export const createFloorSchema = z.object({
  hostelId: z.string().uuid(),
  name: z.string().min(1).max(50),
  sortOrder: z.coerce.number().int(),
});
export const updateFloorSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const createFlatSchema = z.object({
  floorId: z.string().uuid(),
  name: z.string().min(1).max(20),
});
export const updateFlatSchema = z.object({
  name: z.string().min(1).max(20).optional(),
});

export const createRoomSchema = z.object({
  flatId: z.string().uuid().optional().nullable(),
  floorId: z.string().uuid().optional().nullable(),
  roomNumber: z.string().min(1, "Room number is required").max(20),
  sharingType: z.nativeEnum(SharingType),
  isPrivate: z.boolean().optional().default(false),
}).refine(
  (data) => (!!data.flatId) !== (!!data.floorId),
  { message: "Exactly one of flatId or floorId must be provided" }
);

export const updateRoomSchema = z.object({
  roomNumber: z.string().min(1).max(20).optional(),
  sharingType: z.nativeEnum(SharingType).optional(),
});

export const updateBedSchema = z.object({
  label: z.string().min(1).max(20).optional(),
});
export const updateBedStatusSchema = z.object({
  status: z.nativeEnum(BedStatus),
});

export const assignWardenSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().regex(/^\+?[0-9\s\-]{10,15}$/, "Invalid phone format"),
  name: z.string().min(1, "Name is required").max(100),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export const updateWardenSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().regex(/^\+?[0-9\s\-]{10,15}$/, "Invalid phone format").optional(),
  name: z.string().min(1, "Name is required").max(100).optional(),
});
