import { dayKey } from './matchTime.js';

export function formatKickoff(utcDate, nowIso, timeZone) {
  if (!utcDate) return '';
  const matchKey = dayKey(utcDate, timeZone);
  const nowKey = dayKey(nowIso, timeZone);
  const daysAway = Math.round((Date.parse(matchKey) - Date.parse(nowKey)) / 86400000);
  const time = new Date(utcDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone });
  if (daysAway > 6) {
    const [, m, d] = matchKey.split('-');
    return `${+m}/${+d}, ${time}`;
  }
  const weekday = new Date(utcDate).toLocaleDateString('en-US', { weekday: 'short', timeZone });
  return `${weekday} ${time}`;
}
