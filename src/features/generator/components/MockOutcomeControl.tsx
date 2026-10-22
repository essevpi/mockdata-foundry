import { MOCK_OUTCOMES, type MockOutcome } from '../../../lib/mock-generator';

type MockOutcomeControlProps = {
  outcome: MockOutcome;
  onChange: (outcome: MockOutcome) => void;
};

function MockOutcomeControl({ outcome, onChange }: MockOutcomeControlProps) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-content-muted">
      <label htmlFor="mock-outcome" className="font-medium text-content">
        Dev only: mock outcome
      </label>
      <select
        id="mock-outcome"
        value={outcome}
        onChange={(event) => onChange(event.target.value as MockOutcome)}
        className="ml-2 rounded border border-border bg-input px-2 py-1 text-xs text-content outline-none focus:border-focus"
      >
        {MOCK_OUTCOMES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export { MockOutcomeControl };
