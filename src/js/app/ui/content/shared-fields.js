import { serializeEmail } from '../../content-formats.js';
import { lookup } from '../../../i18n/index.js';

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
      email:
        emailInputs[0].value.trim() ||
        lookup('content.preview.email', '[Email address]'),
      subject:
        emailSubject.value.trim() ||
        lookup('content.preview.subject', '[Subject]'),
      body:
        messageInputs.at(-1).value.trim() ||
        lookup('content.preview.message', '[Message]'),
    });

  return {
    initialize,
    buildEmailPayload: () =>
      buildEmailPayloadWithBody(messageInputs.at(-1).value),
    buildEmailPayloadWithBody,
    buildEmailPreview,
  };
}

export function createSharedFieldsSectionFromDocument(document, options) {
  return createSharedFieldsSection({
    emailInputs: [
      document.getElementById('email-to'),
      document.getElementById('vcard-email'),
    ],
    messageInputs: [
      document.getElementById('text-input'),
      document.getElementById('sms-body'),
      document.getElementById('email-body'),
    ],
    emailSubject: document.getElementById('email-subject'),
    ...options,
  });
}
