import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CartProvider, useCart } from "@/components/CartProvider";
import type { MenuItem } from "@/lib/api";

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

afterEach(() => cleanup());

const item: MenuItem = {
  id: "pizza-margherita",
  name: "Margherita Pizza",
  category: "Pizza",
  description: "Tomato and mozzarella",
  price: 349,
};

function CartControls() {
  const cart = useCart();
  const quantity = cart.items.find((line) => line.item_id === item.id)?.quantity ?? 0;

  return <div>
    <output role="status">{quantity}</output>
    <button onClick={() => cart.add(item)}>Add</button>
    <button onClick={() => cart.remove(item)}>Remove one</button>
    <button onClick={() => cart.removeItem(item)}>Remove item</button>
  </div>;
}

describe("CartProvider", () => {
  it("adds, decrements, removes items, and enforces the checkout quantity limit", () => {
    render(<CartProvider><CartControls /></CartProvider>);
    const add = screen.getByRole("button", { name: "Add" });
    const remove = screen.getByRole("button", { name: "Remove one" });

    fireEvent.click(add);
    fireEvent.click(add);
    expect(screen.getByRole("status")).toHaveTextContent("2");

    fireEvent.click(remove);
    expect(screen.getByRole("status")).toHaveTextContent("1");

    fireEvent.click(remove);
    expect(screen.getByRole("status")).toHaveTextContent("0");

    for (let quantity = 0; quantity < 21; quantity++) fireEvent.click(add);
    expect(screen.getByRole("status")).toHaveTextContent("20");
  });

  it("removes the complete line from the cart", () => {
    render(<CartProvider><CartControls /></CartProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove item" }));
    expect(screen.getByRole("status")).toHaveTextContent("0");
  });
});
