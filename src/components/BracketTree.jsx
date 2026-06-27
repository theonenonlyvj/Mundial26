import { useEffect, useMemo, useRef, useState } from 'react';
import { COLUMNS, COLUMN_ORDER, ROUND_LABEL, FEEDERS, bracketPath } from '../data/bracket2026.js';
import MatchSticker from './MatchSticker.jsx';
import SlotCard from './SlotCard.jsx';
import './BracketTree.css';

const NODE_W = 270;
const NODE_H = 150;
const ROW_H = 176;
const COL_GAP = 74;
const COL_W = NODE_W + COL_GAP;
const HEADER_H = 34;
const PAD = 6;
const MID = HEADER_H + PAD + 64; // connector attach height within a node

// Binary-tree layout: Round-of-32 evenly down column one, each later match
// vertically centred between the two it draws from.
function layout() {
  const pos = new Map();
  COLUMN_ORDER.LAST_32.forEach((no, i) => pos.set(no, { x: 0, y: i * ROW_H }));
  COLUMNS.slice(1).forEach((round, ci) => {
    const x = (ci + 1) * COL_W;
    COLUMN_ORDER[round].forEach((no) => {
      const [a, b] = FEEDERS[no];
      pos.set(no, { x, y: (pos.get(a).y + pos.get(b).y) / 2 });
    });
  });
  pos.set(103, { x: 4 * COL_W, y: pos.get(104).y + ROW_H * 1.5 });
  return pos;
}

export default function BracketTree({ nodes, currentRound }) {
  const wrapRef = useRef(null);
  const [sel, setSel] = useState(null);
  const pos = useMemo(layout, []);
  const path = sel ? bracketPath(sel) : null;

  const maxY = Math.max(...[...pos.values()].map((p) => p.y));
  const width = 4 * COL_W + NODE_W + PAD * 2;
  const height = maxY + HEADER_H + NODE_H + PAD * 2;
  const currentCol = COLUMNS.indexOf(currentRound);

  useEffect(() => {
    const scroller = wrapRef.current?.querySelector('.btree-scroll');
    if (scroller) scroller.scrollLeft = Math.max(0, currentCol * COL_W - 8);
  }, [currentCol]);

  const edges = [];
  for (const [no, n] of nodes) {
    if (!n.feeders) continue;
    const p = pos.get(no);
    for (const f of n.feeders) {
      const fp = pos.get(f);
      const x1 = fp.x + NODE_W; const y1 = fp.y + MID;
      const x2 = p.x; const y2 = p.y + MID;
      const cx = COL_GAP * 0.5;
      edges.push({
        key: `${f}-${no}`, loser: no === 103,
        active: path ? (path.has(f) && path.has(no)) : false,
        d: `M ${x1} ${y1} C ${x1 + cx} ${y1}, ${x2 - cx} ${y2}, ${x2} ${y2}`,
      });
    }
  }

  return (
    <div className="btree-wrap" ref={wrapRef}>
      <p className="btree__hint">Scroll to follow the path to the final → · tap a match to trace its route</p>
      <div className="btree-scroll">
        <div className={`btree ${path ? 'has-sel' : ''}`} style={{ width, height }}>
          <svg className="btree__lines" width={width} height={height} aria-hidden="true">
            {edges.map((e) => (
              <path key={e.key} d={e.d} className={`btree__line ${e.loser ? 'is-loser' : ''} ${e.active ? 'is-active' : ''}`} />
            ))}
          </svg>

          {COLUMNS.map((round, ci) => (
            <div key={round} className={`btree__col-head ${round === currentRound ? 'is-current' : ''}`}
              style={{ left: ci * COL_W + PAD, top: PAD, width: NODE_W }}>
              {ROUND_LABEL[round]}
            </div>
          ))}

          {[...nodes.values()].map((n) => {
            const p = pos.get(n.no);
            const onPath = path ? path.has(n.no) : true;
            return (
              <div
                key={n.no}
                className={`btree__node ${onPath ? '' : 'is-dim'} ${sel === n.no ? 'is-sel' : ''}`}
                style={{ left: p.x + PAD, top: p.y + HEADER_H + PAD, width: NODE_W, minHeight: NODE_H }}
                onClick={() => setSel(sel === n.no ? null : n.no)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setSel(sel === n.no ? null : n.no); }}
              >
                {n.match
                  ? <MatchSticker match={n.match} showStage={false} />
                  : <SlotCard home={n.home?.name ?? n.homeLabel} away={n.away?.name ?? n.awayLabel} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
