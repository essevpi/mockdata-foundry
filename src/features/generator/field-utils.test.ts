import { describe, expect, it } from 'vitest';
import {
  buildGenerateRequest,
  ADD_FIELD_BUTTON_ID,
  canStepRecordCount,
  createFieldDraft,
  createFieldDraftFromDefinition,
  formatFieldProblem,
  formatFieldReference,
  formatGenerateShortcut,
  getFieldInputId,
  getFocusTargetIdAfterRemoval,
  getInvalidFieldIndexes,
  getNextFieldName,
  getVisibleIssues,
  isFormBlank,
  isGenerateShortcut,
  stepRecordCount,
  summarizeFieldIssues,
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

describe('createFieldDraftFromDefinition', () => {
  it('keeps the definition and adds an id distinct from other drafts', () => {
    const blank = createFieldDraft([]);
    const draft = createFieldDraftFromDefinition({
      name: 'email',
      type: 'string',
      nullable: true,
      guidance: 'Lowercase',
    });

    expect(draft).toEqual({
      id: expect.any(String),
      name: 'email',
      type: 'string',
      nullable: true,
      guidance: 'Lowercase',
    });
    expect(draft.id).not.toBe(blank.id);
  });
});

describe('isFormBlank', () => {
  const field: FieldDraft = { id: 'a', name: 'email', type: 'string', nullable: false };

  it('is blank with no description text and no fields', () => {
    expect(isFormBlank('', [])).toBe(true);
    expect(isFormBlank('  \n', [])).toBe(true);
  });

  it('is not blank once there is a description or a field', () => {
    expect(isFormBlank('Users', [])).toBe(false);
    expect(isFormBlank('', [field])).toBe(false);
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

describe('stepRecordCount', () => {
  it('adds or subtracts one', () => {
    expect(stepRecordCount('10', 1)).toBe('11');
    expect(stepRecordCount('10', -1)).toBe('9');
  });

  it('clamps to the request limits', () => {
    expect(stepRecordCount('50', 1)).toBe('50');
    expect(stepRecordCount('1', -1)).toBe('1');
    expect(stepRecordCount('200', -1)).toBe('50');
    expect(stepRecordCount('-5', 1)).toBe('1');
  });

  it('steps empty or invalid text to the minimum', () => {
    expect(stepRecordCount('', 1)).toBe('1');
    expect(stepRecordCount('', -1)).toBe('1');
    expect(stepRecordCount('abc', 1)).toBe('1');
  });

  it('steps fractional values to the next whole number', () => {
    expect(stepRecordCount('2.5', 1)).toBe('3');
    expect(stepRecordCount('2.5', -1)).toBe('2');
  });
});

describe('canStepRecordCount', () => {
  it('is false only at the limits', () => {
    expect(canStepRecordCount('1', -1)).toBe(false);
    expect(canStepRecordCount('1', 1)).toBe(true);
    expect(canStepRecordCount('50', 1)).toBe(false);
    expect(canStepRecordCount('50', -1)).toBe(true);
  });

  it('allows stepping from empty or invalid text', () => {
    expect(canStepRecordCount('', 1)).toBe(true);
    expect(canStepRecordCount('abc', -1)).toBe(true);
  });
});

describe('summarizeFieldIssues', () => {
  const duplicate = (index: number) => ({
    field: `fields[${index}].name`,
    message: 'Field names must be unique.',
  });

  it('includes the first field that shares a name, which validation does not flag', () => {
    const fields = [{ name: 'a' }, { name: 'a' }, { name: 'b' }];

    expect(summarizeFieldIssues([duplicate(1)], fields)).toEqual([
      { message: 'Field names must be unique.', fieldNumbers: [1, 2] },
    ]);
  });

  it('lists every field in a group of three duplicates, in order', () => {
    const fields = [{ name: 'a' }, { name: 'a' }, { name: 'a' }];

    expect(summarizeFieldIssues([duplicate(2), duplicate(1)], fields)[0].fieldNumbers).toEqual([
      1, 2, 3,
    ]);
  });

  it('groups different problems separately and ignores non-field issues', () => {
    const fields = [{ name: '1x' }, { name: '' }, { name: 'ok' }];
    const issues = [
      { field: 'description', message: 'Description is required.' },
      { field: 'fields[0].name', message: 'Field name must start with a letter.' },
      { field: 'fields[1].name', message: 'Field name must start with a letter.' },
      { field: 'fields[1].name', message: 'Field name must be 1–40 characters.' },
    ];

    expect(summarizeFieldIssues(issues, fields)).toEqual([
      { message: 'Field name must start with a letter.', fieldNumbers: [1, 2] },
      { message: 'Field name must be 1–40 characters.', fieldNumbers: [2] },
    ]);
  });

  it('returns nothing when there are no field issues', () => {
    expect(summarizeFieldIssues([], [{ name: 'a' }])).toEqual([]);
  });
});

describe('formatFieldReference and formatFieldProblem', () => {
  it('joins field numbers naturally', () => {
    expect(formatFieldReference([3])).toBe('Field 3');
    expect(formatFieldReference([1, 2])).toBe('Field 1 and Field 2');
    expect(formatFieldReference([1, 2, 4])).toBe('Field 1, Field 2 and Field 4');
  });

  it('builds one sentence per problem', () => {
    expect(
      formatFieldProblem({ message: 'Field names must be unique.', fieldNumbers: [1, 2] }),
    ).toBe('Field names must be unique (Field 1 and Field 2).');
  });
});

describe('getInvalidFieldIndexes', () => {
  it('returns zero-based indexes of every named field', () => {
    const problems = [
      { message: 'a', fieldNumbers: [1, 2] },
      { message: 'b', fieldNumbers: [2, 4] },
    ];

    expect([...getInvalidFieldIndexes(problems)].sort()).toEqual([0, 1, 3]);
  });
});

describe('isGenerateShortcut', () => {
  it('accepts Enter with Ctrl or Cmd', () => {
    expect(isGenerateShortcut({ key: 'Enter', ctrlKey: true, metaKey: false })).toBe(true);
    expect(isGenerateShortcut({ key: 'Enter', ctrlKey: false, metaKey: true })).toBe(true);
  });

  it('ignores plain Enter and other keys', () => {
    expect(isGenerateShortcut({ key: 'Enter', ctrlKey: false, metaKey: false })).toBe(false);
    expect(isGenerateShortcut({ key: 'a', ctrlKey: true, metaKey: false })).toBe(false);
  });
});

describe('formatGenerateShortcut', () => {
  it('uses Cmd on Apple devices and Ctrl elsewhere', () => {
    expect(formatGenerateShortcut('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)')).toBe('⌘ Enter');
    expect(formatGenerateShortcut('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('⌘ Enter');
    expect(formatGenerateShortcut('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Ctrl+Enter');
  });
});
