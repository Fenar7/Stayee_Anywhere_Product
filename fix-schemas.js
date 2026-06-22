const fs = require('fs');

// 1. Fix lib/validation/hostel.ts
let hostelFile = fs.readFileSync('lib/validation/hostel.ts', 'utf8');
hostelFile = hostelFile.replace(
  `export const createHostelSchema = z.object({
  name: z.string().min(1, "Hostel name is required").max(100),
  address: z.string().min(1, "Address is required").max(500),
  accommodationType: z.nativeEnum(AccommodationType),
  locationId: z.string().uuid("Invalid location ID").optional(),
});`,
  `export const createHostelSchema = z.object({
  name: z.string().min(1, "Hostel name is required").max(100),
  address: z.string().min(1, "Address is required").max(500),
  accommodationType: z.nativeEnum(AccommodationType),
  locationId: z.string().uuid("Invalid location ID").optional(),
  wardenEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  wardenPhone: z.string().regex(/^\\+?[0-9\\s\\-]{10,15}$/, "Invalid phone format").optional(),
  wardenPassword: z.string().min(8, "Password must be at least 8 characters").optional(),
});`
);
hostelFile = hostelFile.replace(/flatNumber/g, 'name'); // fix flatNumber to name
fs.writeFileSync('lib/validation/hostel.ts', hostelFile);

// 2. Fix app/api/admin/wardens/[id]/reset-password/route.ts
let adminResetFile = fs.readFileSync('app/api/admin/wardens/[id]/reset-password/route.ts', 'utf8');
adminResetFile = adminResetFile.replace('data.password', 'data.newPassword');
fs.writeFileSync('app/api/admin/wardens/[id]/reset-password/route.ts', adminResetFile);

// 3. Fix lib/validation/auth.ts
let authFile = fs.readFileSync('lib/validation/auth.ts', 'utf8');
if (!authFile.includes('adminResetWardenPasswordSchema')) {
  authFile += `\nexport const adminResetWardenPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});\n`;
}
fs.writeFileSync('lib/validation/auth.ts', authFile);
adminResetFile = fs.readFileSync('app/api/admin/wardens/[id]/reset-password/route.ts', 'utf8');
adminResetFile = adminResetFile.replace('resetPasswordSchema', 'adminResetWardenPasswordSchema');
adminResetFile = adminResetFile.replace('resetPasswordSchema', 'adminResetWardenPasswordSchema');
adminResetFile = adminResetFile.replace('data.newPassword', 'data.password'); // revert back since we use adminResetWardenPasswordSchema
fs.writeFileSync('app/api/admin/wardens/[id]/reset-password/route.ts', adminResetFile);


// 4. Fix lib/validation/onboarding.ts
let onboardingFile = fs.readFileSync('lib/validation/onboarding.ts', 'utf8');
onboardingFile = onboardingFile.replace('z.record(z.any())', 'z.record(z.string(), z.any())');
fs.writeFileSync('lib/validation/onboarding.ts', onboardingFile);

