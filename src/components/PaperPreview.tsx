import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eraser,
  FileDown,
  FileText,
  Image as ImageIcon,
  PenLine,
  Printer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatLength, PAPER_SIZES } from "@/data/sizes";
import { getTemplateSpec } from "@/data/templates";
import { resolvePrintColor } from "@/data/themes";
import { buildSheetSvg } from "@/engine/buildSheetSvg";
import { sanitizeHexColor } from "@/engine/svgHelpers";
import { cn } from "@/lib/utils";
import type { PaperSettings } from "@/types/paper";

interface PaperPreviewProps {
  settings: PaperSettings;
  hasErrors: boolean;
  exporting: string | null;
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
  onChange: (next: PaperSettings, announcement?: string) => void;
  onExportPdf: () => void;
  onExportSvg: (page: number) => void;
  onExportPng: (page: number) => void;
  onExportDocx: () => void;
}

type ZoomOption = "fit" | 0.75 | 1 | 1.25;

const INK_SWATCHES = [
  { color: "#1E293B", label: "Charcoal ink" },
  { color: "#1D4ED8", label: "Royal blue ink" },
  { color: "#B91C1C", label: "Crimson ink" },
  { color: "#15803D", label: "Forest green ink" },
];

const INK_SIZES = [
  { scale: 0.85, label: "S", name: "Small ink size" },
  { scale: 1, label: "M", name: "Medium ink size" },
  { scale: 1.2, label: "L", name: "Large ink size" },
];

export function PaperPreview({
  settings,
  hasErrors,
  exporting,
  isEditing,
  onEditingChange,
  onChange,
  onExportPdf,
  onExportSvg,
  onExportPng,
  onExportDocx,
}: PaperPreviewProps) {
  const [zoom, setZoom] = useState<ZoomOption>("fit");
  const [pageIndex, setPageIndex] = useState(1);
  const [printAllPages, setPrintAllPages] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const totalPages = Math.max(1, Math.min(100, Math.round(settings.pageCount)));
  const safePage = Math.min(Math.max(1, pageIndex), totalPages);
  const pageKey = String(safePage);
  const pageText = settings.pageNotes?.[pageKey] ?? "";

  const tpl = getTemplateSpec(settings.paperType);
  const sizeSpec = PAPER_SIZES.find((s) => s.id === settings.paperSize);
  const sizeName = sizeSpec ? sizeSpec.label.split(" (")[0] : settings.paperSize;

  const { svg, geometry, writingLayout, fittedStepMm, fittedRows } = buildSheetSvg(
    settings,
    safePage,
    { hidePageNotes: isEditing && !isPrinting },
  );

  const resolvedInk = resolvePrintColor(
    sanitizeHexColor(settings.inkColor || "#1E293B", "#1E293B"),
    "text",
    settings.printerType,
  );

  useEffect(() => {
    const handleBeforePrint = () => {
      setIsPrinting(true);
      if (totalPages > 1) setPrintAllPages(true);
    };
    const handleAfterPrint = () => {
      setIsPrinting(false);
      setPrintAllPages(false);
    };
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [totalPages]);

  useEffect(() => {
    if (!isEditing) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const rafId = requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onEditingChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(rafId);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditing, safePage, onEditingChange]);

  const handlePrint = () => {
    setIsPrinting(true);
    if (totalPages > 1) {
      setPrintAllPages(true);
      requestAnimationFrame(() => {
        window.print();
      });
    } else {
      window.print();
    }
  };

  const updateCurrentPageNote = (nextText: string) => {
    const nextNotes = { ...(settings.pageNotes ?? {}) };
    if (nextText.length === 0) {
      delete nextNotes[pageKey];
    } else {
      nextNotes[pageKey] = nextText;
    }
    onChange({ ...settings, pageNotes: nextNotes });
  };

  const aspectRatio = geometry.widthMm / geometry.heightMm;
  const isFit = zoom === "fit";
  const zoomedWidthPx = isFit
    ? undefined
    : Math.round(geometry.widthMm * (isEditing ? 3.8 : 2.8) * zoom);

  const sheetElement = (
    <div
      className="sheet-preview-frame relative bg-white shadow-lg ring-1 ring-black/10"
      style={
        isFit
          ? {
              width: isEditing
                ? `min(calc(100cqw - 1.5rem), calc((100cqh - 1.5rem) * ${aspectRatio.toFixed(5)}))`
                : `min(calc(100cqw - 2rem), calc((100cqh - 2rem) * ${aspectRatio.toFixed(5)}))`,
              aspectRatio: `${geometry.widthMm} / ${geometry.heightMm}`,
            }
          : {
              width: `${zoomedWidthPx}px`,
              maxWidth: "none",
              flexShrink: 0,
              aspectRatio: `${geometry.widthMm} / ${geometry.heightMm}`,
            }
      }
      title={!isEditing ? "Double-click sheet to edit full-screen" : undefined}
      onDoubleClick={() => {
        if (!isEditing) onEditingChange(true);
      }}
    >
      <div
        className="h-full w-full"
        role="img"
        aria-label={`Live preview of ${tpl.name} on ${sizeName}, page ${safePage} of ${totalPages}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      {isEditing && (
        <div
          className="no-print absolute inset-0"
          style={{ containerType: "inline-size" }}
        >
          <textarea
            ref={textareaRef}
            aria-label={`Edit text on ${tpl.name}, page ${safePage}`}
            placeholder={`Write on ${tpl.name}...`}
            value={pageText}
            onChange={(e) => updateCurrentPageNote(e.target.value)}
            spellCheck
            className="absolute resize-none overflow-auto bg-transparent p-0 outline-1 outline-dashed outline-primary/35 focus:outline-primary/60 placeholder:text-muted-foreground/50"
            style={{
              left: `${(writingLayout.xMm / geometry.widthMm) * 100}%`,
              top: `${(writingLayout.yMm / geometry.heightMm) * 100}%`,
              width: `${(writingLayout.widthMm / geometry.widthMm) * 100}%`,
              height: `${(writingLayout.heightMm / geometry.heightMm) * 100}%`,
              fontFamily: '"Atkinson Hyperlegible", Helvetica, Arial, sans-serif',
              fontSize: `calc(${writingLayout.fontSizeMm} * 100cqi / ${geometry.widthMm})`,
              lineHeight: `calc(${writingLayout.stepMm} * 100cqi / ${geometry.widthMm})`,
              paddingTop: `calc(${writingLayout.textareaPaddingTopMm} * 100cqi / ${geometry.widthMm})`,
              color: resolvedInk,
            }}
          />
        </div>
      )}
    </div>
  );

  if (isEditing) {
    return (
      <main
        id="preview-main"
        role="dialog"
        aria-modal="true"
        aria-label={`Full-screen paper editor: ${tpl.name}`}
        className="print-only-main studio-mat fixed inset-0 z-50 flex flex-col"
      >
        <div className="no-print flex shrink-0 justify-center px-3 pt-2.5 pb-1">
          <div
            className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border bg-background/95 px-3 py-1.5 shadow-sm backdrop-blur-xs"
            role="toolbar"
            aria-label="Full-screen paper editor controls"
          >
            <span className="text-muted-foreground hidden px-1 text-xs font-medium md:inline">
              {tpl.name}
            </span>

            <div className="flex items-center gap-1.5" role="group" aria-label="Ink color">
              {INK_SWATCHES.map((swatch) => {
                const active = settings.inkColor.toLowerCase() === swatch.color.toLowerCase();
                return (
                  <button
                    key={swatch.color}
                    type="button"
                    disabled={settings.printerType === "bw"}
                    aria-label={swatch.label}
                    aria-pressed={active}
                    onClick={() =>
                      onChange({ ...settings, inkColor: swatch.color }, `Selected ${swatch.label}.`)
                    }
                    className={cn(
                      "size-5 cursor-pointer rounded-full border transition-transform disabled:opacity-40",
                      active ? "scale-110 ring-2 ring-ring ring-offset-1" : "border-foreground/30",
                    )}
                    style={{ backgroundColor: swatch.color }}
                  />
                );
              })}
            </div>

            <div className="flex items-center gap-0.5" role="group" aria-label="Text size">
              {INK_SIZES.map((sz) => {
                const active = Math.abs((settings.inkFontScale ?? 1) - sz.scale) < 0.05;
                return (
                  <Button
                    key={sz.label}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "ghost"}
                    className="h-7 px-2 text-xs"
                    aria-label={sz.name}
                    aria-pressed={active}
                    onClick={() =>
                      onChange({ ...settings, inkFontScale: sz.scale }, `Selected ${sz.name}.`)
                    }
                  >
                    {sz.label}
                  </Button>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div
                className="flex items-center gap-0.5 rounded-full border bg-muted/40 p-0.5"
                role="group"
                aria-label="Preview page navigation"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 rounded-full"
                  aria-label="Previous preview page"
                  disabled={safePage <= 1}
                  onClick={() => setPageIndex(safePage - 1)}
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <span className="px-1.5 text-xs font-medium tabular-nums">
                  {safePage}/{totalPages}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 rounded-full"
                  aria-label="Next preview page"
                  disabled={safePage >= totalPages}
                  onClick={() => setPageIndex(safePage + 1)}
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            )}

            <div
              className="hidden items-center gap-0.5 rounded-full border bg-muted/40 p-0.5 sm:flex"
              role="group"
              aria-label="Preview zoom"
            >
              {(
                [
                  { id: "fit", label: "Fit" },
                  { id: 0.75, label: "75%" },
                  { id: 1, label: "100%" },
                  { id: 1.25, label: "125%" },
                ] as const
              ).map((z) => (
                <Button
                  key={String(z.id)}
                  type="button"
                  size="sm"
                  variant={zoom === z.id ? "default" : "ghost"}
                  className="h-6 rounded-full px-2 text-xs"
                  aria-pressed={zoom === z.id}
                  onClick={() => setZoom(z.id)}
                >
                  {z.label}
                </Button>
              ))}
            </div>

            {pageText.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => updateCurrentPageNote("")}
              >
                <Eraser className="size-3.5" aria-hidden="true" />
                <span>Clear</span>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              className="h-7 rounded-full px-3 text-xs"
              title="Exit full-screen edit (Esc)"
              onClick={() => onEditingChange(false)}
            >
              <Check aria-hidden="true" />
              <span>Done</span>
            </Button>
          </div>
        </div>

        <div
          className={`print-stage flex min-h-0 flex-1 p-2 sm:p-4 ${
            isFit
              ? "items-center justify-center overflow-hidden"
              : "items-start justify-center overflow-auto"
          } ${printAllPages ? "print:hidden" : ""}`}
          style={isFit ? { containerType: "size" } : undefined}
        >
          {sheetElement}
        </div>

        {printAllPages && (
          <div className="hidden print:block">
            {Array.from({ length: totalPages }, (_, idx) => {
              const pageSvg = buildSheetSvg(settings, idx + 1).svg;
              return (
                <div
                  key={idx + 1}
                  className="sheet-preview-frame print-page-break w-full"
                  dangerouslySetInnerHTML={{ __html: pageSvg }}
                />
              );
            })}
          </div>
        )}
      </main>
    );
  }

  return (
    <main
      id="preview-main"
      className="print-only-main min-w-0 flex-1 lg:sticky lg:top-14"
    >
      <Card className="print-card gap-3 py-3.5">
        <CardHeader className="no-print border-b px-4 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{tpl.name}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {settings.printerType === "bw" ? "B&W Laser" : "Color"}
                </Badge>
                {settings.doubleSided && (
                  <Badge variant="secondary" className="text-xs">
                    {geometry.isBackPage ? "Back Side" : "Front Side"}
                  </Badge>
                )}
                {pageText.trim().length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Edited
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                {sizeName} · {formatLength(geometry.widthMm, settings.units)} ×{" "}
                {formatLength(geometry.heightMm, settings.units)} ·{" "}
                {settings.orientation === "portrait" ? "Portrait" : "Landscape"} ·{" "}
                {fittedRows} rows ({formatLength(fittedStepMm, settings.units)})
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs"
                onClick={() => onEditingChange(true)}
              >
                <PenLine aria-hidden="true" />
                <span>Edit Sheet</span>
              </Button>

              {totalPages > 1 && (
                <div
                  className="flex items-center gap-0.5 rounded-md border bg-muted/40 p-0.5"
                  role="group"
                  aria-label="Preview page navigation"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label="Previous preview page"
                    disabled={safePage <= 1}
                    onClick={() => setPageIndex(safePage - 1)}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <span className="px-1.5 text-xs font-medium tabular-nums">
                    {safePage}/{totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label="Next preview page"
                    disabled={safePage >= totalPages}
                    onClick={() => setPageIndex(safePage + 1)}
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              )}

              <div
                className="flex items-center gap-0.5 rounded-md border bg-muted/40 p-0.5"
                role="group"
                aria-label="Preview zoom"
              >
                {(
                  [
                    { id: "fit", label: "Fit" },
                    { id: 0.75, label: "75%" },
                    { id: 1, label: "100%" },
                    { id: 1.25, label: "125%" },
                  ] as const
                ).map((z) => (
                  <Button
                    key={String(z.id)}
                    type="button"
                    size="sm"
                    variant={zoom === z.id ? "default" : "ghost"}
                    className="h-7 px-2 text-xs"
                    aria-pressed={zoom === z.id}
                    onClick={() => setZoom(z.id)}
                  >
                    {z.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 px-4">
          <div
            className={`print-stage studio-mat flex h-[56vh] min-h-[340px] max-h-[660px] lg:h-[calc(100vh-13.5rem)] rounded-lg border p-3 sm:p-4 ${
              isFit
                ? "items-center justify-center overflow-hidden"
                : "items-start justify-center overflow-auto"
            } ${printAllPages ? "print:hidden" : ""}`}
            style={isFit ? { containerType: "size" } : undefined}
          >
            {sheetElement}
          </div>

          {printAllPages && (
            <div className="hidden print:block">
              {Array.from({ length: totalPages }, (_, idx) => {
                const pageSvg = buildSheetSvg(settings, idx + 1).svg;
                return (
                  <div
                    key={idx + 1}
                    className="sheet-preview-frame print-page-break w-full"
                    dangerouslySetInnerHTML={{ __html: pageSvg }}
                  />
                );
              })}
            </div>
          )}

          <div
            className="no-print flex flex-wrap items-center justify-between gap-2"
            role="group"
            aria-label="Export and print actions"
          >
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                disabled={hasErrors || exporting !== null}
                onClick={onExportPdf}
              >
                <FileDown aria-hidden="true" />
                <span>{exporting === "pdf" ? "Exporting PDF..." : "Export PDF"}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={hasErrors || exporting !== null}
                onClick={() => onExportSvg(safePage)}
              >
                <Download aria-hidden="true" />
                <span>SVG</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={hasErrors || exporting !== null}
                onClick={() => onExportPng(safePage)}
              >
                <ImageIcon aria-hidden="true" />
                <span>{exporting === "png" ? "Rendering..." : "PNG"}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={hasErrors || exporting !== null}
                onClick={onExportDocx}
              >
                <FileText aria-hidden="true" />
                <span>{exporting === "docx" ? "Building..." : "DOCX"}</span>
              </Button>
            </div>

            <Button type="button" size="sm" variant="secondary" disabled={hasErrors} onClick={handlePrint}>
              <Printer aria-hidden="true" />
              <span>Print</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
