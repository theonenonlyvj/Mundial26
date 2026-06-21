import StickerCard from './StickerCard.jsx';
import AdvancementBadge from './AdvancementBadge.jsx';
import TeamSticker from './TeamSticker.jsx';
import Term from './Term.jsx';
import { defineTerm } from '../explainer/glossary.js';
import './GroupTable.css';

function label(groupKey) {
  return `Group ${groupKey.replace('GROUP_', '')}`;
}

export default function GroupTable({ group }) {
  return (
    <StickerCard className="gt-card">
      <table className="gt">
        <caption>{label(group.group)}</caption>
        <thead>
          <tr>
            <th>Team</th>
            <th title="Played">P</th>
            <th>W</th><th>D</th><th>L</th>
            <th><Term define={defineTerm('goalDifference')}>GD</Term></th>
            <th>Pts</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {group.table.map((row) => (
            <tr key={row.team.tla ?? row.rank}>
              <td><TeamSticker team={row.team} /></td>
              <td>{row.played}</td>
              <td>{row.won}</td><td>{row.draw}</td><td>{row.lost}</td>
              <td>{row.goalDifference}</td>
              <td><strong>{row.points}</strong></td>
              <td><AdvancementBadge status={row.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {group.table[0]?.note && <div className="gt__note">Leader: {group.table[0].note}</div>}
    </StickerCard>
  );
}
