import { resolveBracket } from './bracketTree.js';
import { R32_SLOTS, FEEDERS, ROUND_OF, LOSER_FEED } from '../data/bracket2026.js';

const SHORT_ROUND = {
  LAST_32: 'R32', LAST_16: 'R16', QUARTER_FINALS: 'QF',
  SEMI_FINALS: 'Semi-final', THIRD_PLACE: '3rd', FINAL: 'Final',
};

function shortSlot(slot) {
  // R32 third-place slot: a best-third team, from one of a known set of groups.
  if (slot.kind === '3rd') return slot.groups ? `3rd: ${slot.groups}` : 'best 3rd';
  return `Grp ${slot.group} · ${slot.kind === 'W' ? '1st' : '2nd'}`;
}

// What to show for one side of a knockout match:
//  - { kind:'team', team }            a decided team
//  - { kind:'slot', label }           a known seed ("Grp K · 1st", "3rd place")
//  - { kind:'either', a, b }          the two teams from a known feeder ("A OR B")
//  - { kind:'tbd' }                   genuinely unknown
function sideDisplay(nodes, no, idx) {
  const node = nodes.get(no);
  const team = idx === 0 ? node.home : node.away;
  if (team) return { kind: 'team', team };

  if (node.round === 'LAST_32') {
    return { kind: 'slot', label: shortSlot(R32_SLOTS[no][idx]) };
  }
  // The third-place match is contested by the two semi-final LOSERS.
  if (LOSER_FEED.has(no)) {
    const lf = (FEEDERS[no] ?? [])[idx];
    const fl = lf != null ? nodes.get(lf) : null;
    if (fl?.loser) return { kind: 'team', team: fl.loser }; // semi decided → who dropped down
    return { kind: 'slot', label: 'Semi-final loser' };
  }
  const feederNo = (FEEDERS[no] ?? [])[idx];
  if (feederNo != null) {
    const f = nodes.get(feederNo);
    // NOTE: the API's own answer already won above (`if (team)`). This branch only
    // runs while this match is still TBD in the feed — so once the feeder is
    // DECIDED, show the team that actually advanced; otherwise the "A or B" split,
    // else "Winner R32".
    if (f.winner) return { kind: 'team', team: f.winner };
    if (f.home && f.away) return { kind: 'either', a: f.home, b: f.away };
    return { kind: 'slot', label: `Winner ${SHORT_ROUND[ROUND_OF[feederNo]]}` };
  }
  return { kind: 'tbd' };
}

// Resolve the bracket and attach a home/away Display to every node. `byMatchId`
// lets other views (e.g. "Coming Up") enrich a live match's TBD side too.
export function buildKnockout(matches, standings) {
  const ko = (matches ?? []).filter((m) => m.stage !== 'GROUP_STAGE');
  const { nodes } = resolveBracket(ko, standings);
  const enriched = new Map();
  const byMatchId = new Map();
  for (const [no, node] of nodes) {
    const homeDisplay = sideDisplay(nodes, no, 0);
    const awayDisplay = sideDisplay(nodes, no, 1);
    enriched.set(no, { ...node, homeDisplay, awayDisplay });
    if (node.match?.id != null) byMatchId.set(node.match.id, { home: homeDisplay, away: awayDisplay });
  }
  return { nodes: enriched, byMatchId };
}
