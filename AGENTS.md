# Tonekizer

- Cloudflare Pages advanced-mode worker and D1. `npm run build` generates `dist/_worker.js`. `npm run dev` runs Pages with the local D1 database.
- Use `npm run db:local` before local API tests. `npm test` checks the public HTTP API on localhost:8788, including actual SQLite persistence.
- Keep `o200k_base` pinned for every board. Changing encoding requires a separate leaderboard version, never reinterpret existing scores.
- The server derives token count and length. Never trust client-supplied scores. NFC-normalize entries, preserve case and spaces, count Unicode code points, and reject invisible/control characters.
- Letters only accepts Unicode letters and marks, without a dictionary. Anything goes permits spaces and symbols. Both require exactly 1, 2, or 3 tokens.
- First finder owns an identical entry within a board. Equal lengths rank by insertion order. Nicknames are public unverified labels.
- Render all user content with textContent, never HTML. Keep SQL parameterized.
- Existing Python scripts and word lists are local research and excluded from publishing.
- Remember a valid identifier in localStorage and reuse it without prompting. If storage is blocked, retain it for the current visit.
- GitHub Actions checks pushes and pull requests. Deployment is manual by user choice. Apply database migrations explicitly before deploying schema changes.
- Canonical public URL is `https://tonekizer.rgo.pt`. Cloudflare account Bulk Redirect list `tonekizer_redirect` redirects the production pages.dev hostname, preserving paths and queries. Umami uses `https://cool.rgo.pt`; keep script-src and connect-src restricted to that origin and self.
