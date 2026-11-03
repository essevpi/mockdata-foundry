import { readRecords } from '../../lib/generate-response';
import {
  FIELD_TYPES,
  REQUEST_LIMITS,
  isRecord,
  validateGenerateRequest,
  type FieldDefinition,
  type FieldType,
  type GenerateRequest,
  type GenerateSuccess,
} from '../../lib/generation';
import { DEFAULT_RECORD_COUNT, type FieldDraft } from './field-utils';

// The form and the last successful result are kept in this browser only, so a reload does not
// lose typed input or cost a generation. Everything read back is untrusted (corrupt data, an
// older app version, hand edits) and is checked before use.
export const FORM_DRAFT_STORAGE_KEY = 'mockdata-form-draft';
export const LAST_RESULT_STORAGE_KEY = 'mockdata-last-result';

const STORAGE_VERSION = 1;

// Enough for any number the record count input can hold, including partial input.
const RECORD_COUNT_MAX_LENGTH = 12;

export type FormDraft = {
  description: string;
  recordCount: string;
  fields: FieldDefinition[];
};

export type LastResult = {
  request: GenerateRequest;
  result: GenerateSuccess;
};

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem' | 'removeItem'>;

function readJson(storage: ReadableStorage | undefined, key: string): unknown {
  try {
    const text = storage?.getItem(key);

    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

function writeJson(storage: WritableStorage | undefined, key: string, value: object): void {
  try {
    storage?.setItem(key, JSON.stringify({ v: STORAGE_VERSION, ...value }));
  } catch {
    // Storage is full or blocked; the page keeps working, it just will not survive a reload.
  }
}

function isFieldType(value: unknown): value is FieldType {
  return FIELD_TYPES.some((type) => type === value);
}

function parseRecordCount(value: unknown): string {
  return typeof value === 'string' &&
    value.length <= RECORD_COUNT_MAX_LENGTH &&
    (value === '' || Number.isFinite(Number(value)))
    ? value
    : DEFAULT_RECORD_COUNT;
}

// A draft may be incomplete (that is what drafts are), so it is not run through request
// validation; it only has to have the right shape, within the limits the inputs enforce.
function parseDraftField(value: unknown): FieldDefinition | undefined {
  if (
    !isRecord(value) ||
    typeof value.name !== 'string' ||
    !isFieldType(value.type) ||
    typeof value.nullable !== 'boolean'
  ) {
    return undefined;
  }

  const field: FieldDefinition = {
    name: value.name.slice(0, REQUEST_LIMITS.fieldNameMaxLength),
    type: value.type,
    nullable: value.nullable,
  };

  return typeof value.guidance === 'string'
    ? { ...field, guidance: value.guidance.slice(0, REQUEST_LIMITS.fieldGuidanceMaxLength) }
    : field;
}

export function parseFormDraft(value: unknown): FormDraft | undefined {
  if (
    !isRecord(value) ||
    value.v !== STORAGE_VERSION ||
    typeof value.description !== 'string' ||
    !Array.isArray(value.fields)
  ) {
    return undefined;
  }

  return {
    description: value.description.slice(0, REQUEST_LIMITS.descriptionMaxLength),
    recordCount: parseRecordCount(value.recordCount),
    fields: value.fields
      .map(parseDraftField)
      .filter((field) => field !== undefined)
      .slice(0, REQUEST_LIMITS.fieldsMaxCount),
  };
}

// A stored result must still be a valid request with exactly its records, each passing the same
// checkRecord as a live reply.
export function parseLastResult(value: unknown): LastResult | undefined {
  if (!isRecord(value) || value.v !== STORAGE_VERSION) {
    return undefined;
  }

  const validation = validateGenerateRequest(value.request);

  if (!validation.valid) {
    return undefined;
  }

  const records = readRecords(value, validation.data);

  return records ? { request: validation.data, result: { records } } : undefined;
}

// The draft keeps fields as typed, without the client-side row ids.
export function createFormDraft(
  description: string,
  recordCount: string,
  fields: FieldDraft[],
): FormDraft {
  return {
    description,
    recordCount,
    fields: fields.map(({ name, type, nullable, guidance }) =>
      guidance === undefined ? { name, type, nullable } : { name, type, nullable, guidance },
    ),
  };
}

export function readFormDraft(storage: ReadableStorage | undefined): FormDraft | undefined {
  return parseFormDraft(readJson(storage, FORM_DRAFT_STORAGE_KEY));
}

export function storeFormDraft(storage: WritableStorage | undefined, draft: FormDraft): void {
  writeJson(storage, FORM_DRAFT_STORAGE_KEY, draft);
}

export function readLastResult(storage: ReadableStorage | undefined): LastResult | undefined {
  return parseLastResult(readJson(storage, LAST_RESULT_STORAGE_KEY));
}

export function storeLastResult(storage: WritableStorage | undefined, lastResult: LastResult): void {
  writeJson(storage, LAST_RESULT_STORAGE_KEY, {
    request: lastResult.request,
    records: lastResult.result.records,
  });
}

export function removeLastResult(storage: WritableStorage | undefined): void {
  try {
    storage?.removeItem(LAST_RESULT_STORAGE_KEY);
  } catch {
    // Nothing to do: the stale result is checked again before it is ever shown.
  }
}
