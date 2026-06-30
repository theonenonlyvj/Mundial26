import { useEffect, useRef } from 'react';
import Emoji from '../components/Emoji.jsx';
import { getMatches } from '../api/client.js';
import { useLiveData } from '../hooks/useLiveData.js';
import { groupMatchesByDay } from '../lib/groupByDate.js';
import { dayKey } from '../lib/matchTime.js';
import { advancementForMatch } from '../lib/advancement.js';
import { useAdvByTeam } from '../hooks/useAdvByTeam.js';
import { useKnockoutDisplay } from '../hooks/useKnockoutDisplay.js';
import MatchSticker from '../components/MatchSticker.jsx';
import FreshnessNote from '../components/FreshnessNote.jsx';
import './TimelineView.css';

export default function TimelineView({
  now = new Date().toISOString(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
}) {
  const advByTeam = useAdvByTeam();
  const { data, dataAsOf, error } = useLiveData('matches', getMatches);
  const matches = data?.matches ?? null;
  const koDisplay = useKnockoutDisplay(matches);
  const anchorRef = useRef(null);

  // On open, jump to today's matches (or the next day with games) so you land in
  // the thick of the action, with earlier days above and later days below.
  useEffect(() => {
    if (!matches) return;
    const el = anchorRef.current;
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center' });
  }, [matches]);

  if (!matches && error) return <section aria-label="Timeline">Couldn't load the schedule.</section>;
  if (!matches) return <section aria-label="Timeline">Loading the schedule…</section>;

  const todayKey = dayKey(now, timeZone);
  const days = groupMatchesByDay(matches, timeZone);
  // Anchor on today if there are games today, else the next upcoming day, else the last day.
  const anchorKey = days.some((d) => d.dayKey === todayKey)
    ? todayKey
    : (days.find((d) => d.dayKey >= todayKey)?.dayKey ?? days[days.length - 1]?.dayKey ?? null);

  return (
    <section aria-label="Timeline">
      <FreshnessNote at={dataAsOf} />
      <p className="timeline__hint">Scroll <Emoji code="2195" label="up-down" /> — earlier days are up, upcoming days are down.</p>
      {days.map((day) => {
        const isToday = day.dayKey === todayKey;
        const isPast = day.dayKey < todayKey;
        const cls = `timeline__day ${isPast ? 'is-past' : ''} ${isToday ? 'is-today' : ''}`.trim();
        return (
          <div
            key={day.dayKey}
            ref={day.dayKey === anchorKey ? anchorRef : null}
            aria-current={isToday ? 'date' : undefined}
            className={cls}
          >
            <h2 className="timeline__day-label">
              {day.label}
              {isToday && <span className="timeline__today-pill">● Today</span>}
            </h2>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {day.matches.map((m) => (
                <MatchSticker key={m.id} match={m} now={now} advancement={advancementForMatch(m, advByTeam)} knockout={koDisplay?.get(m.id) ?? null} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
