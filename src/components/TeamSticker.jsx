import './TeamSticker.css';

const ADV_LABEL = { through: 'Through ✅', out: 'Out ❌' };

export default function TeamSticker({ team, align = 'left', advancement = null }) {
  const cls = `team ${align === 'right' ? 'team--right' : ''}`.trim();
  return (
    <span className={cls}>
      <span className="team__badge">
        {team.crest ? <img src={team.crest} alt="" /> : (team.tla ?? '??')}
      </span>
      <span className="team__info">
        <span className="team__name">{team.name}</span>
        {advancement && ADV_LABEL[advancement] && (
          <span className={`team__adv team__adv--${advancement}`}>{ADV_LABEL[advancement]}</span>
        )}
      </span>
    </span>
  );
}
