const ORDER = [
  { stage: 'LAST_32', label: 'Round of 32' },
  { stage: 'LAST_16', label: 'Round of 16' },
  { stage: 'QUARTER_FINALS', label: 'Quarter-finals' },
  { stage: 'SEMI_FINALS', label: 'Semi-finals' },
  { stage: 'THIRD_PLACE', label: 'Third-place play-off' },
  { stage: 'FINAL', label: 'Final' },
];

export function knockoutRounds(matches) {
  return ORDER
    .map(({ stage, label }) => ({
      stage,
      label,
      matches: matches
        .filter((m) => m.stage === stage)
        .sort((a, b) => a.utcDate.localeCompare(b.utcDate)),
    }))
    .filter((round) => round.matches.length > 0);
}
