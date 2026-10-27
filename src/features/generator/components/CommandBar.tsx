import { Plus } from 'lucide-react';
import { REQUEST_LIMITS, type ValidationIssue } from '../../../lib/generation';
import {
  ADD_FIELD_BUTTON_ID,
  FIELD_PROBLEMS_ID,
  type FieldDraft,
  type FieldProblem,
} from '../field-utils';
import { PourLine } from './PourLine';
import { ProblemTray } from './ProblemTray';

type CommandBarProps = {
  atFieldLimit: boolean;
  fieldIssues: ValidationIssue[];
  fieldProblems: FieldProblem[];
  fields: FieldDraft[];
  isLoading: boolean;
  isValid: boolean;
  requestIssues: ValidationIssue[];
  onAddField: () => void;
};

const GENERATE_HINT_ID = 'generate-hint';
const LIMIT_HINT_ID = 'add-field-limit';
const GENERATE_HINT = 'Add a description and a valid field.';
const LIMIT_HINT = `Field limit reached (${REQUEST_LIMITS.fieldsMaxCount} of ${REQUEST_LIMITS.fieldsMaxCount}).`;

const buttonClassName =
  'flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition';

// The always-visible action bar for the request pane: just Add field and Generate data. Problems
// slide up from behind it in the ProblemTray; the reasons a button is disabled are exposed through
// a tooltip and hidden text.
function CommandBar({
  atFieldLimit,
  fieldIssues,
  fieldProblems,
  fields,
  isLoading,
  isValid,
  requestIssues,
  onAddField,
}: CommandBarProps) {
  const generalIssues = [...fieldIssues, ...requestIssues];
  const hasProblems = generalIssues.length > 0 || fieldProblems.length > 0;
  const showGenerateHint = !isValid && !hasProblems;

  return (
    <div className="sticky bottom-0 z-30 order-last lg:relative lg:order-none">
      <ProblemTray fields={fields} generalIssues={generalIssues} problems={fieldProblems} />
      <div className="relative z-10 border-t border-border-strong bg-surface px-4 py-3 sm:px-6">
        <PourLine active={isLoading} axis="x" className="inset-x-0 top-0 h-0.5 lg:hidden" />
        <div className="flex gap-2">
          <button
            aria-describedby={atFieldLimit ? LIMIT_HINT_ID : undefined}
            className={`${buttonClassName} bg-button text-content hover:bg-action/15 hover:text-action disabled:cursor-not-allowed disabled:text-content-muted/60 disabled:hover:bg-button`}
            disabled={atFieldLimit}
            id={ADD_FIELD_BUTTON_ID}
            onClick={onAddField}
            title={atFieldLimit ? LIMIT_HINT : undefined}
            type="button"
          >
            Add field
            <Plus aria-hidden="true" className="size-4" />
          </button>
          <button
            aria-describedby={
              isValid ? undefined : hasProblems ? FIELD_PROBLEMS_ID : GENERATE_HINT_ID
            }
            className={`${buttonClassName} bg-action text-action-foreground hover:bg-action-hover disabled:cursor-not-allowed disabled:bg-button disabled:text-content-muted`}
            disabled={!isValid || isLoading}
            title={showGenerateHint ? GENERATE_HINT : undefined}
            type="submit"
          >
            {isLoading ? 'Generating…' : 'Generate data'}
          </button>
        </div>
        {atFieldLimit && (
          <span className="sr-only" id={LIMIT_HINT_ID}>
            {LIMIT_HINT}
          </span>
        )}
        {showGenerateHint && (
          <span className="sr-only" id={GENERATE_HINT_ID}>
            {GENERATE_HINT}
          </span>
        )}
      </div>
    </div>
  );
}

export { CommandBar };
