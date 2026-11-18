import { AlertTriangle, Mail, ShieldCheck } from "lucide-react";
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
      "PaperStyle is hosted as static web assets. Standard web server request logs (such as IP address, user agent, and requested path) may be processed temporarily by the hosting provider for delivery and security.",
      "[Optional: update this section if you enable analytics, embedded services, or error reporting before launch.]",
    ],
  },
  {
    id: "cookies",
    title: "4. Cookies & Tracking",
    body: [
      "PaperStyle does not currently set advertising cookies or load third-party tracking scripts. Strictly necessary browser storage (localStorage and Cache Storage) is used only for saving your sheet preferences and offline app assets.",
      "[If you enable non-essential analytics cookies later, obtain user consent and update this section before launch.]",
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
      "Depending on your jurisdiction, you may have rights to access, correct, export, or delete personal data processed about you, or object to certain processing. You can export or reset your local studio settings at any time using your browser or the app's settings controls.",
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
              <span>Draft Policy</span>
            </Badge>
            <Badge variant="secondary">Placeholder — Review Required</Badge>
          </div>
          <h1 className="scroll-m-20 text-3xl font-bold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            This placeholder privacy policy describes how PaperStyle handles browser storage and
            static asset delivery. Replace bracketed placeholders before public launch.
          </p>
        </header>

        <Alert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Placeholder Legal Content — Review Before Launch</AlertTitle>
          <AlertDescription>
            This document is a starter template, not final legal advice. Review and replace all
            bracketed placeholders with your verified legal entity, jurisdiction, and contact
            details (or have legal counsel review) before launch.
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
                <strong className="text-foreground">Operator / Entity:</strong> [Add your legal
                name or organization before launch]
              </p>
              <p>
                <strong className="text-foreground">Support Email:</strong> [Add your real support
                email before launch]
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
