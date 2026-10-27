import { TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Fragment, type ReactNode } from 'react';
import type { ValidationIssue } from '../../../lib/generation';
import {
  FIELD_PROBLEMS_ID,
  getFieldInputId,
  type FieldDraft,
  type FieldProblem,
} from '../field-utils';

type ProblemTrayProps = {
  fields: FieldDraft[];
  // Problems about the list or request as a whole, such as the field count.
  generalIssues: ValidationIssue[];
  problems: FieldProblem[];
};

function FieldReferences({
  fieldNumbers,
  fields,
}: {
  fieldNumbers: number[];
  fields: FieldDraft[];
}) {
  return fieldNumbers.map((fieldNumber, position) => {
    const field = fields[fieldNumber - 1];
    const separator =
      position === 0 ? '' : position === fieldNumbers.length - 1 ? ' and ' : ', ';

    return (
      <Fragment key={fieldNumber}>
        {separator}
        <button
          className="font-semibold underline underline-offset-2 hover:text-content"
          onClick={() => {
            if (field) {
              document.getElementById(getFieldInputId(field.id, 'name'))?.focus();
            }
          }}
          type="button"
        >
          Field {fieldNumber}
        </button>
      </Fragment>
    );
  });
}

// Everything wrong in the field list, in full, sliding up from behind the command bar while there
// is a problem. It floats over the bottom of the pane instead of resizing anything, so no rows
// move. Each field a problem names is a button that jumps to that row. The live region stays
// mounted so new problems are announced.
function ProblemTray({ fields, generalIssues, problems }: ProblemTrayProps) {
  const visible = generalIssues.length > 0 || problems.length > 0;
  const entries: Array<{ key: string; content: ReactNode }> = [
    ...generalIssues.map((issue) => ({ key: issue.message, content: issue.message })),
    ...problems.map((problem) => ({
      key: problem.message,
      content: (
        <>
          {problem.message.replace(/\.$/, '')} (
          <FieldReferences fieldNumbers={problem.fieldNumbers} fields={fields} />
          ).
        </>
      ),
    })),
  ];

  return (
    <div aria-live="polite" className="absolute inset-x-0 bottom-full z-0" id={FIELD_PROBLEMS_ID}>
      <AnimatePresence>
        {visible && (
          <motion.div
            key="tray"
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-t-xl border border-b-0 border-danger/50 bg-[color-mix(in_srgb,var(--theme-danger)_8%,var(--theme-surface))] px-4 py-3 text-xs leading-5 text-danger shadow-[0_-8px_16px_-10px_var(--theme-shadow)] sm:px-6"
            exit={{ opacity: 0, y: '100%' }}
            initial={{ opacity: 0, y: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <ul className="max-h-24 min-w-0 flex-1 space-y-1 overflow-y-auto">
              {entries.map((entry) => (
                <li key={entry.key}>{entry.content}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { ProblemTray };
