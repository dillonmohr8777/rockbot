"use client";

export default function ErrorBoundary({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="error-screen">
      <div className="error-screen__content">
        <h1>Rockbot hit an unexpected boundary.</h1>
        <p>No run was promoted to complete. Retry the local view, then inspect the runtime if the problem returns.</p>
        <button type="button" onClick={retry}>Try again</button>
      </div>
    </main>
  );
}
