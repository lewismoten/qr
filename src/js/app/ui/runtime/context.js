export function createRuntimeContext() {
  let systems;
  let activeTab = 'content';
  let activeDebugSubtab = 'encoding';
  let activeDebugOutline = 'codewords';

  const connected = () => {
    if (!systems)
      throw new Error(
        'Application runtime used before systems were connected.',
      );
    return systems;
  };

  return {
    connect(value) {
      systems = value;
    },
    getDebugState: () => ({ tab: activeTab, subtab: activeDebugSubtab }),
    getOutlineMode: () => activeDebugOutline,
    setActiveTab(value) {
      activeTab = value;
    },
    setActiveDebugSubtab(value) {
      activeDebugSubtab = value;
    },
    setOutlineMode(value) {
      activeDebugOutline = value;
    },
    render: (...args) => connected().preview.render(...args),
    cancelRender: (...args) => connected().preview.cancel(...args),
    buildOptions: (...args) =>
      connected().contentEncoding.qr.buildOptions(...args),
    buildPayload: (...args) =>
      connected().contentEncoding.qr.buildPayload(...args),
    syncNavigation: (...args) => connected().download.syncNavigation(...args),
    syncChoices: (...args) => connected().navigation.syncChoices(...args),
    syncSmsLength: (...args) => connected().output.syncSmsLength(...args),
    syncEmailLength: (...args) =>
      connected().contentEncoding.emailCapacity.sync(...args),
    syncEvent: (...args) => connected().contentSections.event.sync(...args),
    setFrameCentered: (...args) =>
      connected().contentEncoding.pipeline.frame.setCentered(...args),
    formatVersion: (...args) => connected().output.formatVersion(...args),
    activateDownload: (...args) =>
      connected().navigation.activateDownload(...args),
  };
}
