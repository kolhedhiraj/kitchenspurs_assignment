"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader, LoadingState } from "@/components/Loader";
import { useMenu } from "@/lib/useMenu";
import { formatPrice } from "@/lib/api";
import { useCart } from "@/components/CartProvider";
import { track } from "@/lib/analytics";
import type { MenuItem } from "@/lib/api";

export default function MenuPage() {
  const { menu, loading, error, retry } = useMenu();
  const { add, items: cartItems } = useCart();
  const [activeCategory, setActiveCategory] = useState("All");
  const menuViewed = useRef(false);

  useEffect(() => {
    if (!menu || menuViewed.current) return;
    menuViewed.current = true;
    track("menu_viewed", { item_count: menu.items.length });
  }, [menu]);

  const categories = ["All", ...(menu?.categories.map((category) => category.name) ?? [])];
  const visibleItems = menu?.items.filter((item) => activeCategory === "All" || item.category === activeCategory) ?? [];
  const itemCount = cartItems.reduce((total, line) => total + line.quantity, 0);
  const cartTotal = menu?.items.reduce((total, item) => total + item.price * (cartItems.find((line) => line.item_id === item.id)?.quantity ?? 0), 0) ?? 0;

  return <main className="page-shell" aria-busy={loading}>
    <div className="section-heading"><div><p className="eyebrow">THE MENU</p><h1>Made for the table</h1><p>Fresh favorites, prepared to order.</p></div><Link className="text-link" href="/cart">View your cart →</Link></div>
    {loading && <LoadingState label="Loading today’s menu" className="menu-loading"><div aria-hidden="true"><div className="menu-category-skeleton">{Array.from({ length: 4 }, (_, index) => <span className="restaurant-skeleton" key={index}/>)}</div><div className="menu-grid">{Array.from({ length: 6 }, (_, index) => <article className="menu-card skeleton-menu-card" key={index}><Loader size="sm"/><span className="restaurant-skeleton skeleton-category"/><span className="restaurant-skeleton skeleton-food-title"/><span className="restaurant-skeleton skeleton-food-description"/><span className="restaurant-skeleton skeleton-food-action"/></article>)}</div></div></LoadingState>}
    {error && <div className="service-error" role="alert"><p>The menu is unavailable right now. {error}</p><button className="retry-button" type="button" onClick={retry}>Try again</button></div>}
    {menu && (menu.items.length > 0
      ? <>
        <nav className="menu-categories" aria-label="Menu categories">{categories.map((category) => <button key={category} type="button" className={activeCategory === category ? "active" : ""} aria-pressed={activeCategory === category} onClick={() => setActiveCategory(category)}>{category}</button>)}</nav>
        <section className="menu-grid" aria-label={`${activeCategory} menu items`}>{visibleItems.map((item) => {
        const quantity = cartItems.find((line) => line.item_id === item.id)?.quantity ?? 0;
        return <MenuCard key={item.id} item={item} onAdd={() => add(item)} quantity={quantity} atLimit={quantity >= 20} />;
      })}</section>
      </>
      : <section className="empty-state"><h2>Menu coming soon</h2><p className="muted">There are no available items right now.</p></section>)}
    {menu && itemCount > 0 && <Link className="mobile-cart-cta" href="/cart"><span><strong>View cart</strong><small>{itemCount} {itemCount === 1 ? "item" : "items"} · estimated {formatPrice(cartTotal, menu.currency)}</small></span><span aria-hidden="true">→</span></Link>}
  </main>;
}

function MenuCard({ item, onAdd, quantity, atLimit }: { item: MenuItem; onAdd: () => void; quantity: number; atLimit: boolean }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const showDetails = () => {
    if (!detailsOpen) track("menu_item_viewed", { item_id: item.id, item_name: item.name, category: item.category });
    setDetailsOpen((open) => !open);
  };

  return <article className="menu-card">
    <MenuPhoto item={item}/>
    <span className="category">{item.category}</span>
    <h2>{item.name}</h2>
    <p>{detailsOpen ? item.description : "Prepared fresh in our kitchen."}</p>
    <footer><div className="menu-price"><strong>{formatPrice(item.price)}</strong>{item.is_available === false ? <span className="unavailable-label">Currently unavailable</span> : quantity > 0 && <span aria-label={`${quantity} ${item.name} in cart`}>{quantity} in cart</span>}</div><div className="inline-actions"><button className="small-button" onClick={showDetails}>{detailsOpen ? "Hide details" : "View details"}</button><button className="small-button" onClick={onAdd} disabled={atLimit || item.is_available === false} aria-label={`Add ${item.name} to cart`}>{item.is_available === false ? "Unavailable" : atLimit ? "Max quantity" : "Add +"}</button></div></footer>
  </article>;
}

function MenuPhoto({ item }: { item: MenuItem }) {
  const [failed, setFailed] = useState(false);
  return item.image_url && !failed ? <img className="customer-menu-image" src={item.image_url} alt={item.name} onError={() => setFailed(true)}/> : <div className="customer-menu-placeholder" aria-label={`${item.name} image placeholder`}>🍽</div>;
}
