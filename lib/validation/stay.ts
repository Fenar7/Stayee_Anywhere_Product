import { z } from "zod";
import { PaymentMode } from "@prisma/client";

export const extendSchema = z.object({
  newEndDate: z.string().transform((val) => new Date(val)),
  additionalRent: z.number().nonnegative(),
  additionalFoodCharges: z.number().nonnegative(),
  paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.UPI),
});

export const earlyCheckoutSchema = z.object({
  checkoutDate: z.string().transform((val) => new Date(val)),
  refundAmount: z.number().nonnegative(),
  notes: z.string().optional(),
});
