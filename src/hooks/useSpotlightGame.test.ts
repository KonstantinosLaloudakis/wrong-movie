import { describe, it, expect } from 'vitest';
import { buildSpotlightShareText } from './useSpotlightGame';

describe('buildSpotlightShareText', () => {
  it('maps hard → 🟢, miss → 🔴, medium → 🟡, easy → 🟡', () => {
    const text = buildSpotlightShareText('Tom Hanks', 7, 9, ['hard', 'miss', 'medium', 'easy']);
    expect(text).toContain('🟢🔴🟡🟡');
  });

  it('includes the spotlight name', () => {
    const text = buildSpotlightShareText('Nolan', 6, 9, ['hard', 'hard', 'hard']);
    expect(text).toContain('Nolan Spotlight');
  });

  it('includes score and max score', () => {
    const text = buildSpotlightShareText('Kubrick', 5, 15, ['hard', 'miss', 'easy', 'miss', 'hard']);
    expect(text).toContain('5/15');
  });

  it('returns empty emoji row for no outcomes', () => {
    const text = buildSpotlightShareText('X', 0, 0, []);
    expect(text).toContain('X Spotlight');
    expect(text).toContain('0/0');
  });
});
