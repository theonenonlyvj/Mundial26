export const TERMS = {
  groupStage: { word: 'group stage', define: 'The first round. 48 teams are split into 12 groups of 4; everyone in a group plays everyone else once.' },
  goalDifference: { word: 'goal difference', define: 'Goals scored minus goals conceded (column GD). Used to rank teams level on points.' },
  knockout: { word: 'knockout', define: 'Single-elimination rounds after the groups — lose and you\'re out.' },
  draw: { word: 'draw', define: 'A tie — the match ends level (column D). In the group stage each team gets 1 point.' },
  matchday: { word: 'matchday', define: 'A round of group games. Each team plays 3 matchdays in the group stage.' },
  bestThird: { word: 'best third-place team', define: 'The 8 strongest 3rd-place finishers across the 12 groups also advance.' },
  roundOf32: { word: 'Round of 32', define: 'The first knockout round in 2026: the 32 qualifiers play single-elimination.' },
  roundOf16: { word: 'Round of 16', define: 'The knockout round after the Round of 32 — 16 teams left, win or go home.' },
  quarterFinal: { word: 'quarter-final', define: 'The round of the last 8 teams.' },
  semiFinal: { word: 'semi-final', define: 'The round of the last 4 teams; the winners reach the Final.' },
  extraTime: { word: 'extra time', define: 'Two extra 15-minute halves added in the knockouts when a match is tied after 90 minutes.' },
  penalties: { word: 'penalty shootout', define: 'If a knockout match is still level after extra time, the teams take turns shooting from the penalty spot until one side wins.' },
  halftime: { word: 'halftime', define: 'The break in the middle of a match. Each half is 45 minutes.' },
  goldenBoot: { word: 'Golden Boot', define: 'The award for the tournament\'s top goalscorer.' },
  cleanSheet: { word: 'clean sheet', define: 'A match in which a team concedes no goals.' },
  // Standings column codes
  played: { word: 'played', define: 'Matches played so far (column P).' },
  won: { word: 'won', define: 'Matches won (column W). A win is worth 3 points.' },
  lost: { word: 'lost', define: 'Matches lost (column L). A loss is worth 0 points.' },
  goalsFor: { word: 'goals for', define: 'Total goals a team has scored (column GF).' },
  points: { word: 'points', define: 'Total points: 3 per win, 1 per draw, 0 per loss (column Pts). Points rank the group.' },
};

export function defineTerm(key) {
  return TERMS[key]?.define ?? '';
}
