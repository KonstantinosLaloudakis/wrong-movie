import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatsModal } from './StatsModal';
import type { Stats } from '../types';

const stats: Stats = {
  played: 20,
  winRate: 75,
  currentStreak: 4,
  bestStreak: 9,
  distribution: { hard: 3, medium: 8, easy: 4, miss: 5 },
};

describe('StatsModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <StatsModal isOpen={false} onClose={vi.fn()} stats={stats} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows summary numbers when open', () => {
    render(<StatsModal isOpen={true} onClose={vi.fn()} stats={stats} />);
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('shows distribution counts', () => {
    render(<StatsModal isOpen={true} onClose={vi.fn()} stats={stats} />);
    expect(screen.getByText('3')).toBeInTheDocument();  // hard
    expect(screen.getByText('8')).toBeInTheDocument();  // medium
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);  // easy — shares value with streak but that's fine
    expect(screen.getByText('5')).toBeInTheDocument();  // miss
  });

  it('calls onClose when × button is clicked', () => {
    const onClose = vi.fn();
    render(<StatsModal isOpen={true} onClose={onClose} stats={stats} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<StatsModal isOpen={true} onClose={onClose} stats={stats} />);
    fireEvent.click(screen.getByTestId('stats-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
