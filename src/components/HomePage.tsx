import { Button } from "@/components/ui/button";

export function HomePage() {
  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="scroll-m-20 text-5xl font-bold tracking-tight sm:text-6xl">
            PaperStyle
          </h1>
          <Button asChild size="lg" className="h-12 px-8 text-base font-semibold">
            <a href="/create/">Create Paper</a>
          </Button>
        </div>
      </main>
      <footer className="border-t px-6 py-3">
        <nav
          aria-label="Legal and support"
          className="text-muted-foreground mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs"
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
        </nav>
      </footer>
    </div>
  );
}
