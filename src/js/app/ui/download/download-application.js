export function createApplicationDownloadSetup({
  elements: e,
  frames,
  runtime,
  getPrintWidth,
  syncPrint,
  taskProgress,
}) {
  let active = false;
  let image = null;
  let documentSection = null;
  let animation = null;
  let animationRequest = null;
  let lazyActions = null;

  const syncControls = () => {
    if (!active) return;
    const count = frames.getFrameCount();
    const multiple = count > 1;
    e.downloadAnimationTab.hidden = !multiple;
    e.downloadSubtabBar.classList.toggle('has-animation', multiple);
    if (!multiple && e.downloadAnimationTab.classList.contains('is-active')) {
      runtime.activateImageTab();
    }
    e.downloadActions.forEach((group) =>
      group.classList.toggle('has-multiple', multiple),
    );

    image?.sync();
    documentSection?.sync();
    animation?.sync();
  };

  e.downloadQuality?.addEventListener('input', syncControls);
  for (const input of [
    e.animationMinutes,
    e.animationSeconds,
    e.animationMilliseconds,
  ]) {
    input?.addEventListener('input', () => animation?.sync());
  }
  document.getElementById('qr-form').addEventListener('click', (event) => {
    const button = event.target.closest('.choice-button');
    if (!button) return;
    const target = document.getElementById(button.dataset.choiceTarget);
    if (target === e.downloadFormat) syncControls();
    if (target === e.animationTimingMode) animation?.sync();
  });

  const ensureImage = () =>
    import('./image/image-download-section.js').then(
      ({ createDownloadImageSection }) => {
        image ??= createDownloadImageSection({
          current: e.downloadCurrent,
          format: e.downloadFormat,
          qualityControls: e.downloadQualityControls,
          quality: e.downloadQuality,
          qualityValue: e.downloadQualityValue,
          zip: e.downloadZip,
          getFrameCount: frames.getFrameCount,
        });
        return image;
      },
    );

  const ensureDocument = () =>
    import('./document/document-download-section.js').then(
      ({ createDownloadDocumentSection }) => {
        documentSection ??= createDownloadDocumentSection({
          allPdf: e.downloadAllPdf,
          currentPdf: e.downloadCurrentPdf,
          getFrameCount: frames.getFrameCount,
          syncPrint,
        });
        return documentSection;
      },
    );

  const ensureAnimation = () => {
    if (animation) return Promise.resolve(animation);
    if (!animationRequest) {
      animationRequest = Promise.all([
        import('./animation/animation-download-section.js'),
        import('../../media-support.js'),
      ])
        .then(([{ createAnimationSection }, { getSupportedMp4MimeType }]) => {
          animation = createAnimationSection({
            timingMode: e.animationTimingMode,
            minutesInput: e.animationMinutes,
            secondsInput: e.animationSeconds,
            millisecondsInput: e.animationMilliseconds,
            summary: e.animationDurationSummary,
            mp4Button: e.downloadAnimationMp4,
            getFrameCount: frames.getFrameCount,
            getSupportedMp4MimeType,
          });
          return animation;
        })
        .catch((error) => {
          animationRequest = null;
          throw error;
        });
    }
    return animationRequest;
  };

  const ensureActions = async () => {
    const options = {
      canvas: e.canvas,
      formatInput: e.downloadFormat,
      qualityInput: e.downloadQuality,
      status: e.downloadStatus,
      currentButton: e.downloadCurrent,
      currentPdfButton: e.downloadCurrentPdf,
      zipButton: e.downloadZip,
      allPdfButton: e.downloadAllPdf,
      gifButton: e.downloadAnimatedGif,
      mp4Button: e.downloadAnimationMp4,
      getPrintWidthInches: getPrintWidth,
      taskProgress,
      getFrameCount: frames.getFrameCount,
      getCurrentFrame: frames.getCurrentFrame,
      setCurrentFrame: frames.setCurrentFrame,
      syncFrameNavigation: frames.sync,
      render: () => runtime.render(),
      getAnimationTiming: (count) =>
        animation?.getTiming(count) ?? {
          enteredDurationMs: 0,
          perFrameMs: 0,
          totalDurationMs: 0,
        },
      formatAnimationDuration: (value) =>
        animation?.formatDuration(value) ?? `${value} ms`,
    };
    if (!lazyActions) {
      const { setupLazyDownloadActions } = await import('./lazy-actions.js');
      lazyActions = setupLazyDownloadActions(
        options,
        () => import('./actions.js'),
      );
      return;
    }
    lazyActions.update(options);
  };

  const load = async (name) => {
    active = true;
    if (name === 'image') await ensureImage();
    if (name === 'document') await ensureDocument();
    if (name === 'animation') await ensureAnimation();
    await ensureActions();
    syncControls();
  };

  return {
    load,
    syncControls,
    getFrameCount: frames.getFrameCount,
    getCurrentFrame: frames.getCurrentFrame,
    setCurrentFrame: frames.setCurrentFrame,
    syncNavigation: frames.sync,
    syncAnimation: () => animation?.sync(),
  };
}
