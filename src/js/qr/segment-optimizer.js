import { getCountBitLength } from './capacity.js';
import { ALPHANUMERIC } from './constants.js';
import { makeSegment } from './segment.js';

const textEncoder = new TextEncoder();

function getCharacterModes(character) {
  const modes = [];
  if (/^[0-9]$/.test(character)) modes.push('numeric');
  if (ALPHANUMERIC.includes(character)) modes.push('alphanumeric');
  modes.push('byte');
  return modes;
}

function getModeUnitCount(mode, character) {
  return mode === 'byte' ? textEncoder.encode(character).length : 1;
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

export function optimizeSegments(text, version) {
  const characters = [...String(text)];
  if (!characters.length) return [makeSegment('', 'byte')];
  let states = [];

  characters.forEach((character) => {
    const nextStates = new Map();
    const availableModes = getCharacterModes(character);
    const previousStates = states.length ? states : [null];
    previousStates.forEach((previous) => {
      availableModes.forEach((mode) => {
        const unitCount = getModeUnitCount(mode, character);
        const countBits = getCountBitLength(mode, version);
        const maximumCount = 2 ** countBits - 1;
        const candidates = [{ continuing: false, previousCount: 0 }];
        if (
          previous?.mode === mode &&
          previous.segmentCount + unitCount <= maximumCount
        ) {
          candidates.push({
            continuing: true,
            previousCount: previous.segmentCount,
          });
        }

        candidates.forEach(({ continuing, previousCount }) => {
          const segmentCount = previousCount + unitCount;
          const cost =
            (previous?.cost || 0) +
            (continuing ? 0 : 4 + countBits) +
            getIncrementalPayloadBits(mode, previousCount, unitCount);
          const key = getOptimizationKey(mode, segmentCount);
          const existing = nextStates.get(key);
          const prefersSpecializedBoundary =
            existing &&
            cost === existing.cost &&
            !continuing &&
            !existing.startsSegment;
          if (!existing || cost < existing.cost || prefersSpecializedBoundary) {
            nextStates.set(key, {
              cost,
              mode,
              segmentCount,
              character,
              startsSegment: !continuing,
              previous,
            });
          }
        });
      });
    });
    states = [...nextStates.values()];
  });

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
