import { useCallback, useEffect, useRef, useState } from "react";
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
  X,
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
import {
  computeBlockMetrics,
  computeFontMetricsForStep,
  createBlockAtPoint,
  isSingleFlowPaperType,
} from "@/engine/writingBox";
import { cn } from "@/lib/utils";
import type { PaperSettings, SheetTextBlock } from "@/types/paper";

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

function makeBlockId(): string {
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

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
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [pendingFocusFieldId, setPendingFocusFieldId] = useState<string | null>(null);

  const sheetFrameRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  const blockTextareaRef = useRef<HTMLTextAreaElement>(null);

  const totalPages = Math.max(1, Math.min(100, Math.round(settings.pageCount)));
  const safePage = Math.min(Math.max(1, pageIndex), totalPages);
  const pageKey = String(safePage);

  const pageFieldValues = settings.pageFields?.[pageKey] ?? {};
  const pageBlocks = settings.pageTextBlocks?.[pageKey] ?? [];
  const legacyNote = settings.pageNotes?.[pageKey] ?? "";

  const hasAnyNotesOnPage =
    legacyNote.trim().length > 0 ||
    Object.values(pageFieldValues).some((v) => v.trim().length > 0) ||
    pageBlocks.some((b) => b.text.trim().length > 0);

  const tpl = getTemplateSpec(settings.paperType);
  const sizeSpec = PAPER_SIZES.find((s) => s.id === settings.paperSize);
  const sizeName = sizeSpec ? sizeSpec.label.split(" (")[0] : settings.paperSize;

  const { svg, geometry, fields, fittedStepMm, fittedRows } = buildSheetSvg(
    settings,
    safePage,
    {
      hidePageNotes: isEditing && !isPrinting,
    },
  );

  // Fields beyond optional "date" mean this template has structured fields
  const templateBodyFields = fields.filter((f) => f.id !== "date");
  const supportsFreeClick = templateBodyFields.length === 0;
  const showFieldOutlines = templateBodyFields.length > 1;

  const resolvedInk = resolvePrintColor(
    sanitizeHexColor(settings.inkColor || "#1E293B", "#1E293B"),
    "text",
    settings.printerType,
  );

  const exitEditMode = useCallback(() => {
    const nonEmptyBlocks = (settings.pageTextBlocks?.[pageKey] ?? []).filter(
      (b) => b.text.trim().length > 0,
    );
    const nextBlocksMap = { ...(settings.pageTextBlocks ?? {}) };
    if (nonEmptyBlocks.length === 0) {
      delete nextBlocksMap[pageKey];
    } else {
      nextBlocksMap[pageKey] = nonEmptyBlocks;
    }
    setActiveBlockId(null);
    setPendingFocusFieldId(null);
    onChange({ ...settings, pageTextBlocks: nextBlocksMap });
    onEditingChange(false);
  }, [settings, pageKey, onChange, onEditingChange]);

  const enterEditMode = useCallback(
    (clickMm?: { xMm: number; yMm: number }) => {
      let nextSettings = settings;
      // Migrate legacy pageNote into field "main" (or first body field) cleanly
      if (legacyNote.trim().length > 0) {
        const targetId = templateBodyFields[0]?.id ?? "main";
        const nextNotes = { ...(settings.pageNotes ?? {}) };
        delete nextNotes[pageKey];
        const nextFieldsMap = {
          ...(settings.pageFields ?? {}),
          [pageKey]: {
            ...(settings.pageFields?.[pageKey] ?? {}),
            [targetId]: legacyNote,
          },
        };
        nextSettings = {
          ...settings,
          pageNotes: nextNotes,
          pageFields: nextFieldsMap,
        };
        onChange(nextSettings);
      }

      if (clickMm) {
        const hitField = fields.find(
          (f) =>
            clickMm.xMm >= f.xMm &&
            clickMm.xMm <= f.xMm + f.widthMm &&
            clickMm.yMm >= f.yMm &&
            clickMm.yMm <= f.yMm + f.heightMm,
        );
        if (hitField) {
          setPendingFocusFieldId(hitField.id);
          onEditingChange(true);
          return;
        }
        if (supportsFreeClick) {
          const created = createBlockAtPoint(
            nextSettings,
            geometry,
            clickMm.xMm,
            clickMm.yMm,
            makeBlockId(),
          );
          const nonEmpty = (nextSettings.pageTextBlocks?.[pageKey] ?? []).filter(
            (b) => b.text.trim().length > 0,
          );
          onChange({
            ...nextSettings,
            pageTextBlocks: {
              ...(nextSettings.pageTextBlocks ?? {}),
              [pageKey]: [...nonEmpty, created],
            },
          });
          setActiveBlockId(created.id);
          onEditingChange(true);
          return;
        }
      }

      if (isSingleFlowPaperType(settings.paperType) && templateBodyFields[0]) {
        setPendingFocusFieldId(templateBodyFields[0].id);
      } else if (templateBodyFields.length === 1) {
        setPendingFocusFieldId(templateBodyFields[0]!.id);
      } else if (supportsFreeClick && pageBlocks.length > 0) {
        setActiveBlockId(pageBlocks[0]!.id);
      }

      onEditingChange(true);
    },
    [
      settings,
      legacyNote,
      templateBodyFields,
      fields,
      supportsFreeClick,
      geometry,
      pageKey,
      pageBlocks,
      onChange,
      onEditingChange,
    ],
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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        exitEditMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditing, exitEditMode]);

  useEffect(() => {
    if (!isEditing) return;
    if (legacyNote.trim().length > 0) {
      const targetId = templateBodyFields[0]?.id ?? "main";
      const nextNotes = { ...(settings.pageNotes ?? {}) };
      delete nextNotes[pageKey];
      onChange({
        ...settings,
        pageNotes: nextNotes,
        pageFields: {
          ...(settings.pageFields ?? {}),
          [pageKey]: {
            ...(settings.pageFields?.[pageKey] ?? {}),
            [targetId]: legacyNote,
          },
        },
      });
    }
    if (isSingleFlowPaperType(settings.paperType) && templateBodyFields[0] && !pendingFocusFieldId) {
      setPendingFocusFieldId(templateBodyFields[0].id);
    } else if (templateBodyFields.length === 1 && !pendingFocusFieldId) {
      setPendingFocusFieldId(templateBodyFields[0]!.id);
    } else if (supportsFreeClick && pageBlocks.length > 0 && !activeBlockId) {
      setActiveBlockId(pageBlocks[0]!.id);
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    if (pendingFocusFieldId) {
      const target = fieldRefs.current[pendingFocusFieldId];
      if (target) {
        requestAnimationFrame(() => target.focus());
        setPendingFocusFieldId(null);
      }
    } else if (activeBlockId && blockTextareaRef.current) {
      requestAnimationFrame(() => blockTextareaRef.current?.focus());
    }
  }, [isEditing, pendingFocusFieldId, activeBlockId]);

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

  const updateFieldValue = (fieldId: string, nextVal: string) => {
    const pageMap = { ...(settings.pageFields?.[pageKey] ?? {}) };
    if (nextVal.length === 0) {
      delete pageMap[fieldId];
    } else {
      pageMap[fieldId] = nextVal;
    }
    const nextFields = { ...(settings.pageFields ?? {}) };
    if (Object.keys(pageMap).length === 0) {
      delete nextFields[pageKey];
    } else {
      nextFields[pageKey] = pageMap;
    }
    onChange({ ...settings, pageFields: nextFields });
  };

  const clientPointToSheetMm = (clientX: number, clientY: number) => {
    const frame = sheetFrameRef.current;
    if (!frame) return null;
    const rect = frame.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return { xMm: geometry.contentBox.x + 2, yMm: geometry.contentBox.y + 4 };
    }
    return {
      xMm: ((clientX - rect.left) / rect.width) * geometry.widthMm,
      yMm: ((clientY - rect.top) / rect.height) * geometry.heightMm,
    };
  };

  const handleFreeClickInEditMode = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditing || !supportsFreeClick) return;
    if ((e.target as HTMLElement).closest("input, textarea, button")) return;
    const pt = clientPointToSheetMm(e.clientX, e.clientY);
    if (!pt) return;

    const nonEmpty = pageBlocks.filter((b) => b.text.trim().length > 0);
    const created: SheetTextBlock = createBlockAtPoint(
      settings,
      geometry,
      pt.xMm,
      pt.yMm,
      makeBlockId(),
    );
    onChange({
      ...settings,
      pageTextBlocks: {
        ...(settings.pageTextBlocks ?? {}),
        [pageKey]: [...nonEmpty, created],
      },
    });
    setActiveBlockId(created.id);
  };

  const updateBlockText = (blockId: string, nextText: string) => {
    const updated = pageBlocks.map((b) =>
      b.id === blockId ? { ...b, text: nextText } : b,
    );
    onChange({
      ...settings,
      pageTextBlocks: {
        ...(settings.pageTextBlocks ?? {}),
        [pageKey]: updated,
      },
    });
  };

  const deleteBlock = (blockId: string) => {
    const remaining = pageBlocks.filter(
      (b) => b.id !== blockId && b.text.trim().length > 0,
    );
    const nextMap = { ...(settings.pageTextBlocks ?? {}) };
    if (remaining.length === 0) {
      delete nextMap[pageKey];
    } else {
      nextMap[pageKey] = remaining;
    }
    setActiveBlockId(null);
    onChange({ ...settings, pageTextBlocks: nextMap });
  };

  const clearCurrentPage = () => {
    const nextNotes = { ...(settings.pageNotes ?? {}) };
    delete nextNotes[pageKey];
    const nextFields = { ...(settings.pageFields ?? {}) };
    delete nextFields[pageKey];
    const nextBlocks = { ...(settings.pageTextBlocks ?? {}) };
    delete nextBlocks[pageKey];
    setActiveBlockId(null);
    onChange({
      ...settings,
      pageNotes: nextNotes,
      pageFields: nextFields,
      pageTextBlocks: nextBlocks,
    });
  };

  const aspectRatio = geometry.widthMm / geometry.heightMm;
  const isFit = zoom === "fit";
  const zoomedWidthPx = isFit
    ? undefined
    : Math.round(geometry.widthMm * (isEditing ? 3.8 : 2.8) * zoom);

  const helperHint = supportsFreeClick
    ? `${tpl.name} · Click anywhere to type`
    : showFieldOutlines
      ? `${tpl.name} · Click any section or press Tab`
      : tpl.name;

  const sheetElement = (
    <div
      ref={sheetFrameRef}
      className={cn(
        "sheet-preview-frame relative bg-white shadow-lg ring-1 ring-black/10",
        isEditing && supportsFreeClick && "cursor-text",
        !isFit && "m-auto",
      )}
      style={
        isFit
          ? {
              width: `min(calc(100cqw - 1.25rem), calc((100cqh - 1.25rem) * ${aspectRatio.toFixed(5)}))`,
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
      onClick={isEditing && supportsFreeClick ? handleFreeClickInEditMode : undefined}
      onDoubleClick={(e) => {
        if (!isEditing) {
          const pt = clientPointToSheetMm(e.clientX, e.clientY);
          enterEditMode(pt ?? undefined);
        }
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
          {fields.map((field) => {
            const metrics = computeFontMetricsForStep(
              field.stepMm,
              settings.inkFontScale,
              field.fontSizeMm,
            );
            const value = pageFieldValues[field.id] ?? "";
            const baseStyle: React.CSSProperties = {
              left: `${(field.xMm / geometry.widthMm) * 100}%`,
              top: `${(field.yMm / geometry.heightMm) * 100}%`,
              width: `${(field.widthMm / geometry.widthMm) * 100}%`,
              height: `${(field.heightMm / geometry.heightMm) * 100}%`,
              fontFamily: '"Atkinson Hyperlegible", Helvetica, Arial, sans-serif',
              fontSize: `calc(${metrics.fontSizeMm} * 100cqi / ${geometry.widthMm})`,
              color: resolvedInk,
            };

            if (field.singleLine) {
              return (
                <input
                  key={field.id}
                  ref={(el) => {
                    fieldRefs.current[field.id] = el;
                  }}
                  type="text"
                  aria-label={`${field.label}, page ${safePage}`}
                  placeholder={field.placeholder}
                  value={value}
                  onChange={(e) => updateFieldValue(field.id, e.target.value)}
                  className={cn(
                    "absolute scroll-my-16 rounded-[2px] bg-transparent p-0 leading-none outline-none placeholder:text-muted-foreground/45",
                    showFieldOutlines || field.id === "date"
                      ? "ring-1 ring-inset ring-primary/25 hover:ring-primary/55 focus:bg-white/30 focus:ring-primary"
                      : "focus:ring-1 focus:ring-inset focus:ring-primary/40",
                  )}
                  style={baseStyle}
                />
              );
            }

            return (
              <textarea
                key={field.id}
                ref={(el) => {
                  fieldRefs.current[field.id] = el;
                }}
                aria-label={`${field.label}, page ${safePage}`}
                placeholder={field.placeholder}
                value={value}
                onChange={(e) => updateFieldValue(field.id, e.target.value)}
                spellCheck
                className={cn(
                  "absolute scroll-my-16 resize-none overflow-y-auto rounded-[2px] bg-transparent p-0 outline-none placeholder:text-muted-foreground/40",
                  showFieldOutlines
                    ? "ring-1 ring-inset ring-primary/20 hover:ring-primary/50 focus:bg-white/25 focus:ring-primary/80"
                    : "focus:ring-1 focus:ring-inset focus:ring-primary/35",
                )}
                style={{
                  ...baseStyle,
                  lineHeight: `calc(${field.stepMm} * 100cqi / ${geometry.widthMm})`,
                  paddingTop: `calc(${metrics.textareaPaddingTopMm} * 100cqi / ${geometry.widthMm})`,
                }}
              />
            );
          })}

          {supportsFreeClick &&
            pageBlocks.map((block) => {
              const metrics = computeBlockMetrics(block, settings, geometry);
              const isActive = block.id === activeBlockId;
              const lineCount = Math.max(metrics.lineCount, block.text.split("\n").length);
              const boxHeightMm = Math.max(
                metrics.stepMm * 1.5,
                (lineCount + 0.5) * metrics.stepMm,
              );

              return (
                <div
                  key={block.id}
                  className="group absolute"
                  style={{
                    left: `${(block.xMm / geometry.widthMm) * 100}%`,
                    top: `${(block.yMm / geometry.heightMm) * 100}%`,
                    width: `${(block.widthMm / geometry.widthMm) * 100}%`,
                    height: `${(boxHeightMm / geometry.heightMm) * 100}%`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <textarea
                    ref={isActive ? blockTextareaRef : undefined}
                    aria-label={`Note on ${tpl.name}, page ${safePage}`}
                    placeholder="Type note..."
                    value={block.text}
                    onFocus={() => setActiveBlockId(block.id)}
                    onChange={(e) => updateBlockText(block.id, e.target.value)}
                    spellCheck
                    className={cn(
                      "h-full w-full scroll-my-16 resize-none overflow-y-auto rounded-[2px] bg-transparent p-0 outline-none placeholder:text-muted-foreground/45",
                      isActive
                        ? "border border-dashed border-primary/60 bg-white/20"
                        : "border border-transparent hover:border-primary/35",
                    )}
                    style={{
                      fontFamily: '"Atkinson Hyperlegible", Helvetica, Arial, sans-serif',
                      fontSize: `calc(${metrics.fontSizeMm} * 100cqi / ${geometry.widthMm})`,
                      lineHeight: `calc(${metrics.stepMm} * 100cqi / ${geometry.widthMm})`,
                      paddingTop: `calc(${metrics.textareaPaddingTopMm} * 100cqi / ${geometry.widthMm})`,
                      color: resolvedInk,
                    }}
                  />
                  <button
                    type="button"
                    aria-label="Delete note"
                    title="Remove note"
                    onClick={() => deleteBlock(block.id)}
                    className={cn(
                      "bg-background text-muted-foreground hover:text-destructive absolute -top-3.5 -right-3.5 flex size-7 items-center justify-center rounded-full border shadow-xs transition-opacity sm:-top-2.5 sm:-right-2.5 sm:size-5",
                      isActive
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-90",
                    )}
                  >
                    <X className="size-3.5 sm:size-2.5" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
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
        className="print-only-main studio-mat fixed inset-0 z-50 flex h-dvh flex-col"
      >
        <div className="no-print flex shrink-0 justify-center px-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] pb-1 sm:px-3 sm:pt-2.5">
          <div
            className="flex max-h-[30dvh] max-w-full flex-wrap items-center justify-center gap-1.5 overflow-y-auto overscroll-contain rounded-2xl border bg-background/95 px-2.5 py-1.5 shadow-sm backdrop-blur-xs sm:gap-2 sm:rounded-full sm:px-3"
            role="toolbar"
            aria-label="Full-screen paper editor controls"
          >
            <span className="text-muted-foreground hidden px-1 text-xs font-medium lg:inline">
              {helperHint}
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
                      "size-7 cursor-pointer rounded-full border transition-transform disabled:opacity-40 sm:size-5",
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
                    className="h-9 px-2.5 text-xs sm:h-7 sm:px-2"
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
                  className="size-8 rounded-full sm:size-6"
                  aria-label="Previous preview page"
                  disabled={safePage <= 1}
                  onClick={() => {
                    setActiveBlockId(null);
                    setPageIndex(safePage - 1);
                  }}
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
                  className="size-8 rounded-full sm:size-6"
                  aria-label="Next preview page"
                  disabled={safePage >= totalPages}
                  onClick={() => {
                    setActiveBlockId(null);
                    setPageIndex(safePage + 1);
                  }}
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            )}

            <div
              className="flex items-center gap-0.5 rounded-full border bg-muted/40 p-0.5"
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
                  className="h-8 rounded-full px-2.5 text-xs sm:h-6 sm:px-2"
                  aria-pressed={zoom === z.id}
                  onClick={() => setZoom(z.id)}
                >
                  {z.label}
                </Button>
              ))}
            </div>

            {hasAnyNotesOnPage && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-9 px-2.5 text-xs sm:h-7 sm:px-2"
                onClick={clearCurrentPage}
              >
                <Eraser className="size-3.5" aria-hidden="true" />
                <span>Clear</span>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              className="h-9 rounded-full px-3 text-xs sm:h-7"
              title="Exit full-screen edit (Esc)"
              onClick={exitEditMode}
            >
              <Check aria-hidden="true" />
              <span>Done</span>
            </Button>
          </div>
        </div>

        <div
          className={`print-stage relative flex min-h-0 flex-1 overscroll-contain p-2 sm:p-4 ${
            isFit
              ? "items-center justify-center overflow-y-auto"
              : "items-start justify-start overflow-auto"
          } ${printAllPages ? "print:hidden" : ""}`}
          style={isFit ? { containerType: "size" } : undefined}
        >
          {sheetElement}
          {supportsFreeClick && pageBlocks.length === 0 && (
            <div className="no-print pointer-events-none fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] left-1/2 max-w-[calc(100vw-2rem)] -translate-x-1/2 truncate rounded-full border bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow-xs backdrop-blur-xs">
              Click or tap anywhere on the sheet to write
            </div>
          )}
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
      className="print-only-main min-w-0 flex-1 md:sticky md:top-16"
    >
      <Card className="print-card gap-3 py-3.5 md:flex md:h-[min(calc(100dvh-5rem),980px)] md:flex-col">
        <CardHeader className="no-print shrink-0 border-b px-3.5 pb-3 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <CardTitle className="text-base">{tpl.name}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {settings.printerType === "bw" ? "B&W Laser" : "Color"}
                </Badge>
                {settings.doubleSided && (
                  <Badge variant="secondary" className="text-xs">
                    {geometry.isBackPage ? "Back Side" : "Front Side"}
                  </Badge>
                )}
                {hasAnyNotesOnPage && (
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
                variant="secondary"
                className="min-h-10 px-3 text-xs font-semibold sm:min-h-8 sm:h-8 sm:px-2.5"
                onClick={() => enterEditMode()}
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
                    className="size-9 sm:size-7"
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
                    className="size-9 sm:size-7"
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
                    className="h-9 px-2.5 text-xs sm:h-7 sm:px-2"
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

        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 px-3.5 sm:px-4">
          <div
            className={`print-stage studio-mat flex h-[clamp(250px,54dvh,540px)] rounded-lg border p-2.5 sm:p-4 md:h-auto md:min-h-[220px] md:flex-1 ${
              isFit
                ? "items-center justify-center overflow-hidden"
                : "items-start justify-start overflow-auto"
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
            className="no-print flex shrink-0 flex-wrap items-center justify-between gap-2"
            role="group"
            aria-label="Export and print actions"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                className="min-h-10 sm:min-h-8 sm:h-8"
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
                className="min-h-10 sm:min-h-8 sm:h-8"
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
                className="min-h-10 sm:min-h-8 sm:h-8"
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
                className="min-h-10 sm:min-h-8 sm:h-8"
                disabled={hasErrors || exporting !== null}
                onClick={onExportDocx}
              >
                <FileText aria-hidden="true" />
                <span>{exporting === "docx" ? "Building..." : "DOCX"}</span>
              </Button>
            </div>

            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="min-h-10 sm:min-h-8 sm:h-8"
              disabled={hasErrors}
              onClick={handlePrint}
            >
              <Printer aria-hidden="true" />
              <span>Print</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
