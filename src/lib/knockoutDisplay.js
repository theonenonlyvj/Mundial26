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

// Cap how many possible teams we'll show as a flag mosaic on a side: up to a SF
// (8). The final (up to 16) falls back to a "Winner SF" label.
const POOL_MAX = 8;

// The recursive "who could occupy this side" tree:
//   { teams: [team] }          a decided/known team
//   { match: [left, right] }   undecided — the winner of a sub-match (each a subtree)
//   { slot: label }            a seed / "Winner R16" / "Semi-final loser" (no concrete team yet)
// Uses node.home/away, which resolveBracket already propagates forward — so a side
// resolves to its competitors as soon as the matches that decide them are played,
// regardless of whether the feed has populated the intermediate fixture.
function possibilities(nodes, no, idx) {
  const node = nodes.get(no);
  const team = idx === 0 ? node.home : node.away;
  if (team && team.id != null) return { teams: [team] };
  if (node.round === 'LAST_32') return { slot: shortSlot(R32_SLOTS[no][idx]) };
  if (LOSER_FEED.has(no)) {
    const lf = (FEEDERS[no] ?? [])[idx];
    const fl = lf != null ? nodes.get(lf) : null;
    return fl?.loser ? { teams: [fl.loser] } : { slot: 'Semi-final loser' };
  }
  const feederNo = (FEEDERS[no] ?? [])[idx];
  if (feederNo == null) return { slot: 'TBD' };
  const f = nodes.get(feederNo);
  if (f.winner) return { teams: [f.winner] };
  return { match: [possibilities(nodes, feederNo, 0), possibilities(nodes, feederNo, 1)] };
}

function flattenTeams(p) {
  if (p.teams) return p.teams;
  if (p.match) return [...flattenTeams(p.match[0]), ...flattenTeams(p.match[1])];
  return [];
}

// True only if every leaf of the possibility tree is a concrete team (no seeds /
// unknowns) — i.e. we can render a clean flag mosaic + nested label.
function hasOnlyTeams(p) {
  if (p.teams) return p.teams.length > 0;
  if (p.match) return hasOnlyTeams(p.match[0]) && hasOnlyTeams(p.match[1]);
  return false;
}

// Probability each possible team OCCUPIES this side, under 50/50 per still-unplayed
// match (and 100% for matches already won — those collapse to a single team). A
// match mixes its two competitors evenly, so depth halves a team's share each round:
// e.g. {PAR:¼, FRA:⅛, SWE:⅛, CAN:¼, MOR:¼}. Returns Map team.id -> weight (sums to 1).
function teamWeights(p) {
  if (p.teams) {
    const w = 1 / p.teams.length;
    return new Map(p.teams.map((t) => [t.id, w]));
  }
  if (p.match) {
    const out = new Map();
    for (const half of p.match) {
      for (const [id, weight] of teamWeights(half)) {
        out.set(id, (out.get(id) ?? 0) + weight / 2);
      }
    }
    return out;
  }
  return new Map();
}

// One competitor: a single team → its full name; a sub-pool → its TLAs joined by "/".
function compLabel(p) {
  const teams = flattenTeams(p);
  if (teams.length === 1) return teams[0].name;
  return teams.map((t) => t.tla ?? t.name).join('/');
}
function poolLabel(p) {
  if (p.match) return `${compLabel(p.match[0])} or ${compLabel(p.match[1])}`;
  return compLabel(p);
}

// What to show for one side of a knockout match:
//  - { kind:'team', team }                 a decided team
//  - { kind:'slot', label }                a seed / "Winner R16" / "Semi-final loser"
//  - { kind:'pool', teams:[], label }      2–4 possible teams ("Paraguay or FRA/SWE")
function sideDisplay(nodes, no, idx) {
  const p = possibilities(nodes, no, idx);
  if (p.slot) return { kind: 'slot', label: p.slot };
  const teams = flattenTeams(p);
  if (teams.length === 1) return { kind: 'team', team: teams[0] };
  if (teams.length >= 2 && teams.length <= POOL_MAX && hasOnlyTeams(p)) {
    const wmap = teamWeights(p);
    const weights = teams.map((t) => wmap.get(t.id) ?? 0);
    return { kind: 'pool', teams, label: poolLabel(p), weights };
  }
  // too deep to enumerate cleanly yet (e.g. a SF side) — show "Winner <round>".
  const feederNo = (FEEDERS[no] ?? [])[idx];
  return { kind: 'slot', label: feederNo != null ? `Winner ${SHORT_ROUND[ROUND_OF[feederNo]]}` : 'TBD' };
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
