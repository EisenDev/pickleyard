# Paddle Stack Component

> **Document Owner:** Design & Front-End Team
> **Last Updated:** 2026-07-16
> **Status:** Active — Source of Truth

---

## 1. Purpose

The **Paddle Stack** is the core real-time coordination dashboard for court play. It shows which players are occupying each court, active time countdowns, and the queues of players waiting to play, categorized by skill level (Novice, Intermediate, Advanced).

This dashboard must update in real-time using Pusher channels. It is designed to be displayed on large monitors in the club lobby and on players' mobile browsers.

---

## 2. Page Structure & Layout

The page utilizes a full-screen vertical layout structured into two main grids:

```
┌────────────────────────────────────────────────────────┐
│  Paddle Stack [View Only]          Last Sync: 9:32:47  │  ← Page Header
├────────────────────────────────────────────────────────┤
│  COURT PLAYING GRID (2-4 Columns depending on screen)   │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐  │
│  │ Court 3  00:06│ │ Court 4  14:36│ │ Court 5  00:36│  │  ← Court Cards
│  │ [R] Reagan    │ │ [C] Cjay      │ │ [N] Niza      │  │
│  │ [L] Lheamae   │ │ [R] Ryz       │ │ [N] Neil      │  │
│  │ ...           │ │ ...           │ │ ...           │  │
│  └───────────────┘ └───────────────┘ └───────────────┘  │
├────────────────────────────────────────────────────────┤
│  WAITING QUEUES (3 Equal Columns)                      │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐│
│  │ Novice (4)     │ │ Intermed. (22) │ │ Advanced (22)  ││  ← Queue Panels
│  │ 1. Ana Paula   │ │ 1. Margayox    │ │ 1. Veejay      ││
│  │ 2. Salvador    │ │ 2. Wawad       │ │ 2. Donna       ││
│  │ ...            │ │ ...            │ │ ...            ││
│  └────────────────┘ └────────────────┘ └────────────────┘│
└────────────────────────────────────────────────────────┘
```

---

## 3. Court Card Specification

Each Court Card displays the active matching details of a court.

### Layout Details
*   **Dimensions:** Fluid width in CSS grid, minimum height `180px`.
*   **Header Bar:**
    *   Left: Court Identifier (e.g., "Court 3").
    *   Right: Monospaced countdown timer (e.g. `[14:36]`), highlighting remaining play time.
    *   Color coding:
        *   **Active Play:** Dark Navy (`#091E3A`) background, white text.
        *   **Warm-up / Under 2 mins:** Volt Lime (`#8AE234`) or Forest Teal background with dark text to alert players.
*   **Player Row (4 rows per card):**
    *   Numbered index (`1`, `2`, `3`, `4`).
    *   Avatar / initials badge (diameter: `24px`, background matching player's skill level color).
    *   Player name (primary label, bold on active play).
    *   Status indicator text ("Playing", "Warming up").
    *   Hairline divider (`1px solid --color-border`) separating player rows.

---

## 4. Skill Queue Panel Specification

Three queue columns at the bottom align players waiting to rotate onto the next available court:

### 1. Novice Queue Panel
*   **Header Accent:** Success Emerald (`#10B981`) background, white text, showing current count (e.g., `Novice Queue [4]`).
*   **Player Rows:** Card listing showing position, initials/avatar, name, and join timestamp (e.g., `Joined: 9:31 PM`).

### 2. Intermediate Queue Panel
*   **Header Accent:** Warning Amber (`#F59E0B`) background, dark text, showing count.
*   **Player Rows:** Standard list of currently waiting players.

### 3. Advanced Queue Panel
*   **Header Accent:** Info Blue (`#3B82F6`) background, white text, showing count.

### "Also Waiting" Footer (For Long Queues)
When queue lists exceed 8 players, the lists truncate to prevent vertical page bloat. A custom footer card appears at the bottom of the column:

```
┌────────────────────────────────────────────────────────┐
│ ALSO WAITING (14)                                      │
│ 9. Tsari De Lumen  10. DJ Milana  11. Nova Noreen...   │
│                                      [Tap to view all] │
└────────────────────────────────────────────────────────┘
```
*   **Style:** Very light grey background (`--color-surface`), thin border.
*   **Text:** Inline wrapping labels showing positions `9` to `N` with secondary text sizing.
*   **Action:** A text link "Tap to view all" that launches a side drawer containing the complete scrollable queue roster.

---

## 5. Stacking Interaction Rules (Staff Admin Mode)

In **Admin Mode** (accessible by staff at the front desk), the Paddle Stack interface transitions from static lists to an interactive control deck:
*   **Drag and Drop:** Dragging a player name from a queue and dropping them onto an empty court slot.
*   **Auto-Stacking Suggestion:** A button "Auto-Match next" highlights the top players in the queues based on FIFO check-in times and matches them to empty courts.
*   **Timer Reset:** Tap-and-hold on a court card header triggers a modal to pause, add time (+15m), or end a court session.

---

## 6. Token References

*   Court Card Header BG: `--color-primary` (#091E3A) / `--color-secondary` (#1E4D4D)
*   Timer Text Font: `--font-family-mono` (JetBrains Mono)
*   Queue Novice BG: `--color-success` (#10B981)
*   Queue Intermediate BG: `--color-warning` (#F59E0B)
*   Queue Advanced BG: `--color-info` (#3B82F6)
*   Also Waiting Wrapper: `--color-surface` (#F1F5F9), radius `--radius-md`
