import { useEffect, useRef, useState } from 'react';
import { COLUMNS, COLUMN_ORDER, ROUND_LABEL, ROUND_OF, WINNER_PARENT, bracketPath } from '../data/bracket2026.js';
import MatchSticker from './MatchSticker.jsx';
import SlotCard from './SlotCard.jsx';
import './BracketColumns.css';

const ROUNDS = [...COLUMNS, 'THIRD_PLACE'];

export default function BracketColumns({ nodes, currentRound }) {
  const [sel, setSel] = useState(null);
  const path = sel ? bracketPath(sel) : null;
  const ref = useRef(null);

  // Open on the current round.
  useEffect(() => {
    const el = ref.current?.querySelector(`[data-round="${currentRound}"]`);
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ inline: 'start', block: 'nearest' });
  }, [currentRound]);

  const advanceTo = (no) => {
    if (no === 104) return '🏆 The Final';
    const parent = WINNER_PARENT[no];
    return parent ? `Winner → ${ROUND_LABEL[ROUND_OF[parent]]}` : null;
  };

  return (
    <div className="bcols-wrap">
      <p className="bcols__hint">Scroll sideways through the rounds → · tap a match to trace its route</p>
      <div className={`bcols ${path ? 'has-sel' : ''}`} ref={ref}>
        {ROUNDS.map((round) => (
          <div className="bcols__col" data-round={round} key={round}>
            <h3 className={`bcols__head ${round === currentRound ? 'is-current' : ''}`}>{ROUND_LABEL[round]}</h3>
            {COLUMN_ORDER[round].map((no) => {
              const n = nodes.get(no);
              const onPath = path ? path.has(no) : true;
              const to = advanceTo(no);
              return (
                <div
                  key={no}
                  className={`bcols__node ${onPath ? '' : 'is-dim'} ${sel === no ? 'is-sel' : ''}`}
                  onClick={() => setSel(sel === no ? null : no)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') setSel(sel === no ? null : no); }}
                >
                  {n.match
                    ? <MatchSticker match={n.match} showStage={false} />
                    : <SlotCard home={n.home?.name ?? n.homeLabel} away={n.away?.name ?? n.awayLabel} />}
                  {to && <p className="bcols__advance">{to}</p>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
