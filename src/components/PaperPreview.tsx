import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eraser,
  FileDown,
  FileText,
  GripVertical,
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sheetFrameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: "move" | "resize";
    blockId: string;
    startClientX: number;
    startClientY: number;
    startXMm: number;
    startYMm: number;
    startWidthMm: number;
  } | null>(null);

  const totalPages = Math.max(1, Math.min(100, Math.round(settings.pageCount)));
  const safePage = Math.min(Math.max(1, pageIndex), totalPages);
  const pageKey = String(safePage);

  const pageBlocks = settings.pageTextBlocks?.[pageKey] ?? [];
  const legacyNote = settings.pageNotes?.[pageKey] ?? "";
  const hasAnyNotesOnPage =
    legacyNote.trim().length > 0 || pageBlocks.some((b) => b.text.trim().length > 0);

  const tpl = getTemplateSpec(settings.paperType);
  const sizeSpec = PAPER_SIZES.find((s) => s.id === settings.paperSize);
  const sizeName = sizeSpec ? sizeSpec.label.split(" (")[0] : settings.paperSize;

  const { svg, geometry, writingLayout, fittedStepMm, fittedRows } = buildSheetSvg(
    settings,
    safePage,
    {
      hidePageNotes: isEditing && !isPrinting && pageBlocks.length === 0 && legacyNote.length > 0,
      hideBlockId: isEditing && !isPrinting ? (activeBlockId ?? undefined) : undefined,
    },
  );

  const activeBlock = pageBlocks.find((b) => b.id === activeBlockId) ?? null;

  const commitPageBlocks = useCallback(
    (
      nextBlocks: SheetTextBlock[],
      extra?: Partial<PaperSettings>,
      announcement?: string,
    ) => {
      const cleaned = nextBlocks.filter((b) => b.text.length > 0 || b.id === activeBlockId);
      const nextMap = { ...(settings.pageTextBlocks ?? {}) };
      if (cleaned.length === 0) {
        delete nextMap[pageKey];
      } else {
        nextMap[pageKey] = cleaned;
      }
      onChange(
        {
          ...settings,
          ...extra,
          pageTextBlocks: nextMap,
        },
        announcement,
      );
    },
    [settings, pageKey, activeBlockId, onChange],
  );

  const pruneEmptyAndExit = useCallback(() => {
    const nonEmpty = (settings.pageTextBlocks?.[pageKey] ?? []).filter(
      (b) => b.text.trim().length > 0,
    );
    const nextMap = { ...(settings.pageTextBlocks ?? {}) };
    if (nonEmpty.length === 0) {
      delete nextMap[pageKey];
    } else {
      nextMap[pageKey] = nonEmpty;
    }
    setActiveBlockId(null);
    onChange({ ...settings, pageTextBlocks: nextMap });
    onEditingChange(false);
  }, [settings, pageKey, onChange, onEditingChange]);

  const enterEditMode = useCallback(
    (clickMm?: { xMm: number; yMm: number }) => {
      // Migrate legacy pageNote into a SheetTextBlock seamlessly if present
      if (legacyNote.trim().length > 0 && pageBlocks.length === 0) {
        const migrated: SheetTextBlock = {
          id: makeBlockId(),
          xMm: writingLayout.xMm,
          yMm: writingLayout.yMm,
          widthMm: writingLayout.widthMm,
          text: legacyNote,
        };
        const nextNotes = { ...(settings.pageNotes ?? {}) };
        delete nextNotes[pageKey];
        const nextBlocksMap = {
          ...(settings.pageTextBlocks ?? {}),
          [pageKey]: [migrated],
        };
        onChange({
          ...settings,
          pageNotes: nextNotes,
          pageTextBlocks: nextBlocksMap,
        });
        setActiveBlockId(migrated.id);
        onEditingChange(true);
        return;
      }

      if (clickMm) {
        const block = createBlockAtPoint(
          settings,
          geometry,
          clickMm.xMm,
          clickMm.yMm,
          makeBlockId(),
        );
        const nonEmpty = pageBlocks.filter((b) => b.text.trim().length > 0);
        const nextMap = {
          ...(settings.pageTextBlocks ?? {}),
          [pageKey]: [...nonEmpty, block],
        };
        onChange({ ...settings, pageTextBlocks: nextMap });
        setActiveBlockId(block.id);
        onEditingChange(true);
        return;
      }

      if (pageBlocks.length > 0) {
        setActiveBlockId(pageBlocks[0]!.id);
        onEditingChange(true);
        return;
      }

      if (isSingleFlowPaperType(settings.paperType)) {
        const firstBlock: SheetTextBlock = {
          id: makeBlockId(),
          xMm: writingLayout.xMm,
          yMm: writingLayout.yMm,
          widthMm: writingLayout.widthMm,
          text: "",
        };
        const nextMap = {
          ...(settings.pageTextBlocks ?? {}),
          [pageKey]: [firstBlock],
        };
        onChange({ ...settings, pageTextBlocks: nextMap });
        setActiveBlockId(firstBlock.id);
        onEditingChange(true);
        return;
      }

      setActiveBlockId(null);
      onEditingChange(true);
    },
    [
      legacyNote,
      pageBlocks,
      writingLayout,
      settings,
      geometry,
      pageKey,
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
        pruneEmptyAndExit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditing, pruneEmptyAndExit]);

  useEffect(() => {
    if (isEditing && activeBlockId) {
      const rafId = requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [isEditing, activeBlockId]);

  useEffect(() => {
    if (!isEditing) return;

    const handlePointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      const frame = sheetFrameRef.current;
      if (!drag || !frame) return;
      const rect = frame.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dxMm = ((e.clientX - drag.startClientX) / rect.width) * geometry.widthMm;
      const dyMm = ((e.clientY - drag.startClientY) / rect.height) * geometry.heightMm;

      const updated = (settings.pageTextBlocks?.[pageKey] ?? []).map((b) => {
        if (b.id !== drag.blockId) return b;
        if (drag.mode === "move") {
          const nextX = Math.max(
            3,
            Math.min(geometry.widthMm - Math.min(20, b.widthMm) - 3, drag.startXMm + dxMm),
          );
          const nextY = Math.max(3, Math.min(geometry.heightMm - 8, drag.startYMm + dyMm));
          return {
            ...b,
            xMm: Number(nextX.toFixed(2)),
            yMm: Number(nextY.toFixed(2)),
          };
        }
        const maxWidth = geometry.widthMm - b.xMm - 3;
        const nextW = Math.max(16, Math.min(maxWidth, drag.startWidthMm + dxMm));
        return {
          ...b,
          widthMm: Number(nextW.toFixed(2)),
        };
      });

      const nextMap = { ...(settings.pageTextBlocks ?? {}), [pageKey]: updated };
      onChange({ ...settings, pageTextBlocks: nextMap });
    };

    const handlePointerUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isEditing, geometry.widthMm, geometry.heightMm, settings, pageKey, onChange]);

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

  const clientPointToSheetMm = (clientX: number, clientY: number) => {
    const frame = sheetFrameRef.current;
    if (!frame) return null;
    const rect = frame.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return { xMm: writingLayout.xMm, yMm: writingLayout.yMm };
    }
    return {
      xMm: ((clientX - rect.left) / rect.width) * geometry.widthMm,
      yMm: ((clientY - rect.top) / rect.height) * geometry.heightMm,
    };
  };

  const handleSheetClickInEditMode = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    if ((e.target as HTMLElement).closest("textarea, button, [data-block-ui]")) {
      return;
    }
    const pt = clientPointToSheetMm(e.clientX, e.clientY);
    if (!pt) return;

    const nonEmpty = pageBlocks.filter((b) => b.text.trim().length > 0);
    const created = createBlockAtPoint(settings, geometry, pt.xMm, pt.yMm, makeBlockId());
    const nextMap = {
      ...(settings.pageTextBlocks ?? {}),
      [pageKey]: [...nonEmpty, created],
    };
    onChange({ ...settings, pageTextBlocks: nextMap });
    setActiveBlockId(created.id);
  };

  const updateBlockText = (blockId: string, nextText: string) => {
    const updated = pageBlocks.map((b) =>
      b.id === blockId ? { ...b, text: nextText } : b,
    );
    const nextMap = { ...(settings.pageTextBlocks ?? {}), [pageKey]: updated };
    onChange({ ...settings, pageTextBlocks: nextMap });
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
    const nextBlocks = { ...(settings.pageTextBlocks ?? {}) };
    delete nextBlocks[pageKey];
    setActiveBlockId(null);
    onChange({ ...settings, pageNotes: nextNotes, pageTextBlocks: nextBlocks });
  };

  const applyInkColor = (color: string, label: string) => {
    if (activeBlockId) {
      const updated = pageBlocks.map((b) =>
        b.id === activeBlockId ? { ...b, color } : b,
      );
      commitPageBlocks(updated, { inkColor: color }, `Selected ${label}.`);
      requestAnimationFrame(() => textareaRef.current?.focus());
    } else {
      onChange({ ...settings, inkColor: color }, `Selected ${label}.`);
    }
  };

  const applyFontScale = (scale: number, name: string) => {
    if (activeBlockId) {
      const updated = pageBlocks.map((b) =>
        b.id === activeBlockId ? { ...b, fontScale: scale } : b,
      );
      commitPageBlocks(updated, { inkFontScale: scale }, `Selected ${name}.`);
      requestAnimationFrame(() => textareaRef.current?.focus());
    } else {
      onChange({ ...settings, inkFontScale: scale }, `Selected ${name}.`);
    }
  };

  const currentInkColor = activeBlock?.color ?? settings.inkColor ?? "#1E293B";
  const currentFontScale = activeBlock?.fontScale ?? settings.inkFontScale ?? 1;

  const aspectRatio = geometry.widthMm / geometry.heightMm;
  const isFit = zoom === "fit";
  const zoomedWidthPx = isFit
    ? undefined
    : Math.round(geometry.widthMm * (isEditing ? 3.8 : 2.8) * zoom);

  const sheetElement = (
    <div
      ref={sheetFrameRef}
      className={cn(
        "sheet-preview-frame relative bg-white shadow-lg ring-1 ring-black/10",
        isEditing && "cursor-text",
      )}
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
      title={!isEditing ? "Double-click anywhere on the sheet to edit" : undefined}
      onClick={isEditing ? handleSheetClickInEditMode : undefined}
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
          {pageBlocks.map((block) => {
            const metrics = computeBlockMetrics(block, settings, geometry);
            const blockInk = resolvePrintColor(
              sanitizeHexColor(block.color || settings.inkColor || "#1E293B", "#1E293B"),
              "text",
              settings.printerType,
            );
            const isActive = block.id === activeBlockId;

            if (!isActive) {
              if (block.text.trim().length === 0) return null;
              return (
                <button
                  key={block.id}
                  type="button"
                  data-block-ui="hit"
                  aria-label={`Edit note: ${block.text.slice(0, 32)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const cleaned = pageBlocks.filter(
                      (item) => item.id === block.id || item.text.trim().length > 0,
                    );
                    if (cleaned.length !== pageBlocks.length) {
                      onChange({
                        ...settings,
                        pageTextBlocks: {
                          ...(settings.pageTextBlocks ?? {}),
                          [pageKey]: cleaned,
                        },
                      });
                    }
                    setActiveBlockId(block.id);
                  }}
                  className="absolute cursor-text rounded-[2px] border border-transparent hover:border-primary/35 hover:bg-primary/5"
                  style={{
                    left: `${(block.xMm / geometry.widthMm) * 100}%`,
                    top: `${(block.yMm / geometry.heightMm) * 100}%`,
                    width: `${(block.widthMm / geometry.widthMm) * 100}%`,
                    height: `${(metrics.heightMm / geometry.heightMm) * 100}%`,
                  }}
                />
              );
            }

            const editorHeightMm = Math.max(
              metrics.stepMm * 1.6,
              (metrics.lineCount + 0.5) * metrics.stepMm,
            );

            return (
              <div
                key={block.id}
                data-block-ui="active"
                className="absolute"
                style={{
                  left: `${(block.xMm / geometry.widthMm) * 100}%`,
                  top: `${(block.yMm / geometry.heightMm) * 100}%`,
                  width: `${(block.widthMm / geometry.widthMm) * 100}%`,
                  height: `${(editorHeightMm / geometry.heightMm) * 100}%`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute -top-6 right-0 z-10 flex items-center gap-0.5 rounded-full border bg-background/95 px-1 py-0.5 shadow-xs">
                  <button
                    type="button"
                    aria-label="Move text block"
                    title="Drag to move"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      dragRef.current = {
                        mode: "move",
                        blockId: block.id,
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        startXMm: block.xMm,
                        startYMm: block.yMm,
                        startWidthMm: block.widthMm,
                      };
                    }}
                    className="text-muted-foreground hover:text-foreground cursor-grab rounded p-0.5 active:cursor-grabbing"
                  >
                    <GripVertical className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete text block"
                    title="Remove block"
                    onClick={() => deleteBlock(block.id)}
                    className="text-muted-foreground hover:text-destructive rounded p-0.5"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </div>

                <textarea
                  ref={textareaRef}
                  aria-label={`Edit text on ${tpl.name}, page ${safePage}`}
                  placeholder="Type here..."
                  value={block.text}
                  onChange={(e) => updateBlockText(block.id, e.target.value)}
                  spellCheck
                  className="h-full w-full resize-none overflow-hidden rounded-[2px] bg-white/10 p-0 outline-1 outline-dashed outline-primary/50 focus:outline-primary placeholder:text-muted-foreground/50"
                  style={{
                    fontFamily: '"Atkinson Hyperlegible", Helvetica, Arial, sans-serif',
                    fontSize: `calc(${metrics.fontSizeMm} * 100cqi / ${geometry.widthMm})`,
                    lineHeight: `calc(${metrics.stepMm} * 100cqi / ${geometry.widthMm})`,
                    paddingTop: `calc(${metrics.textareaPaddingTopMm} * 100cqi / ${geometry.widthMm})`,
                    color: blockInk,
                  }}
                />

                <div
                  role="separator"
                  aria-orientation="vertical"
                  title="Drag to resize width"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dragRef.current = {
                      mode: "resize",
                      blockId: block.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      startXMm: block.xMm,
                      startYMm: block.yMm,
                      startWidthMm: block.widthMm,
                    };
                  }}
                  className="absolute top-0 -right-1 h-full w-2 cursor-ew-resize"
                />
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
        className="print-only-main studio-mat fixed inset-0 z-50 flex flex-col"
      >
        <div className="no-print flex shrink-0 justify-center px-3 pt-2.5 pb-1">
          <div
            className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border bg-background/95 px-3 py-1.5 shadow-sm backdrop-blur-xs"
            role="toolbar"
            aria-label="Full-screen paper editor controls"
          >
            <span className="text-muted-foreground hidden px-1 text-xs font-medium md:inline">
              {tpl.name} · Click anywhere to type
            </span>

            <div className="flex items-center gap-1.5" role="group" aria-label="Ink color">
              {INK_SWATCHES.map((swatch) => {
                const active = currentInkColor.toLowerCase() === swatch.color.toLowerCase();
                return (
                  <button
                    key={swatch.color}
                    type="button"
                    disabled={settings.printerType === "bw"}
                    aria-label={swatch.label}
                    aria-pressed={active}
                    onClick={() => applyInkColor(swatch.color, swatch.label)}
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
                const active = Math.abs(currentFontScale - sz.scale) < 0.05;
                return (
                  <Button
                    key={sz.label}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "ghost"}
                    className="h-7 px-2 text-xs"
                    aria-label={sz.name}
                    aria-pressed={active}
                    onClick={() => applyFontScale(sz.scale, sz.name)}
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
                  className="size-6 rounded-full"
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

            {hasAnyNotesOnPage && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={clearCurrentPage}
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
              onClick={pruneEmptyAndExit}
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
                variant="outline"
                className="h-8 px-2.5 text-xs"
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
