# Mundial26 — Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Prerequisite:** the Foundation plan (`2026-06-18-mundial26-foundation.md`) must be complete — this plan consumes its components (`MatchSticker`, `TeamSticker`, `StickerCard`, `AdvancementBadge`, `Term`), its API client, and its `/api/matches` + `/api/standings` endpoints.

**Goal:** Turn the deployed skeleton into the full, exciting, newcomer-friendly experience — the four views (Today, Timeline, Map, Standings & Bracket) plus a glossary, a "How it works" onboarding, and the stakes/story framing from spec §2.5.

**Architecture:** Pure-function libraries (date bucketing, match-to-watch selection, day grouping, bracket assembly, map projection) hold all the logic and are unit-tested deterministically with injected clocks/inputs. React views compose those libs with the Foundation components. One small backend addition exposes host-city reference data for the map.

**Tech Stack:** Same as Foundation (React 18, Vite, Vitest + @testing-library/react, Express).

## Global Constraints

- **§2.5 is a review criterion for every view:** stakes over stats, no unexplained jargon (wrap soccer terms in `<Term>`), a "what to watch" highlight on Today, story framing (upsets / must-win / still-alive), visual-first, delightful onboarding, collectible momentum.
- **Determinism:** date logic lives in pure functions that take an ISO `now` string or explicit inputs — never call `new Date()`/`Date.now()` inside a library function. Views pass `new Date().toISOString()` in (overridable via prop for tests).
- **Day grouping uses the UTC calendar date** (`utcDate.slice(0,10)`) for deterministic keys. (Documented v1 simplification; revisit if per-timezone day boundaries matter.)
- **TBD-safe:** knockout slots with undecided teams render `TBD` (Foundation's `normalizeTeam` already yields `{ name: 'TBD' }`).
- **Reuse, don't duplicate:** host-city data has one source (`server/data/hostCities.js`); the frontend reads it via `/api/reference` (Task 8.1), never a copied file.

---

## File Structure (added by this plan)

```
mundial26/
  src/
    lib/
      matchTime.js        # dayKey, bucketMatches(matches, nowIso)
      watch.js            # pickMatchToWatch(todayMatches)
      groupByDate.js      # groupMatchesByDay(matches)
      bracket.js          # knockoutRounds(matches)
      projectMap.js       # project(lat, lng, {width,height})
    explainer/
      glossary.js         # TERMS map (soccer jargon -> plain English)
      HowItWorks.jsx      # onboarding modal content
      HowItWorks.css
    components/
      GroupTable.jsx      # one group's table w/ badges + notes + Term headers
      GroupTable.css
      TiebreakerExplainer.jsx
      Bracket.jsx
      Bracket.css
      Modal.jsx           # small accessible modal shell
      Modal.css
      Legend.jsx          # through/alive/out color legend
      WhatToWatch.jsx     # the Today hero card
    views/
      TodayView.jsx       # (replaces Foundation stub) full dashboard
      StandingsView.jsx
      TimelineView.jsx
      MapView.jsx
      MapView.css
  server/
    routes.js             # (modified) + GET /reference
```

---

## Phase 4 — Newcomer Foundation (glossary + onboarding)

### Task 4.1: Glossary content

**Files:**
- Create: `src/explainer/glossary.js`, `src/explainer/glossary.test.js`

**Interfaces:**
- Produces: `TERMS` — a map of key → `{ word, define }`; `defineTerm(key)` -> the `define` string (or `''`). Keys at minimum: `groupStage`, `goalDifference`, `knockout`, `draw`, `matchday`, `bestThird`, `roundOf32`.

- [ ] **Step 1: Write the failing test** `src/explainer/glossary.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { TERMS, defineTerm } from './glossary.js';

describe('glossary', () => {
  it('defines the core newcomer terms', () => {
    for (const key of ['groupStage', 'goalDifference', 'knockout', 'draw', 'bestThird', 'roundOf32']) {
      expect(TERMS[key]?.define).toBeTruthy();
    }
  });
  it('defineTerm returns the plain-English text', () => {
    expect(defineTerm('draw')).toMatch(/tie/i);
    expect(defineTerm('nope')).toBe('');
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/explainer/glossary.test.js` — Expected: FAIL.

- [ ] **Step 3: Create `src/explainer/glossary.js`:**

```js
export const TERMS = {
  groupStage: { word: 'group stage', define: 'The first round. 48 teams are split into 12 groups of 4; everyone in a group plays everyone else once.' },
  goalDifference: { word: 'goal difference', define: 'Goals scored minus goals conceded. Used to rank teams level on points.' },
  knockout: { word: 'knockout', define: 'Single-elimination rounds after the groups — lose and you’re out.' },
  draw: { word: 'draw', define: 'A tie — the match ends level. In the group stage each team gets 1 point.' },
  matchday: { word: 'matchday', define: 'A round of group games. Each team plays 3 matchdays in the group stage.' },
  bestThird: { word: 'best third-place team', define: 'The 8 strongest 3rd-place finishers across the 12 groups also advance.' },
  roundOf32: { word: 'Round of 32', define: 'The first knockout round in 2026: the 32 qualifiers play single-elimination.' },
};

export function defineTerm(key) {
  return TERMS[key]?.define ?? '';
}
```

- [ ] **Step 4: Run to verify it passes:** `npx vitest run src/explainer/glossary.test.js` — Expected: PASS.

- [ ] **Step 5: Commit:** `git add -A && git commit -m "feat(explainer): glossary of newcomer terms"`

### Task 4.2: Modal shell

**Files:**
- Create: `src/components/Modal.jsx`, `src/components/Modal.css`, `src/components/Modal.test.jsx`

**Interfaces:**
- Produces: `<Modal open title onClose>{children}</Modal>` — renders nothing when `!open`; when open shows a `role="dialog"` with the title, a close button (calls `onClose`), and the children. Closes on Escape.

- [ ] **Step 1: Write the failing test** `src/components/Modal.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal.jsx';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} title="X" onClose={() => {}}>body</Modal>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('calls onClose from the close button', () => {
    const onClose = vi.fn();
    render(<Modal open title="How it works" onClose={onClose}>body</Modal>);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/components/Modal.test.jsx` — Expected: FAIL.

- [ ] **Step 3: Create `src/components/Modal.css`:**

```css
.modal__backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: grid; place-items: center; padding: 16px; z-index: 50; }
.modal__panel { background: var(--paper); border-radius: var(--sticker-radius); max-width: 560px; width: 100%; max-height: 85vh; overflow: auto; box-shadow: var(--sticker-shadow); border: 2px solid var(--paper-edge); }
.modal__head { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 2px solid var(--paper-edge); }
.modal__head h2 { margin: 0; }
.modal__body { padding: 16px; }
.modal__close { border: 0; background: var(--paper-edge); border-radius: 8px; padding: 6px 10px; font-weight: 800; cursor: pointer; }
```

- [ ] **Step 4: Create `src/components/Modal.jsx`:**

```jsx
import { useEffect } from 'react';
import './Modal.css';

export default function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal__panel" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2>{title}</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run to verify it passes:** `npx vitest run src/components/Modal.test.jsx` — Expected: PASS.

- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat(ui): accessible Modal shell"`

### Task 4.3: How It Works onboarding + persistent entry point

**Files:**
- Create: `src/explainer/HowItWorks.jsx`, `src/explainer/HowItWorks.css`, `src/explainer/HowItWorks.test.jsx`
- Modify: `src/App.jsx` (add a persistent "New to soccer? Start here" button that opens it)

**Interfaces:**
- Consumes: `Modal` (4.2), `Term`/glossary (4.1).
- Produces: `<HowItWorks open onClose />` — a friendly, illustrated-feeling explainer of the **48-team / 12-group / top-2 + 8 best-thirds → Round of 32** format, points (3/1/0), and how groups feed the knockouts.

- [ ] **Step 1: Write the failing test** `src/explainer/HowItWorks.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HowItWorks from './HowItWorks.jsx';

describe('HowItWorks', () => {
  it('explains the 2026 format basics', () => {
    render(<HowItWorks open onClose={() => {}} />);
    expect(screen.getByText(/12 groups/i)).toBeInTheDocument();
    expect(screen.getByText(/top 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Round of 32/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/explainer/HowItWorks.test.jsx` — Expected: FAIL.

- [ ] **Step 3: Create `src/explainer/HowItWorks.css`:**

```css
.hiw__step { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px dashed var(--paper-edge); }
.hiw__num { flex: 0 0 32px; height: 32px; border-radius: 50%; background: var(--gold); color: var(--ink); font-weight: 900; display: grid; place-items: center; }
.hiw__points { display: flex; gap: 8px; margin-top: 6px; }
.hiw__chip { background: var(--paper-edge); border-radius: 8px; padding: 4px 8px; font-weight: 800; }
```

- [ ] **Step 4: Create `src/explainer/HowItWorks.jsx`:**

```jsx
import Modal from '../components/Modal.jsx';
import Term from '../components/Term.jsx';
import { defineTerm } from './glossary.js';
import './HowItWorks.css';

const STEPS = [
  { n: 1, title: '48 teams, 12 groups', body: 'The tournament starts with 12 groups of 4 teams (Groups A–L).' },
  { n: 2, title: 'Everyone plays everyone', body: 'Inside each group, every team plays the other three once — that’s 3 matchdays.' },
  { n: 3, title: 'Points decide the table', body: 'Win = 3 points, a draw (tie) = 1, a loss = 0. Level on points? Goal difference breaks the tie.' },
  { n: 4, title: 'Top 2 go through', body: 'The top 2 of each group advance — plus the 8 best 3rd-place teams.' },
  { n: 5, title: 'Then it’s knockout', body: 'Those 32 teams enter the Round of 32: win or you’re out, all the way to the Final.' },
];

export default function HowItWorks({ open, onClose }) {
  return (
    <Modal open={open} title="How the World Cup works" onClose={onClose}>
      <p>
        New to soccer? Here’s the whole tournament in 30 seconds. Hover any{' '}
        <Term define={defineTerm('goalDifference')}>underlined term</Term> for a plain-English definition.
      </p>
      {STEPS.map((s) => (
        <div className="hiw__step" key={s.n}>
          <div className="hiw__num">{s.n}</div>
          <div>
            <strong>{s.title}</strong>
            <div>{s.body}</div>
            {s.n === 3 && (
              <div className="hiw__points">
                <span className="hiw__chip">Win 3</span>
                <span className="hiw__chip">Draw 1</span>
                <span className="hiw__chip">Loss 0</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </Modal>
  );
}
```

- [ ] **Step 5: Run to verify it passes:** `npx vitest run src/explainer/HowItWorks.test.jsx` — Expected: PASS.

- [ ] **Step 6: Wire the persistent entry point** — in `src/App.jsx`: add `import { useState } from 'react'` (already present), `import HowItWorks from './explainer/HowItWorks.jsx';`, a `const [showHelp, setShowHelp] = useState(false);`, a button in the header nav row:

```jsx
<button className="app__help" onClick={() => setShowHelp(true)}>New to soccer? Start here</button>
```
and before `</div>` of `.app`: `<HowItWorks open={showHelp} onClose={() => setShowHelp(false)} />`. Add to `src/theme/global.css`:

```css
.app__help { margin-left: auto; border: 0; border-radius: 10px; padding: 8px 14px; font-weight: 800; cursor: pointer; background: var(--gold); color: var(--ink); }
```

- [ ] **Step 7: Add a test** to `src/App.test.jsx`:

```jsx
it('opens the How It Works modal', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /new to soccer/i }));
  expect(screen.getByRole('dialog', { name: /how the world cup works/i })).toBeInTheDocument();
});
```

- [ ] **Step 8: Run:** `npx vitest run src/App.test.jsx` — Expected: PASS.

- [ ] **Step 9: Commit:** `git add -A && git commit -m "feat(explainer): How It Works onboarding + persistent entry point"`

---

## Phase 5 — Today (full dashboard)

### Task 5.1: Match-time bucketing lib

**Files:**
- Create: `src/lib/matchTime.js`, `src/lib/matchTime.test.js`

**Interfaces:**
- Produces:
  - `dayKey(utcDate)` -> `'YYYY-MM-DD'` (UTC date slice; `''` if falsy).
  - `bucketMatches(matches, nowIso)` -> `{ today, recent, upcoming }`. `today` = matches whose `dayKey` equals today's; `recent` = past matches with status `FINISHED`, newest first, max 6; `upcoming` = future matches, soonest first, max 6.

- [ ] **Step 1: Write the failing test** `src/lib/matchTime.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { dayKey, bucketMatches } from './matchTime.js';

const m = (id, utcDate, status = 'SCHEDULED') => ({ id, utcDate, status, score: {} });

describe('dayKey', () => {
  it('takes the UTC date portion', () => {
    expect(dayKey('2026-06-15T18:00:00Z')).toBe('2026-06-15');
    expect(dayKey('')).toBe('');
  });
});

describe('bucketMatches', () => {
  const now = '2026-06-15T12:00:00Z';
  const matches = [
    m(1, '2026-06-14T18:00:00Z', 'FINISHED'),
    m(2, '2026-06-15T18:00:00Z', 'SCHEDULED'),
    m(3, '2026-06-16T18:00:00Z', 'SCHEDULED'),
  ];
  it('splits into today / recent / upcoming', () => {
    const { today, recent, upcoming } = bucketMatches(matches, now);
    expect(today.map((x) => x.id)).toEqual([2]);
    expect(recent.map((x) => x.id)).toEqual([1]);
    expect(upcoming.map((x) => x.id)).toEqual([3]);
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/lib/matchTime.test.js` — Expected: FAIL.

- [ ] **Step 3: Create `src/lib/matchTime.js`:**

```js
export function dayKey(utcDate) {
  return utcDate ? utcDate.slice(0, 10) : '';
}

export function bucketMatches(matches, nowIso) {
  const todayKey = dayKey(nowIso);
  const today = [];
  const recent = [];
  const upcoming = [];
  for (const match of matches) {
    const key = dayKey(match.utcDate);
    if (key === todayKey) today.push(match);
    else if (key < todayKey) { if (match.status === 'FINISHED') recent.push(match); }
    else upcoming.push(match);
  }
  recent.sort((a, b) => b.utcDate.localeCompare(a.utcDate));
  upcoming.sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  today.sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  return { today, recent: recent.slice(0, 6), upcoming: upcoming.slice(0, 6) };
}
```

- [ ] **Step 4: Run to verify it passes:** `npx vitest run src/lib/matchTime.test.js` — Expected: PASS.

- [ ] **Step 5: Commit:** `git add -A && git commit -m "feat(lib): match-time bucketing"`

### Task 5.2: "What to watch" selection lib

**Files:**
- Create: `src/lib/watch.js`, `src/lib/watch.test.js`

**Interfaces:**
- Produces: `pickMatchToWatch(matches)` -> `{ match, reason }` or `null` when empty. Priority: a `LIVE` match (`IN_PLAY`/`PAUSED`) → reason "Live right now"; else a knockout match (stage !== `GROUP_STAGE`) → "Knockout — win or go home"; else the earliest match → "Group-stage clash". Ties broken by earliest `utcDate`.

- [ ] **Step 1: Write the failing test** `src/lib/watch.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { pickMatchToWatch } from './watch.js';

const m = (id, over) => ({ id, status: 'SCHEDULED', stage: 'GROUP_STAGE', utcDate: '2026-06-15T18:00:00Z', ...over });

describe('pickMatchToWatch', () => {
  it('returns null for no matches', () => {
    expect(pickMatchToWatch([])).toBeNull();
  });
  it('prefers a live match', () => {
    const pick = pickMatchToWatch([m(1), m(2, { status: 'IN_PLAY' })]);
    expect(pick.match.id).toBe(2);
    expect(pick.reason).toMatch(/live/i);
  });
  it('prefers knockout over group when none live', () => {
    const pick = pickMatchToWatch([m(1), m(2, { stage: 'LAST_16' })]);
    expect(pick.match.id).toBe(2);
    expect(pick.reason).toMatch(/knockout/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/lib/watch.test.js` — Expected: FAIL.

- [ ] **Step 3: Create `src/lib/watch.js`:**

```js
const LIVE = new Set(['IN_PLAY', 'PAUSED']);

function score(match) {
  if (LIVE.has(match.status)) return 3;
  if (match.stage && match.stage !== 'GROUP_STAGE') return 2;
  return 1;
}

const REASONS = {
  3: 'Live right now',
  2: 'Knockout — win or go home',
  1: 'Group-stage clash',
};

export function pickMatchToWatch(matches) {
  if (!matches.length) return null;
  let best = null;
  let bestScore = -1;
  for (const match of matches) {
    const s = score(match);
    if (s > bestScore || (s === bestScore && match.utcDate < best.utcDate)) {
      best = match;
      bestScore = s;
    }
  }
  return { match: best, reason: REASONS[bestScore] };
}
```

- [ ] **Step 4: Run to verify it passes:** `npx vitest run src/lib/watch.test.js` — Expected: PASS.

- [ ] **Step 5: Commit:** `git add -A && git commit -m "feat(lib): what-to-watch selection"`

### Task 5.3: WhatToWatch hero card

**Files:**
- Create: `src/components/WhatToWatch.jsx`, `src/components/WhatToWatch.test.jsx`

**Interfaces:**
- Consumes: `pickMatchToWatch` (5.2), `MatchSticker` (Foundation), `StickerCard`.
- Produces: `<WhatToWatch matches />` — picks the match to watch and renders a foil hero with the eyebrow reason ("Live right now", etc.) above a `MatchSticker`. Renders nothing if there's no pick.

- [ ] **Step 1: Write the failing test** `src/components/WhatToWatch.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WhatToWatch from './WhatToWatch.jsx';

const live = {
  id: 9, status: 'IN_PLAY', stage: 'GROUP_STAGE', utcDate: '2026-06-15T18:00:00Z',
  score: { home: 1, away: 1 }, home: { name: 'Brazil', tla: 'BRA' }, away: { name: 'Japan', tla: 'JPN' }, city: null,
};

describe('WhatToWatch', () => {
  it('headlines the live match with its reason', () => {
    render(<WhatToWatch matches={[live]} />);
    expect(screen.getByText(/live right now/i)).toBeInTheDocument();
    expect(screen.getByText('Brazil')).toBeInTheDocument();
  });
  it('renders nothing when empty', () => {
    const { container } = render(<WhatToWatch matches={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/components/WhatToWatch.test.jsx` — Expected: FAIL.

- [ ] **Step 3: Create `src/components/WhatToWatch.jsx`:**

```jsx
import { pickMatchToWatch } from '../lib/watch.js';
import MatchSticker from './MatchSticker.jsx';

export default function WhatToWatch({ matches }) {
  const pick = pickMatchToWatch(matches);
  if (!pick) return null;
  return (
    <div className="watch" style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 900, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
        ⭐ What to watch — {pick.reason}
      </div>
      <MatchSticker match={pick.match} />
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes:** `npx vitest run src/components/WhatToWatch.test.jsx` — Expected: PASS.

- [ ] **Step 5: Commit:** `git add -A && git commit -m "feat(ui): WhatToWatch hero"`

### Task 5.4: TodayView full dashboard

**Files:**
- Modify: `src/views/TodayView.jsx` (replace the Foundation stub), `src/views/TodayView.test.jsx`

**Interfaces:**
- Consumes: `getMatches`, `bucketMatches` (5.1), `WhatToWatch` (5.3), `MatchSticker`.
- Produces: `<TodayView now? />` — fetches matches, buckets by `now` (prop defaults to `new Date().toISOString()`), and renders: the `WhatToWatch` hero (from today's matches, or upcoming if none today), a **Today** section, a **Recent results** strip, and a **Coming up** strip. Friendly empty state when there are no matches today.

- [ ] **Step 1: Replace the test** `src/views/TodayView.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TodayView from './TodayView.jsx';

afterEach(() => vi.restoreAllMocks());

const match = (id, utcDate, status, home, away) => ({
  id, utcDate, status, stage: 'GROUP_STAGE', score: { home: 1, away: 0 },
  home: { name: home, tla: home.slice(0, 3).toUpperCase() },
  away: { name: away, tla: away.slice(0, 3).toUpperCase() }, city: null,
});

describe('TodayView', () => {
  it('shows what-to-watch and a today match', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({ matches: [
        match(1, '2026-06-14T18:00:00Z', 'FINISHED', 'Mexico', 'Canada'),
        match(2, '2026-06-15T18:00:00Z', 'IN_PLAY', 'Brazil', 'Japan'),
      ] }),
    }));
    render(<TodayView now="2026-06-15T12:00:00Z" />);
    await waitFor(() => expect(screen.getByText(/what to watch/i)).toBeInTheDocument());
    expect(screen.getByText('Brazil')).toBeInTheDocument();
    expect(screen.getByText(/recent results/i)).toBeInTheDocument();
  });

  it('shows a friendly empty state when nothing is on today', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({ matches: [match(3, '2026-06-20T18:00:00Z', 'SCHEDULED', 'Spain', 'Peru')] }),
    }));
    render(<TodayView now="2026-06-15T12:00:00Z" />);
    await waitFor(() => expect(screen.getByText(/no matches today/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/views/TodayView.test.jsx` — Expected: FAIL.

- [ ] **Step 3: Replace `src/views/TodayView.jsx`:**

```jsx
import { useEffect, useState } from 'react';
import { getMatches } from '../api/client.js';
import { bucketMatches } from '../lib/matchTime.js';
import MatchSticker from '../components/MatchSticker.jsx';
import WhatToWatch from '../components/WhatToWatch.jsx';

function Strip({ title, matches }) {
  if (!matches.length) return null;
  return (
    <section style={{ marginTop: 20 }}>
      <h2>{title}</h2>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {matches.map((m) => <MatchSticker key={m.id} match={m} />)}
      </div>
    </section>
  );
}

export default function TodayView({ now = new Date().toISOString() }) {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getMatches()
      .then((data) => active && setMatches(data.matches))
      .catch((e) => active && setError(e.message));
    return () => { active = false; };
  }, []);

  if (error) return <section aria-label="Today">Couldn’t load matches right now.</section>;
  if (!matches) return <section aria-label="Today">Loading today’s matches…</section>;

  const { today, recent, upcoming } = bucketMatches(matches, now);
  const heroPool = today.length ? today : upcoming;

  return (
    <section aria-label="Today">
      <WhatToWatch matches={heroPool} />
      {today.length ? (
        <Strip title="On today" matches={today} />
      ) : (
        <p style={{ fontWeight: 700 }}>No matches today — here’s what’s coming up next. ⤵️</p>
      )}
      <Strip title="Recent results" matches={recent} />
      <Strip title="Coming up" matches={upcoming} />
    </section>
  );
}
```

- [ ] **Step 4: Run to verify it passes:** `npx vitest run src/views/TodayView.test.jsx` — Expected: PASS.

- [ ] **Step 5: Commit:** `git add -A && git commit -m "feat(today): full dashboard with what-to-watch and strips"`

---

## Phase 6 — Standings & Bracket

### Task 6.1: GroupTable

**Files:**
- Create: `src/components/GroupTable.jsx`, `src/components/GroupTable.css`, `src/components/GroupTable.test.jsx`

**Interfaces:**
- Consumes: a group `{ group, table: RowWithStatus[] }` (rows have `rank, team, played, won, draw, lost, goalsFor, goalsAgainst, goalDifference, points, status, note`), `AdvancementBadge`, `Term`, glossary, `groupLabel`-style formatting.
- Produces: `<GroupTable group />` — a sticker-styled table. Column headers wrap jargon in `<Term>` (e.g. GD → goal difference). Each row shows the badge and, on the leader rows, the plain-English `note`.

- [ ] **Step 1: Write the failing test** `src/components/GroupTable.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GroupTable from './GroupTable.jsx';

const group = {
  group: 'GROUP_A',
  table: [
    { rank: 1, team: { name: 'Mexico', tla: 'MEX' }, played: 3, won: 3, draw: 0, lost: 0, goalsFor: 6, goalsAgainst: 1, goalDifference: 5, points: 9, status: 'through', note: 'Through to the knockout rounds 🎉' },
    { rank: 4, team: { name: 'Canada', tla: 'CAN' }, played: 3, won: 0, draw: 0, lost: 3, goalsFor: 1, goalsAgainst: 6, goalDifference: -5, points: 0, status: 'out', note: "Eliminated — can't reach the top two" },
  ],
};

describe('GroupTable', () => {
  it('renders the group label, teams and advancement badges', () => {
    render(<GroupTable group={group} />);
    expect(screen.getByText(/Group A/)).toBeInTheDocument();
    expect(screen.getByText('Mexico')).toBeInTheDocument();
    expect(screen.getByText(/Through/)).toBeInTheDocument();
    expect(screen.getByText(/Out/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/components/GroupTable.test.jsx` — Expected: FAIL.

- [ ] **Step 3: Create `src/components/GroupTable.css`:**

```css
.gt { width: 100%; border-collapse: collapse; }
.gt caption { text-align: left; font-weight: 900; text-transform: uppercase; margin-bottom: 6px; }
.gt th, .gt td { padding: 6px 8px; text-align: center; font-size: 13px; }
.gt th:first-child, .gt td:first-child { text-align: left; }
.gt tbody tr { border-top: 1px solid var(--paper-edge); }
.gt__note { font-size: 11px; color: var(--muted); text-align: left; }
```

- [ ] **Step 4: Create `src/components/GroupTable.jsx`:**

```jsx
import StickerCard from './StickerCard.jsx';
import AdvancementBadge from './AdvancementBadge.jsx';
import TeamSticker from './TeamSticker.jsx';
import Term from './Term.jsx';
import { defineTerm } from '../explainer/glossary.js';
import './GroupTable.css';

function label(groupKey) {
  return `Group ${groupKey.replace('GROUP_', '')}`;
}

export default function GroupTable({ group }) {
  return (
    <StickerCard className="gt-card">
      <table className="gt">
        <caption>{label(group.group)}</caption>
        <thead>
          <tr>
            <th>Team</th>
            <th title="Played">P</th>
            <th>W</th><th>D</th><th>L</th>
            <th><Term define={defineTerm('goalDifference')}>GD</Term></th>
            <th>Pts</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {group.table.map((row) => (
            <tr key={row.team.tla ?? row.rank}>
              <td><TeamSticker team={row.team} /></td>
              <td>{row.played}</td>
              <td>{row.won}</td><td>{row.draw}</td><td>{row.lost}</td>
              <td>{row.goalDifference}</td>
              <td><strong>{row.points}</strong></td>
              <td><AdvancementBadge status={row.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {group.table[0]?.note && <div className="gt__note">Leader: {group.table[0].note}</div>}
    </StickerCard>
  );
}
```

- [ ] **Step 5: Run to verify it passes:** `npx vitest run src/components/GroupTable.test.jsx` — Expected: PASS.

- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat(ui): GroupTable with advancement cues and Term headers"`

### Task 6.2: TiebreakerExplainer + Legend

**Files:**
- Create: `src/components/TiebreakerExplainer.jsx`, `src/components/Legend.jsx`, `src/components/Legend.test.jsx`

**Interfaces:**
- Produces:
  - `<Legend />` — a small inline key: green "Through", amber "Alive", red "Out".
  - `<TiebreakerExplainer />` — a short ordered list explaining how ties are broken (points → goal difference → goals scored), matching the implemented `compareRows` order, with a note that further FIFA tiebreakers exist.

- [ ] **Step 1: Write the failing test** `src/components/Legend.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Legend from './Legend.jsx';
import TiebreakerExplainer from './TiebreakerExplainer.jsx';

describe('Legend + TiebreakerExplainer', () => {
  it('legend lists the three statuses', () => {
    render(<Legend />);
    expect(screen.getByText(/Through/)).toBeInTheDocument();
    expect(screen.getByText(/Alive/)).toBeInTheDocument();
    expect(screen.getByText(/Out/)).toBeInTheDocument();
  });
  it('tiebreaker explainer lists goal difference', () => {
    render(<TiebreakerExplainer />);
    expect(screen.getByText(/goal difference/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/components/Legend.test.jsx` — Expected: FAIL.

- [ ] **Step 3: Create `src/components/Legend.jsx`:**

```jsx
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
```

- [ ] **Step 4: Create `src/components/TiebreakerExplainer.jsx`:**

```jsx
import Term from './Term.jsx';
import { defineTerm } from '../explainer/glossary.js';

export default function TiebreakerExplainer() {
  return (
    <details>
      <summary><strong>How are ties in the table broken?</strong></summary>
      <ol>
        <li>Most <strong>points</strong> (win 3, draw 1, loss 0).</li>
        <li>Best <Term define={defineTerm('goalDifference')}>goal difference</Term>.</li>
        <li>Most goals scored.</li>
      </ol>
      <p style={{ fontSize: 12, color: 'var(--muted)' }}>
        FIFA uses further tiebreakers (head-to-head, fair play) in rare cases; this tracker ranks by the three above.
      </p>
    </details>
  );
}
```

- [ ] **Step 5: Run to verify it passes:** `npx vitest run src/components/Legend.test.jsx` — Expected: PASS.

- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat(ui): Legend + tiebreaker explainer"`

### Task 6.3: Bracket assembly lib

**Files:**
- Create: `src/lib/bracket.js`, `src/lib/bracket.test.js`

**Interfaces:**
- Produces: `knockoutRounds(matches)` -> ordered `[{ stage, label, matches }]` for the knockout stages present, in order `LAST_32, LAST_16, QUARTER_FINALS, SEMI_FINALS, THIRD_PLACE, FINAL`. Stages with no matches are omitted. Matches within a round keep `utcDate` order.

- [ ] **Step 1: Write the failing test** `src/lib/bracket.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { knockoutRounds } from './bracket.js';

const m = (id, stage, utcDate) => ({ id, stage, utcDate, status: 'SCHEDULED', score: {} });

describe('knockoutRounds', () => {
  it('groups and orders knockout stages, ignoring group games', () => {
    const rounds = knockoutRounds([
      m(1, 'GROUP_STAGE', '2026-06-12T00:00:00Z'),
      m(2, 'FINAL', '2026-07-19T00:00:00Z'),
      m(3, 'LAST_32', '2026-06-28T00:00:00Z'),
      m(4, 'LAST_32', '2026-06-29T00:00:00Z'),
    ]);
    expect(rounds.map((r) => r.stage)).toEqual(['LAST_32', 'FINAL']);
    expect(rounds[0].matches.map((x) => x.id)).toEqual([3, 4]);
    expect(rounds[0].label).toMatch(/Round of 32/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/lib/bracket.test.js` — Expected: FAIL.

- [ ] **Step 3: Create `src/lib/bracket.js`:**

```js
const ORDER = [
  { stage: 'LAST_32', label: 'Round of 32' },
  { stage: 'LAST_16', label: 'Round of 16' },
  { stage: 'QUARTER_FINALS', label: 'Quarter-finals' },
  { stage: 'SEMI_FINALS', label: 'Semi-finals' },
  { stage: 'THIRD_PLACE', label: 'Third-place play-off' },
  { stage: 'FINAL', label: 'Final' },
];

export function knockoutRounds(matches) {
  return ORDER
    .map(({ stage, label }) => ({
      stage,
      label,
      matches: matches
        .filter((m) => m.stage === stage)
        .sort((a, b) => a.utcDate.localeCompare(b.utcDate)),
    }))
    .filter((round) => round.matches.length > 0);
}
```

- [ ] **Step 4: Run to verify it passes:** `npx vitest run src/lib/bracket.test.js` — Expected: PASS.

- [ ] **Step 5: Commit:** `git add -A && git commit -m "feat(lib): knockout bracket assembly"`

### Task 6.4: Bracket component

**Files:**
- Create: `src/components/Bracket.jsx`, `src/components/Bracket.css`, `src/components/Bracket.test.jsx`

**Interfaces:**
- Consumes: `knockoutRounds` (6.3), `MatchSticker`.
- Produces: `<Bracket matches />` — renders each round as a labeled column of `MatchSticker`s. Shows a friendly "The knockout bracket fills in once the groups finish." message when there are no knockout matches yet.

- [ ] **Step 1: Write the failing test** `src/components/Bracket.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Bracket from './Bracket.jsx';

const km = {
  id: 1, stage: 'FINAL', status: 'SCHEDULED', utcDate: '2026-07-19T19:00:00Z',
  score: { home: null, away: null }, home: { name: 'TBD' }, away: { name: 'TBD' }, city: null,
};

describe('Bracket', () => {
  it('renders a round label when knockout matches exist', () => {
    render(<Bracket matches={[km]} />);
    expect(screen.getByText(/Final/)).toBeInTheDocument();
  });
  it('shows the placeholder before any knockout games', () => {
    render(<Bracket matches={[{ id: 2, stage: 'GROUP_STAGE', utcDate: '2026-06-12T00:00:00Z', score: {}, home: { name: 'A' }, away: { name: 'B' } }]} />);
    expect(screen.getByText(/fills in once the groups finish/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/components/Bracket.test.jsx` — Expected: FAIL.

- [ ] **Step 3: Create `src/components/Bracket.css`:**

```css
.bracket { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 8px; }
.bracket__round { min-width: 280px; display: grid; gap: 12px; align-content: start; }
.bracket__round h3 { margin: 0; text-transform: uppercase; color: var(--muted); }
```

- [ ] **Step 4: Create `src/components/Bracket.jsx`:**

```jsx
import { knockoutRounds } from '../lib/bracket.js';
import MatchSticker from './MatchSticker.jsx';
import './Bracket.css';

export default function Bracket({ matches }) {
  const rounds = knockoutRounds(matches);
  if (!rounds.length) {
    return <p style={{ color: 'var(--muted)' }}>The knockout bracket fills in once the groups finish. 🏆</p>;
  }
  return (
    <div className="bracket">
      {rounds.map((round) => (
        <div className="bracket__round" key={round.stage}>
          <h3>{round.label}</h3>
          {round.matches.map((m) => <MatchSticker key={m.id} match={m} />)}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Run to verify it passes:** `npx vitest run src/components/Bracket.test.jsx` — Expected: PASS.

- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat(ui): Bracket with round columns + pre-knockout placeholder"`

### Task 6.5: StandingsView

**Files:**
- Create: `src/views/StandingsView.jsx`, `src/views/StandingsView.test.jsx`
- Modify: `src/App.jsx` (use `StandingsView`)

**Interfaces:**
- Consumes: `getStandings`, `getMatches`, `GroupTable` (6.1), `Legend`/`TiebreakerExplainer` (6.2), `Bracket` (6.4).
- Produces: `<StandingsView />` — fetches standings + matches in parallel; renders the `Legend`, `TiebreakerExplainer`, all group tables in a responsive grid, a "best third-place teams" note, then the `Bracket`. Loading + error states.

- [ ] **Step 1: Write the failing test** `src/views/StandingsView.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import StandingsView from './StandingsView.jsx';

afterEach(() => vi.restoreAllMocks());

const standings = {
  groups: [{ group: 'GROUP_A', table: [
    { rank: 1, team: { name: 'Mexico', tla: 'MEX' }, played: 3, won: 3, draw: 0, lost: 0, goalsFor: 6, goalsAgainst: 1, goalDifference: 5, points: 9, status: 'through', note: 'Through to the knockout rounds 🎉' },
  ] }],
  bestThirdIds: [],
};

describe('StandingsView', () => {
  it('renders the legend and a group table', async () => {
    vi.stubGlobal('fetch', async (url) => ({
      ok: true,
      json: async () => (url.includes('standings') ? standings : { matches: [] }),
    }));
    render(<StandingsView />);
    await waitFor(() => expect(screen.getByText(/Group A/)).toBeInTheDocument());
    expect(screen.getByText(/Into the knockouts/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/views/StandingsView.test.jsx` — Expected: FAIL.

- [ ] **Step 3: Create `src/views/StandingsView.jsx`:**

```jsx
import { useEffect, useState } from 'react';
import { getStandings, getMatches } from '../api/client.js';
import GroupTable from '../components/GroupTable.jsx';
import Legend from '../components/Legend.jsx';
import TiebreakerExplainer from '../components/TiebreakerExplainer.jsx';
import Bracket from '../components/Bracket.jsx';

export default function StandingsView() {
  const [data, setData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([getStandings(), getMatches()])
      .then(([s, m]) => {
        if (!active) return;
        setData(s);
        setMatches(m.matches);
      })
      .catch((e) => active && setError(e.message));
    return () => { active = false; };
  }, []);

  if (error) return <section aria-label="Standings">Couldn’t load standings right now.</section>;
  if (!data) return <section aria-label="Standings">Loading the tables…</section>;

  return (
    <section aria-label="Standings">
      <Legend />
      <TiebreakerExplainer />
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', marginTop: 12 }}>
        {data.groups.map((g) => <GroupTable key={g.group} group={g} />)}
      </div>
      <p style={{ color: 'var(--muted)', marginTop: 12 }}>
        Plus the <strong>8 best third-place teams</strong> across all groups advance to the Round of 32.
      </p>
      <h2 style={{ marginTop: 24 }}>Knockout bracket</h2>
      <Bracket matches={matches} />
    </section>
  );
}
```

- [ ] **Step 4: Modify `src/App.jsx`** — import `StandingsView` and replace the `standings` placeholder line with `{view === 'standings' && <StandingsView />}`.

- [ ] **Step 5: Run to verify it passes:** `npx vitest run src/views/StandingsView.test.jsx src/App.test.jsx` — Expected: PASS.

- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat(standings): group tables + best-thirds + bracket view"`

---

## Phase 7 — Timeline

### Task 7.1: Day-grouping lib

**Files:**
- Create: `src/lib/groupByDate.js`, `src/lib/groupByDate.test.js`

**Interfaces:**
- Consumes: `dayKey` (5.1).
- Produces: `groupMatchesByDay(matches)` -> ordered `[{ dayKey, label, matches }]`, ascending by date; `label` is a human date like `Sun, Jun 15` (formatted from the day key at noon UTC for stability).

- [ ] **Step 1: Write the failing test** `src/lib/groupByDate.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { groupMatchesByDay } from './groupByDate.js';

const m = (id, utcDate) => ({ id, utcDate, status: 'SCHEDULED', score: {} });

describe('groupMatchesByDay', () => {
  it('buckets matches by day in ascending order', () => {
    const days = groupMatchesByDay([
      m(1, '2026-06-16T18:00:00Z'),
      m(2, '2026-06-15T18:00:00Z'),
      m(3, '2026-06-15T21:00:00Z'),
    ]);
    expect(days.map((d) => d.dayKey)).toEqual(['2026-06-15', '2026-06-16']);
    expect(days[0].matches.map((x) => x.id)).toEqual([2, 3]);
    expect(days[0].label).toMatch(/Jun 15/);
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/lib/groupByDate.test.js` — Expected: FAIL.

- [ ] **Step 3: Create `src/lib/groupByDate.js`:**

```js
import { dayKey } from './matchTime.js';

function labelFor(key) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

export function groupMatchesByDay(matches) {
  const byDay = new Map();
  for (const match of matches) {
    const key = dayKey(match.utcDate);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(match);
  }
  return [...byDay.keys()]
    .sort()
    .map((key) => ({
      dayKey: key,
      label: labelFor(key),
      matches: byDay.get(key).sort((a, b) => a.utcDate.localeCompare(b.utcDate)),
    }));
}
```

- [ ] **Step 4: Run to verify it passes:** `npx vitest run src/lib/groupByDate.test.js` — Expected: PASS.

- [ ] **Step 5: Commit:** `git add -A && git commit -m "feat(lib): group matches by day"`

### Task 7.2: TimelineView

**Files:**
- Create: `src/views/TimelineView.jsx`, `src/views/TimelineView.test.jsx`
- Modify: `src/App.jsx` (use `TimelineView`)

**Interfaces:**
- Consumes: `getMatches`, `groupMatchesByDay` (7.1), `dayKey` (5.1), `MatchSticker`.
- Produces: `<TimelineView now? />` — fetches matches, groups by day, renders each day as a section (date heading + match grid). The section whose `dayKey` equals today's gets `aria-current="date"` and a "Today" marker.

- [ ] **Step 1: Write the failing test** `src/views/TimelineView.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TimelineView from './TimelineView.jsx';

afterEach(() => vi.restoreAllMocks());

const m = (id, utcDate, home, away) => ({
  id, utcDate, status: 'SCHEDULED', stage: 'GROUP_STAGE', score: { home: null, away: null },
  home: { name: home, tla: home.slice(0, 3).toUpperCase() }, away: { name: away, tla: away.slice(0, 3).toUpperCase() }, city: null,
});

describe('TimelineView', () => {
  it('marks today and lists day groups', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true, json: async () => ({ matches: [
        m(1, '2026-06-15T18:00:00Z', 'Mexico', 'USA'),
        m(2, '2026-06-16T18:00:00Z', 'Brazil', 'Japan'),
      ] }),
    }));
    render(<TimelineView now="2026-06-15T12:00:00Z" />);
    await waitFor(() => expect(screen.getByText('Mexico')).toBeInTheDocument());
    expect(screen.getByText(/Today/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/views/TimelineView.test.jsx` — Expected: FAIL.

- [ ] **Step 3: Create `src/views/TimelineView.jsx`:**

```jsx
import { useEffect, useState } from 'react';
import { getMatches } from '../api/client.js';
import { groupMatchesByDay } from '../lib/groupByDate.js';
import { dayKey } from '../lib/matchTime.js';
import MatchSticker from '../components/MatchSticker.jsx';

export default function TimelineView({ now = new Date().toISOString() }) {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getMatches()
      .then((data) => active && setMatches(data.matches))
      .catch((e) => active && setError(e.message));
    return () => { active = false; };
  }, []);

  if (error) return <section aria-label="Timeline">Couldn’t load the schedule.</section>;
  if (!matches) return <section aria-label="Timeline">Loading the schedule…</section>;

  const todayKey = dayKey(now);
  const days = groupMatchesByDay(matches);

  return (
    <section aria-label="Timeline">
      {days.map((day) => {
        const isToday = day.dayKey === todayKey;
        return (
          <div key={day.dayKey} aria-current={isToday ? 'date' : undefined} style={{ marginBottom: 22 }}>
            <h2>{day.label}{isToday && <span style={{ marginLeft: 8, color: 'var(--gold)' }}>● Today</span>}</h2>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {day.matches.map((m) => <MatchSticker key={m.id} match={m} />)}
            </div>
          </div>
        );
      })}
    </section>
  );
}
```

- [ ] **Step 4: Modify `src/App.jsx`** — import `TimelineView` and replace the `timeline` placeholder line with `{view === 'timeline' && <TimelineView />}`.

- [ ] **Step 5: Run to verify it passes:** `npx vitest run src/views/TimelineView.test.jsx src/App.test.jsx` — Expected: PASS.

- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat(timeline): by-date schedule with today marker"`

---

## Phase 8 — Map by host city

### Task 8.1: Reference endpoint for host cities

**Files:**
- Modify: `server/routes.js` (add `GET /reference`), `server/routes.test.js`
- Modify: `src/api/client.js` (add `getReference`)

**Interfaces:**
- Consumes: `HOST_CITIES` (Foundation 1.1).
- Produces: `GET /api/reference` -> `{ hostCities: HOST_CITIES }`. Frontend `getReference()` returns it.

- [ ] **Step 1: Add a failing test** to `server/routes.test.js`:

```js
it('GET /api/reference returns host cities', async () => {
  const res = await request(app()).get('/api/reference');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.hostCities)).toBe(true);
  expect(res.body.hostCities.length).toBe(16);
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run server/routes.test.js` — Expected: FAIL.

- [ ] **Step 3: Modify `server/routes.js`** — import the data and add the route:
  - Add at top: `import { HOST_CITIES } from './data/hostCities.js';`
  - Add inside `buildRouter`, before `return router;`: `router.get('/reference', (_req, res) => res.json({ hostCities: HOST_CITIES }));`

- [ ] **Step 4: Add `getReference` to `src/api/client.js`:** `export const getReference = () => getJson('/api/reference');`

- [ ] **Step 5: Run to verify it passes:** `npx vitest run server/routes.test.js` — Expected: PASS.

- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat(server): /api/reference host cities endpoint"`

### Task 8.2: Map projection lib

**Files:**
- Create: `src/lib/projectMap.js`, `src/lib/projectMap.test.js`

**Interfaces:**
- Produces: `project(lat, lng, { width, height })` -> `{ x, y }` via equirectangular mapping over the host-region bounding box `lat ∈ [14, 60]`, `lng ∈ [-130, -66]`. Higher latitude → smaller `y` (north is up).

- [ ] **Step 1: Write the failing test** `src/lib/projectMap.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { project } from './projectMap.js';

describe('project', () => {
  const size = { width: 1000, height: 1000 };
  it('maps the SW corner to bottom-left and NE corner to top-right', () => {
    expect(project(14, -130, size)).toEqual({ x: 0, y: 1000 });
    expect(project(60, -66, size)).toEqual({ x: 1000, y: 0 });
  });
  it('keeps north above south', () => {
    expect(project(50, -100, size).y).toBeLessThan(project(20, -100, size).y);
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/lib/projectMap.test.js` — Expected: FAIL.

- [ ] **Step 3: Create `src/lib/projectMap.js`:**

```js
const BOUNDS = { minLat: 14, maxLat: 60, minLng: -130, maxLng: -66 };

export function project(lat, lng, { width, height }) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * width;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * height;
  return { x, y };
}
```

- [ ] **Step 4: Run to verify it passes:** `npx vitest run src/lib/projectMap.test.js` — Expected: PASS.

- [ ] **Step 5: Commit:** `git add -A && git commit -m "feat(lib): equirectangular map projection"`

### Task 8.3: MapView

**Files:**
- Create: `src/views/MapView.jsx`, `src/views/MapView.css`, `src/views/MapView.test.jsx`
- Modify: `src/App.jsx` (use `MapView`)

**Interfaces:**
- Consumes: `getReference` (8.1), `getMatches`, `project` (8.2), `MatchSticker`, `dayKey`/grouping (optional).
- Produces: `<MapView />` — fetches host cities + matches; renders a stylized SVG (viewBox 1000×1000, paper background, the 16 city pins positioned via `project`). Clicking a pin selects that city and lists its matches (matched by `match.city.id === city.id`) as `MatchSticker`s beside the map. A default prompt invites the user to pick a city.

- [ ] **Step 1: Write the failing test** `src/views/MapView.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MapView from './MapView.jsx';

afterEach(() => vi.restoreAllMocks());

const cities = [
  { id: 'mexico-city', city: 'Mexico City', stadium: 'Estadio Azteca', country: 'Mexico', lat: 19.3, lng: -99.15 },
  { id: 'toronto', city: 'Toronto', stadium: 'BMO Field', country: 'Canada', lat: 43.6, lng: -79.4 },
];
const matches = [
  { id: 1, status: 'FINISHED', stage: 'GROUP_STAGE', utcDate: '2026-06-11T18:00:00Z', score: { home: 2, away: 1 },
    home: { name: 'Mexico', tla: 'MEX' }, away: { name: 'Canada', tla: 'CAN' }, city: { id: 'mexico-city', city: 'Mexico City' } },
];

describe('MapView', () => {
  it('shows pins and reveals a city’s matches on click', async () => {
    vi.stubGlobal('fetch', async (url) => ({
      ok: true,
      json: async () => (url.includes('reference') ? { hostCities: cities } : { matches }),
    }));
    render(<MapView />);
    await waitFor(() => expect(screen.getByLabelText('Mexico City')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Mexico City'));
    expect(screen.getByText(/Estadio Azteca/)).toBeInTheDocument();
    expect(screen.getByText('Mexico')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/views/MapView.test.jsx` — Expected: FAIL.

- [ ] **Step 3: Create `src/views/MapView.css`:**

```css
.map { display: grid; grid-template-columns: minmax(280px, 1.3fr) 1fr; gap: 16px; align-items: start; }
.map__svg { width: 100%; height: auto; background: linear-gradient(#dce8f0, var(--paper)); border-radius: var(--sticker-radius); border: 2px solid var(--paper-edge); }
.map__pin { cursor: pointer; }
.map__pin circle { fill: var(--out); stroke: #fff; stroke-width: 2; }
.map__pin.is-active circle { fill: var(--gold); }
.map__panel { display: grid; gap: 12px; align-content: start; }
@media (max-width: 720px) { .map { grid-template-columns: 1fr; } }
```

- [ ] **Step 4: Create `src/views/MapView.jsx`:**

```jsx
import { useEffect, useMemo, useState } from 'react';
import { getReference, getMatches } from '../api/client.js';
import { project } from '../lib/projectMap.js';
import MatchSticker from '../components/MatchSticker.jsx';
import './MapView.css';

const SIZE = { width: 1000, height: 1000 };

export default function MapView() {
  const [cities, setCities] = useState(null);
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([getReference(), getMatches()])
      .then(([ref, m]) => {
        if (!active) return;
        setCities(ref.hostCities);
        setMatches(m.matches);
      })
      .catch((e) => active && setError(e.message));
    return () => { active = false; };
  }, []);

  const byCity = useMemo(() => {
    const map = new Map();
    for (const m of matches) {
      const id = m.city?.id;
      if (!id) continue;
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(m);
    }
    return map;
  }, [matches]);

  if (error) return <section aria-label="Map">Couldn’t load the map.</section>;
  if (!cities) return <section aria-label="Map">Loading host cities…</section>;

  const selectedCity = cities.find((c) => c.id === selected) ?? null;
  const selectedMatches = selected ? (byCity.get(selected) ?? []) : [];

  return (
    <section aria-label="Map" className="map">
      <svg className="map__svg" viewBox={`0 0 ${SIZE.width} ${SIZE.height}`} role="img" aria-label="Host cities map">
        {cities.map((c) => {
          const { x, y } = project(c.lat, c.lng, SIZE);
          const active = c.id === selected;
          return (
            <g
              key={c.id}
              className={`map__pin ${active ? 'is-active' : ''}`}
              transform={`translate(${x}, ${y})`}
              role="button"
              aria-label={c.city}
              tabIndex={0}
              onClick={() => setSelected(c.id)}
              onKeyDown={(e) => e.key === 'Enter' && setSelected(c.id)}
            >
              <circle r="12" />
              <text x="16" y="5" fontSize="20" fill="var(--ink)">{c.city}</text>
            </g>
          );
        })}
      </svg>

      <div className="map__panel">
        {selectedCity ? (
          <>
            <h2>{selectedCity.city}</h2>
            <p style={{ color: 'var(--muted)', marginTop: -8 }}>{selectedCity.stadium} · {selectedCity.country}</p>
            {selectedMatches.length
              ? selectedMatches.map((m) => <MatchSticker key={m.id} match={m} />)
              : <p>No matches mapped to this city yet.</p>}
          </>
        ) : (
          <p style={{ fontWeight: 700 }}>Pick a city on the map to see its matches. 📍</p>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Modify `src/App.jsx`** — import `MapView` and replace the `map` placeholder line with `{view === 'map' && <MapView />}`.

- [ ] **Step 6: Run to verify it passes:** `npx vitest run src/views/MapView.test.jsx src/App.test.jsx` — Expected: PASS.

- [ ] **Step 7: Full suite:** `npm test` — Expected: all green.

- [ ] **Step 8: Manual check:** `npm run dev`; click through Today / Timeline / Map / Standings and the "New to soccer?" modal; confirm everything renders from snapshot data. Stop dev.

- [ ] **Step 9: Commit + push:** `git add -A && git commit -m "feat(map): host-city map with per-city matches"` then `git push origin main`.

---

## Self-Review

**1. Spec coverage (experience scope):**
- §2.5 stakes/story framing → `WhatToWatch` (5.3) reason lines, `note` strings on tables (6.1), Legend wording (6.2) ✅
- §2.5 no unexplained jargon → `Term` used in GroupTable headers, TiebreakerExplainer, HowItWorks; glossary (4.1) ✅
- §2.5 what-to-watch highlight → 5.2/5.3 ✅
- §2.5 delightful onboarding + persistent entry → 4.3 ✅
- §6.1 Today dashboard (today/recent/upcoming + empty state) → 5.4 ✅
- §6.2 Timeline by date + today anchor → 7.2 ✅
- §6.3 Map by host city (SVG + pins + per-city matches) → 8.3 ✅
- §6.4 Standings (group tables, advancement cues, tiebreaker explainer) + bracket → 6.1–6.5 ✅
- §7 explainer layer (intro, inline badges, tiebreaker popover, bracket linkage) → 4.x, 6.x ✅
- TBD-safe knockout slots → 6.4 test uses `TBD` teams ✅

**2. Placeholder scan:** No work-marker `TBD`/`TODO`. ("TBD" appears only as a rendered team label for undecided knockout slots.) Every code step has complete code.

**3. Type consistency:** Frontend consumes the exact shapes the Foundation `dataService` produces — `match.city = { id, city, stadium, country, lat, lng } | null`; standings rows carry `status` + `note`; `knockoutRounds`/`project`/`bucketMatches`/`pickMatchToWatch` signatures match their call sites in the views. `getReference` (8.1) returns `{ hostCities }` consumed by `MapView` (8.3).

---

## Execution Handoff

Implement with `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`, task-by-task, after the Foundation plan is complete and green.
