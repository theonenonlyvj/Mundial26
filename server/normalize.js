export function normalizeTeam(t) {
  if (!t) return { id: null, name: 'TBD', shortName: 'TBD', tla: null, crest: null };
  return {
    id: t.id ?? null,
    name: t.name ?? 'TBD',
    shortName: t.shortName ?? t.name ?? 'TBD',
    tla: t.tla ?? null,
    crest: t.crest ?? null,
  };
}

export function normalizeMatch(m) {
  return {
    id: m.id,
    utcDate: m.utcDate,
    status: m.status,
    stage: m.stage,
    group: m.group ?? null,
    matchday: m.matchday ?? null,
    venue: m.venue ?? null,
    home: normalizeTeam(m.homeTeam),
    away: normalizeTeam(m.awayTeam),
    score: {
      home: m.score?.fullTime?.home ?? null,
      away: m.score?.fullTime?.away ?? null,
      winner: m.score?.winner ?? null,
    },
  };
}

export function normalizeScorer(s) {
  const team = normalizeTeam(s?.team);
  return {
    // For the World Cup the player's club here IS their national team, so the
    // team crest doubles as the country flag.
    name: s?.player?.name ?? 'Unknown',
    nationality: s?.player?.nationality ?? team.name,
    team,
    goals: s?.goals ?? 0,
    assists: s?.assists ?? null,
    penalties: s?.penalties ?? null,
    playedMatches: s?.playedMatches ?? null,
  };
}

export function normalizeStandings(payload) {
  const groups = (payload.standings ?? [])
    .filter((s) => s.type === 'TOTAL')
    .map((s) => ({
      group: s.group,
      table: (s.table ?? []).map((row) => ({
        position: row.position,
        team: normalizeTeam(row.team),
        played: row.playedGames,
        won: row.won,
        draw: row.draw,
        lost: row.lost,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDifference: row.goalDifference,
        points: row.points,
      })),
    }));
  return { groups };
}
