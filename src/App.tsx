import { useState } from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { DailyPage } from './pages/DailyPage';
import { EndlessPage } from './pages/EndlessPage';
import { SpotlightPage } from './pages/SpotlightPage';
import { SpotlightPlayPage } from './pages/SpotlightPlayPage';
import { StatsModal } from './components/StatsModal';
import { useStats } from './hooks/useStats';
import { useEndlessStats } from './hooks/useEndlessStats';
import { useDarkMode } from './hooks/useDarkMode';

function AppShell() {
  const [statsOpen, setStatsOpen] = useState(false);
  const stats = useStats();
  const { stats: endlessStats, saveEndlessResult } = useEndlessStats();
  const { isDark, toggleDarkMode } = useDarkMode();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <h1 className="font-display text-xl font-black tracking-tight text-slate-900 dark:text-white">
            🎬 Wrong Movie
          </h1>
          <nav className="flex items-center gap-1 text-sm font-semibold">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive
                  ? 'rounded-md bg-slate-100 px-3 py-1.5 text-slate-900 dark:bg-slate-700 dark:text-white'
                  : 'rounded-md px-3 py-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }
            >
              Daily
            </NavLink>
            <NavLink
              to="/play"
              className={({ isActive }) =>
                isActive
                  ? 'rounded-md bg-slate-100 px-3 py-1.5 text-slate-900 dark:bg-slate-700 dark:text-white'
                  : 'rounded-md px-3 py-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }
            >
              Endless
            </NavLink>
            <NavLink
              to="/spotlight"
              end
              className={({ isActive }) =>
                isActive
                  ? 'rounded-md bg-slate-100 px-3 py-1.5 text-slate-900 dark:bg-slate-700 dark:text-white'
                  : 'rounded-md px-3 py-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }
            >
              Spotlight
            </NavLink>
            <button
              aria-label="stats"
              onClick={() => setStatsOpen(true)}
              className="ml-1 rounded-md bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            >
              📊
            </button>
            <button
              aria-label="toggle dark mode"
              onClick={toggleDarkMode}
              className="ml-1 rounded-md bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          </nav>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<DailyPage onShowStats={() => setStatsOpen(true)} />} />
          <Route path="/play" element={<EndlessPage saveEndlessResult={saveEndlessResult} />} />
          <Route path="/spotlight" element={<SpotlightPage />} />
          <Route path="/spotlight/:id" element={<SpotlightPlayPage />} />
        </Routes>
      </main>
      <StatsModal
        isOpen={statsOpen}
        onClose={() => setStatsOpen(false)}
        stats={stats}
        endlessStats={endlessStats}
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
