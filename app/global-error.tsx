"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#07070a", color: "#fafafa" }}>
        <div style={{ display: "flex", minHeight: "100dvh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 48 }}>😵</div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>This page couldn&apos;t load</h2>
          <p style={{ fontSize: 14, color: "#a1a1aa", maxWidth: 360 }}>
            Something went wrong. Reload to try again, or head back home.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={reset}
              style={{
                padding: "10px 24px",
                borderRadius: 12,
                background: "#818cf8",
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
                background: "rgba(255,255,255,0.06)",
                color: "#fafafa",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Back
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
