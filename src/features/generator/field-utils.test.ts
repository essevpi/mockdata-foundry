import { describe, expect, it } from 'vitest';
import {
  buildGenerateRequest,
  ADD_FIELD_BUTTON_ID,
  createFieldDraft,
  getFieldInputId,
  getFocusTargetIdAfterRemoval,
  getNextFieldName,
  getVisibleIssues,
  type FieldDraft,
  type TouchedSection,
} from './field-utils';

describe('createFieldDraft', () => {
  it('creates unique ids and unused default names', () => {
    const first = createFieldDraft([]);
    const second = createFieldDraft([first]);

    expect(first.id).not.toBe(second.id);
    expect([first.name, second.name]).toEqual(['field1', 'field2']);
  });
});

describe('getNextFieldName', () => {
  it('skips names that are already taken', () => {
    const fields = [{ name: 'field2', type: 'string' as const, nullable: false }];

    expect(getNextFieldName(fields)).toBe('field3');
  });
});

describe('buildGenerateRequest', () => {
  it('strips client ids and omits empty guidance', () => {
    const fields: FieldDraft[] = [
      { id: 'a', name: 'email', type: 'string', nullable: true, guidance: '' },
      { id: 'b', name: 'age', type: 'integer', nullable: false, guidance: 'adults only' },
    ];

    expect(buildGenerateRequest('Users', '5', fields)).toEqual({
      description: 'Users',
      count: 5,
      fields: [
        { name: 'email', type: 'string', nullable: true },
        { name: 'age', type: 'integer', nullable: false, guidance: 'adults only' },
      ],
    });
  });

  it('turns a blank record count into an invalid number', () => {
    expect(buildGenerateRequest('Users', '', []).count).toBe(0);
  });
});

describe('getVisibleIssues', () => {
  const issues = [
    { field: 'description', message: 'd' },
    { field: 'count', message: 'c' },
    { field: 'fields', message: 'f' },
    { field: 'fields[0].name', message: 'n' },
    { field: 'request', message: 'r' },
  ];

  function visibleFor(...sections: TouchedSection[]) {
    return getVisibleIssues(issues, new Set(sections)).map((issue) => issue.field);
  }

  it('hides section issues until the section is touched', () => {
    expect(visibleFor()).toEqual(['request']);
    expect(visibleFor('description')).toEqual(['description', 'request']);
    expect(visibleFor('fields')).toEqual(['fields', 'fields[0].name', 'request']);
    expect(visibleFor('count', 'description', 'fields')).toHaveLength(5);
  });
});

describe('getFocusTargetIdAfterRemoval', () => {
  const fields: FieldDraft[] = ['a', 'b', 'c'].map((id) => ({
    id,
    name: id,
    type: 'string',
    nullable: false,
  }));

  it('prefers the next row, then the previous row, then the add button', () => {
    expect(getFocusTargetIdAfterRemoval(fields, 0)).toBe(getFieldInputId('b', 'name'));
    expect(getFocusTargetIdAfterRemoval(fields, 2)).toBe(getFieldInputId('b', 'name'));
    expect(getFocusTargetIdAfterRemoval(fields.slice(0, 1), 0)).toBe(ADD_FIELD_BUTTON_ID);
  });
});
