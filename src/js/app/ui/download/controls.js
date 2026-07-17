export function createDownloadControls({ elements: e, getFrameCount, activateImageTab, syncAnimation }) {
  return function sync() {
    const jpg = e.format.value === 'jpg';
    e.qualityControls.hidden = !jpg;
    e.qualityValue.textContent = `${e.quality.value}%`;
    const count = getFrameCount();
    const multiple = count > 1;
    e.zip.hidden = !multiple;
    e.allPdf.hidden = !multiple;
    e.animationTab.hidden = !multiple;
    e.subtabBar.classList.toggle('has-animation', multiple);
    if (!multiple && e.animationTab.classList.contains('is-active')) activateImageTab();
    e.actionGroups.forEach((group) => group.classList.toggle('has-multiple', multiple));
    if (multiple) {
      e.zip.textContent = `Download all ${count} as ZIP`;
      e.allPdf.textContent = `Download all ${count} as PDF`;
    }
    syncAnimation();
  };
}
