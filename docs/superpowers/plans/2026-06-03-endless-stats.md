# Endless Mode Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist endless mode round results to localStorage and display them in a new "Endless" tab inside the existing Stats modal.

**Architecture:** A new `useEndlessStats` hook owns the `endless-history` localStorage key and exposes both a computed `EndlessStats` object and a `saveEndlessResult` function. `useEndlessGame` calls `saveEndlessResult` internally at round end. `App.tsx` calls `useEndlessStats` a second time for the stats object (same-tab sync is guaranteed by the synthetic `StorageEvent` dispatch already built into `useLocalStorage`). `StatsModal` gains a tab toggle to switch between Daily and Endless views.

**Tech Stack:** React 18, TypeScript, Vitest + Testing Library, localStorage via `useLocalStorage`

---

## File Map

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `EndlessHistoryEntry`, `EndlessHistory`, `EndlessStats` |
| `src/hooks/useEndlessStats.ts` | **New** — pure compute fn + hook |
| `src/hooks/useEndlessStats.test.ts` | **New** — tests for `computeEndlessStats` |
| `src/hooks/useEndlessGame.ts` | Call `saveEndlessResult` on round end |
| `src/components/StatsModal.tsx` | Add tab toggle + endless tab view |
| `src/components/StatsModal.test.tsx` | Update fixtures, add tab tests |
| `src/App.tsx` | Wire `useEndlessStats`, pass `endlessStats` to modal |

---

## Task 1: Add Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add the three new types** after the existing `GameHistory` type alias:

```ts
export interface EndlessHistoryEntry {
  result: GameResultType;
  playedAt: string;         // ISO timestamp
}
export type EndlessHistory = EndlessHistoryEntry[];

export interface EndlessStats {
  played: number;
  winRate: number;          // 0–100, rounded
  distribution: { hard: number; medium: number; easy: number; miss: number };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add EndlessHistoryEntry, EndlessHistory, EndlessStats types"
```

---

## Task 2: Create `useEndlessStats` Hook

**Files:**
- Create: `src/hooks/useEndlessStats.ts`
- Create: `src/hooks/useEndlessStats.test.ts`

- [ ] **Step 1: Write the failing tests** in `src/hooks/useEndlessStats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeEndlessStats } from './useEndlessStats';
import type { EndlessHistory } from '../types';

describe('computeEndlessStats', () => {
  it('returns zeroed stats for empty history', () => {
    const result = computeEndlessStats([]);
    expect(result.played).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.distribution).toEqual({ hard: 0, medium: 0, easy: 0, miss: 0 });
  });

  it('counts played and distribution correctly', () => {
    const history: EndlessHistory = [
      { result: 'hard',   playedAt: '2026-06-03T10:00:00.000Z' },
      { result: 'medium', playedAt: '2026-06-03T10:05:00.000Z' },
      { result: 'easy',   playedAt: '2026-06-03T10:10:00.000Z' },
      { result: 'miss',   playedAt: '2026-06-03T10:15:00.000Z' },
    ];
    const result = computeEndlessStats(history);
    expect(result.played).toBe(4);
    expect(result.distribution).toEqual({ hard: 1, medium: 1, easy: 1, miss: 1 });
  });

  it('computes winRate as percentage of non-miss results', () => {
    const history: EndlessHistory = [
      { result: 'hard',   playedAt: '2026-06-03T10:00:00.000Z' },
      { result: 'medium', playedAt: '2026-06-03T10:05:00.000Z' },
      { result: 'miss',   playedAt: '2026-06-03T10:10:00.000Z' },
      { result: 'miss',   playedAt: '2026-06-03T10:15:00.000Z' },
    ];
    const result = computeEndlessStats(history);
    expect(result.winRate).toBe(50);
  });

  it('rounds winRate to nearest integer', () => {
    const history: EndlessHistory = [
      { result: 'hard', playedAt: '2026-06-03T10:00:00.000Z' },
      { result: 'hard', playedAt: '2026-06-03T10:05:00.000Z' },
      { result: 'miss', playedAt: '2026-06-03T10:10:00.000Z' },
    ];
    const result = computeEndlessStats(history);
    expect(result.winRate).toBe(67); // 2/3 = 66.6... → 67
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm test -- useEndlessStats
```

Expected: FAIL — `computeEndlessStats` not found.

- [ ] **Step 3: Implement the hook** in `src/hooks/useEndlessStats.ts`:

```ts
import { useLocalStorage } from './useLocalStorage';
import type { EndlessHistory, EndlessStats, GameResultType } from '../types';

export function computeEndlessStats(history: EndlessHistory): EndlessStats {
  const played = history.length;
  const distribution = { hard: 0, medium: 0, easy: 0, miss: 0 };

  if (played === 0) {
    return { played: 0, winRate: 0, distribution };
  }

  for (const entry of history) {
    distribution[entry.result]++;
  }

  const wins = played - distribution.miss;
  return {
    played,
    winRate: Math.round((wins / played) * 100),
    distribution,
  };
}

export function useEndlessStats() {
  const [history, setHistory] = useLocalStorage<EndlessHistory>('endless-history', []);

  function saveEndlessResult(result: GameResultType) {
    setHistory((prev) => [...prev, { result, playedAt: new Date().toISOString() }]);
  }

  return { stats: computeEndlessStats(history), saveEndlessResult };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- useEndlessStats
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useEndlessStats.ts src/hooks/useEndlessStats.test.ts
git commit -m "feat: add useEndlessStats hook with localStorage persistence"
```

---

## Task 3: Persist Results in `useEndlessGame`

**Files:**
- Modify: `src/hooks/useEndlessGame.ts`

- [ ] **Step 1: Add the import** at the top of `src/hooks/useEndlessGame.ts`, after the existing imports:

```ts
import { useEndlessStats } from './useEndlessStats';
```

- [ ] **Step 2: Call the hook** inside `useEndlessGame`, after the existing `useState` declarations:

```ts
const { saveEndlessResult } = useEndlessStats();
```

- [ ] **Step 3: Replace the `submitGuess` function** with a version that calls `saveEndlessResult` on round end:

```ts
function submitGuess(guess: string): boolean {
  if (!puzzle || state.result !== 'unanswered') return false;

  const correct = isCorrectGuess(
    guess,
    puzzle.normalizedTitle,
    puzzle.altTitles
  );
  const newGuesses = [...state.guesses, guess];
  const currentIndex = DIFFICULTY_ORDER.indexOf(state.revealedDifficulty);

  if (correct) {
    saveEndlessResult(state.revealedDifficulty);
    setSessionScore((s) => s + POINTS_MAP[state.revealedDifficulty]);
    setState({ ...state, guesses: newGuesses, result: 'correct', showAllClues: true });
    return true;
  } else if (currentIndex < DIFFICULTY_ORDER.length - 1) {
    setState({
      guesses: newGuesses,
      revealedDifficulty: DIFFICULTY_ORDER[currentIndex + 1],
      result: 'unanswered',
      showAllClues: false,
    });
    return false;
  } else {
    saveEndlessResult('miss');
    setState({ ...state, guesses: newGuesses, result: 'wrong', showAllClues: false });
    return false;
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useEndlessGame.ts
git commit -m "feat: persist round result in useEndlessGame"
```

---

## Task 4: Update `StatsModal` with Tab Toggle

**Files:**
- Modify: `src/components/StatsModal.tsx`
- Modify: `src/components/StatsModal.test.tsx`

- [ ] **Step 1: Write new failing tests** — replace the entire contents of `src/components/StatsModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatsModal } from './StatsModal';
import type { Stats, EndlessStats } from '../types';

const stats: Stats = {
  played: 20,
  winRate: 75,
  currentStreak: 4,
  bestStreak: 9,
  distribution: { hard: 3, medium: 8, easy: 4, miss: 5 },
};

const endlessStats: EndlessStats = {
  played: 10,
  winRate: 80,
  distribution: { hard: 2, medium: 4, easy: 2, miss: 2 },
};

describe('StatsModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <StatsModal isOpen={false} onClose={vi.fn()} stats={stats} endlessStats={endlessStats} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows daily stats by default', () => {
    render(<StatsModal isOpen={true} onClose={vi.fn()} stats={stats} endlessStats={endlessStats} />);
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('shows daily distribution counts by default', () => {
    render(<StatsModal isOpen={true} onClose={vi.fn()} stats={stats} endlessStats={endlessStats} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onClose when × button is clicked', () => {
    const onClose = vi.fn();
    render(<StatsModal isOpen={true} onClose={onClose} stats={stats} endlessStats={endlessStats} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<StatsModal isOpen={true} onClose={onClose} stats={stats} endlessStats={endlessStats} />);
    fireEvent.click(screen.getByTestId('stats-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('switches to endless tab on click', () => {
    render(<StatsModal isOpen={true} onClose={vi.fn()} stats={stats} endlessStats={endlessStats} />);
    fireEvent.click(screen.getByRole('button', { name: 'Endless' }));
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('does not show streak labels on endless tab', () => {
    render(<StatsModal isOpen={true} onClose={vi.fn()} stats={stats} endlessStats={endlessStats} />);
    fireEvent.click(screen.getByRole('button', { name: 'Endless' }));
    expect(screen.queryByText(/streak/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify new tests fail**

```bash
npm test -- StatsModal
```

Expected: the two new tab tests fail (prop type mismatch or missing tab UI).

- [ ] **Step 3: Replace the entire `src/components/StatsModal.tsx`**:

```tsx
import { useState } from 'react';
import type { Stats, EndlessStats } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  stats: Stats;
  endlessStats: EndlessStats;
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
          style={{ width: `${count > 0 ? Math.max(pct, 4) : 0}%`, backgroundColor: color }}
        >
          {count > 0 && <span className="text-xs font-semibold text-white">{count}</span>}
        </div>
      </div>
    </div>
  );
}

export function StatsModal({ isOpen, onClose, stats, endlessStats }: Props) {
  const [tab, setTab] = useState<'daily' | 'endless'>('daily');

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

        <div className="mb-5 flex gap-1 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setTab('daily')}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              tab === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setTab('endless')}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              tab === 'endless' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            Endless
          </button>
        </div>

        {tab === 'daily' && (
          <>
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
          </>
        )}

        {tab === 'endless' && (
          <>
            <div className="mb-6 grid grid-cols-2 gap-2 text-center">
              {[
                { value: endlessStats.played, label: 'Played' },
                { value: `${endlessStats.winRate}%`, label: 'Win %' },
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
              <DistributionBar label="🔴 Hard"   count={endlessStats.distribution.hard}   total={endlessStats.played} color="#ef4444" />
              <DistributionBar label="🟡 Medium" count={endlessStats.distribution.medium} total={endlessStats.played} color="#f59e0b" />
              <DistributionBar label="🟢 Easy"   count={endlessStats.distribution.easy}   total={endlessStats.played} color="#22c55e" />
              <DistributionBar label="✗ Miss"    count={endlessStats.distribution.miss}   total={endlessStats.played} color="#94a3b8" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run all StatsModal tests**

```bash
npm test -- StatsModal
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/StatsModal.tsx src/components/StatsModal.test.tsx
git commit -m "feat: add Daily/Endless tab toggle to StatsModal"
```

---

## Task 5: Wire Up `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the import** for `useEndlessStats` at the top of `src/App.tsx`, after the existing imports:

```ts
import { useEndlessStats } from './hooks/useEndlessStats';
```

- [ ] **Step 2: Call the hook** inside `AppShell`, after the existing `const stats = useStats();` line:

```ts
const { stats: endlessStats } = useEndlessStats();
```

- [ ] **Step 3: Pass `endlessStats` to `StatsModal`** — update the `StatsModal` JSX:

```tsx
<StatsModal
  isOpen={statsOpen}
  onClose={() => setStatsOpen(false)}
  stats={stats}
  endlessStats={endlessStats}
/>
```

- [ ] **Step 4: Verify the full test suite passes**

```bash
npm test
```

Expected: all tests PASS, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire endless stats into StatsModal"
```
