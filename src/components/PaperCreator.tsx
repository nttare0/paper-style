import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileDown,
  PenLine,
  SlidersHorizontal,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
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
      pageNotes: {
        ...DEFAULT_PAPER_SETTINGS.pageNotes,
        ...(parsed.pageNotes ?? {}),
      },
      pageTextBlocks: {
        ...DEFAULT_PAPER_SETTINGS.pageTextBlocks,
        ...(parsed.pageTextBlocks ?? {}),
      },
      pageFields: {
        ...DEFAULT_PAPER_SETTINGS.pageFields,
        ...(parsed.pageFields ?? {}),
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
  const [isEditing, setIsEditing] = useState(false);
  const [mobilePane, setMobilePane] = useState<"customize" | "preview">("customize");
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
  const activeSizeName = activeSize ? activeSize.label.split(" (")[0] : settings.paperSize;

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
    <div className="bg-background text-foreground min-h-dvh">
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

      <header
        className={`no-print sticky top-0 z-30 border-b bg-background/95 backdrop-blur-xs ${
          isEditing ? "hidden" : ""
        }`}
      >
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-6 sm:py-2.5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <Button asChild variant="outline" size="sm">
              <a href="/">
                <ArrowLeft aria-hidden="true" />
                <span>PaperStyle</span>
              </a>
            </Button>
            <Separator orientation="vertical" className="hidden h-4 sm:block" />
            <h1 className="text-base font-bold tracking-tight sm:text-lg">Create Paper</h1>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="max-w-[170px] truncate sm:max-w-none">
              {activeTemplate.name}
            </Badge>
            <Badge variant="outline">{activeSizeName}</Badge>
          </div>
        </div>
      </header>

      <div
        className={
          isEditing
            ? "p-0"
            : "mx-auto max-w-[1440px] space-y-3 px-3 py-3 pb-20 sm:px-6 md:pb-5"
        }
      >
        {!isEditing && (
          <nav
            aria-label="Mobile workspace view"
            className="no-print bg-muted/80 grid grid-cols-2 gap-1 rounded-lg border p-1 md:hidden"
          >
            <Button
              type="button"
              size="sm"
              variant={mobilePane === "customize" ? "default" : "ghost"}
              aria-pressed={mobilePane === "customize"}
              onClick={() => setMobilePane("customize")}
              className="h-9 text-xs font-semibold"
            >
              <SlidersHorizontal aria-hidden="true" />
              <span>Customize</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mobilePane === "preview" ? "default" : "ghost"}
              aria-pressed={mobilePane === "preview"}
              onClick={() => setMobilePane("preview")}
              className="h-9 text-xs font-semibold"
            >
              <Eye aria-hidden="true" />
              <span>Sheet Preview</span>
            </Button>
          </nav>
        )}

        {hasErrors && !isEditing && (
          <Alert variant="destructive" className="no-print py-2.5">
            <AlertTriangle aria-hidden="true" />
            <AlertDescription>
              <strong>Fix invalid values before exporting:</strong> {errorList.join(" ")}
            </AlertDescription>
          </Alert>
        )}

        {feedback && !isEditing && (
          <Alert
            variant={feedback.type === "error" ? "destructive" : "success"}
            role="status"
            className="no-print py-2.5"
          >
            {feedback.type === "error" ? (
              <AlertTriangle aria-hidden="true" />
            ) : (
              <CheckCircle2 aria-hidden="true" />
            )}
            <AlertDescription>{feedback.text}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col items-start gap-4 md:flex-row lg:gap-5">
          <div
            className={cn(
              isEditing
                ? "hidden"
                : mobilePane === "customize"
                  ? "w-full md:w-auto md:shrink-0"
                  : "max-md:hidden md:w-auto md:shrink-0",
            )}
          >
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
          </div>

          <div
            className={cn(
              "min-w-0 w-full flex-1",
              !isEditing && mobilePane !== "preview" && "max-md:hidden",
            )}
          >
            <PaperPreview
              settings={settings}
              hasErrors={hasErrors}
              exporting={exporting}
              isEditing={isEditing}
              onEditingChange={(editing) => {
                setIsEditing(editing);
                setAnnouncement(
                  editing
                    ? `Entered full-screen editing for ${activeTemplate.name}. Press Escape or Done to return.`
                    : "Exited full-screen sheet editing.",
                );
              }}
              onChange={handleSettingsChange}
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
            />
          </div>
        </div>
      </div>

      {!isEditing && mobilePane === "customize" && (
        <div className="no-print fixed right-3 bottom-3 left-3 z-20 md:hidden">
          <div className="mx-auto flex max-w-md items-center justify-between gap-2 rounded-xl border bg-background/95 p-2 shadow-lg backdrop-blur-sm">
            <div className="min-w-0 pl-1">
              <p className="truncate text-xs font-semibold">{activeTemplate.name}</p>
              <p className="text-muted-foreground truncate text-[11px]">{activeSizeName}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 px-2.5 text-xs"
                onClick={() => {
                  setMobilePane("preview");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <Eye aria-hidden="true" />
                <span>View Sheet</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-9 px-2.5 text-xs"
                aria-label="Write directly on sheet"
                onClick={() => setIsEditing(true)}
              >
                <PenLine aria-hidden="true" />
                <span>Write</span>
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 px-2.5 text-xs"
                aria-label="Download vector PDF"
                disabled={hasErrors || exporting !== null}
                onClick={() =>
                  runExport("pdf", () => exportPdfFile(settings), "Exported vector PDF.")
                }
              >
                <FileDown aria-hidden="true" />
                <span>PDF</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
