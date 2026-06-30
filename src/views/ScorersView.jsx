import { getScorers } from '../api/client.js';
import Emoji from '../components/Emoji.jsx';
import { useLiveData } from '../hooks/useLiveData.js';
import { rankScorers } from '../lib/leaderboard.js';
import FreshnessNote from '../components/FreshnessNote.jsx';
import './ScorersView.css';

export default function ScorersView() {
  const { data, dataAsOf, error } = useLiveData('scorers', getScorers);
  const scorers = data ? rankScorers(data.scorers ?? []) : null;

  if (!scorers && error) return <section aria-label="Scorers" className="scorers"><p className="scorers__empty">Couldn't load top scorers right now.</p></section>;
  if (!scorers) return <section aria-label="Scorers" className="scorers"><p className="scorers__empty">Loading top scorers…</p></section>;

  return (
    <section aria-label="Scorers" className="scorers">
      <div className="scorers__eyebrow"><Emoji code="26BD" label="ball" /> Golden Boot</div>
      <h2 className="scorers__title">Top Scorers</h2>
      <p className="scorers__sub">
        The race for most goals at the tournament. Whoever finishes on top wins the
        Golden Boot — the award for the leading scorer.
      </p>
      <FreshnessNote at={dataAsOf} />

      {scorers.length === 0 ? (
        <p className="scorers__empty">No goals yet — check back once the matches kick off. <Emoji code="26BD" label="ball" /></p>
      ) : (
        <ol className="scorers__list">
          {scorers.map((s, i) => (
            <li key={`${s.name}-${s.team.tla ?? i}`} className={`scorer ${s.rank === 1 ? 'scorer--leader' : ''}`}>
              <span className="scorer__rank" aria-label={`Rank ${s.rank}`}>{s.rank === 1 ? '👑' : s.rank}</span>
              <span className="scorer__badge" aria-hidden="true">
                {s.team.crest ? <img src={s.team.crest} alt="" /> : (s.team.tla ?? '??')}
              </span>
              <span className="scorer__who">
                <span className="scorer__name">{s.name}</span>
                <span className="scorer__country">{s.nationality}</span>
              </span>
              <span className="scorer__stats">
                <span className="scorer__goalline">
                  <span className="scorer__goals">{s.goals}</span>
                  <span className="scorer__goals-label">{s.goals === 1 ? 'goal' : 'goals'}</span>
                </span>
                {s.playedMatches != null && (
                  <span className="scorer__played">in {s.playedMatches} {s.playedMatches === 1 ? 'match' : 'matches'}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
