const FINISHED = new Set(['FINISHED', 'AWARDED']);

// Build a teamId -> { status, note } map from the standings payload, so match
// cards can flag teams that have already clinched or been eliminated.
export function buildAdvByTeam(standings) {
  const map = new Map();
  for (const g of standings?.groups ?? []) {
    for (const row of g?.table ?? []) {
      const id = row?.team?.id;
      if (id != null) map.set(id, { status: row.status, note: row.note });
    }
  }
  return map;
}

// For a CURRENT or UPCOMING group-stage match, return which side is already
// decided: { home, away } each 'through' | 'out' | null. Returns null when
// there's nothing worth flagging (finished match, knockout, or both undecided).
export function advancementForMatch(match, advByTeam) {
  if (!advByTeam || !match) return null;
  if (match.stage && match.stage !== 'GROUP_STAGE') return null;
  if (FINISHED.has(match.status)) return null;
  const decided = (team) => {
    const s = advByTeam.get(team?.id)?.status;
    return s === 'through' || s === 'out' ? s : null;
  };
  const home = decided(match.home);
  const away = decided(match.away);
  if (!home && !away) return null;
  return { home, away };
}
