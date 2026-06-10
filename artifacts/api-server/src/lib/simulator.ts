import { db, eventsTable } from "@workspace/db";
import { broadcastWsMessage } from "./ws";
import { logger } from "./logger";

const PAGES = ["/home", "/dashboard", "/profile", "/settings", "/pricing", "/docs", "/login", "/signup", "/features"];
const FEATURES = ["Dashboard", "Event Ingestion", "Alerts", "API Explorer", "Export CSV", "User Segments"];
const ENDPOINTS = [
  "GET /api/users",
  "POST /api/events",
  "GET /api/stats",
  "GET /api/popular-pages",
  "GET /api/active-users",
];
const EVENT_TYPES = ["page_view", "button_click", "error", "feature_use", "api_call", "signup", "dashboard_view"];
const EVENT_WEIGHTS = [40, 25, 8, 12, 8, 4, 3];

function pickWeighted(items: string[], weights: number[]): string {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function randomUserId(): string {
  const base = Math.floor(Math.random() * 200) + 1;
  return `user_${base.toString().padStart(4, "0")}`;
}

async function emitEvent(): Promise<void> {
  const eventType = pickWeighted(EVENT_TYPES, EVENT_WEIGHTS);
  const userId = randomUserId();
  const page = eventType === "page_view" || eventType === "button_click" || eventType === "error"
    ? PAGES[Math.floor(Math.random() * PAGES.length)]
    : null;

  let metadata: Record<string, unknown> | null = null;

  if (eventType === "api_call") {
    const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
    const responseMs = Math.floor(Math.random() * 300) + 10;
    const isError = Math.random() < 0.05;
    metadata = { endpoint, responseMs, isError };
  } else if (eventType === "feature_use") {
    metadata = { feature: FEATURES[Math.floor(Math.random() * FEATURES.length)] };
  } else if (eventType === "error") {
    const errors = ["TypeError: Cannot read property", "NetworkError", "500 Internal Server Error", "ReferenceError: undefined", "Uncaught Promise rejection"];
    metadata = { message: errors[Math.floor(Math.random() * errors.length)] };
  }

  const [event] = await db
    .insert(eventsTable)
    .values({ userId, eventType, page, metadata })
    .returning();

  broadcastWsMessage({ type: "new_event", data: { id: event.id, event: event.eventType, userId: event.userId, page: event.page, timestamp: event.timestamp } });
}

export function startSimulator(): void {
  const MIN_INTERVAL = 400;
  const MAX_INTERVAL = 1800;

  function scheduleNext(): void {
    const delay = Math.floor(Math.random() * (MAX_INTERVAL - MIN_INTERVAL)) + MIN_INTERVAL;
    setTimeout(async () => {
      try {
        await emitEvent();
      } catch (err) {
        logger.error({ err }, "Simulator error");
      }
      scheduleNext();
    }, delay);
  }

  scheduleNext();
  logger.info("Event simulator started");
}
