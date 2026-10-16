import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import PageTracker from "../components/PageTracker";

const trackerState = vi.hoisted(() => ({
  pathname: "/menu",
  page: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({ usePathname: () => trackerState.pathname }));
vi.mock("@/lib/analytics", () => ({ analytics: () => ({ page: trackerState.page }) }));

afterEach(() => {
  cleanup();
  trackerState.pathname = "/menu";
  trackerState.page.mockClear();
});

describe("PageTracker", () => {
  it("tracks one page view for a pathname even when Strict Mode replays effects", () => {
    const view = render(<StrictMode><PageTracker /></StrictMode>);
    expect(trackerState.page).toHaveBeenCalledTimes(1);

    trackerState.pathname = "/cart";
    view.rerender(<StrictMode><PageTracker /></StrictMode>);
    expect(trackerState.page).toHaveBeenCalledTimes(2);
  });
});
