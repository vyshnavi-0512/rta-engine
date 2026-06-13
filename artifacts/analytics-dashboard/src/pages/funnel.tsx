import { useGetDropOffFunnel, getGetDropOffFunnelQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Bar, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownRight } from "lucide-react";

export default function UserFunnel() {
  const { data: funnel, isLoading } = useGetDropOffFunnel({
    query: { queryKey: getGetDropOffFunnelQueryKey(), refetchInterval: 10000 }
  });
console.log("funnel =", funnel);
console.log("type =", typeof funnel);
console.log("keys =", funnel ? Object.keys(funnel) : null);
console.log("json =", JSON.stringify(funnel, null, 2));
console.log("isArray =", Array.isArray(funnel));
  return (
    <div className="flex-1 overflow-auto bg-background p-6">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">User Funnel</h1>
        <p className="text-muted-foreground text-sm">Conversion rates across core product flow.</p>
      </div>

      <Card className="bg-card border-card-border">
        <CardHeader>
          <CardTitle className="text-base font-medium">Core Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] mt-4">
            {isLoading || !funnel ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Array.isArray(funnel) ? funnel : []} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="step" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={13} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <RechartsTooltip
                    cursor={{fill: 'hsl(var(--muted)/0.1)'}}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    formatter={(value: number, name: string) => [value.toLocaleString(), 'Users']}
                  />
                  <Bar dataKey="users" radius={[4, 4, 0, 0]} maxBarSize={80}>
                    {(Array.isArray(funnel) ? funnel : []).map((entry, index) => {
                      // Gradient from primary to chart-4 based on position in funnel
                      const opacity = 1 - (index * 0.15);
                      return <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${Math.max(opacity, 0.3)})`} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
            {isLoading || !funnel ? (
               Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
           ) : (
  (Array.isArray(funnel) ? funnel : []).map((step, idx) => (
                <div key={idx} className="bg-muted/20 border border-border rounded-md p-4 flex flex-col items-center justify-center text-center relative group">
                  <div className="text-sm font-medium text-muted-foreground mb-2">{step.step}</div>
                  <div className="text-2xl font-bold text-foreground">{step.users.toLocaleString()}</div>
                  {idx > 0 && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-destructive/10 text-destructive text-xs font-bold px-2 py-0.5 rounded-full flex items-center border border-destructive/20 shadow-sm z-10">
                      <ArrowDownRight className="w-3 h-3 mr-0.5" />
                      {step.dropOff.toFixed(1)}% drop
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
