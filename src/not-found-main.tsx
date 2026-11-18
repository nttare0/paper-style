import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "./styles/globals.css";
import { NotFoundPage } from "./components/NotFoundPage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NotFoundPage />
  </StrictMode>,
);
