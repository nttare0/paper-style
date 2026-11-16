import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PAPER_SIZES } from "@/data/sizes";
import { DEFAULT_PAPER_SETTINGS, getTemplateSpec } from "@/data/templates";
import {
  exportDocxFile,
  exportPdfFile,
  exportPngFile,
  exportSettingsFile,
  exportSvgFile,
  parseImportedSettingsJson,
} from "@/engine/exporters";
import { validatePaperSettings } from "@/engine/geometry";
import type { PaperSettings } from "@/types/paper";
import { ControlPanel } from "./ControlPanel";
import { PaperPreview } from "./PaperPreview";

const STORAGE_KEY = "paperstyle.settings.v1";

function loadInitialSettings(): PaperSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PAPER_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PaperSettings>;
    return {
      ...DEFAULT_PAPER_SETTINGS,
      ...parsed,
      marginsMm: {
        ...DEFAULT_PAPER_SETTINGS.marginsMm,
        ...(parsed.marginsMm ?? {}),
      },
    };
  } catch {
    return DEFAULT_PAPER_SETTINGS;
  }
}

export function PaperCreator() {
  const [settings, setSettings] = useState<PaperSettings>(() => loadInitialSettings());
  const [announcement, setAnnouncement] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota errors in restricted browsing contexts.
    }
  }, [settings]);

  const errors = useMemo(() => validatePaperSettings(settings), [settings]);
  const errorList = Object.values(errors).filter(Boolean) as string[];
  const hasErrors = errorList.length > 0;

  const activeTemplate = getTemplateSpec(settings.paperType);
  const activeSize = PAPER_SIZES.find((s) => s.id === settings.paperSize);

  const handleSettingsChange = (next: PaperSettings, message?: string) => {
    setSettings(next);
    setFeedback(null);
    if (message) setAnnouncement(message);
  };

  const runExport = async (kind: string, fn: () => Promise<void> | void, successMsg: string) => {
    if (hasErrors) return;
    setExporting(kind);
    setFeedback(null);
    try {
      await fn();
      setFeedback({ type: "success", text: successMsg });
      setAnnouncement(successMsg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export failed. Please try again.";
      setFeedback({ type: "error", text: msg });
      setAnnouncement(msg);
    } finally {
      setExporting(null);
    }
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const result = parseImportedSettingsJson(text);
      if (!result.ok) {
        setFeedback({ type: "error", text: result.error });
        setAnnouncement(result.error);
        return;
      }
      setSettings(result.settings);
      const msg = "Imported settings JSON successfully.";
      setFeedback({ type: "success", text: msg });
      setAnnouncement(msg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not read settings JSON.";
      setFeedback({ type: "error", text: msg });
      setAnnouncement(msg);
    }
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      <a
        href="#controls-panel"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to paper controls
      </a>
      <a
        href="#preview-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-52 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to live sheet preview
      </a>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <header className="no-print sticky top-0 z-30 border-b bg-background/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <a href="/">
                <ArrowLeft aria-hidden="true" />
                <span>PaperStyle</span>
              </a>
            </Button>
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">Create Paper</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{activeTemplate.name}</Badge>
            <Badge variant="outline">{activeSize?.label ?? settings.paperSize}</Badge>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] space-y-4 p-4 sm:p-6">
        {hasErrors && (
          <Alert variant="destructive" className="no-print">
            <AlertTriangle aria-hidden="true" />
            <AlertDescription>
              <strong>Fix invalid values before exporting:</strong> {errorList.join(" ")}
            </AlertDescription>
          </Alert>
        )}

        {feedback && (
          <Alert
            variant={feedback.type === "error" ? "destructive" : "success"}
            role="status"
            className="no-print"
          >
            {feedback.type === "error" ? (
              <AlertTriangle aria-hidden="true" />
            ) : (
              <CheckCircle2 aria-hidden="true" />
            )}
            <AlertDescription>{feedback.text}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col items-start gap-6 lg:flex-row">
          <ControlPanel
            settings={settings}
            errors={errors}
            onChange={handleSettingsChange}
            onExportSettings={() => {
              exportSettingsFile(settings);
              setFeedback({ type: "success", text: "Downloaded settings JSON." });
            }}
            onImportSettings={handleImport}
            onReset={() => {
              setSettings(DEFAULT_PAPER_SETTINGS);
              setFeedback({ type: "success", text: "Reset all settings to defaults." });
              setAnnouncement("Reset all settings to defaults.");
            }}
          />

          <PaperPreview
            settings={settings}
            hasErrors={hasErrors}
            exporting={exporting}
            onExportPdf={() =>
              runExport("pdf", () => exportPdfFile(settings), "Exported vector PDF.")
            }
            onExportSvg={(page) =>
              runExport("svg", () => exportSvgFile(settings, page), "Exported SVG sheet.")
            }
            onExportPng={(page) =>
              runExport("png", () => exportPngFile(settings, page), "Exported 300 DPI PNG.")
            }
            onExportDocx={() =>
              runExport("docx", () => exportDocxFile(settings), "Exported Word DOCX.")
            }
            onPrint={() => window.print()}
          />
        </div>
      </div>
    </div>
  );
}
