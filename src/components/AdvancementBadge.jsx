import Emoji from './Emoji.jsx';
import './AdvancementBadge.css';

const LABELS = {
  through: { text: 'Through', code: '2705', label: 'check mark' },
  alive: { text: 'Alive', code: '26A0', label: 'warning' },
  out: { text: 'Out', code: '274C', label: 'cross mark' },
};

export default function AdvancementBadge({ status }) {
  const l = LABELS[status];
  if (!l) return <span className={`adv adv--${status}`}>{status}</span>;
  return (
    <span className={`adv adv--${status}`}>{l.text} <Emoji code={l.code} label={l.label} /></span>
  );
}
