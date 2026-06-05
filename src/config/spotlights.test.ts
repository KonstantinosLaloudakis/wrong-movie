import { describe, it, expect } from 'vitest';
import { getSpotlightById, getSpotlightsByType, SPOTLIGHTS } from './spotlights';

describe('getSpotlightById', () => {
  it('returns the config with a matching id', () => {
    const first = SPOTLIGHTS[0];
    expect(getSpotlightById(first.id)).toEqual(first);
  });

  it('returns null for an unknown id', () => {
    expect(getSpotlightById('does-not-exist')).toBeNull();
  });
});

describe('getSpotlightsByType', () => {
  it('returns only actor spotlights', () => {
    const actors = getSpotlightsByType('actor');
    expect(actors.every(s => s.type === 'actor')).toBe(true);
    expect(actors.length).toBeGreaterThan(0);
  });

  it('returns only director spotlights', () => {
    const directors = getSpotlightsByType('director');
    expect(directors.every(s => s.type === 'director')).toBe(true);
    expect(directors.length).toBeGreaterThan(0);
  });
});
