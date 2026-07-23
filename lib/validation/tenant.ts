import { z } from "zod";
import { OccupationType } from "@prisma/client";

export const registrationSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Full name is required"),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((val) => !isNaN(Date.parse(val)), "Please enter a valid date of birth (YYYY-MM-DD)")
    .transform((val) => new Date(val)),
  gender: z.string().min(1, "Gender selection is required"),
  placeOfBirth: z.string().min(1, "Place of birth is required"),
  permanentAddress: z.string().min(1, "Permanent address is required"),
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  emergencyContactNumber: z
    .string()
    .regex(/^\+91[0-9]{10}$/, "Emergency contact phone must be +91 followed by 10 digits"),
  parentGuardianName: z.string().min(1, "Parent/guardian name is required"),
  parentGuardianContact: z
    .string()
    .regex(/^\+91[0-9]{10}$/, "Parent/guardian contact must be +91 followed by 10 digits"),
  occupationType: z.nativeEnum(OccupationType, {
    message: "Please select a valid occupation type (Student or Working Professional)",
  }),
  collegeName: z.string().nullable().optional(),
  courseOrBranch: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  designation: z.string().nullable().optional(),
  purposeOfStay: z.string().min(1, "Purpose of stay is required"),
  email: z
    .string()
    .email("Invalid email format")
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val)),
});
