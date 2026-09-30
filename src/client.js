import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource-variable/sora';
import './style.css';
import { analyze, nickname as validateNickname } from './game.js';

const $ = id => document.getElementById(id);
let mode = 'letters';
let target = 1;
let current = null;
let busy = false;
let boardRequest = 0;
let pending = null;
const tokenNames = ['zero', 'one', 'two', 'three'];
let rememberedNickname = '';
try { rememberedNickname = validateNickname(localStorage.getItem('tonekizer-nickname')); } catch { /* Storage may be unavailable or contain an invalid nickname. */ }
$('nickname').value = rememberedNickname;

function update() {
  current = null;
  $('message').textContent = '';
  $('identity').hidden = true;
  pending = null;
  $('analysis').hidden = !$('word').value;
  $('pieces').replaceChildren();
  $('length').textContent = `${[...$('word').value.normalize('NFC')].length} characters`;
  if (!$('word').value) { $('submit').disabled = true; return; }
  try {
    current = analyze($('word').value, mode);
    for (const piece of current.pieces) {
      const chip = document.createElement('span');
      chip.textContent = piece.text.replaceAll(' ', '␣');
      chip.title = `Token ${piece.id}`;
      $('pieces').append(chip);
    }
    const valid = current.tokens === target;
    $('result').textContent = valid ? `${current.tokens} ${target === 1 ? 'token' : 'tokens'}. It fits. Can you go longer?` : `${current.tokens} tokens. You need exactly ${target}.`;
    $('result').className = valid ? 'valid' : '';
    $('submit').disabled = !valid || busy;
  } catch (error) {
    $('result').textContent = error.message;
    $('result').className = 'error';
    $('submit').disabled = true;
  }
}

async function loadBoard() {
  const request = ++boardRequest;
  $('board-label').textContent = `${mode === 'letters' ? 'Letters only' : 'Anything goes'} · ${target} ${target === 1 ? 'token' : 'tokens'}`;
  $('board').replaceChildren();
  const loading = document.createElement('p'); loading.className = 'empty'; loading.textContent = 'Loading the leaderboard…'; $('board').append(loading);
  try {
    const response = await fetch(`/api/leaderboard?mode=${mode}&tokens=${target}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    if (request !== boardRequest) return;
    $('board').replaceChildren();
    if (!data.entries.length) {
      loading.textContent = 'An open field. Make the first discovery.';
      $('board').append(loading);
      return;
    }
    let lastLength;
    for (let i = 0; i < data.entries.length; i++) {
      const entry = data.entries[i];
      if (entry.length !== lastLength) {
        const divider = document.createElement('div'); divider.className = 'length-divider'; divider.textContent = `${entry.length} ${entry.length === 1 ? 'character' : 'characters'}`; $('board').append(divider); lastLength = entry.length;
      }
      const row = document.createElement('div'); row.className = 'score-row';
      const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = `${i + 1}`;
      const word = document.createElement('bdi'); word.className = 'score-word'; word.textContent = entry.word; word.title = entry.word;
      const finder = document.createElement('bdi'); finder.className = 'finder'; finder.textContent = entry.nickname;
      row.append(rank, word, finder); $('board').append(row);
    }
  } catch (error) {
    if (request !== boardRequest) return;
    loading.textContent = 'Could not load the leaderboard. Use Refresh to try again.';
  }
}

for (const button of document.querySelectorAll('[data-mode], [data-tokens]')) {
  button.addEventListener('click', () => {
    if (busy) return;
    if (button.dataset.mode) mode = button.dataset.mode;
    else target = Number(button.dataset.tokens);
    for (const item of document.querySelectorAll('[data-mode]')) item.setAttribute('aria-pressed', String(item.dataset.mode === mode));
    for (const item of document.querySelectorAll('[data-tokens]')) item.setAttribute('aria-pressed', String(Number(item.dataset.tokens) === target));
    $('goal-text').textContent = `${tokenNames[target]} ${target === 1 ? 'token' : 'tokens'}`;
    $('word').placeholder = mode === 'letters' ? 'Got a long word?' : 'Try something unexpected';
    $('entry-hint').textContent = mode === 'letters' ? 'Any language. Letters only. Case matters.' : 'Symbols and spaces welcome. Case matters.';
    update(); loadBoard();
  });
}
$('word').addEventListener('input', update);
$('entry-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!current || current.tokens !== target || busy) return;
  if (!$('identity').hidden) { save(); return; }
  pending = { word: current.word, mode };
  if (rememberedNickname) { save(); return; }
  $('identity').hidden = false;
  $('nickname').focus();
});
async function save() {
  if (!pending || busy) return;
  let name;
  try { name = validateNickname($('nickname').value); } catch (error) {
    $('message').textContent = error.message;
    $('message').className = 'error';
    return;
  }
  rememberedNickname = name;
  try { localStorage.setItem('tonekizer-nickname', name); } catch { /* Keep the nickname for this visit when storage is blocked. */ }
  busy = true;
  $('save').disabled = true; $('save').textContent = 'Saving…'; $('submit').disabled = true; $('word').readOnly = true;
  $('message').textContent = '';
  try {
    const response = await fetch('/api/scores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...pending, nickname: name }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    $('identity').hidden = true;
    $('message').textContent = `You're #${data.rank}! ${data.length} characters in ${data.tokens} ${data.tokens === 1 ? 'token' : 'tokens'}. Keep hunting.`;
    $('message').className = 'valid';
    await loadBoard();
  } catch (error) {
    $('message').textContent = error.message || 'Could not save. Try again.';
    $('message').className = 'error';
  } finally {
    busy = false; $('word').readOnly = false; $('save').disabled = false; $('save').textContent = 'Add to leaderboard';
    $('submit').disabled = !current || current.tokens !== target;
  }
}
$('save').addEventListener('click', save);
$('refresh').addEventListener('click', loadBoard);
$('rules-toggle').addEventListener('click', () => {
  $('rules').hidden = !$('rules').hidden;
  $('rules-toggle').setAttribute('aria-expanded', String(!$('rules').hidden));
  if (!$('rules').hidden) $('rules').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
loadBoard();
