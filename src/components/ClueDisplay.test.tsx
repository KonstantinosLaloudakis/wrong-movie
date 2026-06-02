import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClueDisplay } from './ClueDisplay';
import type { Clue } from '../types';

const clues = {
  hard:   { id: '1', text: 'Hard clue text',   difficulty: 'hard'   } as Clue,
  medium: { id: '2', text: 'Medium clue text', difficulty: 'medium' } as Clue,
  easy:   { id: '3', text: 'Easy clue text',   difficulty: 'easy'   } as Clue,
};

describe('ClueDisplay', () => {
  it('shows only the hard clue when revealedDifficulty is hard', () => {
    render(<ClueDisplay clues={clues} revealedDifficulty="hard" showAll={false} />);
    expect(screen.getByText('Hard clue text')).toBeInTheDocument();
    expect(screen.queryByText('Medium clue text')).not.toBeInTheDocument();
    expect(screen.queryByText('Easy clue text')).not.toBeInTheDocument();
  });

  it('shows all clues when showAll is true, regardless of revealedDifficulty', () => {
    render(<ClueDisplay clues={clues} revealedDifficulty="hard" showAll={true} />);
    expect(screen.getByText('Hard clue text')).toBeInTheDocument();
    expect(screen.getByText('Medium clue text')).toBeInTheDocument();
    expect(screen.getByText('Easy clue text')).toBeInTheDocument();
  });

  it('shows all clues when showAll is true even with medium revealed', () => {
    render(<ClueDisplay clues={clues} revealedDifficulty="medium" showAll={true} />);
    expect(screen.getByText('Hard clue text')).toBeInTheDocument();
    expect(screen.getByText('Medium clue text')).toBeInTheDocument();
    expect(screen.getByText('Easy clue text')).toBeInTheDocument();
  });
});
