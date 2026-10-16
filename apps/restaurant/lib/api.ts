export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
}

export interface MenuResponse {
  currency: string;
  items: MenuItem[];
}

export interface CheckoutItem { item: MenuItem; quantity: number }
export interface CreatedOrder {
  id: number;
  amount: number;
  currency: string;
  items_count: number;
  created_at: string;
}

export function formatPrice(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}
