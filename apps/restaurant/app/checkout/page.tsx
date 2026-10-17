"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart, type CartLine } from "@/components/CartProvider";
import { useMenu } from "@/lib/useMenu";
import { formatPrice, type CreatedOrder } from "@/lib/api";
import CheckoutForm from "@/components/CheckoutForm";
import { Loader, LoadingState } from "@/components/Loader";

export default function CheckoutPage() {
  const cart = useCart();
  const { menu, loading, error, retry } = useMenu();
  const [completedOrder, setCompletedOrder] = useState<CreatedOrder | null>(null);
  if (loading) return <main className="page-shell" aria-busy="true"><LoadingState label="Loading checkout" className="checkout-loading"><div className="checkout-loading-content" aria-hidden="true"><div className="skeleton-heading"><Loader size="sm"/><span className="restaurant-skeleton skeleton-food-title"/><span className="restaurant-skeleton skeleton-food-description"/></div><div className="checkout-layout"><div className="panel-card"><span className="restaurant-skeleton skeleton-food-title"/><span className="restaurant-skeleton skeleton-summary-line"/><span className="restaurant-skeleton skeleton-summary-line"/><span className="restaurant-skeleton skeleton-total"/></div><div className="panel-card"><span className="restaurant-skeleton skeleton-food-title"/><span className="restaurant-skeleton skeleton-food-description"/><span className="restaurant-skeleton skeleton-food-description"/><span className="restaurant-skeleton skeleton-food-action"/></div></div></div></LoadingState></main>;
  if (error || !menu) return <main className="page-shell"><div className="service-error" role="alert"><p>Checkout is unavailable because the menu could not load.</p><button className="retry-button" type="button" onClick={retry}>Try again</button></div></main>;
  if (completedOrder) return <main className="page-shell confirmation-shell"><section className="status-card" role="status"><span className="confirmation-mark" aria-hidden="true">✓</span><p className="eyebrow">ORDER PLACED</p><h1>Thank you for your order.</h1><p className="confirmation-lead">Order #{completedOrder.id} is Pending. You can follow its progress here.</p><div className="confirmation-summary"><span>Items</span><strong>{completedOrder.items_count}</strong><span>Total</span><strong>{formatPrice(completedOrder.amount, completedOrder.currency)}</strong></div><Link href={`/order/${completedOrder.id}`} className="button">Track your order</Link></section></main>;
  const lines = cart.items.flatMap((line: CartLine) => {
    const item = menu.items.find((product) => product.id === line.item_id);
    return item ? [{ item, quantity: line.quantity }] : [];
  });
  if (lines.length === 0) return <main className="page-shell"><section className="empty-state"><h1>Nothing to check out yet</h1><Link className="button" href="/menu">Browse the menu</Link></section></main>;
  return <main className="page-shell"><div className="section-heading"><div><p className="eyebrow">ALMOST THERE</p><h1>Checkout</h1><p>Review your order and place it for pickup.</p></div><Link className="text-link" href="/cart">← Edit cart</Link></div><CheckoutForm items={lines} currency={menu.currency} onSuccess={(order) => { setCompletedOrder(order); cart.clear(); }} /></main>;
}
