# NextHome Hostel Management Platform - Current Context

## 1. Project Overview
NextHome is a comprehensive hostel management platform built to streamline operations for Admins, Wardens, and Tenants. The stack includes:
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS & Shadcn UI
- **Database**: Prisma ORM with PostgreSQL
- **Language**: TypeScript

## 2. Current Active Branch
**Branch**: `fix/admin-hostel-redirect-params`

## 3. Recent Objectives & Completed Work
The primary focus of recent development has been **purging basic modal popups** for user profiles and stay details, and replacing them with **dedicated, full-screen detailed pages**. This was driven by user feedback emphasizing the need for comprehensive detail views (Aadhaar/Identity documents, full payment histories, food ordering history) instead of simple popups.

### Key Achievements:
- **Eradicated `StayLifecycleModal`**: Removed the generic popup modal (`StayLifecycleModal.tsx`) from the entire codebase.
- **Dedicated Stay Details Pages**:
  - Implemented `StayDetailsPageView.tsx`, a comprehensive shared view component.
  - Created Warden Route: `/warden/stays/[stayId]/page.tsx`
  - Created Admin Route: `/admin/hostels/[id]/stays/[stayId]/page.tsx`
- **Full-Screen User Profiles for All Roles**:
  - Created `/admin/users/[id]/page.tsx`. Now, when an Admin clicks on any user (Tenant, Warden, Admin) in the "Users" tab, it redirects to a dedicated profile page rather than showing a limited modal.
- **Updated Navigation Elements**:
  - `HostelOccupancyView.tsx` (Occupancy Map) was updated. Clicking on an occupied bed now uses `router.push()` to redirect directly to the tenant's dedicated stay page.
  - `StayDetailsTrigger.tsx` (used in the Stays data tables) was updated to use a `Link` component navigating to the new dedicated pages.
  - Fixed TypeScript errors related to `PageHeader` props (`backLink` replaced with `breadcrumbs`) during the Next.js production build.

## 4. Current State & Codebase Architecture changes
The application architecture is moving firmly from state-driven modals to URL-driven dedicated routes. This allows for:
- Deep linking to specific tenant/stay details.
- Scalable UI that accommodates extensive information (documents, transaction logs) without cluttering the screen or cramming into a dialog component.

**Key Files Modified/Created:**
- `app/admin/users/[id]/page.tsx` (New)
- `app/admin/hostels/[id]/stays/[stayId]/page.tsx` (New)
- `app/warden/stays/[stayId]/page.tsx` (New)
- `components/hostel-management/StayDetailsPageView.tsx` (New)
- `components/hostel-management/HostelOccupancyView.tsx` (Modified)
- `components/warden/StayDetailsTrigger.tsx` (Modified)
- `app/admin/users/page.tsx` (Modified - removed modal state logic)
- `components/hostel-management/HostelStaysView.tsx` (Modified - verified routing and Server Component rules)

## 5. Known Pending / Future Tasks
- **HostelDashboardView "Overview" Tab**: Ensure the dashboard has an active overview tab and prevents incorrect redirection to the "Builder" tab.
- **Onboarding Phone Input Standardization**: Add a country code selector (defaulting to India `+91`) for all phone number inputs globally.
- **Continued UI Polish**: Ensure all forms and inputs rely strictly on typed `shadcn/ui` components (removing raw HTML inputs/selects).
