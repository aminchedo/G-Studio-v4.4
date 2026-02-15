/**
 * Phase 5: Performance – render timing checks for heavy components.
 * Ensures memoized panels and layout components render within acceptable time.
 * Run: npm run test -- __tests__/performance/render-timing.test.tsx
 */

import React from "react";
import { render } from "@testing-library/react";
import { BottomPanel } from "@/components/layout/BottomPanel";
import { EditorTabs } from "@/components/editor/EditorTabs";

const MAX_RENDER_MS = 100;

function measureRender(ui: React.ReactElement): number {
  const start = performance.now();
  render(ui);
  return performance.now() - start;
}

describe("Phase 5 – render timing", () => {
  it("BottomPanel (memoized) renders within threshold", () => {
    const ms = measureRender(
      <BottomPanel isOpen={true} onToggle={() => {}}>
        <div>Content</div>
      </BottomPanel>,
    );
    expect(ms).toBeLessThan(MAX_RENDER_MS);
  });

  it("EditorTabs (memoized) with few tabs renders within threshold", () => {
    const files = ["a.ts", "b.tsx"];
    const ms = measureRender(
      <EditorTabs
        openFiles={files}
        activeFile="a.ts"
        onSelectFile={() => {}}
        onCloseFile={() => {}}
        onReorderFiles={() => {}}
      />,
    );
    expect(ms).toBeLessThan(MAX_RENDER_MS);
  });
});
