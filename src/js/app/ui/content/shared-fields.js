export function createSharedFieldsSection({ emailInputs, messageInputs, emailSubject, onMessageChange }) {
  const syncGroup = (inputs, source) => {
    inputs.forEach((input) => {
      if (input !== source && input.value !== source.value) input.value = source.value;
    });
  };

  emailInputs.forEach((input) => {
    input.addEventListener('input', () => syncGroup(emailInputs, input));
  });
  messageInputs.forEach((input) => {
    input.addEventListener('input', () => {
      syncGroup(messageInputs, input);
      onMessageChange();
    });
  });

  const buildEmailPayloadWithBody = (body) => {
    const params = new URLSearchParams();
    if (emailSubject.value.trim()) params.set('subject', emailSubject.value.trim());
    if (body.trim()) params.set('body', body.trim());
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return `mailto:${emailInputs[0].value.trim()}${suffix}`;
  };

  const initialize = () => {
    syncGroup(emailInputs, emailInputs.at(-1));
    syncGroup(messageInputs, messageInputs[0]);
  };

  return {
    initialize,
    buildEmailPayload: () => buildEmailPayloadWithBody(messageInputs.at(-1).value),
    buildEmailPayloadWithBody,
  };
}
