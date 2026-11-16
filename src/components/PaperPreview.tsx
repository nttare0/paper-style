import { useEffect, useState } from "react";
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
}: PaperPreviewProps) {
  const [zoom, setZoom] = useState<ZoomOption>("fit");
  const [pageIndex, setPageIndex] = useState(1);
  const [printAllPages, setPrintAllPages] = useState(false);

  const totalPages = Math.max(1, Math.min(100, Math.round(settings.pageCount)));
  const safePage = Math.min(Math.max(1, pageIndex), totalPages);
  const tpl = getTemplateSpec(settings.paperType);
  const sizeSpec = PAPER_SIZES.find((s) => s.id === settings.paperSize);
  const sizeName = sizeSpec ? sizeSpec.label.split(" (")[0] : settings.paperSize;
  const { svg, geometry, fittedStepMm, fittedRows } = buildSheetSvg(settings, safePage);

  useEffect(() => {
    const handleBeforePrint = () => {
      if (totalPages > 1) setPrintAllPages(true);
    };
    const handleAfterPrint = () => setPrintAllPages(false);
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [totalPages]);

  const handlePrint = () => {
    if (totalPages > 1) {
      setPrintAllPages(true);
      requestAnimationFrame(() => {
        window.print();
      });
    } else {
      window.print();
    }
  };

  const sheetMaxWidth =
    zoom === "fit" ? "490px" : `${Math.round(geometry.widthMm * 2.8 * zoom)}px`;

  return (
    <main
      id="preview-main"
      className="print-only-main min-w-0 flex-1 lg:sticky lg:top-16"
    >
      <Card className="print-card gap-3.5 py-4">
        <CardHeader className="no-print border-b px-4 pb-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
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
              </div>
              <CardDescription className="text-xs">
                {sizeName} · {formatLength(geometry.widthMm, settings.units)} ×{" "}
                {formatLength(geometry.heightMm, settings.units)} ·{" "}
                {settings.orientation === "portrait" ? "Portrait" : "Landscape"} ·{" "}
                {fittedRows} rows ({formatLength(fittedStepMm, settings.units)})
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
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

        <CardContent className="space-y-3.5 px-4">
          <div
            className={`print-stage studio-mat flex max-h-[65vh] justify-center overflow-auto rounded-lg border p-4 sm:p-6 ${
              printAllPages ? "print:hidden" : ""
            }`}
          >
            <div
              className="sheet-preview-frame w-full bg-white shadow-lg ring-1 ring-black/10"
              style={{ maxWidth: sheetMaxWidth }}
              role="img"
              aria-label={`Live preview of ${tpl.name} on ${sizeName}, page ${safePage} of ${totalPages}`}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
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
