import { MOCK_OUTCOMES, type MockOutcome } from '../../../lib/mock-generator';

type MockOutcomeControlProps = {
  outcome: MockOutcome;
  onChange: (outcome: MockOutcome) => void;
};

function MockOutcomeControl({ outcome, onChange }: MockOutcomeControlProps) {
  return (
    <div className="flex flex-col gap-1.5 text-xs text-content-muted">
      <label htmlFor="mock-outcome" className="font-medium text-content">
        Mock outcome
      </label>
      <select
        id="mock-outcome"
        value={outcome}
        onChange={(event) => onChange(event.target.value as MockOutcome)}
        className="w-full rounded border border-border-strong bg-input px-2 py-1 text-xs! text-content"
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
