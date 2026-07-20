import { lookup } from '../../../../i18n/index.js';

export function createDownloadImageSection({
  current,
  format,
  qualityControls,
  quality,
  qualityValue,
  zip,
  getFrameCount,
}) {
  const sync = () => {
    qualityControls.hidden = format.value !== 'jpg';
    qualityValue.textContent = lookup('units.percent', '{value}%', {
      value: quality.value,
    });
    const count = getFrameCount();
    current.textContent =
      count > 1
        ? lookup('downloadUi.image.current', 'Download current image')
        : lookup('downloadUi.image.download', 'Download');
    zip.hidden = count <= 1;
    if (count > 1)
      zip.textContent = lookup(
        'download.allZip',
        'Download all {count} as ZIP',
        { count },
      );
  };
  return { sync };
}
