import './FlagMosaic.css';

const TAU = Math.PI * 2;
const pt = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
function wedgePath(cx, cy, r, a0, a1) {
  const [x0, y0] = pt(cx, cy, r, a0);
  const [x1, y1] = pt(cx, cy, r, a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} Z`;
}

// A circular medallion split into one wedge per possible team, each filled with the
// team's flag. Equal wedges by default; pass `weights` for a proportional mosaic
// (a later phase). 2 teams → a diagonal split; 4 → quadrants (an "X"). Dividers are
// drawn dark-under-light so the slash reads on any flag.
export default function FlagMosaic({ teams, weights = null, size = 34 }) {
  const n = teams?.length ?? 0;
  if (!n) return null;
  const w = weights && weights.length === n ? weights : teams.map(() => 1);
  const total = w.reduce((s, x) => s + x, 0) || 1;
  const r = size / 2;
  const cx = r;
  const cy = r;
  let a = -3 * Math.PI / 4; // start top-left so a 2-way split is a clean diagonal
  const wedges = teams.map((t, i) => {
    const a0 = a;
    const a1 = a + (w[i] / total) * TAU;
    a = a1;
    return { t, a0, a1, key: `w${i}` };
  });
  const uid = `fm-${size}-${n}`;
  return (
    <svg className="flag-mosaic" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <defs>
        {wedges.map((wd) => (
          <clipPath key={wd.key} id={`${uid}-${wd.key}`}>
            <path d={wedgePath(cx, cy, r, wd.a0, wd.a1)} />
          </clipPath>
        ))}
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="var(--paper-edge)" />
      {wedges.map((wd) => (wd.t.crest ? (
        <image key={wd.key} href={wd.t.crest} x="0" y="0" width={size} height={size} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${uid}-${wd.key})`} />
      ) : (
        <g key={wd.key} clipPath={`url(#${uid}-${wd.key})`}>
          <path d={wedgePath(cx, cy, r, wd.a0, wd.a1)} fill="var(--paper)" />
          <text x={cx + r * 0.5 * Math.cos((wd.a0 + wd.a1) / 2)} y={cy + r * 0.5 * Math.sin((wd.a0 + wd.a1) / 2)} fontSize={size * 0.2} fontWeight="700" textAnchor="middle" dominantBaseline="central" fill="var(--ink)">{wd.t.tla ?? '?'}</text>
        </g>
      )))}
      {wedges.map((wd) => {
        const [x, y] = pt(cx, cy, r, wd.a0);
        return (
          <g key={`d${wd.key}`}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(0,0,0,.55)" strokeWidth="2" />
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#fff" strokeWidth="0.9" />
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={r - 0.75} fill="none" stroke="var(--gold)" strokeWidth="1.5" />
    </svg>
  );
}
