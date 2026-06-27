import { knockoutRounds } from '../lib/bracket.js';
import MatchSticker from './MatchSticker.jsx';
import './Bracket.css';

export default function Bracket({ matches }) {
  const rounds = knockoutRounds(matches);
  if (!rounds.length) {
    return <p style={{ color: 'var(--muted)' }}>The knockout bracket fills in once the groups finish. 🏆</p>;
  }
  return (
    <div className="bracket-wrap">
      {rounds.length > 1 && (
        <p className="bracket__hint">Scroll sideways to move through the rounds →</p>
      )}
      <div className="bracket">
        {rounds.map((round) => (
          <div className="bracket__round" key={round.stage}>
            <h3>{round.label}</h3>
            {round.matches.map((m) => <MatchSticker key={m.id} match={m} showStage={false} />)}
          </div>
        ))}
      </div>
    </div>
  );
}
