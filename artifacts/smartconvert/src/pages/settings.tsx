import { Moon, Sun, Monitor } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold" data-testid="text-page-title">
          Settings
        </h1>
        <p className="text-muted-foreground">Customize how SmartConvert looks and behaves.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose a light, dark, or system theme.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                data-testid={`button-theme-${option.value}`}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors",
                  theme === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <option.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>SmartConvert is a file conversion and compression toolkit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Convert between DOCX, PDF, images, and text/Markdown formats, and compress files
            using zip, gzip, bzip2, lzma, brotli, zstd, lz4, or snappy.
          </p>
          <p>
            Adaptive mode inspects file entropy and content type to recommend the best algorithm,
            and Benchmark mode lets you compare algorithms head-to-head.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" disabled data-testid="button-app-version">
          v0.1.0
        </Button>
      </div>
    </div>
  );
}
