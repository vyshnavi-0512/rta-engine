import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useIngestEvent, getGetStatsQueryKey, getGetRecentEventsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, Terminal } from "lucide-react";

const formSchema = z.object({
  event: z.string().min(1, "Event type is required"),
  userId: z.string().min(1, "User ID is required"),
  page: z.string().optional(),
});

export default function EventIngester() {
  const [response, setResponse] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const ingestEvent = useIngestEvent();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      event: "page_view",
      userId: `user_${Math.floor(Math.random() * 10000)}`,
      page: "/landing",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setResponse("Sending...");
    ingestEvent.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setResponse(JSON.stringify(data, null, 2));
          toast({
            title: "Event Ingested",
            description: `Successfully sent ${values.event} event.`,
          });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetRecentEventsQueryKey() });
          
          // Randomize user id for next test
          form.setValue("userId", `user_${Math.floor(Math.random() * 10000)}`);
        },
        onError: (error) => {
          setResponse(JSON.stringify(error, null, 2));
          toast({
            variant: "destructive",
            title: "Ingestion Failed",
            description: "Failed to send event to the API.",
          });
        },
      }
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background p-6">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Event Ingester</h1>
        <p className="text-muted-foreground text-sm">Manually post events to test the telemetry pipeline.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-card-border">
          <CardHeader>
            <CardTitle>Send Payload</CardTitle>
            <CardDescription>Construct a synthetic event payload.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="event"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-input">
                            <SelectValue placeholder="Select an event type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-popover-border">
                          <SelectItem value="page_view">page_view</SelectItem>
                          <SelectItem value="button_click">button_click</SelectItem>
                          <SelectItem value="feature_use">feature_use</SelectItem>
                          <SelectItem value="error">error</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User ID</FormLabel>
                      <FormControl>
                        <Input placeholder="user_123" className="bg-background border-input font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="page"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Page Path (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="/dashboard" className="bg-background border-input font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={ingestEvent.isPending}>
                  {ingestEvent.isPending ? "Transmitting..." : (
                    <>
                      <Send className="mr-2 h-4 w-4" /> Fire Event
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" /> Response Log
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            <div className="bg-black/50 border border-border rounded-md p-4 h-full font-mono text-xs overflow-auto text-muted-foreground whitespace-pre-wrap">
              {response || "Ready to receive API response..."}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
