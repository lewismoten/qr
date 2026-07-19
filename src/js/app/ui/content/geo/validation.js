import { lookup } from '../../../../i18n/index.js';
import { validateGeoLabel } from '../../../data/validation.js';
import { parseCoordinate } from './coordinates.js';

const invalid = (error) => ({ error, warning: '' });

export function validateGeo(document) {
  const latitudeText = document.getElementById('geo-latitude').value.trim();
  const longitudeText = document.getElementById('geo-longitude').value.trim();
  for (const [value, key, label] of [
    [latitudeText, 'latitude', 'latitude'],
    [longitudeText, 'longitude', 'longitude'],
  ]) {
    if (!value) {
      return invalid(
        lookup(
          `validation.geo.${key}Required`,
          `Not valid for Geo format yet: ${label} is required.`,
        ),
      );
    }
  }
  const latitude = parseCoordinate(latitudeText);
  const longitude = parseCoordinate(longitudeText);
  if (latitude === null || longitude === null) {
    const key = latitude === null ? 'latitude' : 'longitude';
    return invalid(
      lookup(
        `validation.geo.${key}Number`,
        `Not valid for Geo format yet: ${key} must be a valid number.`,
      ),
    );
  }
  if (latitude < -90 || latitude > 90) {
    return invalid(
      lookup(
        'validation.geo.latitudeRange',
        'Not valid for Geo format yet: latitude must be between -90 and 90.',
      ),
    );
  }
  if (longitude < -180 || longitude > 180) {
    return invalid(
      lookup(
        'validation.geo.longitudeRange',
        'Not valid for Geo format yet: longitude must be between -180 and 180.',
      ),
    );
  }
  const labelError = validateGeoLabel(
    document.getElementById('geo-query').value,
  );
  return labelError ? invalid(labelError) : { error: '', warning: '' };
}
