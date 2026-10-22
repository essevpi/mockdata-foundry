export const FIELD_TYPES = ['string', 'number', 'integer', 'boolean'] as const;

export const REQUEST_LIMITS = {
  descriptionMaxLength: 1_000,
  fieldGuidanceMaxLength: 160,
  fieldNameMaxLength: 40,
  fieldsMaxCount: 8,
  fieldsMinCount: 1,
  maxRequestBytes: 8 * 1_024,
  recordsMaxCount: 50,
  recordsMinCount: 1,
  returnedStringMaxLength: 64,
} as const;

const fieldNamePattern = /^[A-Za-z][A-Za-z0-9_]*$/;

export type FieldType = (typeof FIELD_TYPES)[number];

export type FieldDefinition = {
  name: string;
  type: FieldType;
  nullable: boolean;
  guidance?: string;
};

export type GenerateRequest = {
  description: string;
  count: number;
  fields: FieldDefinition[];
};

export type PrimitiveValue = string | number | boolean | null;

export type GenerateSuccess = {
  records: Array<Record<string, PrimitiveValue>>;
  validation: {
    valid: true;
    recordCount: number;
  };
};

export type GenerationErrorCode =
  | 'INVALID_REQUEST'
  | 'CONFIGURATION_ERROR'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'INVALID_GENERATION';

export type GenerationError = {
  error: {
    code: GenerationErrorCode;
    message: string;
    retryAfterSeconds?: number;
  };
};

export type GenerateResponse = GenerateSuccess | GenerationError;

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error';

export type ValidationIssue = {
  field: string;
  message: string;
};

export type RequestValidationResult =
  | {
      valid: true;
      data: GenerateRequest;
    }
  | {
      valid: false;
      issues: ValidationIssue[];
    };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFieldType(value: unknown): value is FieldType {
  return typeof value === 'string' && FIELD_TYPES.includes(value as FieldType);
}

function getRequestSizeIssue(value: unknown): ValidationIssue | undefined {
  try {
    const encodedRequest = new TextEncoder().encode(JSON.stringify(value));

    if (encodedRequest.byteLength > REQUEST_LIMITS.maxRequestBytes) {
      return {
        field: 'request',
        message: `Request must be at most ${REQUEST_LIMITS.maxRequestBytes} bytes.`,
      };
    }
  } catch {
    return {
      field: 'request',
      message: 'Request must be serializable as JSON.',
    };
  }

  return undefined;
}

function validateField(
  value: unknown,
  index: number,
  names: Set<string>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fieldPath = `fields[${index}]`;

  if (!isRecord(value)) {
    return [{ field: fieldPath, message: 'Field must be an object.' }];
  }

  const { guidance, name, nullable, type } = value;

  if (typeof name !== 'string') {
    issues.push({ field: `${fieldPath}.name`, message: 'Field name must be a string.' });
  } else {
    if (name.length === 0 || name.length > REQUEST_LIMITS.fieldNameMaxLength) {
      issues.push({
        field: `${fieldPath}.name`,
        message: `Field name must be 1–${REQUEST_LIMITS.fieldNameMaxLength} characters.`,
      });
    }

    if (!fieldNamePattern.test(name)) {
      issues.push({
        field: `${fieldPath}.name`,
        message: 'Field name must start with a letter and contain only letters, numbers, or underscores.',
      });
    }

    if (names.has(name)) {
      issues.push({ field: `${fieldPath}.name`, message: 'Field names must be unique.' });
    } else {
      names.add(name);
    }
  }

  if (!isFieldType(type)) {
    issues.push({
      field: `${fieldPath}.type`,
      message: 'Field type must be string, number, integer, or boolean.',
    });
  }

  if (typeof nullable !== 'boolean') {
    issues.push({
      field: `${fieldPath}.nullable`,
      message: 'Field nullability must be true or false.',
    });
  }

  if (guidance !== undefined) {
    if (typeof guidance !== 'string') {
      issues.push({
        field: `${fieldPath}.guidance`,
        message: 'Field guidance must be a string.',
      });
    } else if (guidance.length > REQUEST_LIMITS.fieldGuidanceMaxLength) {
      issues.push({
        field: `${fieldPath}.guidance`,
        message: `Field guidance must be at most ${REQUEST_LIMITS.fieldGuidanceMaxLength} characters.`,
      });
    }
  }

  return issues;
}

export function validateGenerateRequest(value: unknown): RequestValidationResult {
  const issues: ValidationIssue[] = [];
  const requestSizeIssue = getRequestSizeIssue(value);

  if (requestSizeIssue) {
    issues.push(requestSizeIssue);
  }

  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [...issues, { field: 'request', message: 'Request must be an object.' }],
    };
  }

  const { count, description, fields } = value;

  if (typeof description !== 'string') {
    issues.push({ field: 'description', message: 'Description must be a string.' });
  } else {
    if (description.trim().length === 0) {
      issues.push({ field: 'description', message: 'Description is required.' });
    }

    if (description.length > REQUEST_LIMITS.descriptionMaxLength) {
      issues.push({
        field: 'description',
        message: `Description must be at most ${REQUEST_LIMITS.descriptionMaxLength} characters.`,
      });
    }
  }

  if (
    typeof count !== 'number' ||
    !Number.isInteger(count) ||
    count < REQUEST_LIMITS.recordsMinCount ||
    count > REQUEST_LIMITS.recordsMaxCount
  ) {
    issues.push({
      field: 'count',
      message: `Record count must be a whole number from ${REQUEST_LIMITS.recordsMinCount} to ${REQUEST_LIMITS.recordsMaxCount}.`,
    });
  }

  if (!Array.isArray(fields)) {
    issues.push({ field: 'fields', message: 'Fields must be an array.' });
  } else {
    if (
      fields.length < REQUEST_LIMITS.fieldsMinCount ||
      fields.length > REQUEST_LIMITS.fieldsMaxCount
    ) {
      issues.push({
        field: 'fields',
        message: `Provide ${REQUEST_LIMITS.fieldsMinCount}–${REQUEST_LIMITS.fieldsMaxCount} fields.`,
      });
    }

    const names = new Set<string>();

    fields.forEach((field, index) => {
      issues.push(...validateField(field, index, names));
    });
  }

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  return { valid: true, data: value as GenerateRequest };
}
