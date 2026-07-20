export const MASK_VALUES = ['', '0', '1', '2', '3', '4', '5', '6', '7'];
export const ERROR_LEVELS = [
  {
    value: 'L',
    label: 'Low',
    recovery: 7,
    detail:
      'Uses the least redundancy and can still scan if about {recovery}% of the symbol area is damaged or covered.',
  },
  {
    value: 'M',
    label: 'Medium',
    recovery: 15,
    detail:
      'Balances capacity and resilience, with recovery for about {recovery}% of damaged or covered area.',
  },
  {
    value: 'Q',
    label: 'Quartile',
    recovery: 25,
    detail:
      'Spends more of the code on correction data, allowing recovery from about {recovery}% damage or occlusion.',
  },
  {
    value: 'H',
    label: 'High',
    recovery: 30,
    detail:
      'Uses the most correction data, so the code can often survive about {recovery}% of its area being obscured.',
  },
];
export const MODE_LABELS = {
  numeric: 'Numeric',
  alphanumeric: 'Alphanumeric',
  byte: 'Byte / Binary',
  kanji: 'Kanji',
  mixed: 'Mixed',
};
export const MODE_CAPACITY = {
  numeric: { L: 7089, M: 5596, Q: 3993, H: 3057 },
  alphanumeric: { L: 4296, M: 3391, Q: 2420, H: 1852 },
  byte: { L: 2953, M: 2331, Q: 1663, H: 1273 },
  kanji: { L: 1817, M: 1435, Q: 1024, H: 784 },
};
export const LIMITS = {
  sms: 160,
  emailSubject: 120,
  numberFrames: 10000,
  qrTargetWidth: 2048,
  printPixelsPerInch: 192,
  minPrintModuleInches: 0.02,
  calendarTitle: 120,
  calendarLocation: 160,
  calendarDescription: 500,
};
export const QR_ALPHANUMERIC_CHARACTERS =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
export const FILE_PROTOCOL = {
  version: '1',
  magic: 'FILE',
  defaultChunkVersion: 8,
  headerBytes: 10,
  fieldHeaderBytes: 3,
  flags: { gzip: 0x01 },
  fieldTypes: {
    name: 1,
    mimeType: 2,
    modifiedAt: 3,
    originalSize: 4,
    validationType: 5,
    validationValue: 6,
    customMetadata: 8,
  },
};
