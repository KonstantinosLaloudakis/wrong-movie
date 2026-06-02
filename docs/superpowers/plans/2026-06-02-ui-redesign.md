# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Clean & Sharp visual redesign across all six surfaces: fonts, header, clue cards, guess input, result overlay, and stats modal.

**Architecture:** Pure Tailwind class changes across existing components — no logic changes, no new files. Each task targets one surface, runs the full test suite for regression, and commits. Visual verification via `npm run dev` after each task.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 3, Fraunces (Google Fonts), Vitest

**Testing note:** These are pure styling changes. No new tests are written — instead, existing tests are run after each task to confirm no regressions. Visual verification replaces TDD here.

---

## File Map

| Action | File | Change |
|---|---|---|
| Modify | `index.html` | Add Google Fonts preconnect + Fraunces link |
| Modify | `tailwind.config.ts` | Add `fontFamily.display` |
| Modify | `src/App.tsx` | Header restyle, nav links, page bg |
| Modify | `src/components/ClueDisplay.tsx` | Colored left borders, pill badges, locked state |
| Modify | `src/pages/DailyPage.tsx` | Streak badge, wrong guess cards |
| Modify | `src/pages/EndlessPage.tsx` | Wrong guess cards (same pattern) |
| Modify | `src/components/GuessInput.tsx` | Slate input border/focus, slate-900 button |
| Modify | `src/components/ResultOverlay.tsx` | White card, pill badge, slate buttons |
| Modify | `src/components/StatsModal.tsx` | Slate-900 bars, border on modal, slate labels |

---

## Task 1: Fonts — `index.html` + `tailwind.config.ts`

**Files:**
- Modify: `index.html`
- Modify: `tailwind.config.ts`

- [ ] **Step 1.1 — Add Google Fonts to `index.html`**

Replace the entire file content:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Wrong Movie</title>
    <meta name="description" content="Guess the movie from clues using famous roles." />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@900&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 1.2 — Register display font in Tailwind**

Replace the entire file content of `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 1.3 — Run type check and tests**

```
npx tsc --noEmit
npx vitest run
```

Expected: zero TypeScript errors, all 47 tests pass.

- [ ] **Step 1.4 — Commit**

```bash
git add index.html tailwind.config.ts
git commit -m "feat(ui): add Fraunces display font via Google Fonts"
```

---

## Task 2: Header & Page Background — `src/App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 2.1 — Replace `AppShell` with restyled version**

Replace the entire contents of `src/App.tsx`:

```tsx
import { useState } from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { DailyPage } from './pages/DailyPage';
import { EndlessPage } from './pages/EndlessPage';
import { StatsModal } from './components/StatsModal';
import { useStats } from './hooks/useStats';

function AppShell() {
  const [statsOpen, setStatsOpen] = useState(false);
  const stats = useStats();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <h1 className="font-display text-xl font-black tracking-tight text-slate-900">
            🎬 Wrong Movie
          </h1>
          <nav className="flex items-center gap-1 text-sm font-semibold">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive
                  ? 'rounded-md bg-slate-100 px-3 py-1.5 text-slate-900'
                  : 'rounded-md px-3 py-1.5 text-slate-500 hover:text-slate-800'
              }
            >
              Daily
            </NavLink>
            <NavLink
              to="/play"
              className={({ isActive }) =>
                isActive
                  ? 'rounded-md bg-slate-100 px-3 py-1.5 text-slate-900'
                  : 'rounded-md px-3 py-1.5 text-slate-500 hover:text-slate-800'
              }
            >
              Endless
            </NavLink>
            <button
              aria-label="stats"
              onClick={() => setStatsOpen(true)}
              className="ml-1 rounded-md bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
            >
              📊
            </button>
          </nav>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<DailyPage onShowStats={() => setStatsOpen(true)} />} />
          <Route path="/play" element={<EndlessPage />} />
        </Routes>
      </main>
      <StatsModal
        isOpen={statsOpen}
        onClose={() => setStatsOpen(false)}
        stats={stats}
      />
    </div>
  );
}

export function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}
```

- [ ] **Step 2.2 — Run type check and tests**

```
npx tsc --noEmit
npx vitest run
```

Expected: zero errors, 47 tests pass.

- [ ] **Step 2.3 — Commit**

```bash
git add src/App.tsx
git commit -m "feat(ui): restyle header with Fraunces title and slate nav"
```

---

## Task 3: Clue Cards — `src/components/ClueDisplay.tsx`

**Files:**
- Modify: `src/components/ClueDisplay.tsx`

- [ ] **Step 3.1 — Replace with restyled version**

Replace the entire contents of `src/components/ClueDisplay.tsx`:

```tsx
import type { Difficulty, Clue } from '../types';

const LABELS: Record<Difficulty, string> = {
  hard:   'Hard',
  medium: 'Medium',
  easy:   'Easy',
};

const BADGE_CLASSES: Record<Difficulty, string> = {
  hard:   'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  easy:   'bg-green-50 text-green-700',
};

const BORDER_CLASSES: Record<Difficulty, string> = {
  hard:   'border-l-red-500',
  medium: 'border-l-amber-400',
  easy:   'border-l-green-500',
};

const ORDER: Difficulty[] = ['hard', 'medium', 'easy'];

interface Props {
  clues: { hard: Clue; medium: Clue; easy: Clue };
  revealedDifficulty: Difficulty;
}

export function ClueDisplay({ clues, revealedDifficulty }: Props) {
  const revealedIndex = ORDER.indexOf(revealedDifficulty);

  return (
    <div className="space-y-3">
      {ORDER.map((diff, i) => {
        const shown = i <= revealedIndex;
        return (
          <div
            key={`${diff}-${shown}`}
            className={
              shown
                ? `clue-entering rounded-xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm ${BORDER_CLASSES[diff]}`
                : 'rounded-xl border border-dashed border-slate-200 border-l-4 border-l-slate-200 bg-slate-50 p-4 opacity-40'
            }
          >
            <div
              className={`mb-2.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                shown ? BADGE_CLASSES[diff] : 'bg-slate-100 text-slate-400'
              }`}
            >
              {LABELS[diff]}
            </div>
            {shown ? (
              <p className="text-sm leading-relaxed text-slate-600">{clues[diff].text}</p>
            ) : (
              <p className="text-sm italic text-slate-400">
                Reveal by guessing incorrectly
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3.2 — Run type check and tests**

```
npx tsc --noEmit
npx vitest run
```

Expected: zero errors, 47 tests pass.

- [ ] **Step 3.3 — Commit**

```bash
git add src/components/ClueDisplay.tsx
git commit -m "feat(ui): colored left-border clue cards with pill difficulty badges"
```

---

## Task 4: Puzzle Meta & Wrong Guesses — `src/pages/DailyPage.tsx`

**Files:**
- Modify: `src/pages/DailyPage.tsx`

- [ ] **Step 4.1 — Update puzzle meta row and wrong guess list**

In `src/pages/DailyPage.tsx`, replace the puzzle meta div (currently lines 51–56):

```tsx
<div className="mb-4 flex items-center justify-between text-sm text-gray-500">
  <span className="font-medium text-gray-700">
    Puzzle #{puzzle.puzzleNumber}
  </span>
  <span>🔥 Streak: {streak.current}</span>
</div>
```

with:

```tsx
<div className="mb-4 flex items-center justify-between">
  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
    Puzzle #{puzzle.puzzleNumber}
  </span>
  <span className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
    🔥 Streak: {streak.current}
  </span>
</div>
```

Then replace the wrong-guess map (currently renders a flat red bar):

```tsx
{state.guesses.map((g, i) => (
  <div
    key={`${i}-${g}`}
    className="rounded bg-red-50 px-3 py-1 text-sm text-red-600"
  >
    ✗ {g}
  </div>
))}
```

with:

```tsx
{state.guesses.map((g, i) => (
  <div
    key={`${i}-${g}`}
    className="flex items-center gap-2 rounded-lg border border-red-100 bg-white px-3 py-2 text-sm font-medium text-red-600"
  >
    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-[10px]">
      ✕
    </span>
    {g}
  </div>
))}
```

- [ ] **Step 4.2 — Run type check and tests**

```
npx tsc --noEmit
npx vitest run
```

Expected: zero errors, 47 tests pass.

- [ ] **Step 4.3 — Commit**

```bash
git add src/pages/DailyPage.tsx
git commit -m "feat(ui): streak badge and bordered wrong-guess cards in DailyPage"
```

---

## Task 5: Wrong Guesses — `src/pages/EndlessPage.tsx`

**Files:**
- Modify: `src/pages/EndlessPage.tsx`

- [ ] **Step 5.1 — Update wrong guess list to match DailyPage**

In `src/pages/EndlessPage.tsx`, replace the wrong-guess map:

```tsx
{!isDone &&
  state.guesses.map((g, i) => (
    <div
      key={`${i}-${g}`}
      className="rounded bg-red-50 px-3 py-1 text-sm text-red-600"
    >
      ✗ {g}
    </div>
  ))}
```

with:

```tsx
{!isDone &&
  state.guesses.map((g, i) => (
    <div
      key={`${i}-${g}`}
      className="flex items-center gap-2 rounded-lg border border-red-100 bg-white px-3 py-2 text-sm font-medium text-red-600"
    >
      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-[10px]">
        ✕
      </span>
      {g}
    </div>
  ))}
```

- [ ] **Step 5.2 — Run type check and tests**

```
npx tsc --noEmit
npx vitest run
```

Expected: zero errors, 47 tests pass.

- [ ] **Step 5.3 — Commit**

```bash
git add src/pages/EndlessPage.tsx
git commit -m "feat(ui): bordered wrong-guess cards in EndlessPage"
```

---

## Task 6: Guess Input — `src/components/GuessInput.tsx`

**Files:**
- Modify: `src/components/GuessInput.tsx`

- [ ] **Step 6.1 — Update input border/focus and button color**

In `src/components/GuessInput.tsx`, find the `<input>` element and replace its `className`:

```tsx
// Before
className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"

// After
className="flex-1 rounded-lg border-2 border-slate-200 px-4 py-2 text-sm outline-none transition-colors focus:border-slate-900 disabled:bg-slate-100"
```

Find the `<button>` (Guess button) and replace its `className`:

```tsx
// Before
className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"

// After
className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
```

Find the autocomplete `<li>` active state (inside the `suggestions.map`) and replace its className conditional:

```tsx
// Before
className={`px-4 py-2 text-sm cursor-pointer ${
  i === activeIndex
    ? 'bg-indigo-50 text-indigo-900'
    : 'text-gray-800 hover:bg-gray-50'
}`}

// After
className={`px-4 py-2 text-sm cursor-pointer ${
  i === activeIndex
    ? 'bg-slate-100 text-slate-900'
    : 'text-slate-700 hover:bg-slate-50'
}`}
```

- [ ] **Step 6.2 — Run type check and tests**

```
npx tsc --noEmit
npx vitest run
```

Expected: zero errors, 47 tests pass.

- [ ] **Step 6.3 — Commit**

```bash
git add src/components/GuessInput.tsx
git commit -m "feat(ui): slate border/focus and slate-900 button in GuessInput"
```

---

## Task 7: Result Overlay — `src/components/ResultOverlay.tsx`

**Files:**
- Modify: `src/components/ResultOverlay.tsx`

- [ ] **Step 7.1 — Replace with restyled version**

Replace the entire contents of `src/components/ResultOverlay.tsx`:

```tsx
import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { Difficulty, GuessResult } from '../types';

const POINTS_MAP: Record<Difficulty, number> = { hard: 3, medium: 2, easy: 1 };

const BADGE_CONFIG: Record<Difficulty, { label: string; classes: string }> = {
  hard:   { label: 'Hard',   classes: 'bg-red-50 text-red-700' },
  medium: { label: 'Medium', classes: 'bg-amber-50 text-amber-700' },
  easy:   { label: 'Easy',   classes: 'bg-green-50 text-green-700' },
};

interface Props {
  result: GuessResult;
  movieTitle: string;
  posterUrl: string | null;
  difficulty: Difficulty;
  onNext?: () => void;
  onShowStats?: () => void;
  isEndless?: boolean;
}

export function ResultOverlay({
  result,
  movieTitle,
  posterUrl,
  difficulty,
  onNext,
  onShowStats,
  isEndless,
}: Props) {
  useEffect(() => {
    if (result === 'correct' && difficulty === 'hard') {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { x: 0.5, y: 1 },
        colors: ['#dc2626', '#f59e0b', '#16a34a', '#3b82f6', '#8b5cf6'],
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (result === 'unanswered') return null;

  const points = POINTS_MAP[difficulty];
  const badge = BADGE_CONFIG[difficulty];

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
      {result === 'correct' ? (
        <div className="mb-3 flex items-center justify-center gap-2">
          <span
            className={`badge-pop inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${badge.classes}`}
          >
            {badge.label}
          </span>
          <span className="text-sm font-semibold text-slate-500">
            +{points} pt{points !== 1 ? 's' : ''}
          </span>
        </div>
      ) : (
        <p className="mb-1 text-lg font-bold text-red-500">Not quite — the answer was:</p>
      )}

      <p className="text-xl font-semibold text-slate-900">{movieTitle}</p>

      {posterUrl && (
        <img
          src={posterUrl}
          alt={movieTitle}
          className="mx-auto mt-3 h-44 w-auto rounded object-cover shadow"
        />
      )}

      <div className="mt-4 flex justify-center gap-3">
        {isEndless && onNext && (
          <button
            type="button"
            onClick={onNext}
            className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Next Movie →
          </button>
        )}
        {onShowStats && (
          <button
            type="button"
            aria-label="stats"
            onClick={onShowStats}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            📊 Stats
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7.2 — Run type check and tests**

```
npx tsc --noEmit
npx vitest run
```

Expected: zero errors, 47 tests pass. Note: the ResultOverlay tests check text content and button labels — those are unchanged, so all tests should pass.

- [ ] **Step 7.3 — Commit**

```bash
git add src/components/ResultOverlay.tsx
git commit -m "feat(ui): white card, pill badge, slate buttons in ResultOverlay"
```

---

## Task 8: Stats Modal — `src/components/StatsModal.tsx`

**Files:**
- Modify: `src/components/StatsModal.tsx`

- [ ] **Step 8.1 — Replace with restyled version**

Replace the entire contents of `src/components/StatsModal.tsx`:

```tsx
import type { Stats } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  stats: Stats;
}

interface BarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

function DistributionBar({ label, count, total, color }: BarProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-xs text-slate-500">{label}</span>
      <div className="relative h-5 flex-1 overflow-hidden rounded bg-slate-100">
        <div
          className="flex h-full items-center justify-end rounded pr-2 transition-all duration-500"
          style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: color }}
        >
          <span className="text-xs font-semibold text-white">{count}</span>
        </div>
      </div>
    </div>
  );
}

export function StatsModal({ isOpen, onClose, stats }: Props) {
  if (!isOpen) return null;

  const { played, winRate, currentStreak, bestStreak, distribution } = stats;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      data-testid="stats-backdrop"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="close"
          onClick={onClose}
          className="absolute right-4 top-4 text-lg text-slate-400 hover:text-slate-700"
        >
          ×
        </button>

        <h2 className="mb-5 text-center text-base font-bold uppercase tracking-widest text-slate-700">
          Statistics
        </h2>

        <div className="mb-6 grid grid-cols-4 gap-2 text-center">
          {[
            { value: played, label: 'Played' },
            { value: `${winRate}%`, label: 'Win %' },
            { value: currentStreak, label: '🔥 Streak' },
            { value: bestStreak, label: 'Best' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-2xl font-bold text-slate-900">{value}</div>
              <div className="text-xs text-slate-400">{label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Solved on clue
          </p>
          <DistributionBar label="🔴 Hard"   count={distribution.hard}   total={played} color="#ef4444" />
          <DistributionBar label="🟡 Medium" count={distribution.medium} total={played} color="#f59e0b" />
          <DistributionBar label="🟢 Easy"   count={distribution.easy}   total={played} color="#22c55e" />
          <DistributionBar label="✗ Miss"    count={distribution.miss}   total={played} color="#94a3b8" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8.2 — Run full test suite**

```
npx tsc --noEmit
npx vitest run
```

Expected: zero errors, 47 tests pass.

- [ ] **Step 8.3 — Visual smoke test**

```
npm run dev
```

Open `http://localhost:5173/wrong-movie/` and verify:
1. Header shows "Wrong Movie" in Fraunces serif font
2. Nav links have rounded hover/active states
3. Clue cards have colored left borders and pill badges (no emoji dots)
4. Streak displays as an orange pill badge
5. Input has slate border that darkens on focus
6. Guess button is dark slate (not indigo)
7. Wrong guesses are bordered white cards with circle ✕
8. Result overlay is white with pill badge (after submitting a guess)
9. Stats modal has border and slate-colored bars

- [ ] **Step 8.4 — Commit**

```bash
git add src/components/StatsModal.tsx
git commit -m "feat(ui): slate labels and border in StatsModal"
```
