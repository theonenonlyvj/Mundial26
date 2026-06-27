import { useEffect, useMemo, useRef } from 'react';
import { resolveBracket } from '../lib/bracketTree.js';
import { COLUMNS, COLUMN_ORDER, ROUND_LABEL, FEEDERS } from '../data/bracket2026.js';
import './BracketTree.css';

const ROW_H = 92;
const NODE_W = 212;
const NODE_H = 72;
const COL_GAP = 46;
const COL_W = NODE_W + COL_GAP;
const HEADER_H = 34;
const PAD = 6;

const DONE = new Set(['FINISHED', 'AWARDED']);

// Lay every match out as a binary tree: Round-of-32 evenly down the first column,
// each later match vertically centred between the two it feeds from.
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
  // Third-place match rides in the final column, just below the final.
  pos.set(103, { x: 4 * COL_W, y: pos.get(104).y + ROW_H * 1.7 });
  return pos;
}

function TeamRow({ team, label, score, isWinner, faded }) {
  const name = team ? (team.tla || team.name) : label;
  return (
    <div className={`bnode__team ${team ? '' : 'is-tbd'} ${isWinner ? 'is-winner' : ''} ${faded ? 'is-faded' : ''}`}>
      {team?.crest
        ? <img className="bnode__flag" src={team.crest} alt="" />
        : <span className="bnode__flag bnode__flag--empty" aria-hidden="true" />}
      <span className="bnode__name" title={team?.name ?? label}>{name}</span>
      {score != null && <span className="bnode__score">{score}</span>}
    </div>
  );
}

export default function BracketTree({ matches = [], standings = null }) {
  const wrapRef = useRef(null);
  const ko = useMemo(() => matches.filter((m) => m.stage !== 'GROUP_STAGE'), [matches]);
  const { nodes } = useMemo(() => resolveBracket(ko, standings), [ko, standings]);

  const pos = useMemo(layout, []);
  const maxY = Math.max(...[...pos.values()].map((p) => p.y));
  const width = 4 * COL_W + NODE_W + PAD * 2;
  const height = maxY + HEADER_H + NODE_H + PAD * 2;

  // Current round = earliest column still holding a match that isn't finished.
  const currentRound = COLUMNS.find((r) =>
    COLUMN_ORDER[r].some((no) => { const n = nodes.get(no); return n.match && !DONE.has(n.status); }),
  ) ?? 'LAST_32';
  const currentCol = COLUMNS.indexOf(currentRound);

  useEffect(() => {
    const wrap = wrapRef.current;
    const scroller = wrap?.querySelector('.btree-scroll');
    if (scroller) scroller.scrollLeft = Math.max(0, currentCol * COL_W - 8);
  }, [currentCol]);

  // Connector paths from each match back to the two it draws from.
  const edges = [];
  for (const [no, n] of nodes) {
    if (!n.feeders) continue;
    const p = pos.get(no);
    const loser = no === 103;
    for (const f of n.feeders) {
      const fp = pos.get(f);
      const x1 = fp.x + NODE_W; const y1 = fp.y + HEADER_H + NODE_H / 2 + PAD;
      const x2 = p.x; const y2 = p.y + HEADER_H + NODE_H / 2 + PAD;
      const cx = COL_GAP * 0.55;
      edges.push({ key: `${f}-${no}`, loser, d: `M ${x1} ${y1} C ${x1 + cx} ${y1}, ${x2 - cx} ${y2}, ${x2} ${y2}` });
    }
  }

  return (
    <div className="btree-wrap" ref={wrapRef}>
      <p className="btree__hint">Scroll sideways to follow the path to the final →</p>
      <div className="btree-scroll">
        <div className="btree" style={{ width, height }}>
          <svg className="btree__lines" width={width} height={height} aria-hidden="true">
            {edges.map((e) => (
              <path key={e.key} d={e.d} className={`btree__line ${e.loser ? 'is-loser' : ''}`} />
            ))}
          </svg>

          {COLUMNS.map((round, ci) => (
            <div
              key={round}
              className={`btree__col-head ${round === currentRound ? 'is-current' : ''}`}
              style={{ left: ci * COL_W + PAD, top: PAD, width: NODE_W }}
            >
              {ROUND_LABEL[round]}
            </div>
          ))}

          {[...nodes.values()].map((n) => {
            const p = pos.get(n.no);
            const played = n.score && (n.score.home != null || n.score.away != null);
            const winId = n.winner?.id;
            return (
              <div
                key={n.no}
                className={`bnode ${n.isLive ? 'is-live' : ''} ${n.round === currentRound ? 'is-current' : ''} ${n.no === 103 ? 'is-third' : ''}`}
                style={{ left: p.x + PAD, top: p.y + HEADER_H + PAD, width: NODE_W, height: NODE_H }}
              >
                <TeamRow team={n.home} label={n.homeLabel} score={played ? n.score.home : null}
                  isWinner={winId && n.home && winId === n.home.id} faded={n.isDone && winId && n.home && winId !== n.home.id} />
                <TeamRow team={n.away} label={n.awayLabel} score={played ? n.score.away : null}
                  isWinner={winId && n.away && winId === n.away.id} faded={n.isDone && winId && n.away && winId !== n.away.id} />
                {n.isLive && <span className="bnode__live">LIVE</span>}
                {n.no === 103 && <span className="bnode__tag">3rd place</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
