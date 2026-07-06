import {
  ArrowLeftRight,
  FileArchive,
  Gauge,
  Loader2,
  Trash2,
  Wand2,
} from "lucide-react";
import {
  useListHistory,
  useClearHistory,
  useDeleteHistoryEntry,
  getListHistoryQueryKey,
} from "@workspace/api-client-react";
import type { HistoryEntry } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/format";

const TYPE_ICONS: Record<HistoryEntry["type"], typeof ArrowLeftRight> = {
  convert: ArrowLeftRight,
  compress: FileArchive,
  adaptive: Wand2,
  benchmark: Gauge,
};

const TYPE_LABELS: Record<HistoryEntry["type"], string> = {
  convert: "Conversion",
  compress: "Compression",
  adaptive: "Adaptive",
  benchmark: "Benchmark",
};

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const historyQuery = useListHistory();
  const clearMutation = useClearHistory({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListHistoryQueryKey() }),
    },
  });
  const deleteMutation = useDeleteHistoryEntry({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListHistoryQueryKey() }),
    },
  });

  const entries = historyQuery.data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold" data-testid="text-page-title">
            History
          </h1>
          <p className="text-muted-foreground">
            Recent conversions, compressions, and benchmarks.
          </p>
        </div>
        {entries.length > 0 && (
          <Button
            variant="outline"
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
            data-testid="button-clear-history"
          >
            {clearMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Clear all
          </Button>
        )}
      </div>

      {historyQuery.isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!historyQuery.isLoading && entries.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No activity yet. Convert or compress a file to see it here.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {entries.map((entry) => {
          const Icon = TYPE_ICONS[entry.type];
          return (
            <Card key={entry.id} data-testid={`row-history-${entry.id}`}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{entry.summary}</CardTitle>
                    {entry.detail && (
                      <CardDescription className="mt-1">{entry.detail}</CardDescription>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => deleteMutation.mutate({ id: entry.id })}
                  data-testid={`button-delete-history-${entry.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="flex items-center gap-2 pt-0">
                <Badge variant="secondary">{TYPE_LABELS[entry.type]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(entry.createdAt)}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
