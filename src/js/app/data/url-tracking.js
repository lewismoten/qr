const TRACKING_PARAMETER_PREFIXES = Object.freeze(['utm_']);

const TRACKING_PARAMETER_NAMES = new Set([
  '_ga',
  '_gl',
  '_hsenc',
  '_hsmi',
  'dclid',
  'fbclid',
  'gbraid',
  'gclid',
  'igshid',
  'li_fat_id',
  'mc_cid',
  'mc_eid',
  'mkt_tok',
  'msclkid',
  'oly_anon_id',
  'oly_enc_id',
  'rb_clickid',
  's_cid',
  'ttclid',
  'twclid',
  'vero_conv',
  'vero_id',
  'wbraid',
]);

function isTrackingParameter(name) {
  const normalized = name.toLowerCase();
  return (
    TRACKING_PARAMETER_NAMES.has(normalized) ||
    TRACKING_PARAMETER_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  );
}

function parseWebUrl(value) {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export function getTrackingParameterNames(value) {
  const url = parseWebUrl(value);
  if (!url) return [];
  return [
    ...new Set(
      [...url.searchParams.keys()].filter((name) => isTrackingParameter(name)),
    ),
  ];
}

export function removeTrackingParameters(value) {
  const url = parseWebUrl(value);
  if (!url) return value;
  let changed = false;
  for (const name of [...url.searchParams.keys()]) {
    if (!isTrackingParameter(name)) continue;
    url.searchParams.delete(name);
    changed = true;
  }
  return changed ? url.toString() : value;
}
