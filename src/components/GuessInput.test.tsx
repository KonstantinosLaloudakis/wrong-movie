import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GuessInput } from './GuessInput';

const SUGGESTIONS = ['The Dark Knight', 'The Dark Knight Rises', 'Batman Begins'];

function renderInput(overrides = {}) {
  const props = {
    value: '',
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    suggestions: [],
    onSuggestionSelect: vi.fn(),
    ...overrides,
  };
  render(<GuessInput {...props} />);
  return props;
}

describe('GuessInput', () => {
  it('renders the text input and Guess button', () => {
    renderInput();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guess/i })).toBeInTheDocument();
  });

  it('shows no dropdown when suggestions is empty', () => {
    renderInput({ suggestions: [] });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows dropdown with suggestions when provided', () => {
    renderInput({ value: 'da', suggestions: SUGGESTIONS });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('option', { name: 'The Dark Knight' })).toBeInTheDocument();
  });

  it('calls onSuggestionSelect when a suggestion is clicked', () => {
    const onSuggestionSelect = vi.fn();
    renderInput({ value: 'da', suggestions: SUGGESTIONS, onSuggestionSelect });
    fireEvent.click(screen.getByRole('option', { name: 'The Dark Knight' }));
    expect(onSuggestionSelect).toHaveBeenCalledWith('The Dark Knight');
  });

  it('calls onChange when user types', () => {
    const onChange = vi.fn();
    renderInput({ onChange });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'da' } });
    expect(onChange).toHaveBeenCalledWith('da');
  });

  it('ArrowDown moves active index down, Enter selects focused suggestion', () => {
    const onSuggestionSelect = vi.fn();
    renderInput({ value: 'da', suggestions: SUGGESTIONS, onSuggestionSelect });
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSuggestionSelect).toHaveBeenCalledWith('The Dark Knight');
  });

  it('Escape closes the dropdown', () => {
    renderInput({ value: 'da', suggestions: SUGGESTIONS });
    const input = screen.getByRole('combobox');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('calls onSubmit with current value on form submit', () => {
    const onSubmit = vi.fn();
    renderInput({ value: 'Inception', onSubmit });
    fireEvent.submit(screen.getByRole('combobox').closest('form')!);
    expect(onSubmit).toHaveBeenCalledWith('Inception');
  });

  it('Guess button is disabled when value is empty', () => {
    renderInput({ value: '' });
    expect(screen.getByRole('button', { name: /guess/i })).toBeDisabled();
  });
});
