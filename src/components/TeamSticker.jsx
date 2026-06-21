import './TeamSticker.css';

export default function TeamSticker({ team, align = 'left' }) {
  const cls = `team ${align === 'right' ? 'team--right' : ''}`.trim();
  return (
    <span className={cls}>
      <span className="team__badge">
        {team.crest ? <img src={team.crest} alt="" /> : (team.tla ?? '??')}
      </span>
      <span className="team__name">{team.name}</span>
    </span>
  );
}
