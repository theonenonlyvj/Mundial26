import { resolveBracket } from '../lib/bracketTree.js';
import { COLUMNS, COLUMN_ORDER } from '../data/bracket2026.js';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import BracketTree from './BracketTree.jsx';
import BracketColumns from './BracketColumns.jsx';

const DONE = new Set(['FINISHED', 'AWARDED']);

// Responsive knockout bracket. Wide screens get the drawn connector tree; narrow
// screens get round-by-round columns. Both share the same resolved topology, so
// teams/scores and the tap-to-trace path are identical.
export default function Bracket({ matches = [], standings = null }) {
  const ko = matches.filter((m) => m.stage !== 'GROUP_STAGE');
  const { nodes } = resolveBracket(ko, standings);
  const wide = useMediaQuery('(min-width: 920px)');

  const currentRound = COLUMNS.find((r) =>
    COLUMN_ORDER[r].some((no) => { const n = nodes.get(no); return n.match && !DONE.has(n.status); }),
  ) ?? 'LAST_32';

  return wide
    ? <BracketTree nodes={nodes} currentRound={currentRound} />
    : <BracketColumns nodes={nodes} currentRound={currentRound} />;
}
