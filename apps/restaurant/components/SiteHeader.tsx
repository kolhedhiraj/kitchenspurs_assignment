"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/CartProvider";

export default function SiteHeader() {
  const { items } = useCart();
  const pathname = usePathname();
  const count = items.reduce((total, item) => total + item.quantity, 0);
  return <>
    <header className="site-header"><Link className="brand" href="/">Olive &amp; Ember</Link><nav aria-label="Main navigation"><Link className={pathname === "/" ? "current" : ""} aria-current={pathname === "/" ? "page" : undefined} href="/">Home</Link><Link className={pathname === "/menu" ? "current" : ""} aria-current={pathname === "/menu" ? "page" : undefined} href="/menu">Menu</Link><Link className={pathname === "/cart" || pathname === "/checkout" ? "current" : ""} aria-current={pathname === "/cart" || pathname === "/checkout" ? "page" : undefined} href="/cart">Cart <span className="cart-count" aria-label={`${count} items in cart`}>{count}</span></Link></nav></header>
    <nav className="mobile-nav" aria-label="Customer navigation"><Link className={pathname === "/" ? "current" : ""} aria-current={pathname === "/" ? "page" : undefined} href="/"><span aria-hidden="true">⌂</span>Home</Link><Link className={pathname === "/menu" ? "current" : ""} aria-current={pathname === "/menu" ? "page" : undefined} href="/menu"><span aria-hidden="true">≡</span>Menu</Link><Link className={pathname === "/cart" || pathname === "/checkout" ? "current" : ""} aria-current={pathname === "/cart" || pathname === "/checkout" ? "page" : undefined} href="/cart"><span className="mobile-cart-icon" aria-hidden="true">▣{count > 0 && <i />}</span>Cart{count > 0 && <b>{count}</b>}</Link></nav>
  </>;
}
