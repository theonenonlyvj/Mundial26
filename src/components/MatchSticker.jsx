import StickerCard from './StickerCard.jsx';
import TeamSticker from './TeamSticker.jsx';
import './MatchSticker.css';

const LIVE = new Set(['IN_PLAY', 'PAUSED']);
const PLAYED = new Set(['IN_PLAY', 'PAUSED', 'FINISHED']);

function kickoff(utcDate) {
  if (!utcDate) return '';
  return new Date(utcDate).toLocaleString(undefined, {
    weekday: 'short', hour: 'numeric', minute: '2-digit',
  });
}

export default function MatchSticker({ match }) {
  const isLive = LIVE.has(match.status);
  const showScore = PLAYED.has(match.status);
  return (
    <StickerCard foil={isLive}>
      <div className="match">
        <TeamSticker team={match.home} />
        <div className="match__mid">
          {showScore ? (
            <div className="match__score">
              <span>{match.score.home ?? 0}</span> – <span>{match.score.away ?? 0}</span>
            </div>
          ) : (
            <div className="match__time" data-testid="kickoff">{kickoff(match.utcDate)}</div>
          )}
          {isLive && <span className="match__live">LIVE</span>}
        </div>
        <TeamSticker team={match.away} align="right" />
      </div>
      {match.city && <div className="match__city">{match.city.city}</div>}
      {match.channels && (
        <div className="match__channels">📺 {match.channels.en} · {match.channels.es}</div>
      )}
    </StickerCard>
  );
}
