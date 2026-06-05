import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SPOTLIGHTS, getSpotlightsByType } from '../config/spotlights';
import type { SpotlightResult } from '../types';

export function SpotlightPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [completions, setCompletions] = useState<Record<string, SpotlightResult | null>>({});

  useEffect(() => {
    const loaded: Record<string, SpotlightResult | null> = {};
    for (const s of SPOTLIGHTS) {
      const raw = localStorage.getItem(`spotlight-result-${s.id}`);
      loaded[s.id] = raw ? (JSON.parse(raw) as SpotlightResult) : null;
    }
    setCompletions(loaded);
  }, []);

  useEffect(() => {
    Promise.all(
      SPOTLIGHTS.map(s =>
        supabase
          .rpc('get_spotlight_movie_count', {
            p_actor_id: s.actorId ?? null,
            p_director_name: s.directorName ?? null,
          })
          .then(({ data }) => ({ id: s.id, count: (data as number) ?? 0 }))
      )
    ).then(results => {
      const map: Record<string, number> = {};
      for (const r of results) map[r.id] = r.count;
      setCounts(map);
    });
  }, []);

  const actors = getSpotlightsByType('actor');
  const directors = getSpotlightsByType('director');

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Section title="Actors" spotlights={actors} counts={counts} completions={completions} />
      <Section title="Directors" spotlights={directors} counts={counts} completions={completions} />
    </div>
  );
}

interface SectionProps {
  title: string;
  spotlights: ReturnType<typeof getSpotlightsByType>;
  counts: Record<string, number>;
  completions: Record<string, SpotlightResult | null>;
}

function Section({ title, spotlights, counts, completions }: SectionProps) {
  if (spotlights.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {spotlights.map(s => (
          <SpotlightCard
            key={s.id}
            spotlight={s}
            count={counts[s.id]}
            completion={completions[s.id] ?? null}
          />
        ))}
      </div>
    </div>
  );
}

interface CardProps {
  spotlight: ReturnType<typeof getSpotlightsByType>[number];
  count: number | undefined;
  completion: SpotlightResult | null;
}

function SpotlightCard({ spotlight, count, completion }: CardProps) {
  const countLabel = count === undefined ? '— movies' : `${count} movie${count !== 1 ? 's' : ''}`;

  return (
    <Link
      to={`/spotlight/${spotlight.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
    >
      <p className="font-bold text-slate-900 dark:text-white">{spotlight.name}</p>
      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{countLabel}</p>
      {completion ? (
        <span className="mt-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
          ✓ {completion.score}/{completion.maxScore}
        </span>
      ) : (
        <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-400 dark:bg-slate-700 dark:text-slate-500">
          Not played
        </span>
      )}
    </Link>
  );
}
