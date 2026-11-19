import type { CSSProperties } from "react";
import { useMemo } from "react";
import { applyTemplateDefaults, DEFAULT_PAPER_SETTINGS, getTemplateSpec } from "@/data/templates";
import { getThemeSpec } from "@/data/themes";
import { buildSheetSvg } from "@/engine/buildSheetSvg";
import { cn } from "@/lib/utils";
import type { PaperSettings, PaperTypeId, ThemeId } from "@/types/paper";

export function buildPreviewSettings(
  templateId: PaperTypeId,
  themeId: ThemeId = "default",
): PaperSettings {
  const base = applyTemplateDefaults(DEFAULT_PAPER_SETTINGS, templateId);
  if (themeId === "default") {
    return base;
  }
  const theme = getThemeSpec(themeId);
  return {
    ...base,
    theme: themeId,
    backgroundColor: theme.backgroundColor,
    lineColor: theme.lineColor,
    accentColor: theme.accentColor,
  };
}

interface LandingSheetPreviewProps {
  templateId: PaperTypeId;
  themeId?: ThemeId;
  className?: string;
  style?: CSSProperties;
  alt?: string;
  priority?: boolean;
}

export function LandingSheetPreview({
  templateId,
  themeId = "default",
  className,
  style,
  alt,
  priority = false,
}: LandingSheetPreviewProps) {
  const tpl = getTemplateSpec(templateId);
  const theme = getThemeSpec(themeId);

  const preview = useMemo(() => {
    const settings = buildPreviewSettings(templateId, themeId);
    const built = buildSheetSvg(settings, 1);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(built.svg)}`;
    return {
      dataUrl,
      widthMm: built.geometry.widthMm,
      heightMm: built.geometry.heightMm,
      fittedRows: built.fittedRows,
      fittedStepMm: built.fittedStepMm,
    };
  }, [templateId, themeId]);

  const pixelW = Math.round(preview.widthMm * 2);
  const pixelH = Math.round(preview.heightMm * 2);
  const computedAlt =
    alt ??
    `${tpl.name} printable paper preview in ${theme.name} (${tpl.defaultOrientation ?? "portrait"} A4)`;

  return (
    <img
      src={preview.dataUrl}
      alt={computedAlt}
      width={pixelW}
      height={pixelH}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      className={cn(
        "block h-auto w-full rounded-sm bg-white ring-1 ring-black/10",
        className,
      )}
      style={{
        aspectRatio: `${preview.widthMm} / ${preview.heightMm}`,
        ...style,
      }}
    />
  );
}
