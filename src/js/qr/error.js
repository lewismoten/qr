export function createQrError(key, message, options, ErrorType = Error) {
  const defaultMessage = options
    ? message.replace(/\{([A-Za-z][\w.-]*)\}/g, (placeholder, tag) =>
        Object.prototype.hasOwnProperty.call(options, tag)
          ? String(options[tag])
          : placeholder,
      )
    : message;
  return Object.assign(new ErrorType(defaultMessage), {
    i18nKey: `qr.errors.${key}`,
    i18nOptions: options,
  });
}
