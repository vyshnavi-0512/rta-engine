import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetRecentEvents, getGetRecentEventsQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export default function EventsFeed() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const WS_URL = API_BASE_URL.replace(/^http/, "ws");

const ws = new WebSocket(`${WS_URL}/ws`);
    
    ws.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: getGetRecentEventsQueryKey() });
    };

    return () => {
      ws.close();
    };
  }, [queryClient]);

  const { data: events, isLoading } = useGetRecentEvents({
    query: { queryKey: getGetRecentEventsQueryKey(), refetchInterval: 3000 }
  });

  const getEventBadgeColor = (type: string) => {
    switch (type) {
      case 'error': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'page_view': return 'bg-primary/20 text-primary border-primary/30';
      case 'button_click': return 'bg-chart-2/20 text-chart-2 border-chart-2/30';
      case 'feature_use': return 'bg-chart-5/20 text-chart-5 border-chart-5/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-background p-6 flex flex-col">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Live Events Stream</h1>
        <p className="text-muted-foreground text-sm">Real-time unaggregated event firehose.</p>
      </div>

      <div className="flex-1 border border-border rounded-lg bg-card overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-card sticky top-0 z-10 shadow-[0_1px_0_hsl(var(--border))]">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[150px]">Type</TableHead>
                <TableHead className="w-[200px]">User ID</TableHead>
                <TableHead>Path</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || !events ? (
                Array.from({ length: 15 }).map((_, i) => (
                  <TableRow key={i} className="border-border/50">
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  </TableRow>
                ))
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                    No recent events found
                  </TableCell>
                </TableRow>
              ) : (
               (Array.isArray(events) ? events : []).map((event) => (
                  <TableRow key={event.id} className="border-border/50 hover:bg-muted/30 transition-colors font-mono text-sm">
                    <TableCell className="text-muted-foreground">
                      {format(new Date(event.timestamp), "MMM dd, HH:mm:ss.SSS")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-mono font-medium border ${getEventBadgeColor(event.event)}`}>
                        {event.event}
                      </Badge>
                    </TableCell>
                    <TableCell className="truncate max-w-[200px]" title={event.userId}>
                      {event.userId}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {event.page || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
