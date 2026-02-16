"use client";

/**
 * Shown while ExchangeContext is loading accounts (non-auth pages).
 * Keeps layout (sidebar + header) visible and shows a consistent loading state.
 */
export default function AccountsLoadingSkeleton() {
  return (
    <div
      style={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          height: "32px",
          width: "240px",
          backgroundColor: "rgba(255, 174, 0, 0.15)",
          borderRadius: "8px",
        }}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "12px",
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: "80px",
              backgroundColor: "rgba(255, 174, 0, 0.08)",
              borderRadius: "8px",
            }}
          />
        ))}
      </div>
      <div
        style={{
          height: "200px",
          backgroundColor: "rgba(255, 174, 0, 0.06)",
          borderRadius: "8px",
        }}
      />
    </div>
  );
}
