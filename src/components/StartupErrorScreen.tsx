type KV = { label: string; value?: string };


function maskValue(value: string | undefined) {
  if (!value) return "(missing)";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export function StartupErrorScreen(props: {
  title: string;
  description: string;
  items?: KV[];
  error?: unknown;
  onRetry?: () => void;
}) {
  const { title, description, items, error, onRetry } = props;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <p className="text-sm text-muted-foreground">Startup check</p>
          <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-medium">Detected configuration</h2>

          <dl className="mt-4 grid gap-3">
            {(items ?? []).map((it) => (
              <div
                key={it.label}
                className="flex flex-col gap-1 rounded-md border border-border/60 bg-background/40 p-3"
              >
                <dt className="text-xs text-muted-foreground">{it.label}</dt>
                <dd className="font-mono text-xs">{maskValue(it.value)}</dd>
              </div>
            ))}
          </dl>

          {error ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Technical details
              </summary>
              <pre className="mt-3 overflow-auto rounded-md border border-border/60 bg-background/40 p-3 text-xs">
                {String((error as any)?.stack || (error as any)?.message || error)}
              </pre>
            </details>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
            >
              Reload
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Go to home
            </a>
          </div>
        </section>

        <aside className="mt-6 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-medium">What this means</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This app needs backend configuration injected into the frontend build.
            When those values are missing, the generated client crashes during
            startup.
          </p>
        </aside>
      </main>
    </div>
  );
}
