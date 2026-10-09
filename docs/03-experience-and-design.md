# UX, responsive design and interaction contract

## A deliberately non-generic interface

Working identity: **THIEPN / CONTROL**. Editorial operational console, not a futuristic glass dashboard. Typography: system sans-serif for text, tabular/narrow mono for metadata. Palette: matte ink `#121819`, chalk `#F4F2EC`, warm line `#D9D8D1`, soft signal lavender `#6A57B4` for selected focus, muted teal for passed evidence, rusty red only for genuine failures. No gradients, large 3D icons, decorative charts, persistent AI input box or indiscriminate cards.

## Desktop >=1100px

- 200–220px slim left rail: Command, Portfolio, Review, Plan, Settings.
- Main content max 1480px with 24–40px gutters.
- 56px compact topbar: context, global search/command (`Ctrl/Cmd+K`), sync age, actions.
- Command: one dominant `NEXT` strip; compact 3-slot focus rail below; evidence/review queue alongside; portfolio peek underneath. No massive empty tiles.
- Portfolio: one row per project, sticky header, consistent 44px row height (56px when next-action preview enabled), columns configurable, virtualize after >100 rows; keyboard accessible manual reordering.
- Detail: right-hand 360–440px inspector or dedicated page, persistent direct URLs `/projects/:slug`.

## Tablet 700–1099px

- Collapsible icon navigation.
- Table reduces to title / next action / priority / readiness. Inspector switches to full overlay.
- No horizontal scrolling required for primary actions, optional wide table horizontal scroll with sticky project label.

## Mobile <=699px

- Bottom or compact top navigation: Focus, All, Review, Plan.
- Focus shows single active next action first, then 3 slots; no desktop KPI grid.
- Project list uses 2-line compact rows with explicit status, optional target % (`Unassessed` when unknown), priority.
- Drag reordering has accessible Up/Down alternatives; avoid drag gesture that competes with scrolling.
- Edit sheet accessible with 44px min targets, visible cancel/save and unsaved-change prompt.
- Offline PWA eventually read-only cached data, explicit stale badge, never pretend an offline update synchronized.

## Views and ordering

Sort key options: user manual rank, priority, deadline, target completion, next action readiness, last *verified* evidence, title. Manual rank is stored independently; viewing by another sort never modifies it. Filter by lifecycle, priority, category, group, evidence confidence, blocker, owner, target, deadline kind, and repository availability. Save multiple named views.

## Accessibility and motion

WCAG 2.2 AA target; semantic HTML, high contrast, reduced-motion behavior, visible focus outlines, distinct icons+text for states, screen-reader announcing applied sort, keyboard access to all editing/reordering. Do not use color as sole status indicator. Respect 200% zoom, small viewport safe areas, and coarse pointer input.

## Static design probe

`design/prototype/index.html` is a **local standalone visual interaction sample** using *public* example names and unassessed progress; no network, no persistence or privileged operations. It is not production application code and not evidence of database/API completion.
