import { useState } from 'react';
import './theme/global.css';
import TodayView from './views/TodayView.jsx';

const VIEWS = [
  { key: 'today', label: 'Today' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'map', label: 'Map' },
  { key: 'standings', label: 'Standings' },
];

export default function App() {
  const [view, setView] = useState('today');
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
        </nav>
      </header>
      <main className="app__main">
        {view === 'today' && <TodayView />}
        {view === 'timeline' && <section aria-label="Timeline">Timeline (coming in Plan 2)</section>}
        {view === 'map' && <section aria-label="Map">Map (coming in Plan 2)</section>}
        {view === 'standings' && <section aria-label="Standings">Standings (coming in Plan 2)</section>}
      </main>
    </div>
  );
}
