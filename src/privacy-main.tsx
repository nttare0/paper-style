import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "./styles/globals.css";
import { PrivacyPage } from "./components/PrivacyPage";
import { registerServiceWorker } from "./lib/pwa";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrivacyPage />
  </StrictMode>,
);
