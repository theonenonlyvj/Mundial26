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

  if (error) return <section aria-label="Map">Couldn't load the map.</section>;
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
