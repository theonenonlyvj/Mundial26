import './Emoji.css';

// Inline OpenMoji (CC BY-SA 4.0) replacing the system emoji font. `code` is the
// Unicode codepoint hex (e.g. "1F945"); SVGs live in public/emoji/.
export default function Emoji({ code, label = '' }) {
  return <img className="emoji" src={`/emoji/${code}.svg`} alt={label} draggable="false" />;
}
