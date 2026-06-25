import { useEffect, useState } from 'react';
import { getStandings } from '../api/client.js';
import { buildAdvByTeam } from '../lib/advancement.js';

// Fetches standings once and exposes a teamId -> { status, note } map for flagging
// clinched/eliminated teams on match cards. Returns null until loaded; an empty
// Map on failure (so cards simply render no flags rather than break).
export function useAdvByTeam() {
  const [advByTeam, setAdvByTeam] = useState(null);
  useEffect(() => {
    let active = true;
    getStandings()
      .then((s) => active && setAdvByTeam(buildAdvByTeam(s)))
      .catch(() => active && setAdvByTeam(new Map()));
    return () => { active = false; };
  }, []);
  return advByTeam;
}
