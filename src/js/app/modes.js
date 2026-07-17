export function normalizeModeName(mode, fallback = 'byte') {
  if (typeof mode === 'string') return mode.toLowerCase();
  if (typeof mode?.id === 'string') return mode.id.toLowerCase();
  if (typeof mode?.name === 'string') return mode.name.toLowerCase();
  return fallback;
}
