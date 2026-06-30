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
  const s = m.score ?? {};
  const ft = s.fullTime ?? {};
  const reg = s.regularTime ?? {};
  const et = s.extraTime ?? {};
  const shootout = s.duration === 'PENALTY_SHOOTOUT';

  // For a penalty shootout, football-data's `fullTime` is the AGGREGATE (the
  // score after 120' PLUS the shootout) and its `winner`/`penalties` fields are
  // unreliable on the free tier (we've seen winner:null and a tied penalties
  // object for a decided tie). So show the score after 120' and derive the
  // shootout + winner from the aggregate, where the winner is always correct.
  let home; let away; let penalties = null;
  if (shootout) {
    home = (reg.home ?? 0) + (et.home ?? 0);
    away = (reg.away ?? 0) + (et.away ?? 0);
    penalties = { home: (ft.home ?? home) - home, away: (ft.away ?? away) - away };
  } else {
    home = ft.home ?? null;
    away = ft.away ?? null;
  }

  let winner = s.winner ?? null;
  if (!winner && shootout && (ft.home ?? 0) !== (ft.away ?? 0)) {
    winner = (ft.home ?? 0) > (ft.away ?? 0) ? 'HOME_TEAM' : 'AWAY_TEAM';
  }

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
      home,
      away,
      winner,
      shootout,
      penalties,
      duration: s.duration ?? null, // REGULAR / EXTRA_TIME / PENALTY_SHOOTOUT — drives livePhase + the log
      halfTime: {
        home: s.halfTime?.home ?? null,
        away: s.halfTime?.away ?? null,
      },
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
