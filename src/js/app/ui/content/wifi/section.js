export function escapeWifiValue(value) {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

export function createWifiSection({ ssid, password, encryption, hidden, revealSecrets, onChange }) {
  const sync = () => {
    const open = encryption.value === 'nopass';
    password.disabled = open;
    password.setAttribute('aria-disabled', String(open));
    password.placeholder = open ? 'Not used for open networks' : 'Password';
  };

  const buildPayload = () => {
    const segments = [`T:${encryption.value}`, `S:${escapeWifiValue(ssid.value.trim())}`];
    if (encryption.value !== 'nopass') segments.push(`P:${escapeWifiValue(password.value)}`);
    if (hidden.checked) segments.push('H:true');
    return `WIFI:${segments.join(';')};;`;
  };

  const maskPayload = (payload) => revealSecrets.checked
    ? payload
    : payload.replace(/P:([^;]*)/, 'P:[hidden-password]');

  encryption.addEventListener('change', () => {
    sync();
    onChange();
  });

  return { sync, buildPayload, maskPayload };
}
