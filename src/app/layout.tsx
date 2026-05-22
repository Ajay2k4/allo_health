import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Allo Inventory",
  description: "Multi-warehouse inventory & reservation platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)", padding: "0 2rem", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
          <a href="/" style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ width: 28, height: 28, background: "var(--accent)", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800 }}>A</span>
            Allo Inventory
          </a>
          <span style={{ color: "var(--muted)", fontSize: "0.8rem", fontFamily: "DM Mono, monospace" }}>Multi-Warehouse · Race-Condition-Free</span>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
