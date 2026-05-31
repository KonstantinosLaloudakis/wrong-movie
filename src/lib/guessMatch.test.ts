import { describe, it, expect } from 'vitest';
import { normalizeTitle, isCorrectGuess } from './guessMatch';

describe('normalizeTitle', () => {
  it('strips leading "The"', () => {
    expect(normalizeTitle('The Matrix')).toBe('matrix');
  });
  it('strips leading "A"', () => {
    expect(normalizeTitle('A Beautiful Mind')).toBe('beautiful mind');
  });
  it('strips leading "An"', () => {
    expect(normalizeTitle('An American in Paris')).toBe('american in paris');
  });
  it('lowercases', () => {
    expect(normalizeTitle('FORREST GUMP')).toBe('forrest gump');
  });
  it('strips punctuation', () => {
    expect(normalizeTitle("Schindler's List")).toBe('schindlers list');
  });
  it('trims and collapses whitespace', () => {
    expect(normalizeTitle('  Blade   Runner  ')).toBe('blade runner');
  });
  it('does not strip "the" mid-title', () => {
    expect(normalizeTitle('From the Earth to the Moon')).toBe(
      'from the earth to the moon'
    );
  });
});

describe('isCorrectGuess', () => {
  it('matches exact title', () => {
    expect(isCorrectGuess('Inception', 'inception', [])).toBe(true);
  });
  it('matches without leading article', () => {
    expect(isCorrectGuess('Matrix', 'matrix', [])).toBe(true);
  });
  it('matches with one-character typo', () => {
    expect(isCorrectGuess('Incepton', 'inception', [])).toBe(true);
  });
  it('matches with two-character typo', () => {
    expect(isCorrectGuess('Forrest Gunp', 'forrest gump', [])).toBe(true);
  });
  it('rejects wrong title', () => {
    expect(isCorrectGuess('The Godfather', 'inception', [])).toBe(false);
  });
  it('rejects empty guess', () => {
    expect(isCorrectGuess('', 'inception', [])).toBe(false);
  });
  it('matches an alt title', () => {
    expect(
      isCorrectGuess('Dark Knight', 'the dark knight rises', ['dark knight'])
    ).toBe(true);
  });
  it('rejects typo that exceeds distance 2', () => {
    expect(isCorrectGuess('Completely Wrong Title', 'inception', [])).toBe(false);
  });
});
