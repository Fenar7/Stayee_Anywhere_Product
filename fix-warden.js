const fs = require('fs');

// 1. Fix lib/validation/hostel.ts
let hostelFile = fs.readFileSync('lib/validation/hostel.ts', 'utf8');
hostelFile = hostelFile.replace(
  `export const createHostelSchema = z.object({
  name: z.string().min(1, "Hostel name is required").max(100),
  address: z.string().min(1, "Address is required").max(500),
  accommodationType: z.nativeEnum(AccommodationType),
  locationId: z.string().uuid("Invalid location ID").optional(),
  wardenEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  wardenPhone: z.string().regex(/^\\+?[0-9\\s\\-]{10,15}$/, "Invalid phone format").optional(),
  wardenPassword: z.string().min(8, "Password must be at least 8 characters").optional(),
});`,
  `export const createHostelSchema = z.object({
  name: z.string().min(1, "Hostel name is required").max(100),
  address: z.string().min(1, "Address is required").max(500),
  accommodationType: z.nativeEnum(AccommodationType),
  locationId: z.string().uuid("Invalid location ID").optional(),
  wardenEmail: z.string().email("Invalid email for warden"),
  wardenPhone: z.string().regex(/^\\+?[0-9\\s\\-]{10,15}$/, "Invalid phone format"),
  wardenPassword: z.string().min(8, "Password must be at least 8 characters"),
});`
);
fs.writeFileSync('lib/validation/hostel.ts', hostelFile);

// 2. Fix services/hostel/hostel.service.ts
let serviceFile = fs.readFileSync('services/hostel/hostel.service.ts', 'utf8');
serviceFile = serviceFile.replace(
  `export interface CreateHostelInput {
  name: string;
  address: string;
  accommodationType: AccommodationType;
  wardenEmail?: string;
  wardenPhone?: string;
  wardenPassword?: string;
  locationId?: string | null;
}`,
  `export interface CreateHostelInput {
  name: string;
  address: string;
  accommodationType: AccommodationType;
  wardenEmail: string;
  wardenPhone: string;
  wardenPassword: string;
  locationId?: string | null;
}`
);
fs.writeFileSync('services/hostel/hostel.service.ts', serviceFile);

