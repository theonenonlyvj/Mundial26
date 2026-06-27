import './SplitMedallion.css';

// A medallion split diagonally between two possible teams' flags, for an
// undecided knockout slot whose feeder is known ("Canada OR South Africa").
export default function SplitMedallion({ a, b, size = 38 }) {
  return (
    <span className="splitmed" style={{ width: size, height: size }} aria-hidden="true">
      <span className="splitmed__half splitmed__half--a"
        style={a?.crest ? { backgroundImage: `url(${a.crest})` } : undefined} />
      <span className="splitmed__half splitmed__half--b"
        style={b?.crest ? { backgroundImage: `url(${b.crest})` } : undefined} />
      <span className="splitmed__slash" />
    </span>
  );
}
