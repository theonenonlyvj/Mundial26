import { dayKey } from './matchTime.js';

function labelFor(key) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

export function groupMatchesByDay(matches, timeZone) {
  const byDay = new Map();
  for (const match of matches) {
    const key = dayKey(match.utcDate, timeZone);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(match);
  }
  return [...byDay.keys()]
    .sort()
    .map((key) => ({
      dayKey: key,
      label: labelFor(key),
      matches: byDay.get(key).sort((a, b) => a.utcDate.localeCompare(b.utcDate)),
    }));
}
