import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { parseTheme, readStoredTheme, storeTheme, type Theme } from './theme-utils';

function getStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function ThemeToggle() {
  // The inline script in index.html has already applied the stored theme before first paint.
  const [theme, setTheme] = useState<Theme>(() =>
    parseTheme(document.documentElement.dataset.theme ?? readStoredTheme(getStorage())),
  );
  const isLight = theme === 'light';

  function toggleTheme() {
    const nextTheme: Theme = isLight ? 'dark' : 'light';

    document.documentElement.dataset.theme = nextTheme;
    storeTheme(getStorage(), nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      aria-label="Light theme"
      aria-pressed={isLight}
      className="grid size-10 place-items-center rounded-lg border border-border-strong bg-surface-raised text-content transition hover:border-action hover:text-action"
      onClick={toggleTheme}
      title={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      type="button"
    >
      {isLight ? <Sun aria-hidden="true" className="size-5" /> : <Moon aria-hidden="true" className="size-5" />}
    </button>
  );
}

export { ThemeToggle };
