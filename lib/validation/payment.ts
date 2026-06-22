import { z } from "zod";
import { PaymentMode } from "@prisma/client";

export const paymentConfigSchema = z.object({
  onboardingAmount: z.coerce.number().int().positive(),
});

export const recordPaymentSchema = z.object({
  amountPaid: z.preprocess((val) => Number(val), z.number().positive("Amount paid must be positive")),
  paymentMode: z.nativeEnum(PaymentMode),
  transactionRefNo: z.string().nullable().optional(),
  receivedBy: z.string().nullable().optional(),
});
