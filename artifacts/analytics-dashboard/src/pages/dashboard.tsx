import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Users, Activity, AlertTriangle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(protocol + '//' + window.location.host + '/ws');
    
    ws.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetPageViewsOverTimeQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetPopularPagesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetFeatureUsageQueryKey() });
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

  return (
    <div className="flex-1 overflow-auto bg-background p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Cockpit</h1>
          <p className="text-muted-foreground mt-1">Real-time system telemetry and analytics.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
          </span>
          <span className="text-success">Live Connection Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                <AnimatedNumber value={stats.activeUsers} format={(v) => Math.round(v).toLocaleString()} />
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
                <AnimatedNumber value={stats.totalPageViews} format={(v) => Math.round(v).toLocaleString()} />
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
                  <AnimatedNumber value={stats.errorRate} format={(v) => v.toFixed(2) + "%"} className={stats.errorRate > 5 ? "text-destructive" : stats.errorRate > 2 ? "text-warning" : "text-success"} />
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
                  <AnimatedNumber value={stats.avgResponseMs} format={(v) => Math.round(v).toString()} />
                  <span className="text-base font-normal text-muted-foreground">ms</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="bg-card border-card-border lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">Traffic Volume (24h)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            {isTimeseriesLoading || !timeseries ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                  />
                  <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border flex flex-col">
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
                  {popularPages.slice(0, 7).map((page, i) => (
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
              <BarChart data={featureUsage} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
