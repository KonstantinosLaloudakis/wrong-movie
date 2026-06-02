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
