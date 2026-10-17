export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  image_url?: string | null;
  is_available?: boolean;
}

export interface MenuResponse {
  currency: string;
  categories: { id: number; name: string }[];
  items: MenuItem[];
}

export interface CheckoutItem { item: MenuItem; quantity: number }
export interface CreatedOrder {
  id: number;
  amount: number;
  currency: string;
  items_count: number;
  created_at: string;
  status: OrderStatus;
}

export type OrderStatus = "pending" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";
export interface RestaurantOrder extends CreatedOrder {
  status_label: string;
  updated_at: string;
  items: { item_id: string; name: string; quantity: number; unit_price: number; line_total: number }[];
}

export function formatPrice(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}
