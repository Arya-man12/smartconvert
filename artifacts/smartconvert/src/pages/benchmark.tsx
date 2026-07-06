import { useState } from "react";
import { Loader2, Trophy, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useBenchmarkCompress } from "@workspace/api-client-react";
import type { CompressionAlgorithm } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { FileDropzone } from "@/components/file-dropzone";
import { formatBytes, formatMs, formatRatio, algorithmLabel } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const ALGORITHMS: CompressionAlgorithm[] = [
  "zip",
  "gzip",
  "bzip2",
  "lzma",
  "brotli",
  "zstd",
  "lz4",
  "snappy",
];

export default function BenchmarkPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [selected, setSelected] = useState<Set<CompressionAlgorithm>>(
    new Set(["gzip", "brotli", "zstd", "lz4"]),
  );
  const { toast } = useToast();
  const benchmarkMutation = useBenchmarkCompress();

  const toggle = (algo: CompressionAlgorithm) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(algo)) next.delete(algo);
      else next.add(algo);
      return next;
    });
  };

  const handleRun = () => {
    if (files.length === 0 || selected.size === 0) return;
    benchmarkMutation.mutate(
      { data: { files, algorithms: Array.from(selected).join(",") } },
      {
        onError: (err) =>
          toast({
            variant: "destructive",
            title: "Benchmark failed",
            description: err instanceof Error ? err.message : "Please try again.",
          }),
      },
    );
  };

  const chartData = benchmarkMutation.data?.entries.map((e) => ({
    algorithm: algorithmLabel(e.algorithm),
    ratio: Number(e.compressionRatio.toFixed(2)),
    timeMs: Number(e.compressionTimeMs.toFixed(2)),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold" data-testid="text-page-title">
          Benchmark algorithms
        </h1>
        <p className="text-muted-foreground">
          Compare compression ratio, speed, and memory use across algorithms side by side.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Choose algorithms</CardTitle>
          <CardDescription>Select which algorithms to compare</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ALGORITHMS.map((algo) => (
              <div key={algo} className="flex items-center gap-2">
                <Checkbox
                  id={`algo-${algo}`}
                  checked={selected.has(algo)}
                  onCheckedChange={() => toggle(algo)}
                  data-testid={`checkbox-algo-${algo}`}
                />
                <Label htmlFor={`algo-${algo}`} className="cursor-pointer">
                  {algorithmLabel(algo)}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Upload file</CardTitle>
          <CardDescription>Add the file to benchmark</CardDescription>
        </CardHeader>
        <CardContent>
          <FileDropzone files={files} onFilesChange={setFiles} multiple={false} />
        </CardContent>
      </Card>

      <Button
        size="lg"
        className="w-full"
        disabled={files.length === 0 || selected.size === 0 || benchmarkMutation.isPending}
        onClick={handleRun}
        data-testid="button-run-benchmark"
      >
        {benchmarkMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Running benchmark…
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" /> Run benchmark
          </>
        )}
      </Button>

      {benchmarkMutation.isSuccess && (
        <div className="space-y-6" data-testid="card-benchmark-result">
          <Card className="border-primary/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-5 w-5 text-primary" /> Best: {algorithmLabel(benchmarkMutation.data.bestAlgorithm)}
              </CardTitle>
              <CardDescription>
                {benchmarkMutation.data.fileName} — {formatBytes(benchmarkMutation.data.originalSize)} original
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  ratio: { label: "Compression ratio", color: "hsl(var(--chart-1))" },
                }}
                className="h-64 w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="algorithm" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="ratio" fill="var(--color-ratio)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed results</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Algorithm</TableHead>
                    <TableHead>Compressed size</TableHead>
                    <TableHead>Ratio</TableHead>
                    <TableHead>Compress time</TableHead>
                    <TableHead>Decompress time</TableHead>
                    <TableHead>Memory</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...benchmarkMutation.data.entries]
                    .sort((a, b) => b.compressionRatio - a.compressionRatio)
                    .map((entry) => (
                      <TableRow key={entry.algorithm} data-testid={`row-benchmark-${entry.algorithm}`}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {algorithmLabel(entry.algorithm)}
                            {entry.algorithm === benchmarkMutation.data.bestAlgorithm && (
                              <Badge>Best</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatBytes(entry.compressedSize)}</TableCell>
                        <TableCell>{formatRatio(entry.compressionRatio)}</TableCell>
                        <TableCell>{formatMs(entry.compressionTimeMs)}</TableCell>
                        <TableCell>{formatMs(entry.decompressionTimeMs)}</TableCell>
                        <TableCell>
                          {entry.memoryUsageKb != null ? `${entry.memoryUsageKb.toFixed(0)} KB` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
