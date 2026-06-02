# UI Redesign — Design Spec

**Date:** 2026-06-02  
**Status:** Approved

## Summary

Full visual redesign of Wrong Movie in the "Clean & Sharp" direction: light background, colored left-border clue cards, pill difficulty badges, one display font (Fraunces) for the title, and deep slate as the primary accent color. Every surface gets updated — header, game area, result overlay, and stats modal.

## Design Decisions

| Question | Decision |
|---|---|
| Direction | Clean & Sharp — light background, strong typographic hierarchy |
| Scope | Full — header, game area, result overlay, stats modal |
| Font | Fraunces (Google Fonts) for title/display only; Inter (system fallback) for body |
| Accent color | Deep slate (`#0f172a` / `slate-900`) replaces indigo |
| Clue card style | White card with 4px colored left border + pill badge |
| Background | `slate-50` (`#f8fafc`) instead of white |

## Typography

- **Display font:** [Fraunces](https://fonts.google.com/specimen/Fraunces) — variable serif, loaded via Google Fonts. Used only for the "Wrong Movie" header title (`font-weight: 900`).
- **Body font:** `Inter` with system-ui fallback. All other text stays sans-serif.
- Load via `<link>` in `index.html`:  
  `https://fonts.googleapis.com/css2?family=Fraunces:wght@900&family=Inter:wght@400;500;600;700&display=swap`
- Add Tailwind config entry for `fontFamily.display: ['Fraunces', 'serif']`.

## Color System

| Token | Value | Usage |
|---|---|---|
| `slate-50` | `#f8fafc` | Page background |
| `slate-900` | `#0f172a` | Primary button, focus rings, strong text |
| `slate-200` | `#e2e8f0` | Input border (unfocused), card border |
| `red-500` | `#ef4444` | Hard clue left border |
| `amber-400` | `#fbbf24` | Medium clue left border |
| `green-500` | `#22c55e` | Easy clue left border |
| `red-50 / red-700` | — | Hard badge background / text |
| `amber-50 / amber-700` | — | Medium badge background / text |
| `green-50 / green-700` | — | Easy badge background / text |
| `orange-50 / orange-700` | — | Streak badge |

## Component Changes

### Header (`App.tsx` + global styles)

- Background: `bg-white border-b border-slate-200` (was no border)
- Title: `font-display font-black text-slate-900` — Fraunces, size `text-xl`
- Nav links: `text-sm font-semibold text-slate-500`, active = `text-slate-900 bg-slate-100 rounded-md`
- Stats icon button: `bg-slate-100 rounded-md` hover `bg-slate-200`

### Clue Cards (`ClueDisplay.tsx`)

**Revealed card:**
- `bg-white rounded-xl border border-slate-200 border-l-4 shadow-sm p-4`
- Left border color class per difficulty: `border-l-red-500` / `border-l-amber-400` / `border-l-green-500`

**Difficulty badge (replaces emoji dot label):**
- `inline-flex items-center text-[10px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-full mb-2.5`
- Hard: `bg-red-50 text-red-700`
- Medium: `bg-amber-50 text-amber-700`
- Easy: `bg-green-50 text-green-700`
- Remove difficulty emoji (🔴🟡🟢) — color alone communicates difficulty. The streak 🔥 emoji is kept as decorative personality.

**Clue text:** `text-sm text-slate-600 leading-relaxed`

**Locked card:**
- `opacity-40 border-dashed border-slate-200 border-l-slate-200` (no color on left border)
- Badge: `bg-slate-100 text-slate-400`
- Text: `text-sm italic text-slate-400`

### Guess Input (`GuessInput.tsx`)

- Input: `border-2 border-slate-200 focus:border-slate-900 rounded-lg text-sm` (was indigo focus ring)
- Button: `bg-slate-900 hover:bg-slate-700 text-white` (was `bg-indigo-600`)
- Autocomplete dropdown: border `border-slate-200`, active item `bg-slate-50`

### Wrong Guess List (`DailyPage.tsx` + `EndlessPage.tsx`)

Replace flat red bar with bordered card:
- `flex items-center gap-2 bg-white border border-red-100 rounded-lg px-3 py-2 text-sm text-red-600 font-medium`
- Circle ✕ icon: `w-4 h-4 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-[10px]`

### Puzzle Meta Row (`DailyPage.tsx`)

- "Puzzle #N": `text-[11px] font-bold tracking-widest uppercase text-slate-400`
- Streak: replace plain text with badge — `bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-2.5 py-1 rounded-full`

### Result Overlay (`ResultOverlay.tsx`)

- Card background: `bg-white border border-slate-200 rounded-xl shadow-sm`
- Score badges (Hard/Medium/Easy): pill style consistent with clue badges
- Stats and Share buttons: `bg-slate-900 text-white` (primary) and `border border-slate-200 bg-white text-slate-700` (secondary)

### Stats Modal (`StatsModal.tsx`)

- Modal: `bg-white rounded-2xl shadow-xl border border-slate-200`
- Distribution bars: filled with `bg-slate-900`, background `bg-slate-100`
- Labels and numbers: consistent slate type scale

## What Does Not Change

- Layout / max-width (`max-w-lg`) — unchanged
- Animations (shake on wrong guess, slide-down clue reveal) — unchanged
- Autocomplete dropdown behavior — unchanged
- All game logic — untouched

## Out of Scope

- Dark mode toggle
- Mobile-specific layout changes beyond what Tailwind responsive handles naturally
- Animation redesign
