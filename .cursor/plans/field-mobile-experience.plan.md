# Field User Mobile Experience Plan

## Overview
Create a mobile-first, one-handed experience for field workers to log assembly usage with category-based navigation, fiber footage tracking (in feet), end-of-day submission, and manager approval workflow.

## Decisions
- **Footage Unit**: Feet (ft)
- **Submission**: Optional (users can log new entries even if previous day not submitted)
- **Manager Notification**: Dashboard indicator only (no email)

---

## Phase 1: Schema & Backend

### 1.1 Update Prisma Schema
- Add `AssemblyCategory` enum (STRAND, FIBER, AERIAL, UNDERGROUND, SPLICING, OTHER)
- Add `DailyLogStatus` enum (IN_PROGRESS, SUBMITTED, APPROVED, REJECTED)
- Add `category` field to `Assembly` model
- Add `startFootage`, `endFootage`, `isDraft` fields to `AssemblyUsageLog`
- Create new `DailyUsageSubmission` model

### 1.2 Run Migration
- Generate and apply Prisma migration

### 1.3 Update Assembly APIs
- Update assembly creation/edit to include category
- Add category filter to GET /api/assemblies

### 1.4 Create New API Endpoints
- `POST /api/assemblies/usage` - Update to support footage fields
- `PATCH /api/assemblies/usage/[id]` - Complete draft entries
- `GET /api/assemblies/usage/drafts` - Get user's incomplete entries
- `POST /api/daily-submission` - Submit day for approval
- `GET /api/daily-submission` - Get submission status
- `GET /api/daily-submission/pending` - Manager: get pending approvals
- `POST /api/daily-submission/[id]/review` - Manager: approve/reject

---

## Phase 2: Admin Updates

### 2.1 Assembly Category Selection
- Add category dropdown to Create/Edit Assembly form
- Show category badge in assemblies table

---

## Phase 3: Field Mobile UI

### 3.1 Category Selection Screen (`/field/log`)
- Large category buttons (64px+ height)
- Icons for each category
- Badge with assembly count per category

### 3.2 Assembly List by Category (`/field/log/[category]`)
- Scrollable list of assemblies
- Large tap targets (56px+ height)
- Quick tap to log usage

### 3.3 Fiber Footage Modal
- Numeric input for start footage
- Numeric input for end footage
- Auto-calculate total used
- "Save Draft" if only start provided
- "Complete" when both provided

### 3.4 Drafts View (`/field/drafts`)
- List of incomplete fiber entries
- Tap to complete with end footage

### 3.5 Update Field Home
- Add prominent "Log Usage" button
- Show "In Progress" card if drafts exist
- Update "Today's Summary" to show footage

---

## Phase 4: Submission Workflow

### 4.1 End of Day Screen (`/field/submit`)
- Summary of today's logged items
- Warning if drafts remain
- Submit button
- Status display

### 4.2 Manager Approval UI
- "Pending Approvals" section on manager dashboard
- Expandable team member submissions
- Approve/Reject with notes

---

## Phase 5: History & Polish

### 5.1 History View (`/field/history`)
- Date picker filter
- Full log history
- Grouped by date

### 5.2 UX Polish
- Smooth animations
- Loading states
- Error handling

---

## File Structure

```
app/
├── field/
│   ├── log/
│   │   ├── page.tsx           # Category selection
│   │   └── [category]/
│   │       └── page.tsx       # Assembly list for category
│   ├── drafts/
│   │   └── page.tsx           # In-progress fiber entries
│   ├── submit/
│   │   └── page.tsx           # End of day submission
│   └── history/
│       └── page.tsx           # Full usage history
├── api/
│   ├── assemblies/
│   │   └── usage/
│   │       ├── [id]/
│   │       │   └── route.ts   # PATCH to complete draft
│   │       └── drafts/
│   │           └── route.ts   # GET drafts
│   └── daily-submission/
│       ├── route.ts           # POST submit, GET status
│       ├── pending/
│       │   └── route.ts       # GET pending (manager)
│       └── [id]/
│           └── review/
│               └── route.ts   # POST approve/reject
└── manager/
    └── approvals/
        └── page.tsx           # Manager approval interface
```

