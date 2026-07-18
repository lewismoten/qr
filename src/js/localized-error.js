function interpolate(message, options) {
  if (!options) return message;
  return message.replace(/\{([A-Za-z][\w.-]*)\}/g, (placeholder, tag) =>
    Object.prototype.hasOwnProperty.call(options, tag)
      ? String(options[tag])
      : placeholder,
  );
}

export function createLocalizedError(key, message, options, ErrorType = Error) {
  return Object.assign(new ErrorType(interpolate(message, options)), {
    i18nKey: key,
    i18nOptions: options,
  });
}
