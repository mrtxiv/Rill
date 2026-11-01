import type { Env } from '../env';
import { sha256 } from '../util/bytes';

const WINDOW = 15 * 60_000;
type Bucket = { key: string; free: number; maxShift: number; cap: number };

// An IPv6 client usually holds a whole /64, so bucket those by prefix rather than by address.
function clientKey(ip: string): string {
  if (!ip.includes(':')) return ip;
  if (ip.includes('.')) return ip.slice(ip.lastIndexOf(':') + 1);
  const [head, tail = ''] = ip.split('::');
  const left = head ? head.split(':') : [], right = tail ? tail.split(':') : [];
  const groups = [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right];
  return groups.slice(0, 4).map(g => g.padStart(4, '0')).join(':') + '::/64';
}

const ipBucket = async (req: Request): Promise<Bucket> =>
  ({ key: `ip:${await sha256(clientKey(req.headers.get('cf-connecting-ip') ?? 'unknown'))}`, free: 4, maxShift: 8, cap: 300_000 });
// Counts only attempts an address bucket admitted, so one address can't fill it. It slows guessing spread over
// many addresses; the short cap keeps it from becoming a way to hold the owner's logins shut.
const ACCOUNT: Bucket = { key: 'account:owner', free: 49, maxShift: 3, cap: 10_000 };

// Counts the attempt, then returns seconds to wait (0 when admitted). Atomic, so concurrent guesses all count.
async function admit(db: D1Database, { key, free, maxShift, cap }: Bucket, now: number): Promise<number> {
  const admission = crypto.randomUUID();
  const row = await db.prepare(`INSERT INTO login_limits(key,failures,window_start,blocked_until,admission) VALUES(?,1,?,0,?)
 ON CONFLICT(key) DO UPDATE SET
 admission=CASE WHEN window_start<? OR blocked_until<=? THEN excluded.admission ELSE admission END,
 failures=CASE WHEN window_start<? THEN 1 WHEN blocked_until>? THEN failures ELSE failures+1 END,
 window_start=CASE WHEN window_start<? THEN excluded.window_start ELSE window_start END,
 blocked_until=CASE WHEN window_start<? THEN 0 WHEN blocked_until>? THEN blocked_until WHEN failures>=? THEN ?+min(?,1000*(1 << min(?,failures-?))) ELSE 0 END
 RETURNING blocked_until,admission`).bind(key, now, admission, now - WINDOW, now, now - WINDOW, now, now - WINDOW, now - WINDOW, now, free, now, cap, maxShift, free)
    .first<{ blocked_until: number; admission: string }>();
  return row?.admission === admission ? 0 : Math.max(1, Math.ceil((Number(row?.blocked_until ?? 0) - now) / 1000));
}

/** Seconds to wait before another attempt, or 0. Counts the attempt before the password is checked. */
export async function loginThrottle(env: Env, req: Request): Promise<number> {
  if (!env.DB) return 0;
  const now = Date.now(), wait = await admit(env.DB, await ipBucket(req), now);
  return wait || admit(env.DB, ACCOUNT, now);
}

/** After a correct password: clears only this address's bucket, so a success doesn't reset a distributed count. */
export async function resetLogin(env: Env, req: Request): Promise<void> {
  if (env.DB) await env.DB.prepare('DELETE FROM login_limits WHERE key=?').bind((await ipBucket(req)).key).run();
}
