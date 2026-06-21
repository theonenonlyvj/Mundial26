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
