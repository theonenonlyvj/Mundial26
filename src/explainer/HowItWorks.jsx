import Modal from '../components/Modal.jsx';
import Term from '../components/Term.jsx';
import { defineTerm } from './glossary.js';
import './HowItWorks.css';

const STEPS = [
  { n: 1, title: '48 teams enter the tournament', body: 'They are split into 12 groups of 4 teams (Groups A–L).' },
  { n: 2, title: 'Everyone plays everyone', body: 'Inside each group, every team plays the other three once — that\'s 3 matchdays.' },
  { n: 3, title: 'Points decide the table', body: 'Win = 3 points, a draw (tie) = 1, a loss = 0. Level on points? Goal difference breaks the tie.' },
  { n: 4, title: 'Who advances?', body: 'The top 2 of each group go through — plus the 8 best 3rd-place teams across all groups.' },
  { n: 5, title: 'Then it\'s knockout', body: 'Those 32 teams enter the Round of 32: win or you\'re out, all the way to the Final.' },
];

export default function HowItWorks({ open, onClose }) {
  return (
    <Modal open={open} title="How the World Cup works" onClose={onClose}>
      <p>
        New to soccer? Here's the whole tournament in 30 seconds. Hover any{' '}
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
