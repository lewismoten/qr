export function createDownloadImageSection({ format, qualityControls, quality,
  qualityValue, zip, getFrameCount }) {
  const sync = () => {
    qualityControls.hidden = format.value !== 'jpg';
    qualityValue.textContent = `${quality.value}%`;
    const count = getFrameCount();
    zip.hidden = count <= 1;
    if (count > 1) zip.textContent = `Download all ${count} as ZIP`;
  };
  return { sync };
}
