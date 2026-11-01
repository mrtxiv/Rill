CREATE TABLE login_limits (
  key TEXT PRIMARY KEY,
  failures INTEGER NOT NULL,
  window_start INTEGER NOT NULL,
  blocked_until INTEGER NOT NULL,
  admission TEXT
);
