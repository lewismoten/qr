export function createRenderController(deps) {
  let request = 0;

  const render = async () => {
    const requestId = ++request;
    deps.syncOutputs();
    deps.syncFormat();
    deps.updateMap();
    let encodedText = '';
    let options;

    try {
      encodedText = await deps.buildText();
      options = deps.buildOptions();
    } catch (error) {
      if (requestId !== request) return;
      deps.showBuildError(error, options);
      return;
    }
    if (requestId !== request) return;

    deps.updateTextPreview(encodedText);
    deps.updateOptionsPreview(options);
    deps.syncMask();
    deps.renderMasks(encodedText);
    const validation = deps.getValidation();
    if (validation.error) {
      deps.setValidation(validation.error);
      deps.renderInvalid(encodedText || deps.buildPreview(), options, validation.error);
      deps.updateSummary(null, options);
      return;
    }

    const modeValid = deps.validateMode(encodedText);
    if (!encodedText.trim()) {
      const message = 'Not valid yet: content is required.';
      deps.setValidation(message);
      deps.renderInvalid(deps.buildPreview(), options, message);
      deps.updateSummary(null, options);
      return;
    }
    if (!modeValid) {
      deps.renderInvalid(encodedText || deps.buildPreview(), options, deps.getModeError());
      deps.updateSummary(null, options);
      return;
    }

    try {
      const definition = deps.createDefinition(deps.buildPayload(encodedText), options);
      deps.updateSummary(definition, options);
      deps.setValidation(validation.warning, [], validation.warning ? 'warning' : 'error');
      deps.drawQr(definition, options);
      deps.syncDownloads();
    } catch (error) {
      const message = error.message || 'Unable to encode this content.';
      deps.setValidation(message);
      deps.renderInvalid(encodedText || deps.buildPreview(), options, message);
      deps.updateSummary(null, options);
      console.error(error);
    }
  };

  return {
    render,
    cancel: () => { request += 1; },
  };
}
