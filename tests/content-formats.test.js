import assert from 'node:assert/strict';
import {
  escapeWifiValue,
  serializeEmail,
  serializeGeo,
  serializePhone,
  serializeSms,
  serializeVCard,
  serializeWifi,
} from '../src/js/app/content-formats.js';

assert.equal(escapeWifiValue('a;b,c:d\\e"f'), 'a\\;b\\,c\\:d\\\\e\\"f');
assert.equal(
  serializeWifi({
    security: 'WPA',
    ssid: ' Office;WiFi ',
    password: 'a:b',
    hidden: true,
  }),
  'WIFI:T:WPA;S:Office\\;WiFi;P:a\\:b;H:true;;',
);
assert.equal(
  serializeWifi({ security: 'nopass', ssid: 'Guest', password: 'ignored' }),
  'WIFI:T:nopass;S:Guest;;',
);

assert.equal(
  serializeEmail({
    email: ' person@example.com ',
    subject: ' Hello ',
    body: 'Line one',
  }),
  'mailto:person@example.com?subject=Hello&body=Line+one',
);
assert.equal(
  serializeEmail({ email: 'person@example.com' }),
  'mailto:person@example.com',
);
assert.equal(
  serializeEmail({ email: 'person@example.com', body: 'Only body' }),
  'mailto:person@example.com?body=Only+body',
);
assert.equal(serializePhone('(530) 539-4775'), 'tel:+15305394775');
assert.equal(serializePhone('no digits'), '');
assert.equal(
  serializeSms({ number: '+1 530 539 4775', message: 'Hello' }),
  'SMSTO:+15305394775:Hello',
);

assert.equal(
  serializeGeo({
    latitude: ' 38.91820 ',
    longitude: '-78.19440',
    label: 'Front Royal, VA',
  }),
  'geo:38.91820,-78.19440?q=Front%20Royal%2C%20VA',
);
assert.equal(
  serializeGeo({ latitude: '38.9', longitude: '-78.2' }),
  'geo:38.9,-78.2',
);
assert.equal(
  serializeVCard({
    name: ' Lewis Moten III ',
    organization: 'LewisMoten.com',
    phone: '+15305394775',
  }),
  [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:Lewis Moten III',
    'ORG:LewisMoten.com',
    'TEL:+15305394775',
    'END:VCARD',
  ].join('\n'),
);
assert.equal(
  serializeVCard({
    name: 'Lewis Moten III',
    organization: 'LewisMoten.com',
    title: 'Owner',
    phone: '+15305394775',
    email: 'lewismoten@gmail.com',
    url: 'https://lewismoten.com',
  }),
  [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:Lewis Moten III',
    'ORG:LewisMoten.com',
    'TITLE:Owner',
    'TEL:+15305394775',
    'EMAIL:lewismoten@gmail.com',
    'URL:https://lewismoten.com',
    'END:VCARD',
  ].join('\n'),
);

console.log('QR content format serialization tests passed.');
