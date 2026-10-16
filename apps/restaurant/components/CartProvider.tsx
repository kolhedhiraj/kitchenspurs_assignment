"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { track } from "@/lib/analytics";
import type { MenuItem } from "@/lib/api";

export interface CartLine { item_id: string; quantity: number }
interface CartValue {
  items: CartLine[];
  add(item: MenuItem): void;
  remove(item: MenuItem): void;
  removeItem(item: MenuItem): void;
  clear(): void;
}
const CartContext = createContext<CartValue | null>(null);
const STORAGE_KEY = "restaurant-demo:cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) setItems(parsed.filter((line): line is CartLine => typeof line?.item_id === "string" && Number.isInteger(line?.quantity) && line.quantity > 0 && line.quantity <= 20));
      }
    } catch { /* Ignore invalid or unavailable browser storage. */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* Cart remains usable for this session. */ }
  }, [items, loaded]);

  const add = useCallback((item: MenuItem) => {
    if ((items.find((line) => line.item_id === item.id)?.quantity ?? 0) >= 20) return;
    setItems((current) => {
      const existing = current.find((line) => line.item_id === item.id);
      return existing
        ? current.map((line) => line.item_id === item.id ? { ...line, quantity: line.quantity + 1 } : line)
        : [...current, { item_id: item.id, quantity: 1 }];
    });
    track("add_to_cart", { item_id: item.id, item_name: item.name, quantity: 1 });
  }, [items]);

  const remove = useCallback((item: MenuItem) => {
    setItems((current) => current.flatMap((line) => {
      if (line.item_id !== item.id) return [line];
      if (line.quantity > 1) return [{ ...line, quantity: line.quantity - 1 }];
      return [];
    }));
    track("remove_from_cart", { item_id: item.id, item_name: item.name, quantity: 1 });
  }, []);

  const removeItem = useCallback((item: MenuItem) => {
    const quantity = items.find((line) => line.item_id === item.id)?.quantity ?? 0;
    if (quantity === 0) return;
    setItems((current) => current.filter((line) => line.item_id !== item.id));
    track("remove_from_cart", { item_id: item.id, item_name: item.name, quantity });
  }, [items]);

  const clear = useCallback(() => setItems([]), []);
  const value = useMemo(() => ({ items, add, remove, removeItem, clear }), [items, add, remove, removeItem, clear]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider.");
  return value;
}
