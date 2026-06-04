// src/components/GenreFilter.tsx
import { GENRE_FILTERS } from '../config/genres';
import type { SeasonalPack } from '../config/packs';

interface Props {
  activeId: string | null;
  onSelect: (id: string | null) => void;
  activePack: SeasonalPack | null;
}

export function GenreFilter({ activeId, onSelect, activePack }: Props) {
  function handleClick(id: string | null) {
    onSelect(id === activeId ? null : id);
  }

  const activeBase = 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900';
  const inactiveBase =
    'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600';

  return (
    <div className="flex flex-wrap gap-2 pb-1">
      {activePack && (
        <button
          type="button"
          onClick={() => handleClick(activePack.id)}
          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            activeId === activePack.id
              ? 'bg-orange-500 text-white'
              : 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300'
          }`}
        >
          {activePack.emoji} {activePack.name}
          <span className="ml-1 rounded bg-white/30 px-1 text-[9px] font-bold uppercase tracking-wide">
            LIVE
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
          activeId === null ? activeBase : inactiveBase
        }`}
      >
        All
      </button>

      {GENRE_FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => handleClick(f.id)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            activeId === f.id ? activeBase : inactiveBase
          }`}
        >
          {f.label} {f.emoji}
        </button>
      ))}
    </div>
  );
}
