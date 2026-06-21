import AdvancementBadge from './AdvancementBadge.jsx';

export default function Legend() {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '8px 0' }}>
      <AdvancementBadge status="through" /> <span>Into the knockouts</span>
      <AdvancementBadge status="alive" /> <span>Still in the hunt</span>
      <AdvancementBadge status="out" /> <span>Eliminated</span>
    </div>
  );
}
