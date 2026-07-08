import { z } from "zod";
import { DurationType, FoodPlan } from "@prisma/client";

export const onboardSchema = z.object({
  phone: z
    .string()
    .regex(/^\+91[0-9]{10}$/, "Phone must be in format +91XXXXXXXXXX"),
  bedId: z.string().uuid("Invalid bed ID format"),
  hostelId: z.string().uuid("Invalid hostel ID").optional(),
  joiningDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
  durationType: z.nativeEnum(DurationType),
  foodPlan: z.nativeEnum(FoodPlan),
  isNewAdmission: z.boolean(),
  admissionFee: z.number().nonnegative(),
  monthlyRent: z.number().nonnegative(),
  securityDeposit: z.number().nonnegative(),
  foodCharges: z.number().nonnegative(),
  discount: z.number().nonnegative(),
});

export const verifySchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID format"),
});

export const progressSchema = z.object({
  step: z.coerce.number().int().min(0).max(4),
  data: z.record(z.string(), z.unknown()),
});

export const validateSchema = z.object({
  phone: z.string().regex(/^\+?[0-9\s\-]{10,15}$/, "Invalid phone format"),
  tempPassword: z.string().min(1, "Password is required"),
});
