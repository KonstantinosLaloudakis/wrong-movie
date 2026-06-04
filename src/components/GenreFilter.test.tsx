// src/components/GenreFilter.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GenreFilter } from './GenreFilter';
import type { SeasonalPack } from '../config/packs';

let noop: ReturnType<typeof vi.fn>;

describe('GenreFilter', () => {
  beforeEach(() => { noop = vi.fn(); });
  it('renders All chip and all genre/decade chips', () => {
    render(<GenreFilter activeId={null} onSelect={noop} activePack={null} />);
    expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /horror/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sci-fi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /90s/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2000s/i })).toBeInTheDocument();
  });

  it('does not render a pack chip when activePack is null', () => {
    render(<GenreFilter activeId={null} onSelect={noop} activePack={null} />);
    expect(screen.queryByText(/live/i)).not.toBeInTheDocument();
  });

  it('renders the pack chip with LIVE badge when activePack is provided', () => {
    const pack: SeasonalPack = {
      id: 'horror-2026', name: 'Horror Week', emoji: '🎃',
      movieIds: ['id-1'], startDate: '2026-10-25', endDate: '2026-11-01',
    };
    render(<GenreFilter activeId={null} onSelect={noop} activePack={pack} />);
    expect(screen.getByRole('button', { name: /horror week/i })).toBeInTheDocument();
    expect(screen.getByText(/live/i)).toBeInTheDocument();
  });

  it('calls onSelect with the chip id when a genre chip is clicked', () => {
    const onSelect = vi.fn();
    render(<GenreFilter activeId={null} onSelect={onSelect} activePack={null} />);
    fireEvent.click(screen.getByRole('button', { name: /horror/i }));
    expect(onSelect).toHaveBeenCalledWith('horror');
  });

  it('calls onSelect(null) when the active chip is clicked again', () => {
    const onSelect = vi.fn();
    render(<GenreFilter activeId="horror" onSelect={onSelect} activePack={null} />);
    fireEvent.click(screen.getByRole('button', { name: /horror/i }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('calls onSelect(null) when the All chip is clicked', () => {
    const onSelect = vi.fn();
    render(<GenreFilter activeId="horror" onSelect={onSelect} activePack={null} />);
    fireEvent.click(screen.getByRole('button', { name: /all/i }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('marks the All chip as active when activeId is null', () => {
    render(<GenreFilter activeId={null} onSelect={noop} activePack={null} />);
    const allBtn = screen.getByRole('button', { name: /all/i });
    expect(allBtn).toHaveClass('bg-slate-800');
  });

  it('marks the matching chip as active when activeId is set', () => {
    render(<GenreFilter activeId="horror" onSelect={noop} activePack={null} />);
    const horrorBtn = screen.getByRole('button', { name: /horror/i });
    expect(horrorBtn).toHaveClass('bg-slate-800');
  });
});
