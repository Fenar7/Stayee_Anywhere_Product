import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().optional(),
});

export const setPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const resetPasswordSchema = z.object({
  targetUserId: z.string().uuid(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const adminResetWardenPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});
