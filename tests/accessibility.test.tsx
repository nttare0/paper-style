import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { HomePage } from "../src/components/HomePage";
import { PaperCreator } from "../src/components/PaperCreator";

beforeEach(() => {
  window.localStorage.clear();
});

describe("HomePage strict minimalism with shadcn/ui", () => {
  it("renders ONLY the website name and shadcn link button to /create/", () => {
    const { container } = render(<HomePage />);
    const heading = screen.getByRole("heading", { level: 1, name: "PaperStyle" });
    const link = screen.getByRole("link", { name: "Create Paper" });

    expect(heading).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/create/");
    expect(link).toHaveAttribute("data-slot", "button");

    // Strictly no extra links, headings, paragraphs, buttons, or forms on HomePage
    expect(container.querySelectorAll("a")).toHaveLength(1);
    expect(container.querySelectorAll("h1, h2, h3, h4, h5, h6")).toHaveLength(1);
    expect(container.querySelectorAll("p, button, input, select, nav, footer")).toHaveLength(0);
    expect(container.textContent?.trim()).toBe("PaperStyleCreate Paper");
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

  it("allows editing directly on the chosen paper style and persists text into the SVG sheet", () => {
    render(<PaperCreator />);

    // Switch to Cornell Notes first, then toggle Edit Sheet
    const templateSelect = screen.getByLabelText("Paper Type") as HTMLSelectElement;
    fireEvent.change(templateSelect, { target: { value: "cornell-notes" } });

    const editBtn = screen.getByRole("button", { name: /Edit Sheet/i });
    fireEvent.click(editBtn);

    const editor = screen.getByLabelText(/Edit text on Cornell Notes, page 1/i);
    expect(editor).toBeInTheDocument();
    fireEvent.change(editor, { target: { value: "Lecture 1: Key Takeaways" } });

    // Switch ink color to Royal blue ink, then click Done
    fireEvent.click(screen.getByRole("button", { name: "Royal blue ink" }));
    fireEvent.click(screen.getByRole("button", { name: /Done/i }));

    const previewImg = screen.getByRole("img", { name: /Live preview of Cornell Notes/i });
    expect(previewImg.innerHTML).toContain("Lecture 1: Key Takeaways");
    expect(previewImg.innerHTML).toContain("#1D4ED8");
    expect(previewImg.innerHTML).toMatch(/<text x="71" y="50\.\d+" fill="#1D4ED8"[^>]*>Lecture 1: Key Takeaways<\/text>/);
  });
});
