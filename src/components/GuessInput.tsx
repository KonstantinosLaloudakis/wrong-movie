import { useState } from 'react';

interface Props {
  onSubmit: (guess: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function GuessInput({ onSubmit, disabled, loading }: Props) {
  const [value, setValue] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <label htmlFor="guess-input" className="sr-only">
        Movie title
      </label>
      <input
        id="guess-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="Type the movie title…"
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <button
        type="submit"
        disabled={disabled || loading || !value.trim()}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          'Guess'
        )}
      </button>
    </form>
  );
}
