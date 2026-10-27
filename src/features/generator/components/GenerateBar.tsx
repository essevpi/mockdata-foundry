import type { ValidationIssue } from '../../../lib/generation';
import { FIELD_PROBLEMS_ID, type FieldDraft, type FieldProblem } from '../field-utils';
import { FieldProblems } from './FieldProblems';
import { PourLine } from './PourLine';

type GenerateBarProps = {
  fieldIssues: ValidationIssue[];
  fieldProblems: FieldProblem[];
  fields: FieldDraft[];
  isLoading: boolean;
  isValid: boolean;
  requestIssues: ValidationIssue[];
};

function GenerateBar({
  fieldIssues,
  fieldProblems,
  fields,
  isLoading,
  isValid,
  requestIssues,
}: GenerateBarProps) {
  const hasFieldProblems = fieldIssues.length > 0 || fieldProblems.length > 0;

  return (
    <div className="sticky bottom-0 z-30 order-last border-t border-border-strong bg-surface px-4 py-3 sm:px-6 lg:static lg:order-none">
      <PourLine active={isLoading} axis="x" className="inset-x-0 top-0 h-0.5 lg:hidden" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-nowrap">
        <div className="order-2 flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 sm:order-1">
          <FieldProblems fields={fields} generalIssues={fieldIssues} problems={fieldProblems} />
          {!isValid && !hasFieldProblems && (
            <p id="generate-hint" className="text-xs leading-5 text-content-muted">
              Add a description and a valid field.
            </p>
          )}
        </div>
        <button
          aria-describedby={
            isValid ? undefined : hasFieldProblems ? FIELD_PROBLEMS_ID : 'generate-hint'
          }
          className="order-1 w-full rounded-xl bg-action px-4 py-3 text-sm font-semibold text-action-foreground transition hover:bg-action-hover disabled:cursor-not-allowed disabled:border disabled:border-border disabled:bg-button disabled:text-content-muted sm:order-2 sm:w-auto sm:px-8"
          disabled={!isValid || isLoading}
          type="submit"
        >
          {isLoading ? 'Generating…' : 'Generate data'}
        </button>
      </div>
      {requestIssues.map((issue) => (
        <p key={issue.message} className="mt-2 text-xs text-danger">
          {issue.message}
        </p>
      ))}
    </div>
  );
}

export { GenerateBar };
