import { useState, useEffect } from 'react';
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

const SEEN_KEY = 'm26_seenHowItWorks';
function hasSeenIntro() {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem(SEEN_KEY) === '1'; }
  catch { return true; } // storage blocked -> don't nag
}

export default function App() {
  const [view, setView] = useState('today');
  const [showHelp, setShowHelp] = useState(false);
  // First-time visitors get the explainer opened for them, once. Returning
  // visitors (flag set) don't; storage blocked is treated as "seen".
  useEffect(() => { if (!hasSeenIntro()) setShowHelp(true); }, []);
  const closeHelp = () => {
    setShowHelp(false);
    try { localStorage?.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
  };
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
      <HowItWorks open={showHelp} onClose={closeHelp} />
    </div>
  );
}
