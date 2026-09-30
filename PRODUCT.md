# Tonekizer
<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Delegated by the user for a quick automatic build. Cloudflare Worker, D1, and a static frontend. Pin o200k_base, with server-authoritative token counts.

## Users
Rodrigo and friends playing a casual word game.

## Product purpose
Find the longest input that fits exactly one, two, or three OpenAI tokens. Play any time, without an account.

## Capabilities and constraints
Six global leaderboards: letters only and anything goes, each for one, two, and three tokens. A player chooses a public nickname when submitting. The leaderboard sits below the input. Free Cloudflare hosting is a requirement. No daily puzzle.

## Brand commitments
Name: Tonekizer. Very simple UI. outbid.lol and small web games are references. User asks the agent to choose and implement the design automatically.

## Open decisions
Letters-only means Unicode letters, not dictionary validation. Nicknames are labels, not verified identities. Length counts Unicode code points after NFC normalization. No automatic trimming or prefix spaces, because those change tokenization.
