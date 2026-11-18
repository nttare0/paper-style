import { useEffect, useState } from "react";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const CONSENT_STORAGE_KEY = "paperstyle.analytics.consent.v1";
const OPEN_CONSENT_EVENT = "paperstyle:open-analytics-consent";

export type ConsentChoice = "accepted" | "rejected" | null;

function readStoredConsent(): ConsentChoice {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (value === "accepted" || value === "rejected") {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

function writeStoredConsent(choice: "accepted" | "rejected"): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Ignore storage quota errors in private browsing modes.
  }
}

function sanitizeAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  if (readStoredConsent() !== "accepted") {
    return null;
  }
  try {
    const parsed = new URL(event.url);
    parsed.search = "";
    parsed.hash = "";
    return { ...event, url: parsed.toString() };
  } catch {
    return event;
  }
}

export function openConsentBanner(): void {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}

export function ConsentAnalyticsBanner() {
  const [choice, setChoice] = useState<ConsentChoice>(() => readStoredConsent());
  const [isOpen, setIsOpen] = useState<boolean>(() => readStoredConsent() === null);

  useEffect(() => {
    const onOpen = () => setIsOpen(true);
    window.addEventListener(OPEN_CONSENT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, onOpen);
  }, []);

  const handleDecision = (next: "accepted" | "rejected") => {
    writeStoredConsent(next);
    setChoice(next);
    setIsOpen(false);
    if (next === "rejected") {
      const injected = document.head.querySelectorAll(
        'script[src*="/_vercel/insights/"], script[src*="va.vercel-scripts.com"]',
      );
      injected.forEach((node) => node.remove());
    }
  };

  return (
    <>
      {choice === "accepted" && (
        <Analytics
          mode={import.meta.env.PROD ? "production" : "development"}
          debug={false}
          beforeSend={sanitizeAnalyticsEvent}
        />
      )}

      {isOpen && (
        <aside
          aria-label="Analytics consent"
          className="fixed inset-x-4 bottom-4 z-40 sm:left-auto sm:w-full sm:max-w-md"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <Card className="border-border/90 bg-background/95 py-4 shadow-lg backdrop-blur-xs">
            <CardContent className="space-y-3 px-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Analytics &amp; Privacy Choice</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  We use strictly necessary browser storage for your settings. With your consent, we
                  also enable privacy-focused Vercel Web Analytics (no ad trackers or PII). Review
                  this banner text before launch in our{" "}
                  <a
                    href="/privacy/#cookies"
                    className="text-foreground underline underline-offset-4 hover:opacity-80"
                  >
                    Cookies &amp; Analytics notice
                  </a>
                  .
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 flex-1 font-medium"
                  onClick={() => handleDecision("rejected")}
                >
                  Reject analytics
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 flex-1 font-medium"
                  onClick={() => handleDecision("accepted")}
                >
                  Accept analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      )}
    </>
  );
}
