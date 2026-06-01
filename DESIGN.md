# AutoCat — UI Design Spec

## Product in one paragraph

AutoCat is a local web app that takes a messy folder of Chrome bookmarks and uses Claude to group them into a handful of meaningful categories. The user lands on a **home grid of category cards** (one per category, each showing a stack of the bookmarks inside), clicks into a **category detail page** to review/edit assignments, then exports a new `bookmarks.html` to re-import into Chrome. Single-user, runs at `localhost:3000`, no auth.

## Tone & visual direction

- **Calm and orderly**, not noisy. The whole product is about turning chaos into structure — the UI should feel like that resolution.
- **Tactile** — the card-stack metaphor is the signature visual. Cards should feel like physical objects you could pick up. Subtle shadows, slight rotation on the stack underneath, hover lift.
- **Light mode primary**, with a dark mode that follows system preference. Neutral background (warm off-white in light, near-black in dark), categories distinguished by accent color + emoji.
- Typography: one humanist sans (e.g. Inter, Geist, or system-ui). Generous line-height. Bookmark titles in a slightly smaller weight than category names.
- **No dense data tables, no chrome (toolbars/sidebars).** The interface is mostly whitespace and cards.

## Information architecture

Three screens. Linear flow until you land on Home, then free navigation.

```
Setup  →  Source  →  Categorizing…  →  Home (cards)  ⇄  Category detail
                                            │
                                            └→  Export
```

## Screen 1 — Home (category grid)

The signature screen. A responsive grid of category cards.

### Layout
- **Header:** AutoCat logo/wordmark (top-left), bookmark count + source filename (subtitle), Settings icon (top-right).
- **Subheader row:** "247 bookmarks → 7 categories" + an `[Export bookmarks.html]` primary button (top-right of this row).
- **Card grid:** responsive — 4 cols ≥1280px, 3 cols ≥960px, 2 cols ≥640px, 1 col below. Generous gutters (24–32px).
- **Footer:** quiet — "Categorized with Claude · [Recategorize]".

### Category card anatomy (signature component)

```
┌────────────────────────────────────────┐
│  📖  Learning                      42  │   ← emoji, name, count
│  ML papers, design reads, talks        │   ← LLM summary (1 line, clamp)
│                                         │
│    ┌──────────────────────────────┐    │   ← top of stack: most representative bookmark
│    │  🔗  Attention Is All You... │    │      (favicon + title, truncate)
│    └──┬───────────────────────────┘    │
│       │  🔗  The Bitter Lesson    │    │   ← second card, peeking out beneath
│       └──┬────────────────────────┘    │
│          │  🔗  Refactoring — M...│    │   ← third card
│          └─────────────────────────┘   │
│                                         │
│                            View all → │   ← affordance, only visible on hover
└────────────────────────────────────────┘
```

- **Stack visual:** 3 mini-cards. Each one beneath the previous is offset down-right by ~8–12px, and rotated 1–2° to feel hand-stacked. Subtle drop-shadow on each. The top card is the "most representative" bookmark (for v1: just the first bookmark in the category; later: LLM-picked).
- **Card surface:** rounded 12–16px, soft shadow, light border. On hover: lifts ~4px, shadow deepens, "View all →" fades in.
- **Click target:** entire card is clickable, navigates to `#/category/:id`.
- **Per-category accent color:** a 5–7 color palette (muted, distinct) cycled across categories. Used only as a left edge stripe or as the emoji background — never the whole card.
- **Count badge:** top-right, monospaced numeric, subdued.
- **Empty category (0 bookmarks):** shouldn't happen post-assignment, but if it does — show a single dashed-outline empty card slot with "no bookmarks".

### States
- **Loading (during categorization):** replace the grid with a centered progress block: "Asking Claude to invent categories…" → "Categorized 80 of 247". A row of skeleton cards (3 deep, no content) at the bottom hints at what's coming.
- **Empty source (no bookmarks loaded):** route to `#/source` instead of showing Home.
- **All in one category:** still show one big card; this is a valid outcome, not an error.

## Screen 2 — Category detail (`#/category/:id`)

User lands here after clicking a card. Editing happens here.

### Layout

```
┌────────────────────────────────────────────────────┐
│  ← Back to all categories                          │
│                                                     │
│  📖  Learning  ✎                              42   │   ← inline-editable name
│  ML papers, design reads, conference talks         │   ← editable summary on click
│                                                     │
│  ──────────────────────────────────────────────    │
│                                                     │
│  📄  Attention Is All You Need        [Move ▾]    │
│      arxiv.org/abs/1706.03762                      │
│                                                     │
│  📄  The Bitter Lesson                 [Move ▾]    │
│      incompleteideas.net/IncIdeas/...              │
│                                                     │
│  📄  Refactoring — Martin Fowler       [Move ▾]    │
│      refactoring.com                               │
│                                                     │
│  …                                                 │
└────────────────────────────────────────────────────┘
```

- **Back link:** top-left, takes user to `#/home`.
- **Category header:**
  - Emoji + name (large, ~28–32px). Pencil icon next to the name; click toggles inline edit. `Enter` saves, `Esc` cancels.
  - Below the name: 1-line summary, also click-to-edit.
  - Right-aligned count.
- **Bookmark list:**
  - Each row: favicon (fetched from `https://www.google.com/s2/favicons?domain=…`), title (link to URL, opens in new tab), URL (truncated, muted color).
  - Right side: `[Move ▾]` dropdown listing all *other* categories. Selecting one immediately moves the bookmark and updates counts (optimistic).
  - Hover row: row tint, dropdown becomes more prominent.
- **No bulk-select for v1** — single-bookmark moves only. Bulk is a later polish.

### States
- **Empty after moves:** "No bookmarks left in this category. [Delete category]" — deleting returns to home.
- **A move fails server-side:** undo the optimistic update, show a small toast at bottom-right: "Couldn't move that bookmark. Try again."

## Screen 0 — Setup / Source (utility screens)

These are functional, not signature. Keep them simple — centered single-column, ~480px max width.

- **Setup:** card titled "Claude Code". Two states:
  - ✓ "Claude Code detected (v2.1.0)" — green check, plus a model dropdown.
  - ✗ "Claude Code not found" — install link + a [Recheck] button.
  - Below: `[Continue →]` (disabled until detected).
- **Source:** card titled "Where are your bookmarks?". Two side-by-side options:
  - "Use Chrome bookmarks" — dropdown of detected profiles, then a folder picker (tree view).
  - "Or drop a bookmarks.html" — dashed dropzone.
  - `[Categorize →]` button at the bottom.

## Components inventory

1. **CategoryCard** — the stacked-deck card (home grid).
2. **MiniBookmarkCard** — the small card inside the stack (also reused in skeletons).
3. **BookmarkRow** — the list row on detail page.
4. **InlineEditable** — text that flips between display and input on click (used for category name + summary).
5. **MoveDropdown** — searchable dropdown of categories.
6. **PrimaryButton** — `Export bookmarks.html`, `Categorize →`.
7. **SecondaryButton** — `Recheck`, `Recategorize`, etc.
8. **ProgressBlock** — large centered status during categorization.
9. **Toast** — bottom-right transient message.

## Color & emoji per category

The LLM returns an emoji per category (single char). The accent color is **not** LLM-chosen — pick from a fixed 7-color palette deterministically by category index, so colors stay consistent and accessible. Palette suggestion (muted, all WCAG-AA against the card background):

| # | Light mode hex          | Dark mode hex |
|---|-------------------------|---------------|
| 1 | `#E9846A` (terracotta)  | `#F0967C`     |
| 2 | `#6A9E8E` (sage)        | `#7CB29F`     |
| 3 | `#8A7CAE` (lavender)    | `#A092C2`     |
| 4 | `#D9B26B` (mustard)     | `#E5C281`     |
| 5 | `#6B8AAE` (slate blue)  | `#809DBE`     |
| 6 | `#B86C8C` (rose)        | `#CC819F`     |
| 7 | `#7AA67A` (moss)        | `#92BA92`     |

If there are more than 7 categories, cycle.

## Responsive & accessibility

- **Smallest target:** 360px wide (single-column cards, full-width detail rows). Even though this is a local web app, the cards should still feel right at laptop sizes — design at 1280px and 1440px reference widths.
- **Keyboard:** Tab through cards on home, Enter to open. Tab through bookmark rows on detail; the Move dropdown opens with Space/Enter.
- **Focus rings:** visible, accent-colored, 2px.
- **Reduced motion:** the hover lift and the stack rotation respect `prefers-reduced-motion` — they flatten/disable rather than animate.
- **Screen reader:** each card announces "Learning category, 42 bookmarks, button". The stack is decorative (`aria-hidden`); the count and summary carry the meaning.

## Deliverables wanted

1. Screens: Home, Category detail, Setup, Source, Categorizing (progress), Empty home, Error toast.
2. Light + dark mode versions of Home and Category detail.
3. Hover/focus states for `CategoryCard` and `BookmarkRow`.
4. The stack illustration as a polished component (the rotation/offset choices matter — this is the brand moment).
5. Token list: spacing scale, type scale, palette (including the 7 category accents), shadows, radii.

## Out of scope for v1

- Multi-select / bulk move of bookmarks.
- Drag-and-drop between cards.
- Per-category cover art / hero images.
- Mobile (<360px). Desktop-first; phone layout is later.
- Onboarding tour. The app is small enough that the linear setup flow is its own onboarding.
