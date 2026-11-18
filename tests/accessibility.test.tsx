import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { HomePage } from "../src/components/HomePage";
import { NotFoundPage } from "../src/components/NotFoundPage";
import { PaperCreator } from "../src/components/PaperCreator";
import { PrivacyPage } from "../src/components/PrivacyPage";
import { TermsPage } from "../src/components/TermsPage";

beforeEach(() => {
  window.localStorage.clear();
});

describe("HomePage minimalism and site essential links with shadcn/ui", () => {
  it("renders centered PaperStyle hero CTA above the fold and footer legal links", () => {
    const { container } = render(<HomePage />);
    const heading = screen.getByRole("heading", { level: 1, name: "PaperStyle" });
    const createLink = screen.getByRole("link", { name: "Create Paper" });
    const privacyLink = screen.getByRole("link", { name: "Privacy Policy" });
    const termsLink = screen.getByRole("link", { name: "Terms & Conditions" });
    const contactLink = screen.getByRole("link", { name: "Contact" });

    expect(heading).toBeInTheDocument();
    expect(createLink).toHaveAttribute("href", "/create/");
    expect(createLink).toHaveAttribute("data-slot", "button");
    expect(privacyLink).toHaveAttribute("href", "/privacy/");
    expect(termsLink).toHaveAttribute("href", "/terms/");
    expect(contactLink).toHaveAttribute("href", "/privacy/#contact");

    expect(container.querySelectorAll("h1, h2, h3, h4, h5, h6")).toHaveLength(1);
    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(container.querySelectorAll("footer")).toHaveLength(1);
  });
});

describe("Legal pages and custom 404 page", () => {
  it("renders PrivacyPolicy with placeholder warning, local storage disclosures, and non-fabricated contact fields", () => {
    const { container } = render(<PrivacyPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.getByText(/Placeholder Legal Content — Review Before Launch/i)).toBeInTheDocument();
    expect(screen.getByText(/paperstyle\.settings\.v1/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/info@example\.com/i);
  });

  it("renders TermsPage with placeholder warning and non-fabricated contact/governing placeholders", () => {
    const { container } = render(<TermsPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /Terms & Conditions/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Placeholder Legal Content — Review Before Launch/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/info@example\.com/i);
  });

  it("renders branded NotFoundPage with home and studio CTAs", () => {
    render(<NotFoundPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /This sheet could not be found/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Open Paper Studio" })).toHaveAttribute(
      "href",
      "/create/",
    );
  });
});

describe("PaperCreator 3-tab shadcn/ui studio & Interactive Flow", () => {
  it("renders Basics tab controls, accessible fieldsets, alerts, and live preview", () => {
    render(<PaperCreator />);

    expect(screen.getByRole("heading", { level: 1, name: "Create Paper" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "PaperStyle" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("img", { name: /Live preview of/i })).toBeInTheDocument();

    // Default "Fit" mode constrains sheet inside non-scrolling stage
    const previewImg = screen.getByRole("img", { name: /Live preview of/i });
    const frame = previewImg.closest(".sheet-preview-frame") as HTMLElement;
    const stage = frame.closest(".print-stage") as HTMLElement;
    expect(stage).toHaveClass("overflow-hidden");
    expect(frame.style.width).toContain("cqh");

    // Clicking 100% zoom enables scrollable zoomed stage, then Fit restores fit-to-screen
    fireEvent.click(screen.getByRole("button", { name: "100%" }));
    expect(stage).toHaveClass("overflow-auto");
    fireEvent.click(screen.getByRole("button", { name: "Fit" }));
    expect(stage).toHaveClass("overflow-hidden");

    const templateSelect = screen.getByLabelText("Paper Type") as HTMLSelectElement;
    expect(templateSelect).toHaveAttribute("data-slot", "native-select");

    // Switch template to Cornell Notes and verify preview header updates
    fireEvent.change(templateSelect, { target: { value: "cornell-notes" } });
    expect(screen.getByText("Cornell Notes", { selector: "[data-slot='card-title']" })).toBeInTheDocument();

    // Switch to B&W laser printer and verify shadcn Alert banner appears
    const bwRadio = screen.getByRole("radio", { name: /B&W laser printer/i });
    fireEvent.click(bwRadio);
    const alert = screen.getByRole("status");
    expect(alert).toHaveAttribute("data-slot", "alert");
    expect(alert).toHaveTextContent(/B&W Laser Mode/i);

    // Switch units to inches and verify spacing label updates
    const inchesRadio = screen.getByRole("radio", { name: /Imperial \(in\)/i });
    fireEvent.click(inchesRadio);
    expect(screen.getByLabelText(/Line Spacing \(in\)/i)).toBeInTheDocument();
  });

  it("switches to Layout tab, validates page count, and disables exports", () => {
    render(<PaperCreator />);

    const layoutTab = screen.getByRole("tab", { name: "Layout" });
    fireEvent.mouseDown(layoutTab, { button: 0 });
    fireEvent.click(layoutTab);

    const pageCountInput = screen.getByLabelText(/Page Count \(1–100\)/i);
    expect(pageCountInput).toHaveAttribute("data-slot", "input");
    fireEvent.focus(pageCountInput);
    fireEvent.change(pageCountInput, { target: { value: "250" } });

    expect(pageCountInput).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText(/Page count must be a whole number from 1 to 100/i, { selector: "p span" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export PDF/i })).toBeDisabled();
  });

  it("opens full-screen paper-only edit mode with structured boxes on planners and click-anywhere on free sheets", () => {
    render(<PaperCreator />);

    // 1. Default Lined Paper auto-opens full-screen with Date & Lined Paper fields ready to type
    fireEvent.click(screen.getByRole("button", { name: /Edit Sheet/i }));

    const dialog = screen.getByRole("dialog", { name: /Full-screen paper editor: Lined Paper/i });
    expect(dialog).toHaveClass("fixed", "inset-0", "z-50");
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.querySelector("header")).toHaveClass("hidden");
    expect(document.getElementById("controls-panel")?.parentElement).toHaveClass("hidden");

    fireEvent.change(screen.getByLabelText(/Date, page 1/i), { target: { value: "Nov 16" } });
    fireEvent.change(screen.getByLabelText(/Lined Paper, page 1/i), {
      target: { value: "Line 1 quick note" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Done/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    expect(document.querySelector("header")).not.toHaveClass("hidden");
    const linedPreview = screen.getByRole("img", { name: /Live preview of Lined Paper/i }).innerHTML;
    expect(linedPreview).toContain("Nov 16");
    expect(linedPreview).toContain("Line 1 quick note");

    // 2. Weekly Planner displays natural day boxes (Monday..Sunday, Weekly Notes) ready to click/Tab
    const templateSelect = screen.getByLabelText("Paper Type") as HTMLSelectElement;
    fireEvent.change(templateSelect, { target: { value: "weekly-planner" } });
    fireEvent.click(screen.getByRole("button", { name: /Edit Sheet/i }));

    fireEvent.change(screen.getByLabelText(/Monday, page 1/i), {
      target: { value: "Team standup" },
    });
    fireEvent.change(screen.getByLabelText(/Friday, page 1/i), {
      target: { value: "Ship release" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Royal blue ink" }));
    fireEvent.click(screen.getByRole("button", { name: /Done/i }));

    const plannerPreview = screen.getByRole("img", { name: /Live preview of Weekly Planner/i });
    expect(plannerPreview.innerHTML).toContain("Team standup");
    expect(plannerPreview.innerHTML).toContain("Ship release");
    expect(plannerPreview.innerHTML).toContain("#1D4ED8");

    // 3. Music Paper (free-click template) supports clicking anywhere on the sheet to add a label
    fireEvent.change(templateSelect, { target: { value: "music" } });
    fireEvent.click(screen.getByRole("button", { name: /Edit Sheet/i }));
    const musicDialog = screen.getByRole("dialog", {
      name: /Full-screen paper editor: Music Paper/i,
    });
    const sheetFrame = musicDialog.querySelector(".sheet-preview-frame") as HTMLElement;
    fireEvent.click(sheetFrame);

    fireEvent.change(screen.getByLabelText(/Note on Music Paper, page 1/i), {
      target: { value: "Prelude in C" },
    });
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Live preview of Music Paper/i }).innerHTML,
    ).toContain("Prelude in C");
  });

  it("supports mobile workspace switching, quick-write action, and zoom inside full-screen editor", () => {
    render(<PaperCreator />);

    // Mobile switcher toggles active pane cleanly without hiding controls from desktop/a11y tree
    const customizeBtn = screen.getByRole("button", { name: "Customize" });
    const previewBtn = screen.getByRole("button", { name: "Sheet Preview" });
    expect(customizeBtn).toHaveAttribute("aria-pressed", "true");
    expect(previewBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(previewBtn);
    expect(previewBtn).toHaveAttribute("aria-pressed", "true");
    expect(customizeBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(customizeBtn);
    expect(customizeBtn).toHaveAttribute("aria-pressed", "true");

    // Quick-action bar "Write" enters full-screen editor with zoom controls available on all screen sizes
    fireEvent.click(screen.getByRole("button", { name: /Write directly on sheet/i }));
    const dialog = screen.getByRole("dialog", { name: /Full-screen paper editor: Lined Paper/i });
    expect(dialog).toHaveClass("h-dvh");

    const zoom125 = screen.getByRole("button", { name: "125%" });
    expect(zoom125).toBeInTheDocument();
    fireEvent.click(zoom125);
    expect(zoom125).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Fit" }));
    expect(screen.getByRole("button", { name: "Fit" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: /Done/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("supports installing as a web app via beforeinstallprompt and fallback instructions", async () => {
    render(<PaperCreator />);

    const installBtn = screen.getByRole("button", { name: /Install App/i });
    expect(installBtn).toBeInTheDocument();
    expect(installBtn).toHaveClass("hidden", "md:inline-flex");

    // Clicking Install App before native prompt opens cross-browser instructions and closes cleanly
    fireEvent.click(installBtn);
    const region = screen.getByRole("region", { name: /Install PaperStyle instructions/i });
    expect(region).toHaveTextContent(/Download \/ Install PaperStyle App/i);
    fireEvent.click(screen.getByRole("button", { name: /Close install instructions/i }));
    expect(
      screen.queryByRole("region", { name: /Install PaperStyle instructions/i }),
    ).not.toBeInTheDocument();

    // Firing browser beforeinstallprompt wires one-click native install prompt
    let prompted = false;
    const fakeEvent = Object.assign(new Event("beforeinstallprompt"), {
      platforms: ["web"],
      userChoice: Promise.resolve({ outcome: "accepted" as const, platform: "web" }),
      prompt: async () => {
        prompted = true;
      },
    });
    fireEvent(window, fakeEvent);

    fireEvent.click(screen.getByRole("button", { name: /Install App/i }));
    await waitFor(() => {
      expect(prompted).toBe(true);
    });
  });
});
