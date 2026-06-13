import { useGetApiPerformance, getGetApiPerformanceQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/animated-number";

export default function ApiPerformance() {
  const { data: performance, isLoading } = useGetApiPerformance({
    query: { queryKey: getGetApiPerformanceQueryKey(), refetchInterval: 5000 }
  });

  const sortedPerformance = performance ? [...performance].sort((a, b) => b.avgMs - a.avgMs) : [];
console.log("performance =", JSON.stringify(performance, null, 2));
console.log("type =", typeof performance);
  const getMsColorClass = (ms: number) => {
    if (ms > 1000) return 'text-destructive font-bold';
    if (ms > 500) return 'text-warning font-bold';
    return 'text-success';
  };
  return (
    <div className="flex-1 overflow-auto bg-background p-6">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">API Performance</h1>
        <p className="text-muted-foreground text-sm">Endpoint latency and error rates across the stack.</p>
      </div>

      <Card className="bg-card border-card-border overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-border">
          <CardTitle className="text-base font-medium">Endpoint Latency Ranking</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="pl-6 w-[300px]">Endpoint</TableHead>
                <TableHead className="text-right">Total Calls</TableHead>
                <TableHead className="text-right">Avg Resp</TableHead>
                <TableHead className="text-right">p95 Resp</TableHead>
                <TableHead className="text-right pr-6">Error Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || !sortedPerformance ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-border/50">
                    <TableCell className="pl-6"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell className="text-right pr-6"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                sortedPerformance.map((stat, i) => (
                  <TableRow key={i} className="border-border/50 hover:bg-muted/30">
                    <TableCell className="pl-6 font-mono text-sm text-foreground">{stat.endpoint}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                     {Number(stat.calls ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={getMsColorClass(stat.avgMs)}>{Math.round(stat.avgMs)} ms</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={getMsColorClass(stat.p95Ms)}>{Math.round(stat.p95Ms)} ms</span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <span className={stat.errorRate > 5 ? 'text-destructive font-bold' : stat.errorRate > 0 ? 'text-warning' : 'text-success'}>
                        {Number(stat.errorRate ?? 0).toFixed(2)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
