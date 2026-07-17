import { serializeEmail } from '../../content-formats.js';

export function createSharedFieldsSection({
  emailInputs,
  messageInputs,
  emailSubject,
  onMessageChange,
}) {
  const syncGroup = (inputs, source) => {
    inputs.forEach((input) => {
      if (input !== source && input.value !== source.value)
        input.value = source.value;
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

  const buildEmailPayloadWithBody = (body) =>
    serializeEmail({
      email: emailInputs[0].value,
      subject: emailSubject.value,
      body,
    });

  const initialize = () => {
    syncGroup(emailInputs, emailInputs.at(-1));
    syncGroup(messageInputs, messageInputs[0]);
  };
  const buildEmailPreview = () =>
    serializeEmail({
      email: emailInputs[0].value.trim() || '[recipient@example.com]',
      subject: emailSubject.value.trim() || '[subject]',
      body: messageInputs.at(-1).value.trim() || '[message]',
    });

  return {
    initialize,
    buildEmailPayload: () =>
      buildEmailPayloadWithBody(messageInputs.at(-1).value),
    buildEmailPayloadWithBody,
    buildEmailPreview,
  };
}
