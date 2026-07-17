export function getSupportedMp4MimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  return (
    ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4'].find(
      (type) => MediaRecorder.isTypeSupported(type),
    ) || ''
  );
}
