export function loadConfig(env = process.env) {
  return {
    apiKey: env.FOOTBALL_DATA_API_KEY || '',
    port: Number(env.PORT) || 3000,
    ttls: { matches: 120_000, standings: 120_000, scorers: 300_000 },
  };
}
