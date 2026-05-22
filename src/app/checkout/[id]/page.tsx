"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Reservation { id: string; productId: string; productName: string; productImage: string | null; warehouseId: string; warehouseName: string; quantity: number; status: "PENDING" | "CONFIRMED" | "RELEASED" | "EXPIRED"; expiresAt: string; createdAt: string; }

function useCountdown(expiresAt: string | null) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => setSecondsLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return secondsLeft;
}

export default function CheckoutPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"confirm" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const secondsLeft = useCountdown(reservation?.status === "PENDING" ? reservation.expiresAt : null);

  const fetchReservation = useCallback(async () => {
    const res = await fetch(`/api/reservations/${params.id}`);
    if (!res.ok) { setError("Reservation not found."); setLoading(false); return; }
    setReservation(await res.json());
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchReservation(); }, [fetchReservation]);
  useEffect(() => { if (secondsLeft === 0 && reservation?.status === "PENDING") { const t = setTimeout(() => fetchReservation(), 1000); return () => clearTimeout(t); } }, [secondsLeft, reservation?.status, fetchReservation]);

  async function handleConfirm() {
    setActionLoading("confirm"); setError(null);
    const res = await fetch(`/api/reservations/${params.id}/confirm`, { method: "POST", headers: { "Idempotency-Key": `confirm-${params.id}-${Date.now()}` } });
    const data = await res.json();
    setActionLoading(null);
    if (res.status === 410) { setError("Your reservation expired. Please go back and reserve again."); await fetchReservation(); return; }
    if (!res.ok) { setError(data.error || "Confirmation failed."); return; }
    await fetchReservation();
  }

  async function handleCancel() {
    setActionLoading("cancel"); setError(null);
    const res = await fetch(`/api/reservations/${params.id}/release`, { method: "POST" });
    setActionLoading(null);
    if (!res.ok) { const data = await res.json(); setError(data.error || "Cancellation failed."); return; }
    await fetchReservation();
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const pct = reservation ? (secondsLeft / (10 * 60)) * 100 : 0;
  const urgency = pct < 20 ? "var(--red)" : pct < 50 ? "var(--amber)" : "var(--green)";

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "6rem", color: "var(--muted)" }}>Loading reservation…</div>;
  if (!reservation) return <div style={{ maxWidth: 600, margin: "4rem auto", padding: "0 1.5rem", textAlign: "center" }}><p style={{ color: "var(--red)" }}>Reservation not found.</p><button onClick={() => router.push("/")} style={{ marginTop: "1.5rem", padding: "0.6rem 1.5rem", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>Back to Products</button></div>;

  const statusConfig = { PENDING: { label: "Reserved – Awaiting Payment", color: "var(--amber)", bg: "rgba(245,158,11,0.1)" }, CONFIRMED: { label: "Purchase Confirmed ✓", color: "var(--green)", bg: "rgba(34,211,165,0.1)" }, RELEASED: { label: "Reservation Cancelled", color: "var(--muted)", bg: "rgba(107,107,136,0.1)" }, EXPIRED: { label: "Reservation Expired", color: "var(--red)", bg: "rgba(244,63,94,0.1)" } }[reservation.status];

  return (
    <div style={{ maxWidth: 620, margin: "2.5rem auto", padding: "0 1.5rem" }}>
      <button onClick={() => router.push("/")} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.5rem", cursor: "pointer" }}>← Back to Products</button>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ background: statusConfig.bg, borderBottom: "1px solid var(--border)", padding: "0.75rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: statusConfig.color, fontWeight: 700, fontSize: "0.9rem" }}>{statusConfig.label}</span>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "var(--muted)" }}>#{reservation.id.slice(-8).toUpperCase()}</span>
        </div>
        <div style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            {reservation.productImage && <img src={reservation.productImage} alt={reservation.productName} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }} />}
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{reservation.productName}</h2>
              <p style={{ color: "var(--muted)", fontSize: "0.83rem", marginTop: "0.3rem" }}>{reservation.warehouseName}</p>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.85rem", marginTop: "0.4rem" }}>Qty: {reservation.quantity}</p>
            </div>
          </div>
          {reservation.status === "PENDING" && (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Hold expires in</span>
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: "1.6rem", fontWeight: 500, color: urgency }}>{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</span>
              </div>
              <div style={{ height: 6, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: urgency, transition: "width 1s linear, background 0.5s", borderRadius: 3 }} />
              </div>
            </div>
          )}
          {error && <div style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--red)", fontSize: "0.85rem" }}>⚠ {error}</div>}
          {reservation.status === "PENDING" && (
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={handleConfirm} disabled={!!actionLoading || secondsLeft === 0} style={{ flex: 1, background: "var(--green)", color: "#0a0a0f", border: "none", borderRadius: 8, padding: "0.75rem", fontWeight: 800, fontSize: "0.9rem", opacity: actionLoading || secondsLeft === 0 ? 0.6 : 1, cursor: actionLoading || secondsLeft === 0 ? "not-allowed" : "pointer" }}>
                {actionLoading === "confirm" ? "Confirming…" : "Confirm Purchase"}
              </button>
              <button onClick={handleCancel} disabled={!!actionLoading} style={{ padding: "0.75rem 1.25rem", background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontWeight: 600, opacity: actionLoading ? 0.6 : 1, cursor: actionLoading ? "not-allowed" : "pointer" }}>
                {actionLoading === "cancel" ? "Cancelling…" : "Cancel"}
              </button>
            </div>
          )}
          {reservation.status === "CONFIRMED" && <div style={{ textAlign: "center", padding: "1rem 0" }}><div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>✅</div><p style={{ color: "var(--green)", fontWeight: 700 }}>Order confirmed! Your stock has been permanently reserved.</p><button onClick={() => router.push("/")} style={{ marginTop: "1.2rem", padding: "0.6rem 1.5rem", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>Shop More</button></div>}
          {(reservation.status === "RELEASED" || reservation.status === "EXPIRED") && <div style={{ textAlign: "center", padding: "1rem 0" }}><div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{reservation.status === "RELEASED" ? "🚫" : "⏰"}</div><p style={{ color: "var(--muted)", fontWeight: 600 }}>{reservation.status === "RELEASED" ? "Reservation cancelled. Stock returned." : "Reservation expired. Stock returned."}</p><button onClick={() => router.push("/")} style={{ marginTop: "1.2rem", padding: "0.6rem 1.5rem", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>Try Again</button></div>}
        </div>
      </div>
    </div>
  );
}
