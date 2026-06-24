import { z } from "zod";
import { PaymentMode } from "@prisma/client";

export const extendSchema = z.object({
  durationType: z.enum(["MONTHLY", "WEEKLY", "CUSTOM"]),
  customDays: z.number().int().positive().optional(),
  paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.UPI),
  discountAddedPaise: z.number().nonnegative().default(0),
});

export const earlyCheckoutSchema = z.object({
  checkoutDate: z.string().transform((val) => new Date(val)),
  refundAmountPaise: z.number().nonnegative(),
  notes: z.string().optional(),
});
