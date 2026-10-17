import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CartProvider } from "@/components/CartProvider";
import MenuPage from "@/app/menu/page";
import { track } from "@/lib/analytics";

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); window.history.replaceState({}, "", "/"); });

describe("MenuPage", () => {
  it("holds the menu skeleton through an opt-in 500ms development latency check", async () => {
    window.history.pushState({}, "", "/menu?debugLoading=500");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ currency: "INR", items: [{ id: "pizza", name: "Garden Pizza", category: "Pizza", description: "Vegetables", price: 300 }] }) }));
    render(<CartProvider><MenuPage /></CartProvider>);
    expect(screen.getByRole("status", { name: "Loading today’s menu" })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(screen.getByRole("status", { name: "Loading today’s menu" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Garden Pizza", timeout: 1000 })).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading today’s menu" })).not.toBeInTheDocument();
  });

  it("shows a menu-shaped loading state and can retry after an API error", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("API offline"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ currency: "INR", items: [{ id: "pizza", name: "Garden Pizza", category: "Pizza", description: "Vegetables", price: 300 }] }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<CartProvider><MenuPage /></CartProvider>);
    expect(screen.getByRole("status", { name: "Loading today’s menu" })).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("The menu is unavailable right now.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Garden Pizza" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows an informative empty state when the API has no menu items", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ currency: "INR", items: [] }) }));
    render(<CartProvider><MenuPage /></CartProvider>);
    expect(await screen.findByText("Menu coming soon")).toBeInTheDocument();
  });

  it("filters the API menu by category and records one menu view", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ currency: "INR", items: [
      { id: "pizza", name: "Garden Pizza", category: "Pizza", description: "Vegetables", price: 300 },
      { id: "pasta", name: "Lemon Pasta", category: "Pasta", description: "Lemon", price: 250 },
    ] }) }));
    render(<CartProvider><MenuPage /></CartProvider>);
    expect(await screen.findByRole("heading", { name: "Garden Pizza" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Lemon Pasta" })).toBeInTheDocument();
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("menu_viewed", { item_count: 2 });
    fireEvent.click(screen.getByRole("button", { name: "Pizza" }));
    expect(screen.getByRole("heading", { name: "Garden Pizza" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Lemon Pasta" })).not.toBeInTheDocument();
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("shows unavailable food but prevents adding it to the cart", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ currency: "INR", items: [
      { id: "soup", name: "Garden Soup", category: "Starters", description: "Greens and herbs", price: 180, image_url: null, is_available: false },
    ] }) }));
    render(<CartProvider><MenuPage /></CartProvider>);
    expect(await screen.findByRole("heading", { name: "Garden Soup" })).toBeInTheDocument();
    expect(screen.getByText("Currently unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Garden Soup to cart" })).toBeDisabled();
  });
});
