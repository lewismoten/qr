import { formatBytes } from '../../../bytes.js';
import { parseCsv } from '../../../csv.js';
import { validateBulkImport } from './validation.js';

const MAX_ROWS = 10000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FORMAT_SCHEMAS = {
  url: { fields: ['url'], required: ['url'] },
  text: { fields: ['text'], required: ['text'] },
  number: { fields: ['number', 'prefix', 'suffix'], required: ['number'] },
  wifi: { fields: ['ssid', 'password', 'security', 'hidden'], required: ['ssid', 'security'] },
  email: { fields: ['email', 'subject', 'body'], required: ['email'] },
  phone: { fields: ['phone'], required: ['phone'] },
  sms: { fields: ['phone', 'message'], required: ['phone'] },
  event: {
    fields: ['title', 'all_day', 'start_date', 'start_time', 'end_date', 'end_time', 'location', 'description', 'url'],
    required: ['title', 'start_date', 'end_date'],
  },
  geo: { fields: ['latitude', 'longitude', 'label'], required: ['latitude', 'longitude'] },
  vcard: { fields: ['name', 'organization', 'title', 'phone', 'email', 'url'], required: ['name'] },
};

export function createBulkImportSection({
  enabled,
  format,
  fields,
  expectedFields,
  requiredFields,
  fileInput,
  rowIndex,
  status,
  clearButton,
  fileFormatButton,
  onFormatFallback,
  onChange,
}) {
  let rows = [];
  let parseError = '';
  let loadRequest = 0;

  const getSchema = (formatName = format.value) => FORMAT_SCHEMAS[formatName] || null;
  const isMode = () => enabled.checked && Boolean(getSchema());
  const getCurrentRow = () => {
    const index = Math.min(rows.length, Math.max(1, Number.parseInt(rowIndex.value, 10) || 1));
    return rows[index - 1] || null;
  };

  const parse = (text) => {
    const schema = getSchema();
    const parsedRows = parseCsv(text);
    if (!schema || parsedRows.length === 0) throw new Error('The CSV is empty.');
    const headers = parsedRows[0].map((header) => String(header).replace(/^\uFEFF/, '').trim().toLowerCase());
    const namedHeaders = headers.filter(Boolean);
    if (new Set(namedHeaders).size !== namedHeaders.length) {
      throw new Error('The first row contains duplicate field names.');
    }
    const missingHeaders = schema.fields.filter((field) => !namedHeaders.includes(field));
    if (missingHeaders.length) throw new Error(`The first row is missing: ${missingHeaders.join(', ')}.`);
    const dataRows = parsedRows.slice(1).filter((cells) => cells.some((cell) => cell.trim()));
    if (dataRows.length > MAX_ROWS) {
      throw new Error(`Bulk imports are limited to ${MAX_ROWS.toLocaleString()} data rows.`);
    }
    if (!dataRows.length) throw new Error('The CSV has a header row but no data rows.');
    return dataRows.map((cells) =>
      Object.fromEntries(headers.flatMap((header, index) => (header ? [[header, cells[index] ?? '']] : []))),
    );
  };

  const syncStatus = () => {
    const file = fileInput.files?.[0];
    clearButton.disabled = !file && !rows.length && !parseError;
    status.classList.toggle('has-error', Boolean(parseError));
    if (parseError) status.textContent = parseError;
    else if (!rows.length) status.textContent = 'No CSV loaded.';
    else {
      const current = Math.min(rows.length, Math.max(1, Number.parseInt(rowIndex.value, 10) || 1));
      status.textContent = `${rows.length.toLocaleString()} rows loaded. Showing ${current.toLocaleString()} of ${rows.length.toLocaleString()}.`;
    }
  };

  const clear = ({ preserveFileInput = false } = {}) => {
    loadRequest += 1;
    rows = [];
    parseError = '';
    rowIndex.value = '1';
    if (!preserveFileInput) fileInput.value = '';
    syncStatus();
  };

  const load = async () => {
    const request = ++loadRequest;
    const file = fileInput.files?.[0];
    rows = [];
    parseError = '';
    rowIndex.value = '1';
    if (!file) {
      syncStatus();
      onChange();
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      parseError = `The CSV is ${formatBytes(file.size)}; Bulk Import CSV files are limited to ${formatBytes(MAX_FILE_BYTES)}.`;
    } else {
      try {
        const parsedRows = parse(await file.text());
        if (request !== loadRequest) return;
        rows = parsedRows;
      } catch (error) {
        if (request !== loadRequest) return;
        parseError = error.message || 'Unable to read this CSV.';
      }
    }
    syncStatus();
    onChange();
  };

  const syncControls = () => {
    const bulk = enabled.checked;
    if (bulk && !getSchema()) {
      format.value = 'url';
      onFormatFallback();
    }
    const schema = getSchema();
    fields.hidden = !bulk;
    fields.setAttribute('aria-hidden', String(!bulk));
    expectedFields.textContent = schema?.fields.join(', ') || '';
    requiredFields.textContent = `Required values: ${schema?.required.join(', ') || 'none'}`;
    fileFormatButton.disabled = bulk;
    fileFormatButton.setAttribute('aria-disabled', String(bulk));
    syncStatus();
  };

  fileInput.addEventListener('change', load);
  clearButton.addEventListener('click', () => {
    clear();
    onChange();
  });

  return {
    getSchema,
    isMode,
    getCurrentRow,
    getRowCount: () => rows.length,
    getError: () => parseError,
    getValidationState: ({ rowNumber, limits }) => validateBulkImport({
      parseError,
      hasFile: Boolean(fileInput.files?.[0]),
      row: getCurrentRow(),
      rowNumber,
      schema: getSchema(),
      format: format.value,
      limits,
    }),
    syncStatus,
    syncControls,
    clear,
    load,
  };
}
