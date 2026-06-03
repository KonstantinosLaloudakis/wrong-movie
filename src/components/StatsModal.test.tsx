import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatsModal } from './StatsModal';
import type { Stats, EndlessStats } from '../types';

const stats: Stats = {
  played: 20,
  winRate: 75,
  currentStreak: 4,
  bestStreak: 9,
  distribution: { hard: 3, medium: 8, easy: 4, miss: 5 },
};

const endlessStats: EndlessStats = {
  played: 10,
  winRate: 80,
  distribution: { hard: 2, medium: 4, easy: 2, miss: 2 },
};

describe('StatsModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <StatsModal isOpen={false} onClose={vi.fn()} stats={stats} endlessStats={endlessStats} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows daily stats by default', () => {
    render(<StatsModal isOpen={true} onClose={vi.fn()} stats={stats} endlessStats={endlessStats} />);
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('shows daily distribution counts by default', () => {
    render(<StatsModal isOpen={true} onClose={vi.fn()} stats={stats} endlessStats={endlessStats} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onClose when × button is clicked', () => {
    const onClose = vi.fn();
    render(<StatsModal isOpen={true} onClose={onClose} stats={stats} endlessStats={endlessStats} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<StatsModal isOpen={true} onClose={onClose} stats={stats} endlessStats={endlessStats} />);
    fireEvent.click(screen.getByTestId('stats-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('switches to endless tab on click', () => {
    render(<StatsModal isOpen={true} onClose={vi.fn()} stats={stats} endlessStats={endlessStats} />);
    fireEvent.click(screen.getByRole('button', { name: 'Endless' }));
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('does not show streak labels on endless tab', () => {
    render(<StatsModal isOpen={true} onClose={vi.fn()} stats={stats} endlessStats={endlessStats} />);
    fireEvent.click(screen.getByRole('button', { name: 'Endless' }));
    expect(screen.queryByText(/streak/i)).not.toBeInTheDocument();
  });
});
