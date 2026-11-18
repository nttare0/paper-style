import { Info, Mail, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LegalPageShell } from "./LegalPageShell";

const POLICY_SECTIONS = [
  {
    id: "data-collected",
    title: "1. Information Processed Locally",
    body: [
      "PaperStyle runs directly in your web browser. Sheet layouts, custom paper dimensions, typed sheet notes, and uploaded logos or background images are processed locally on your device.",
      "No user accounts, sign-ups, or server-side document uploads are required to design or export PDF, SVG, PNG, DOCX, or settings JSON files.",
    ],
  },
  {
    id: "purpose",
    title: "2. Why Local Data Is Stored",
    body: [
      "The Paper Studio stores your active sheet configuration in browser localStorage (under key paperstyle.settings.v1) solely so your work persists across reloads.",
      "When offline support is active, your browser's Service Worker caches static application assets (HTML, scripts, stylesheets, fonts, and icons) locally for offline reliability.",
    ],
  },
  {
    id: "third-parties",
    title: "3. Hosting & Third Parties",
    body: [
      "PaperStyle is hosted on Vercel as static web assets. Standard web server request logs (such as IP address, user agent, and requested path) may be processed temporarily by Vercel for delivery, reliability, and security.",
      "If you choose Accept analytics in the consent banner, PaperStyle loads Vercel Web Analytics from the same origin (/_vercel/insights/script.js) with URL query parameters and hashes stripped before transmission.",
    ],
  },
  {
    id: "cookies",
    title: "4. Cookies & Consent-Gated Analytics",
    body: [
      "PaperStyle stores strictly necessary preferences locally (paperstyle.settings.v1 for sheet settings and paperstyle.analytics.consent.v1 for your analytics choice). No advertising cookies or cross-site trackers are loaded.",
      "Optional Vercel Web Analytics loads only after you choose Accept analytics in the consent banner. You can change or withdraw consent at any time via Cookie Settings in the footer.",
    ],
  },
  {
    id: "retention",
    title: "5. Retention & Removal",
    body: [
      "Preferences saved in localStorage and cached assets remain on your device until you reset settings inside the app or clear your browser's site data.",
    ],
  },
  {
    id: "rights",
    title: "6. Your Privacy Rights",
    body: [
      "Depending on your jurisdiction (including applicable data protection laws in Rwanda and your country of residence), you may have rights to access, correct, export, or delete personal data processed about you, or object to certain processing. You can export or reset your local studio settings at any time inside the app, clear your browser's site data, or contact the operator directly.",
    ],
  },
];

export function PrivacyPage() {
  return (
    <LegalPageShell currentPath="/privacy/">
      <article className="space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              <span>Effective November 16, 2026</span>
            </Badge>
            <Badge variant="secondary">Client-Side Studio</Badge>
          </div>
          <h1 className="scroll-m-20 text-3xl font-bold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            This Privacy Policy explains how PaperStyle, operated by Ntare Shema Prince, handles
            local browser storage, static asset hosting on Vercel, and consent-gated analytics.
          </p>
        </header>

        <Alert>
          <Info aria-hidden="true" />
          <AlertTitle>Operator Details &amp; Counsel Review</AlertTitle>
          <AlertDescription>
            Operator and contact details below match{" "}
            <a
              href="https://github.com/nttare0"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-4 hover:opacity-80"
            >
              github.com/nttare0
            </a>
            . Review this policy with legal counsel if your commercial distribution or regional
            compliance obligations change.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {POLICY_SECTIONS.map((section) => (
            <Card key={section.id} id={section.id}>
              <CardHeader>
                <CardTitle className="text-lg">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2.5 text-sm leading-relaxed">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </CardContent>
            </Card>
          ))}

          <Card id="contact">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="size-4" aria-hidden="true" />
                <span>7. Contact Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2.5 text-sm leading-relaxed">
              <p>
                <strong className="text-foreground">Operator:</strong> Ntare Shema Prince (@nttare0)
              </p>
              <p>
                <strong className="text-foreground">Location:</strong> Rwanda
              </p>
              <p>
                <strong className="text-foreground">Support Email:</strong>{" "}
                <a
                  href="mailto:nttare0@gmail.com"
                  className="text-primary underline underline-offset-4 hover:opacity-80"
                >
                  nttare0@gmail.com
                </a>
              </p>
              <p>
                <strong className="text-foreground">Source Repository:</strong>{" "}
                <a
                  href="https://github.com/nttare0/paper-style"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4 hover:opacity-80"
                >
                  github.com/nttare0/paper-style
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </article>
    </LegalPageShell>
  );
}
