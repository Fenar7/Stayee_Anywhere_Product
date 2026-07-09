# PRD: Task Assignment Module — NextHome Hostel Platform

**Document Version:** 1.0  
**Created:** 2026-07-09 at 13:00 IST  
**Author:** Main Admin / Product Team  
**Status:** Approved for Implementation

---

## Overview

The Task Assignment Module replaces the static dummy widget with a fully dynamic, production-ready system where the **Main Admin can create, assign, and track tasks** directed at specific Wardens. Wardens can view their assigned tasks, mark them in progress or done, and leave completion notes. Everything integrates with the existing notification system, real-time activity log, and role-based security architecture.

---

## Guiding Principles

- **Zero Spaghetti Code:** Clear separation of concerns — Prisma schema → service layer → API route handler → UI component. No business logic leaks into UI.
- **Security First:** Every API route enforces `requireRole`, `requireHostelAccess`, and organization-scoped queries. No user can see or touch another org's tasks.
- **Production Edge Cases Covered:** Overdue detection, concurrent status updates, orphaned tasks on warden deletion, paginated list views, and more.
- **Notification-Driven:** Task creation, approaching deadlines, and status changes all fire in-app notifications to the relevant parties.

---

## Data Model (Prisma Schema Additions)

```prisma
enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TaskStatus {
  PENDING       // Assigned, not yet started
  IN_PROGRESS   // Warden has started working
  COMPLETED     // Warden marked done
  CANCELLED     // Admin cancelled the task
  OVERDUE       // Derived client-side + server-side via cron
}

model Task {
  id             String       @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Assignment
  createdByUserId    String
  createdBy          User   @relation("TasksCreated", fields: [createdByUserId], references: [id])
  assignedToWardenId String
  assignedToWarden   Warden @relation(fields: [assignedToWardenId], references: [id])
  hostelId           String
  hostel             Hostel @relation(fields: [hostelId], references: [id])

  // Task Content
  title       String
  description String?
  priority    TaskPriority @default(MEDIUM)
  status      TaskStatus   @default(PENDING)
  deadline    DateTime

  // Completion
  completedAt    DateTime?
  completionNote String?

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  comments TaskComment[]

  @@index([organizationId])
  @@index([assignedToWardenId, status])
  @@index([hostelId])
  @@index([deadline])
}

model TaskComment {
  id        String   @id @default(uuid())
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  message   String
  createdAt DateTime @default(now())

  @@index([taskId])
}
```

**Relation additions on existing models:**
- `User` → `tasksCreated Task[] @relation("TasksCreated")`
- `User` → `taskComments TaskComment[]`
- `Warden` → `tasks Task[]`
- `Hostel` → `tasks Task[]`
- `Organization` → `tasks Task[]`

---

## Branch Strategy

```
feature/food-billing-system
└── feature/task-assignment-module        ← umbrella branch
    ├── feature/task-assignment/phase-1-db-schema
    ├── feature/task-assignment/phase-2-api-service
    ├── feature/task-assignment/phase-3-admin-ui
    └── feature/task-assignment/phase-4-warden-ui
```

Each phase branch is PR'd into `feature/task-assignment-module` and that final branch is PR'd into `feature/food-billing-system`.

---

## Phase Breakdown

---

### Phase 1 — Database Schema & Migration

**Branch:** `feature/task-assignment/phase-1-db-schema`

#### Files Changed
- `prisma/schema.prisma` — Add `Task`, `TaskComment`, `TaskPriority`, `TaskStatus` enums, and update relation fields on `User`, `Warden`, `Hostel`, `Organization`.

#### Deliverables
1. Add all models and enums to schema.
2. Run `prisma migrate dev --name add_task_assignment_module`.
3. Update `prisma/seed.ts` with sample tasks for dev environment.

#### Edge Cases
- Warden deletion: `onDelete: Cascade` on tasks would silently delete tasks. Instead, we set `onDelete: Restrict` so a warden cannot be deleted while open tasks exist. If admin must delete, they must first cancel/reassign all tasks (enforced at the service layer).

---

### Phase 2 — Service Layer & API Routes

**Branch:** `feature/task-assignment/phase-2-api-service`

#### Service: `services/tasks/task.service.ts`

All functions scoped by `organizationId` to enforce multi-tenant isolation.

```ts
// Admin functions
createTask({ title, description, priority, deadline, assignedToWardenId, hostelId, createdByUserId, organizationId })
updateTask({ taskId, organizationId, ...updates })  // Admin can update any field
cancelTask({ taskId, organizationId })
listTasksAdmin({ organizationId, filters: { status?, hostelId?, wardenId?, priority? }, pagination })

// Warden functions
listTasksWarden({ wardenId, organizationId, filters: { status? }, pagination })
updateTaskStatus({ taskId, wardenId, newStatus, completionNote? })
addTaskComment({ taskId, userId, message })

// Dashboard widget function (used by both)
getTasksWidgetData({ scope: 'admin' | 'warden', organizationId, wardenId? })
```

#### API Routes (Next.js Route Handlers)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/admin/tasks` | `MAIN_ADMIN` | Create a new task |
| `GET` | `/api/admin/tasks` | `MAIN_ADMIN` | List all tasks (paginated, filtered) |
| `GET` | `/api/admin/tasks/[id]` | `MAIN_ADMIN` | Get single task detail |
| `PATCH` | `/api/admin/tasks/[id]` | `MAIN_ADMIN` | Edit task (title, deadline, priority, status) |
| `DELETE` | `/api/admin/tasks/[id]` | `MAIN_ADMIN` | Cancel task (soft-cancel via status) |
| `GET` | `/api/warden/tasks` | `WARDEN` | List my assigned tasks |
| `GET` | `/api/warden/tasks/[id]` | `WARDEN` | Get task I own |
| `PATCH` | `/api/warden/tasks/[id]/status` | `WARDEN` | Update my task status |
| `POST` | `/api/tasks/[id]/comments` | `MAIN_ADMIN`, `WARDEN` | Post a comment |
| `GET` | `/api/tasks/[id]/comments` | `MAIN_ADMIN`, `WARDEN` | Fetch comments |

#### Security Checks Per Route
- Every route: `requireRole(...)` → throws 401/403.
- Warden routes: `task.assignedToWarden.userId === session.user.id` → throws 403 if mismatch.
- Admin routes: `task.organizationId === session.user.organizationId` → throws 403 if mismatch.
- Input validation: `zod` schemas on all request bodies. Bad input returns structured 422.

#### Notification Triggers
- Task created → notify assigned Warden: "New task assigned: [title]"
- Task status changed to `COMPLETED` → notify Admin: "[Warden name] completed task: [title]"
- Task overdue (server cron) → notify both Admin and Warden: "Task [title] is overdue!"

#### Edge Cases
- Assigning to a warden not in the same org → blocked at service layer.
- `deadline` in the past at creation time → return 422 "Deadline must be in the future."
- Concurrent `PATCH` on same task: use optimistic locking via `updatedAt` timestamp check.
- Warden tries to update a task not assigned to them → 403.
- Warden tries to update status of a `CANCELLED` task → 422 "Cannot update a cancelled task."
- Pagination defaults: `page=1`, `limit=20`, max `limit=100`.

---

### Phase 3 — Admin UI

**Branch:** `feature/task-assignment/phase-3-admin-ui`

#### 3A — Dashboard Widget: `components/dashboard/TasksList.tsx`
Replace the current static component with a server component that:
- Fetches the next 8 tasks across the org due within the next 7 days, grouped by day-of-week.
- Shows task title, assigned Warden name + hostel name, deadline (relative: "Today", "Tomorrow", "Mon"), and priority badge.
- "View All" button links to `/admin/tasks`.
- Overdue items are highlighted in a muted red.

#### 3B — Full Tasks Management Page: `app/admin/tasks/page.tsx`
A full-page list view with:
- **Filter Bar:** Status, Hostel, Warden, Priority, Date Range.
- **Task Card:** Title, description snippet, Warden name, hostel name, deadline (absolute + relative), priority badge (color coded), status chip.
- **Sort:** By deadline, created date, priority.
- **Pagination.**
- Clicking a task opens the Task Detail Panel (right drawer/modal).

#### 3C — Create Task Modal
- Triggered by a prominent "Assign Task" button.
- **Fields:** Title (required), Description (rich textarea), Hostel (searchable dropdown — fetched from org's hostels), Warden (auto-filters to warden of selected hostel), Priority, Deadline (date + time picker, must be future).
- Client-side validation via `react-hook-form` + `zod`.
- On success: optimistically prepends task to list, shows toast.

#### 3D — Task Detail View (Drawer/Modal)
- View all task details.
- Edit title, description, priority, deadline (status-permitting).
- Cancel task button (with confirmation dialog).
- Comments thread at the bottom.

---

### Phase 4 — Warden UI

**Branch:** `feature/task-assignment/phase-4-warden-ui`

#### 4A — Dashboard Widget: `components/hostel-management/dashboard/TasksList.tsx`
- Fetches the next 6 tasks assigned to this warden due within 7 days.
- Same visual design as admin widget (consistent design system).
- Checkbox on each task to quickly mark `IN_PROGRESS` or `COMPLETED`.
- "View All" links to `/warden/tasks`.

#### 4B — Warden Tasks Page: `app/warden/tasks/page.tsx`
- Grouped tabs: **Pending**, **In Progress**, **Completed**, **Overdue**.
- Each card shows: task title, assigner ("from HQ"), priority badge, deadline, and a status action button.
- Clicking a task opens detail view.

#### 4C — Task Detail View
- Read-only view of title/description/priority.
- Status update button (Pending → In Progress → Completed).
- Completion Note field (required when marking Completed).
- Comments thread visible.

---

## Overdue Detection

A lightweight server-side approach without a dedicated job queue:
- On every `GET /api/admin/tasks` and `GET /api/warden/tasks`, the service layer runs a single `prisma.task.updateMany` to flip tasks with `deadline < now()` and `status IN (PENDING, IN_PROGRESS)` to `OVERDUE`.
- This piggybacks on normal traffic and keeps data consistent without a separate cron infrastructure.
- Future: Can be replaced with a Vercel Cron Job for proactive notifications.

---

## Component Architecture

```
components/
  dashboard/
    TasksList.tsx              ← Admin dashboard widget (server component, passes data to client)
    TasksListClient.tsx        ← Client interactivity (checkbox toggle)
  tasks/
    TaskCard.tsx               ← Shared task card UI
    TaskBadge.tsx              ← Priority + Status badge
    TaskForm.tsx               ← Create/Edit form (react-hook-form + zod)
    TaskDetailDrawer.tsx       ← Slide-over panel for detail view
    TaskComments.tsx           ← Comments thread
    TaskFilters.tsx            ← Filter bar for full list page

app/
  admin/tasks/
    page.tsx                   ← Full list page (server component)
    [id]/page.tsx              ← Task detail page (optional fallback if drawer fails)
  warden/tasks/
    page.tsx                   ← Warden task list

services/
  tasks/
    task.service.ts            ← All business logic

app/api/
  admin/tasks/
    route.ts                   ← GET list, POST create
    [id]/route.ts              ← GET detail, PATCH update, DELETE cancel
  warden/tasks/
    route.ts
    [id]/route.ts
    [id]/status/route.ts
  tasks/
    [id]/comments/route.ts
```

---

## Verification Plan

### Automated
- Unit tests for `task.service.ts`: create, list, update, cancel, authorization checks.
- API route integration tests: correct 401/403 on missing/wrong role, 422 on bad input.

### Manual QA
1. Log in as Admin → Assign Task to Warden A of Hostel X → Verify Warden A sees it, Warden B does not.
2. Warden marks task In Progress → Admin sees status update in their list.
3. Warden marks task Completed with note → Admin gets notification.
4. Create task with past deadline → expect 422 error.
5. Try accessing `/api/warden/tasks` with admin token → expect 200 (admin is superuser).
6. Try accessing `/api/admin/tasks` with warden token → expect 403.
7. Set deadline to 1 minute from now, wait, refresh list → task should show as Overdue.
