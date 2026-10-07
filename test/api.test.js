import { test } from 'node:test';
import assert from 'node:assert/strict';
const base = 'http://localhost:8788';
let player = 0;
async function submit(word, mode = 'letters', name = 'tester') {
  const response = await fetch(`${base}/api/scores`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': `198.51.100.${++player}` }, body: JSON.stringify({ word, mode, nickname: name, tokens: 1, length: 9999 }) });
  return { status: response.status, data: await response.json() };
}

test('server scores exact tokens, persists discoveries, and preserves the first finder', async () => {
  for (const [word, tokens, length] of [['hello',1,5],['hellohello',2,10],['hellohellohello',3,15]]) {
    const result = await submit(word);
    assert.equal(result.status, 201);
    assert.equal(result.data.tokens, tokens);
    assert.equal(result.data.length, length);
    const board = await (await fetch(`${base}/api/leaderboard?mode=letters&tokens=${tokens}`)).json();
    assert.ok(board.entries.some(entry => entry.word === word && entry.nickname === 'tester' && entry.length === length));
  }
  const duplicate = await submit('hello', 'letters', 'imposter');
  assert.equal(duplicate.status,409);
  const board = await (await fetch(`${base}/api/leaderboard?mode=letters&tokens=1`)).json();
  assert.equal(board.entries.find(entry => entry.word === 'hello').nickname,'tester');
});

test('categories, normalized Unicode, and invalid entries are enforced at the HTTP boundary', async () => {
  assert.equal((await submit('!!!!!!!!')).status,400);
  const symbols = await submit('!!!!!!!!','open');
  assert.equal(symbols.status,201);
  assert.equal(symbols.data.tokens,1);
  const unicode = await submit('e\u0301');
  assert.equal(unicode.status,201);
  assert.equal(unicode.data.word,'é');
  assert.equal(unicode.data.length,1);
  for (const word of ['', ' ', 'a\u200bb', 'a'.repeat(257), 'antidisestablishmentarianism']) assert.equal((await submit(word)).status,400);
  assert.equal((await submit('world','letters','<script>')).status,400);
  assert.equal((await fetch(`${base}/api/leaderboard?tokens=4`)).status,400);
  assert.equal((await fetch(`${base}/api/scores`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status,400);
});

test('leaderboard sorts by length, then discovery order; boards remain separate', async () => {
  assert.equal((await submit('international')).status,201);
  assert.equal((await submit('world')).status,201);
  const board = await (await fetch(`${base}/api/leaderboard?tokens=1`)).json();
  assert.equal(board.entries[0].word,'international');
  assert.ok(board.entries.findIndex(entry => entry.word === 'hello') < board.entries.findIndex(entry => entry.word === 'world'));
  assert.ok(!board.entries.some(entry => entry.word === '!!!!!!!!'));
});

test('invalid submission floods are bounded, isolated by IP, and recover after Retry-After', async () => {
  const attempt = address => fetch(`${base}/api/scores`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': address }, body: '{'
  });
  const responses = await Promise.all(Array.from({ length: 15 }, () => attempt('192.0.2.10')));
  assert.equal(responses.filter(response => response.status === 400).length, 10);
  assert.equal(responses.filter(response => response.status === 429).length, 5);
  const blocked = responses.find(response => response.status === 429);
  const retryAfter = Number(blocked.headers.get('Retry-After'));
  assert.ok(retryAfter >= 1 && retryAfter <= 6);
  assert.match((await blocked.json()).error, /Try again in \d+ seconds?\./);
  assert.equal((await attempt('192.0.2.11')).status, 400);
  assert.equal((await fetch(`${base}/api/leaderboard`)).status, 200);
  await new Promise(resolve => setTimeout(resolve, retryAfter * 1000 + 100));
  assert.equal((await attempt('192.0.2.10')).status, 400);
  assert.equal((await attempt('192.0.2.10')).status, 429);
});
