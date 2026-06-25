# CTO Code Review: PR #37 (Step 3 - Scoped Authentication)

**Status:** ❌ **REJECTED - DO NOT MERGE**

This PR contains catastrophic security vulnerabilities, data destruction vectors, and structural flaws in how multi-tenancy is enforced. The use of Prisma Client Extensions + `node:async_hooks` is fundamentally broken for our use case.

## 1. Critical Vulnerability: Data Destruction via `update` and `delete`
**Location:** `lib/db/index.ts` (Lines 55-65)

The implementation for single record lookups (`findUnique`, `update`, `delete`) executes the query **BEFORE** verifying the tenant context:
```typescript
const result = await query(args); // Mutates the database here!
if (result && (result as any).organizationId !== orgId) {
    return null; // Silently suppresses the result after the damage is done
}
```
* **Impact:** This is a severe privilege escalation and data destruction flaw. A malicious tenant can issue an `update` or `delete` request for ANY record across ANY organization if they know the ID. The database will execute the deletion/update, and the middleware will simply return `null` afterward. 
* **Why this happened:** Prisma's `update`/`delete` operations restrict the `where` clause to strictly unique fields (e.g., `id`). The developer could not inject `organizationId` into the `where` clause without causing a TypeScript/Prisma error, so they implemented a post-query check instead, completely ignoring that the mutation already occurred against the database.

## 2. Critical Vulnerability: "Fail Open" on Missing Context
**Location:** `lib/db/index.ts` (Line 36)

The extension wraps its logic in a conditional check: `if (orgId) { ... }`, but falls back to `return query(args)` if the context is missing.
* **Impact:** If `requireRole` is bypassed (e.g., in unauthenticated public routes like `/api/public/onboard-request/[id]/register`), or if a developer forgets to set the context in a background job, `orgContext.getStore()` returns `undefined`. The middleware will silently bypass all tenant scoping, performing reads and writes across the entire database. Security middleware must always **FAIL CLOSED**. Throw an error if context is missing for scoped models, and provide a dedicated `unscopedPrisma` instance for legitimate global queries.

## 3. Prisma Specific Edge-Cases: Nested Relations & Bulk Operations
**Location:** `lib/db/index.ts` (Lines 30-43)

Prisma's `$allModels.$allOperations` hook is incapable of safely handling complex multi-tenant payloads:
* **Nested Writes Bypass:** The hook only intercepts the top-level model. If a developer executes a nested creation (e.g., creating a `Hostel` inside a parent `Location` payload), the interceptor only runs against `Location` (which isn't scoped). The nested `Hostel` completely bypasses the extension and will be created without tenant constraints.
* **`createMany` Failure:** The code checks `if (a.data && !Array.isArray(a.data))`. This explicitly ignores arrays, meaning bulk inserts completely bypass tenant injection.
* **`upsert` Failure:** Prisma's `upsert` payload uses `args.create` and `args.update`, not `args.data`. The interceptor fails to find `a.data` and skips injection entirely.

## 4. Architectural Flaw: The `organizationId: ""` Hack
**Location:** Service files (e.g., `services/leads/lead.service.ts` Line 81)

To satisfy Prisma's strict TypeScript generation for the required `organizationId` field, developers are forced to hardcode `organizationId: ""` into their payloads, hoping the runtime extension overwrites it.
* **Impact:** This destroys type safety, creates confusing service logic, and in the event the extension fails (which it does for arrays, upserts, and nested writes), it pollutes the database with literal `""` strings. 

## Architectural Mandate & Next Steps

This PR cannot be approved in its current state. The Prisma Client Extension approach for multi-tenancy is inherently flawed and structurally insecure.

**Required Actions:**
1. **Scrap the Prisma Middleware:** Remove the `$extends` middleware entirely for tenant scoping.
2. **Implement PostgreSQL RLS (Recommended):** If transparent multi-tenancy is required, use PostgreSQL Row Level Security. Set the tenant context directly in the database transaction (`SET LOCAL app.current_tenant = ...`). This natively enforces isolation at the database engine level, perfectly handling nested writes and bulk operations without application-level blind spots.
3. **Alternative - Explicit Context Passing:** Pass `organizationId` explicitly to all service functions (e.g., `createLead(input, orgId)`). It is more verbose, but guarantees type safety and eliminates the need for empty string hacks and flaky runtime middleware.
