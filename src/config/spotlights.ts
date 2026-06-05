export type SpotlightType = 'actor' | 'director';

export interface SpotlightConfig {
  id: string;            // URL slug, e.g. 'tom-hanks'
  name: string;          // Display name
  type: SpotlightType;
  actorId?: string;      // UUID from actors table (actor spotlights only)
  directorName?: string; // Matches director_name on movies (director spotlights only)
}

export const SPOTLIGHTS: SpotlightConfig[] = [
  // Actor UUIDs must be looked up from the actors table in Supabase after seeding.
  // Run: SELECT id, name FROM actors WHERE name IN ('Tom Hanks', ...) ORDER BY name;
  // Then replace the placeholder UUIDs below.
  { id: 'tom-hanks',         name: 'Tom Hanks',           type: 'actor',    actorId: 'a8b41ee3-37e2-4d6f-afa4-3c8bb9e6e980' },
  { id: 'meryl-streep',      name: 'Meryl Streep',        type: 'actor',    actorId: 'a7ccc36e-d675-4bea-b3c4-719a4b43cad6' },
  { id: 'denzel-washington', name: 'Denzel Washington',   type: 'actor',    actorId: 'c477586c-b764-4476-8ae4-4dbeee7c85ba' },
  { id: 'nolan',             name: 'Christopher Nolan',   type: 'director', directorName: 'Christopher Nolan' },
  { id: 'kubrick',           name: 'Stanley Kubrick',     type: 'director', directorName: 'Stanley Kubrick' },
  { id: 'spielberg',         name: 'Steven Spielberg',    type: 'director', directorName: 'Steven Spielberg' },
];

export function getSpotlightById(id: string): SpotlightConfig | null {
  return SPOTLIGHTS.find(s => s.id === id) ?? null;
}

export function getSpotlightsByType(type: SpotlightType): SpotlightConfig[] {
  return SPOTLIGHTS.filter(s => s.type === type);
}

if (import.meta.env.DEV) {
  SPOTLIGHTS.forEach(s => {
    if (s.actorId === 'REPLACE_WITH_ACTUAL_UUID') {
      console.warn(`[spotlights] ${s.name}: actorId is still a placeholder — look up the UUID from the actors table`);
    }
  });
}
