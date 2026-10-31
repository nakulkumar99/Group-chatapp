import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatSearchBar } from "./ChatSearchBar";

function renderSearchBar(overrides: Partial<Parameters<typeof ChatSearchBar>[0]> = {}) {
  const props = {
    query: "",
    onQueryChange: vi.fn(),
    onClose: vi.fn(),
    resultCount: 0,
    ...overrides,
  };

  render(<ChatSearchBar {...props} />);
  return props;
}

describe("ChatSearchBar", () => {
  it("renders a labeled search input with the current query", () => {
    renderSearchBar({ query: "deploy" });

    const input = screen.getByRole("textbox", { name: "Search messages" });
    expect(input).toHaveValue("deploy");
  });

  it("calls onQueryChange while typing", () => {
    const { onQueryChange } = renderSearchBar();

    fireEvent.change(screen.getByRole("textbox", { name: "Search messages" }), {
      target: { value: "hello" },
    });

    expect(onQueryChange).toHaveBeenCalledWith("hello");
  });

  it("shows the singular result count", () => {
    renderSearchBar({ query: "hello", resultCount: 1 });

    expect(screen.getByText("1 result")).toBeInTheDocument();
  });

  it("shows the plural result count", () => {
    renderSearchBar({ query: "hello", resultCount: 3 });

    expect(screen.getByText("3 results")).toBeInTheDocument();
  });

  it("hides the result count for a blank query", () => {
    renderSearchBar({ query: "   ", resultCount: 3 });

    expect(screen.queryByText(/results?$/)).not.toBeInTheDocument();
  });

  it("clears the query from the clear button", () => {
    const { onQueryChange } = renderSearchBar({ query: "hello" });

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(onQueryChange).toHaveBeenCalledWith("");
  });

  it("closes when Escape is pressed in the input", () => {
    const { onClose } = renderSearchBar({ query: "hello" });

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Search messages" }), {
      key: "Escape",
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes from the close button", () => {
    const { onClose } = renderSearchBar();

    fireEvent.click(screen.getByRole("button", { name: "Close search" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
