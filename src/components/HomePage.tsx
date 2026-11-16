import { Button } from "@/components/ui/button";

export function HomePage() {
  return (
    <main className="bg-background text-foreground flex min-h-dvh items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="scroll-m-20 text-5xl font-bold tracking-tight sm:text-6xl">
          PaperStyle
        </h1>
        <Button asChild size="lg" className="h-12 px-8 text-base font-semibold">
          <a href="/create/">Create Paper</a>
        </Button>
      </div>
    </main>
  );
}
