const BITS_PER_BYTE = 8;
const NUMERIC_GROUP_CHARACTERS = 3;
const NUMERIC_GROUP_BITS = 10;
const NUMERIC_SINGLE_BITS = 4;
const NUMERIC_PAIR_BITS = 7;
const ALPHANUMERIC_GROUP_CHARACTERS = 2;
const ALPHANUMERIC_GROUP_BITS = 11;
const ALPHANUMERIC_SINGLE_BITS = 6;
const KANJI_UNIT_BITS = 13;

export function getEncodingUnitBitLengths(segment, mode) {
  const payloadBits = segment.getBitsLength();
  const dataLength =
    typeof segment.getLength === 'function' ? segment.getLength() : 0;
  const bitLengths = [];

  if (mode === 'numeric') {
    const completeGroups = Math.floor(dataLength / NUMERIC_GROUP_CHARACTERS);
    bitLengths.push(...Array(completeGroups).fill(NUMERIC_GROUP_BITS));
    const remainingDigits = dataLength % NUMERIC_GROUP_CHARACTERS;
    if (remainingDigits > 0) {
      bitLengths.push(
        remainingDigits === 1 ? NUMERIC_SINGLE_BITS : NUMERIC_PAIR_BITS,
      );
    }
  } else if (mode === 'alphanumeric') {
    bitLengths.push(
      ...Array(Math.floor(dataLength / ALPHANUMERIC_GROUP_CHARACTERS)).fill(
        ALPHANUMERIC_GROUP_BITS,
      ),
    );
    if (dataLength % ALPHANUMERIC_GROUP_CHARACTERS === 1) {
      bitLengths.push(ALPHANUMERIC_SINGLE_BITS);
    }
  } else if (mode === 'kanji') {
    bitLengths.push(
      ...Array(Math.floor(payloadBits / KANJI_UNIT_BITS)).fill(KANJI_UNIT_BITS),
    );
  } else if (mode === 'byte') {
    bitLengths.push(
      ...Array(Math.floor(payloadBits / BITS_PER_BYTE)).fill(BITS_PER_BYTE),
    );
  }

  const describedBits = bitLengths.reduce(
    (total, bitLength) => total + bitLength,
    0,
  );
  if (describedBits < payloadBits) {
    bitLengths.push(payloadBits - describedBits);
  }
  return bitLengths;
}
