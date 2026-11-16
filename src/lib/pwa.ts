import { useCallback, useEffect, useState } from "react";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export type InstallPlatform = "ios" | "desktop-safari" | "chromium-or-other";

function detectPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "chromium-or-other";
  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIos) return "ios";
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox|Android/.test(ua);
  if (isSafari) return "desktop-safari";
  return "chromium-or-other";
}

function checkIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(display-mode: standalone)").matches;
  }
  return false;
}

let swRegistered = false;

export function registerServiceWorker(): void {
  if (swRegistered || typeof window === "undefined") return;
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  swRegistered = true;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Service worker registration failures are non-fatal; app still runs online.
    });
  });
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => checkIsStandalone());
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [platform] = useState<InstallPlatform>(() => detectPlatform());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    let mq: MediaQueryList | null = null;
    const handleDisplayChange = () => setIsInstalled(checkIsStandalone());
    if (typeof window.matchMedia === "function") {
      mq = window.matchMedia("(display-mode: standalone)");
      mq.addEventListener?.("change", handleDisplayChange);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      mq?.removeEventListener?.("change", handleDisplayChange);
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<
    "accepted" | "dismissed" | "instructions"
  > => {
    if (!deferredPrompt) {
      return "instructions";
    }
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }
    return choice.outcome;
  }, [deferredPrompt]);

  return {
    canNativePrompt: deferredPrompt !== null,
    isInstalled,
    isOnline,
    platform,
    triggerInstall,
  };
}
