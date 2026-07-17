export function createEmailCapacity({ body, hint, encoder, buildOptions, buildPayload, buildEmail }) {
  const getInfo = () => {
    const current = body.value.length;
    let options;
    try {
      options = buildOptions();
    } catch (error) {
      return { current, max: 0 };
    }
    const canEncode = (length) => {
      try {
        encoder.create(buildPayload(buildEmail('A'.repeat(length))), options);
        return true;
      } catch (error) {
        return false;
      }
    };
    if (!canEncode(0)) return { current, max: 0 };
    let low = 0;
    let high = Math.max(current, 32);
    while (high < 8192 && canEncode(high)) {
      low = high;
      high *= 2;
    }
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2);
      if (canEncode(middle)) low = middle;
      else high = middle;
    }
    return { current, max: low };
  };
  const sync = () => {
    const { current, max } = getInfo();
    hint.textContent = `${current} / ${max}`;
  };
  return { getInfo, sync };
}
