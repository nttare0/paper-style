import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface LegalPageShellProps {
  currentPath: "/privacy/" | "/terms/" | "/404";
  children: ReactNode;
}

export function LegalPageShell({ currentPath, children }: LegalPageShellProps) {
  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="min-h-11 px-3">
              <a href="/">
                <ArrowLeft aria-hidden="true" />
                <span>PaperStyle</span>
              </a>
            </Button>
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
              <Button
                asChild
                variant={currentPath === "/privacy/" ? "secondary" : "ghost"}
                size="sm"
                className="min-h-11 px-3"
              >
                <a
                  href="/privacy/"
                  aria-current={currentPath === "/privacy/" ? "page" : undefined}
                >
                  Privacy
                </a>
              </Button>
              <Button
                asChild
                variant={currentPath === "/terms/" ? "secondary" : "ghost"}
                size="sm"
                className="min-h-11 px-3"
              >
                <a
                  href="/terms/"
                  aria-current={currentPath === "/terms/" ? "page" : undefined}
                >
                  Terms
                </a>
              </Button>
            </nav>
          </div>

          <Button asChild size="sm" className="min-h-11 px-4 font-semibold">
            <a href="/create/">Create Paper</a>
          </Button>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12"
      >
        {children}
      </main>

      <footer className="border-t px-4 py-4 sm:px-6">
        <nav
          aria-label="Footer"
          className="text-muted-foreground mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs"
        >
          <span>PaperStyle</span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <a
              href="/"
              className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
            >
              Home
            </a>
            <a
              href="/create/"
              className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
            >
              Create Paper
            </a>
            <a
              href="/privacy/"
              aria-current={currentPath === "/privacy/" ? "page" : undefined}
              className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
            >
              Privacy Policy
            </a>
            <a
              href="/terms/"
              aria-current={currentPath === "/terms/" ? "page" : undefined}
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
          </div>
        </nav>
      </footer>
    </div>
  );
}
