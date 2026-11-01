import type { Env } from '../env';
import { sha256 } from '../util/bytes';

const WINDOW = 15 * 60_000;
type Bucket = { key: string; free: number; maxShift: number; cap: number };

// Per address: 5 free attempts, then 1 s doubling to 256 s. Per account: a looser bucket that slows
// guessing spread across many addresses without letting anyone hold the owner's logins shut.
async function buckets(req: Request): Promise<Bucket[]> {
  return [
    { key: `ip:${await sha256(req.headers.get('cf-connecting-ip') ?? 'unknown')}`, free: 4, maxShift: 8, cap: 300_000 },
    { key: 'account:owner', free: 19, maxShift: 5, cap: 30_000 },
  ];
}

/** Seconds to wait before another attempt, or 0. Counts the attempt before the password is checked. */
export async function loginThrottle(env: Env, req: Request): Promise<number> {
  if (!env.DB) return 0;
  const db = env.DB, admission = crypto.randomUUID(), now = Date.now();
  const rows = await db.batch((await buckets(req)).map(({ key, free, maxShift, cap }) => db.prepare(`INSERT INTO login_limits(key,failures,window_start,blocked_until,admission) VALUES(?,1,?,0,?)
 ON CONFLICT(key) DO UPDATE SET
 admission=CASE WHEN window_start<? OR blocked_until<=? THEN excluded.admission ELSE admission END,
 failures=CASE WHEN window_start<? THEN 1 WHEN blocked_until>? THEN failures ELSE failures+1 END,
 window_start=CASE WHEN window_start<? THEN excluded.window_start ELSE window_start END,
 blocked_until=CASE WHEN window_start<? THEN 0 WHEN blocked_until>? THEN blocked_until WHEN failures>=? THEN ?+min(?,1000*(1 << min(?,failures-?))) ELSE 0 END
 RETURNING blocked_until,admission`).bind(key, now, admission, now - WINDOW, now, now - WINDOW, now, now - WINDOW, now - WINDOW, now, free, now, cap, maxShift, free)));
  return Math.max(0, ...rows.map(r => {
    const row = r.results[0] as { blocked_until: number; admission: string } | undefined;
    return row?.admission === admission ? 0 : Math.ceil((Number(row?.blocked_until ?? 0) - now) / 1000);
  }));
}

export async function resetLogin(env: Env, req: Request): Promise<void> {
  if (!env.DB) return;
  const db = env.DB;
  await db.batch((await buckets(req)).map(({ key }) => db.prepare('DELETE FROM login_limits WHERE key=?').bind(key)));
}
