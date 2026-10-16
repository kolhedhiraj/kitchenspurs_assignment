export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = Record<string, JsonValue>;

export interface AnalyticsConfig {
  endpoint: string;
  applicationId: string;
  apiKey?: string;
  anonymousId?: string;
  userId?: string | null;
  debug?: boolean;
  timeoutMs?: number;
  fetch?: typeof fetch;
  storage?: Pick<Storage, "getItem" | "setItem">;
}

export interface PageOptions {
  url?: string;
  path?: string;
  title?: string;
  referrer?: string;
}

export interface AnalyticsClient {
  readonly anonymousId: string;
  page(options?: PageOptions): Promise<void>;
  track(eventName: string, properties?: JsonObject): Promise<void>;
  setUserId(userId: string | null): void;
}

interface EventPayload {
  event_id: string;
  event_name: string;
  event_type: "page_view" | "custom";
  application_id: string;
  anonymous_id: string;
  user_id: string | null;
  occurred_at: string;
  properties: JsonObject;
  context: {
    path?: string;
    url?: string;
    referrer?: string;
    title?: string;
    user_agent?: string;
    sdk_version: string;
  };
}

const SDK_VERSION = "0.1.0";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createAnalytics(config: AnalyticsConfig): AnalyticsClient {
  if (!config.endpoint.trim()) throw new Error("Analytics endpoint is required.");
  if (!config.applicationId.trim()) throw new Error("Analytics applicationId is required.");

  const storage = config.storage ?? getBrowserStorage();
  const storageKey = `analytics:${config.applicationId}:anonymous_id`;
  const anonymousId = config.anonymousId || getOrCreateAnonymousId(storage, storageKey);
  const timeoutMs = Math.min(30_000, Math.max(250, config.timeoutMs ?? 3000));
  let userId = config.userId ?? null;

  const send = async (event: EventPayload): Promise<void> => {
    const fetcher = config.fetch ?? globalThis.fetch?.bind(globalThis);
    if (!fetcher) {
      debug(config.debug, "fetch is unavailable; event was dropped", event.event_name);
      return;
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : undefined;
      const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
      try {
        const response = await fetcher(config.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(config.apiKey ? { "X-Analytics-Key": config.apiKey } : {}),
          },
          body: JSON.stringify(event),
          signal: controller?.signal,
          keepalive: true,
        });
        if (response.ok) return;
        if (response.status < 500 || attempt === 1) {
          debug(config.debug, "event rejected", event.event_name, response.status);
          return;
        }
      } catch (error) {
        if (attempt === 1) {
          debug(config.debug, "event delivery failed; event was dropped", event.event_name, error);
          return;
        }
      } finally {
        if (timeout) clearTimeout(timeout);
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  };

  const createEvent = (
    eventName: string,
    eventType: EventPayload["event_type"],
    properties: JsonObject,
    pageOptions: PageOptions = {},
  ): EventPayload => {
    const browser = typeof window !== "undefined";
    const locationUrl = pageOptions.url ?? (browser ? window.location.href : undefined);
    const path = pageOptions.path ?? (browser ? window.location.pathname : undefined);

    return {
      event_id: createUuid(),
      event_name: eventName,
      event_type: eventType,
      application_id: config.applicationId,
      anonymous_id: anonymousId,
      user_id: userId,
      occurred_at: new Date().toISOString(),
      properties,
      context: {
        ...(path ? { path } : {}),
        ...(locationUrl ? { url: locationUrl } : {}),
        ...(pageOptions.referrer !== undefined
          ? { referrer: pageOptions.referrer }
          : browser && document.referrer
            ? { referrer: document.referrer }
            : {}),
        ...(pageOptions.title !== undefined
          ? { title: pageOptions.title }
          : browser && document.title
            ? { title: document.title }
            : {}),
        ...(browser && navigator.userAgent ? { user_agent: navigator.userAgent } : {}),
        sdk_version: SDK_VERSION,
      },
    };
  };

  return {
    anonymousId,
    page(options = {}) {
      return send(createEvent("page_view", "page_view", {}, options));
    },
    track(eventName, properties = {}) {
      if (!/^[a-zA-Z][a-zA-Z0-9_.:-]{0,99}$/.test(eventName)) {
        debug(config.debug, "invalid event name was dropped", eventName);
        return Promise.resolve();
      }
      if (!withinPropertyLimits(properties)) {
        debug(config.debug, "event properties exceeded SDK limits; event was dropped", eventName);
        return Promise.resolve();
      }
      return send(createEvent(eventName, "custom", properties));
    },
    setUserId(nextUserId) {
      userId = nextUserId;
    },
  };
}

function withinPropertyLimits(properties: JsonObject): boolean {
  try {
    if (Object.keys(properties).length > 100) return false;
    return new TextEncoder().encode(JSON.stringify(properties)).byteLength <= 16 * 1024;
  } catch {
    return false;
  }
}

function getBrowserStorage(): Pick<Storage, "getItem" | "setItem"> | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function getOrCreateAnonymousId(storage: Pick<Storage, "getItem" | "setItem"> | undefined, key: string): string {
  try {
    const existing = storage?.getItem(key);
    if (existing && UUID_PATTERN.test(existing)) return existing;
  } catch {
    // Restricted browser storage should not stop analytics or the host application.
  }

  const id = createUuid();
  try {
    storage?.setItem(key, id);
  } catch {
    // The ID remains stable for this SDK instance even when persistence is unavailable.
  }
  return id;
}

function createUuid(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function debug(enabled: boolean | undefined, ...args: unknown[]): void {
  if (enabled) console.debug("[analytics-sdk]", ...args);
}
