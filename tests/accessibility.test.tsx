import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomePage } from "../src/components/HomePage";
import { PaperCreator } from "../src/components/PaperCreator";

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
});
