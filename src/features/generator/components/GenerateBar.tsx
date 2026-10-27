import type { ValidationIssue } from '../../../lib/generation';
import type { MockOutcome } from '../../../lib/mock-generator';
import { MockOutcomeControl } from './MockOutcomeControl';
import { PourLine } from './PourLine';

type GenerateBarProps = {
  isLoading: boolean;
  isValid: boolean;
  mockOutcome: MockOutcome;
  requestIssues: ValidationIssue[];
  onMockOutcomeChange: (outcome: MockOutcome) => void;
};

function GenerateBar({
  isLoading,
  isValid,
  mockOutcome,
  requestIssues,
  onMockOutcomeChange,
}: GenerateBarProps) {
  return (
    <div className="sticky bottom-0 z-30 order-last border-t border-border-strong bg-surface px-4 py-3 sm:px-6 lg:static lg:order-none">
      <PourLine active={isLoading} axis="x" className="inset-x-0 top-0 h-0.5 lg:hidden" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-nowrap">
        <div className="order-2 flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 sm:order-1">
          {!isValid && (
            <p id="generate-hint" className="text-xs leading-5 text-content-muted">
              Add a description and a valid field.
            </p>
          )}
          {import.meta.env.DEV && (
            <MockOutcomeControl outcome={mockOutcome} onChange={onMockOutcomeChange} />
          )}
        </div>
        <button
          aria-describedby={isValid ? undefined : 'generate-hint'}
          className="order-1 w-full rounded-xl bg-action px-4 py-3 text-sm font-semibold text-action-foreground transition hover:bg-action-hover disabled:cursor-not-allowed disabled:border disabled:border-border disabled:bg-surface-raised disabled:text-content-muted sm:order-2 sm:w-auto sm:px-8"
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
