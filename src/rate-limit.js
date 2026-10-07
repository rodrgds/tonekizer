const BURST = 10;
const REFILL_MS = 6000;
const BURST_TOLERANCE_MS = (BURST - 1) * REFILL_MS;

export async function submissionRetryAfter(request, db) {
  const address = request.headers.get('CF-Connecting-IP') ?? 'local';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(address));
  const key = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const now = Date.now();
  // Each admitted attempt adds six seconds of debt. Only admission changes debt,
  // so repeated blocked requests cannot extend the wait. The batch is atomic.
  const [, admitted, state] = await db.batch([
    db.prepare('DELETE FROM submission_buckets WHERE drains_at <= ?').bind(now),
    db.prepare(`INSERT INTO submission_buckets (key, drains_at) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET drains_at = MAX(drains_at, ?) + ?
      WHERE drains_at <= ? RETURNING drains_at`)
      .bind(key, now + REFILL_MS, now, REFILL_MS, now + BURST_TOLERANCE_MS),
    db.prepare('SELECT drains_at FROM submission_buckets WHERE key = ?').bind(key)
  ]);
  if (admitted.results.length) return 0;
  return Math.max(1, Math.ceil((state.results[0].drains_at - BURST_TOLERANCE_MS - now) / 1000));
}
