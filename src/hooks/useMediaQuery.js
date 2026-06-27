import { useEffect, useState } from 'react';

// Reactively track a media query. Falls back to `false` where matchMedia is
// unavailable (e.g. jsdom) so callers get the narrow/mobile layout by default.
export function useMediaQuery(query) {
  const get = () => (typeof matchMedia === 'function' ? matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);

  useEffect(() => {
    if (typeof matchMedia !== 'function') return undefined;
    const mql = matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
