"use client";

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="error-screen">
          <div className="error-screen__content">
            <h1>The local console could not render.</h1>
            <p>The provider harness was not invoked. Retry the interface before starting a new run.</p>
            <button type="button" onClick={retry}>Reload Rockbot</button>
          </div>
        </main>
      </body>
    </html>
  );
}
