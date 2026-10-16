"use client";

import { useEffect, useRef, useState } from "react";
import { API_URL, formatPrice, type CheckoutItem, type CreatedOrder } from "@/lib/api";
import { track } from "@/lib/analytics";
import { Loader } from "@/components/Loader";

export default function CheckoutForm({ items, currency, onSuccess }: { items: CheckoutItem[]; currency: string; onSuccess(order: CreatedOrder): void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkoutTracked = useRef(false);
  const total = items.reduce((sum, line) => sum + line.item.price * line.quantity, 0);

  useEffect(() => {
    if (!checkoutTracked.current) {
      checkoutTracked.current = true;
      track("checkout_started", { amount: total, currency, items_count: items.reduce((count, line) => count + line.quantity, 0) });
    }
  }, [currency, items, total]);

  async function placeOrder() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ items: items.map(({ item, quantity }) => ({ item_id: item.id, quantity })) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "We could not place your order. Please try again.");
      onSuccess(body.order as CreatedOrder);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not place your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <section className="checkout-layout">
    <div className="panel-card"><h2>Order summary</h2>{items.map(({ item, quantity }) => <div className="summary-line" key={item.id}><span>{item.name} × {quantity}</span><strong>{formatPrice(item.price * quantity, currency)}</strong></div>)}<div className="summary-line total-line"><span>Total · {currency}</span><strong>{formatPrice(total, currency)}</strong></div><p className="checkout-price-note">The server confirms prices and the final total when the order is placed.</p></div>
    <div className="panel-card pickup-card"><p className="eyebrow">PICKUP ORDER</p><h2>Ready when you are</h2><p>No payment details are collected in this demo. Place your order to record it for pickup.</p>{error && <p className="form-error" role="alert">{error}</p>}<button type="button" className="button" onClick={placeOrder} disabled={submitting} aria-busy={submitting}>{submitting ? <><Loader size="sm"/><span>Placing order…</span></> : "Place order"}</button></div>
  </section>;
}
