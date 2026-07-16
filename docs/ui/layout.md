# Layout System

> **Document Owner:** Design & Front-End Team
> **Last Updated:** 2026-07-16
> **Status:** Active — Source of Truth

---

## 1. Page Shell Architecture

All authenticated member and admin screens share a consistent layout container:

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER (height: 56px, sticky top, z-index: 300)             │
├──────────────────────────────────────────────────────────────┤
│           │                                                  │
│  SIDEBAR  │             CONTENT AREA                        │
│  (220px)  │   padding: 32px all sides                       │
│  fixed    │                                                  │
│  left 0   │   max-width: 1400px, centered if wider          │
│  top 0    │                                                  │
│  z: 200   │                                                  │
│  bg:      │                                                  │
│  #F1F5F9  │   bg: --color-bg-primary (#F8FAFC)              │
└───────────┴─────────────────────────────────────────────────┘
```

---

## 2. Content Area Specifications

*   **Margin Left:** Pushes `220px` (`--sidebar-width`) to clear the fixed sidebar drawer.
*   **Horizontal Padding:** `32px` (`--spacing-page-x`) for comfortable breathing room.
*   **Vertical Padding:** `32px` (`--spacing-page-y`).
*   **Max Width:** `1400px` (`--content-max-width`) to prevent columns from stretching unreadably on wide displays.
*   **Alignment:** Horizontally centered (`margin: 0 auto`) when container exceeds max width constraints.

---

## 3. Grid Systems

### Stat Cards (Dashboard Top)
*   **Layout:** CSS Grid.
*   **Columns:** `repeat(4, 1fr)` on desktop.
*   **Gap:** `16px` (`--grid-gap`).
*   **Responsive Scaling:**
    *   Tablets ($768\text{px}$ to $1023\text{px}$): `repeat(2, 1fr)`.
    *   Mobiles ($< 768\text{px}$): `1fr` (vertical single column).

### Main Dashboard Grid
*   **Layout:** CSS Grid.
*   **Columns:** `3fr 2fr` (60% / 40% distribution).
*   **Gap:** `24px` (`--grid-gap-lg`).
*   **Rosters:**
    *   Left Column: Upcoming Bookings / Real-Time active court card previews.
    *   Right Column: Active queues count summary and check-in QR quick-links.

### Paddle Stack Grid
*   **Top (Courts):** CSS Grid matching `repeat(auto-fill, minmax(280px, 1fr))` to render active court cards.
*   **Bottom (Queues):** 3-Column flexbox wrapper representing Novice, Intermediate, and Advanced lanes. On mobile, this stacks into a single scrollable queue view.

---

## 4. Breakpoint Configurations

| Name | Query Width | Layout Modifications |
|---|---|---|
| **Mobile** | $< 768\text{px}$ | Sidebar shifts to drawer; grid items collapse to full width (`1fr`). |
| **Tablet** | $768\text{px}$ to $1023\text{px}$ | Sidebar operates via toggle; stat cards transition to $2\times 2$ matrix. |
| **Desktop**| $\ge 1024\text{px}$ | Full structural sidebar, 4-column metrics, 3:2 dashboard split. |
| **Wide** | $\ge 1440\text{px}$ | Page content is centered inside maximum bounds. |

---

## 5. Page Title Block

Each sub-page renders a standardized header banner to match the Avenor structural tone:

```
┌────────────────────────────────────────────────────────┐
│  Good morning, Arjay 👋                [ Join Open Play]│  ← Primary CTA
│  Ready to start your pickleball journey?                │  ← Subtitle
└────────────────────────────────────────────────────────┘
```
*   **Title:** `--font-size-h1` (30px), bold weight, Court Navy primary.
*   **Subtitle:** `--font-size-body` (15px), Slate secondary text.
*   **Margin-Bottom:** `32px` (`--spacing-8`) to separate title blocks from content cards.
