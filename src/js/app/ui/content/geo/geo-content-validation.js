import { lookup } from '../../../../i18n/index.js';
import { validateGeoLabel } from '../../../data/validation.js';
import {
  MAXIMUM_LATITUDE,
  MAXIMUM_LONGITUDE,
  MINIMUM_LATITUDE,
  MINIMUM_LONGITUDE,
  parseCoordinate,
} from './coordinates.js';

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
  if (latitude < MINIMUM_LATITUDE || latitude > MAXIMUM_LATITUDE) {
    return invalid(
      lookup(
        'validation.geo.latitudeRange',
        'Not valid for Geo format yet: latitude must be between {minimum} and {maximum}.',
        { minimum: MINIMUM_LATITUDE, maximum: MAXIMUM_LATITUDE },
      ),
    );
  }
  if (longitude < MINIMUM_LONGITUDE || longitude > MAXIMUM_LONGITUDE) {
    return invalid(
      lookup(
        'validation.geo.longitudeRange',
        'Not valid for Geo format yet: longitude must be between {minimum} and {maximum}.',
        { minimum: MINIMUM_LONGITUDE, maximum: MAXIMUM_LONGITUDE },
      ),
    );
  }
  const labelError = validateGeoLabel(
    document.getElementById('geo-query').value,
  );
  return labelError ? invalid(labelError) : { error: '', warning: '' };
}
