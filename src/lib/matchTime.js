export function dayKey(utcDate, timeZone) {
  if (!utcDate) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(utcDate));
}

export function bucketMatches(matches, nowIso, timeZone) {
  const todayKey = dayKey(nowIso, timeZone);
  const today = [];
  const recent = [];
  const upcoming = [];
  for (const match of matches) {
    const key = dayKey(match.utcDate, timeZone);
    if (key === todayKey) today.push(match);
    else if (key < todayKey) { if (match.status === 'FINISHED') recent.push(match); }
    else upcoming.push(match);
  }
  recent.sort((a, b) => b.utcDate.localeCompare(a.utcDate));
  upcoming.sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  today.sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  return { today, recent: recent.slice(0, 6), upcoming: upcoming.slice(0, 6) };
}
