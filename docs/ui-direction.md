# FlowForge UI Direction

## Style
Industrial Operations Console:
dense, high-trust, keyboard-friendly, decision-first.

## Foundation
- React + Vite + TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide React
- Recharts only for meaningful operational charts
- Motion only for transitions under 200ms

## Typography
- UI text: Geist or Inter
- Operational identifiers: Geist Mono
- Use monospace for order IDs, SKUs, quantities, bin codes, timestamps

## Color semantics
- Red: Critical / Blocked
- Amber: At risk / Approval required
- Blue: Active / In progress
- Emerald: Verified / Resolved / Dispatched
- Zinc/slate: Neutral

## Main interaction
Event → Decision → Resolution must be visible on every critical workflow.
Never describe rule-based outcomes as “AI decisions.”
Use: Decision Policy, Allocation Rationale, Why this priority?

## Build first
1. App shell + Ctrl/Cmd+K command palette
2. Dense Orders table + right-side Order Detail sheet
3. Scarce-stock Allocation Comparison panel
4. Audit Timeline
5. Command Center required-actions feed

## Defer
- Advanced filter builder
- Editable allocation override flow
- Drag-and-drop Kanban
- Global dynamic-island alerts
- Micro bullet charts
- Anime.js
- Complex charts and visual effects

## Do not use
- Gradient marketing backgrounds
- Large empty KPI cards
- Glassmorphism
- 3D visuals
- Decorative animation
- Chatbot-first workflow
- Hover-only critical information
- Confetti / bouncy animation