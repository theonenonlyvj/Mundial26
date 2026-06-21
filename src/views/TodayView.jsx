import { useEffect, useState } from 'react';
import { getMatches } from '../api/client.js';
import { bucketMatches } from '../lib/matchTime.js';
import MatchSticker from '../components/MatchSticker.jsx';
import WhatToWatch from '../components/WhatToWatch.jsx';

function Strip({ title, matches }) {
  if (!matches.length) return null;
  return (
    <section style={{ marginTop: 20 }}>
      <h2>{title}</h2>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {matches.map((m) => <MatchSticker key={m.id} match={m} />)}
      </div>
    </section>
  );
}

export default function TodayView({ now = new Date().toISOString() }) {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getMatches()
      .then((data) => active && setMatches(data.matches))
      .catch((e) => active && setError(e.message));
    return () => { active = false; };
  }, []);

  if (error) return <section aria-label="Today">Couldn't load matches right now.</section>;
  if (!matches) return <section aria-label="Today">Loading today's matches…</section>;

  const { today, recent, upcoming } = bucketMatches(matches, now);
  const heroPool = today.length ? today : upcoming;

  return (
    <section aria-label="Today">
      <WhatToWatch matches={heroPool} />
      {today.length ? (
        <Strip title="On today" matches={today} />
      ) : (
        <p style={{ fontWeight: 700 }}>No matches today — here's what's coming up next. ⤵️</p>
      )}
      <Strip title="Recent results" matches={recent} />
      <Strip title="Coming up" matches={upcoming} />
    </section>
  );
}
