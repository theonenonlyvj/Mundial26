import { getMatches } from '../api/client.js';
import { useLiveData } from '../hooks/useLiveData.js';
import { bucketMatches } from '../lib/matchTime.js';
import { advancementForMatch } from '../lib/advancement.js';
import { useAdvByTeam } from '../hooks/useAdvByTeam.js';
import { useKnockoutDisplay } from '../hooks/useKnockoutDisplay.js';
import MatchSticker from '../components/MatchSticker.jsx';
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
  const { data, dataAsOf, error } = useLiveData('matches', getMatches);
  const matches = data?.matches ?? null;
  const koDisplay = useKnockoutDisplay(matches);

  if (!matches && error) return <section aria-label="Today">Couldn't load matches right now.</section>;
  if (!matches) return <section aria-label="Today">Loading today's matches…</section>;

  const { today, recent, upcoming } = bucketMatches(matches, now, timeZone);
  // "Coming Up" = the next few days' slate, not the entire remaining tournament
  // (which is mostly undecided knockout TBDs). The full schedule lives in Timeline.
  const horizon = Date.parse(now) + 3 * 86_400_000;
  // Only show matches you can actually anticipate: at least one known team, or a
  // resolvable seed ("Grp K · 1st" / "A OR B"). Drop fully-undecided knockout
  // fixtures (both sides TBD) — they live in Timeline + the bracket.
  const known = (t) => t && t.name && t.name !== 'TBD';
  const showable = (m) => {
    if (known(m.home) || known(m.away)) return true;
    const d = koDisplay?.get(m.id);
    return !!(d && ((d.home && d.home.kind !== 'tbd') || (d.away && d.away.kind !== 'tbd')));
  };
  const comingUp = (() => {
    const within = upcoming.filter((m) => Date.parse(m.utcDate) <= horizon && showable(m));
    return within.length ? within : upcoming.filter(showable).slice(0, 6);
  })();

  return (
    <section aria-label="Today">
      <WhatToWatch matches={matches} now={now} advByTeam={advByTeam} koDisplay={koDisplay} />
      <FreshnessNote at={dataAsOf} />
      <p style={{ fontSize: '0.8em', color: 'var(--muted, #888)', marginTop: 4 }}>🕐 Kickoff times shown in your local time zone.</p>
      {today.length ? (
        <Strip title="On Today" matches={today} now={now} advByTeam={advByTeam} koDisplay={koDisplay} />
      ) : (
        <p style={{ fontWeight: 700 }}>No matches today — here's what's coming up next. ⤵️</p>
      )}
      <Strip title="Coming Up" matches={comingUp} now={now} advByTeam={advByTeam} koDisplay={koDisplay} />
      <Strip title="Recent Results" matches={recent} now={now} advByTeam={advByTeam} koDisplay={koDisplay} />
    </section>
  );
}
