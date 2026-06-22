import { z } from "zod";

export const toggleSchema = z.object({
  forDate: z.string(),
  breakfast: z.boolean().optional(),
  lunch: z.boolean().optional(),
  dinner: z.boolean().optional(),
});
