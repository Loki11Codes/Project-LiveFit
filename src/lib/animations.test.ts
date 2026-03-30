import { describe, it, expect } from "vitest";
import * as animations from "./animations";

describe("Animations", () => {
  it("exports valid animation objects", () => {
    expect(animations.cardVariants).toBeDefined();
    expect(animations.rowVariants).toBeDefined();
    expect(animations.floatAnimation).toBeDefined();

    // Test cardVariants as a function (visible)
    if (typeof animations.cardVariants.visible === "function") {
      const visible = animations.cardVariants.visible(
        1,
        {} as unknown,
        {} as unknown,
      ) as unknown;
      expect(visible.opacity).toBe(1);
      expect(visible.transition.delay).toBe(0.1);
    }
  });
});
