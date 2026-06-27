import { useEffect, useRef } from 'react';
import { knockoutRounds } from '../lib/bracket.js';
import MatchSticker from './MatchSticker.jsx';
import './Bracket.css';

const DONE = new Set(['FINISHED', 'AWARDED']);

export default function Bracket({ matches }) {
  const rounds = knockoutRounds(matches);
  const wrapRef = useRef(null);

  // The "current" round is the earliest one that still has a match to play
  // (else the last round, once the tournament is done).
  const currentIdx = (() => {
    const i = rounds.findIndex((r) => r.matches.some((m) => !DONE.has(m.status)));
    return i === -1 ? rounds.length - 1 : i;
  })();

  // On open, scroll the current round to the left edge so you start where the
  // action is rather than always at Round of 32.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const scroller = wrap.querySelector('.bracket');
    const current = wrap.querySelector('[data-current="true"]');
    if (scroller && current) scroller.scrollLeft = Math.max(0, current.offsetLeft - 4);
  }, [rounds.length, currentIdx]);

  if (!rounds.length) {
    return <p style={{ color: 'var(--muted)' }}>The knockout bracket fills in once the groups finish. 🏆</p>;
  }
  return (
    <div className="bracket-wrap" ref={wrapRef}>
      {rounds.length > 1 && (
        <p className="bracket__hint">Scroll sideways to move through the rounds →</p>
      )}
      <div className="bracket">
        {rounds.map((round, i) => (
          <div
            className="bracket__round"
            key={round.stage}
            data-current={i === currentIdx ? 'true' : undefined}
          >
            <h3>{round.label}</h3>
            {round.matches.map((m) => <MatchSticker key={m.id} match={m} showStage={false} />)}
          </div>
        ))}
      </div>
    </div>
  );
}
