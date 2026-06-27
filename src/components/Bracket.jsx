import { useEffect, useRef } from 'react';
import { buildKnockout } from '../lib/knockoutDisplay.js';
import { COLUMNS, COLUMN_ORDER, ROUND_LABEL } from '../data/bracket2026.js';
import MatchSticker from './MatchSticker.jsx';
import StickerCard from './StickerCard.jsx';
import TeamSticker from './TeamSticker.jsx';
import './Bracket.css';

const ROUNDS = [...COLUMNS, 'THIRD_PLACE'];
const DONE = new Set(['FINISHED', 'AWARDED']);

// Undecided slot (no live fixture yet): same card shell + team primitives as a
// real match, minus the score/venue we don't have.
function SlotPlaceholder({ home, away }) {
  return (
    <StickerCard>
      <div className="match" style={{ position: 'relative', zIndex: 1 }}>
        <TeamSticker team={null} display={home} />
        <div className="match__mid"><span className="match__time">vs</span></div>
        <TeamSticker team={null} align="right" display={away} />
      </div>
    </StickerCard>
  );
}

// Plain round-by-round bracket. Decided matches render the SAME MatchSticker used
// across Today/Timeline/Cities (time, city, TV, score, live phase) with the
// knockout seed enrichment on any undecided side; future slots show a placeholder.
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
            {COLUMN_ORDER[round].map((no) => {
              const n = nodes.get(no);
              const ko = { home: n.homeDisplay, away: n.awayDisplay };
              return n.match
                ? <MatchSticker key={no} match={n.match} showStage={false} knockout={ko} />
                : <SlotPlaceholder key={no} home={n.homeDisplay} away={n.awayDisplay} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
