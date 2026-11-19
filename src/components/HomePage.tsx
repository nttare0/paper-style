import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  FileDown,
  FileText,
  Image as ImageIcon,
  Layers,
  Menu,
  PenLine,
  Printer,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  WifiOff,
  X,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORY_LABELS, getTemplateSpec, PAPER_TEMPLATES } from "@/data/templates";
import { getThemeSpec } from "@/data/themes";
import { buildSheetSvg } from "@/engine/buildSheetSvg";
import { cn } from "@/lib/utils";
import type { PaperCategory, PaperTypeId, ThemeId } from "@/types/paper";
import { ConsentAnalyticsBanner, openConsentBanner } from "./ConsentAnalyticsBanner";
import { buildPreviewSettings, LandingSheetPreview } from "./LandingSheetPreview";

const HERO_TEMPLATES: { id: PaperTypeId; label: string }[] = [
  { id: "cornell-notes", label: "Cornell Notes" },
  { id: "lined", label: "Lined Paper" },
  { id: "weekly-planner", label: "Weekly Planner" },
  { id: "guitar-tab", label: "Guitar Tab" },
  { id: "isometric-grid", label: "Isometric Grid" },
  { id: "genko-yoshi", label: "Genkō yōshi" },
];

const HERO_THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: "default", label: "Default", swatch: "#FFFFFF" },
  { id: "classic", label: "Classic", swatch: "#38BDF8" },
  { id: "sepia", label: "Sepia", swatch: "#FDF6E3" },
  { id: "ocean", label: "Ocean", swatch: "#F0F9FF" },
  { id: "night", label: "Night", swatch: "#111827" },
];

const CATEGORY_ORDER: { id: PaperCategory; shortLabel: string }[] = [
  { id: "essential", shortLabel: "Essential" },
  { id: "math-tech", shortLabel: "Math & Tech" },
  { id: "music", shortLabel: "Music" },
  { id: "calligraphy", shortLabel: "Calligraphy" },
  { id: "homework", shortLabel: "School" },
  { id: "planners", shortLabel: "Planners" },
];

const REAL_PRINT_STORIES = [
  {
    src: "/images/graphing-notebook.webp",
    alt: "Open spiral grid notebook with a fine ink pen on a white painted wood desk",
    title: "True-scale geometry & paper sizing",
    badge: "10 paper sizes",
    description:
      "Configure A4, A5, A3, B4, B5, Letter, Legal, Tabloid, Executive, or exact custom millimeter and inch dimensions with linked margins and fill-to-fit or fixed line spacing.",
    credit: "Photo by Kelly Sikkema on Unsplash",
  },
  {
    src: "/images/sheet-music-score.webp",
    alt: "Printed sheet music score opened on a wooden upright piano",
    title: "Write directly on any sheet",
    badge: "Full-screen canvas",
    description:
      "Double-click any sheet to open the distraction-free editor. Type inside structured Cornell, planner, calendar, and budget sections, or click anywhere on music staves and grids.",
    credit: "Photo by Bruno Croci on Unsplash",
  },
  {
    src: "/images/calligraphy-grid-sheets.webp",
    alt: "Printed practice sheets ruled with square character grids filled with blue ink calligraphy",
    title: "Global scripts & crisp B&W output",
    badge: "13 themes + B&W",
    description:
      "Switch between French Seyes, Chinese Mi Zi Ge, Tianzi, and Pinyin, Japanese Genkō yōshi, German Lineatur 3, US handwriting lines, and 1-click B&W laser ink calibration.",
    credit: "Photo by jason hu on Unsplash",
  },
] as const;

const STUDIO_CAPABILITIES = [
  {
    icon: SlidersHorizontal,
    title: "Millimeter-level control",
    body: "Tune line spacing, stroke weight, solid/dashed/dotted ruling, slant angles, date line, index sidebars, and 7 binder hole-punch presets.",
  },
  {
    icon: Layers,
    title: "Multi-page & double-sided",
    body: "Generate packets from 1 to 100 sheets with optional page numbers and automatic front/back hole-punch mirroring for binders.",
  },
  {
    icon: PenLine,
    title: "Built-in sheet writing",
    body: "Choose charcoal, royal blue, crimson, or forest ink across three text scales and keep notes right inside your exported PDF, SVG, PNG, or DOCX.",
  },
  {
    icon: Printer,
    title: "Color or B&W laser ready",
    body: "Preview 13 curated paper and ink themes or switch to B&W Laser Mode to flatten backgrounds to pure white with crisp grayscale strokes.",
  },
  {
    icon: FileDown,
    title: "Five local export formats",
    body: "Download vector PDFs, standalone SVGs, 300 DPI PNGs, editable DOCX documents, or JSON presets—plus native browser print.",
  },
  {
    icon: WifiOff,
    title: "Private & offline-capable",
    body: "Every calculation and export runs inside your browser. Settings stay locally in browser storage with zero accounts and offline PWA support.",
  },
] as const;

const EXPORT_FORMATS = [
  {
    icon: FileDown,
    name: "PDF",
    detail: "Multi-page crisp vector print packets (1–100 sheets)",
  },
  {
    icon: Sparkles,
    name: "SVG",
    detail: "Infinite-resolution scalable vector sheet per page",
  },
  {
    icon: ImageIcon,
    name: "PNG",
    detail: "High-DPI raster export for tablets and note apps",
  },
  {
    icon: FileText,
    name: "DOCX",
    detail: "Ready-to-open Word sheet for classroom packets",
  },
  {
    icon: ShieldCheck,
    name: "JSON",
    detail: "Save, share, and re-import custom studio presets",
  },
] as const;

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Pick a template & sheet geometry",
    description:
      "Select from 77 paper layouts, set your paper size and units (mm or in), and tune line spacing, margins, themes, and binder punch marks.",
  },
  {
    step: "02",
    title: "Customize or type on the sheet",
    description:
      "Add a watermark, logo, or background pattern—or open full-screen Edit Sheet mode to fill structured planner fields and freeform notes.",
  },
  {
    step: "03",
    title: "Export locally or print immediately",
    description:
      "Print straight from your browser or save vector PDF, SVG, 300 DPI PNG, DOCX, or reusable JSON settings without uploading anything.",
  },
] as const;

const FAQS = [
  {
    id: "free",
    question: "Is PaperStyle free to use without signing up?",
    answer:
      "Yes. PaperStyle opens directly in your browser with all 77 templates, 13 color themes, B&W laser mode, full-screen sheet writing, and PDF, SVG, PNG, DOCX, and JSON exports available without accounts or paywalls.",
  },
  {
    id: "privacy",
    question: "Do my notes, logos, or custom paper designs get uploaded to a server?",
    answer:
      "No. Paper geometry, SVG rendering, direct sheet typing, and file exports happen entirely on your device. Your last studio configuration saves locally in browser storage (paperstyle.settings.v1) so you can return where you left off.",
  },
  {
    id: "printing",
    question: "How does PaperStyle ensure accurate sizes on home and office printers?",
    answer:
      "Every sheet uses exact millimeter and inch coordinates across 10 standard paper sizes (A4, A5, A3, B4, B5, Letter, Legal, Tabloid, Executive, and Custom). You can switch to B&W Laser Mode to force crisp white backgrounds and calibrated grayscale lines before printing.",
  },
  {
    id: "double-sided",
    question: "Does PaperStyle support binder hole punches and double-sided packets?",
    answer:
      "Yes. Choose from 7 punch patterns (including 2-hole, 3-hole US binder, 4-hole, 5-hole, top 2-hole, and single ring), set page counts up to 100 sheets, and toggle Double-Sided Mode so alternating back pages mirror punch marks and page numbers.",
  },
  {
    id: "formats",
    question: "Which file formats can I download or back up?",
    answer:
      "You can export vector PDF documents, standalone SVG files, high-resolution 300 DPI PNG images, Word-compatible DOCX files, and JSON settings files to back up or share reusable sheet presets.",
  },
  {
    id: "offline",
    question: "Can I install PaperStyle and use it offline?",
    answer:
      "Yes. PaperStyle includes a Progressive Web App manifest and service worker that cache the studio assets locally so you can design and print custom sheets even without an active internet connection.",
  },
] as const;

export function HomePage() {
  const [heroTemplateId, setHeroTemplateId] = useState<PaperTypeId>("cornell-notes");
  const [heroThemeId, setHeroThemeId] = useState<ThemeId>("classic");
  const [activeCategory, setActiveCategory] = useState<PaperCategory>("essential");
  const [selectedByCategory, setSelectedByCategory] = useState<
    Record<PaperCategory, PaperTypeId>
  >({
    essential: "cornell-notes",
    "math-tech": "isometric-grid",
    music: "guitar-tab",
    calligraphy: "genko-yoshi",
    homework: "us-handwriting",
    planners: "weekly-planner",
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        document.getElementById("mobile-menu-toggle")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const templatesByCategory = useMemo(() => {
    const grouped: Record<PaperCategory, typeof PAPER_TEMPLATES> = {
      essential: [],
      "math-tech": [],
      music: [],
      calligraphy: [],
      homework: [],
      planners: [],
    };
    for (const tpl of PAPER_TEMPLATES) {
      grouped[tpl.category].push(tpl);
    }
    return grouped;
  }, []);

  const heroTemplateSpec = getTemplateSpec(heroTemplateId);
  const heroThemeSpec = getThemeSpec(heroThemeId);
  const heroMetrics = useMemo(() => {
    const built = buildSheetSvg(buildPreviewSettings(heroTemplateId, heroThemeId), 1);
    return {
      widthMm: Math.round(built.geometry.widthMm),
      heightMm: Math.round(built.geometry.heightMm),
      rows: built.fittedRows,
      stepMm: Number(built.fittedStepMm.toFixed(1)),
      orientation: built.geometry.widthMm > built.geometry.heightMm ? "Landscape" : "Portrait",
    };
  }, [heroTemplateId, heroThemeId]);

  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-xs">
        <div className="mx-auto max-w-6xl px-4 py-2.5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <a
              href="/"
              aria-current="page"
              className="inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-md pr-2 text-base font-bold tracking-tight"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 64 64"
                className="size-7 shrink-0"
                fill="none"
              >
                <rect
                  x="10"
                  y="6"
                  width="44"
                  height="52"
                  rx="4"
                  fill="#FFFFFF"
                  stroke="#1E3A8A"
                  strokeWidth="4"
                />
                <line
                  x1="18"
                  y1="20"
                  x2="46"
                  y2="20"
                  stroke="#1E3A8A"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <line
                  x1="18"
                  y1="30"
                  x2="46"
                  y2="30"
                  stroke="#1E3A8A"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <line
                  x1="18"
                  y1="40"
                  x2="46"
                  y2="40"
                  stroke="#1E3A8A"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <line
                  x1="18"
                  y1="50"
                  x2="36"
                  y2="50"
                  stroke="#166534"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
              <span>PaperStyle</span>
            </a>

            <nav aria-label="Primary" className="flex items-center gap-2">
              <ul
                id="primary-nav-list"
                className="hidden items-center gap-1 md:flex"
              >
                <li>
                  <a
                    href="/"
                    aria-current="page"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-md border-b-2 border-foreground px-3 text-sm font-semibold text-foreground"
                  >
                    <span>Home</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#templates"
                    className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    Templates
                  </a>
                </li>
                <li>
                  <a
                    href="#features"
                    className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#faq"
                    className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    FAQ
                  </a>
                </li>
              </ul>

              <Button
                asChild
                size="sm"
                className="min-h-11 shrink-0 px-3.5 text-sm font-semibold sm:px-4"
              >
                <a href="/create/">Create Paper</a>
              </Button>

              <Button
                id="mobile-menu-toggle"
                type="button"
                variant="outline"
                size="icon"
                className="min-h-11 min-w-11 shrink-0 md:hidden"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-nav-drawer"
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                onClick={() => setMobileMenuOpen((prev) => !prev)}
              >
                {mobileMenuOpen ? (
                  <X aria-hidden="true" />
                ) : (
                  <Menu aria-hidden="true" />
                )}
              </Button>
            </nav>
          </div>

          {mobileMenuOpen && (
            <div
              id="mobile-nav-drawer"
              className="mt-2.5 border-t pt-2.5 md:hidden"
            >
              <ul className="grid gap-1">
                <li>
                  <a
                    href="/"
                    aria-current="page"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-11 items-center justify-between rounded-md bg-secondary px-3 text-sm font-semibold text-foreground"
                  >
                    <span>Home</span>
                    <Badge variant="outline">Current</Badge>
                  </a>
                </li>
                <li>
                  <a
                    href="#templates"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground hover:bg-accent"
                  >
                    77 Paper Templates
                  </a>
                </li>
                <li>
                  <a
                    href="#features"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground hover:bg-accent"
                  >
                    Studio Features
                  </a>
                </li>
                <li>
                  <a
                    href="#faq"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground hover:bg-accent"
                  >
                    Frequently Asked Questions
                  </a>
                </li>
              </ul>
            </div>
          )}
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1">
        {/* Hero: Above-the-fold headline, CTA, and interactive live sheet specimen */}
        <section className="border-b bg-gradient-to-b from-muted/40 via-background to-background">
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-12 lg:gap-10 lg:py-14">
            <div className="min-w-0 space-y-5 lg:col-span-6">
              <Badge variant="outline" className="gap-1.5 px-3 py-1 text-xs font-medium">
                <Sparkles className="size-3.5" aria-hidden="true" />
                <span>77 templates · 10 paper sizes · Browser-local</span>
              </Badge>

              <h1
                id="hero-title"
                className="text-[clamp(2rem,1.35rem+2.5vw,3.35rem)] leading-[1.08] font-bold tracking-tight"
              >
                Custom printable paper, ready to write and export.
              </h1>

              <p className="text-muted-foreground max-w-[54ch] text-base leading-relaxed sm:text-lg">
                Design ruled sheets, Cornell notes, music staves, calligraphy grids, and
                planners with millimeter precision. Type directly on the page and export
                print-ready PDF, SVG, PNG, or DOCX—free and private in your browser.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  asChild
                  size="lg"
                  className="min-h-12 px-7 text-base font-semibold"
                >
                  <a href="/create/">
                    <span>Create Paper</span>
                    <ArrowRight aria-hidden="true" />
                  </a>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="min-h-12 px-6 text-base"
                >
                  <a href="#templates">Browse 77 Templates</a>
                </Button>
              </div>

              <ul className="grid grid-cols-1 gap-x-4 gap-y-2 pt-2 text-sm text-muted-foreground sm:grid-cols-2">
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-foreground" aria-hidden="true" />
                  <span>13 curated themes + B&amp;W laser mode</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-foreground" aria-hidden="true" />
                  <span>Full-screen typing inside sheets</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-foreground" aria-hidden="true" />
                  <span>Up to 100 double-sided pages</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-foreground" aria-hidden="true" />
                  <span>Zero sign-up, zero server uploads</span>
                </li>
              </ul>
            </div>

            <div className="min-w-0 lg:col-span-6">
              <Card className="overflow-hidden border-border/90 py-0 shadow-sm">
                <CardHeader className="border-b bg-muted/35 px-4 py-3.5 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-sm sm:text-base">
                        Live Specimen Preview
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {heroTemplateSpec.name} · {heroThemeSpec.name} · {heroMetrics.widthMm} ×{" "}
                        {heroMetrics.heightMm} mm ({heroMetrics.orientation})
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="tabular-nums">
                      {heroMetrics.rows} rows · {heroMetrics.stepMm} mm
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sample paper templates">
                    {HERO_TEMPLATES.map((item) => {
                      const active = heroTemplateId === item.id;
                      return (
                        <Button
                          key={item.id}
                          type="button"
                          size="sm"
                          variant={active ? "default" : "outline"}
                          aria-pressed={active}
                          onClick={() => setHeroTemplateId(item.id)}
                          className="min-h-9 px-3 text-xs"
                        >
                          {item.label}
                        </Button>
                      );
                    })}
                  </div>

                  <div className="studio-mat flex items-center justify-center rounded-lg border p-4 sm:p-6">
                    <div
                      className={cn(
                        "w-full",
                        heroMetrics.orientation === "Landscape"
                          ? "max-w-[340px]"
                          : "max-w-[235px] sm:max-w-[260px]",
                      )}
                    >
                      <LandingSheetPreview
                        templateId={heroTemplateId}
                        themeId={heroThemeId}
                        priority
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div
                      className="flex flex-wrap items-center gap-1.5"
                      role="group"
                      aria-label="Paper color themes"
                    >
                      <span className="text-muted-foreground mr-1 text-xs font-medium">
                        Theme:
                      </span>
                      {HERO_THEMES.map((theme) => {
                        const active = heroThemeId === theme.id;
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            aria-label={`Apply ${theme.label} theme to preview`}
                            aria-pressed={active}
                            onClick={() => setHeroThemeId(theme.id)}
                            className={cn(
                              "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                              active
                                ? "border-foreground bg-secondary text-foreground font-semibold"
                                : "border-border bg-background text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className="size-3 rounded-full border border-black/25"
                              style={{ backgroundColor: theme.swatch }}
                            />
                            <span>{theme.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Section 2: Interactive 6-category Template Explorer (all 77 real templates) */}
        <section
          id="templates"
          className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
        >
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Badge variant="outline">Template Catalog</Badge>
              <h2
                id="templates-heading"
                className="text-2xl font-bold tracking-tight sm:text-3xl"
              >
                Browse all {PAPER_TEMPLATES.length} printable templates
              </h2>
              <p className="text-muted-foreground max-w-[60ch] text-sm leading-relaxed sm:text-base">
                Every sheet below renders live from PaperStyle&apos;s vector geometry engine.
                Explore a category and preview any layout before opening the studio.
              </p>
            </div>
          </div>

          <Tabs
            value={activeCategory}
            onValueChange={(value) => setActiveCategory(value as PaperCategory)}
            className="space-y-6"
          >
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1.5 bg-muted/60 p-1.5">
              {CATEGORY_ORDER.map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="min-h-10 flex-initial px-3 py-1.5 text-xs sm:text-sm"
                >
                  <span>{cat.shortLabel}</span>
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[11px] tabular-nums">
                    {templatesByCategory[cat.id].length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {CATEGORY_ORDER.map((cat) => {
              const items = templatesByCategory[cat.id];
              const spotlightId = selectedByCategory[cat.id];
              const spotlight = getTemplateSpec(spotlightId);

              return (
                <TabsContent key={cat.id} value={cat.id} className="space-y-6">
                  <Card className="overflow-hidden border-border/90 py-0">
                    <div className="grid items-center gap-6 p-4 sm:p-6 lg:grid-cols-12">
                      <div className="studio-mat flex items-center justify-center rounded-lg border p-4 lg:col-span-5">
                        <div
                          className={cn(
                            "w-full",
                            spotlight.defaultOrientation === "landscape"
                              ? "max-w-[290px]"
                              : "max-w-[190px]",
                          )}
                        >
                          <LandingSheetPreview templateId={spotlight.id} />
                        </div>
                      </div>

                      <div className="min-w-0 space-y-4 lg:col-span-7">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{CATEGORY_LABELS[cat.id]}</Badge>
                          <Badge variant="outline">
                            {spotlight.defaultSpacingMm} mm spacing
                          </Badge>
                          <Badge variant="outline">
                            {spotlight.defaultOrientation === "landscape"
                              ? "Landscape default"
                              : "Portrait default"}
                          </Badge>
                        </div>

                        <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                          {spotlight.name}
                        </h3>
                        <p className="text-muted-foreground max-w-[56ch] text-sm leading-relaxed sm:text-base">
                          {spotlight.description}. Customize margins, ink colors, background
                          patterns, hole punches, and direct sheet notes inside the studio.
                        </p>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <Button asChild className="min-h-11 px-5 font-semibold">
                            <a href="/create/">
                              <span>Create Paper</span>
                              <ArrowRight aria-hidden="true" />
                            </a>
                          </Button>
                          <span className="text-muted-foreground text-xs">
                            Showing {items.length} layouts in {CATEGORY_LABELS[cat.id]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((tpl) => {
                      const isSelected = spotlight.id === tpl.id;
                      const isLandscape = tpl.defaultOrientation === "landscape";

                      return (
                        <Card
                          key={tpl.id}
                          className={cn(
                            "justify-between gap-4 py-4 transition-colors",
                            isSelected
                              ? "border-foreground ring-1 ring-foreground/20"
                              : "hover:border-foreground/40",
                          )}
                        >
                          <CardHeader className="gap-2 px-4">
                            <div className="studio-mat flex h-44 items-center justify-center rounded-md border p-3">
                              <div
                                className={cn(
                                  "flex h-full items-center justify-center",
                                  isLandscape ? "w-44" : "w-28",
                                )}
                              >
                                <LandingSheetPreview
                                  templateId={tpl.id}
                                  className="max-h-36 w-auto object-contain"
                                />
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <CardTitle className="text-base">{tpl.name}</CardTitle>
                              <Badge variant="outline" className="text-[11px] tabular-nums">
                                {tpl.defaultSpacingMm} mm
                              </Badge>
                            </div>
                            <CardDescription className="text-xs leading-relaxed">
                              {tpl.description}
                            </CardDescription>
                          </CardHeader>

                          <CardContent className="px-4">
                            <Button
                              type="button"
                              size="sm"
                              variant={isSelected ? "default" : "outline"}
                              aria-pressed={isSelected}
                              aria-label={`Preview ${tpl.name}`}
                              onClick={() =>
                                setSelectedByCategory((prev) => ({
                                  ...prev,
                                  [cat.id]: tpl.id,
                                }))
                              }
                              className="min-h-11 w-full"
                            >
                              {isSelected ? "Previewing above" : "Preview sheet"}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </section>

        <Separator />

        {/* Section 3: Real-world stationery showcases & studio features */}
        <section
          id="features"
          className="bg-muted/25 py-12 sm:py-16"
        >
          <div className="mx-auto max-w-6xl space-y-12 px-4 sm:px-6">
            <div className="space-y-2">
              <Badge variant="outline">Print &amp; Studio Craft</Badge>
              <h2
                id="features-heading"
                className="text-2xl font-bold tracking-tight sm:text-3xl"
              >
                Built for notebooks, sheet music, calligraphy, and study
              </h2>
              <p className="text-muted-foreground max-w-[60ch] text-sm leading-relaxed sm:text-base">
                Every control mirrors real papercraft—from crisp laser-ready black-and-white
                calibration to multi-page binder packets and direct typing on the page.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {REAL_PRINT_STORIES.map((story) => (
                <Card key={story.title} className="overflow-hidden py-0">
                  <figure>
                    <img
                      src={story.src}
                      alt={story.alt}
                      width={1200}
                      height={800}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[3/2] w-full object-cover"
                    />
                    <figcaption className="text-muted-foreground border-b px-4 py-2 text-[11px]">
                      {story.credit}
                    </figcaption>
                  </figure>
                  <CardHeader className="px-4 pt-4">
                    <Badge variant="secondary" className="mb-1">
                      {story.badge}
                    </Badge>
                    <CardTitle className="text-lg">{story.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-5">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {story.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                Everything included in the PaperStyle studio
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {STUDIO_CAPABILITIES.map((cap) => {
                  const Icon = cap.icon;
                  return (
                    <Card key={cap.title} className="py-4">
                      <CardHeader className="gap-2 px-5">
                        <div className="bg-secondary text-foreground flex size-10 items-center justify-center rounded-lg border">
                          <Icon className="size-5" aria-hidden="true" />
                        </div>
                        <CardTitle className="text-base">{cap.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="px-5">
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {cap.body}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <Card className="border-border/90 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-lg sm:text-xl">
                  Export &amp; print formats generated locally
                </CardTitle>
                <CardDescription>
                  No watermarks, no file-size tiers, and zero cloud round-trips.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 px-5 sm:grid-cols-2 lg:grid-cols-5">
                {EXPORT_FORMATS.map((fmt) => {
                  const Icon = fmt.icon;
                  return (
                    <div
                      key={fmt.name}
                      className="rounded-lg border bg-muted/30 p-3.5"
                    >
                      <div className="mb-1.5 flex items-center gap-2 font-semibold">
                        <Icon className="size-4" aria-hidden="true" />
                        <span>{fmt.name}</span>
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {fmt.detail}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Section 4: Workflow + FAQ */}
        <section className="mx-auto max-w-6xl space-y-14 px-4 py-12 sm:px-6 sm:py-16">
          <div className="space-y-6">
            <div className="space-y-2">
              <Badge variant="outline">Three-step workflow</Badge>
              <h2
                id="workflow-heading"
                className="text-2xl font-bold tracking-tight sm:text-3xl"
              >
                From template to printed sheet in seconds
              </h2>
            </div>

            <ol className="grid gap-4 md:grid-cols-3">
              {WORKFLOW_STEPS.map((item) => (
                <li key={item.step} className="list-none">
                  <Card className="h-full py-5">
                    <CardHeader className="px-5">
                      <Badge variant="outline" className="mb-1 font-mono">
                        Step {item.step}
                      </Badge>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5">
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          </div>

          <div id="faq" className="space-y-5">
            <div className="space-y-2">
              <Badge variant="outline">Questions</Badge>
              <h2
                id="faq-heading"
                className="text-2xl font-bold tracking-tight sm:text-3xl"
              >
                Frequently asked questions
              </h2>
            </div>

            <Card className="py-2">
              <CardContent className="px-5">
                <Accordion type="single" collapsible defaultValue="free">
                  {FAQS.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id}>
                      <AccordionTrigger>{faq.question}</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          <Card className="studio-mat border-border/90 py-6 sm:py-8">
            <CardContent className="flex flex-col items-start justify-between gap-5 px-5 sm:flex-row sm:items-center sm:px-8">
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Ready to design your custom paper?
                </h2>
                <p className="text-muted-foreground max-w-[52ch] text-sm leading-relaxed sm:text-base">
                  Launch the PaperStyle studio, choose from 77 printable layouts, and
                  download or print right from your browser.
                </p>
              </div>
              <Button
                asChild
                size="lg"
                className="min-h-12 shrink-0 px-7 text-base font-semibold"
              >
                <a href="/create/">
                  <span>Create Paper</span>
                  <ArrowRight aria-hidden="true" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t bg-muted/20 px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center sm:text-left">
            <span className="font-semibold text-foreground">PaperStyle</span>
            <span aria-hidden="true">·</span>
            <span>Maintained by Ntare Shema Prince</span>
            <span aria-hidden="true">·</span>
            <a
              href="mailto:nttare0@gmail.com"
              className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
            >
              nttare0@gmail.com
            </a>
          </div>

          <nav
            aria-label="Legal and support"
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1"
          >
            <a
              href="/privacy/"
              className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
            >
              Privacy Policy
            </a>
            <a
              href="/terms/"
              className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
            >
              Terms &amp; Conditions
            </a>
            <a
              href="/privacy/#contact"
              className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
            >
              Contact
            </a>
            <a
              href="https://github.com/nttare0/paper-style"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
            >
              GitHub
            </a>
            <button
              type="button"
              onClick={openConsentBanner}
              className="inline-flex min-h-11 cursor-pointer items-center underline-offset-4 hover:text-foreground hover:underline"
            >
              Cookie Settings
            </button>
          </nav>
        </div>
      </footer>
      <ConsentAnalyticsBanner />
    </div>
  );
}
