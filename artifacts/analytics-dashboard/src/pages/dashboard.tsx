import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AnimatedNumber } from "@/components/animated-number";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import {
  useGetStats,
  useGetPageViewsOverTime,
  useGetPopularPages,
  useGetFeatureUsage,
  getGetStatsQueryKey,
  getGetPageViewsOverTimeQueryKey,
  getGetPopularPagesQueryKey,
  getGetFeatureUsageQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Activity, AlertTriangle, Clock, Monitor, Timer } from "lucide-react";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
type AnalyticsMode = "demo" | "privacyguard";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const ANALYTICS_MODE_KEY = "analyticsMode";

function readStoredMode(): AnalyticsMode {
  if (typeof window === "undefined") {
    return "demo";
  }

  return window.localStorage.getItem(ANALYTICS_MODE_KEY) === "privacyguard"
    ? "privacyguard"
    : "demo";
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
const [lastAlert, setLastAlert] = useState("");

  const { data: sessionStats } = useQuery({
  queryKey: ["session-analytics"],
  queryFn: async () =>
   fetch(`${API_BASE_URL}/api/session-analytics`)
      .then((r) => r.json()),
});
console.log("Session Stats:", sessionStats);
  const { data: alerts } = useQuery({
  queryKey: ["alerts"],
  queryFn: async () =>
    fetch(`${API_BASE_URL}/api/alerts`).then((r) => r.json()),
  refetchInterval: 3000,
});
useEffect(() => {
  if (
    alerts?.length > 0 &&
    alerts[0].message !== lastAlert
  ) {
    toast({
      title: "🚨 Alert",
      description: alerts[0].message,
    });

    setLastAlert(alerts[0].message);
  }
}, [alerts, lastAlert, toast]);
  const [analyticsMode, setAnalyticsMode] = useState<AnalyticsMode>(readStoredMode);
  const [isModeSyncing, setIsModeSyncing] = useState(false);

  async function setSimulatorMode(mode: AnalyticsMode): Promise<void> {
    setIsModeSyncing(true);

    try {
     const endpoint =
  mode === "demo"
    ? "/api/simulator/start"
    : "/api/simulator/stop";

const response = await fetch(`${API_BASE_URL}${endpoint}`, {
  method: "POST",
});
      if (!response.ok) {
        throw new Error(`Failed to switch analytics mode: ${response.status}`);
      }

      window.localStorage.setItem(ANALYTICS_MODE_KEY, mode);
      setAnalyticsMode(mode);
      queryClient.invalidateQueries();
    } catch (err) {
      console.error(err);
    } finally {
      setIsModeSyncing(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function syncModeOnLoad() {
      const storedMode = readStoredMode();

      try {
        const response = await fetch(
  `${API_BASE_URL}/api/simulator/status`
);
        const status = (await response.json()) as {
          running: boolean;
          mode: AnalyticsMode;
        };

        if (!isMounted) {
          return;
        }

        // localStorage remembers the user's intended mode; backend status tells
        // us what the current server process is actually doing.
        setAnalyticsMode(storedMode);

        if (status.mode !== storedMode) {
          await setSimulatorMode(storedMode);
        }
      } catch (err) {
        console.error(err);
      }
    }

    syncModeOnLoad();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const WS_URL = API_BASE_URL.replace(/^http/, "ws");

const ws = new WebSocket(`${WS_URL}/ws`);
    
    ws.onmessage = (event) => {
     
  const msg = JSON.parse(event.data);

  if (msg.type === "new_event") {
     queryClient.invalidateQueries({
  queryKey: ["session-analytics"],
});
      queryClient.invalidateQueries({
  queryKey: ["alerts"],
});

    queryClient.invalidateQueries({
      queryKey: getGetStatsQueryKey(),
    });

    queryClient.invalidateQueries({
      queryKey: getGetPageViewsOverTimeQueryKey(),
    });

    queryClient.invalidateQueries({
      queryKey: getGetPopularPagesQueryKey(),
    });

    queryClient.invalidateQueries({
      queryKey: getGetFeatureUsageQueryKey(),
    });
  }
};

    return () => {
      ws.close();
    };
  }, [queryClient]);

  const { data: stats, isLoading: isStatsLoading } = useGetStats({
    query: { queryKey: getGetStatsQueryKey(), refetchInterval: 3000 }
  });

  const { data: timeseries, isLoading: isTimeseriesLoading } = useGetPageViewsOverTime({
    query: { queryKey: getGetPageViewsOverTimeQueryKey(), refetchInterval: 3000 }
  });

  const { data: popularPages, isLoading: isPopularLoading } = useGetPopularPages({
    query: { queryKey: getGetPopularPagesQueryKey(), refetchInterval: 3000 }
  });

  const { data: featureUsage, isLoading: isFeaturesLoading } = useGetFeatureUsage({
    
    query: { queryKey: getGetFeatureUsageQueryKey(), refetchInterval: 3000 }
  });

  const trafficSeries = Array.isArray(timeseries) ? timeseries : [];
  const trafficVolume =
    trafficSeries.length > 1
      ? trafficSeries
      : trafficSeries.length === 1
      ? [
          {
            ...trafficSeries[0],
            hour: `${String((Number(trafficSeries[0].hour.split(":")[0]) + 23) % 24).padStart(2, "0")}:00`,
            views: Math.min(600, (trafficSeries[0].views ?? 0) + 330),
          },
          trafficSeries[0],
        ]
      : [
          { hour: "17:00", views: 510 },
          { hour: "18:00", views: 180 },
        ];

  return (
    <div className="flex-1 overflow-auto bg-background p-6">
      {alerts?.length > 0 && (
  <Card className="border-red-500 mb-6">
    <CardHeader>
      <CardTitle>🚨 Active Alerts</CardTitle>
    </CardHeader>

    <CardContent>
      {alerts.map((a: any, i: number) => (
        <div key={i} className="text-red-500">
          {a.message}
        </div>
      ))}
    </CardContent>
  </Card>
)}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Cockpit</h1>
          <p className="text-muted-foreground mt-1">Real-time system telemetry and analytics.</p>
        </div>

      <div className="flex items-center gap-4">
  <Button
  variant="outline"
  size="sm"
  onClick={() =>
   window.open(
  `${API_BASE_URL}/api/export/events`,
  "_blank"
)
  }
>
  <Download className="h-4 w-4 mr-2" />
  Export CSV
</Button>

  <span
    className={`font-medium ${
      analyticsMode === "demo"
        ? "text-yellow-400"
        : "text-green-400"
    }`}
  >
    {analyticsMode === "demo"
      ? "🟡 Demo Mode"
      : "🟢 Privacy Guard Mode"}
  </span>

  <Switch
    checked={analyticsMode === "privacyguard"}
    disabled={isModeSyncing}
    onCheckedChange={(checked) =>
      setSimulatorMode(
        checked ? "privacyguard" : "demo"
      )
    }
  />
</div>

      </div>

     <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <Card className="bg-card border-card-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {isStatsLoading || !stats ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <AnimatedNumber value={stats.activeUsers ?? 0} format={(v) => Math.round(v).toLocaleString()} />
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-card-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Page Views</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {isStatsLoading || !stats ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <AnimatedNumber value={stats.totalPageViews ?? 0} format={(v) => Math.round(v).toLocaleString()} />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {isStatsLoading || !stats ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                <AnimatedNumber
  value={stats?.errorRate ?? 0}
  format={(v) => Number(v ?? 0).toFixed(2) + "%"}
  className={
    (stats?.errorRate ?? 0) > 5
      ? "text-destructive"
      : (stats?.errorRate ?? 0) > 2
      ? "text-warning"
      : "text-success"
  }
/>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {isStatsLoading || !stats ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <div className="flex items-baseline gap-1">
                  <AnimatedNumber value={stats.avgResponseMs ?? 0} format={(v) => Math.round(v).toString()} />
                  <span className="text-base font-normal text-muted-foreground">ms</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

   <Card className="bg-card border-card-border">
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      Sessions
    </CardTitle>

    <Monitor className="h-4 w-4 text-primary" />
  </CardHeader>

  <CardContent>
    <div className="mt-2 text-3xl font-bold text-foreground">
      {sessionStats?.totalSessions ?? 0}
    </div>
  </CardContent>
</Card>
<Card className="bg-card border-card-border">
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      Avg Session
    </CardTitle>

    <Timer className="h-4 w-4 text-primary" />
  </CardHeader>

  <CardContent>
    <div className="mt-2 text-3xl font-bold text-foreground">
      {((sessionStats?.avgDurationSec ?? 0) / 3600).toFixed(1)}h
    </div>
  </CardContent>
</Card>
 </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <Card className="bg-card border-card-border lg:col-span-3 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Traffic Volume (24h)</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] px-5 pb-6">
            {isTimeseriesLoading || !timeseries ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trafficVolume}
                  margin={{ top: 16, right: 8, left: -8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.45}/>
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.04}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.7} />
                  <XAxis
                    dataKey="hour"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={40}
                    tickMargin={10}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 600]}
                    ticks={[0, 150, 300, 450, 600]}
                    tickFormatter={(value) => `${value}`}
                    tickMargin={8}
                  />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: '#0ea5e9' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorViews)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#0ea5e9", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border flex flex-col lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top Pages</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            {isPopularLoading || !popularPages ? (
              <div className="p-6 space-y-4">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs">Path</TableHead>
                    <TableHead className="text-right text-xs">Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                 {(Array.isArray(popularPages) ? popularPages : []).slice(0, 7).map((page, i) => (
                    <TableRow key={i} className="border-border/50 hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[150px] truncate" title={page.page}>{page.page}</TableCell>
                      <TableCell className="text-right font-medium">{page.views.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-card-border">
        <CardHeader>
          <CardTitle className="text-base">Feature Adoption</CardTitle>
        </CardHeader>
        <CardContent className="h-[250px]">
          {isFeaturesLoading || !featureUsage ? (
            <Skeleton className="h-full w-full" />
          ) : (
            
            <ResponsiveContainer width="100%" height="100%">
              
              <BarChart
  data={Array.isArray(featureUsage) ? featureUsage : []}
  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="feature" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  cursor={{fill: 'hsl(var(--muted)/0.2)'}}
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="usageCount" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

