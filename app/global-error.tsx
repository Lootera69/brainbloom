"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#f4f2f8",
          color: "#1a1a2e",
          display: "flex",
          minHeight: "100dvh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48 }}>😵</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>
          This page couldn&apos;t load
        </h2>
        <p style={{ fontSize: 14, color: "#7a7596", maxWidth: 360 }}>
          Something went wrong. Reload to try again, or head back home.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={reset}
            style={{
              padding: "10px 24px",
              borderRadius: 12,
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          <a
            href="/"
            style={{
              padding: "10px 24px",
              borderRadius: 12,
              background: "#eae7f2",
              color: "#1a1a2e",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Back
          </a>
        </div>
      </body>
    </html>
  );
}
