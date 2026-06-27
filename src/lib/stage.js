const KO_LABELS = {
  LAST_32: 'Round of 32',
  LAST_16: 'Round of 16',
  QUARTER_FINALS: 'Quarter-final',
  SEMI_FINALS: 'Semi-final',
  THIRD_PLACE: '3rd-place play-off',
  FINAL: 'Final',
};

// Human-readable tag for a match's stage. Group matches become "Group A";
// knockout matches become "Round of 32" / "Quarter-final" / etc.
export function stageLabel(stage, group) {
  if (stage === 'GROUP_STAGE') {
    const g = group ? String(group).replace(/^group[\s_-]*/i, '').trim() : '';
    return g ? `Group ${g.toUpperCase()}` : 'Group stage';
  }
  return KO_LABELS[stage] ?? null;
}
