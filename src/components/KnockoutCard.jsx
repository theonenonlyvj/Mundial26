import { formatKickoff } from '../lib/kickoff.js';
import SplitMedallion from './SplitMedallion.jsx';
import './KnockoutCard.css';

const PLAYED = new Set(['IN_PLAY', 'PAUSED', 'FINISHED', 'AWARDED']);
const LIVE = new Set(['IN_PLAY', 'PAUSED']);

function Participant({ d, align }) {
  const cls = `kc__team ${align === 'right' ? 'kc__team--right' : ''}`.trim();
  if (!d || d.kind === 'tbd') {
    return <span className={cls}><span className="kc__medal kc__medal--empty">?</span><span className="kc__name kc__name--muted">TBD</span></span>;
  }
  if (d.kind === 'team') {
    return (
      <span className={cls}>
        <span className="kc__medal">{d.team.crest ? <img src={d.team.crest} alt="" /> : (d.team.tla ?? '??')}</span>
        <span className="kc__name">{d.team.name}</span>
      </span>
    );
  }
  if (d.kind === 'slot') {
    return <span className={cls}><span className="kc__medal kc__medal--empty">?</span><span className="kc__name kc__name--muted">{d.label}</span></span>;
  }
  // either — feeder known but not yet decided
  return (
    <span className={cls}>
      <SplitMedallion a={d.a} b={d.b} size={34} />
      <span className="kc__name kc__name--either">{d.a.name} <em>or</em> {d.b.name}</span>
    </span>
  );
}

export default function KnockoutCard({ node, now = new Date().toISOString() }) {
  const m = node.match;
  const played = m && PLAYED.has(m.status);
  const isLive = m && LIVE.has(m.status);
  return (
    <div className={`kc ${isLive ? 'kc--live' : ''}`}>
      <div className="kc__row">
        <Participant d={node.homeDisplay} />
        <div className="kc__mid">
          {played ? (
            <div className="kc__score"><span>{node.score?.home ?? 0}</span>–<span>{node.score?.away ?? 0}</span></div>
          ) : m ? (
            <div className="kc__time">{formatKickoff(m.utcDate, now)}</div>
          ) : (
            <div className="kc__vs">vs</div>
          )}
          {isLive && <span className="kc__live">LIVE</span>}
        </div>
        <Participant d={node.awayDisplay} align="right" />
      </div>
      {m?.city && (
        <div className="kc__meta">{m.city.city}{m.channels ? ` · 📺 ${m.channels.en}` : ''}</div>
      )}
    </div>
  );
}
