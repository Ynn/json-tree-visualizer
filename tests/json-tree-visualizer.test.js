import { describe, it, expect, beforeAll } from "vitest";
import path from "path";
import fs from "fs";

const myData = {
  user: {
    name: "Alice Johnson",
    email: "alice@example.com",
    preferences: {
      theme: "dark",
      notifications: true,
    },
    prefered_numbers: [7, 4, 12, 49, 30, 40, 31],
    prefered_colors: [
      { color: "red" },
      { color: "blue" },
      { color: "yellow" },
      { color: "pink" },
      { color: "purple" },
      "orange",
    ],
  },
  lastLogin: "2024-01-15T10:30:00Z",
};

beforeAll(() => {
  // Load the IIFE bundle into the global context
  const bundlePath = path.resolve(__dirname, "../dist/json-tree-visualizer.js");
  const code = fs.readFileSync(bundlePath, "utf8");
  // eslint-disable-next-line no-eval
  eval(code); // Expose JSONTreeVisualizer on globalThis
});

describe("JSONTreeVisualizer (global bundle)", () => {
  it("exposes the expected properties", () => {
    // Print keys for diagnostics
    // eslint-disable-next-line no-console
    console.log(
      "Exposed keys on JSONTreeVisualizer:",
      Object.keys(globalThis.JSONTreeVisualizer),
    );
    expect(globalThis.JSONTreeVisualizer).toBeTypeOf("object");
  });

  it("generates valid DOT (convertToDot)", () => {
    const dot = globalThis.JSONTreeVisualizer.convertToDot(myData, {
      colorScheme: "vibrant",
      maxArrayItems: 20,
    });
    expect(typeof dot).toBe("string");
    expect(dot).toMatch(/^digraph/);
    expect(dot).toContain("user");
  });

  it("generates SVG without error", async () => {
    const svg = await globalThis.JSONTreeVisualizer.renderSVG(myData, {
      colorScheme: "vibrant",
      maxArrayItems: 20,
    });
    expect(typeof svg).toBe("string");
    expect(svg).toMatch(/^<svg[\s>]/);
    expect(svg).toContain("Alice Johnson");
  });
});
