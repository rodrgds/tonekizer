# Tonekizer

Find the longest word that fits exactly one, two, or three tokens.

Play at https://tonekizer.rgo.pt. The old production Pages URL redirects here. Each token target has a letters-only board and an anything-goes board. No accounts, just a public nickname. First finder owns an entry; longest entries rank first.

## Token rules

Every board uses OpenAI's `o200k_base` encoding through `gpt-tokenizer`. The server computes scores. Case and spaces matter. Entries are NFC-normalized, and length counts Unicode code points. Letters-only accepts Unicode letters and combining marks, without dictionary validation. Anything goes accepts visible symbols and spaces. Control and invisible characters are rejected. Entries are limited to 256 characters.

## Development

Node 22 or newer.

```sh
npm ci
npm run build
npm run db:local
npm run dev
```

Open http://localhost:8788. Rebuild after edits. With that local server running, `npm test` clears only the local test scores and rate limits, then tests the real HTTP API and SQLite persistence. It never targets production.

## Deploy

Cloudflare Pages advanced-mode Worker plus D1. The configured database is `tonekizer`, bound as `DB`.

```sh
npx wrangler login
npm run db:remote
npm run deploy
```

The GitHub Actions workflow checks pushes and pull requests. Deployment is manual with `npm run deploy`; pushing to GitHub does not deploy. Database migrations remain an explicit `npm run db:remote` operation. No paid services or AI API keys are required. Usage is subject to Cloudflare's account limits. Every submission attempt counts toward a per-IP limit, including invalid entries. A hashed IP can make a burst of 10 attempts, with one allowance refilled every 6 seconds. Blocked attempts receive HTTP 429 and a Retry-After header without extending the wait. D1 enforces the limit across Worker instances; expired records are removed on subsequent submissions. Leaderboard reads remain available. The browser remembers a valid nickname in localStorage and reuses it without prompting. If storage is blocked, it remembers the nickname for the current visit. Nicknames and entries are public. Nicknames do not prove identity.

Umami analytics loads from `https://cool.rgo.pt`. Static routes bypass the Worker. Leaderboard queries use a compound index and return at most 100 discoveries per board. Example discoveries were submitted through the game to seed the boards.
