import { getMatches } from '../api/client.js';
import { useLiveData } from '../hooks/useLiveData.js';
import { bucketMatches } from '../lib/matchTime.js';
import { advancementForMatch } from '../lib/advancement.js';
import { useAdvByTeam } from '../hooks/useAdvByTeam.js';
import MatchSticker from '../components/MatchSticker.jsx';
import WhatToWatch from '../components/WhatToWatch.jsx';
import FreshnessNote from '../components/FreshnessNote.jsx';

function Strip({ title, matches, now, advByTeam }) {
  if (!matches.length) return null;
  return (
    <section style={{ marginTop: 20 }}>
      <h2>{title}</h2>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {matches.map((m) => (
          <MatchSticker key={m.id} match={m} now={now} advancement={advancementForMatch(m, advByTeam)} />
        ))}
      </div>
    </section>
  );
}

export default function TodayView({
  now = new Date().toISOString(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
}) {
  const advByTeam = useAdvByTeam();
  const { data, dataAsOf, error } = useLiveData('matches', getMatches);
  const matches = data?.matches ?? null;

  if (!matches && error) return <section aria-label="Today">Couldn't load matches right now.</section>;
  if (!matches) return <section aria-label="Today">Loading today's matches…</section>;

  const { today, recent, upcoming } = bucketMatches(matches, now, timeZone);

  return (
    <section aria-label="Today">
      <WhatToWatch matches={matches} now={now} advByTeam={advByTeam} />
      <FreshnessNote at={dataAsOf} />
      <p style={{ fontSize: '0.8em', color: 'var(--muted, #888)', marginTop: 4 }}>🕐 Kickoff times shown in your local time zone.</p>
      {today.length ? (
        <Strip title="On Today" matches={today} now={now} advByTeam={advByTeam} />
      ) : (
        <p style={{ fontWeight: 700 }}>No matches today — here's what's coming up next. ⤵️</p>
      )}
      <Strip title="Coming Up" matches={upcoming} now={now} advByTeam={advByTeam} />
      <Strip title="Recent Results" matches={recent} now={now} advByTeam={advByTeam} />
    </section>
  );
}
