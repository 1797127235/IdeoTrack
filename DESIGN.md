# IdeoTrack Admin Design System

## Overview

A minimal, restrained admin dashboard for IdeoTrack. The visual system prioritizes clarity, density, and calm efficiency. The interface avoids decoration in favor of typography, spacing, and structural hierarchy. Inspired by Linear and Notion: generous whitespace, sharp type hierarchy, subtle borders, and a near-neutral palette with a single disciplined accent.

## Register

product

## Palette

### Primary Accent

- `--color-accent`: `#2563EB` — links, active nav indicator, primary actions, data highlights
- `--color-accent-hover`: `#1D4ED8` — hover states
- `--color-accent-subtle`: `#EFF6FF` — faint tints, active row backgrounds

### Neutral

- `--color-bg`: `#FAFAFA` — page background (true off-white, chroma 0)
- `--color-surface`: `#FFFFFF` — cards, panels, tables, sidebar
- `--color-border`: `#E2E8F0` — dividers, table borders, input borders
- `--color-border-strong`: `#CBD5E1` — stronger borders when needed
- `--color-ink`: `#0F172A` — primary text, headings, data
- `--color-ink-secondary`: `#475569` — secondary text, labels, descriptions
- `--color-ink-muted`: `#64748B` — tertiary text, placeholders, disabled

### Semantic

- `--color-success`: `#16A34A`
- `--color-success-subtle`: `#F0FDF4`
- `--color-warning`: `#D97706`
- `--color-warning-subtle`: `#FFFBEB`
- `--color-danger`: `#DC2626`
- `--color-danger-subtle`: `#FEF2F2`

## Typography

### Font Family

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
```

System-first stack. No web fonts. One family carries everything.

### Scale

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `--text-xs` | 12px | 16px | timestamps, badges |
| `--text-sm` | 14px | 20px | body, table text, nav labels, buttons |
| `--text-base` | 15px | 22px | default body, card values |
| `--text-lg` | 18px | 26px | section titles |
| `--text-xl` | 20px | 28px | page title |
| `--text-2xl` | 28px | 34px | large KPI values |

### Weights

- Regular: 400 — body
- Medium: 500 — labels, nav items, buttons
- Semibold: 600 — section titles, table headers, KPI values

## Spacing

Base 4pt scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px.

- Tight grouping: 8–12px
- Section gaps: 24–32px
- Major section separation: 32–48px
- Dashboard padding: 32px
- Card padding: 24px

## Components

### Sidebar

- Width: 240px
- Background: `--color-surface`
- Border right: 1px `--color-border`
- Nav item padding: 10px 14px
- Active item: `--color-accent-subtle` background, `--color-accent` text, 3px left indicator
- Inactive item: `--color-ink-secondary` text, hover `--color-bg` background
- Border radius: 8px

### Top Bar

- Height: 56px
- Background: `--color-surface`
- Border bottom: 1px `--color-border`
- Padding: 0 32px
- Contains page title and admin menu

### Cards

- Background: `--color-surface`
- Border: 1px `--color-border`
- Border radius: 12px
- Padding: 24px
- Shadow: none

### KPI Cards

- Layout: horizontal row of 4 equal cards
- Structure: muted label, large semibold value, secondary trend text
- No shadows, no colored dots unless indicating status

### Tables

- Header: 13px medium, `--color-ink-muted`, uppercase tracking wide
- Row border: 1px `--color-border`
- Cell padding: 14px 16px
- Hover row: `--color-bg`
- Right-aligned numbers

### Buttons

- Primary: `--color-accent` bg, white text, 8px radius, 10px 16px padding
- Secondary: `--color-surface` bg, `--color-border` border, `--color-ink` text
- Ghost: transparent bg, `--color-ink-secondary` text, hover `--color-bg`
- All buttons: medium weight, 14px

### Inputs

- Height: 40px
- Border: 1px `--color-border`
- Border radius: 8px
- Padding: 0 12px
- Focus: `--color-accent` ring 2px

### Badges

- Small rounded pills
- Success: green subtle
- Warning: amber subtle
- Danger: red subtle
- Neutral: gray subtle

## Layout

- Sidebar fixed left, main area scrolls
- Main content padding: 32px
- Grid gap: 24px
- Dashboard top row: 4 KPI cards
- Dashboard middle: 2/3 trend chart + 1/3 distribution
- Dashboard bottom: 1/2 ranking + 1/2 absent students

## Motion

- Transitions: 150ms ease-out
- Only state changes (hover, focus, active) animate
- No page-load choreography
- Respect `prefers-reduced-motion`
