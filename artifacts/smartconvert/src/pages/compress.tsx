import { useState } from "react";
import {
  CheckCircle2,
  Download,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useCompressFiles, useAdaptiveCompress } from "@workspace/api-client-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function CompressPage() {
  const [mode, setMode] = useState<"manual" | "adaptive">("manual");
  const [algorithm, setAlgorithm] = useState<CompressionAlgorithm>("gzip");
  const [files, setFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const compressMutation = useCompressFiles();
  const adaptiveMutation = useAdaptiveCompress();

  const activeMutation = mode === "manual" ? compressMutation : adaptiveMutation;

  const handleCompress = () => {
    if (files.length === 0) return;
    if (mode === "manual") {
      compressMutation.mutate(
        { data: { files, algorithm } },
        {
          onError: (err) =>
            toast({
              variant: "destructive",
              title: "Compression failed",
              description: err instanceof Error ? err.message : "Please try again.",
            }),
        },
      );
    } else {
      adaptiveMutation.mutate(
        { data: { files } },
        {
          onError: (err) =>
            toast({
              variant: "destructive",
              title: "Compression failed",
              description: err instanceof Error ? err.message : "Please try again.",
            }),
        },
      );
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold" data-testid="text-page-title">
          Compress files
        </h1>
        <p className="text-muted-foreground">
          Shrink files with a specific algorithm, or let SmartConvert pick the best one.
        </p>
      </div>

      <Tabs
        value={mode}
        onValueChange={(v) => {
          setMode(v as typeof mode);
          setFiles([]);
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual" data-testid="tab-manual">
            Choose algorithm
          </TabsTrigger>
          <TabsTrigger value="adaptive" data-testid="tab-adaptive">
            <Wand2 className="h-4 w-4" /> Adaptive
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Choose algorithm</CardTitle>
              <CardDescription>Select the compression algorithm to use</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as CompressionAlgorithm)}>
                <SelectTrigger data-testid="select-algorithm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALGORITHMS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {algorithmLabel(a)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adaptive" className="mt-4">
          <Card className="border-accent/40 bg-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wand2 className="h-4 w-4 text-accent" /> Adaptive compression
              </CardTitle>
              <CardDescription>
                SmartConvert analyzes your file's content and picks the best-fitting algorithm automatically.
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>2. Upload file</CardTitle>
          <CardDescription>Add the file you want to compress</CardDescription>
        </CardHeader>
        <CardContent>
          <FileDropzone files={files} onFilesChange={setFiles} multiple={false} />
        </CardContent>
      </Card>

      <Button
        size="lg"
        className="w-full"
        disabled={files.length === 0 || activeMutation.isPending}
        onClick={handleCompress}
        data-testid="button-compress"
      >
        {activeMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Compressing…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {mode === "manual" ? `Compress with ${algorithmLabel(algorithm)}` : "Auto-compress"}
          </>
        )}
      </Button>

      {compressMutation.isSuccess && mode === "manual" && (
        <ResultCard
          fileName={compressMutation.data.fileName}
          algorithm={compressMutation.data.algorithm}
          originalSize={compressMutation.data.originalSize}
          compressedSize={compressMutation.data.compressedSize}
          compressionRatio={compressMutation.data.compressionRatio}
          compressionTimeMs={compressMutation.data.compressionTimeMs}
          downloadUrl={compressMutation.data.downloadUrl}
        />
      )}

      {adaptiveMutation.isSuccess && mode === "adaptive" && (
        <div className="space-y-4">
          <ResultCard
            fileName={adaptiveMutation.data.fileName}
            algorithm={adaptiveMutation.data.algorithm}
            originalSize={adaptiveMutation.data.originalSize}
            compressedSize={adaptiveMutation.data.compressedSize}
            compressionRatio={adaptiveMutation.data.compressionRatio}
            compressionTimeMs={adaptiveMutation.data.compressionTimeMs}
            downloadUrl={adaptiveMutation.data.downloadUrl}
          />
          <Card className="border-accent/40" data-testid="card-adaptive-reasoning">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wand2 className="h-4 w-4 text-accent" /> Why {algorithmLabel(adaptiveMutation.data.algorithm)}?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {adaptiveMutation.data.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="secondary">
                  Entropy: {adaptiveMutation.data.analysis.entropy.toFixed(2)} bits/byte
                </Badge>
                <Badge variant="secondary">
                  {adaptiveMutation.data.analysis.isText ? "Text content" : "Binary content"}
                </Badge>
                {adaptiveMutation.data.analysis.alreadyCompressed && (
                  <Badge variant="secondary">Already compressed</Badge>
                )}
                <Badge variant="secondary">{adaptiveMutation.data.analysis.mimeType}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ResultCard(props: {
  fileName: string;
  algorithm: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionTimeMs: number;
  downloadUrl: string;
}) {
  const savedPct = Math.max(
    0,
    Math.round((1 - props.compressedSize / props.originalSize) * 100),
  );
  return (
    <Card className="border-primary/40" data-testid="card-compression-result">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className="h-5 w-5 text-primary" /> {algorithmLabel(props.algorithm)} — {savedPct}% smaller
        </CardTitle>
        <CardDescription>{props.fileName}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Original" value={formatBytes(props.originalSize)} />
          <Stat label="Compressed" value={formatBytes(props.compressedSize)} />
          <Stat label="Ratio" value={formatRatio(props.compressionRatio)} />
          <Stat label="Time" value={formatMs(props.compressionTimeMs)} />
        </div>
        <Button asChild className="mt-4 w-full" variant="outline" data-testid="button-download-compressed">
          <a href={props.downloadUrl} download>
            <Download className="h-4 w-4" /> Download compressed file
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
