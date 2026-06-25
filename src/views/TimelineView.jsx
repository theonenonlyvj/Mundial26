import { useEffect, useState } from 'react';
import { getMatches } from '../api/client.js';
import { groupMatchesByDay } from '../lib/groupByDate.js';
import { dayKey } from '../lib/matchTime.js';
import { advancementForMatch } from '../lib/advancement.js';
import { useAdvByTeam } from '../hooks/useAdvByTeam.js';
import MatchSticker from '../components/MatchSticker.jsx';

export default function TimelineView({
  now = new Date().toISOString(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
}) {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(null);
  const advByTeam = useAdvByTeam();

  useEffect(() => {
    let active = true;
    getMatches()
      .then((data) => active && setMatches(data.matches))
      .catch((e) => active && setError(e.message));
    return () => { active = false; };
  }, []);

  if (error) return <section aria-label="Timeline">Couldn't load the schedule.</section>;
  if (!matches) return <section aria-label="Timeline">Loading the schedule…</section>;

  const todayKey = dayKey(now, timeZone);
  const days = groupMatchesByDay(matches, timeZone);

  return (
    <section aria-label="Timeline">
      {days.map((day) => {
        const isToday = day.dayKey === todayKey;
        return (
          <div key={day.dayKey} aria-current={isToday ? 'date' : undefined} style={{ marginBottom: 22 }}>
            <h2>{day.label}{isToday && <span style={{ marginLeft: 8, color: 'var(--gold)' }}>● Today</span>}</h2>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {day.matches.map((m) => (
                <MatchSticker key={m.id} match={m} now={now} advancement={advancementForMatch(m, advByTeam)} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
