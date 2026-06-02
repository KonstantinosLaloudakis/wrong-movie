import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (guess: string) => void;
  disabled?: boolean;
  suggestions?: string[];
  onSuggestionSelect?: (title: string) => void;
}

function highlightMatch(title: string, query: string) {
  const idx = title.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1 || query.length < 2) return title;
  return (
    <>
      {title.slice(0, idx)}
      <span className="bg-slate-200 text-slate-900 font-semibold rounded px-0.5">
        {title.slice(idx, idx + query.length)}
      </span>
      {title.slice(idx + query.length)}
    </>
  );
}

export function GuessInput({
  value,
  onChange,
  onSubmit,
  disabled,
  suggestions = [],
  onSuggestionSelect,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
    setOpen(suggestions.length > 0);
  }, [suggestions]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
    setOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      onSuggestionSelect?.(suggestions[activeIndex]);
      setOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setOpen(false);
  }

  const showDropdown = open && suggestions.length > 0;

  return (
    <div ref={wrapperRef} className="relative">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor="guess-input" className="sr-only">
          Movie title
        </label>
        <input
          id="guess-input"
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Type the movie title…"
          className="flex-1 rounded-lg border-2 border-slate-200 px-4 py-2 text-sm outline-none transition-colors focus:border-slate-900 disabled:bg-slate-100"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="suggestions-list"
          aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Guess
        </button>
      </form>

      {showDropdown && (
        <ul
          id="suggestions-list"
          role="listbox"
          className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
        >
          {suggestions.map((title, i) => (
            <li
              key={title}
              id={`suggestion-${i}`}
              role="option"
              aria-label={title}
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => {
                onSuggestionSelect?.(title);
                setOpen(false);
              }}
              className={`px-4 py-2 text-sm cursor-pointer ${
                i === activeIndex
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {highlightMatch(title, value)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
