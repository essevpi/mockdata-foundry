import { MOCK_OUTCOMES, type MockOutcome } from '../../../lib/mock-generator';

type MockOutcomeControlProps = {
  outcome: MockOutcome;
  onChange: (outcome: MockOutcome) => void;
};

function MockOutcomeControl({ outcome, onChange }: MockOutcomeControlProps) {
  return (
    <div title="Mock outcome (development only)" className="flex items-center gap-2 text-xs text-content-muted">
      <label htmlFor="mock-outcome" className="font-medium text-content">
        Mock
      </label>
      <select
        id="mock-outcome"
        value={outcome}
        onChange={(event) => onChange(event.target.value as MockOutcome)}
        className="rounded border border-border-strong bg-input px-2 py-1 text-xs! text-content"
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
