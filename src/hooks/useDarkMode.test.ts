import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useDarkMode } from './useDarkMode';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

describe('useDarkMode', () => {
  it('defaults to light mode when no stored preference', () => {
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('toggles dark mode on and applies class to html element', () => {
    const { result } = renderHook(() => useDarkMode());
    act(() => result.current.toggleDarkMode());
    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('dark-mode')).toBe('true');
  });

  it('toggles back to light mode', () => {
    const { result } = renderHook(() => useDarkMode());
    act(() => result.current.toggleDarkMode());
    act(() => result.current.toggleDarkMode());
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('reads persisted dark preference on mount', () => {
    localStorage.setItem('dark-mode', 'true');
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
