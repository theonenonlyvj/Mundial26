// Official 2026 FIFA World Cup knockout topology (match numbers 73–104), verified
// against en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage.
//
// The TOPOLOGY (which match feeds which) is fixed regardless of which teams fill
// the slots, so connector lines drawn from this are always correct. Live teams &
// scores are attached separately, by TEAM IDENTITY (see lib/bracketTree.js) — we
// never rely on football-data's ids/dates lining up with these match numbers.

// Round-of-32 slot definitions. Each match pairs two slots; every match has at
// least one resolvable group winner/runner-up we can anchor on (the third-place
// slot's actual team is read from the live match once anchored).
export const R32_SLOTS = {
  73: [{ kind: 'RU', group: 'A' }, { kind: 'RU', group: 'B' }],
  74: [{ kind: 'W', group: 'E' }, { kind: '3rd', groups: 'A/B/C/D/F' }],
  75: [{ kind: 'W', group: 'F' }, { kind: 'RU', group: 'C' }],
  76: [{ kind: 'W', group: 'C' }, { kind: 'RU', group: 'F' }],
  77: [{ kind: 'W', group: 'I' }, { kind: '3rd', groups: 'C/D/F/G/H' }],
  78: [{ kind: 'RU', group: 'E' }, { kind: 'RU', group: 'I' }],
  79: [{ kind: 'W', group: 'A' }, { kind: '3rd', groups: 'C/E/F/H/I' }],
  80: [{ kind: 'W', group: 'L' }, { kind: '3rd', groups: 'E/H/I/J/K' }],
  81: [{ kind: 'W', group: 'D' }, { kind: '3rd', groups: 'B/E/F/I/J' }],
  82: [{ kind: 'W', group: 'G' }, { kind: '3rd', groups: 'A/E/H/I/J' }],
  83: [{ kind: 'RU', group: 'K' }, { kind: 'RU', group: 'L' }],
  84: [{ kind: 'W', group: 'H' }, { kind: 'RU', group: 'J' }],
  85: [{ kind: 'W', group: 'B' }, { kind: '3rd', groups: 'E/F/G/I/J' }],
  86: [{ kind: 'W', group: 'J' }, { kind: 'RU', group: 'H' }],
  87: [{ kind: 'W', group: 'K' }, { kind: '3rd', groups: 'D/E/I/J/L' }],
  88: [{ kind: 'RU', group: 'D' }, { kind: 'RU', group: 'G' }],
};

// Official 2026 host city + (local) date for every knockout slot 73–104, from the
// published schedule (en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage,
// cross-checked against football-data's per-fixture city map). Every slot has a
// FIXED venue + date regardless of which teams fill it, so we attach the live
// match to its slot by (round, city, date) — see lib/bracketTree.js. City ids
// match football-data's normalized `match.city.id`. SLOT_DATE is only used to
// order the (rare) two slots a single city hosts in the same round.
export const SLOT_CITY = {
  73: 'los-angeles', 74: 'boston', 75: 'monterrey', 76: 'houston',
  77: 'new-york', 78: 'dallas', 79: 'mexico-city', 80: 'atlanta',
  81: 'bay-area', 82: 'seattle', 83: 'toronto', 84: 'los-angeles',
  85: 'vancouver', 86: 'miami', 87: 'kansas-city', 88: 'dallas',
  89: 'philadelphia', 90: 'houston', 91: 'new-york', 92: 'mexico-city',
  93: 'dallas', 94: 'seattle', 95: 'atlanta', 96: 'vancouver',
  97: 'boston', 98: 'los-angeles', 99: 'miami', 100: 'kansas-city',
  101: 'dallas', 102: 'atlanta', 103: 'miami', 104: 'new-york',
};
export const SLOT_DATE = {
  73: '2026-06-28', 74: '2026-06-29', 75: '2026-06-29', 76: '2026-06-29',
  77: '2026-06-30', 78: '2026-06-30', 79: '2026-06-30', 80: '2026-07-01',
  81: '2026-07-01', 82: '2026-07-01', 83: '2026-07-02', 84: '2026-07-02',
  85: '2026-07-02', 86: '2026-07-03', 87: '2026-07-03', 88: '2026-07-03',
  89: '2026-07-04', 90: '2026-07-04', 91: '2026-07-05', 92: '2026-07-05',
  93: '2026-07-06', 94: '2026-07-06', 95: '2026-07-07', 96: '2026-07-07',
  97: '2026-07-09', 98: '2026-07-10', 99: '2026-07-11', 100: '2026-07-11',
  101: '2026-07-14', 102: '2026-07-15', 103: '2026-07-18', 104: '2026-07-19',
};

// Winner-feeders for every match from the Round of 16 on. M103 (third place) takes
// the two semi-final LOSERS, flagged separately.
export const FEEDERS = {
  89: [74, 77], 90: [73, 75], 91: [76, 78], 92: [79, 80],
  93: [83, 84], 94: [81, 82], 95: [86, 88], 96: [85, 87],
  97: [89, 90], 98: [93, 94], 99: [91, 92], 100: [95, 96],
  101: [97, 98], 102: [99, 100],
  104: [101, 102],
  103: [101, 102], // losers
};
export const LOSER_FEED = new Set([103]);

export const ROUND_OF = (() => {
  const r = {};
  for (let n = 73; n <= 88; n++) r[n] = 'LAST_32';
  for (let n = 89; n <= 96; n++) r[n] = 'LAST_16';
  for (let n = 97; n <= 100; n++) r[n] = 'QUARTER_FINALS';
  r[101] = 'SEMI_FINALS'; r[102] = 'SEMI_FINALS';
  r[103] = 'THIRD_PLACE';
  r[104] = 'FINAL';
  return r;
})();

export const ROUND_LABEL = {
  LAST_32: 'Round of 32',
  LAST_16: 'Round of 16',
  QUARTER_FINALS: 'Quarter-finals',
  SEMI_FINALS: 'Semi-finals',
  THIRD_PLACE: 'Third place',
  FINAL: 'Final',
};

// Top-to-bottom display order per column, chosen so each match sits between its
// two feeders with no crossing lines (derived by DFS from the final).
export const COLUMN_ORDER = {
  LAST_32: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
  LAST_16: [89, 90, 93, 94, 91, 92, 95, 96],
  QUARTER_FINALS: [97, 98, 99, 100],
  SEMI_FINALS: [101, 102],
  FINAL: [104],
  THIRD_PLACE: [103],
};

// Left-to-right columns of the tree (third-place rides along in the final column).
export const COLUMNS = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];

export function slotLabel(slot) {
  if (slot.kind === '3rd') return '3rd-place team';
  return `${slot.kind === 'W' ? 'Winner' : 'Runner-up'} Group ${slot.group}`;
}

// child match number -> the match its WINNER advances to (third-place's loser
// edges excluded), so we can trace a match's route forward to the final.
export const WINNER_PARENT = (() => {
  const m = {};
  for (const [p, fs] of Object.entries(FEEDERS)) {
    if (LOSER_FEED.has(Number(p))) continue;
    for (const c of fs) m[c] = Number(p);
  }
  return m;
})();

// The set of matches on a given match's path: itself, the two it draws from,
// and the chain of matches its winner could advance through to the final.
export function bracketPath(no) {
  const set = new Set([no]);
  (FEEDERS[no] ?? []).forEach((c) => set.add(c));
  let cur = WINNER_PARENT[no];
  while (cur) { set.add(cur); cur = WINNER_PARENT[cur]; }
  return set;
}
