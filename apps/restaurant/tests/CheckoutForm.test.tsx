import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CheckoutForm from "@/components/CheckoutForm";
import type { CheckoutItem } from "@/lib/api";

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const items: CheckoutItem[] = [{
  item: { id: "pizza-margherita", name: "Margherita Pizza", category: "Pizza", description: "Tomato and mozzarella", price: 349 },
  quantity: 1,
}];

describe("CheckoutForm", () => {
  it("submits items to the order API and returns the persisted order", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ order: { id: 123, amount: 349, currency: "INR", items_count: 1, created_at: "2026-10-15T10:00:00Z" } }) });
    const onSuccess = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<CheckoutForm items={items} currency="INR" onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole("button", { name: "Place order" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: 123, amount: 349 })));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/v1/orders"), expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ items: [{ item_id: "pizza-margherita", quantity: 1 }] });
  });

  it("shows a clear error if the order API is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("API offline")));
    render(<CheckoutForm items={items} currency="INR" onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Place order" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("API offline");
  });

  it("prevents a second order submission while the first request is pending", async () => {
    let resolveRequest!: (response: { ok: boolean; json(): Promise<unknown> }) => void;
    const fetchMock = vi.fn().mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve; }));
    const onSuccess = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<CheckoutForm items={items} currency="INR" onSuccess={onSuccess} />);

    const button = screen.getByRole("button", { name: "Place order" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveTextContent("Placing order");

    resolveRequest({ ok: true, json: async () => ({ order: { id: 123, amount: 349, currency: "INR", items_count: 1, created_at: "2026-10-15T10:00:00Z" } }) });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-busy", "false");
  });

  it("clears its loading state after a failed order request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("API offline")));
    render(<CheckoutForm items={items} currency="INR" onSuccess={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Place order" });
    fireEvent.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent("API offline");
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-busy", "false");
  });
});
