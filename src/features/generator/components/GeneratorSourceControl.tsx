import { GENERATOR_SOURCES, type GeneratorSource } from '../../../lib/generate';
import { GENERATOR_SOURCE_LABELS } from '../generator-source';

type GeneratorSourceControlProps = {
  source: GeneratorSource;
  onChange: (source: GeneratorSource) => void;
};

// Native radios, so arrow keys move the choice; styled as a compact segmented control.
function GeneratorSourceControl({ source, onChange }: GeneratorSourceControlProps) {
  return (
    <fieldset className="flex flex-col gap-1.5 text-xs">
      <legend className="mb-1.5 font-medium text-content">Generator</legend>
      <div className="flex rounded-lg border border-border-strong bg-surface-inset p-0.5">
        {GENERATOR_SOURCES.map((option) => (
          <label
            key={option}
            className="flex-1 cursor-pointer rounded-md px-2 py-1 text-center font-medium text-content-muted transition-colors hover:text-content has-checked:bg-surface-raised has-checked:font-semibold has-checked:text-content has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-focus"
          >
            <input
              checked={source === option}
              className="sr-only"
              name="generator-source"
              onChange={() => onChange(option)}
              type="radio"
              value={option}
            />
            {GENERATOR_SOURCE_LABELS[option]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export { GeneratorSourceControl };
