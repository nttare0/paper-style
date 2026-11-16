import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookmarkCheck,
  CheckCircle2,
  CircleDot,
  Download,
  FileText,
  Layers,
  Palette,
  Printer,
  RotateCcw,
  Ruler,
  Sliders,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { formatLength, PAPER_SIZES, roundForUnit, unitToMm } from "@/data/sizes";
import {
  applyTemplateDefaults,
  CATEGORY_LABELS,
  DEFAULT_PAPER_SETTINGS,
  getTemplateSpec,
  PAPER_TEMPLATES,
} from "@/data/templates";
import { getThemeSpec, THEMES } from "@/data/themes";
import type { ValidationErrors } from "@/engine/geometry";
import { BACKGROUND_PATTERNS } from "@/engine/patterns";
import { cn } from "@/lib/utils";
import type {
  BackgroundPatternId,
  CornerPosition,
  HolePunchType,
  LayoutMode,
  LineStyle,
  Orientation,
  PaperCategory,
  PaperSettings,
  PaperSizeId,
  PaperTypeId,
  PrinterType,
  ThemeId,
  Units,
} from "@/types/paper";

interface ControlPanelProps {
  settings: PaperSettings;
  errors: ValidationErrors;
  onChange: (next: PaperSettings, announcement?: string) => void;
  onExportSettings: () => void;
  onImportSettings: (file: File) => void;
  onReset: () => void;
}

const HOLE_PUNCH_OPTIONS: { id: HolePunchType; label: string }[] = [
  { id: "none", label: "No hole punch marks" },
  { id: "3-hole", label: "3-hole binder (left edge, 4.25 in apart)" },
  { id: "2-hole", label: "2-hole (left edge, 80 mm apart)" },
  { id: "4-hole", label: "4-hole (left edge, 80 mm apart)" },
  { id: "5-hole", label: "5-hole (left edge, fits 3-hole and 2-hole)" },
  { id: "top-2-hole", label: "Top 2-hole (folders with top fasteners, 2.75 in apart)" },
  { id: "single-ring", label: "Single ring (top-left corner)" },
];

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="text-destructive mt-1.5 flex items-center gap-1.5 text-sm font-medium"
    >
      <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

export function ControlPanel({
  settings,
  errors,
  onChange,
  onExportSettings,
  onImportSettings,
  onReset,
}: ControlPanelProps) {
  const [categoryFilter, setCategoryFilter] = useState<PaperCategory | "all">("all");
  const [templateSearch, setTemplateSearch] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  const selectedTemplate = getTemplateSpec(settings.paperType);
  const selectedTheme = getThemeSpec(settings.theme);

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    return PAPER_TEMPLATES.filter((t) => {
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    });
  }, [categoryFilter, templateSearch]);

  const templatesForSelect = useMemo(() => {
    if (filteredTemplates.some((t) => t.id === settings.paperType)) {
      return filteredTemplates;
    }
    return [selectedTemplate, ...filteredTemplates];
  }, [filteredTemplates, selectedTemplate, settings.paperType]);

  const handleTemplateSelect = (templateId: PaperTypeId) => {
    const next = applyTemplateDefaults(settings, templateId);
    const tpl = getTemplateSpec(templateId);
    onChange(next, `Selected ${tpl.name} template.`);
  };

  const handleThemeSelect = (themeId: ThemeId) => {
    const t = getThemeSpec(themeId);
    onChange(
      {
        ...settings,
        theme: themeId,
        backgroundColor: t.backgroundColor,
        lineColor: t.lineColor,
        accentColor: t.accentColor,
      },
      `Applied ${t.name}.`,
    );
  };

  const handleUnitChange = (units: Units) => {
    onChange(
      { ...settings, units },
      `Switched measurement units to ${units === "mm" ? "millimeters" : "inches"}.`,
    );
  };

  const handleSizeChange = (paperSize: PaperSizeId) => {
    const sizeSpec = PAPER_SIZES.find((s) => s.id === paperSize);
    onChange(
      {
        ...settings,
        paperSize,
        ...(paperSize !== "custom" && sizeSpec
          ? { customWidthMm: sizeSpec.widthMm, customHeightMm: sizeSpec.heightMm }
          : {}),
      },
      `Selected ${sizeSpec?.label ?? paperSize} paper size.`,
    );
  };

  const handleMarginUpdate = (side: "top" | "right" | "bottom" | "left", rawValue: string) => {
    const num = Number.parseFloat(rawValue);
    if (!Number.isFinite(num)) return;
    const mm = unitToMm(num, settings.units);
    if (settings.linkMargins) {
      onChange({
        ...settings,
        marginsMm: { top: mm, right: mm, bottom: mm, left: mm },
      });
    } else {
      onChange({
        ...settings,
        marginsMm: { ...settings.marginsMm, [side]: mm },
      });
    }
  };

  const handleImageFile = (file: File | undefined, target: "bg" | "logo") => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      if (target === "bg") {
        onChange(
          {
            ...settings,
            backgroundPattern: "custom-image",
            customBgImageDataUrl: reader.result,
          },
          "Loaded custom background image.",
        );
      } else {
        onChange(
          {
            ...settings,
            logoEnabled: true,
            logoDataUrl: reader.result,
          },
          "Loaded custom logo image.",
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const isNearRecommended =
    Math.abs(settings.lineSpacingMm - selectedTemplate.defaultSpacingMm) <= 0.6;

  return (
    <aside
      id="controls-panel"
      aria-label="Paper Customization Controls"
      className="no-print w-full lg:w-[440px] xl:w-[470px] shrink-0"
    >
      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Paper Settings</CardTitle>
            <Badge variant="secondary">{PAPER_TEMPLATES.length} templates</Badge>
          </div>
        </CardHeader>

        <CardContent>
          <Accordion
            type="multiple"
            defaultValue={["template", "size", "printer-theme", "line-style"]}
            className="w-full"
          >
            {/* 1. Paper Type */}
            <AccordionItem value="template">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span>Paper Type &amp; Template</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <span id="category-filter-label" className="text-sm font-medium">
                    Category
                  </span>
                  <div
                    className="flex flex-wrap gap-1.5"
                    role="group"
                    aria-labelledby="category-filter-label"
                  >
                    <Button
                      type="button"
                      size="sm"
                      variant={categoryFilter === "all" ? "default" : "outline"}
                      aria-pressed={categoryFilter === "all"}
                      onClick={() => setCategoryFilter("all")}
                    >
                      All ({PAPER_TEMPLATES.length})
                    </Button>
                    {(Object.keys(CATEGORY_LABELS) as PaperCategory[]).map((cat) => (
                      <Button
                        key={cat}
                        type="button"
                        size="sm"
                        variant={categoryFilter === cat ? "default" : "outline"}
                        aria-pressed={categoryFilter === cat}
                        onClick={() => setCategoryFilter(cat)}
                      >
                        {CATEGORY_LABELS[cat]}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-search">Search templates</Label>
                  <Input
                    id="template-search"
                    type="search"
                    placeholder="Search lined, cornell, music, grid, planner..."
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paper-type-select">Paper Type</Label>
                  <NativeSelect
                    id="paper-type-select"
                    value={settings.paperType}
                    onChange={(e) => handleTemplateSelect(e.target.value as PaperTypeId)}
                  >
                    {templatesForSelect.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </option>
                    ))}
                  </NativeSelect>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {selectedTemplate.description}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 2. Paper Size & Units */}
            <AccordionItem value="size">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Ruler className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span>Paper Size, Units &amp; Orientation</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Measurement Units</legend>
                  <RadioGroup
                    value={settings.units}
                    onValueChange={(val) => handleUnitChange(val as Units)}
                    className="grid grid-cols-2 gap-2"
                  >
                    {[
                      { id: "mm" as const, label: "Metric (mm)" },
                      { id: "in" as const, label: "Imperial (in)" },
                    ].map((item) => (
                      <label
                        key={item.id}
                        htmlFor={`unit-${item.id}`}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                          settings.units === item.id
                            ? "border-primary bg-accent text-accent-foreground"
                            : "border-border bg-background hover:bg-muted/50",
                        )}
                      >
                        <RadioGroupItem id={`unit-${item.id}`} value={item.id} />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </fieldset>

                <div className="space-y-2">
                  <Label htmlFor="paper-size-select">Paper Size</Label>
                  <NativeSelect
                    id="paper-size-select"
                    value={settings.paperSize}
                    onChange={(e) => handleSizeChange(e.target.value as PaperSizeId)}
                  >
                    {PAPER_SIZES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                {settings.paperSize === "custom" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="custom-width">Width ({settings.units})</Label>
                      <Input
                        id="custom-width"
                        type="number"
                        step={settings.units === "in" ? "0.1" : "1"}
                        aria-invalid={Boolean(errors.customWidth)}
                        aria-describedby={errors.customWidth ? "custom-width-err" : undefined}
                        value={roundForUnit(settings.customWidthMm, settings.units)}
                        onChange={(e) => {
                          const v = Number.parseFloat(e.target.value);
                          if (Number.isFinite(v)) {
                            onChange({ ...settings, customWidthMm: unitToMm(v, settings.units) });
                          }
                        }}
                      />
                      <FieldError id="custom-width-err" message={errors.customWidth} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="custom-height">Height ({settings.units})</Label>
                      <Input
                        id="custom-height"
                        type="number"
                        step={settings.units === "in" ? "0.1" : "1"}
                        aria-invalid={Boolean(errors.customHeight)}
                        aria-describedby={errors.customHeight ? "custom-height-err" : undefined}
                        value={roundForUnit(settings.customHeightMm, settings.units)}
                        onChange={(e) => {
                          const v = Number.parseFloat(e.target.value);
                          if (Number.isFinite(v)) {
                            onChange({ ...settings, customHeightMm: unitToMm(v, settings.units) });
                          }
                        }}
                      />
                      <FieldError id="custom-height-err" message={errors.customHeight} />
                    </div>
                  </div>
                )}

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Orientation</legend>
                  <RadioGroup
                    value={settings.orientation}
                    onValueChange={(val) =>
                      onChange({ ...settings, orientation: val as Orientation })
                    }
                    className="grid grid-cols-2 gap-2"
                  >
                    {[
                      { id: "portrait" as const, label: "Portrait" },
                      { id: "landscape" as const, label: "Landscape" },
                    ].map((item) => (
                      <label
                        key={item.id}
                        htmlFor={`orient-${item.id}`}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                          settings.orientation === item.id
                            ? "border-primary bg-accent text-accent-foreground"
                            : "border-border bg-background hover:bg-muted/50",
                        )}
                      >
                        <RadioGroupItem id={`orient-${item.id}`} value={item.id} />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </fieldset>
              </AccordionContent>
            </AccordionItem>

            {/* 3. Printer Type & Theme */}
            <AccordionItem value="printer-theme">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Printer className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span>Printer Type &amp; Theme</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Printer Type</legend>
                  <RadioGroup
                    value={settings.printerType}
                    onValueChange={(val) => {
                      const pt = val as PrinterType;
                      onChange(
                        { ...settings, printerType: pt },
                        pt === "bw"
                          ? "Switched to B&W laser printer mode."
                          : "Switched to color printer mode.",
                      );
                    }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {[
                      { id: "color" as const, label: "Color printer" },
                      { id: "bw" as const, label: "B&W laser printer" },
                    ].map((item) => (
                      <label
                        key={item.id}
                        htmlFor={`printer-${item.id}`}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                          settings.printerType === item.id
                            ? "border-primary bg-accent text-accent-foreground"
                            : "border-border bg-background hover:bg-muted/50",
                        )}
                      >
                        <RadioGroupItem id={`printer-${item.id}`} value={item.id} />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </fieldset>

                {settings.printerType === "bw" ? (
                  <Alert variant="warning" role="status">
                    <AlertTriangle aria-hidden="true" />
                    <AlertDescription>
                      <strong>B&amp;W Laser Mode:</strong> Paper stays crisp white and lines convert to monochrome grayscale for sharp laser printing.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Full color: themes and color pickers are available.
                  </p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="theme-select">Theme</Label>
                  <NativeSelect
                    id="theme-select"
                    disabled={settings.printerType === "bw"}
                    value={settings.theme}
                    onChange={(e) => handleThemeSelect(e.target.value as ThemeId)}
                  >
                    {THEMES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </NativeSelect>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span
                      className="size-4 rounded-sm border border-foreground/30 shrink-0"
                      style={{ backgroundColor: selectedTheme.backgroundColor }}
                      aria-hidden="true"
                    />
                    <span
                      className="size-4 rounded-sm border border-foreground/30 shrink-0"
                      style={{ backgroundColor: selectedTheme.lineColor }}
                      aria-hidden="true"
                    />
                    <span
                      className="size-4 rounded-sm border border-foreground/30 shrink-0"
                      style={{ backgroundColor: selectedTheme.accentColor }}
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground text-xs">{selectedTheme.description}</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 4. Line Style */}
            <AccordionItem value="line-style">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Sliders className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span>Line Style &amp; Spacing</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="line-color-picker">Line Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="line-color-picker"
                        type="color"
                        disabled={settings.printerType === "bw"}
                        value={settings.lineColor}
                        onChange={(e) => onChange({ ...settings, lineColor: e.target.value })}
                        className="border-input h-11 w-11 shrink-0 cursor-pointer rounded-md border bg-background p-1 disabled:opacity-50"
                      />
                      <Input
                        type="text"
                        aria-label="Line color hex value"
                        disabled={settings.printerType === "bw"}
                        value={settings.lineColor}
                        onChange={(e) => onChange({ ...settings, lineColor: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="accent-color-picker">Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="accent-color-picker"
                        type="color"
                        disabled={settings.printerType === "bw"}
                        value={settings.accentColor}
                        onChange={(e) => onChange({ ...settings, accentColor: e.target.value })}
                        className="border-input h-11 w-11 shrink-0 cursor-pointer rounded-md border bg-background p-1 disabled:opacity-50"
                      />
                      <Input
                        type="text"
                        aria-label="Accent color hex value"
                        disabled={settings.printerType === "bw"}
                        value={settings.accentColor}
                        onChange={(e) => onChange({ ...settings, accentColor: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Line Style</legend>
                  <RadioGroup
                    value={settings.lineStyle}
                    onValueChange={(val) =>
                      onChange({ ...settings, lineStyle: val as LineStyle })
                    }
                    className="grid grid-cols-3 gap-2"
                  >
                    {[
                      { id: "solid" as const, label: "Solid" },
                      { id: "dashed" as const, label: "Dashed" },
                      { id: "dotted" as const, label: "Dotted" },
                    ].map((item) => (
                      <label
                        key={item.id}
                        htmlFor={`lstyle-${item.id}`}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm font-medium transition-colors",
                          settings.lineStyle === item.id
                            ? "border-primary bg-accent text-accent-foreground"
                            : "border-border bg-background hover:bg-muted/50",
                        )}
                      >
                        <RadioGroupItem id={`lstyle-${item.id}`} value={item.id} />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </fieldset>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor="line-spacing-input">
                      Line Spacing ({settings.units})
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onChange(
                          { ...settings, lineSpacingMm: selectedTemplate.defaultSpacingMm },
                          `Reset spacing to recommended ${formatLength(selectedTemplate.defaultSpacingMm, settings.units)}.`,
                        )
                      }
                    >
                      <Sparkles className="size-3.5" aria-hidden="true" />
                      <span>Recommend ({formatLength(selectedTemplate.defaultSpacingMm, settings.units)})</span>
                    </Button>
                  </div>

                  <Input
                    id="line-spacing-input"
                    type="number"
                    step={settings.units === "in" ? "0.01" : "0.5"}
                    aria-invalid={Boolean(errors.lineSpacing)}
                    aria-describedby={errors.lineSpacing ? "line-spacing-err" : "line-spacing-hint"}
                    value={roundForUnit(settings.lineSpacingMm, settings.units)}
                    onChange={(e) => {
                      const val = Number.parseFloat(e.target.value);
                      if (Number.isFinite(val)) {
                        onChange({ ...settings, lineSpacingMm: unitToMm(val, settings.units) });
                      }
                    }}
                  />

                  <Slider
                    aria-label="Adjust line spacing slider"
                    min={1}
                    max={60}
                    step={0.5}
                    value={[Math.min(60, Math.max(1, settings.lineSpacingMm))]}
                    onValueChange={([v]) => {
                      if (v !== undefined) onChange({ ...settings, lineSpacingMm: v });
                    }}
                  />

                  {isNearRecommended && (
                    <Badge variant="success">
                      <CheckCircle2 aria-hidden="true" />
                      <span>
                        Close to recommended {formatLength(selectedTemplate.defaultSpacingMm, settings.units)}
                      </span>
                    </Badge>
                  )}

                  <p id="line-spacing-hint" className="text-muted-foreground text-xs">
                    Common: 6–10 mm (0.24–0.39 in), suitable for daily writing.
                  </p>
                  <FieldError id="line-spacing-err" message={errors.lineSpacing} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="line-width-input">Line Width (px)</Label>
                  <Input
                    id="line-width-input"
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="10"
                    aria-invalid={Boolean(errors.lineWidth)}
                    aria-describedby={errors.lineWidth ? "line-width-err" : undefined}
                    value={settings.lineWidthPx}
                    onChange={(e) => {
                      const v = Number.parseFloat(e.target.value);
                      if (Number.isFinite(v)) onChange({ ...settings, lineWidthPx: v });
                    }}
                  />
                  <FieldError id="line-width-err" message={errors.lineWidth} />
                </div>

                {selectedTemplate.supportsLeftMarginRule && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                    <Label htmlFor="margin-rule-switch" className="cursor-pointer">
                      Show vertical margin rule line
                    </Label>
                    <Switch
                      id="margin-rule-switch"
                      checked={settings.showLeftMarginRule}
                      onCheckedChange={(checked) =>
                        onChange({ ...settings, showLeftMarginRule: checked })
                      }
                    />
                  </div>
                )}

                {selectedTemplate.supportsSlantAngle && (
                  <div className="space-y-1.5">
                    <Label htmlFor="slant-angle-input">
                      Slant Guide Angle (degrees, 45°–75°)
                    </Label>
                    <Input
                      id="slant-angle-input"
                      type="number"
                      min={35}
                      max={85}
                      step={1}
                      value={settings.slantAngleDeg}
                      onChange={(e) => {
                        const v = Number.parseFloat(e.target.value);
                        if (Number.isFinite(v)) onChange({ ...settings, slantAngleDeg: v });
                      }}
                    />
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                  <Label htmlFor="date-line-switch" className="cursor-pointer">
                    Date line (top right)
                  </Label>
                  <Switch
                    id="date-line-switch"
                    checked={settings.showDateLine}
                    onCheckedChange={(checked) =>
                      onChange({ ...settings, showDateLine: checked })
                    }
                  />
                </div>

                {settings.showDateLine && (
                  <div className="space-y-1.5">
                    <Label htmlFor="date-font-size">
                      Date font size ({settings.dateFontSizeMm} mm)
                    </Label>
                    <Input
                      id="date-font-size"
                      type="number"
                      step="0.2"
                      min="2"
                      max="5"
                      aria-invalid={Boolean(errors.dateFontSize)}
                      value={settings.dateFontSizeMm}
                      onChange={(e) => {
                        const v = Number.parseFloat(e.target.value);
                        if (Number.isFinite(v)) onChange({ ...settings, dateFontSizeMm: v });
                      }}
                    />
                    <p className="text-muted-foreground text-xs">
                      Larger text for the top-right date label (2–5 mm).
                    </p>
                    <FieldError message={errors.dateFontSize} />
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* 5. Margin Settings */}
            <AccordionItem value="margins">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Layers className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span>Margins &amp; Grid Fitting</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Line / grid layout</legend>
                  <RadioGroup
                    value={settings.layoutMode}
                    onValueChange={(val) =>
                      onChange({ ...settings, layoutMode: val as LayoutMode })
                    }
                  >
                    {[
                      {
                        id: "fill" as const,
                        label: "Fill to margins (edge to edge in margins)",
                      },
                      {
                        id: "fixed" as const,
                        label: "Fixed spacing (may leave a gap)",
                      },
                    ].map((item) => (
                      <label
                        key={item.id}
                        htmlFor={`layout-${item.id}`}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                          settings.layoutMode === item.id
                            ? "border-primary bg-accent text-accent-foreground"
                            : "border-border bg-background hover:bg-muted/50",
                        )}
                      >
                        <RadioGroupItem id={`layout-${item.id}`} value={item.id} />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Fill to margins distributes rows/cells evenly across the content box so lines sit flush on the margins without uneven gaps.
                  </p>
                </fieldset>

                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                  <Label htmlFor="link-margins-switch" className="cursor-pointer">
                    Use same margin on all 4 sides
                  </Label>
                  <Switch
                    id="link-margins-switch"
                    checked={settings.linkMargins}
                    onCheckedChange={(linkMargins) => {
                      onChange({
                        ...settings,
                        linkMargins,
                        ...(linkMargins
                          ? {
                              marginsMm: {
                                top: settings.marginsMm.top,
                                right: settings.marginsMm.top,
                                bottom: settings.marginsMm.top,
                                left: settings.marginsMm.top,
                              },
                            }
                          : {}),
                      });
                    }}
                  />
                </div>

                {settings.linkMargins ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="uniform-margin">Margins ({settings.units})</Label>
                    <Input
                      id="uniform-margin"
                      type="number"
                      step={settings.units === "in" ? "0.05" : "1"}
                      min="0"
                      aria-invalid={Boolean(errors.margins)}
                      value={roundForUnit(settings.marginsMm.top, settings.units)}
                      onChange={(e) => handleMarginUpdate("top", e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {(["top", "right", "bottom", "left"] as const).map((side) => (
                      <div key={side} className="space-y-1.5">
                        <Label htmlFor={`margin-${side}`}>
                          {side[0]!.toUpperCase() + side.slice(1)} ({settings.units})
                        </Label>
                        <Input
                          id={`margin-${side}`}
                          type="number"
                          step={settings.units === "in" ? "0.05" : "1"}
                          min="0"
                          aria-invalid={Boolean(errors.margins)}
                          value={roundForUnit(settings.marginsMm[side], settings.units)}
                          onChange={(e) => handleMarginUpdate(side, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <FieldError message={errors.margins} />
              </AccordionContent>
            </AccordionItem>

            {/* 6. Hole Punch Marks */}
            <AccordionItem value="hole-punch">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <CircleDot className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span>Hole Punch Marks</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Add black guide dots so you can punch holes in the same place every time with a hand punch.
                </p>
                <fieldset>
                  <legend className="sr-only">Hole Punch Pattern</legend>
                  <RadioGroup
                    value={settings.holePunch}
                    onValueChange={(val) =>
                      onChange({ ...settings, holePunch: val as HolePunchType })
                    }
                  >
                    {HOLE_PUNCH_OPTIONS.map((opt) => (
                      <label
                        key={opt.id}
                        htmlFor={`punch-${opt.id}`}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                          settings.holePunch === opt.id
                            ? "border-primary bg-accent text-accent-foreground"
                            : "border-border bg-background hover:bg-muted/50",
                        )}
                      >
                        <RadioGroupItem id={`punch-${opt.id}`} value={opt.id} />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </fieldset>
              </AccordionContent>
            </AccordionItem>

            {/* 7. Sidebar, Background, Watermark & Logo */}
            <AccordionItem value="decorations">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Palette className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span>Sidebar, Background, Watermark &amp; Logo</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                  <Label htmlFor="sidebar-switch" className="cursor-pointer">
                    Enable Sidebar
                  </Label>
                  <Switch
                    id="sidebar-switch"
                    checked={settings.sidebarEnabled}
                    onCheckedChange={(checked) =>
                      onChange({ ...settings, sidebarEnabled: checked })
                    }
                  />
                </div>

                {settings.sidebarEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="sidebar-side">Position</Label>
                      <NativeSelect
                        id="sidebar-side"
                        value={settings.sidebarPosition}
                        onChange={(e) =>
                          onChange({
                            ...settings,
                            sidebarPosition: e.target.value as "left" | "right",
                          })
                        }
                      >
                        <option value="left">Left side</option>
                        <option value="right">Right side</option>
                      </NativeSelect>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sidebar-width">Width ({settings.units})</Label>
                      <Input
                        id="sidebar-width"
                        type="number"
                        step={settings.units === "in" ? "0.1" : "1"}
                        min={settings.units === "in" ? 0.5 : 15}
                        value={roundForUnit(settings.sidebarWidthMm, settings.units)}
                        onChange={(e) => {
                          const v = Number.parseFloat(e.target.value);
                          if (Number.isFinite(v)) {
                            onChange({ ...settings, sidebarWidthMm: unitToMm(v, settings.units) });
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-1.5">
                  <Label htmlFor="bg-color-picker">Background Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="bg-color-picker"
                      type="color"
                      disabled={settings.printerType === "bw"}
                      value={settings.backgroundColor}
                      onChange={(e) => onChange({ ...settings, backgroundColor: e.target.value })}
                      className="border-input h-11 w-11 shrink-0 cursor-pointer rounded-md border bg-background p-1 disabled:opacity-50"
                    />
                    <Input
                      type="text"
                      aria-label="Background color hex value"
                      disabled={settings.printerType === "bw"}
                      value={settings.backgroundColor}
                      onChange={(e) => onChange({ ...settings, backgroundColor: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bg-pattern-select">Background Pattern</Label>
                  <NativeSelect
                    id="bg-pattern-select"
                    value={settings.backgroundPattern}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        backgroundPattern: e.target.value as BackgroundPatternId,
                      })
                    }
                  >
                    {BACKGROUND_PATTERNS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                {settings.backgroundPattern !== "none" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="pattern-opacity">
                      Pattern Opacity ({Math.round(settings.patternOpacity * 100)}%)
                    </Label>
                    <Slider
                      id="pattern-opacity"
                      aria-label="Pattern opacity"
                      min={0.04}
                      max={0.6}
                      step={0.02}
                      value={[settings.patternOpacity]}
                      onValueChange={([v]) => {
                        if (v !== undefined) onChange({ ...settings, patternOpacity: v });
                      }}
                    />
                  </div>
                )}

                {settings.backgroundPattern === "custom-image" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="bg-image-upload">Custom Background Image</Label>
                    <Input
                      id="bg-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFile(e.target.files?.[0], "bg")}
                    />
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                  <Label htmlFor="watermark-switch" className="cursor-pointer">
                    Enable Watermark
                  </Label>
                  <Switch
                    id="watermark-switch"
                    checked={settings.watermarkEnabled}
                    onCheckedChange={(checked) =>
                      onChange({ ...settings, watermarkEnabled: checked })
                    }
                  />
                </div>

                {settings.watermarkEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="watermark-text">Watermark Text</Label>
                      <Input
                        id="watermark-text"
                        type="text"
                        value={settings.watermarkText}
                        onChange={(e) => onChange({ ...settings, watermarkText: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="watermark-opacity">
                        Opacity ({Math.round(settings.watermarkOpacity * 100)}%)
                      </Label>
                      <Slider
                        id="watermark-opacity"
                        aria-label="Watermark opacity"
                        min={0.04}
                        max={0.45}
                        step={0.02}
                        value={[settings.watermarkOpacity]}
                        onValueChange={([v]) => {
                          if (v !== undefined) onChange({ ...settings, watermarkOpacity: v });
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                  <Label htmlFor="logo-switch" className="cursor-pointer">
                    Enable Logo
                  </Label>
                  <Switch
                    id="logo-switch"
                    checked={settings.logoEnabled}
                    onCheckedChange={(checked) =>
                      onChange({ ...settings, logoEnabled: checked })
                    }
                  />
                </div>

                {settings.logoEnabled && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="logo-upload">Upload Logo Image</Label>
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFile(e.target.files?.[0], "logo")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="logo-corner">Corner</Label>
                        <NativeSelect
                          id="logo-corner"
                          value={settings.logoPosition}
                          onChange={(e) =>
                            onChange({
                              ...settings,
                              logoPosition: e.target.value as CornerPosition,
                            })
                          }
                        >
                          <option value="top-left">Top Left</option>
                          <option value="top-right">Top Right</option>
                          <option value="bottom-left">Bottom Left</option>
                          <option value="bottom-right">Bottom Right</option>
                        </NativeSelect>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="logo-size">Size (mm)</Label>
                        <Input
                          id="logo-size"
                          type="number"
                          min={8}
                          max={45}
                          value={settings.logoSizeMm}
                          onChange={(e) => {
                            const v = Number.parseFloat(e.target.value);
                            if (Number.isFinite(v)) onChange({ ...settings, logoSizeMm: v });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* 8. Pages & Settings JSON */}
            <AccordionItem value="pages">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <BookmarkCheck className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span>Pages, Duplex &amp; Saved Settings</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="page-count-input">Page Count (1–100)</Label>
                  <Input
                    id="page-count-input"
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    aria-invalid={Boolean(errors.pageCount)}
                    aria-describedby={errors.pageCount ? "page-count-err" : undefined}
                    value={settings.pageCount}
                    onChange={(e) => {
                      const v = Number.parseInt(e.target.value, 10);
                      if (Number.isFinite(v)) onChange({ ...settings, pageCount: v });
                    }}
                  />
                  <FieldError id="page-count-err" message={errors.pageCount} />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                  <Label htmlFor="page-number-switch" className="cursor-pointer">
                    Show Page Number
                  </Label>
                  <Switch
                    id="page-number-switch"
                    checked={settings.showPageNumber}
                    onCheckedChange={(checked) =>
                      onChange({ ...settings, showPageNumber: checked })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                    <Label htmlFor="duplex-switch" className="cursor-pointer">
                      Double-sided printing (front + back)
                    </Label>
                    <Switch
                      id="duplex-switch"
                      checked={settings.doubleSided}
                      onCheckedChange={(checked) =>
                        onChange({ ...settings, doubleSided: checked })
                      }
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Mirrors asymmetric margins, left-edge hole punches, and page numbers on back pages.
                  </p>
                </div>

                <Separator />

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={onExportSettings}>
                    <Download aria-hidden="true" />
                    <span>Export Settings</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => importInputRef.current?.click()}
                  >
                    <Upload aria-hidden="true" />
                    <span>Import Settings</span>
                  </Button>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="sr-only"
                    aria-label="Choose settings JSON file to import"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onImportSettings(f);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (settings !== DEFAULT_PAPER_SETTINGS) onReset();
                    }}
                  >
                    <RotateCcw aria-hidden="true" />
                    <span>Reset</span>
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </aside>
  );
}
