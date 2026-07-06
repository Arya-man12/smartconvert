import { useState } from "react";
import { CheckCircle2, Download, Loader2, Sparkles } from "lucide-react";
import { useConvertFiles } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDropzone } from "@/components/file-dropzone";
import { formatBytes, conversionLabel } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const CONVERSION_TYPES = [
  { value: "docx-to-pdf", label: "DOCX → PDF", accept: ".docx" },
  { value: "pdf-to-docx", label: "PDF → DOCX", accept: ".pdf" },
  { value: "pdf-to-txt", label: "PDF → TXT", accept: ".pdf" },
  { value: "pdf-to-markdown", label: "PDF → Markdown", accept: ".pdf" },
  { value: "images-to-pdf", label: "Images → PDF", accept: "image/*" },
  { value: "pdf-to-images", label: "PDF → Images", accept: ".pdf" },
] as const;

export default function ConvertPage() {
  const [conversionType, setConversionType] =
    useState<(typeof CONVERSION_TYPES)[number]["value"]>("docx-to-pdf");
  const [files, setFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const convertMutation = useConvertFiles();

  const selected = CONVERSION_TYPES.find((c) => c.value === conversionType)!;

  const handleConvert = () => {
    if (files.length === 0) return;
    convertMutation.mutate(
      { data: { files, conversionType } },
      {
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Conversion failed",
            description: err instanceof Error ? err.message : "Please try again.",
          });
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold" data-testid="text-page-title">
          Convert files
        </h1>
        <p className="text-muted-foreground">
          Turn documents, PDFs, and images into the format you need.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Choose conversion</CardTitle>
          <CardDescription>Pick the source and target format</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={conversionType}
            onValueChange={(v) => {
              setConversionType(v as typeof conversionType);
              setFiles([]);
            }}
          >
            <SelectTrigger data-testid="select-conversion-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONVERSION_TYPES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Upload files</CardTitle>
          <CardDescription>
            {selected.value === "images-to-pdf"
              ? "Add one or more images to combine into a single PDF"
              : "Add the file you want to convert"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            multiple={selected.value === "images-to-pdf"}
            accept={selected.accept}
          />
        </CardContent>
      </Card>

      <Button
        size="lg"
        className="w-full"
        disabled={files.length === 0 || convertMutation.isPending}
        onClick={handleConvert}
        data-testid="button-convert"
      >
        {convertMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Converting…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> Convert {conversionLabel(conversionType)}
          </>
        )}
      </Button>

      {convertMutation.isSuccess && (
        <Card className="border-primary/40" data-testid="card-conversion-result">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Conversion complete
            </CardTitle>
            {convertMutation.data.warning && (
              <CardDescription className="text-accent">
                {convertMutation.data.warning}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {convertMutation.data.outputs.map((output) => (
              <div
                key={output.id}
                className="flex items-center justify-between rounded-lg border bg-card px-3 py-2"
                data-testid={`row-output-${output.id}`}
              >
                <div>
                  <div className="font-medium">{output.fileName}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatBytes(output.fileSize)}
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" data-testid={`button-download-${output.id}`}>
                  <a href={output.downloadUrl} download={output.fileName}>
                    <Download className="h-4 w-4" /> Download
                  </a>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
