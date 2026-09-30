import { encode, decode } from 'gpt-tokenizer/encoding/o200k_base';

export const MAX_LENGTH = 256;
export const ENCODING = 'o200k_base';

export function analyze(input, mode = 'letters') {
  if (typeof input !== 'string') throw new Error('Enter a word first.');
  if (!['letters', 'open'].includes(mode)) throw new Error('Choose a valid mode.');
  const word = input.normalize('NFC');
  const length = [...word].length;
  if (!length) throw new Error('Enter a word first.');
  if (length > MAX_LENGTH) throw new Error(`Keep your entry to ${MAX_LENGTH} characters or fewer.`);
  if (/[\p{Cc}\p{Cf}\p{Cs}]/u.test(word)) throw new Error('Invisible and control characters are not allowed.');
  if (!word.trim()) throw new Error('Enter something other than spaces.');
  if (mode === 'letters' && !/^\p{L}[\p{L}\p{M}]*$/u.test(word)) {
    throw new Error('Letters only: no spaces, numbers, or symbols. Try Anything goes.');
  }
  const ids = encode(word, { disallowedSpecial: new Set() });
  return { word, length, tokens: ids.length, pieces: ids.map(id => ({ id, text: decode([id]) })), encoding: ENCODING };
}

export function nickname(input) {
  if (typeof input !== 'string') throw new Error('Choose a nickname.');
  const name = input.normalize('NFC').trim();
  if (!/^[\p{L}\p{N}_-]{2,24}$/u.test(name)) throw new Error('Use 2–24 letters, numbers, underscores, or hyphens for your nickname.');
  return name;
}
