"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { Loader, LoadingState } from "@/components/Loader";
import { formatPrice } from "@/lib/api";
import { useMenu } from "@/lib/useMenu";

export default function HomePage() {
  const { menu, loading, error, retry } = useMenu();
  const { add, items } = useCart();
  const selections = menu?.items.slice(0, 3) ?? [];

  return <main className="page-shell home-shell" aria-busy={loading}>
    <section className="hero">
      <div className="hero-content">
        <p className="eyebrow">NEIGHBORHOOD KITCHEN · FRESH EVERY DAY</p>
        <h1>Good food.<br />Good company.</h1>
        <p>Seasonal favorites, thoughtful ingredients, and a table ready whenever you are.</p>
        <Link className="button light" href="/menu">Explore the menu <span aria-hidden="true">→</span></Link>
      </div>
      <div className="hero-seal" aria-hidden="true"><span>O</span><small>GATHER<br />WELL</small></div>
    </section>
    <section className="home-intro"><div><p className="eyebrow">MADE WITH CARE</p><h2>A little taste of Olive &amp; Ember</h2><p>Comfort food with a fresh point of view. Browse the menu and build an order for pickup.</p></div><Link className="text-link" href="/menu">See the menu <span aria-hidden="true">→</span></Link></section>
    <section className="home-menu-section" aria-labelledby="home-menu-heading">
      <div className="home-menu-heading"><div><p className="eyebrow">FROM OUR MENU</p><h2 id="home-menu-heading">A few things we make</h2></div><Link className="text-link" href="/menu">Browse everything <span aria-hidden="true">→</span></Link></div>
      {loading && <LoadingState label="Loading menu selections" className="home-menu-loading"><div className="home-menu-grid" aria-hidden="true">{Array.from({ length: 3 }, (_, index) => <div className="home-menu-card skeleton-menu-card" key={index}><Loader size="sm"/><span className="restaurant-skeleton skeleton-category"/><span className="restaurant-skeleton skeleton-food-title"/><span className="restaurant-skeleton skeleton-food-description"/><span className="restaurant-skeleton skeleton-food-action"/></div>)}</div></LoadingState>}
      {error && <p className="home-menu-note" role="alert">Menu selections are unavailable. <Link href="/menu">Visit the full menu</Link>. <button className="text-button" type="button" onClick={retry}>Try again</button></p>}
      {menu && (selections.length > 0 ? <div className="home-menu-grid">{selections.map((item) => {
        const quantity = items.find((line) => line.item_id === item.id)?.quantity ?? 0;
        return <article className="home-menu-card" key={item.id}>{item.image_url ? <img className="home-menu-image" src={item.image_url} alt={item.name}/> : <div className="home-menu-image home-menu-image-placeholder" aria-hidden="true">🍽</div>}<div className="home-card-top"><span>{item.category}</span><span className="home-card-price">{formatPrice(item.price, menu.currency)}</span></div><h3>{item.name}</h3><p>{item.description}</p>{item.is_available === false && <span className="unavailable-label">Currently unavailable</span>}<button type="button" className="home-add-button" onClick={() => add(item)} disabled={quantity >= 20 || item.is_available === false}>{item.is_available === false ? "Unavailable" : quantity > 0 ? `${quantity} in cart · Add another` : "Add to cart"}<span aria-hidden="true">{item.is_available === false ? "—" : "+"}</span></button></article>;
      })}</div> : <p className="home-menu-note">The menu is being prepared. <Link href="/menu">Check back soon</Link>.</p>)}
    </section>
  </main>;
}
