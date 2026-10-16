"use client";

import { createAnalytics, type AnalyticsClient } from "@analytics/browser-sdk";
import type { JsonObject } from "@analytics/browser-sdk";
import { API_URL } from "@/lib/api";

let client: AnalyticsClient | undefined;

export function analytics(): AnalyticsClient | undefined {
  if (typeof window === "undefined") return undefined;
  if (!client) {
    client = createAnalytics({
      endpoint: `${API_URL}/api/v1/events`,
      applicationId: process.env.NEXT_PUBLIC_ANALYTICS_APPLICATION_ID ?? "restaurant-demo",
      apiKey: process.env.NEXT_PUBLIC_ANALYTICS_API_KEY,
      debug: process.env.NODE_ENV === "development",
    });
  }
  return client;
}

export function track(name: string, properties?: JsonObject): void {
  void analytics()?.track(name, properties).catch(() => undefined);
}
