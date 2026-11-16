import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  FileText,
  Image as ImageIcon,
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
import { buildSheetSvg } from "@/engine/buildSheetSvg";
import type { PaperSettings } from "@/types/paper";

interface PaperPreviewProps {
  settings: PaperSettings;
  hasErrors: boolean;
  exporting: string | null;
  onExportPdf: () => void;
  onExportSvg: (page: number) => void;
  onExportPng: (page: number) => void;
  onExportDocx: () => void;
  onPrint: () => void;
}

type ZoomOption = "fit" | 0.75 | 1 | 1.25;

export function PaperPreview({
  settings,
  hasErrors,
  exporting,
  onExportPdf,
  onExportSvg,
  onExportPng,
  onExportDocx,
  onPrint,
}: PaperPreviewProps) {
  const [zoom, setZoom] = useState<ZoomOption>("fit");
  const [pageIndex, setPageIndex] = useState(1);

  const safePage = Math.min(Math.max(1, pageIndex), Math.max(1, settings.pageCount));
  const tpl = getTemplateSpec(settings.paperType);
  const sizeSpec = PAPER_SIZES.find((s) => s.id === settings.paperSize);
  const { svg, geometry, fittedStepMm, fittedRows } = buildSheetSvg(settings, safePage);

  const sheetMaxWidth =
    zoom === "fit" ? "580px" : `${Math.round(geometry.widthMm * 3.1 * zoom)}px`;

  return (
    <main
      id="preview-main"
      className="print-only-main min-w-0 flex-1 space-y-4 lg:sticky lg:top-20"
    >
      <Card>
        <CardHeader className="no-print border-b pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{tpl.name}</CardTitle>
                <Badge variant="outline">
                  {settings.printerType === "bw" ? "B&W Laser" : "Color"}
                </Badge>
                {settings.doubleSided && (
                  <Badge variant="secondary">
                    {geometry.isBackPage ? "Back Side" : "Front Side"}
                  </Badge>
                )}
              </div>
              <CardDescription>
                {sizeSpec?.label ?? settings.paperSize} (
                {formatLength(geometry.widthMm, settings.units)} ×{" "}
                {formatLength(geometry.heightMm, settings.units)}) ·{" "}
                {settings.orientation === "portrait" ? "Portrait" : "Landscape"}
              </CardDescription>
              <p className="text-muted-foreground text-xs">
                {settings.layoutMode === "fill" ? "Fill to margins" : "Fixed spacing"} ·{" "}
                {fittedRows} rows · {formatLength(fittedStepMm, settings.units)} step
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {settings.pageCount > 1 && (
                <div
                  className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1"
                  role="group"
                  aria-label="Preview page navigation"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Previous preview page"
                    disabled={safePage <= 1}
                    onClick={() => setPageIndex(safePage - 1)}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <span className="px-2 text-xs font-medium tabular-nums">
                    Page {safePage} / {settings.pageCount}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Next preview page"
                    disabled={safePage >= settings.pageCount}
                    onClick={() => setPageIndex(safePage + 1)}
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              )}

              <div
                className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1"
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
                    className="h-8 px-2.5 text-xs"
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

        <CardContent className="space-y-4">
          <div className="print-stage studio-mat flex max-h-[72vh] justify-center overflow-auto rounded-lg border p-5 sm:p-8">
            <div
              className="sheet-preview-frame w-full bg-white shadow-xl ring-1 ring-black/10"
              style={{ maxWidth: sheetMaxWidth }}
              role="img"
              aria-label={`Live preview of ${tpl.name} on ${sizeSpec?.label ?? settings.paperSize}, page ${safePage} of ${settings.pageCount}`}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>

          <div
            className="no-print flex flex-wrap items-center justify-between gap-2 pt-1"
            role="group"
            aria-label="Export and print actions"
          >
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={hasErrors || exporting !== null}
                onClick={onExportPdf}
              >
                <FileDown aria-hidden="true" />
                <span>{exporting === "pdf" ? "Exporting PDF..." : "Export PDF"}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={hasErrors || exporting !== null}
                onClick={() => onExportSvg(safePage)}
              >
                <Download aria-hidden="true" />
                <span>Export SVG</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={hasErrors || exporting !== null}
                onClick={() => onExportPng(safePage)}
              >
                <ImageIcon aria-hidden="true" />
                <span>{exporting === "png" ? "Rendering PNG..." : "Export PNG"}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={hasErrors || exporting !== null}
                onClick={onExportDocx}
              >
                <FileText aria-hidden="true" />
                <span>{exporting === "docx" ? "Building DOCX..." : "Export DOCX"}</span>
              </Button>
            </div>

            <Button type="button" variant="secondary" disabled={hasErrors} onClick={onPrint}>
              <Printer aria-hidden="true" />
              <span>Print</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
