import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  RotateCcw,
  Sparkles,
  Upload,
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatLength, PAPER_SIZES, roundForUnit, unitToMm } from "@/data/sizes";
import {
  applyTemplateDefaults,
  CATEGORY_LABELS,
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
  { id: "5-hole", label: "5-hole (left edge, 3-hole + 2-hole)" },
  { id: "top-2-hole", label: "Top 2-hole (top fasteners, 2.75 in apart)" },
  { id: "single-ring", label: "Single ring (top-left corner)" },
];

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="text-destructive mt-1 flex items-center gap-1.5 text-xs font-medium"
    >
      <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

interface NumericInputProps
  extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: number;
  onCommitNumber: (val: number) => void;
  integer?: boolean;
}

function NumericInput({
  value,
  onCommitNumber,
  integer = false,
  onBlur,
  onFocus,
  ...props
}: NumericInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (!focused) {
      setDraft(String(value));
    }
  }, [value, focused]);

  return (
    <Input
      type="number"
      value={focused ? draft : String(value)}
      onFocus={(e) => {
        setFocused(true);
        setDraft(String(value));
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        const parsed = integer
          ? Number.parseInt(draft, 10)
          : Number.parseFloat(draft);
        if (Number.isFinite(parsed)) {
          onCommitNumber(parsed);
        } else {
          setDraft(String(value));
        }
        onBlur?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw.trim() === "" || raw === "-" || raw.endsWith(".")) return;
        const parsed = integer
          ? Number.parseInt(raw, 10)
          : Number.parseFloat(raw);
        if (Number.isFinite(parsed)) {
          onCommitNumber(parsed);
        }
      }}
      {...props}
    />
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
  const [confirmingReset, setConfirmingReset] = useState(false);
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

  const handleMarginCommit = (side: "top" | "right" | "bottom" | "left", num: number) => {
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
      className="no-print w-full md:w-[320px] lg:w-[368px] xl:w-[400px] shrink-0"
    >
      <Card className="gap-4 py-4">
        <CardHeader className="px-4 pb-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Paper Settings</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {filteredTemplates.length} of {PAPER_TEMPLATES.length}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="@container px-4">
          <Tabs defaultValue="basics" className="w-full gap-4">
            <TabsList className="grid h-11 w-full grid-cols-3">
              <TabsTrigger value="basics" className="h-9 text-xs sm:text-sm">
                Basics
              </TabsTrigger>
              <TabsTrigger value="layout" className="h-9 text-xs sm:text-sm">
                Layout
              </TabsTrigger>
              <TabsTrigger value="extras" className="h-9 text-xs sm:text-sm">
                Extras
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: BASICS */}
            <TabsContent value="basics" className="space-y-3">
              {/* Template */}
              <section className="space-y-2.5" aria-labelledby="section-template">
                <div className="flex items-center justify-between">
                  <h2 id="section-template" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    1. Paper Type
                  </h2>
                  {templateSearch.trim() !== "" || categoryFilter !== "all" ? (
                    <span className="text-muted-foreground text-xs">
                      {filteredTemplates.length} matching
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-2 @[290px]:grid-cols-2">
                  <Input
                    id="template-search"
                    type="search"
                    aria-label="Search templates"
                    placeholder="Search templates..."
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                  />
                  <NativeSelect
                    id="category-filter"
                    aria-label="Filter by category"
                    value={categoryFilter}
                    onChange={(e) =>
                      setCategoryFilter(e.target.value as PaperCategory | "all")
                    }
                  >
                    <option value="all">All categories</option>
                    {(Object.keys(CATEGORY_LABELS) as PaperCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paper-type-select" className="sr-only">
                    Paper Type
                  </Label>
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
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {selectedTemplate.description}
                  </p>
                </div>
              </section>

              <Separator />

              {/* Size & Orientation */}
              <section className="space-y-2.5" aria-labelledby="section-size">
                <h2 id="section-size" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  2. Page Size
                </h2>

                <div className="space-y-1.5">
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
                  <div className="grid grid-cols-1 gap-2.5 @[280px]:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="custom-width">Width ({settings.units})</Label>
                      <NumericInput
                        id="custom-width"
                        step={settings.units === "in" ? "0.1" : "1"}
                        aria-invalid={Boolean(errors.customWidth)}
                        aria-describedby={errors.customWidth ? "custom-width-err" : undefined}
                        value={roundForUnit(settings.customWidthMm, settings.units)}
                        onCommitNumber={(v) =>
                          onChange({ ...settings, customWidthMm: unitToMm(v, settings.units) })
                        }
                      />
                      <FieldError id="custom-width-err" message={errors.customWidth} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="custom-height">Height ({settings.units})</Label>
                      <NumericInput
                        id="custom-height"
                        step={settings.units === "in" ? "0.1" : "1"}
                        aria-invalid={Boolean(errors.customHeight)}
                        aria-describedby={errors.customHeight ? "custom-height-err" : undefined}
                        value={roundForUnit(settings.customHeightMm, settings.units)}
                        onCommitNumber={(v) =>
                          onChange({ ...settings, customHeightMm: unitToMm(v, settings.units) })
                        }
                      />
                      <FieldError id="custom-height-err" message={errors.customHeight} />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2.5 @[420px]:grid-cols-2">
                  <fieldset className="space-y-1.5">
                    <legend className="text-xs font-medium text-foreground">Orientation</legend>
                    <RadioGroup
                      value={settings.orientation}
                      onValueChange={(val) =>
                        onChange({ ...settings, orientation: val as Orientation })
                      }
                      className="grid grid-cols-2 gap-1.5"
                    >
                      {[
                        { id: "portrait" as const, label: "Portrait" },
                        { id: "landscape" as const, label: "Landscape" },
                      ].map((item) => (
                        <label
                          key={item.id}
                          htmlFor={`orient-${item.id}`}
                          className={cn(
                            "flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                            settings.orientation === item.id
                              ? "border-primary bg-accent text-accent-foreground"
                              : "border-border bg-background hover:bg-muted/50",
                          )}
                        >
                          <RadioGroupItem id={`orient-${item.id}`} value={item.id} className="size-3.5 shrink-0" />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </fieldset>

                  <fieldset className="space-y-1.5">
                    <legend className="text-xs font-medium text-foreground">Units</legend>
                    <RadioGroup
                      value={settings.units}
                      onValueChange={(val) => handleUnitChange(val as Units)}
                      className="grid grid-cols-2 gap-1.5"
                    >
                      {[
                        { id: "mm" as const, label: "Metric (mm)", short: "mm" },
                        { id: "in" as const, label: "Imperial (in)", short: "in" },
                      ].map((item) => (
                        <label
                          key={item.id}
                          htmlFor={`unit-${item.id}`}
                          aria-label={item.label}
                          className={cn(
                            "flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                            settings.units === item.id
                              ? "border-primary bg-accent text-accent-foreground"
                              : "border-border bg-background hover:bg-muted/50",
                          )}
                        >
                          <RadioGroupItem
                            id={`unit-${item.id}`}
                            value={item.id}
                            aria-label={item.label}
                            className="size-3.5 shrink-0"
                          />
                          <span aria-hidden="true">{item.short}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </fieldset>
                </div>
              </section>

              <Separator />

              {/* Printer & Theme */}
              <section className="space-y-2.5" aria-labelledby="section-theme">
                <h2 id="section-theme" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  3. Printer &amp; Theme
                </h2>

                <fieldset className="space-y-1.5">
                  <legend className="sr-only">Printer Type</legend>
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
                    className="grid grid-cols-1 gap-2 @[280px]:grid-cols-2"
                  >
                    {[
                      { id: "color" as const, label: "Color printer" },
                      { id: "bw" as const, label: "B&W laser printer" },
                    ].map((item) => (
                      <label
                        key={item.id}
                        htmlFor={`printer-${item.id}`}
                        className={cn(
                          "flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-xs font-medium leading-tight transition-colors",
                          settings.printerType === item.id
                            ? "border-primary bg-accent text-accent-foreground"
                            : "border-border bg-background hover:bg-muted/50",
                        )}
                      >
                        <RadioGroupItem id={`printer-${item.id}`} value={item.id} className="size-4 shrink-0" />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </fieldset>

                {settings.printerType === "bw" && (
                  <Alert variant="warning" role="status" className="py-2 text-xs">
                    <AlertTriangle aria-hidden="true" />
                    <AlertDescription className="text-xs">
                      <strong>B&amp;W Laser Mode:</strong> White paper + monochrome lines.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="theme-select">Theme</Label>
                    <div className="flex items-center gap-1" aria-hidden="true">
                      {[selectedTheme.backgroundColor, selectedTheme.lineColor, selectedTheme.accentColor].map(
                        (c, idx) => (
                          <span
                            key={idx}
                            className="size-3.5 rounded-xs border border-foreground/25"
                            style={{ backgroundColor: c }}
                          />
                        ),
                      )}
                    </div>
                  </div>
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
                </div>
              </section>

              <Separator />

              {/* Spacing */}
              <section className="space-y-2" aria-labelledby="section-spacing-heading">
                <div className="flex items-center justify-between gap-2">
                  <h2
                    id="section-spacing-heading"
                    className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                  >
                    4. Line Spacing
                  </h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                      onChange(
                        { ...settings, lineSpacingMm: selectedTemplate.defaultSpacingMm },
                        `Reset spacing to recommended ${formatLength(selectedTemplate.defaultSpacingMm, settings.units)}.`,
                      )
                    }
                  >
                    <Sparkles className="size-3" aria-hidden="true" />
                    <span>Reset ({formatLength(selectedTemplate.defaultSpacingMm, settings.units)})</span>
                  </Button>
                </div>

                <Label htmlFor="line-spacing-input" className="sr-only">
                  Line Spacing ({settings.units})
                </Label>
                <div className="flex items-center gap-3">
                  <NumericInput
                    id="line-spacing-input"
                    className="w-24 shrink-0"
                    step={settings.units === "in" ? "0.01" : "0.5"}
                    aria-invalid={Boolean(errors.lineSpacing)}
                    aria-describedby={errors.lineSpacing ? "line-spacing-err" : undefined}
                    value={roundForUnit(settings.lineSpacingMm, settings.units)}
                    onCommitNumber={(val) =>
                      onChange({ ...settings, lineSpacingMm: unitToMm(val, settings.units) })
                    }
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
                </div>

                {isNearRecommended && (
                  <Badge variant="success" className="text-[11px]">
                    <CheckCircle2 aria-hidden="true" />
                    <span>
                      Recommended spacing ({formatLength(selectedTemplate.defaultSpacingMm, settings.units)})
                    </span>
                  </Badge>
                )}
                <FieldError id="line-spacing-err" message={errors.lineSpacing} />
              </section>
            </TabsContent>

            {/* TAB 2: LAYOUT */}
            <TabsContent value="layout" className="space-y-4">
              <section className="space-y-2.5" aria-labelledby="section-lines">
                <h2 id="section-lines" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Lines &amp; Colors
                </h2>

                <div className="grid grid-cols-1 gap-2.5 @[280px]:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="line-color-picker">Line Color</Label>
                    <div className="flex items-center gap-1.5">
                      <input
                        id="line-color-picker"
                        type="color"
                        disabled={settings.printerType === "bw"}
                        value={settings.lineColor}
                        onChange={(e) => onChange({ ...settings, lineColor: e.target.value })}
                        className="border-input h-10 w-10 shrink-0 cursor-pointer rounded-md border bg-background p-1 disabled:opacity-50"
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
                  <div className="space-y-1">
                    <Label htmlFor="accent-color-picker">Accent Color</Label>
                    <div className="flex items-center gap-1.5">
                      <input
                        id="accent-color-picker"
                        type="color"
                        disabled={settings.printerType === "bw"}
                        value={settings.accentColor}
                        onChange={(e) => onChange({ ...settings, accentColor: e.target.value })}
                        className="border-input h-10 w-10 shrink-0 cursor-pointer rounded-md border bg-background p-1 disabled:opacity-50"
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

                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <span className="text-xs font-medium">Line Style</span>
                    <RadioGroup
                      value={settings.lineStyle}
                      onValueChange={(val) =>
                        onChange({ ...settings, lineStyle: val as LineStyle })
                      }
                      className="grid grid-cols-3 gap-1.5"
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
                            "flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                            settings.lineStyle === item.id
                              ? "border-primary bg-accent text-accent-foreground"
                              : "border-border bg-background hover:bg-muted/50",
                          )}
                        >
                          <RadioGroupItem id={`lstyle-${item.id}`} value={item.id} className="size-3.5 shrink-0" />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 @[280px]:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="line-width-input">Line Width (px)</Label>
                      <NumericInput
                        id="line-width-input"
                        step="0.05"
                        min="0.1"
                        max="10"
                        aria-invalid={Boolean(errors.lineWidth)}
                        aria-describedby={errors.lineWidth ? "line-width-err" : undefined}
                        value={settings.lineWidthPx}
                        onCommitNumber={(v) => onChange({ ...settings, lineWidthPx: v })}
                      />
                    </div>
                    {selectedTemplate.supportsSlantAngle && (
                      <div className="space-y-1">
                        <Label htmlFor="slant-angle-input">Slant Angle (45°–75°)</Label>
                        <NumericInput
                          id="slant-angle-input"
                          min={35}
                          max={85}
                          step={1}
                          value={settings.slantAngleDeg}
                          onCommitNumber={(v) => onChange({ ...settings, slantAngleDeg: v })}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <FieldError id="line-width-err" message={errors.lineWidth} />

                {selectedTemplate.supportsLeftMarginRule && (
                  <div className="flex min-h-10 items-center justify-between gap-2 rounded-md border px-3 py-2">
                    <Label htmlFor="margin-rule-switch" className="cursor-pointer text-xs">
                      Vertical margin rule line
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
              </section>

              <Separator />

              <section className="space-y-2.5" aria-labelledby="section-margins">
                <h2 id="section-margins" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Margins &amp; Grid Fitting
                </h2>

                <fieldset className="space-y-1.5">
                  <legend className="sr-only">Grid Fitting</legend>
                  <RadioGroup
                    value={settings.layoutMode}
                    onValueChange={(val) =>
                      onChange({ ...settings, layoutMode: val as LayoutMode })
                    }
                    className="grid grid-cols-1 gap-2 @[280px]:grid-cols-2"
                  >
                    {[
                      { id: "fill" as const, label: "Fill to margins" },
                      { id: "fixed" as const, label: "Fixed spacing" },
                    ].map((item) => (
                      <label
                        key={item.id}
                        htmlFor={`layout-${item.id}`}
                        className={cn(
                          "flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-xs font-medium leading-tight transition-colors",
                          settings.layoutMode === item.id
                            ? "border-primary bg-accent text-accent-foreground"
                            : "border-border bg-background hover:bg-muted/50",
                        )}
                      >
                        <RadioGroupItem id={`layout-${item.id}`} value={item.id} className="size-4 shrink-0" />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </fieldset>

                <div className="flex min-h-10 items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <Label htmlFor="link-margins-switch" className="cursor-pointer text-xs">
                    Same margin on all 4 sides
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
                  <div className="space-y-1">
                    <Label htmlFor="uniform-margin">Margins ({settings.units})</Label>
                    <NumericInput
                      id="uniform-margin"
                      step={settings.units === "in" ? "0.05" : "1"}
                      min="0"
                      aria-invalid={Boolean(errors.margins)}
                      value={roundForUnit(settings.marginsMm.top, settings.units)}
                      onCommitNumber={(v) => handleMarginCommit("top", v)}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 @[270px]:grid-cols-2">
                    {(["top", "right", "bottom", "left"] as const).map((side) => (
                      <div key={side} className="space-y-1">
                        <Label htmlFor={`margin-${side}`}>
                          {side[0]!.toUpperCase() + side.slice(1)} ({settings.units})
                        </Label>
                        <NumericInput
                          id={`margin-${side}`}
                          step={settings.units === "in" ? "0.05" : "1"}
                          min="0"
                          aria-invalid={Boolean(errors.margins)}
                          value={roundForUnit(settings.marginsMm[side], settings.units)}
                          onCommitNumber={(v) => handleMarginCommit(side, v)}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <FieldError message={errors.margins} />
              </section>

              <Separator />

              <section className="space-y-2.5" aria-labelledby="section-pages">
                <h2 id="section-pages" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Punches, Header &amp; Pages
                </h2>

                <div className="space-y-1">
                  <Label htmlFor="hole-punch-select">Hole Punch Marks</Label>
                  <NativeSelect
                    id="hole-punch-select"
                    value={settings.holePunch}
                    onChange={(e) =>
                      onChange({ ...settings, holePunch: e.target.value as HolePunchType })
                    }
                  >
                    {HOLE_PUNCH_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="grid grid-cols-1 gap-2.5 @[280px]:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="page-count-input">Page Count (1–100)</Label>
                    <NumericInput
                      id="page-count-input"
                      integer
                      min={1}
                      max={100}
                      step={1}
                      aria-invalid={Boolean(errors.pageCount)}
                      aria-describedby={errors.pageCount ? "page-count-err" : undefined}
                      value={settings.pageCount}
                      onCommitNumber={(v) => onChange({ ...settings, pageCount: v })}
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="flex h-10 items-center justify-between gap-2 rounded-md border px-2.5">
                      <Label htmlFor="page-number-switch" className="cursor-pointer text-xs">
                        Page #
                      </Label>
                      <Switch
                        id="page-number-switch"
                        checked={settings.showPageNumber}
                        onCheckedChange={(checked) =>
                          onChange({ ...settings, showPageNumber: checked })
                        }
                      />
                    </div>
                  </div>
                </div>
                <FieldError id="page-count-err" message={errors.pageCount} />

                <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <Label htmlFor="duplex-switch" className="cursor-pointer text-xs">
                    Double-sided mirroring (front + back)
                  </Label>
                  <Switch
                    id="duplex-switch"
                    checked={settings.doubleSided}
                    onCheckedChange={(checked) =>
                      onChange({ ...settings, doubleSided: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <Label htmlFor="date-line-switch" className="cursor-pointer text-xs">
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
                  <div className="space-y-1">
                    <Label htmlFor="date-font-size">
                      Date font size ({settings.dateFontSizeMm} mm)
                    </Label>
                    <NumericInput
                      id="date-font-size"
                      step="0.2"
                      min="2"
                      max="5"
                      aria-invalid={Boolean(errors.dateFontSize)}
                      value={settings.dateFontSizeMm}
                      onCommitNumber={(v) => onChange({ ...settings, dateFontSizeMm: v })}
                    />
                    <FieldError message={errors.dateFontSize} />
                  </div>
                )}
              </section>
            </TabsContent>

            {/* TAB 3: EXTRAS */}
            <TabsContent value="extras" className="space-y-4">
              <section className="space-y-2.5" aria-labelledby="section-bg">
                <h2 id="section-bg" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Background &amp; Sidebar
                </h2>

                <div className="space-y-1">
                  <Label htmlFor="bg-color-picker">Background Color</Label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="bg-color-picker"
                      type="color"
                      disabled={settings.printerType === "bw"}
                      value={settings.backgroundColor}
                      onChange={(e) => onChange({ ...settings, backgroundColor: e.target.value })}
                      className="border-input h-10 w-10 shrink-0 cursor-pointer rounded-md border bg-background p-1 disabled:opacity-50"
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

                <div className="space-y-1">
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
                  <div className="space-y-1">
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
                  <div className="space-y-1">
                    <Label htmlFor="bg-image-upload">Custom Background Image</Label>
                    <Input
                      id="bg-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFile(e.target.files?.[0], "bg")}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <Label htmlFor="sidebar-switch" className="cursor-pointer text-xs">
                    Index Sidebar
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
                  <div className="grid grid-cols-1 gap-2 @[280px]:grid-cols-2">
                    <div className="space-y-1">
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
                    <div className="space-y-1">
                      <Label htmlFor="sidebar-width">Width ({settings.units})</Label>
                      <NumericInput
                        id="sidebar-width"
                        step={settings.units === "in" ? "0.1" : "1"}
                        min={settings.units === "in" ? 0.5 : 15}
                        value={roundForUnit(settings.sidebarWidthMm, settings.units)}
                        onCommitNumber={(v) =>
                          onChange({ ...settings, sidebarWidthMm: unitToMm(v, settings.units) })
                        }
                      />
                    </div>
                  </div>
                )}
              </section>

              <Separator />

              <section className="space-y-2.5" aria-labelledby="section-brand">
                <h2 id="section-brand" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Watermark &amp; Logo
                </h2>

                <div className="flex min-h-10 items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <Label htmlFor="watermark-switch" className="cursor-pointer text-xs">
                    Watermark
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
                  <div className="grid grid-cols-1 gap-2 @[300px]:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="watermark-text">Text</Label>
                      <Input
                        id="watermark-text"
                        type="text"
                        value={settings.watermarkText}
                        onChange={(e) => onChange({ ...settings, watermarkText: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
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

                <div className="flex min-h-10 items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <Label htmlFor="logo-switch" className="cursor-pointer text-xs">
                    Corner Logo
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
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="logo-upload">Upload Logo Image</Label>
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFile(e.target.files?.[0], "logo")}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-2 @[280px]:grid-cols-2">
                      <div className="space-y-1">
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
                      <div className="space-y-1">
                        <Label htmlFor="logo-size">Size (mm)</Label>
                        <NumericInput
                          id="logo-size"
                          min={8}
                          max={45}
                          value={settings.logoSizeMm}
                          onCommitNumber={(v) => onChange({ ...settings, logoSizeMm: v })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <Separator />

              <section className="space-y-2.5" aria-labelledby="section-backup">
                <h2 id="section-backup" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Saved Settings
                </h2>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={onExportSettings}>
                    <Download aria-hidden="true" />
                    <span>Export JSON</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => importInputRef.current?.click()}
                  >
                    <Upload aria-hidden="true" />
                    <span>Import JSON</span>
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
                  {!confirmingReset ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmingReset(true)}
                    >
                      <RotateCcw aria-hidden="true" />
                      <span>Reset</span>
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setConfirmingReset(false);
                          onReset();
                        }}
                      >
                        Confirm Reset
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmingReset(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </aside>
  );
}
