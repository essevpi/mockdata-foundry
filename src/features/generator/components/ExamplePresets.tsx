import { IdCard, ShoppingCart, Users, type LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { PRESETS, type Preset, type PresetId } from '../presets';

const PRESET_ICONS: Record<PresetId, LucideIcon> = {
  customers: Users,
  orders: ShoppingCart,
  employees: IdCard,
};

type ExamplePresetsProps = {
  onApply: (preset: Preset) => void;
};

// A secondary shortcut under the description box, shown only while the form is blank. It collapses
// in height when it leaves, which only moves the content below the description being edited.
function ExamplePresets({ onApply }: ExamplePresetsProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ height: 'auto', opacity: 1 }}
      className="overflow-hidden"
      exit={{ height: 0, opacity: 0 }}
      initial={{ height: 0, opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
    >
      <div
        aria-labelledby="example-presets-label"
        className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-3"
        role="group"
      >
        <p id="example-presets-label" className="text-xs text-content-muted">
          Not sure what to write? Try an example:
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const Icon = PRESET_ICONS[preset.id];

            return (
              <button
                key={preset.id}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-button px-2.5 text-sm! font-medium text-content transition hover:bg-action/15 hover:text-action"
                onClick={() => onApply(preset)}
                type="button"
              >
                <Icon aria-hidden="true" className="size-3.5" />
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export { ExamplePresets };
