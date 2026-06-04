// src/config/genres.ts
export type FilterOption =
  | { id: string; label: string; emoji: string; kind: 'genre';  genreValue: string }
  | { id: string; label: string; emoji: string; kind: 'decade'; decadeValue: number };

export const GENRE_FILTERS: FilterOption[] = [
  { id: 'action',    label: 'Action',    emoji: '💥', kind: 'genre',  genreValue: 'Action' },
  { id: 'animation', label: 'Animation', emoji: '🎨', kind: 'genre',  genreValue: 'Animation' },
  { id: 'comedy',    label: 'Comedy',    emoji: '😂', kind: 'genre',  genreValue: 'Comedy' },
  { id: 'crime',     label: 'Crime',     emoji: '🔫', kind: 'genre',  genreValue: 'Crime' },
  { id: 'drama',     label: 'Drama',     emoji: '🎭', kind: 'genre',  genreValue: 'Drama' },
  { id: 'fantasy',   label: 'Fantasy',   emoji: '✨', kind: 'genre',  genreValue: 'Fantasy' },
  { id: 'horror',    label: 'Horror',    emoji: '👻', kind: 'genre',  genreValue: 'Horror' },
  { id: 'romance',   label: 'Romance',   emoji: '💕', kind: 'genre',  genreValue: 'Romance' },
  { id: 'scifi',     label: 'Sci-Fi',    emoji: '🚀', kind: 'genre',  genreValue: 'Science Fiction' },
  { id: 'thriller',  label: 'Thriller',  emoji: '🔪', kind: 'genre',  genreValue: 'Thriller' },
  { id: '80s',       label: '80s',       emoji: '📼', kind: 'decade', decadeValue: 1980 },
  { id: '90s',       label: '90s',       emoji: '💾', kind: 'decade', decadeValue: 1990 },
  { id: '2000s',     label: '2000s',     emoji: '💿', kind: 'decade', decadeValue: 2000 },
];
