import { GeneratorWorkspace } from './features/generator/components/GeneratorWorkspace';

function App() {
  return (
    <main className="min-h-screen bg-app px-4 py-6 text-content sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex items-center gap-3 sm:mb-14">
          <div
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-xl bg-action text-lg font-black text-action-foreground shadow-lg shadow-action/15"
          >
            M
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-content">MockData Foundry</p>
            <p className="text-xs text-content-muted">Structured mock-data generator</p>
          </div>
        </header>

        <section className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-action-hover">
            New dataset
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-content sm:text-5xl">
            Shape realistic data for your next build.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-content-muted">
            Describe the records you need, set their shape, and generate a clean sample when
            you&apos;re ready.
          </p>
        </section>

        <GeneratorWorkspace />
      </div>
    </main>
  );
}

export default App;
