import { lookup } from '../../../../i18n/index.js';

export function createDownloadImageSection({ format, qualityControls, quality,
  qualityValue, zip, getFrameCount }) {
  const sync = () => {
    qualityControls.hidden = format.value !== 'jpg';
    qualityValue.textContent = lookup('units.percent', '{value}%', { value: quality.value });
    const count = getFrameCount();
    zip.hidden = count <= 1;
    if (count > 1) zip.textContent = lookup('download.allZip', 'Download all {count} as ZIP', { count });
  };
  return { sync };
}
