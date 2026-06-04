// src/config/packs.ts
export interface SeasonalPack {
  id: string;
  name: string;
  emoji: string;
  movieIds: string[];
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
}

export const SEASONAL_PACKS: SeasonalPack[] = [
  // Example (uncomment and fill in movieIds to activate):
  // {
  //   id: 'horror-week-2026',
  //   name: 'Horror Week',
  //   emoji: '🎃',
  //   movieIds: [],
  //   startDate: '2026-10-25',
  //   endDate:   '2026-11-01',
  // },
];

export function getActivePack(): SeasonalPack | null {
  const today = new Date().toISOString().slice(0, 10);
  return SEASONAL_PACKS.find(p => p.startDate <= today && today <= p.endDate) ?? null;
}
