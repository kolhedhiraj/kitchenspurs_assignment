import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Dashboard from "../components/Dashboard";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, "", "/"); });

const report = {
  from: "2026-10-09", to: "2026-10-15", timezone: "UTC" as const,
  total_page_views: 12, unique_visitors: 4, total_events: 16, orders_created: 2,
  traffic: [{ date: "2026-10-15", page_views: 12 }],
  visitor_trends: [{ date: "2026-10-15", unique_visitors: 4 }],
  popular_pages: [{ path: "/menu", views: 8 }],
  event_counts: [{ event_name: "add_to_cart", count: 4, latest_occurrence: "2026-10-15T09:30:00Z" }],
  event_trends: [{ event_name: "add_to_cart", daily_counts: [{ date: "2026-10-15", count: 4 }] }],
  recent_events: [],
};

describe("Dashboard", () => {
  it("keeps the real dashboard skeleton visible for the opt-in 500ms development check", async () => {
    window.history.pushState({}, "", "/?debugLoading=500");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => report }));
    render(<Dashboard />);
    expect(screen.getByRole("status", { name: "Loading analytics report" })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(screen.getByRole("status", { name: "Loading analytics report" })).toBeInTheDocument();
    expect(await screen.findByText("12", { selector: ".metric-card strong", timeout: 1000 })).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading analytics report" })).not.toBeInTheDocument();
  });

  it("loads real API data and requests a new date range when selected", async () => {
    const updatedReport = { ...report, total_page_views: 30 };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => report })
      .mockResolvedValueOnce({ ok: true, json: async () => updatedReport });
    vi.stubGlobal("fetch", fetchMock);
    render(<Dashboard />);
    expect(await screen.findByText("12", { selector: ".metric-card strong" })).toBeInTheDocument();
    expect(screen.getAllByText("/menu").length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name: /add_to_cart: 4 events/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Reporting period"), { target: { value: "30d" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("from=");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("to=");
    expect(await screen.findByText("30", { selector: ".metric-card strong" })).toBeInTheDocument();
  });

  it("shows loading and API error states", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("API offline"));
    vi.stubGlobal("fetch", fetchMock);
    render(<Dashboard />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading analytics");
    expect(await screen.findByRole("alert")).toHaveTextContent("API offline");
  });

  it("switches analytics sections without refetching and shows event summaries", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => report });
    vi.stubGlobal("fetch", fetchMock);
    render(<Dashboard />);
    expect(await screen.findByRole("heading", { name: "Analytics" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Events/ }));
    expect(await screen.findByText("Event activity")).toBeInTheDocument();
    expect(screen.getByText("15 Oct 2026, 09:30 am")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /Pages/ }));
    expect(await screen.findByText("Share of traffic")).toBeInTheDocument();
    expect(screen.getByText("66.7%")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("requests yesterday as a single UTC calendar day", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => report })
      .mockResolvedValueOnce({ ok: true, json: async () => report });
    vi.stubGlobal("fetch", fetchMock);
    render(<Dashboard />);
    await screen.findByText("12", { selector: ".metric-card strong" });
    fireEvent.change(screen.getByLabelText("Reporting period"), { target: { value: "yesterday" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const query = new URL(String(fetchMock.mock.calls[1]?.[0])).searchParams;
    expect(query.get("from")).toBe(query.get("to"));
  });

  it("shows an informative empty state for a range with no events", async () => {
    const emptyReport = {
      ...report,
      total_page_views: 0,
      unique_visitors: 0,
      total_events: 0,
      orders_created: 0,
      traffic: [{ date: "2026-10-15", page_views: 0 }],
      popular_pages: [],
      event_counts: [],
      event_trends: [],
      recent_events: [],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => emptyReport }));
    render(<Dashboard />);
    expect(await screen.findByText("No analytics data for this date range")).toBeInTheDocument();
  });

  it("ignores a stale response that arrives after a newer date-range response", async () => {
    let resolveFirst!: (response: { ok: boolean; json(): Promise<typeof report> }) => void;
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...report, total_page_views: 30 }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<Dashboard />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText("Reporting period"), { target: { value: "today" } });
    expect(await screen.findByText("30", { selector: ".metric-card strong" })).toBeInTheDocument();

    resolveFirst({ ok: true, json: async () => report });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByText("30", { selector: ".metric-card strong" })).toBeInTheDocument();
    expect(screen.queryByText("12", { selector: ".metric-card strong" })).not.toBeInTheDocument();
  });
});
