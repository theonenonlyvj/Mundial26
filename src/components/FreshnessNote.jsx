import Emoji from './Emoji.jsx';
// Small "scores as of …" stamp so it's clear how fresh the showing data is —
// especially when it's the last-cached set shown while the API wakes up.
export default function FreshnessNote({ at }) {
  if (!at) return null;
  const when = new Date(at).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
  return (
    <p className="freshness" style={{ fontSize: '0.78em', color: 'var(--muted)', margin: '0 0 10px' }}>
      <Emoji code="1F558" label="clock" /> Scores as of {when}
    </p>
  );
}
