export function createVCardSection({ name, organization, title, phone, email, website }) {
  const buildPayload = () => {
    const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${name.value.trim()}`];
    const optionalFields = [
      ['ORG', organization],
      ['TITLE', title],
      ['TEL', phone],
      ['EMAIL', email],
      ['URL', website],
    ];

    optionalFields.forEach(([key, input]) => {
      if (input.value.trim()) lines.push(`${key}:${input.value.trim()}`);
    });
    lines.push('END:VCARD');
    return lines.join('\n');
  };

  return { buildPayload };
}
