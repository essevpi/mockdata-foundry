import { ThemeToggle } from './features/theme/ThemeToggle';
import { GeneratorWorkspace } from './features/generator/components/GeneratorWorkspace';

function App() {
  return (
    <div className="relative flex min-h-svh flex-col bg-app text-content lg:h-svh lg:overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border-strong px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-lg bg-action text-base font-black text-action-foreground"
          >
            M
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-content">MockData Foundry</h1>
            <p className="hidden text-xs text-content-muted sm:block">
              Describe a dataset, shape its records, export JSON or CSV.
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex min-w-0 flex-1 flex-col lg:min-h-0">
        <GeneratorWorkspace />
      </main>
    </div>
  );
}

export default App;
