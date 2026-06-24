# NextHome Hostel Management Platform

A premium Next.js SaaS platform for modern hostel management.

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL (via Supabase)
- **ORM:** Prisma
- **Auth:** Supabase Auth (Server-Side + Middleware)
- **Styling:** Tailwind CSS + shadcn/ui
- **Data Fetching:** SWR (Client) + Server Actions
- **Forms:** React Hook Form + Zod

## Local Development Setup

Follow these steps to set up the project locally from scratch. It should take ~15 minutes.

### 1. Prerequisites
- Node.js >= 18
- npm or pnpm
- A Supabase account (for database and auth)

### 2. Supabase Setup
1. Create a new project in Supabase.
2. In the Supabase SQL editor, run the auth triggers and schema required for this project (see `prisma/schema.prisma` comments if any).
3. Under **Authentication -> Providers**, enable **Email/Password**.
4. Disable **Confirm email** for local development (optional but recommended for speed).
5. Create a new Storage Bucket named `nexthome-documents` and set it to **Public**.

### 3. Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```
Fill in the values in `.env`:
- `DATABASE_URL`: Transaction pooling connection string from Supabase (port 6543)
- `DIRECT_URL`: Direct connection string from Supabase (port 5432)
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (used for admin-level auth tasks)
- `SUPABASE_STORAGE_BUCKET`: `nexthome-documents`

### 4. Database Migration & Seeding
Install dependencies:
```bash
npm install
```

Push the schema to your Supabase database:
```bash
npx prisma db push
# or npx prisma migrate dev
```

Generate the Prisma Client:
```bash
npx prisma generate
```

Seed the database with test data (Admin, Hostels, Wardens, Rooms, Beds):
```bash
npm run db:seed
```
*Note: The seed script will output the login credentials for the test accounts.*

### 5. Run the Application
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Code Quality Standards
- **Strict Types**: The codebase operates with zero `any` types. All caught errors are strictly `unknown`.
- **Monetary Values**: All monetary values are processed and stored in **Paise** (integers). No floats.
- **API Architecture**: Route handlers are kept under 40 lines. Business logic lives in `services/`.
- **UI UX**: Always use `shadcn/ui` components. Destructive actions require an `AlertDialog`. All forms emit a Sonner toast on success or error.

## Running Tests
Run the automated test suite to ensure no regressions:
```bash
npm test
```
