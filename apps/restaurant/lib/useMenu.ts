"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL, type MenuResponse } from "@/lib/api";
import { debugLoadingDuration, waitForDebugLoading } from "@/lib/debugLoading";

export function useMenu() {
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const startedAt = Date.now();
    const debugDuration = debugLoadingDuration();
    setLoading(true);
    setError(null);
    async function loadMenu() {
      try {
        const response = await fetch(`${API_URL}/api/v1/menu`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Menu service returned ${response.status}.`);
        const nextMenu = await response.json() as MenuResponse;
        await waitForDebugLoading(startedAt, debugDuration, controller.signal);
        setMenu(nextMenu);
      } catch (reason: unknown) {
        if (controller.signal.aborted) return;
        try {
          await waitForDebugLoading(startedAt, debugDuration, controller.signal);
        } catch {
          return;
        }
        setError(reason instanceof Error ? reason.message : "Unable to load the menu.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadMenu();
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt((value) => value + 1);
  }, []);
  return { menu, loading, error, retry };
}
