"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { Loader, LoadingState } from "@/components/Loader";
import { useMenu } from "@/lib/useMenu";
import { formatPrice } from "@/lib/api";

export default function CartPage() {
  const cart = useCart();
  const { menu, loading, error, retry } = useMenu();
  if (loading) return <main className="page-shell" aria-busy="true"><LoadingState label="Loading your cart" className="cart-loading"><div className="cart-loading-content" aria-hidden="true"><div className="skeleton-heading"><Loader size="sm"/><span className="restaurant-skeleton skeleton-food-title"/><span className="restaurant-skeleton skeleton-food-description"/></div><div className="cart-lines">{[0, 1].map((line) => <div className="cart-line cart-line-skeleton" key={line}><div><span className="restaurant-skeleton skeleton-food-title"/><span className="restaurant-skeleton skeleton-food-description"/></div><span className="restaurant-skeleton skeleton-quantity"/><span className="restaurant-skeleton skeleton-total"/></div>)}</div><div className="restaurant-skeleton skeleton-cart-summary"/></div></LoadingState></main>;
  if (error || !menu) return <main className="page-shell"><div className="service-error" role="alert"><p>Your cart is unavailable because the menu could not load.</p><button className="retry-button" type="button" onClick={retry}>Try again</button></div></main>;

  const lines = cart.items.flatMap((line) => {
    const item = menu.items.find((product) => product.id === line.item_id);
    return item ? [{ ...line, item }] : [];
  });
  const total = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);

  return <main className="page-shell">
    <div className="section-heading"><div><p className="eyebrow">YOUR ORDER</p><h1>Shopping cart</h1></div><Link className="text-link" href="/menu">← Back to menu</Link></div>
    {lines.length === 0 ? <section className="empty-state"><h2>Your cart is empty</h2><p className="muted">Choose something delicious to get started.</p><Link className="button" href="/menu">Browse menu</Link></section> : <>
      <section className="cart-lines" aria-label="Cart items">{lines.map(({ item, quantity }) => <article className="cart-line" key={item.id}>
        <div className="cart-item-info"><h2>{item.name}</h2><p>{formatPrice(item.price)} each</p><button className="remove-link" onClick={() => cart.removeItem(item)}>Remove item</button></div>
        <div className="quantity-controls" aria-label={`${item.name} quantity`}><button aria-label={`Remove one ${item.name}`} onClick={() => cart.remove(item)}>−</button><span aria-live="polite">{quantity}</span><button aria-label={`Add one ${item.name}`} onClick={() => cart.add(item)} disabled={quantity >= 20}>+</button></div>
        <strong className="cart-line-total">{formatPrice(item.price * quantity)}</strong>
      </article>)}</section>
      <section className="cart-summary" aria-label="Cart total"><div className="cart-totals"><span>Subtotal</span><strong>{formatPrice(total)}</strong><span className="total-label">Total</span><strong className="total-amount">{formatPrice(total)}</strong><small>Final total is confirmed by the restaurant server.</small></div><Link className="button checkout-cta" href="/checkout">Continue to checkout <span aria-hidden="true">→</span></Link></section>
    </>}
  </main>;
}
