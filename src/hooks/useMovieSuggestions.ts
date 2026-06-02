export function getMovieSuggestions(titles: string[], query: string): string[] {
  if (query.length < 2) return [];
  const lower = query.toLowerCase();
  const results: string[] = [];
  for (const title of titles) {
    if (title.toLowerCase().includes(lower)) {
      results.push(title);
      if (results.length === 6) break;
    }
  }
  return results;
}
