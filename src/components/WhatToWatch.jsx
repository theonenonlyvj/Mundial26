import { pickMatchToWatch } from '../lib/watch.js';
import Emoji from './Emoji.jsx';
import { advancementForMatch } from '../lib/advancement.js';
import MatchSticker from './MatchSticker.jsx';

export default function WhatToWatch({ matches, now = new Date().toISOString(), advByTeam = null, koDisplay = null }) {
  const pick = pickMatchToWatch(matches, now);
  if (!pick) return null;
  const advancement = advancementForMatch(pick.match, advByTeam);
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
        <Emoji code="2B50" label="star" /> What to watch — {pick.reason}
      </div>
      <MatchSticker match={pick.match} now={now} featured advancement={advancement} knockout={koDisplay?.get(pick.match.id) ?? null} />
    </div>
  );
}
