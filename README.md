# CrewKit

**Fiber Construction Operations Platform**

![Next.js](https://img.shields.io/badge/Next.js_14-black?style=flat-square&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![Mapbox](https://img.shields.io/badge/Mapbox_GL-000000?style=flat-square&logo=mapbox&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

> Internal operations tool for managing fiber optic construction projects from permit acquisition through state compliance reporting.

---

## Problem

Fiber network deployments involve coordination across multiple teams—permitting, engineering, field crews, and compliance. Without a unified system:

- **Daily reports** were assembled manually for state approval
- **Job handoffs** between planning and construction had no single source of truth
- **Material tracking** relied on spreadsheets disconnected from actual field work
- **Route data** lived in GIS tools that field crews couldn't access

## Solution

CrewKit is a full-stack construction management platform that:

- **Structures the job lifecycle** into discrete phases (Planning → Construction → Reporting) with step-by-step workflows
- **Imports GIS data** from engineering shapefiles and auto-generates Bills of Materials
- **Provides role-based interfaces** for admins, managers, and field technicians
- **Automates compliance reporting** by capturing data at the source

---

## Key Features

### Job Lifecycle Management
Multi-phase wizard guiding jobs through Planning (permits, route design, materials, crew assignment) → Construction (daily progress, material usage, crew hours) → Reporting (completion summary, as-built, sign-off).

### GIS Integration
Import shapefiles from Vetro FiberMap. Automatic pole type classification (Terminal, Tangent, Corner, Junction) using spatial topology analysis with Turf.js.

### Interactive Route Maps
Mapbox GL-powered design workspace with layer management, lasso selection tools, and real-time BOM updates based on selected scope.

### Role-Based Access
- **Admin**: Full system access, user management, settings
- **Manager**: Team-scoped job management and reporting
- **Field**: Mobile-first job view with daily logging

### Red Light Safety Gate
Structured checklist requiring DOT permits, right-of-way confirmation, power line clearance, and traffic control sign-off before crews can begin construction.

### PWA Support
Progressive Web App configuration for offline-capable mobile access on job sites.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js |
| Maps | Mapbox GL JS, Mapbox Draw |
| Spatial Analysis | Turf.js |
| GIS Import | Shapefile parsing |
| UI | Radix UI + Tailwind CSS |
| State | React Query |
| Deployment | Vercel |

---

## Architecture

```
crewkit/
├── app/                              # Next.js 14 App Router
│   ├── admin/                        # Admin dashboard (full access)
│   │   ├── jobs/[id]/                # Job detail with lifecycle view
│   │   ├── inventory/                # Equipment & assembly management
│   │   ├── reports/                  # Field logs & EOD reports
│   │   ├── settings/                 # Permit types, project areas
│   │   └── users/                    # User & team management
│   │
│   ├── manager/                      # Foreman view (team-scoped)
│   │   ├── jobs/[id]/
│   │   └── reports/
│   │
│   ├── field/                        # Field tech view (mobile-first)
│   │   ├── jobs/[id]/
│   │   ├── [jobId]/map/              # Interactive route map
│   │   └── today/                    # Daily task view
│   │
│   └── api/                          # REST API routes
│       ├── job-plans/
│       │   └── [id]/
│       │       ├── bom/import/       # GIS shapefile import
│       │       ├── assemblies/       # Auto-detected materials
│       │       ├── permits/          # Document management
│       │       └── comments/         # Team collaboration
│       └── reports/
│           ├── field-logs/           # Daily progress tracking
│           └── eod/summary/          # Compliance reports
│
├── components/
│   ├── job-planner/                  # Core job management UI
│   │   ├── job-lifecycle-view.tsx    # Multi-phase wizard (828 lines)
│   │   ├── job-kanban-board.tsx      # Status board (1347 lines)
│   │   ├── design-map.tsx            # Mapbox route viewer (2056 lines)
│   │   └── steps/
│   │       ├── planning/             # Permits, Route, Materials, Crew
│   │       │   └── route-design/     # GIS layer management
│   │       ├── construction/         # Progress, Usage, Hours, Issues
│   │       └── reporting/            # Summary, As-built, Sign-off
│   │
│   ├── inventory/                    # Equipment & assembly tables
│   ├── dashboard/                    # Metrics & activity feeds
│   ├── layout/                       # Shell, nav, notifications
│   └── ui/                           # Design system (Radix + Tailwind)
│
├── lib/                              # Business logic & utilities
│   ├── shapefile-parser.ts           # GIS data import
│   ├── assembly-detection.ts         # Pole type classification
│   ├── selection-utils.ts            # Map lasso selection
│   └── validations.ts                # Zod schemas
│
├── prisma/
│   └── schema.prisma                 # 25+ models
│
└── public/
    └── manifest.json                 # PWA configuration
```

### Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Role-based route groups** | `/admin`, `/manager`, `/field` provide tailored UX per user type with shared components |
| **Step-based wizard pattern** | Job lifecycle has 3 phases × 5+ steps; wizard keeps complex state manageable |
| **Colocated API routes** | App Router convention; `/api/job-plans/[id]/bom/import` is self-documenting |
| **Lib folder for business logic** | GIS parsing and assembly detection are complex; isolated for testability |
| **Radix + Tailwind** | Accessible primitives + utility CSS = rapid iteration without sacrificing UX |

---

## Technical Highlights

### Shapefile Parsing
Imports `.shp/.dbf` files from GIS engineering tools, extracting fiber segments, infrastructure points, and conduit routes with full attribute preservation.

### Spatial Topology Analysis
Uses Turf.js to classify poles by their strand connections:
- **Terminal**: Dead end (1 connection)
- **Tangent**: Straight pass-through (2 connections, ~180°)
- **Corner**: Angle change (2 connections, sharp angle)
- **Junction**: Branch point (3+ connections)

### Custom Mapbox Draw Mode
Extended `draw_polygon` mode with:
- Ghost closing line preview
- First-vertex hover detection with pulse animation
- Real-time feature highlighting during lasso selection

### Bill of Materials Generation
Combines imported GIS data with assembly templates to auto-generate material lists, tracking planned vs. actual usage throughout construction.

---

## Status

![Status](https://img.shields.io/badge/Status-In_Production-success?style=flat-square)
![Type](https://img.shields.io/badge/Type-Internal_Tool-blue?style=flat-square)

This is an internal operations tool built for Utah Broadband fiber construction teams.

---

## Author

**Gabe Cabrera**  
[GitHub](https://github.com/gabecabrera)
