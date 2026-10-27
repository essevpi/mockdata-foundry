import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';

type SelectFieldProps = ComponentProps<'select'> & {
  wrapperClassName?: string;
};

// A native <select> with the theme's closed-state styling and a chevron. Browsers that support
// `appearance: base-select` also get the styled, animated option list (see .select-field in
// index.css); other browsers keep their own list. Keyboard, typeahead and the mobile picker stay
// native. Give options a `data-glyph` to show a short leading glyph in the styled list.
function SelectField({ children, className = '', wrapperClassName = '', ...selectProps }: SelectFieldProps) {
  return (
    <div className={`select-field relative ${wrapperClassName}`}>
      <select {...selectProps} className={className}>
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="select-field-chevron pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-content-muted"
      />
    </div>
  );
}

export { SelectField };
