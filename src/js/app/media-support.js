const SUPPORTED_MP4_MEDIA_TYPES = Object.freeze([
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4;codecs=avc1',
  'video/mp4',
]);

export function getSupportedMp4MimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  return (
    SUPPORTED_MP4_MEDIA_TYPES.find((type) =>
      MediaRecorder.isTypeSupported(type),
    ) || ''
  );
}
