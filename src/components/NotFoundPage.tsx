import { FileQuestion, Home, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LegalPageShell } from "./LegalPageShell";

export function NotFoundPage() {
  return (
    <LegalPageShell currentPath="/404">
      <div className="mx-auto max-w-xl py-8 sm:py-16">
        <Card>
          <CardHeader className="space-y-3">
            <Badge variant="outline" className="w-fit gap-1.5">
              <FileQuestion className="size-3.5" aria-hidden="true" />
              <span>404 — Page Not Found</span>
            </Badge>
            <CardTitle className="text-2xl sm:text-3xl">
              <h1>This sheet could not be found</h1>
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              The page you requested may have been moved, renamed, or does not exist. Use one of
              the destinations below to get back on track.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="min-h-11 w-full px-6 font-semibold sm:w-auto">
                <a href="/">
                  <Home aria-hidden="true" />
                  <span>Back to Home</span>
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-h-11 w-full px-6 sm:w-auto">
                <a href="/create/">
                  <PenLine aria-hidden="true" />
                  <span>Open Paper Studio</span>
                </a>
              </Button>
            </div>

            <div className="border-t pt-4">
              <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                Helpful Pages
              </p>
              <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <li>
                  <a
                    href="/create/"
                    className="text-primary inline-flex min-h-11 items-center underline-offset-4 hover:underline"
                  >
                    Create Paper Studio
                  </a>
                </li>
                <li>
                  <a
                    href="/privacy/"
                    className="text-primary inline-flex min-h-11 items-center underline-offset-4 hover:underline"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/terms/"
                    className="text-primary inline-flex min-h-11 items-center underline-offset-4 hover:underline"
                  >
                    Terms &amp; Conditions
                  </a>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </LegalPageShell>
  );
}
