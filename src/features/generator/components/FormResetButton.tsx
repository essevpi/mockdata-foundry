import { Eraser, Undo2 } from 'lucide-react';
import { FORM_RESET_BUTTON_ID } from '../field-utils';

type FormResetButtonProps = {
  // Polite status text, for example "Form cleared."
  announcement: string;
  canUndo: boolean;
  isBlank: boolean;
  onClear: () => void;
  onUndo: () => void;
};

// "Clear form" while the form has content, "Undo clear" right after clearing. Both states are the
// same button, so keyboard focus stays in place when the form is cleared or restored.
function FormResetButton({ announcement, canUndo, isBlank, onClear, onUndo }: FormResetButtonProps) {
  const mode = !isBlank ? 'clear' : canUndo ? 'undo' : null;

  return (
    <>
      {mode && (
        <button
          aria-label={mode === 'clear' ? 'Clear form' : 'Undo clear'}
          className="-my-0.5 flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border-strong px-2.5 text-sm! font-medium text-content-muted transition hover:bg-action/10 hover:text-content"
          id={FORM_RESET_BUTTON_ID}
          onClick={mode === 'clear' ? onClear : onUndo}
          type="button"
        >
          {mode === 'clear' ? (
            <Eraser aria-hidden="true" className="size-3.5" />
          ) : (
            <Undo2 aria-hidden="true" className="size-3.5" />
          )}
          {/* Shortened on phones so the heading keeps a single line beside the button. */}
          {mode === 'clear' ? 'Clear' : 'Undo'}
          <span className="max-sm:hidden">{mode === 'clear' ? ' form' : ' clear'}</span>
        </button>
      )}
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </>
  );
}

export { FormResetButton };
