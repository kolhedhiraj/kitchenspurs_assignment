import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAnalytics } from "../src/index.ts";

const makeResponse = (status = 202) => ({ ok: status >= 200 && status < 300, status }) as Response;

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      clear: () => values.clear(),
    },
  });
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("createAnalytics", () => {
  it("requires an endpoint and application ID", () => {
    expect(() => createAnalytics({ endpoint: "", applicationId: "demo" })).toThrow(/endpoint/);
    expect(() => createAnalytics({ endpoint: "/events", applicationId: " " })).toThrow(/applicationId/);
  });

  it("creates an anonymous UUID and persists it for the application", () => {
    const first = createAnalytics({ endpoint: "/events", applicationId: "restaurant-demo", fetch: vi.fn() });
    const second = createAnalytics({ endpoint: "/events", applicationId: "restaurant-demo", fetch: vi.fn() });
    expect(first.anonymousId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(second.anonymousId).toBe(first.anonymousId);
    expect(localStorage.getItem("analytics:restaurant-demo:anonymous_id")).toBe(first.anonymousId);
  });

  it("continues tracking when browser storage is blocked", async () => {
    const fetcher = vi.fn().mockResolvedValue(makeResponse());
    const analytics = createAnalytics({
      endpoint: "/events",
      applicationId: "demo",
      fetch: fetcher,
      storage: {
        getItem: () => { throw new Error("storage blocked"); },
        setItem: () => { throw new Error("storage blocked"); },
      },
    });

    await analytics.page();
    expect(analytics.anonymousId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("sends page context and the public credential without blocking the caller", async () => {
    const fetcher = vi.fn().mockResolvedValue(makeResponse());
    const analytics = createAnalytics({
      endpoint: "http://localhost:8000/api/v1/events",
      applicationId: "restaurant-demo",
      apiKey: "public-key",
      fetch: fetcher,
    });

    await analytics.page();
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body));
    expect(url).toContain("/api/v1/events");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("X-Analytics-Key")).toBe("public-key");
    expect(payload).toMatchObject({
      event_name: "page_view",
      event_type: "page_view",
      application_id: "restaurant-demo",
      anonymous_id: analytics.anonymousId,
      context: { path: "/", url: "https://restaurant.test/", sdk_version: "0.1.0" },
    });
    expect(payload.event_id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(payload.occurred_at).toBeTruthy();
  });

  it("sends custom event properties and optional user identity", async () => {
    const fetcher = vi.fn().mockResolvedValue(makeResponse());
    const analytics = createAnalytics({ endpoint: "/events", applicationId: "demo", fetch: fetcher });
    analytics.setUserId("user-123");
    await analytics.track("add_to_cart", { item_id: "pizza", quantity: 1 });
    const payload = JSON.parse(String((fetcher.mock.calls[0]?.[1] as RequestInit).body));
    expect(payload).toMatchObject({
      event_name: "add_to_cart",
      event_type: "custom",
      user_id: "user-123",
      properties: { item_id: "pizza", quantity: 1 },
    });
  });

  it("drops invalid event names without making a request", async () => {
    const fetcher = vi.fn();
    const analytics = createAnalytics({ endpoint: "/events", applicationId: "demo", fetch: fetcher });
    await analytics.track("not a valid event name");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("drops oversized property objects before sending a request", async () => {
    const fetcher = vi.fn();
    const analytics = createAnalytics({ endpoint: "/events", applicationId: "demo", fetch: fetcher });
    await analytics.track("large_event", { content: "x".repeat(17 * 1024) });
    await analytics.track("many_fields", Object.fromEntries(Array.from({ length: 101 }, (_, index) => [`field_${index}`, index])));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("retries a transient server error and quietly drops a failed event", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(makeResponse(503)).mockResolvedValueOnce(makeResponse(202));
    const analytics = createAnalytics({ endpoint: "/events", applicationId: "demo", fetch: fetcher });
    await analytics.track("menu_item_viewed", { item_id: "pasta" });
    expect(fetcher).toHaveBeenCalledTimes(2);

    const failedFetcher = vi.fn().mockRejectedValue(new Error("offline"));
    const failedAnalytics = createAnalytics({ endpoint: "/events", applicationId: "demo", fetch: failedFetcher });
    await expect(failedAnalytics.track("add_to_cart")).resolves.toBeUndefined();
    expect(failedFetcher).toHaveBeenCalledTimes(2);

    const rejectedFetcher = vi.fn().mockResolvedValue(makeResponse(422));
    const rejectedAnalytics = createAnalytics({ endpoint: "/events", applicationId: "demo", fetch: rejectedFetcher });
    await rejectedAnalytics.track("invalid_payload");
    expect(rejectedFetcher).toHaveBeenCalledTimes(1);
  });
});
