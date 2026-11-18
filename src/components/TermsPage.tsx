import { AlertTriangle, FileText, Mail } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LegalPageShell } from "./LegalPageShell";

const TERMS_SECTIONS = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    body: [
      "By accessing or using PaperStyle, you agree to be bound by these placeholder Terms & Conditions. Replace all bracketed fields before making this site commercially available.",
    ],
  },
  {
    id: "acceptable-use",
    title: "2. Acceptable Use",
    body: [
      "You may use PaperStyle to customize, preview, print, and export paper templates for personal, educational, or internal workflows, provided you do not attempt to disrupt service availability, bypass security controls, or misuse the site for unlawful activity.",
    ],
  },
  {
    id: "intellectual-property",
    title: "3. Intellectual Property & Your Exports",
    body: [
      "You retain ownership of any custom text, notes, logos, or artwork you add to your sheets. All application source code, layout templates, and visual branding remain subject to the project's applicable license and ownership notices ([specify license/owner details before launch]).",
    ],
  },
  {
    id: "liability",
    title: "4. Disclaimers & Limitation of Liability",
    body: [
      "PaperStyle is provided on an \"as is\" and \"as available\" basis without warranties of any kind regarding uninterrupted availability or print calibration across every printer model. Always inspect exported PDF, SVG, PNG, or DOCX files before bulk printing.",
    ],
  },
  {
    id: "termination",
    title: "5. Changes & Service Availability",
    body: [
      "Features, templates, and availability may change or be discontinued at any time without prior notice. Because settings are stored locally in your browser, please export important configurations as JSON backups.",
    ],
  },
  {
    id: "governing-law",
    title: "6. Governing Law",
    body: [
      "These terms are governed by the laws of [Add governing jurisdiction before launch], without regard to conflict-of-law principles.",
    ],
  },
];

export function TermsPage() {
  return (
    <LegalPageShell currentPath="/terms/">
      <article className="space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              <FileText className="size-3.5" aria-hidden="true" />
              <span>Draft Terms</span>
            </Badge>
            <Badge variant="secondary">Placeholder — Review Required</Badge>
          </div>
          <h1 className="scroll-m-20 text-3xl font-bold tracking-tight sm:text-4xl">
            Terms &amp; Conditions
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            This placeholder terms document outlines baseline rules for using PaperStyle. Review
            and customize all bracketed fields before launch.
          </p>
        </header>

        <Alert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Placeholder Legal Content — Review Before Launch</AlertTitle>
          <AlertDescription>
            This document is a starter template, not final legal advice. Review and replace all
            bracketed placeholders with your verified legal entity, governing jurisdiction, and
            contact details before launch.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {TERMS_SECTIONS.map((section) => (
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
                <span>7. Contact</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2.5 text-sm leading-relaxed">
              <p>
                <strong className="text-foreground">Support Email:</strong> [Add your real support
                email before launch]
              </p>
              <p>
                <strong className="text-foreground">Repository:</strong>{" "}
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
