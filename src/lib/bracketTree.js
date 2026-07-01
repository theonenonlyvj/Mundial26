import {
  R32_SLOTS, FEEDERS, LOSER_FEED, ROUND_OF, ROUND_LABEL, COLUMN_ORDER, COLUMNS, slotLabel,
  SLOT_CITY, SLOT_DATE,
} from '../data/bracket2026.js';

const DONE = new Set(['FINISHED', 'AWARDED']);
const LIVE = new Set(['IN_PLAY', 'PAUSED']);

function pushTo(map, key, value) {
  let arr = map.get(key);
  if (!arr) { arr = []; map.set(key, arr); }
  arr.push(value);
}

// Attach each live football-data knockout match to its official 2026 bracket slot
// by the FIXED published schedule — (round + host city + date order) — NOT by team
// identity. Every knockout fixture has a predetermined venue + date even before
// its teams are known, so this resolves the both-TBD fixtures that identity
// anchoring cannot (verified to agree with identity anchoring for every decided
// match). Within the rare (round, city) bucket that holds two slots, both lists
// are sorted ascending and zipped — timezone-safe, since relative order within a
// city is preserved across UTC vs local dates.
function anchorBySchedule(knockoutMatches) {
  const officialByBucket = new Map(); // `${round}|${city}` -> [slotNo], date-sorted
  for (let no = 73; no <= 104; no += 1) pushTo(officialByBucket, `${ROUND_OF[no]}|${SLOT_CITY[no]}`, no);
  for (const slots of officialByBucket.values()) slots.sort((a, b) => SLOT_DATE[a].localeCompare(SLOT_DATE[b]));

  const fdByBucket = new Map();
  for (const m of knockoutMatches) pushTo(fdByBucket, `${m.stage}|${m.city?.id ?? '?'}`, m);
  for (const ms of fdByBucket.values()) {
    ms.sort((a, b) => (a.utcDate < b.utcDate ? -1 : a.utcDate > b.utcDate ? 1 : 0));
  }

  const bySlot = new Map(); // slotNo -> fd match
  for (const [bucket, slots] of officialByBucket) {
    const fds = fdByBucket.get(bucket) ?? [];
    for (let i = 0; i < slots.length && i < fds.length; i += 1) bySlot.set(slots[i], fds[i]);
  }
  return bySlot;
}

// Resolve the official 2026 bracket topology against live football-data matches.
// `standings` is accepted for back-compat but no longer needed: the slot a match
// belongs to comes from the fixed schedule, and the teams come from the match
// itself (undecided sides are labelled from the topology by knockoutDisplay).
export function resolveBracket(knockoutMatches = [], standings = null) { // eslint-disable-line no-unused-vars
  const bySlot = anchorBySchedule(knockoutMatches);
  const nodes = new Map();

  for (let no = 73; no <= 104; no += 1) {
    const round = ROUND_OF[no];
    const fd = bySlot.get(no) ?? null;
    const labels = round === 'LAST_32' ? R32_SLOTS[no].map(slotLabel) : ['TBD', 'TBD'];

    let home = null; let away = null; let winner = null; let loser = null;
    if (fd) {
      home = fd.home?.id ? fd.home : null;
      away = fd.away?.id ? fd.away : null;
      // Only a FINISHED match has a real winner. The feed sets score.winner to the
      // CURRENT leader on live matches, so without this gate a still-leading side
      // gets propagated into the next round (e.g. Mexico shown in the Round of 16
      // before full time). Defense-in-depth: normalize already nulls a non-final
      // winner, but the bracket must never advance anyone off a non-final result.
      if (DONE.has(fd.status)) {
        if (fd.score?.winner === 'HOME_TEAM') { winner = home; loser = away; }
        else if (fd.score?.winner === 'AWAY_TEAM') { winner = away; loser = home; }
      }
    }

    nodes.set(no, {
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
    });
  }

  // Propagate competitors forward: a later round's slot is contested by the WINNERS
  // of its feeders (the LOSERS, for the third-place match). The feed fills these
  // into the actual fixtures inconsistently — some R16/QF carry real teams, others
  // stay TBD — so we compute them, letting deeper rounds show "A or B" the moment
  // both feeders are decided (not just when the feed happens to populate them). Only
  // fills a side the feed left null; the feed's own team always wins. Feeders are
  // always lower-numbered than their parent, so a single ascending pass suffices.
  for (let no = 89; no <= 104; no += 1) {
    const node = nodes.get(no);
    const feeders = FEEDERS[no] ?? [];
    const useLoser = LOSER_FEED.has(no);
    if (!node.home && feeders[0] != null) { const f = nodes.get(feeders[0]); node.home = (useLoser ? f.loser : f.winner) ?? null; }
    if (!node.away && feeders[1] != null) { const f = nodes.get(feeders[1]); node.away = (useLoser ? f.loser : f.winner) ?? null; }
  }

  return { nodes, columnOrder: COLUMN_ORDER, columns: COLUMNS };
}
