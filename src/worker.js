import { analyze, nickname } from './game.js';
import { submissionRetryAfter } from './rate-limit.js';

function json(data, status = 200, extra = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
        const mode = url.searchParams.get('mode') ?? 'letters';
        const tokens = Number(url.searchParams.get('tokens') ?? 1);
        if (!['letters', 'open'].includes(mode) || ![1, 2, 3].includes(tokens)) return json({ error: 'Choose a valid leaderboard.' }, 400);
        const { results } = await env.DB.prepare('SELECT id, word, length, nickname, created_at FROM scores WHERE mode = ? AND tokens = ? ORDER BY length DESC, id ASC LIMIT 100').bind(mode, tokens).all();
        return json({ entries: results, mode, tokens });
      }
      if (url.pathname === '/api/scores' && request.method === 'POST') {
        const retryAfter = await submissionRetryAfter(request, env.DB);
        if (retryAfter) return json({ error: `Too many submissions. Try again in ${retryAfter} ${retryAfter === 1 ? 'second' : 'seconds'}.` }, 429, { 'Retry-After': String(retryAfter) });
        if (request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) return json({ error: 'Submit your entry from Tonekizer.' }, 403);
        if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'Send a JSON entry.' }, 415);
        if (Number(request.headers.get('Content-Length')) > 4096) return json({ error: 'Entry is too large.' }, 413);
        const bodyText = await request.text();
        if (bodyText.length > 4096) return json({ error: 'Entry is too large.' }, 413);
        let body;
        try { body = JSON.parse(bodyText); } catch { return json({ error: 'Invalid JSON.' }, 400); }
        if (!body || typeof body !== 'object') return json({ error: 'Send an entry and a nickname.' }, 400);
        let score, name;
        try {
          score = analyze(body.word, body.mode ?? 'letters');
          name = nickname(body.nickname);
        } catch (error) { return json({ error: error.message }, 400); }
        if (![1, 2, 3].includes(score.tokens)) return json({ error: `That's ${score.tokens} tokens. Find an entry using 1, 2, or 3.` }, 400);
        const mode = body.mode ?? 'letters';
        const inserted = await env.DB.prepare('INSERT INTO scores (mode, tokens, word, length, nickname) VALUES (?, ?, ?, ?, ?) ON CONFLICT(mode, tokens, word) DO NOTHING RETURNING id').bind(mode, score.tokens, score.word, score.length, name).first();
        if (!inserted) return json({ error: 'Already discovered! This entry keeps its first finder.' }, 409);
        const rank = await env.DB.prepare('SELECT COUNT(*) + 1 AS rank FROM scores WHERE mode = ? AND tokens = ? AND (length > ? OR (length = ? AND id < ?))').bind(mode, score.tokens, score.length, score.length, inserted.id).first();
        return json({ ...score, mode, nickname: name, rank: rank.rank }, 201);
      }
      return json({ error: 'Not found.' }, 404);
    } catch (error) {
      console.error('Request failed', error);
      return json({ error: 'The leaderboard is unavailable. Your word is still here. Try again shortly.' }, 503);
    }
  }
};
