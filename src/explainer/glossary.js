export const TERMS = {
  groupStage: { word: 'group stage', define: 'The first round. 48 teams are split into 12 groups of 4; everyone in a group plays everyone else once.' },
  goalDifference: { word: 'goal difference', define: 'Goals scored minus goals conceded. Used to rank teams level on points.' },
  knockout: { word: 'knockout', define: 'Single-elimination rounds after the groups — lose and you\'re out.' },
  draw: { word: 'draw', define: 'A tie — the match ends level. In the group stage each team gets 1 point.' },
  matchday: { word: 'matchday', define: 'A round of group games. Each team plays 3 matchdays in the group stage.' },
  bestThird: { word: 'best third-place team', define: 'The 8 strongest 3rd-place finishers across the 12 groups also advance.' },
  roundOf32: { word: 'Round of 32', define: 'The first knockout round in 2026: the 32 qualifiers play single-elimination.' },
};

export function defineTerm(key) {
  return TERMS[key]?.define ?? '';
}
