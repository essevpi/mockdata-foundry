import { describe, expect, it } from 'vitest';
import { REQUEST_LIMITS, validateGenerateRequest } from '../../lib/generation';
import { buildGenerateRequest, createFieldDraftFromDefinition } from './field-utils';
import { PRESETS } from './presets';

describe('PRESETS', () => {
  it('has unique ids and labels', () => {
    expect(new Set(PRESETS.map((preset) => preset.id)).size).toBe(PRESETS.length);
    expect(new Set(PRESETS.map((preset) => preset.label)).size).toBe(PRESETS.length);
  });

  it.each(PRESETS)('$label builds a valid request', (preset) => {
    const fields = preset.fields.map(createFieldDraftFromDefinition);
    const result = validateGenerateRequest(
      buildGenerateRequest(preset.description, preset.recordCount, fields),
    );

    expect(result).toEqual({ valid: true, data: expect.any(Object) });
  });

  it.each(PRESETS)('$label mixes nullable fields, guidance and several types', (preset) => {
    expect(preset.fields.length).toBeGreaterThanOrEqual(5);
    expect(preset.fields.length).toBeLessThanOrEqual(REQUEST_LIMITS.fieldsMaxCount);
    expect(preset.fields.some((field) => field.nullable)).toBe(true);
    expect(preset.fields.some((field) => field.guidance)).toBe(true);
    expect(new Set(preset.fields.map((field) => field.type)).size).toBeGreaterThanOrEqual(3);
  });
});
