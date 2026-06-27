import './SlotCard.css';

// Placeholder for a knockout slot whose team isn't decided yet — shows where the
// team will come from ("Winner Group J", "3rd-place team", "TBD").
export default function SlotCard({ home, away }) {
  return (
    <div className="slotcard">
      <span className="slotcard__team">{home}</span>
      <span className="slotcard__vs">vs</span>
      <span className="slotcard__team">{away}</span>
    </div>
  );
}
