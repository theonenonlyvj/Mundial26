import { useEffect, useState } from 'react';
import { getStandings, getMatches } from '../api/client.js';
import GroupTable from '../components/GroupTable.jsx';
import Legend from '../components/Legend.jsx';
import TiebreakerExplainer from '../components/TiebreakerExplainer.jsx';
import Bracket from '../components/Bracket.jsx';
import Term from '../components/Term.jsx';
import { defineTerm } from '../explainer/glossary.js';

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

  if (error) return <section aria-label="Standings">Couldn't load standings right now.</section>;
  if (!data) return <section aria-label="Standings">Loading the tables…</section>;

  return (
    <section aria-label="Standings">
      <Legend />
      <TiebreakerExplainer />
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', marginTop: 12 }}>
        {data.groups.map((g) => <GroupTable key={g.group} group={g} />)}
      </div>
      <p style={{ color: 'var(--muted)', marginTop: 12 }}>
        Plus the <Term define={defineTerm('bestThird')}><strong>8 best third-place teams</strong></Term> across all groups advance to the Round of 32.
      </p>
      <h2 style={{ marginTop: 24 }}>Knockout bracket</h2>
      <Bracket matches={matches} />
    </section>
  );
}
