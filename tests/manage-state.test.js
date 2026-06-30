import { describe, expect, it } from "vitest";
import {
  createManagedPages,
  moveManagedPage,
  rotateManagedPage,
  shouldRenderThumbnails,
  toggleManagedPage
} from "../assets/js/manage-state.js";

describe("page manager state", () => {
  it("creates deterministic IDs bound to original page identity", () => {
    expect(createManagedPages("document-2", 3).map((page) => page.id)).toEqual([
      "document-2:0",
      "document-2:1",
      "document-2:2"
    ]);
  });

  it("moves, rotates and removes pages without changing identity", () => {
    const initial = createManagedPages("document-1", 3);
    const moved = moveManagedPage(initial, "document-1:2", -1);
    expect(moved.map((page) => page.originalIndex)).toEqual([0, 2, 1]);
    const rotated = rotateManagedPage(moved, "document-1:2");
    expect(rotated.find((page) => page.id === "document-1:2")?.rotation).toBe(90);
    const removed = toggleManagedPage(rotated, "document-1:0");
    expect(removed.find((page) => page.id === "document-1:0")?.removed).toBe(true);
    expect(removed.map((page) => page.id).sort()).toEqual(initial.map((page) => page.id).sort());
  });

  it("enforces the thumbnail page and memory boundary", () => {
    expect(shouldRenderThumbnails({ inputBytes: 10_000_000, pageCount: 100 })).toBe(true);
    expect(shouldRenderThumbnails({ inputBytes: 10_000_000, pageCount: 101 })).toBe(false);
    expect(shouldRenderThumbnails({ inputBytes: 22_000_000, pageCount: 1 })).toBe(false);
  });
});
