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
