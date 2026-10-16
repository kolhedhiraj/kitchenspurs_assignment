import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CartProvider } from "@/components/CartProvider";
import HomePage from "@/app/page";

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("HomePage", () => {
  it("shows real menu selections and adds an item to the cart", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ currency: "INR", items: [
      { id: "pizza", name: "Garden Pizza", category: "Pizza", description: "Tomato and basil", price: 349 },
      { id: "pasta", name: "Lemon Pasta", category: "Pasta", description: "Fresh lemon", price: 249 },
    ] }) }));
    render(<CartProvider><HomePage /></CartProvider>);
    expect(await screen.findByRole("heading", { name: "A few things we make" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Garden Pizza" })).toBeInTheDocument();
    expect(screen.getByText("₹349")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Add to cart" })[0]!);
    expect(screen.getByRole("button", { name: /1 in cart · Add another/ })).toBeInTheDocument();
  });
});
