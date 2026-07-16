# Bookings Calendar Component

> **Document Owner:** Design & Front-End Team
> **Last Updated:** 2026-07-16
> **Status:** Active — Source of Truth

---

## 1. Purpose

The **Bookings Calendar** is the central court reservation interface. It provides players and staff with a matrix view of court availability, allowing them to search, select, and reserve specific courts (Courts 1 to 14) in hourly slots throughout the day (8:00 AM to 11:00 PM).

---

## 2. Page Structure & Control Bar

The header of the scheduler page houses the view selectors and date filters:

```
┌────────────────────────────────────────────────────────┐
│  My Bookings                                           │
│  View and manage your court bookings.                  │
│                                                        │
│  [ Book a Court ]                                      │
├────────────────────────────────────────────────────────┤
│  [ Calendar View ]   [ List View ]                     │  ← Sub-navigation tabs
├────────────────────────────────────────────────────────┤
│  Court: [ All Courts  v ]   Date: [ Thursday, Jul 16 ] │  ← Filters Row
└────────────────────────────────────────────────────────┘
```

### Controls Spec
*   **"Book a Court" Button:** Primary brand button styled in Navy (`--color-primary`) with hover states.
*   **Sub-Tabs:** Bordered bottom line tabs. The active tab has a Navy text color and an accent line underline, matching Avenor's layout.
*   **Filters Row:** Includes select components for court filtering and a calendar popover for date selection. Styled with thin Slate borders and `--radius-md` (8px).

---

## 3. Matrix Calendar Grid Specification

The calendar scheduler utilizes a strict tabular grid matrix.

```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│ Time    │ Court 1 │ Court 2 │ Court 3 │ Court 4 │
├─────────┼─────────┼─────────┼─────────┼─────────┤
│ 8:00 AM │ —       │ —       │ [Booked]│ —       │  ← Available cell marked by '—'
├─────────┼─────────┼─────────┼─────────┼─────────┤
│ 9:00 AM │ —       │ —       │ —       │ [Paid]  │  ← Active reservation block
├─────────┼─────────┼─────────┼─────────┼─────────┤
│ ────────┼─────────┼─────────┼─────────┼─────────┤  ← Red Real-Time Indicator Line (9:33 PM)
│ 10:00AM │ [Booked]│ —       │ —       │ —       │
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

### Layout Specifications
*   **Grid Container:** Responsive overflow-x scroll container to support 14 columns on small desktop screens without breaks.
*   **Time Column:** Sticky left column, `80px` wide, displaying hourly increments from `8:00 AM` to `11:00 PM` in monospaced, uppercase caption style.
*   **Court Columns:** 14 columns, each `120px` minimum width. Headers contain Court names in semibold primary text.
*   **Grid Cells:**
    *   Height: `50px` per hour block.
    *   Empty cells: Gray dash symbol `—` centered, color: `--color-text-disabled`.
    *   Reservation Blocks: Absolute positioned containers spanning the height of the booked slots.

---

## 4. Reservation State & Color Mappings

Rather than using random bright colors, booking blocks follow the design system's semantic color layers:

| Booking Type | Color Token | Visual Styling | Usage |
|---|---|---|---|
| **Member Paid Bookings** | `--color-info` (`#3B82F6`) | Dark blue block, white text, solid background | Standard member court hire |
| **Guest Bookings (Pending)**| `--color-warning` (`#F59E0B`)| Gold border, warning-subtle light background| Awaiting credit authorization |
| **Club Blocked / Event** | `--color-primary` (`#091E3A`) | Navy blue solid background, white labels | Tournaments, clinics, maintenance |
| **Club Sponsor Block** | `--color-secondary` (`#1E4D4D`)| Forest Teal solid background, white labels | Partner training slots |

---

## 5. Live Timeline Indicator

A critical real-time helper for players checking the schedule:
*   **Line Marker:** A solid red line (`#EF4444`, `1px` height) drawn horizontally across all court columns.
*   **Time Label:** A red badge (e.g. `9:33 PM` in JetBrains Mono font) pinned to the left edge of the line over the time axis.
*   **Positioning:** Calculated dynamically using absolute vertical offset matching the current elapsed minutes of the active hour.

---

## 6. Accessibility & Keyboard Control

*   Grid cells are keyboard navigable. Players can use the Tab key or Arrow keys to move between slots.
*   Focused cells trigger a Volt Lime outline (`--border-color-focus`).
*   Pressing Enter on an empty cell launches the "Create Booking" modal pre-filled with the selected court and time slot.
