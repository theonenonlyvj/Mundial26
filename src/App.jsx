import { useState } from 'react';
import './theme/global.css';
import TodayView from './views/TodayView.jsx';
import StandingsView from './views/StandingsView.jsx';
import TimelineView from './views/TimelineView.jsx';
import MapView from './views/MapView.jsx';
import ScorersView from './views/ScorersView.jsx';
import HowItWorks from './explainer/HowItWorks.jsx';

const VIEWS = [
  { key: 'today', label: 'Today' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'map', label: 'Cities' },
  { key: 'scorers', label: 'Scorers' },
  { key: 'standings', label: 'Standings' },
];

export default function App() {
  const [view, setView] = useState('today');
  // Opt-in only: the explainer opens when the user taps "New to soccer? Start
  // here" — it never auto-pops.
  const [showHelp, setShowHelp] = useState(false);
  return (
    <div className="app">
      <header className="app__header">
        <h1>Mundial26</h1>
        <nav className="app__nav">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              className={`app__nav-btn ${view === v.key ? 'is-active' : ''}`}
              onClick={() => setView(v.key)}
            >
              {v.label}
            </button>
          ))}
          <button className="app__help" onClick={() => setShowHelp(true)}>New to soccer? Start here</button>
        </nav>
      </header>
      <main className="app__main">
        {view === 'today' && <TodayView />}
        {view === 'timeline' && <TimelineView />}
        {view === 'map' && <MapView />}
        {view === 'scorers' && <ScorersView />}
        {view === 'standings' && <StandingsView />}
      </main>
      <footer className="app__footer">
        <p className="app__footer-text">
          Have{' '}
          <a
            className="app__footer-link"
            href="https://theonenonlyvj.github.io/personal-site/contact"
            target="_blank"
            rel="noopener noreferrer"
          >
            Feedback
          </a>? Want to see my other projects?{' '}
          <a
            className="app__footer-link"
            href="https://theonenonlyvj.github.io/personal-site"
            target="_blank"
            rel="noopener noreferrer"
          >
            Click here
          </a>.
        </p>
      </footer>
      <HowItWorks open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
