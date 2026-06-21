import { pickMatchToWatch } from '../lib/watch.js';
import MatchSticker from './MatchSticker.jsx';

export default function WhatToWatch({ matches }) {
  const pick = pickMatchToWatch(matches);
  if (!pick) return null;
  return (
    <div className="watch" style={{ marginBottom: 16 }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        textTransform: 'uppercase',
        color: 'var(--gold)',
        fontSize: '15px',
        letterSpacing: '0.08em',
        marginBottom: 8,
      }}>
        ⭐ What to watch — {pick.reason}
      </div>
      <MatchSticker match={pick.match} featured />
    </div>
  );
}
