import { Router, type IRouter } from "express";
import { desc, sql, gte, count } from "drizzle-orm";
import { db, eventsTable } from "@workspace/db";
import {
  IngestEventBody,
  GetStatsResponse,
  GetActiveUsersResponse,
  GetPopularPagesResponse,
  GetErrorRateResponse,
  GetPageViewsOverTimeResponse,
  GetApiPerformanceResponse,
  GetRecentEventsResponse,
  GetFeatureUsageResponse,
  GetDropOffFunnelResponse,
} from "@workspace/api-zod";
import { broadcastWsMessage } from "../lib/ws";
import { getAnalyticsMode } from "../lib/simulator";
function filterRowsByMode<T extends { metadata: unknown }>(rows: T[]) {
  const mode = getAnalyticsMode();

  if (mode === "privacyguard") {
    return rows.filter(
      (r) =>
        (r.metadata as Record<string, unknown> | null)?.source ===
        "privacyguard"
    );
  }

  return rows.filter(
    (r) =>
      (r.metadata as Record<string, unknown> | null)?.source !==
      "privacyguard"
  );
}
const router: IRouter = Router();
router.post("/events", async (req, res): Promise<void> => {
  const parsed = IngestEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [event] = await db
    .insert(eventsTable)
    .values({
      userId: parsed.data.userId,
      eventType: parsed.data.event,
      page: parsed.data.page ?? null,
      metadata: parsed.data.metadata ?? null,
    })
    .returning();

  broadcastWsMessage({
  type: "new_event",
  data: event,
});

  res.status(201).json({
    id: event.id,
    event: event.eventType,
    userId: event.userId,
    page: event.page ?? null,
    timestamp: event.timestamp.toISOString(),
  });
});

router.get("/alerts", async (_req, res) => {
 const rows = await db.select().from(eventsTable);
const filteredRows = filterRowsByMode(rows); 

 const total = filteredRows.length;
 const errors = filteredRows.filter(
    (r) => r.eventType === "error"
  ).length;

  const errorRate =
    total > 0 ? (errors / total) * 100 : 0;

  const alerts = [];

  if (errorRate > 5) {
    alerts.push({
      severity: "high",
      message: `High error rate: ${errorRate.toFixed(2)}%`,
    });
  }

  res.json(alerts);
});

router.get("/stats", async (req, res): Promise<void> => {
  const since = new Date(Date.now() - 30 * 60 * 1000);
  const allRows = await db.select().from(eventsTable);
  const recentRows = await db
    .select()
    .from(eventsTable)
    .where(gte(eventsTable.timestamp, since));
const filteredRows = filterRowsByMode(allRows);
const filteredRecentRows = filterRowsByMode(recentRows);

 const totalEvents = filteredRows.length;

const totalUsers = new Set(
  filteredRows.map((r) => r.userId)
).size;

const totalPageViews = filteredRows.filter(
  (r) => r.eventType === "page_view"
).length;

const totalErrors = filteredRows.filter(
  (r) => r.eventType === "error"
).length;

const totalClicks = filteredRows.filter(
  (r) => r.eventType === "button_click"
).length;

const activeUsers = new Set(
  filteredRecentRows.map((r) => r.userId)
).size;

const errorRate =
  totalEvents > 0
    ? (totalErrors / totalEvents) * 100
    : 0;

const responseTimes = filteredRows
  .filter(
    (r) =>
      r.metadata &&
      typeof (r.metadata as Record<string, unknown>)["responseMs"] === "number"
  )
  .map(
    (r) =>
      (r.metadata as Record<string, unknown>)["responseMs"] as number
  );
  const avgResponseMs =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

  res.json(
    GetStatsResponse.parse({
      totalEvents,
      totalUsers,
      totalPageViews,
      totalErrors,
      totalClicks,
      activeUsers,
      errorRate: Math.round(errorRate * 100) / 100,
      avgResponseMs: Math.round(avgResponseMs),
    })
  );
});

router.get("/active-users", async (req, res): Promise<void> => {
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);

  const [currentRows, prevRows] = await Promise.all([
    db.select().from(eventsTable).where(gte(eventsTable.timestamp, fiveMinAgo)),
    db.select().from(eventsTable).where(gte(eventsTable.timestamp, tenMinAgo)),
  ]);
const filteredCurrentRows = filterRowsByMode(currentRows);
const filteredPrevRows = filterRowsByMode(prevRows);
  const current = new Set(
  filteredCurrentRows.map((r) => r.userId)
).size;

  const previous = new Set(
   filteredPrevRows
      .filter((r) => r.timestamp < fiveMinAgo)
      .map((r) => r.userId)
  ).size;

  const trend = previous > 0 ? ((current - previous) / previous) * 100 : 0;

  res.json(
    GetActiveUsersResponse.parse({
      count: current,
      trend: Math.round(trend * 10) / 10,
    })
  );
});

router.get("/popular-pages", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(eventsTable)
    .where(sql`${eventsTable.page} IS NOT NULL`);
const filteredRows = filterRowsByMode(rows);
  const pageMap = new Map<string, { views: number; users: Set<string> }>();
 for (const row of filteredRows) {
    if (!row.page) continue;
    if (!pageMap.has(row.page)) pageMap.set(row.page, { views: 0, users: new Set() });
    const entry = pageMap.get(row.page)!;
    entry.views++;
    entry.users.add(row.userId);
  }

  const pages = Array.from(pageMap.entries())
    .map(([page, { views, users }]) => ({ page, views, uniqueUsers: users.size }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  res.json(GetPopularPagesResponse.parse(pages));
});

router.get("/error-rate", async (req, res): Promise<void> => {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const prev = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const [currentRows, prevRows] = await Promise.all([
    db.select().from(eventsTable).where(gte(eventsTable.timestamp, since)),
    db
      .select()
      .from(eventsTable)
      .where(sql`${eventsTable.timestamp} >= ${prev} AND ${eventsTable.timestamp} < ${since}`),
  ]);
const filteredCurrentRows = filterRowsByMode(currentRows);
const filteredPrevRows = filterRowsByMode(prevRows);
  const currentErrors = filteredCurrentRows.filter((r) => r.eventType === "error").length;
  const currentRate = filteredCurrentRows.length > 0 ? (currentErrors / filteredCurrentRows.length) * 100 : 0;
  const prevErrors = filteredPrevRows.filter((r) => r.eventType === "error").length;
  const prevRate = filteredPrevRows.length > 0 ? (prevErrors / filteredPrevRows.length) * 100 : 0;
  const trend = currentRate - prevRate;

  res.json(
    GetErrorRateResponse.parse({
      rate: Math.round(currentRate * 100) / 100,
      total: currentRows.length,
      errors: currentErrors,
      trend: Math.round(trend * 100) / 100,
    })
  );
});

router.get("/page-views-over-time", async (req, res): Promise<void> => {
  const since = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(eventsTable)
    .where(gte(eventsTable.timestamp, since));
const filteredRows = filterRowsByMode(rows);
  const hourMap = new Map<string, { views: number; clicks: number; errors: number }>();
 for (const row of filteredRows) {
    const d = new Date(row.timestamp);
    const hour = `${d.getHours().toString().padStart(2, "0")}:00`;
    if (!hourMap.has(hour)) hourMap.set(hour, { views: 0, clicks: 0, errors: 0 });
    const entry = hourMap.get(hour)!;
    if (row.eventType === "page_view") entry.views++;
    else if (row.eventType === "button_click") entry.clicks++;
    else if (row.eventType === "error") entry.errors++;
  }

  const result = Array.from(hourMap.entries())
    .map(([hour, data]) => ({ hour, ...data }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  res.json(GetPageViewsOverTimeResponse.parse(result));
});

router.get("/api-performance", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(eventsTable)
    .where(sql`${eventsTable.eventType} = 'api_call' AND ${eventsTable.metadata} IS NOT NULL`);

  const endpointMap = new Map<string, number[]>();
  const endpointErrors = new Map<string, number>();
const filteredRows = filterRowsByMode(rows);
  for (const row of filteredRows) {
    const meta = row.metadata as Record<string, unknown>;
    const endpoint = (meta["endpoint"] as string) || "/unknown";
    const ms = (meta["responseMs"] as number) || 0;
    const isError = (meta["isError"] as boolean) || false;

    if (!endpointMap.has(endpoint)) {
      endpointMap.set(endpoint, []);
      endpointErrors.set(endpoint, 0);
    }
    endpointMap.get(endpoint)!.push(ms);
    if (isError) endpointErrors.set(endpoint, (endpointErrors.get(endpoint) || 0) + 1);
  }

  const stats = Array.from(endpointMap.entries()).map(([endpoint, times]) => {
    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1] ?? 0;
    const errors = endpointErrors.get(endpoint) || 0;
    return {
      endpoint,
      avgMs: Math.round(avg),
      p95Ms: Math.round(p95),
      calls: times.length,
      errorRate: Math.round((errors / times.length) * 100 * 100) / 100,
    };
  });

  if (stats.length === 0) {
    const mockEndpoints = [
      { endpoint: "GET /api/users", avgMs: 45, p95Ms: 120, calls: 1240, errorRate: 0.8 },
      { endpoint: "POST /api/events", avgMs: 28, p95Ms: 65, calls: 4820, errorRate: 0.2 },
      { endpoint: "GET /api/stats", avgMs: 92, p95Ms: 280, calls: 380, errorRate: 1.1 },
      { endpoint: "GET /api/popular-pages", avgMs: 67, p95Ms: 145, calls: 520, errorRate: 0.0 },
      { endpoint: "GET /api/active-users", avgMs: 18, p95Ms: 42, calls: 2100, errorRate: 0.0 },
    ];
    res.json(GetApiPerformanceResponse.parse(mockEndpoints));
    return;
  }

  res.json(GetApiPerformanceResponse.parse(stats.sort((a, b) => b.avgMs - a.avgMs)));
});

router.get("/recent-events", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(eventsTable)
    .orderBy(desc(eventsTable.timestamp))
    .limit(50);
const filteredRows = filterRowsByMode(rows);
  res.json(
    GetRecentEventsResponse.parse(
     filteredRows.map((r) => ({
        id: r.id,
        event: r.eventType,
        userId: r.userId,
        page: r.page ?? null,
        timestamp: r.timestamp.toISOString(),
      }))
    )
  );
});

router.get("/feature-usage", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(eventsTable)
    .where(sql`${eventsTable.eventType} = 'feature_use'`);
const filteredRows = filterRowsByMode(rows);
  const featureMap = new Map<string, { count: number; users: Set<string> }>();
  for (const row of filteredRows) {
    const meta = row.metadata as Record<string, unknown> | null;
    const feature = (meta?.["feature"] as string) || "unknown";
    if (!featureMap.has(feature)) featureMap.set(feature, { count: 0, users: new Set() });
    const entry = featureMap.get(feature)!;
    entry.count++;
    entry.users.add(row.userId);
  }

  if (featureMap.size === 0) {
    const mockFeatures = [
      { feature: "Dashboard", usageCount: 4821, uniqueUsers: 342 },
      { feature: "Event Ingestion", usageCount: 3104, uniqueUsers: 218 },
      { feature: "Alerts", usageCount: 1832, uniqueUsers: 185 },
      { feature: "API Explorer", usageCount: 1204, uniqueUsers: 129 },
      { feature: "Export CSV", usageCount: 689, uniqueUsers: 74 },
      { feature: "User Segments", usageCount: 412, uniqueUsers: 52 },
    ];
    res.json(GetFeatureUsageResponse.parse(mockFeatures));
    return;
  }

  const result = Array.from(featureMap.entries())
    .map(([feature, { count, users }]) => ({ feature, usageCount: count, uniqueUsers: users.size }))
    .sort((a, b) => b.usageCount - a.usageCount);

  res.json(GetFeatureUsageResponse.parse(result));
});

router.get("/drop-off-funnel", async (req, res): Promise<void> => {
  const rows = await db.select().from(eventsTable);
  const filteredRows = filterRowsByMode(rows);
  const usersByEvent = new Map<string, Set<string>>();

  for (const row of filteredRows) {
    if (!usersByEvent.has(row.eventType)) usersByEvent.set(row.eventType, new Set());
    usersByEvent.get(row.eventType)!.add(row.userId);
  }

  const landingUsers = (usersByEvent.get("page_view")?.size ?? 0) + (usersByEvent.get("landing") ?.size ?? 0);
  const signupUsers = usersByEvent.get("signup")?.size ?? 0;
  const onboardingUsers = usersByEvent.get("onboarding")?.size ?? 0;
  const dashboardUsers = usersByEvent.get("dashboard_view")?.size ?? 0;
  const featureUsers = usersByEvent.get("feature_use")?.size ?? 0;

  const total = filteredRows.length;
  const funnel = [
    { step: "Landing", users: Math.max(landingUsers, Math.ceil(total * 0.3)), dropOff: 0 },
    { step: "Signup", users: Math.max(signupUsers, Math.ceil(total * 0.18)), dropOff: 0 },
    { step: "Onboarding", users: Math.max(onboardingUsers, Math.ceil(total * 0.12)), dropOff: 0 },
    { step: "Dashboard", users: Math.max(dashboardUsers, Math.ceil(total * 0.08)), dropOff: 0 },
    { step: "Feature Use", users: Math.max(featureUsers, Math.ceil(total * 0.04)), dropOff: 0 },
  ];

  for (let i = 1; i < funnel.length; i++) {
    const prev = funnel[i - 1].users;
    const curr = funnel[i].users;
    funnel[i].dropOff = prev > 0 ? Math.round(((prev - curr) / prev) * 100 * 10) / 10 : 0;
  }

  res.json(GetDropOffFunnelResponse.parse(funnel));
});

router.get("/session-analytics", async (_req, res) => {
  const rows = await db.select().from(eventsTable);
  const filteredRows = filterRowsByMode(rows);

  const sessionMap = new Map();

  for (const row of filteredRows) {
    const meta = row.metadata as Record<string, any> | null;
    const sessionId = meta?.sessionId;

    if (!sessionId) continue;

    if (!sessionMap.has(sessionId)) {
      sessionMap.set(sessionId, {
        events: 0,
        first: row.timestamp,
        last: row.timestamp,
      });
    }

    const s = sessionMap.get(sessionId);

    s.events++;

    if (row.timestamp < s.first) s.first = row.timestamp;
    if (row.timestamp > s.last) s.last = row.timestamp;
  }

  const sessions = Array.from(sessionMap.entries()).map(
    ([sessionId, data]) => ({
      sessionId,
      events: data.events,
      durationSec: Math.round(
        (new Date(data.last).getTime() -
          new Date(data.first).getTime()) / 1000
      ),
    })
  );

  const totalSessions = sessions.length;

  const avgEventsPerSession =
    totalSessions > 0
      ? sessions.reduce((a, b) => a + b.events, 0) /
        totalSessions
      : 0;

  const avgDurationSec =
    totalSessions > 0
      ? sessions.reduce(
          (a, b) => a + b.durationSec,
          0
        ) / totalSessions
      : 0;

  res.json({
    totalSessions,
    avgEventsPerSession: Number(
      avgEventsPerSession.toFixed(1)
    ),
    avgDurationSec: Math.round(avgDurationSec),
    topSessions: sessions
      .sort((a, b) => b.events - a.events)
      .slice(0, 5),
  });
});

router.get("/export/events", async (_req, res) => {
  const rows = await db.select().from(eventsTable);
const filteredRows = filterRowsByMode(rows);

  const csv = [
    "id,user_id,event_type,page,timestamp",
    ...filteredRows.map(
      (r) =>
        `${r.id},${r.userId},${r.eventType},${r.page ?? ""},${r.timestamp.toISOString()}`
    ),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=events.csv"
  );

  res.send(csv);
});

export default router;


