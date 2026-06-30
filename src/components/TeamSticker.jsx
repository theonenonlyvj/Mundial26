import './TeamSticker.css';
import FlagMosaic from './FlagMosaic.jsx';
import Emoji from './Emoji.jsx';

const ADV_LABEL = {
  through: { text: 'Through', code: '2705', label: 'check mark' },
  out: { text: 'Out', code: '274C', label: 'cross mark' },
};

export default function TeamSticker({ team, align = 'left', advancement = null, display = null }) {
  const cls = `team ${align === 'right' ? 'team--right' : ''}`.trim();
  // Prefer the match's own team (the API's authoritative answer once it fills the
  // slot); while it's still TBD in the feed, fall back to the advancer we resolved
  // ourselves (winner/loser of a decided feeder, passed as a kind:'team' display).
  const resolvedTeam = team && team.id != null ? team : (display?.kind === 'team' ? display.team : team);
  const unresolved = !resolvedTeam || resolvedTeam.id == null;

  // For an undecided knockout side, show its seed instead of bare "TBD".
  if (unresolved && display?.kind === 'slot') {
    return (
      <span className={cls}>
        <span className="team__badge team__badge--empty">?</span>
        <span className="team__info"><span className="team__name team__name--slot">{display.label}</span></span>
      </span>
    );
  }
  // A side that could be 2–4 teams (e.g. an R16 "A or B", or a QF "POR/CRO or
  // ESP/AUT"): a flag mosaic + the nested label.
  if (unresolved && display?.kind === 'pool') {
    return (
      <span className={cls}>
        <FlagMosaic teams={display.teams} weights={display.weights} size={display.teams.length > 8 ? 62 : display.teams.length > 4 ? 50 : 34} />
        <span className="team__info"><span className="team__name team__name--either">{display.label}</span></span>
      </span>
    );
  }

  return (
    <span className={cls}>
      <span className="team__badge">
        {resolvedTeam?.crest ? <img src={resolvedTeam.crest} alt="" /> : (resolvedTeam?.tla ?? '??')}
      </span>
      <span className="team__info">
        <span className="team__name">{resolvedTeam?.name ?? 'TBD'}</span>
        {advancement && ADV_LABEL[advancement] && (
          <span className={`team__adv team__adv--${advancement}`}>{ADV_LABEL[advancement].text} <Emoji code={ADV_LABEL[advancement].code} label={ADV_LABEL[advancement].label} /></span>
        )}
      </span>
    </span>
  );
}
