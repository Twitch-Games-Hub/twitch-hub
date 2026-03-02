let query: MediaQueryList | null = null;

function getQuery(): MediaQueryList | null {
  if (typeof window === 'undefined') return null;
  query ??= window.matchMedia('(prefers-reduced-motion: reduce)');
  return query;
}

export function shouldAnimate(): boolean {
  const q = getQuery();
  return q ? !q.matches : true;
}
