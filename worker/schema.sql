-- Append-only timeline of every game's state, written by the cron on each change.
CREATE TABLE IF NOT EXISTS match_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,          -- epoch ms of the cron tick that observed this state
  match_id INTEGER NOT NULL,
  home TEXT, away TEXT,
  stage TEXT, status TEXT, duration TEXT,   -- duration: REGULAR / EXTRA_TIME / PENALTY_SHOOTOUT
  home_score INTEGER, away_score INTEGER,
  winner TEXT,                  -- HOME_TEAM / AWAY_TEAM / DRAW / null
  pens_home INTEGER, pens_away INTEGER
);
CREATE INDEX IF NOT EXISTS idx_match_log_match ON match_log(match_id, ts);
