export const MAX_BULK_ROWS = 10000;
export const MAX_BULK_FILE_BYTES = 5 * 1024 * 1024;

export const BULK_FORMAT_SCHEMAS = {
  url: { fields: ['url'], required: ['url'] },
  text: { fields: ['text'], required: ['text'] },
  number: { fields: ['number', 'prefix', 'suffix'], required: ['number'] },
  wifi: {
    fields: ['ssid', 'password', 'security', 'hidden'],
    required: ['ssid', 'security'],
  },
  email: { fields: ['email', 'subject', 'body'], required: ['email'] },
  phone: { fields: ['phone'], required: ['phone'] },
  sms: { fields: ['phone', 'message'], required: ['phone'] },
  event: {
    fields: [
      'title',
      'all_day',
      'start_date',
      'start_time',
      'end_date',
      'end_time',
      'location',
      'description',
      'url',
    ],
    required: ['title', 'start_date', 'end_date'],
  },
  geo: {
    fields: ['latitude', 'longitude', 'label'],
    required: ['latitude', 'longitude'],
  },
  vcard: {
    fields: ['name', 'organization', 'title', 'phone', 'email', 'url'],
    required: ['name'],
  },
};
