import { lookup } from '../i18n/index.js';
import { throwIfAborted, waitFor } from './abort.js';

export function parseBoolean(value, { allowBlank = true } = {}) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized && allowBlank) return false;
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  return null;
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
      continue;
    }

    if (character === '"' && value === '') {
      quoted = true;
    } else if (character === ',') {
      row.push(value);
      value = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  if (quoted) throw new Error(lookup('bulk.csv.unclosedQuote', 'The CSV contains an unclosed quoted value.'));
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  while (rows.length && rows.at(-1).every((cell) => !cell.trim())) rows.pop();
  return rows;
}

export async function parseCsvAsync(text, { signal, onProgress, yieldEvery = 32768 } = {}) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else value += character;
    } else if (character === '"' && value === '') quoted = true;
    else if (character === ',') {
      row.push(value);
      value = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else value += character;

    if (index > 0 && index % yieldEvery === 0) {
      onProgress?.(index, text.length);
      await waitFor(0, signal);
    }
  }

  throwIfAborted(signal);
  onProgress?.(text.length, text.length);
  if (quoted) throw new Error(lookup('bulk.csv.unclosedQuote', 'The CSV contains an unclosed quoted value.'));
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  while (rows.length && rows.at(-1).every((cell) => !cell.trim())) rows.pop();
  return rows;
}
