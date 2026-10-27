import { TriangleAlert } from 'lucide-react';
import { Fragment } from 'react';
import type { ValidationIssue } from '../../../lib/generation';
import { FIELD_PROBLEMS_ID, getFieldInputId, type FieldDraft, type FieldProblem } from '../field-utils';

type FieldProblemsProps = {
  fields: FieldDraft[];
  // Problems about the list as a whole, such as the field count.
  generalIssues: ValidationIssue[];
  problems: FieldProblem[];
};

function FieldReferences({ fieldNumbers, fields }: { fieldNumbers: number[]; fields: FieldDraft[] }) {
  return fieldNumbers.map((fieldNumber, position) => {
    const field = fields[fieldNumber - 1];
    const separator =
      position === 0 ? '' : position === fieldNumbers.length - 1 ? ' and ' : ', ';

    return (
      <Fragment key={fieldNumber}>
        {separator}
        <button
          className="font-semibold underline underline-offset-2 hover:text-content"
          onClick={() =>
            field && document.getElementById(getFieldInputId(field.id, 'name'))?.focus()
          }
          type="button"
        >
          Field {fieldNumber}
        </button>
      </Fragment>
    );
  });
}

// One shared message for everything wrong in the field list, shown in the Generate bar so it is
// always on screen. Each field it names is a button that jumps to that row. The live region stays
// mounted (and collapses when empty) so new problems are announced.
function FieldProblems({ fields, generalIssues, problems }: FieldProblemsProps) {
  const hasProblems = generalIssues.length > 0 || problems.length > 0;

  return (
    <div
      aria-live="polite"
      className="min-w-0 empty:hidden"
      id={FIELD_PROBLEMS_ID}
    >
      {hasProblems && (
        <div className="flex max-h-20 gap-2 overflow-y-auto text-xs leading-5 text-danger">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <ul className="min-w-0 space-y-0.5">
            {generalIssues.map((issue) => (
              <li key={issue.message}>{issue.message}</li>
            ))}
            {problems.map((problem) => (
              <li key={problem.message}>
                {problem.message.replace(/\.$/, '')} (
                <FieldReferences fieldNumbers={problem.fieldNumbers} fields={fields} />
                ).
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export { FieldProblems };
