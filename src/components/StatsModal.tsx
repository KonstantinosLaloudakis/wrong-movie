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
