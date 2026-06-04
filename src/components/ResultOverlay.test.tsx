import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultOverlay } from './ResultOverlay';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

describe('ResultOverlay', () => {
  it('renders nothing when result is unanswered', () => {
    const { container } = render(
      <ResultOverlay result="unanswered" movieTitle="Inception" posterUrl={null} difficulty="hard" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows Hard badge with +3 pts on hard correct', () => {
    render(
      <ResultOverlay result="correct" movieTitle="Inception" posterUrl={null} difficulty="hard" />
    );
    expect(screen.getByText(/Hard/)).toBeInTheDocument();
    expect(screen.getByText(/\+3 pts/)).toBeInTheDocument();
  });

  it('shows Medium badge with +2 pts on medium correct', () => {
    render(
      <ResultOverlay result="correct" movieTitle="Inception" posterUrl={null} difficulty="medium" />
    );
    expect(screen.getByText(/Medium/)).toBeInTheDocument();
    expect(screen.getByText(/\+2 pts/)).toBeInTheDocument();
  });

  it('shows Easy badge with +1 pt on easy correct', () => {
    render(
      <ResultOverlay result="correct" movieTitle="Inception" posterUrl={null} difficulty="easy" />
    );
    expect(screen.getByText(/Easy/)).toBeInTheDocument();
    expect(screen.getByText(/\+1 pt/)).toBeInTheDocument();
  });

  it('shows wrong message on incorrect result', () => {
    render(
      <ResultOverlay result="wrong" movieTitle="Inception" posterUrl={null} difficulty="easy" />
    );
    expect(screen.getByText(/not quite/i)).toBeInTheDocument();
  });

  it('shows Stats button when onShowStats is provided', () => {
    render(
      <ResultOverlay
        result="correct"
        movieTitle="Inception"
        posterUrl={null}
        difficulty="hard"
        onShowStats={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /stats/i })).toBeInTheDocument();
  });

  it('does not show Stats button without onShowStats prop', () => {
    render(
      <ResultOverlay result="correct" movieTitle="Inception" posterUrl={null} difficulty="hard" />
    );
    expect(screen.queryByRole('button', { name: /stats/i })).not.toBeInTheDocument();
  });

  it('shows IMDb link when imdbId is provided', () => {
    render(
      <ResultOverlay
        result="correct"
        movieTitle="Inception"
        posterUrl={null}
        difficulty="hard"
        imdbId="tt1375666"
      />
    );
    const link = screen.getByRole('link', { name: /imdb/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://www.imdb.com/title/tt1375666');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('does not show IMDb link when imdbId is null', () => {
    render(
      <ResultOverlay
        result="correct"
        movieTitle="Inception"
        posterUrl={null}
        difficulty="hard"
        imdbId={null}
      />
    );
    expect(screen.queryByRole('link', { name: /imdb/i })).not.toBeInTheDocument();
  });
});
