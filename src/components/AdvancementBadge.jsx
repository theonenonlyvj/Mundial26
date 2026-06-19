import './AdvancementBadge.css';

const LABELS = { through: 'Through ✅', alive: 'Alive ⚠️', out: 'Out ❌' };

export default function AdvancementBadge({ status }) {
  return <span className={`adv adv--${status}`}>{LABELS[status] ?? status}</span>;
}
