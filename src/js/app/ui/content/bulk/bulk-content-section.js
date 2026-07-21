import { formatBytes } from '../../../bytes.js';
import { parseCsvAsync } from '../../../data/csv.js';
import { validateBulkImport } from './bulk-content-validation.js';
import { getErrorText, lookup } from '../../../../i18n/index.js';
import { createLocalizedError } from '../../../../localized-error.js';
import { refreshFilePicker } from '../../file-picker.js';
import {
  CSV_READ_PROGRESS_SHARE,
  isAbortError,
  readCsvText,
  throwIfAborted,
} from './csv-reader.js';
import { serializeBulkRow } from './bulk-payload.js';
import {
  BULK_FORMAT_SCHEMAS,
  MAX_BULK_FILE_BYTES,
  MAX_BULK_ROWS,
} from './schema.js';

const CSV_PARSE_PROGRESS_SHARE = 0.4;

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
  taskProgress,
  onFormatFallback,
  onChange,
}) {
  let rows = [];
  let parseError = '';
  let loadRequest = 0;
  let activeTask = null;

  const getSchema = (formatName = format.value) =>
    BULK_FORMAT_SCHEMAS[formatName] || null;
  const isMode = () => enabled.checked && Boolean(getSchema());
  const getCurrentRow = () => {
    const index = Math.min(
      rows.length,
      Math.max(1, Number.parseInt(rowIndex.value, 10) || 1),
    );
    return rows[index - 1] || null;
  };

  const parse = async (text, task) => {
    const schema = getSchema();
    const parsedRows = await parseCsvAsync(text, {
      signal: task.signal,
      onProgress: (current, total) =>
        task.update(
          CSV_READ_PROGRESS_SHARE +
            (total ? current / total : 1) * CSV_PARSE_PROGRESS_SHARE,
          lookup('bulk.progress.parsing', 'Parsing CSV data...'),
        ),
    });
    if (!schema || parsedRows.length === 0)
      throw createLocalizedError('bulk.csv.empty', 'The CSV is empty.');
    const headers = parsedRows[0].map((header) =>
      String(header)
        .replace(/^\uFEFF/, '')
        .trim()
        .toLowerCase(),
    );
    const namedHeaders = headers.filter(Boolean);
    if (new Set(namedHeaders).size !== namedHeaders.length) {
      throw createLocalizedError(
        'bulk.csv.duplicateFields',
        'The first row contains duplicate field names.',
      );
    }
    const missingHeaders = schema.fields.filter(
      (field) => !namedHeaders.includes(field),
    );
    if (missingHeaders.length)
      throw createLocalizedError(
        'bulk.csv.missingFields',
        'The first row is missing: {fields}.',
        { fields: missingHeaders.join(', ') },
      );
    const dataRows = parsedRows
      .slice(1)
      .filter((cells) => cells.some((cell) => cell.trim()));
    if (dataRows.length > MAX_BULK_ROWS) {
      throw createLocalizedError(
        'bulk.csv.rowLimit',
        'Bulk imports are limited to {maxRows} data rows.',
        { maxRows: MAX_BULK_ROWS.toLocaleString() },
      );
    }
    if (!dataRows.length)
      throw createLocalizedError(
        'bulk.csv.noRows',
        'The CSV has a header row but no data rows.',
      );
    return dataRows.map((cells) =>
      Object.fromEntries(
        headers.flatMap((header, index) =>
          header ? [[header, cells[index] ?? '']] : [],
        ),
      ),
    );
  };

  const syncStatus = () => {
    const file = fileInput.files?.[0];
    clearButton.disabled = !file && !rows.length && !parseError;
    status.classList.toggle('has-error', Boolean(parseError));
    if (parseError) status.textContent = parseError;
    else if (!rows.length)
      status.textContent = lookup('bulk.status.empty', 'No CSV loaded.');
    else {
      const current = Math.min(
        rows.length,
        Math.max(1, Number.parseInt(rowIndex.value, 10) || 1),
      );
      status.textContent = lookup(
        'bulk.status.loaded',
        '{count} rows loaded. Showing {current} of {count}.',
        {
          count: rows.length.toLocaleString(),
          current: current.toLocaleString(),
        },
      );
    }
  };

  const clear = ({ preserveFileInput = false } = {}) => {
    activeTask?.cancel();
    activeTask = null;
    loadRequest += 1;
    rows = [];
    parseError = '';
    rowIndex.value = '1';
    if (!preserveFileInput) {
      fileInput.value = '';
      refreshFilePicker(fileInput);
    }
    syncStatus();
  };

  const load = async () => {
    activeTask?.cancel();
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
    if (file.size > MAX_BULK_FILE_BYTES) {
      parseError = lookup(
        'bulk.csv.fileSize',
        'The CSV is {size}; Bulk Import CSV files are limited to {maxSize}.',
        {
          size: formatBytes(file.size),
          maxSize: formatBytes(MAX_BULK_FILE_BYTES),
        },
      );
    } else {
      const task = taskProgress.start({
        title: lookup('bulk.progress.title', 'Processing CSV file'),
        phase: lookup('bulk.progress.reading', 'Reading {name}...', {
          name: file.name,
        }),
      });
      activeTask = task;
      let completed = false;
      try {
        const text = await readCsvText(file, task);
        throwIfAborted(task.signal);
        const parsedRows = await parse(text, task);
        if (request !== loadRequest) return;
        rows = parsedRows;
        task.update(
          1,
          lookup('bulk.progress.loaded', 'Loaded {count} rows.', {
            count: rows.length.toLocaleString(),
          }),
        );
        completed = true;
      } catch (error) {
        if (request !== loadRequest) return;
        parseError = isAbortError(error)
          ? lookup('bulk.progress.canceled', 'CSV processing canceled.')
          : getErrorText(
              error,
              lookup('bulk.csv.readError', 'Unable to read this CSV.'),
            );
      } finally {
        if (activeTask === task) activeTask = null;
        task.finish({ completed });
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
    requiredFields.textContent = lookup(
      'bulk.requiredValues',
      'Required values: {values}',
      {
        values: schema?.required.join(', ') || lookup('common.none', 'none'),
      },
    );
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
    buildPayload: (options) =>
      serializeBulkRow({
        row: getCurrentRow(),
        format: format.value,
        ...options,
      }),
    getValidation: ({ rowNumber, limits }) =>
      validateBulkImport({
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
