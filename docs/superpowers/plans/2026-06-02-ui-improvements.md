# UI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a stats modal with full game history, polish the result screen with animated badge and Hard-only confetti, and animate clue unlocks with a slide-down effect.

**Architecture:** Three independent feature layers built bottom-up — types first, then data (useStats, useDailyPuzzle history), then UI (StatsModal, ResultOverlay, ClueDisplay), then wiring (App, DailyPage). Each task produces a working, committable unit.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest + Testing Library, canvas-confetti (new dep)

---

## File Map

**New files:**
- `src/hooks/useStats.ts` — pure computation + hook for game history stats
- `src/components/StatsModal.tsx` — modal UI component

**Modified files:**
- `src/types/index.ts` — add `GameHistoryEntry`, `GameHistory`, `Stats` types
- `src/index.css` — add `clueSlideDown` and `badgePop` keyframe animations
- `src/hooks/useDailyPuzzle.ts` — append `game-history` entry on round end
- `src/components/ClueDisplay.tsx` — key-based remount for slide animation
- `src/components/ResultOverlay.tsx` — win badge, confetti on Hard, Stats button
- `src/App.tsx` — stats icon in header, `statsOpen` state, render `<StatsModal>`
- `src/pages/DailyPage.tsx` — pass `onShowStats` to `ResultOverlay`
- `package.json` — add `canvas-confetti`

---

## Task 1: Add types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add the three new types after the existing `StreakData` interface**

```ts
export type GameResultType = 'hard' | 'medium' | 'easy' | 'miss';

export interface GameHistoryEntry {
  date: string;          // "YYYY-MM-DD"
  result: GameResultType;
  puzzleNumber: number;
}

export type GameHistory = GameHistoryEntry[];

export interface Stats {
  played: number;
  winRate: number;       // 0–100, rounded
  currentStreak: number;
  bestStreak: number;
  distribution: {
    hard: number;
    medium: number;
    easy: number;
    miss: number;
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add GameHistoryEntry, GameHistory, Stats types"
```

---

## Task 2: useStats hook + tests

**Files:**
- Create: `src/hooks/useStats.ts`
- Create: `src/hooks/useStats.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useStats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeStats } from './useStats';
import type { GameHistory, StreakData } from '../types';

const streak: StreakData = { current: 3, best: 7, lastPlayedDate: '2026-06-02' };

describe('computeStats', () => {
  it('returns zeroed stats for empty history', () => {
    const result = computeStats([], streak);
    expect(result.played).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.distribution).toEqual({ hard: 0, medium: 0, easy: 0, miss: 0 });
  });

  it('counts played and distribution correctly', () => {
    const history: GameHistory = [
      { date: '2026-06-01', result: 'hard', puzzleNumber: 1 },
      { date: '2026-06-02', result: 'medium', puzzleNumber: 2 },
      { date: '2026-06-03', result: 'easy', puzzleNumber: 3 },
      { date: '2026-06-04', result: 'miss', puzzleNumber: 4 },
    ];
    const result = computeStats(history, streak);
    expect(result.played).toBe(4);
    expect(result.distribution).toEqual({ hard: 1, medium: 1, easy: 1, miss: 1 });
  });

  it('computes winRate as percentage of non-miss results', () => {
    const history: GameHistory = [
      { date: '2026-06-01', result: 'hard', puzzleNumber: 1 },
      { date: '2026-06-02', result: 'medium', puzzleNumber: 2 },
      { date: '2026-06-03', result: 'miss', puzzleNumber: 3 },
      { date: '2026-06-04', result: 'miss', puzzleNumber: 4 },
    ];
    const result = computeStats(history, streak);
    expect(result.winRate).toBe(50);
  });

  it('rounds winRate to nearest integer', () => {
    const history: GameHistory = [
      { date: '2026-06-01', result: 'hard', puzzleNumber: 1 },
      { date: '2026-06-02', result: 'hard', puzzleNumber: 2 },
      { date: '2026-06-03', result: 'miss', puzzleNumber: 3 },
    ];
    const result = computeStats(history, streak);
    expect(result.winRate).toBe(67); // 2/3 = 66.6... → 67
  });

  it('sources streak values from the streak argument', () => {
    const result = computeStats([], { current: 5, best: 12, lastPlayedDate: null });
    expect(result.currentStreak).toBe(5);
    expect(result.bestStreak).toBe(12);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd c:/workspace/wrong-movie && npx vitest run src/hooks/useStats.test.ts
```

Expected: FAIL — `computeStats` not found.

- [ ] **Step 3: Create `src/hooks/useStats.ts`**

```ts
import { useLocalStorage } from './useLocalStorage';
import type { GameHistory, StreakData, Stats } from '../types';

export function computeStats(history: GameHistory, streak: StreakData): Stats {
  const played = history.length;
  const distribution = { hard: 0, medium: 0, easy: 0, miss: 0 };

  if (played === 0) {
    return {
      played: 0,
      winRate: 0,
      currentStreak: streak.current,
      bestStreak: streak.best,
      distribution,
    };
  }

  for (const entry of history) {
    distribution[entry.result]++;
  }

  const wins = played - distribution.miss;
  return {
    played,
    winRate: Math.round((wins / played) * 100),
    currentStreak: streak.current,
    bestStreak: streak.best,
    distribution,
  };
}

export function useStats(): Stats {
  const [history] = useLocalStorage<GameHistory>('game-history', []);
  const [streak] = useLocalStorage<StreakData>('streak', {
    current: 0,
    best: 0,
    lastPlayedDate: null,
  });
  return computeStats(history, streak);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/hooks/useStats.test.ts
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useStats.ts src/hooks/useStats.test.ts
git commit -m "feat(stats): add computeStats pure function and useStats hook"
```

---

## Task 3: Append game-history in useDailyPuzzle

**Files:**
- Modify: `src/hooks/useDailyPuzzle.ts`

- [ ] **Step 1: Add the `game-history` localStorage hook and append on round end**

Open `src/hooks/useDailyPuzzle.ts`. Make these changes:

Add import for `GameHistory` and `GameResultType` at the top:

```ts
import type {
  Puzzle,
  RoundState,
  DailyResult,
  StreakData,
  Difficulty,
  GameHistory,
  GameResultType,
} from '../types';
```

Add the game-history hook immediately after the `streak` hook (around line 38):

```ts
const [, setGameHistory] = useLocalStorage<GameHistory>(
  'game-history',
  []
);
```

Add a helper function `appendHistory` before `submitGuess`:

```ts
function appendHistory(result: GameResultType, puzzleNumber: number) {
  setGameHistory((prev) => {
    if (prev.some((e) => e.date === todayStr())) return prev; // idempotent
    return [...prev, { date: todayStr(), result, puzzleNumber }];
  });
}
```

In `submitGuess`, call `appendHistory` on each terminal branch:

In the `correct` branch (after `updateStreak(true)`):
```ts
appendHistory(state.revealedDifficulty, puzzle.puzzleNumber);
```

In the `else` (game-over wrong) branch (after `updateStreak(false)`):
```ts
appendHistory('miss', puzzle.puzzleNumber);
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useDailyPuzzle.ts
git commit -m "feat(stats): append game-history entry on daily round end"
```

---

## Task 4: Add CSS animations

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Append the two new keyframe animations**

Open `src/index.css` and append after the existing `.shake` rule:

```css
@keyframes clueSlideDown {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.clue-entering {
  animation: clueSlideDown 0.35s ease-out both;
}

@keyframes badgePop {
  0%   { transform: scale(0.8); opacity: 0; }
  60%  { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}
.badge-pop {
  animation: badgePop 0.3s ease-out both;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "feat(animations): add clueSlideDown and badgePop keyframes"
```

---

## Task 5: ClueDisplay slide animation

**Files:**
- Modify: `src/components/ClueDisplay.tsx`

- [ ] **Step 1: Update ClueDisplay to use key-based remount for slide animation**

Replace the entire content of `src/components/ClueDisplay.tsx` with:

```tsx
import type { Difficulty, Clue } from '../types';

const LABELS: Record<Difficulty, string> = {
  hard: '🔴 Hard',
  medium: '🟡 Medium',
  easy: '🟢 Easy',
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
            className={`rounded-lg border p-4 ${
              shown
                ? 'clue-entering border-gray-200 bg-white shadow-sm'
                : 'border-dashed border-gray-200 bg-gray-50 opacity-40'
            }`}
          >
            <div className="mb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">
              {LABELS[diff]}
            </div>
            {shown ? (
              <p className="text-gray-800 leading-relaxed">{clues[diff].text}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">
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

The key change: `key={diff}` → `key={\`${diff}-${shown}\`}`. When `shown` flips from `false` to `true` (clue unlocks), React remounts the element, triggering the `clue-entering` animation. The hard clue's key is `hard-true` from the first render and never changes, so it animates once on load and never again.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ClueDisplay.tsx
git commit -m "feat(animation): slide-down reveal when clue unlocks"
```

---

## Task 6: StatsModal component + tests

**Files:**
- Create: `src/components/StatsModal.tsx`
- Create: `src/components/StatsModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/StatsModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatsModal } from './StatsModal';
import type { Stats } from '../types';

const stats: Stats = {
  played: 20,
  winRate: 75,
  currentStreak: 4,
  bestStreak: 9,
  distribution: { hard: 3, medium: 8, easy: 4, miss: 5 },
};

describe('StatsModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <StatsModal isOpen={false} onClose={vi.fn()} stats={stats} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows summary numbers when open', () => {
    render(<StatsModal isOpen={true} onClose={vi.fn()} stats={stats} />);
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('shows distribution counts', () => {
    render(<StatsModal isOpen={true} onClose={vi.fn()} stats={stats} />);
    expect(screen.getByText('3')).toBeInTheDocument();  // hard
    expect(screen.getByText('8')).toBeInTheDocument();  // medium
    expect(screen.getByText('4')).toBeInTheDocument();  // easy — shares value with streak but that's fine
    expect(screen.getByText('5')).toBeInTheDocument();  // miss
  });

  it('calls onClose when × button is clicked', () => {
    const onClose = vi.fn();
    render(<StatsModal isOpen={true} onClose={onClose} stats={stats} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<StatsModal isOpen={true} onClose={onClose} stats={stats} />);
    fireEvent.click(screen.getByTestId('stats-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/StatsModal.test.tsx
```

Expected: FAIL — `StatsModal` not found.

- [ ] **Step 3: Create `src/components/StatsModal.tsx`**

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
      <span className="w-16 text-xs text-gray-500">{label}</span>
      <div className="relative h-5 flex-1 overflow-hidden rounded bg-gray-100">
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
        className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="close"
          onClick={onClose}
          className="absolute right-4 top-4 text-lg text-gray-400 hover:text-gray-700"
        >
          ×
        </button>

        <h2 className="mb-5 text-center text-base font-bold uppercase tracking-widest text-gray-700">
          Statistics
        </h2>

        {/* Summary numbers */}
        <div className="mb-6 grid grid-cols-4 gap-2 text-center">
          {[
            { value: played, label: 'Played' },
            { value: `${winRate}%`, label: 'Win %' },
            { value: currentStreak, label: '🔥 Streak' },
            { value: bestStreak, label: 'Best' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          ))}
        </div>

        {/* Distribution */}
        <div className="space-y-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Solved on clue
          </p>
          <DistributionBar label="🔴 Hard"   count={distribution.hard}   total={played} color="#dc2626" />
          <DistributionBar label="🟡 Medium" count={distribution.medium} total={played} color="#d97706" />
          <DistributionBar label="🟢 Easy"   count={distribution.easy}   total={played} color="#16a34a" />
          <DistributionBar label="✗ Miss"    count={distribution.miss}   total={played} color="#9ca3af" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/StatsModal.test.tsx
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/StatsModal.tsx src/components/StatsModal.test.tsx
git commit -m "feat(stats): add StatsModal component with distribution bars"
```

---

## Task 7: Wire StatsModal into App

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update App.tsx to add stats icon, state, and modal**

Replace the entire content of `src/App.tsx`:

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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">🎬 Wrong Movie</h1>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-800'
              }
            >
              Daily
            </NavLink>
            <NavLink
              to="/play"
              className={({ isActive }) =>
                isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-800'
              }
            >
              Endless
            </NavLink>
            <button
              aria-label="stats"
              onClick={() => setStatsOpen(true)}
              className="text-gray-500 hover:text-gray-800"
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

Note: `DailyPage` now receives an `onShowStats` prop — TypeScript will error until Task 9 wires it up. Proceed to the next task immediately.

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat(stats): add stats icon to header and wire StatsModal in App"
```

---

## Task 8: ResultOverlay polish — badge, confetti, Stats button

**Files:**
- Modify: `src/components/ResultOverlay.tsx`

- [ ] **Step 1: Install canvas-confetti**

```bash
cd c:/workspace/wrong-movie && npm install canvas-confetti && npm install -D @types/canvas-confetti
```

Expected: package-lock.json updated, no errors.

- [ ] **Step 2: Write failing tests for the badge**

Add to `src/components/ResultOverlay.test.tsx` (create file):

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultOverlay } from './ResultOverlay';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

describe('ResultOverlay', () => {
  it('renders nothing when result is unanswered', () => {
    const { container } = render(
      <ResultOverlay result="unanswered" movieTitle="Inception" posterUrl={null} difficulty="hard" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows Hard badge with +3 pts on hard correct', () => {
    render(
      <ResultOverlay result="correct" movieTitle="Inception" posterUrl={null} difficulty="hard" />
    );
    expect(screen.getByText(/🔴 Hard/)).toBeInTheDocument();
    expect(screen.getByText(/\+3 pts/)).toBeInTheDocument();
  });

  it('shows Medium badge with +2 pts on medium correct', () => {
    render(
      <ResultOverlay result="correct" movieTitle="Inception" posterUrl={null} difficulty="medium" />
    );
    expect(screen.getByText(/🟡 Medium/)).toBeInTheDocument();
    expect(screen.getByText(/\+2 pts/)).toBeInTheDocument();
  });

  it('shows Easy badge with +1 pt on easy correct', () => {
    render(
      <ResultOverlay result="correct" movieTitle="Inception" posterUrl={null} difficulty="easy" />
    );
    expect(screen.getByText(/🟢 Easy/)).toBeInTheDocument();
    expect(screen.getByText(/\+1 pt/)).toBeInTheDocument();
  });

  it('shows wrong message on incorrect result', () => {
    render(
      <ResultOverlay result="wrong" movieTitle="Inception" posterUrl={null} difficulty="easy" />
    );
    expect(screen.getByText(/not quite/i)).toBeInTheDocument();
  });

  it('shows Stats button when onShowStats is provided', () => {
    render(
      <ResultOverlay
        result="correct"
        movieTitle="Inception"
        posterUrl={null}
        difficulty="hard"
        onShowStats={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /stats/i })).toBeInTheDocument();
  });

  it('does not show Stats button without onShowStats prop', () => {
    render(
      <ResultOverlay result="correct" movieTitle="Inception" posterUrl={null} difficulty="hard" />
    );
    expect(screen.queryByRole('button', { name: /stats/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/components/ResultOverlay.test.tsx
```

Expected: FAIL — badge text not found.

- [ ] **Step 4: Rewrite ResultOverlay with badge, confetti, Stats button**

Replace the entire content of `src/components/ResultOverlay.tsx`:

```tsx
import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { Difficulty, GuessResult } from '../types';

const POINTS_MAP: Record<Difficulty, number> = { hard: 3, medium: 2, easy: 1 };

const BADGE_CONFIG: Record<Difficulty, { label: string; bg: string }> = {
  hard:   { label: '🔴 Hard',   bg: 'bg-red-600' },
  medium: { label: '🟡 Medium', bg: 'bg-amber-500' },
  easy:   { label: '🟢 Easy',   bg: 'bg-green-600' },
};

const OVERLAY_BG: Record<Difficulty, string> = {
  hard:   'bg-red-50',
  medium: 'bg-amber-50',
  easy:   'bg-green-50',
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
  const overlayBg = result === 'correct' ? OVERLAY_BG[difficulty] : 'bg-white';

  return (
    <div className={`mt-4 rounded-lg border border-gray-200 p-5 text-center shadow-sm ${overlayBg}`}>
      {result === 'correct' ? (
        <div
          className={`badge-pop mx-auto mb-2 inline-block rounded-full px-4 py-1.5 text-sm font-bold text-white ${badge.bg}`}
        >
          {badge.label} · +{points} pt{points !== 1 ? 's' : ''}
        </div>
      ) : (
        <p className="text-lg font-bold text-red-500">Not quite — the answer was:</p>
      )}

      <p className="mt-1 text-xl font-semibold text-gray-900">{movieTitle}</p>

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
            className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Next Movie →
          </button>
        )}
        {onShowStats && (
          <button
            type="button"
            aria-label="stats"
            onClick={onShowStats}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            📊 Stats
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/components/ResultOverlay.test.tsx
```

Expected: PASS — 7 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/ResultOverlay.tsx src/components/ResultOverlay.test.tsx package.json package-lock.json
git commit -m "feat(result): animated badge, Hard confetti, Stats button in ResultOverlay"
```

---

## Task 9: Wire DailyPage

**Files:**
- Modify: `src/pages/DailyPage.tsx`

- [ ] **Step 1: Add onShowStats prop and pass it through**

Replace the entire content of `src/pages/DailyPage.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { useDailyPuzzle } from '../hooks/useDailyPuzzle';
import { ClueDisplay } from '../components/ClueDisplay';
import { GuessInput } from '../components/GuessInput';
import { ResultOverlay } from '../components/ResultOverlay';
import { ShareButton } from '../components/ShareButton';

interface Props {
  onShowStats: () => void;
}

export function DailyPage({ onShowStats }: Props) {
  const { puzzle, loading, error, state, savedResult, streak, submitGuess } =
    useDailyPuzzle();

  const [shaking, setShaking] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    };
  }, []);

  function handleGuess(guess: string) {
    const correct = submitGuess(guess);
    if (!correct) {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      setShaking(true);
      shakeTimer.current = setTimeout(() => setShaking(false), 300);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading today's puzzle…
      </div>
    );
  }
  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }
  if (!puzzle) return null;

  const isDone = state.result !== 'unanswered';
  const alreadyPlayedToday = savedResult !== null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
        <span className="font-medium text-gray-700">
          Puzzle #{puzzle.puzzleNumber}
        </span>
        <span>🔥 Streak: {streak.current}</span>
      </div>

      <ClueDisplay
        clues={puzzle.clues}
        revealedDifficulty={state.revealedDifficulty}
      />

      <div className="mt-4 space-y-2">
        {!isDone && !alreadyPlayedToday && (
          <div className={shaking ? 'shake' : ''}>
            <GuessInput onSubmit={handleGuess} />
          </div>
        )}

        {state.guesses.map((g, i) => (
          <div
            key={`${i}-${g}`}
            className="rounded bg-red-50 px-3 py-1 text-sm text-red-600"
          >
            ✗ {g}
          </div>
        ))}

        {isDone && (
          <>
            <ResultOverlay
              result={state.result}
              movieTitle={puzzle.title}
              posterUrl={puzzle.posterUrl}
              difficulty={state.revealedDifficulty}
              onShowStats={onShowStats}
            />
            <ShareButton
              puzzleNumber={puzzle.puzzleNumber}
              result={state.result}
              revealedDifficulty={state.revealedDifficulty}
            />
          </>
        )}

        {alreadyPlayedToday && !isDone && (
          <p className="text-center text-sm text-gray-500">
            You've already played today. Come back tomorrow!
          </p>
        )}
      </div>

      <footer className="mt-10 text-center text-xs text-gray-400">
        This product uses the TMDb API but is not endorsed or certified by TMDb.
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Run full test suite and TypeScript check**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: all tests pass, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/DailyPage.tsx
git commit -m "feat(stats): wire onShowStats through DailyPage to ResultOverlay"
```

---

## Task 10: Build verification

- [ ] **Step 1: Run production build**

```bash
npm run build
```

Expected: Build succeeds with no errors. Warnings about bundle size for canvas-confetti are acceptable.

- [ ] **Step 2: Smoke-test in browser**

```bash
npm run dev
```

Open http://localhost:5173 and verify:
1. 📊 icon appears in header — clicking it opens stats modal (empty stats for fresh session)
2. Hard clue slides in on page load; Medium and Easy animate when unlocked by wrong guesses
3. On correct guess: colored badge appears with bounce animation; correct point value shown
4. On Hard correct guess: confetti fires from bottom of screen
5. In result overlay: "📊 Stats" button opens stats modal
6. After playing: stats modal shows played count, distribution bar for the result type used

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -p  # stage only relevant changes
git commit -m "fix: <description of any fix>"
```
