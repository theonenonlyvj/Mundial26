import StickerCard from './StickerCard.jsx';
import TeamSticker from './TeamSticker.jsx';
import { formatKickoff } from '../lib/kickoff.js';
import './MatchSticker.css';

const LIVE = new Set(['IN_PLAY', 'PAUSED']);
const PLAYED = new Set(['IN_PLAY', 'PAUSED', 'FINISHED']);

export default function MatchSticker({ match, now = new Date().toISOString(), featured = false }) {
  const isLive = LIVE.has(match.status);
  const showScore = PLAYED.has(match.status);
  const rootClass = ['match', featured && 'match--featured'].filter(Boolean).join(' ');
  return (
    <StickerCard foil={isLive || featured} className={featured ? 'match--featured-card' : ''}>
      {match.home.crest && <div className="match__wash match__wash--l" style={{ backgroundImage: `url(${match.home.crest})` }} aria-hidden="true" />}
      {match.away.crest && <div className="match__wash match__wash--r" style={{ backgroundImage: `url(${match.away.crest})` }} aria-hidden="true" />}
      <div className={rootClass} style={{ position: 'relative', zIndex: 1 }}>
        <TeamSticker team={match.home} featured={featured} />
        <div className="match__mid">
          {showScore ? (
            <div className="match__score">
              <span>{match.score.home ?? 0}</span> – <span>{match.score.away ?? 0}</span>
            </div>
          ) : (
            <div className="match__time" data-testid="kickoff">{formatKickoff(match.utcDate, now)}</div>
          )}
          {isLive && <span className="match__live">LIVE</span>}
        </div>
        <TeamSticker team={match.away} align="right" featured={featured} />
      </div>
      {match.city && <div className="match__city" style={{ position: 'relative', zIndex: 1 }}>{match.city.city}</div>}
      {match.channels && (
        <div className="match__channels" style={{ position: 'relative', zIndex: 1 }}>📺 {match.channels.en} · {match.channels.es}</div>
      )}
    </StickerCard>
  );
}
