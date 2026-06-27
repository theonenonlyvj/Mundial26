import { useEffect, useRef } from 'react';
import { buildKnockout } from '../lib/knockoutDisplay.js';
import { COLUMNS, COLUMN_ORDER, ROUND_LABEL } from '../data/bracket2026.js';
import KnockoutCard from './KnockoutCard.jsx';
import './Bracket.css';

const ROUNDS = [...COLUMNS, 'THIRD_PLACE'];
const DONE = new Set(['FINISHED', 'AWARDED']);

// Plain round-by-round bracket built from the verified 2026 topology, so undecided
// slots show their seed ("Grp K · 1st", "3rd place") and Round-of-16 cards show
// "A OR B" with a split flag once their Round-of-32 tie is set.
export default function Bracket({ matches = [], standings = null }) {
  const { nodes } = buildKnockout(matches, standings);
  const wrapRef = useRef(null);

  const currentRound = ROUNDS.find((r) =>
    COLUMN_ORDER[r].some((no) => { const n = nodes.get(no); return n.match && !DONE.has(n.status); }),
  ) ?? 'LAST_32';

  useEffect(() => {
    const scroller = wrapRef.current?.querySelector('.bracket');
    const current = wrapRef.current?.querySelector('[data-current="true"]');
    if (scroller && current) scroller.scrollLeft = Math.max(0, current.offsetLeft - 4);
  }, [currentRound]);

  return (
    <div className="bracket-wrap" ref={wrapRef}>
      <p className="bracket__hint">Scroll sideways to move through the rounds →</p>
      <div className="bracket">
        {ROUNDS.map((round) => (
          <div className="bracket__round" key={round} data-current={round === currentRound ? 'true' : undefined}>
            <h3>{ROUND_LABEL[round]}</h3>
            {COLUMN_ORDER[round].map((no) => <KnockoutCard key={no} node={nodes.get(no)} />)}
          </div>
        ))}
      </div>
    </div>
  );
}
