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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any,
      ) as { opacity: number; transition: { delay: number } };
      expect(visible.opacity).toBe(1);
      expect(visible.transition.delay).toBe(0.1);
    }

    // Test rowVariants as a function (visible)
    if (typeof animations.rowVariants.visible === "function") {
      const visible = animations.rowVariants.visible(
        2,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any,
      ) as { opacity: number; x: number; transition: { delay: number } };
      expect(visible.opacity).toBe(1);
      expect(visible.x).toBe(0);
      expect(visible.transition.delay).toBe(0.25);
    }
  });
});

