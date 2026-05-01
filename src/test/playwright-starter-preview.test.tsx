import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlaywrightStarter from "@/pages/PlaywrightStarter";

function renderPage() {
  return render(
    <MemoryRouter>
      <PlaywrightStarter />
    </MemoryRouter>,
  );
}

describe("PlaywrightStarter — live preview modal (E2E)", () => {
  it("renders the catalog tab with the live preview stage", () => {
    renderPage();
    // catalog is the default tab; preview stage exists
    expect(screen.getByTestId("preview-stage")).toBeInTheDocument();
    expect(screen.getByTestId("toggle-expand-preview")).toBeInTheDocument();
  });

  it("toggling Maximize expands the preview to a 75% overlay", () => {
    renderPage();
    const stage = screen.getByTestId("preview-stage");
    expect(stage.className).not.toMatch(/fixed/);

    fireEvent.click(screen.getByTestId("toggle-expand-preview"));

    const expanded = screen.getByTestId("preview-stage");
    expect(expanded.className).toMatch(/fixed/);
    expect(expanded.className).toMatch(/w-\[75vw\]/);
    expect(expanded.className).toMatch(/h-\[75vh\]/);
    expect(expanded.className).toMatch(/z-\[101\]/);
    // backdrop above all elements
    const backdrop = screen.getByTestId("preview-modal-backdrop");
    expect(backdrop.className).toMatch(/z-\[100\]/);
  });

  it("Close button collapses the preview back to inline", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("toggle-expand-preview"));
    fireEvent.click(screen.getByTestId("close-preview-modal"));
    const stage = screen.getByTestId("preview-stage");
    expect(stage.className).not.toMatch(/fixed/);
    expect(screen.queryByTestId("preview-modal-backdrop")).not.toBeInTheDocument();
  });

  it("clicking the backdrop dismisses the modal when not running", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("toggle-expand-preview"));
    fireEvent.click(screen.getByTestId("preview-modal-backdrop"));
    expect(screen.queryByTestId("preview-modal-backdrop")).not.toBeInTheDocument();
  });
});
