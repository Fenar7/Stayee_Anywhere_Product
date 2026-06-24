/* eslint-disable */
const fs = require('fs');

const replacements = [
  { file: 'app/(auth)/login/page.tsx', schemaName: 'loginSchema', importPath: '@/lib/validation/auth' },
  { file: 'app/admin/hostels/new/page.tsx', schemaName: 'createHostelSchema', importPath: '@/lib/validation/hostel' },
  { file: 'app/api/admin/beds/[id]/route.ts', schemaName: 'updateBedSchema', importPath: '@/lib/validation/hostel' },
  { file: 'app/api/admin/flats/[id]/route.ts', schemaName: 'updateFlatSchema', importPath: '@/lib/validation/hostel' },
  { file: 'app/api/admin/flats/route.ts', schemaName: 'createFlatSchema', importPath: '@/lib/validation/hostel' },
  { file: 'app/api/admin/floors/[id]/route.ts', schemaName: 'updateFloorSchema', importPath: '@/lib/validation/hostel' },
  { file: 'app/api/admin/floors/route.ts', schemaName: 'createFloorSchema', importPath: '@/lib/validation/hostel' },
  { file: 'app/api/admin/hostels/[id]/payment-config/route.ts', schemaName: 'paymentConfigSchema', searchName: 'putSchema', importPath: '@/lib/validation/payment' },
  { file: 'app/api/admin/hostels/[id]/warden/route.ts', schemaName: 'assignWardenSchema', importPath: '@/lib/validation/hostel' },
  { file: 'app/api/admin/hostels/route.ts', schemaName: 'createHostelSchema', importPath: '@/lib/validation/hostel' },
  { file: 'app/api/admin/locations/route.ts', schemaName: 'createLocationSchema', importPath: '@/lib/validation/hostel' },
  { file: 'app/api/admin/rooms/[id]/route.ts', schemaName: 'updateRoomSchema', importPath: '@/lib/validation/hostel' },
  { file: 'app/api/admin/rooms/route.ts', schemaName: 'createRoomSchema', importPath: '@/lib/validation/hostel' },
  { file: 'app/api/admin/wardens/[id]/reset-password/route.ts', schemaName: 'resetPasswordSchema', importPath: '@/lib/validation/auth' },
  { file: 'app/api/admin/wardens/[id]/route.ts', schemaName: 'updateWardenSchema', importPath: '@/lib/validation/hostel' },
  { file: 'app/api/auth/login/route.ts', schemaName: 'loginSchema', importPath: '@/lib/validation/auth' },
  { file: 'app/api/auth/reset-password/route.ts', schemaName: 'resetPasswordSchema', importPath: '@/lib/validation/auth' },
  { file: 'app/api/auth/set-password/route.ts', schemaName: 'setPasswordSchema', importPath: '@/lib/validation/auth' },
  { file: 'app/api/public/onboard-request/[id]/register/route.ts', schemaName: 'registrationSchema', importPath: '@/lib/validation/tenant' },
  { file: 'app/api/public/onboarding/[id]/progress/route.ts', schemaName: 'progressSchema', importPath: '@/lib/validation/onboarding' },
  { file: 'app/api/public/onboarding/[id]/validate/route.ts', schemaName: 'validateSchema', importPath: '@/lib/validation/onboarding' },
  { file: 'app/api/tenant/food-orders/route.ts', schemaName: 'toggleSchema', importPath: '@/lib/validation/food' },
  { file: 'app/api/warden/beds/[id]/status/route.ts', schemaName: 'updateBedStatusSchema', importPath: '@/lib/validation/hostel' },
  { file: 'app/api/warden/onboard/route.ts', schemaName: 'onboardSchema', importPath: '@/lib/validation/onboarding' },
  { file: 'app/api/warden/onboards/[id]/payment/route.ts', schemaName: 'recordPaymentSchema', searchName: 'paymentSchema', importPath: '@/lib/validation/payment' },
  { file: 'app/api/warden/onboards/[id]/verify/route.ts', schemaName: 'verifySchema', importPath: '@/lib/validation/onboarding' },
  { file: 'app/api/warden/stays/[id]/early-checkout/route.ts', schemaName: 'earlyCheckoutSchema', importPath: '@/lib/validation/stay' },
  { file: 'app/api/warden/stays/[id]/extend/route.ts', schemaName: 'extendSchema', importPath: '@/lib/validation/stay' },
];

for (const item of replacements) {
  if (!fs.existsSync(item.file)) continue;
  let content = fs.readFileSync(item.file, 'utf8');
  
  // Remove the schema definition
  // It handles const <schema> = z.object({ ... });
  const schemaRegex = new RegExp(`const ${item.searchName || item.schemaName} = z\\.object\\(\\{[\\s\\S]*?\\}\\);`, 'g');
  const schemaRegex2 = new RegExp(`const ${item.searchName || item.schemaName} = z\\.object\\(\\{[\\s\\S]*?\\}\\)\\.superRefine\\([\\s\\S]*?\\);`, 'g');
  
  content = content.replace(schemaRegex2, '');
  content = content.replace(schemaRegex, '');
  
  // If we changed searchName (like putSchema to paymentConfigSchema) we need to update the usage
  if (item.searchName && item.searchName !== item.schemaName) {
    content = content.replace(new RegExp(item.searchName, 'g'), item.schemaName);
  }

  // Add the import statement
  const importStmt = `import { ${item.schemaName} } from "${item.importPath}";\n`;
  if (!content.includes(importStmt)) {
    // Insert after the last import
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfImport = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfImport + 1) + importStmt + content.slice(endOfImport + 1);
    } else {
      content = importStmt + content;
    }
  }

  // Optional: remove import { z } from 'zod' if no longer used
  if (!content.includes('z.') && content.includes('import { z } from "zod";')) {
    content = content.replace(/import \{ z \} from "zod";\n?/g, '');
  }

  fs.writeFileSync(item.file, content);
  console.log(`Updated ${item.file}`);
}
