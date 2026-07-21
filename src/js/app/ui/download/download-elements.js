import { getPrintElements } from './print-elements.js';

export function getDownloadElements(document, core) {
  const id = (name) => document.getElementById(name);
  return {
    ...core,
    downloadFormat: id('download-format'),
    downloadQualityControls: id('download-quality-controls'),
    downloadQuality: id('download-quality'),
    downloadQualityValue: id('download-quality-value'),
    ...getPrintElements(document),
    downloadCurrent: id('download-current'),
    downloadCurrentPdf: id('download-current-pdf'),
    downloadZip: id('download-zip'),
    downloadAllPdf: id('download-all-pdf'),
    downloadActions: document.querySelectorAll('.download-actions'),
    downloadStatus: id('download-status'),
    downloadSubtabBar: document.querySelector('.download-subtab-bar'),
    downloadAnimationTab: id('download-animation-tab'),
    timingMode: id('animation-timing-mode'),
    animationMinutes: id('animation-minutes'),
    animationSeconds: id('animation-seconds'),
    millisInput: id('animation-milliseconds'),
    durationSummary: id('animation-duration-summary'),
    downloadAnimatedGif: id('download-animated-gif'),
    downloadAnimationMp4: id('download-animation-mp4'),
  };
}
