# IdeoTrack Admin Design System

## Overview

A restrained, product-first admin dashboard for IdeoTrack. The visual system prioritizes data clarity, consistent density, and a calm professional tone. The primary accent is a teal/cyan that reads as trustworthy and modern without being overly clinical.

## Palette

### Primary Accent

- `--color-primary`: `#0891B2` — links, active nav, chart lines, progress bars, primary actions
- `--color-primary-dark`: `#0E7490` — hover states
- `--color-primary-darker`: `#164E63` — sidebar background, headings, strong text
- `--color-primary-light`: `#E0F2F7` — faint tints, chart fill

### Neutral

- `--color-bg`: `#F8FAFC` — page background (cool-tinted near-white)
- `--color-surface`: `#FFFFFF` — cards, panels, tables
- `--color-border`: `#E2E8F0` — dividers, table borders, subtle borders
- `--color-border-strong`: `#CBD5E1` — stronger borders when needed
- `--color-ink`: `#164E63` — primary text (headings, data)
- `--color-ink-secondary`: `#475569` — secondary text (labels, descriptions)
- `--color-ink-muted`: `#64748B` — tertiary text, placeholders
- `--color-success`: `#22C55E`
- `--color-warning`: `#F59E0B`
- `--color-danger`: `#EF4444`

### Ranking Colors

- Gold: `#F59E0B` — rank 1
- Silver: `#94A3B8` — rank 2
- Bronze: `#F97316` — rank 3

## Typography

### Font Family

```css
--font-sans: "Inter", "PingFang SC", "Microsoft YaHei", system-ui, -apple-system, sans-serif;
```

### Scale

| Token | Size | Usage |
|-------|------|-------|
| `--text-xs` | 12px | timestamps, tiny labels |
| `--text-sm` | 14px | body, table text, nav labels |
| `--text-base` | 16px | card values, emphasis |
| `--text-lg` | 18px | section titles |
| `--text-xl` | 24px | page title |
| `--text-2xl` | 32px | large KPI values |

### Weights

- Regular: 400 — body
- Medium: 500 — labels, nav items
- Semibold: 600 — section titles, table headers
- Bold: 700 — page title, KPI values

## Spacing

Base 4pt scale: 4, 8, 12, 16, 20, 24, 32, 48, 64px.

- Tight grouping: 8–12px
- Section gaps: 24–32px
- Major section separation: 32–48px
- Dashboard padding: 32px

## Components

### Sidebar

- Width: 256px
- Background: `--color-primary-darker` (`#164E63`)
- Nav item padding: 12px 16px
- Active item: `--color-primary` background, white text, 4px left indicator
- Inactive item: white/75 text, hover white/10 background
- Border radius: 12px

### Cards

- Background: white
- Border radius: 16px
- Padding: 24px
- Shadow: none or `0 1px 3px rgba(0,0,0,0.05)`
- Avoid nested cards

### KPI Cards

- Layout: horizontal row of 4 equal cards
- Structure: label top-left, colored dot top-right, large value, secondary text
- No shadows, no borders, white surface on gray background

### Tables

- Header: 14px medium, `--color-ink-muted`
- Row border: 1px `--color-border`
- Cell padding: 16px vertical
- Right-aligned numbers

### Links

- Default: `--color-primary`
- Hover: `--color-primary-dark` with underline

## Layout

- Dashboard main area padding: 32px
- Grid gap: 24px
- Trend chart: 2/3 width
- Distribution donut: 1/3 width
- Ranking and absent students: equal 1/2 width below

## Motion

- Transitions: 150–200ms ease-out
- Only state changes (hover, focus) animate; no page-load choreography
- Respect `prefers-reduced-motion`
