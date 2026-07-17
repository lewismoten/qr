let shiftJisMap;

function getShiftJisMap() {
  if (shiftJisMap) return shiftJisMap;
  let decoder;
  try {
    decoder = new TextDecoder('shift_jis', { fatal: true });
  } catch (error) {
    throw new Error('Native Kanji mode requires browser Shift JIS decoding support.');
  }

  shiftJisMap = new Map();
  const leadRanges = [[0x81, 0x9f], [0xe0, 0xeb]];
  leadRanges.forEach(([firstLead, lastLead]) => {
    for (let lead = firstLead; lead <= lastLead; lead += 1) {
      for (let trail = 0x40; trail <= 0xfc; trail += 1) {
        if (trail === 0x7f) continue;
        try {
          const character = decoder.decode(Uint8Array.of(lead, trail));
          if ([...character].length === 1 && character !== '\ufffd' && !shiftJisMap.has(character)) {
            shiftJisMap.set(character, (lead << 8) | trail);
          }
        } catch (error) {
          // Unassigned Shift JIS byte pairs are not QR Kanji characters.
        }
      }
    }
  });
  return shiftJisMap;
}

export function toShiftJis(character) {
  return getShiftJisMap().get(character);
}

export function getQrKanjiValue(character) {
  const shiftJis = toShiftJis(character);
  if (!Number.isInteger(shiftJis)) return null;
  let adjusted;
  if (shiftJis >= 0x8140 && shiftJis <= 0x9ffc) adjusted = shiftJis - 0x8140;
  else if (shiftJis >= 0xe040 && shiftJis <= 0xebbf) adjusted = shiftJis - 0xc140;
  else return null;
  return ((adjusted >>> 8) * 0xc0) + (adjusted & 0xff);
}
