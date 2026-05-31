'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main style={{ minHeight: '100vh', background: '#030712', color: '#e2e8f0', padding: 24 }}>
          <section style={{ maxWidth: 640 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>SEO Intelligence could not render.</h1>
            <p style={{ marginTop: 12, color: '#94a3b8' }}>{error.message}</p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 20,
                borderRadius: 8,
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#f8fafc',
                padding: '10px 14px',
              }}
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
