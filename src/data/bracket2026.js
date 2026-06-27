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
  74: [{ kind: 'W', group: 'E' }, { kind: '3rd' }],
  75: [{ kind: 'W', group: 'F' }, { kind: 'RU', group: 'C' }],
  76: [{ kind: 'W', group: 'C' }, { kind: 'RU', group: 'F' }],
  77: [{ kind: 'W', group: 'I' }, { kind: '3rd' }],
  78: [{ kind: 'RU', group: 'E' }, { kind: 'RU', group: 'I' }],
  79: [{ kind: 'W', group: 'A' }, { kind: '3rd' }],
  80: [{ kind: 'W', group: 'L' }, { kind: '3rd' }],
  81: [{ kind: 'W', group: 'D' }, { kind: '3rd' }],
  82: [{ kind: 'W', group: 'G' }, { kind: '3rd' }],
  83: [{ kind: 'RU', group: 'K' }, { kind: 'RU', group: 'L' }],
  84: [{ kind: 'W', group: 'H' }, { kind: 'RU', group: 'J' }],
  85: [{ kind: 'W', group: 'B' }, { kind: '3rd' }],
  86: [{ kind: 'W', group: 'J' }, { kind: 'RU', group: 'H' }],
  87: [{ kind: 'W', group: 'K' }, { kind: '3rd' }],
  88: [{ kind: 'RU', group: 'D' }, { kind: 'RU', group: 'G' }],
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
