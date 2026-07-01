import StickerCard from './StickerCard.jsx';
import AdvancementBadge from './AdvancementBadge.jsx';
import TeamSticker from './TeamSticker.jsx';
import Term from './Term.jsx';
import { defineTerm } from '../explainer/glossary.js';
import './GroupTable.css';

function label(groupKey) {
  const letter = String(groupKey).replace(/^group[\s_-]*/i, '').trim();
  return `Group ${letter}`;
}

export default function GroupTable({ group }) {
  return (
    <StickerCard className="gt-card">
      <table className="gt">
        <caption>{label(group.group)}</caption>
        <thead>
          <tr>
            <th>Team</th>
            <th><Term define={defineTerm('played')}>P</Term></th>
            <th><Term define={defineTerm('won')}>W</Term></th>
            <th><Term define={defineTerm('draw')}>D</Term></th>
            <th><Term define={defineTerm('lost')}>L</Term></th>
            <th><Term define={defineTerm('goalsFor')}>GF</Term></th>
            <th><Term define={defineTerm('goalDifference')}>GD</Term></th>
            <th><Term define={defineTerm('points')}>Pts</Term></th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {group.table.map((row) => (
            <tr key={row.team.tla ?? row.rank}>
              <td>
                <TeamSticker team={row.team} />
                {row.note && <div className="gt__row-note">{row.note}</div>}
              </td>
              <td>{row.played}</td>
              <td>{row.won}</td><td>{row.draw}</td><td>{row.lost}</td>
              <td>{row.goalsFor}</td>
              <td>{row.goalDifference}</td>
              <td><strong>{row.points}</strong></td>
              <td><AdvancementBadge status={row.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </StickerCard>
  );
}
