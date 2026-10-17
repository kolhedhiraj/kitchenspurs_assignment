"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_URL, formatPrice, type RestaurantOrder, type OrderStatus } from "@/lib/api";
import { LoadingState, Loader } from "@/components/Loader";

const steps: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Order placed" }, { status: "confirmed", label: "Confirmed" },
  { status: "preparing", label: "Preparing" }, { status: "out_for_delivery", label: "Out for delivery" },
  { status: "delivered", label: "Delivered" },
];

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<RestaurantOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/orders/${encodeURIComponent(id)}`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 404 ? "We could not find this order." : "Unable to load order status. Please try again.");
      const body = await response.json() as { order: RestaurantOrder };
      setOrder(body.order); setError(null);
    } catch (reason) {
      if (reason instanceof Error && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "Unable to load order status.");
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  useEffect(() => {
    if (!order || ["delivered", "cancelled"].includes(order.status)) return;
    const timer = window.setInterval(() => { void load(); }, 7000);
    return () => window.clearInterval(timer);
  }, [order, load]);

  if (loading) return <main className="page-shell"><LoadingState label="Loading order status"><div className="order-loading"><Loader size="sm"/><span>Finding your order…</span></div></LoadingState></main>;
  if (error || !order) return <main className="page-shell"><section className="service-error" role="alert"><p>{error ?? "Unable to load this order."}</p><button className="retry-button" onClick={() => { setLoading(true); void load(); }}>Try again</button></section></main>;
  const currentIndex = steps.findIndex((step) => step.status === order.status);
  return <main className="page-shell order-status-shell"><div className="section-heading"><div><p className="eyebrow">ORDER TRACKING</p><h1>Order #{order.id}</h1><p>Placed {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></div><span className={`order-status-badge ${order.status}`}>{order.status_label}</span></div>
    <section className="order-status-card"><h2>Your order is {order.status_label.toLowerCase()}</h2><ol className="order-timeline" aria-label="Order status timeline">{steps.map((step, index) => { const done = order.status === "delivered" || (order.status !== "cancelled" && index < currentIndex); const current = step.status === order.status; return <li className={`${done ? "done" : ""} ${current ? "current" : ""}`} key={step.status}><span className="timeline-dot" aria-hidden="true">{done ? "✓" : ""}</span><span>{step.label}</span></li>; })}</ol>{order.status === "cancelled" && <p className="form-error">This order was cancelled.</p>}<p className="order-refresh-note">Status refreshes automatically while your order is in progress.</p></section>
    <section className="panel-card order-items-card"><h2>Order details</h2>{order.items.map((item) => <div className="summary-line" key={item.item_id}><span>{item.name} × {item.quantity}</span><strong>{formatPrice(item.line_total, order.currency)}</strong></div>)}<div className="summary-line total-line"><span>Total · {order.currency}</span><strong>{formatPrice(order.amount, order.currency)}</strong></div></section><Link href="/menu" className="text-link">← Back to the menu</Link></main>;
}
