import {
  R32_SLOTS, FEEDERS, LOSER_FEED, ROUND_OF, ROUND_LABEL, COLUMN_ORDER, COLUMNS, slotLabel,
} from '../data/bracket2026.js';

const DONE = new Set(['FINISHED', 'AWARDED']);
const LIVE = new Set(['IN_PLAY', 'PAUSED']);

// Group key -> { complete, W: team, RU: team }. Only COMPLETE groups (every team
// has played its 3 matches) yield a confirmed winner/runner-up — matching how
// football-data only slots teams once they're locked.
function groupPositions(standings) {
  const out = {};
  for (const g of standings?.groups ?? []) {
    const key = String(g.group ?? '').replace(/^group[\s_-]*/i, '').trim().toUpperCase();
    const table = g.table ?? [];
    const complete = table.length > 0 && table.every((r) => (r.played ?? 0) >= 3);
    out[key] = { complete, W: table[0]?.team ?? null, RU: table[1]?.team ?? null };
  }
  return out;
}

// Resolve the official 2026 bracket topology against live football-data matches +
// standings. Connectors come from the fixed topology; teams/scores are attached by
// finding the live match that actually contains an anchor team (never by date/id).
export function resolveBracket(knockoutMatches = [], standings = null) {
  const groups = groupPositions(standings);
  const byRound = {};
  for (const m of knockoutMatches) (byRound[m.stage] ||= []).push(m);
  const findInRound = (round, teamId) =>
    (byRound[round] || []).find((m) => m.home?.id === teamId || m.away?.id === teamId) || null;

  const slotTeam = (slot) => {
    if (slot.kind === '3rd') return null;
    const g = groups[slot.group];
    if (!g || !g.complete) return null;
    return slot.kind === 'W' ? g.W : g.RU;
  };

  const memo = new Map();
  const resolve = (no) => {
    if (memo.has(no)) return memo.get(no);
    const round = ROUND_OF[no];
    let fd = null;
    let labels;

    if (round === 'LAST_32') {
      const slots = R32_SLOTS[no];
      labels = slots.map(slotLabel);
      const anchor = slots.map(slotTeam).find(Boolean) ?? null;
      fd = anchor ? findInRound('LAST_32', anchor.id) : null;
    } else {
      const [fa, fb] = FEEDERS[no];
      const ra = resolve(fa);
      const rb = resolve(fb);
      const loser = LOSER_FEED.has(no);
      const ta = loser ? ra.loser : ra.winner;
      const tb = loser ? rb.loser : rb.winner;
      labels = ['TBD', 'TBD'];
      const anchor = ta || tb || null;
      fd = anchor ? findInRound(round, anchor.id) : null;
    }

    let home = null; let away = null; let winner = null; let loser = null;
    if (fd) {
      home = fd.home?.id ? fd.home : null;
      away = fd.away?.id ? fd.away : null;
      if (fd.score?.winner === 'HOME_TEAM') { winner = home; loser = away; }
      else if (fd.score?.winner === 'AWAY_TEAM') { winner = away; loser = home; }
    }

    const node = {
      no,
      round,
      roundLabel: ROUND_LABEL[round],
      feeders: FEEDERS[no] ?? null,
      match: fd,
      home,
      away,
      homeLabel: labels[0],
      awayLabel: labels[1],
      score: fd ? { home: fd.score?.home ?? null, away: fd.score?.away ?? null } : null,
      status: fd?.status ?? null,
      utcDate: fd?.utcDate ?? null,
      isLive: fd ? LIVE.has(fd.status) : false,
      isDone: fd ? DONE.has(fd.status) : false,
      winner,
      loser,
    };
    memo.set(no, node);
    return node;
  };

  const nodes = new Map();
  for (let no = 73; no <= 104; no++) nodes.set(no, resolve(no));
  return { nodes, columnOrder: COLUMN_ORDER, columns: COLUMNS };
}
