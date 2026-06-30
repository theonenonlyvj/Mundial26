import { getMatches } from '../api/client.js';
import { useLiveData } from '../hooks/useLiveData.js';
import { bucketMatches } from '../lib/matchTime.js';
import { advancementForMatch } from '../lib/advancement.js';
import { useAdvByTeam } from '../hooks/useAdvByTeam.js';
import { useKnockoutDisplay } from '../hooks/useKnockoutDisplay.js';
import MatchSticker from '../components/MatchSticker.jsx';
import Emoji from '../components/Emoji.jsx';
import WhatToWatch from '../components/WhatToWatch.jsx';
import FreshnessNote from '../components/FreshnessNote.jsx';

function Strip({ title, matches, now, advByTeam, koDisplay }) {
  if (!matches.length) return null;
  return (
    <section style={{ marginTop: 20 }}>
      <h2>{title}</h2>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {matches.map((m) => (
          <MatchSticker key={m.id} match={m} now={now} advancement={advancementForMatch(m, advByTeam)} knockout={koDisplay?.get(m.id) ?? null} />
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
  const { data, dataAsOf, error } = useLiveData('matches', getMatches, { refreshMs: 60_000 });
  const matches = data?.matches ?? null;
  const koDisplay = useKnockoutDisplay(matches);

  if (!matches && error) return <section aria-label="Today">Couldn't load matches right now.</section>;
  if (!matches) return <section aria-label="Today">Loading today's matches…</section>;

  const { today, recent, upcoming } = bucketMatches(matches, now, timeZone);
  // "Coming Up" = simply the next matches on the schedule. No filtering — every
  // knockout fixture is anchored to its bracket slot, so undecided sides render
  // their seed label ("Grp K · 1st" / "Canada OR South Africa" / "Winner R32")
  // instead of a bare TBD. The full schedule lives in Timeline.
  const comingUp = upcoming.slice(0, 8);

  return (
    <section aria-label="Today">
      <WhatToWatch matches={matches} now={now} advByTeam={advByTeam} koDisplay={koDisplay} />
      <FreshnessNote at={dataAsOf} />
      <p style={{ fontSize: '0.8em', color: 'var(--muted, #888)', marginTop: 4 }}><Emoji code="1F550" label="clock" /> Kickoff times shown in your local time zone.</p>
      {today.length ? (
        <Strip title="On Today" matches={today} now={now} advByTeam={advByTeam} koDisplay={koDisplay} />
      ) : (
        <p style={{ fontWeight: 700 }}>No matches today — here's what's coming up next. <Emoji code="2935" label="down arrow" /></p>
      )}
      <Strip title="Coming Up" matches={comingUp} now={now} advByTeam={advByTeam} koDisplay={koDisplay} />
      <Strip title="Recent Results" matches={recent} now={now} advByTeam={advByTeam} koDisplay={koDisplay} />
    </section>
  );
}
