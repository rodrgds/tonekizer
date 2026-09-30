import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const bundle = await build({ entryPoints: ['src/client.js'], bundle: true, write: false, format: 'iife', loader: { '.css': 'empty' } });

function openGame(savedName) {
  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only' });
  const { window } = dom;
  const submissions = [];
  if (savedName) window.localStorage.setItem('tonekizer-nickname', savedName);
  window.TextEncoder = TextEncoder;
  window.TextDecoder = TextDecoder;
  window.fetch = async (url, options) => {
    if (!options) return { ok: true, json: async () => ({ entries: [] }) };
    const entry = JSON.parse(options.body);
    submissions.push(entry);
    return { ok: true, json: async () => ({ nickname: entry.nickname, rank: 1, length: entry.word.length, tokens: 1 }) };
  };
  window.eval(bundle.outputFiles[0].text);
  const enter = word => {
    const input = window.document.getElementById('word');
    input.value = word;
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    window.document.getElementById('entry-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  };
  return { window, submissions, enter, close: () => window.close() };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('returning players submit with their saved identifier without seeing the name prompt', async () => {
  const game = openGame('Rodrigo');
  try {
    game.enter('hello');
    await settle();
    assert.equal(game.window.document.getElementById('identity').hidden, true);
    assert.deepEqual(game.submissions, [{ word: 'hello', mode: 'letters', nickname: 'Rodrigo' }]);
  } finally { game.close(); }
});

test('first-time players choose an identifier once and reuse it for subsequent entries', async () => {
  const game = openGame();
  try {
    game.enter('hello');
    assert.equal(game.window.document.getElementById('identity').hidden, false);
    assert.equal(game.submissions.length, 0);
    game.window.document.getElementById('nickname').value = 'Rodrigo';
    game.window.document.getElementById('save').click();
    await settle();
    assert.equal(game.window.localStorage.getItem('tonekizer-nickname'), 'Rodrigo');
    game.enter('world');
    await settle();
    assert.equal(game.window.document.getElementById('identity').hidden, true);
    assert.deepEqual(game.submissions.map(entry => entry.nickname), ['Rodrigo', 'Rodrigo']);
  } finally { game.close(); }
});
