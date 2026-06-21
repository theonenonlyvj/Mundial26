import { pickMatchToWatch } from '../lib/watch.js';
import MatchSticker from './MatchSticker.jsx';

export default function WhatToWatch({ matches }) {
  const pick = pickMatchToWatch(matches);
  if (!pick) return null;
  return (
    <div className="watch" style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 900, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
        ⭐ What to watch — {pick.reason}
      </div>
      <MatchSticker match={pick.match} />
    </div>
  );
}
