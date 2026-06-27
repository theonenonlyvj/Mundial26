import './TeamSticker.css';
import SplitMedallion from './SplitMedallion.jsx';

const ADV_LABEL = { through: 'Through ✅', out: 'Out ❌' };

export default function TeamSticker({ team, align = 'left', advancement = null, display = null }) {
  const cls = `team ${align === 'right' ? 'team--right' : ''}`.trim();
  const unresolved = !team || team.id == null;

  // For an undecided knockout side, show its seed instead of bare "TBD".
  if (unresolved && display?.kind === 'slot') {
    return (
      <span className={cls}>
        <span className="team__badge team__badge--empty">?</span>
        <span className="team__info"><span className="team__name team__name--slot">{display.label}</span></span>
      </span>
    );
  }
  if (unresolved && display?.kind === 'either') {
    return (
      <span className={cls}>
        <SplitMedallion a={display.a} b={display.b} size={34} />
        <span className="team__info"><span className="team__name team__name--either">{display.a.name} <em>or</em> {display.b.name}</span></span>
      </span>
    );
  }

  return (
    <span className={cls}>
      <span className="team__badge">
        {team?.crest ? <img src={team.crest} alt="" /> : (team?.tla ?? '??')}
      </span>
      <span className="team__info">
        <span className="team__name">{team?.name ?? 'TBD'}</span>
        {advancement && ADV_LABEL[advancement] && (
          <span className={`team__adv team__adv--${advancement}`}>{ADV_LABEL[advancement]}</span>
        )}
      </span>
    </span>
  );
}
