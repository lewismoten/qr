const emoji = Object.freeze({
  link: '\u{1F517}',
  phone: '\u{1F4F1}',
  envelope: '\u{2709}\u{FE0F}',
  location: '\u{1F4CD}',
  signal: '\u{1F4F6}',
  home: '\u{1F3E0}',
  globe: '\u{1F310}',
  calendar: '\u{1F4C5}',
  ticket: '\u{1F3AB}',
  cart: '\u{1F6D2}',
  gift: '\u{1F381}',
  key: '\u{1F511}',
  lock: '\u{1F512}',
  star: '\u{2B50}',
  heart: '\u{2764}\u{FE0F}',
  check: '\u{2705}',
  rocket: '\u{1F680}',
  bulb: '\u{1F4A1}',
  camera: '\u{1F4F7}',
  music: '\u{1F3B5}',
  coffee: '\u{2615}',
  book: '\u{1F4D6}',
  food: '\u{1F354}',
  smile: '\u{1F60A}',
});

const option = (name, label) => ({
  value: emoji[name],
  key: `style.art.icons.${name}`,
  label,
});

export const EMOJI_GROUPS = Object.freeze([
  {
    id: 'connect',
    icon: '\u{1F4AC}',
    options: [
      option('link', 'Link'),
      option('phone', 'Phone'),
      option('envelope', 'Envelope'),
      option('location', 'Location pin'),
      option('signal', 'Signal bars'),
    ],
  },
  {
    id: 'places',
    icon: '\u{1F30D}',
    options: [
      option('home', 'Home'),
      option('globe', 'Globe'),
      option('calendar', 'Calendar'),
      option('ticket', 'Ticket'),
    ],
  },
  {
    id: 'shopping',
    icon: '\u{1F381}',
    options: [
      option('cart', 'Shopping cart'),
      option('gift', 'Gift'),
      option('key', 'Key'),
      option('lock', 'Lock'),
    ],
  },
  {
    id: 'symbols',
    icon: '\u{2B50}',
    options: [
      option('star', 'Star'),
      option('heart', 'Heart'),
      option('check', 'Check mark'),
      option('rocket', 'Rocket'),
      option('bulb', 'Light bulb'),
    ],
  },
  {
    id: 'leisure',
    icon: '\u{1F389}',
    options: [
      option('camera', 'Camera'),
      option('music', 'Music'),
      option('coffee', 'Coffee'),
      option('book', 'Book'),
      option('food', 'Food'),
      option('smile', 'Smile'),
    ],
  },
]);
