import { useEffect, useState } from 'react';
import { getMatches } from '../api/client.js';
import { groupMatchesByDay } from '../lib/groupByDate.js';
import { dayKey } from '../lib/matchTime.js';
import MatchSticker from '../components/MatchSticker.jsx';

export default function TimelineView({ now = new Date().toISOString() }) {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getMatches()
      .then((data) => active && setMatches(data.matches))
      .catch((e) => active && setError(e.message));
    return () => { active = false; };
  }, []);

  if (error) return <section aria-label="Timeline">Couldn't load the schedule.</section>;
  if (!matches) return <section aria-label="Timeline">Loading the schedule…</section>;

  const todayKey = dayKey(now);
  const days = groupMatchesByDay(matches);

  return (
    <section aria-label="Timeline">
      {days.map((day) => {
        const isToday = day.dayKey === todayKey;
        return (
          <div key={day.dayKey} aria-current={isToday ? 'date' : undefined} style={{ marginBottom: 22 }}>
            <h2>{day.label}{isToday && <span style={{ marginLeft: 8, color: 'var(--gold)' }}>● Today</span>}</h2>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {day.matches.map((m) => <MatchSticker key={m.id} match={m} />)}
            </div>
          </div>
        );
      })}
    </section>
  );
}
