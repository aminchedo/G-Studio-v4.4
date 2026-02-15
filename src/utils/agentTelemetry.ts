/**
 * Agent Telemetry Utility
 *
 * Handles telemetry calls to the agent logging endpoint with proper error handling.
 * Silently fails if the server is not available. No network requests when disabled.
 *
 * When TELEMETRY_ENABLED is false (default): no fetches, no ERR_CONNECTION_REFUSED.
 * When enabled: checks server availability first and caches result to avoid spam.
 */

import { API_BASE } from "@/config/api";
import { safeFetch } from "@/services/network";

// Feature flag - disabled by default since telemetry server is optional
const TELEMETRY_ENABLED = false;

const ENDPOINT = `${API_BASE}/ingest/e36303ce-b8c8-4c86-ba1c-f20c8832334e`;
const HEALTH_URL = `${API_BASE}/health`;
const CHECK_INTERVAL_MS = 60_000;

let serverAvailable: boolean | null = null;
let lastCheckTime = 0;

async function checkServerAvailability(): Promise<boolean> {
  const now = Date.now();
  if (serverAvailable !== null && now - lastCheckTime < CHECK_INTERVAL_MS) {
    return serverAvailable;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 500);
    const response = await safeFetch(HEALTH_URL, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    serverAvailable = response.ok;
    lastCheckTime = now;
    return serverAvailable;
  } catch {
    serverAvailable = false;
    lastCheckTime = now;
    return false;
  }
}

export type TelemetryPayload = {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp?: number;
  sessionId?: string;
  runId?: string;
  hypothesisId?: string;
};

/**
 * Send telemetry data. No-op when disabled. When enabled, checks server first.
 */
export function sendAgentTelemetry(data: TelemetryPayload): void {
  if (!TELEMETRY_ENABLED) return;

  const payload = {
    location: data.location,
    message: data.message,
    data: data.data ?? {},
    timestamp: data.timestamp ?? Date.now(),
    sessionId: data.sessionId ?? "debug-session",
    runId: data.runId ?? "run1",
    hypothesisId: data.hypothesisId ?? "F",
  };

  checkServerAvailability().then((available) => {
    if (!available) return;
    safeFetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  });
}
