"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface StockEntry { warehouseId: string; warehouseName: string; warehouseLocation: string; total: number; reserved: number; available: number; }
interface Product { id: string; name: string; description: string | null; imageUrl: string | null; stocks: StockEntry[]; }

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, { warehouseId: string; quantity: number }>>({});

  useEffect(() => {
    fetch("/api/products").then((r) => r.json()).then((data) => {
      setProducts(data);
      const init: typeof selections = {};
      data.forEach((p: Product) => {
        const first = p.stocks.find((s) => s.available > 0);
        if (first) init[p.id] = { warehouseId: first.warehouseId, quantity: 1 };
      });
      setSelections(init);
      setLoading(false);
    }).catch(() => { setLoading(false); setError("Failed to load products."); });
  }, []);

  async function handleReserve(product: Product) {
    const sel = selections[product.id];
    if (!sel) return;
    setReserving(product.id); setError(null);
    const res = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": `reserve-${product.id}-${Date.now()}` }, body: JSON.stringify({ productId: product.id, warehouseId: sel.warehouseId, quantity: sel.quantity }) });
    const data = await res.json();
    setReserving(null);
    if (res.status === 409) { setError(`Not enough stock: ${data.error}`); return; }
    if (!res.ok) { setError(data.error || "Reservation failed."); return; }
    router.push(`/checkout/${data.id}`);
  }

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "6rem", color: "var(--muted)" }}>Loading products…</div>;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Products</h1>
        <p style={{ color: "var(--muted)", marginTop: "0.4rem", fontFamily: "DM Mono, monospace", fontSize: "0.85rem" }}>Reserve stock · 10-minute hold · Concurrency-safe</p>
      </div>
      {error && <div style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 8, padding: "0.8rem 1rem", marginBottom: "1.5rem", color: "var(--red)", fontSize: "0.9rem" }}>⚠ {error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
        {products.map((product) => {
          const sel = selections[product.id];
          const selectedStock = product.stocks.find((s) => s.warehouseId === sel?.warehouseId);
          const totalAvailable = product.stocks.reduce((a, s) => a + s.available, 0);
          const isReserving = reserving === product.id;
          return (
            <div key={product.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {product.imageUrl && <div style={{ height: 180, overflow: "hidden", background: "var(--surface2)" }}><img src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>}
              <div style={{ padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>{product.name}</h2>
                  {product.description && <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.3rem" }}>{product.description}</p>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {product.stocks.map((s) => (
                    <div key={s.warehouseId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.6rem", borderRadius: 6, background: "var(--surface2)", fontSize: "0.8rem" }}>
                      <span style={{ color: "var(--muted)" }}>{s.warehouseName} <span style={{ opacity: 0.5, fontSize: "0.7rem" }}>({s.warehouseLocation})</span></span>
                      <span style={{ fontFamily: "DM Mono, monospace", fontWeight: 500, color: s.available > 0 ? "var(--green)" : "var(--red)" }}>{s.available > 0 ? `${s.available} avail` : "Out of stock"}</span>
                    </div>
                  ))}
                </div>
                {totalAvailable > 0 && sel ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <select value={sel.warehouseId} onChange={(e) => setSelections((p) => ({ ...p, [product.id]: { ...p[product.id], warehouseId: e.target.value, quantity: 1 } }))} style={{ flex: 1, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.5rem 0.75rem", color: "var(--text)", fontSize: "0.82rem" }}>
                        {product.stocks.filter((s) => s.available > 0).map((s) => <option key={s.warehouseId} value={s.warehouseId}>{s.warehouseName}</option>)}
                      </select>
                      <input type="number" min={1} max={selectedStock?.available ?? 1} value={sel.quantity} onChange={(e) => setSelections((p) => ({ ...p, [product.id]: { ...p[product.id], quantity: Number(e.target.value) } }))} style={{ width: 70, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.5rem", color: "var(--text)", fontSize: "0.82rem", textAlign: "center" }} />
                    </div>
                    <button onClick={() => handleReserve(product)} disabled={isReserving} style={{ background: isReserving ? "var(--border)" : "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "0.65rem", fontWeight: 700, fontSize: "0.88rem", opacity: isReserving ? 0.7 : 1 }}>
                      {isReserving ? "Reserving…" : "Reserve →"}
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: "0.65rem", textAlign: "center", background: "rgba(244,63,94,0.08)", borderRadius: 8, color: "var(--red)", fontSize: "0.85rem", fontWeight: 600 }}>Out of Stock</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
