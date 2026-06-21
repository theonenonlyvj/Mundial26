import { useEffect, useState } from 'react';
import { getMatches } from '../api/client.js';
import MatchSticker from '../components/MatchSticker.jsx';

export default function TodayView() {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getMatches()
      .then((data) => active && setMatches(data.matches))
      .catch((e) => active && setError(e.message));
    return () => { active = false; };
  }, []);

  if (error) return <section aria-label="Today">Couldn't load matches.</section>;
  if (!matches) return <section aria-label="Today">Loading…</section>;
  return (
    <section aria-label="Today" style={{ display: 'grid', gap: 12 }}>
      {matches.map((m) => <MatchSticker key={m.id} match={m} />)}
    </section>
  );
}
