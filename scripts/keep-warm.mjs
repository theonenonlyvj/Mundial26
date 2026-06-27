// Wakes the free Render API only around match times (kickoffs are fixed and
// known), so live scores load instantly while people are watching — and the
// server is left to sleep the rest of the time so we keep the free tier.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HEALTH_URL = process.env.HEALTH_URL || 'https://mundial26-y28p.onrender.com/api/health';
const LEAD_MIN = 12;   // wake just before kickoff (Render takes ~30-50s cold)
const TAIL_MIN = 170;  // keep warm through extra time / penalties / final whistle

const kickoffs = JSON.parse(
  readFileSync(fileURLToPath(new URL('./kickoffs.json', import.meta.url)), 'utf8'),
);

const now = Date.now();
const live = kickoffs.some((iso) => {
  const ko = Date.parse(iso);
  return now >= ko - LEAD_MIN * 60_000 && now <= ko + TAIL_MIN * 60_000;
});

if (!live) {
  console.log('No match in window — letting the server sleep. 😴');
  process.exit(0);
}

try {
  const res = await fetch(HEALTH_URL, { headers: { 'user-agent': 'mundial26-keepwarm' } });
  console.log(`Match window — pinged ${HEALTH_URL} → ${res.status}`);
} catch (e) {
  console.log('Ping failed (server may still be waking):', e.message);
}
