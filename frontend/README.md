# FlowForge WMS Frontend

Production React + TypeScript interface for FlowForge WMS decision orchestration.

## Features & Navigation

- **Command Center (`/`)**: Real-time warehouse telemetry, active KPI counters, stage bottleneck metrics, priority actions feed, and exception alerts.
- **Orders Pipeline (`/orders`)**: Filterable and searchable customer order list with dynamic SLA risk badges and order code search.
- **Order Detail (`/orders/:orderId`)**: In-depth order SKU allocations, bin verification confidence scores, audit history, and stage action buttons.
- **Inventory & Bins (`/inventory`)**: SKU stock on-hand, allocated units, damaged inventory, and recommended replenishment thresholds.
- **Fulfillment Board (`/fulfillment`)**: Real-time Kanban board across picking, packing, quality inspection, and dispatch stages.
- **Exceptions Feed (`/exceptions`)**: Complete disruption log with filterable policy modes (`AUTO_EXECUTED`, `APPROVAL_REQUIRED`, `ESCALATE`) and resolution forms.
- **Scenario Simulator (`/simulate`)**: Interactive disruption injector (Rush Orders, Damaged Goods, Cycle Discrepancies, QC Failures) with instant before/after decision briefs.
- **Command Palette (<kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd>)**: Quick search across navigation routes and warehouse actions.

## Tech Stack & Architecture

- **React 19** with **TypeScript 5.8+**
- **Vite** for fast bundling and production builds
- **Tailwind CSS v4** with a custom dark glassmorphism design system (`#16192b`, `#2d3250`, `#424769`, `#f9b17a`)
- **Radix UI** primitives for accessible dialogs and command palette
- **Axios** with explicit 15-second request timeouts to prevent stalled loading states
- **WCAG 2.1 AA** compliant contrast, semantic tables, keyboard trap navigation, and `aria-live` polite screen-reader announcements

## Getting Started

### 1. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set the backend API base URL:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 2. Install & Run

```bash
npm install
npm run dev
```

### 3. Build & Test Commands

```bash
# Typecheck TypeScript files
npm run typecheck

# Lint with ESLint
npm run lint

# Production build
npm run build

# Preview production build locally
npm run preview
```

## Vercel Deployment

This project includes a `vercel.json` rewrite configuration that enables single-page application (SPA) routing for all sub-routes without 404 errors on page refresh.

Ensure `VITE_API_BASE_URL` is configured in your Vercel Project Settings under Environment Variables.
