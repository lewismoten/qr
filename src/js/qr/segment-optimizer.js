import { getCountBitLength } from './capacity.js';
import { ALPHANUMERIC } from './constants.js';
import { makeSegment } from './segment.js';

function getCharacterModes(character) {
  const modes = [];
  const codePoint = character.codePointAt(0);
  if (codePoint >= 0x30 && codePoint <= 0x39) modes.push('numeric');
  if (ALPHANUMERIC.includes(character)) modes.push('alphanumeric');
  modes.push('byte');
  return modes;
}

function getModeUnitCount(mode, character) {
  if (mode !== 'byte') return 1;
  const codePoint = character.codePointAt(0);
  if (codePoint <= 0x7f) return 1;
  if (codePoint <= 0x7ff) return 2;
  if (codePoint <= 0xffff) return 3;
  return 4;
}

function getIncrementalPayloadBits(mode, previousCount, unitCount) {
  if (mode === 'numeric') return previousCount % 3 === 0 ? 4 : 3;
  if (mode === 'alphanumeric') return previousCount % 2 === 0 ? 6 : 5;
  return unitCount * 8;
}

function getOptimizationKey(mode, count) {
  if (mode === 'numeric') return `${mode}:${count % 3}`;
  if (mode === 'alphanumeric') return `${mode}:${count % 2}`;
  return mode;
}

function addCandidate(
  states,
  previous,
  character,
  mode,
  unitCount,
  countBits,
  continuing,
) {
  const previousCount = continuing ? previous.segmentCount : 0;
  const segmentCount = previousCount + unitCount;
  const cost =
    (previous ? previous.cost : 0) +
    (continuing ? 0 : 4 + countBits) +
    getIncrementalPayloadBits(mode, previousCount, unitCount);
  const key = getOptimizationKey(mode, segmentCount);
  const existing = states.get(key);
  const prefersSpecializedBoundary =
    existing &&
    cost === existing.cost &&
    !continuing &&
    !existing.startsSegment;
  if (existing && cost > existing.cost) return;
  if (existing && cost === existing.cost && !prefersSpecializedBoundary) return;
  states.set(key, {
    cost,
    mode,
    segmentCount,
    character,
    startsSegment: !continuing,
    previous,
  });
}

export function optimizeSegments(text, version) {
  const characters = [...String(text)];
  if (!characters.length) return [makeSegment('', 'byte')];
  let states = [];

  for (const character of characters) {
    const nextStates = new Map();
    const availableModes = getCharacterModes(character);
    const previousStates = states.length ? states : [null];
    for (const previous of previousStates) {
      for (const mode of availableModes) {
        const unitCount = getModeUnitCount(mode, character);
        const countBits = getCountBitLength(mode, version);
        const maximumCount = 2 ** countBits - 1;
        addCandidate(
          nextStates,
          previous,
          character,
          mode,
          unitCount,
          countBits,
          false,
        );
        if (
          previous &&
          previous.mode === mode &&
          previous.segmentCount + unitCount <= maximumCount
        )
          addCandidate(
            nextStates,
            previous,
            character,
            mode,
            unitCount,
            countBits,
            true,
          );
      }
    }
    states = [...nextStates.values()];
  }

  const preference = { numeric: 0, alphanumeric: 1, kanji: 2, byte: 3 };
  let current = states.reduce(
    (best, state) =>
      !best ||
      state.cost < best.cost ||
      (state.cost === best.cost &&
        preference[state.mode] < preference[best.mode])
        ? state
        : best,
    null,
  );
  const encodedCharacters = [];
  while (current) {
    encodedCharacters.push(current);
    current = current.previous;
  }
  encodedCharacters.reverse();

  const optimized = [];
  encodedCharacters.forEach(({ character, mode, startsSegment }) => {
    if (startsSegment || !optimized.length) {
      optimized.push({ mode, data: character });
    } else {
      optimized.at(-1).data += character;
    }
  });
  return optimized.map(({ data, mode }) => makeSegment(data, mode));
}
