import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EditorTabs } from "@/components/editor/EditorTabs";

describe("EditorTabs Component", () => {
  const mockOnFileSelect = jest.fn();
  const mockOnFileClose = jest.fn();
  const mockOnReorderFiles = jest.fn();

  const defaultProps = {
    openFiles: ["file1.tsx", "file2.ts", "file3.js"],
    activeFile: "file1.tsx",
    onFileSelect: mockOnFileSelect,
    onFileClose: mockOnFileClose,
    onReorderFiles: mockOnReorderFiles,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render all open files", () => {
      render(<EditorTabs {...defaultProps} />);

      expect(screen.getByText("file1.tsx")).toBeInTheDocument();
      expect(screen.getByText("file2.ts")).toBeInTheDocument();
      expect(screen.getByText("file3.js")).toBeInTheDocument();
    });

    it("should highlight active file", () => {
      render(<EditorTabs {...defaultProps} />);
      const activeTab = screen.getByRole("tab", { name: /file1\.tsx/i });
      expect(activeTab).toHaveAttribute("aria-selected", "true");
    });

    it("should render close buttons for each tab", () => {
      render(<EditorTabs {...defaultProps} />);
      const closeButtons = screen.getAllByRole("button", { name: /close/i });
      expect(closeButtons.length).toBeGreaterThanOrEqual(3);
    });

    it("should have tablist with open editor tabs", () => {
      render(<EditorTabs {...defaultProps} />);
      expect(
        screen.getByRole("tablist", { name: /open editor tabs/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should call onSelectFile when tab is clicked", () => {
      render(<EditorTabs {...defaultProps} />);
      fireEvent.click(screen.getByRole("tab", { name: /file2\.ts/i }));
      expect(mockOnFileSelect).toHaveBeenCalledWith("file2.ts");
    });

    it("should call onCloseFile when close button is clicked", () => {
      render(<EditorTabs {...defaultProps} />);

      const closeButtons = screen.getAllByRole("button", { name: /close/i });
      fireEvent.click(closeButtons[0]);

      expect(mockOnFileClose).toHaveBeenCalledWith("file1.tsx");
    });

    it("should prevent propagation when clicking close button", () => {
      render(<EditorTabs {...defaultProps} />);

      const closeButtons = screen.getAllByRole("button", { name: /close/i });
      fireEvent.click(closeButtons[0]);

      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });
  });

  describe("Drag and drop reorder", () => {
    it("should call onReorderFiles with new order when tab is dropped on another", () => {
      render(<EditorTabs {...defaultProps} />);
      const file2Tab = screen.getByRole("tab", { name: /file2\.ts/i });
      const file3Tab = screen.getByRole("tab", { name: /file3\.js/i });
      fireEvent.dragStart(file2Tab, {
        dataTransfer: { setData: jest.fn(), effectAllowed: "", dropEffect: "" },
      });
      fireEvent.dragOver(file3Tab, {
        preventDefault: jest.fn(),
        dataTransfer: { dropEffect: "move" },
      });
      fireEvent.drop(file3Tab, { preventDefault: jest.fn() });
      expect(mockOnReorderFiles).toHaveBeenCalledWith([
        "file1.tsx",
        "file3.js",
        "file2.ts",
      ]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty file list", () => {
      render(<EditorTabs {...defaultProps} openFiles={[]} />);
      expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    });

    it("should handle single file", () => {
      render(
        <EditorTabs
          {...defaultProps}
          openFiles={["single.tsx"]}
          activeFile="single.tsx"
        />,
      );

      expect(screen.getByText("single.tsx")).toBeInTheDocument();
    });

    it("should handle long filenames", () => {
      const longFilename =
        "this-is-a-very-long-filename-that-might-cause-layout-issues.tsx";
      render(
        <EditorTabs
          {...defaultProps}
          openFiles={[longFilename]}
          activeFile={longFilename}
        />,
      );

      expect(screen.getByText(longFilename)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(<EditorTabs {...defaultProps} />);
      const tabs = screen.getAllByRole("tab");
      expect(tabs.length).toBeGreaterThan(0);
    });

    it("should be keyboard navigable", () => {
      render(<EditorTabs {...defaultProps} />);
      const firstTab = screen.getByRole("tab", { name: /file1\.tsx/i });
      firstTab.focus();
      expect(firstTab).toHaveFocus();
    });
  });
});
