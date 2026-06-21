export function dayKey(utcDate) {
  return utcDate ? utcDate.slice(0, 10) : '';
}

export function bucketMatches(matches, nowIso) {
  const todayKey = dayKey(nowIso);
  const today = [];
  const recent = [];
  const upcoming = [];
  for (const match of matches) {
    const key = dayKey(match.utcDate);
    if (key === todayKey) today.push(match);
    else if (key < todayKey) { if (match.status === 'FINISHED') recent.push(match); }
    else upcoming.push(match);
  }
  recent.sort((a, b) => b.utcDate.localeCompare(a.utcDate));
  upcoming.sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  today.sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  return { today, recent: recent.slice(0, 6), upcoming: upcoming.slice(0, 6) };
}
