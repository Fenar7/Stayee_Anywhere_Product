# Next Home — Hostel Management Platform

Next Home is a stay-centric Hostel Management Platform built with Next.js 16 (App Router), TypeScript, PostgreSQL (via self-hosted Supabase), and Prisma ORM.

---

## 🛠️ Prerequisites

Ensure you have the following installed locally:
- **Node.js 20+** and npm
- **Docker Desktop** (running, to support local Supabase containers)
- **Supabase CLI** (installed via npm or brew)
- **Git**

---

## 🚀 Local Development Setup

Follow these steps to set up your local development environment:

### 1. Clone the repository and install dependencies
```bash
git clone <repository-url>
cd NextHome_Hostel_Management_Platform
npm install
```

### 2. Start the local Supabase stack
Ensure Docker Desktop is running, then start the Supabase containers (Postgres, Auth, Storage, Studio, etc.):
```bash
supabase start
```
This command will spin up local services and print out development credentials, URLs, and API keys.

### 3. Configure environment variables
Copy the environment variables template and configure the variables:
```bash
cp .env.example .env
```
Ensure the `DATABASE_URL` matches the database URL printed by `supabase start` (default is `postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public`).
Also, copy over the Supabase Anon Key and Service Role Key printed by the CLI.

### 4. Run Prisma migrations
Apply the database migrations to provision your local Postgres schemas:
```bash
npx prisma migrate dev
```

### 5. Seed the database (Optional)
Once seed scripts are defined, seed initial data (Admin, Wardens, hostels, floors, beds):
```bash
npx prisma db seed
```

### 6. Run tests
Execute unit tests using Vitest to verify core logic:
```bash
npx vitest run
```

### 7. Start the Next.js development server
Start the web app:
```bash
npm run dev
```
The application will be accessible at [http://localhost:3000](http://localhost:3000).
Your local Supabase Studio dashboard will be accessible at [http://127.0.0.1:54323](http://127.0.0.1:54323).

---

## 📂 Project Structure

- `app/` — Dashboard layouts and API routes.
- `components/` — Composable UI elements and shadcn/ui primitives.
- `lib/` — Configuration, utilities, and helper models:
  - `lib/db/` — Prisma Client singleton.
  - `lib/auth/` — Session helpers, `requireRole()`, `requireHostelAccess()`.
  - `lib/errors.ts` — Standard application errors and boundary handlers.
- `services/` — Core business logic functions (bed assignment conflict checks, billing calculus).
- `prisma/` — Prisma schemas and migrations.
- `tests/` — Test suites for testing business logic and access control rules.

---

## 🛡️ Git Branching Model
We use a three-tier branch hierarchy:
1. `main` — Release-ready branch. No direct commits allowed.
2. `phase-*` — Long-lived feature phase branches (e.g., `phase-1-core-platform`).
3. `phase-*-sprint-*` — Short-lived sprint branches (e.g., `phase-0-foundation-sprint-0.1-project-setup`). Open a PR against your phase branch when done.
