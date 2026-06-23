import { useEffect, useMemo, useState } from 'react';
import { getReference, getMatches } from '../api/client.js';
import MatchSticker from '../components/MatchSticker.jsx';
import './MapView.css';

const REGIONS = [
  { name: 'West Coast', cities: ['seattle', 'vancouver', 'los-angeles', 'bay-area'] },
  { name: 'Northeast', cities: ['toronto', 'boston', 'new-york', 'philadelphia'] },
  { name: 'Central & South', cities: ['atlanta', 'dallas', 'houston', 'kansas-city', 'miami'] },
  { name: 'Mexico', cities: ['mexico-city', 'guadalajara', 'monterrey'] },
];

export default function MapView() {
  const [hostCities, setHostCities] = useState(null);
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([getReference(), getMatches()])
      .then(([ref, m]) => {
        if (!active) return;
        setHostCities(ref.hostCities);
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

  if (error) return <section aria-label="Cities">Couldn't load city data.</section>;
  if (!hostCities) return <section aria-label="Cities">Loading host cities…</section>;

  const cityById = new Map(hostCities.map((c) => [c.id, c]));
  const selectedCity = selected ? (cityById.get(selected) ?? null) : null;
  const selectedMatches = selected ? (byCity.get(selected) ?? []) : [];

  return (
    <section aria-label="Cities" className="cities">
      <div className="cities__picker-mobile">
        <label className="cities__select-label" htmlFor="city-select">Jump to a city</label>
        <select
          id="city-select"
          className="cities__select"
          value={selected ?? ''}
          onChange={(e) => setSelected(e.target.value || null)}
        >
          <option value="">Choose a city…</option>
          {REGIONS.map((region) => {
            const regionCities = region.cities.map((id) => cityById.get(id)).filter(Boolean);
            if (regionCities.length === 0) return null;
            return (
              <optgroup key={region.name} label={region.name}>
                {regionCities.map((c) => {
                  const n = byCity.get(c.id)?.length ?? 0;
                  return <option key={c.id} value={c.id}>{c.city}{n ? ` (${n})` : ''}</option>;
                })}
              </optgroup>
            );
          })}
        </select>
      </div>

      <div className="cities__browser">
        {REGIONS.map((region) => {
          const regionCities = region.cities
            .map((id) => cityById.get(id))
            .filter(Boolean);
          if (regionCities.length === 0) return null;
          return (
            <div key={region.name} className="cities__region">
              <h2 className="cities__region-name">{region.name}</h2>
              <div className="cities__chips">
                {regionCities.map((c) => {
                  const matchCount = byCity.get(c.id)?.length ?? 0;
                  const isActive = c.id === selected;
                  return (
                    <button
                      key={c.id}
                      className={`cities__chip ${isActive ? 'is-active' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => setSelected(c.id)}
                    >
                      <span className="cities__chip-name">{c.city}</span>
                      <span className="cities__chip-stadium">{c.stadium}</span>
                      {matchCount > 0 && (
                        <span className="cities__chip-count">{matchCount}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="cities__panel">
        {selectedCity ? (
          <>
            <div className="cities__panel-header">
              <h2 className="cities__panel-city">{selectedCity.city}</h2>
              <p className="cities__panel-meta">{selectedCity.stadium} · {selectedCity.country}</p>
            </div>
            <div className="cities__matches">
              {selectedMatches.length > 0
                ? selectedMatches.map((m) => <MatchSticker key={m.id} match={m} />)
                : <p className="cities__no-matches">No matches for this city yet.</p>}
            </div>
          </>
        ) : (
          <p className="cities__prompt">Pick a city to see its matches. 📍</p>
        )}
      </div>
    </section>
  );
}
