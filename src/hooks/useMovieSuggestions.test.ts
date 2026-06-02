import { describe, it, expect } from 'vitest';
import { getMovieSuggestions } from './useMovieSuggestions';

const TITLES = [
  'The Dark Knight',
  'The Dark Knight Rises',
  'Batman Begins',
  'Inception',
  'Interstellar',
  'In the Mood for Love',
  'In Bruges',
];

describe('getMovieSuggestions', () => {
  it('returns empty array when query is fewer than 2 characters', () => {
    expect(getMovieSuggestions(TITLES, '')).toEqual([]);
    expect(getMovieSuggestions(TITLES, 'T')).toEqual([]);
  });

  it('returns empty array when titles list is empty', () => {
    expect(getMovieSuggestions([], 'dark')).toEqual([]);
  });

  it('matches by substring, case-insensitive', () => {
    expect(getMovieSuggestions(TITLES, 'dark')).toContain('The Dark Knight');
    expect(getMovieSuggestions(TITLES, 'DARK')).toContain('The Dark Knight');
  });

  it('returns at most 6 results', () => {
    const many = Array.from({ length: 20 }, (_, i) => `Movie ${i} inter`);
    expect(getMovieSuggestions(many, 'inter').length).toBeLessThanOrEqual(6);
  });

  it('matches substring anywhere in the title', () => {
    const results = getMovieSuggestions(TITLES, 'in');
    expect(results).toContain('Batman Begins');
    expect(results).toContain('Inception');
  });

  it('returns all matches when fewer than 6', () => {
    const results = getMovieSuggestions(TITLES, 'dark');
    expect(results).toHaveLength(2);
    expect(results).toContain('The Dark Knight');
    expect(results).toContain('The Dark Knight Rises');
  });
});
