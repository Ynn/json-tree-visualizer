let VizInstanceImport = null;
try {
  VizInstanceImport = require("@viz-js/viz").instance;
} catch (e) {
  VizInstanceImport = null;
}

export class SVGRenderer {
  constructor() {
    this.vizInstance = null;
    this.isLoading = false;
  }

  async loadVizJs() {
    if (this.vizInstance) {
      return this.vizInstance;
    }

    if (this.isLoading) {
      while (this.isLoading) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return this.vizInstance;
    }

    this.isLoading = true;
    try {
      // Mode npm/module
      if (VizInstanceImport) {
        this.vizInstance = await VizInstanceImport();
        return this.vizInstance;
      }
      // (fallback)
      if (!window.Viz) {
        await this.loadScript(
          "https://unpkg.com/@viz-js/viz@3.2.4/lib/viz-standalone.js",
        );
      }
      if (window.Viz && window.Viz.instance) {
        this.vizInstance = await window.Viz.instance();
        return this.vizInstance;
      }
      throw new Error("Viz.js failed to load properly");
    } catch (error) {
      console.error("Failed to load viz.js:", error);
      throw new Error(
        "SVG rendering requires viz.js library. Please include it in your page or install @viz-js/viz.",
      );
    } finally {
      this.isLoading = false;
    }
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  async renderSVG(dotString, options = {}) {
    try {
      const viz = await this.loadVizJs();
      const renderOptions = {
        engine: options.engine || "dot",
        format: "svg",
      };
      const svgElement = viz.renderSVGElement(dotString, renderOptions);
      return svgElement.outerHTML;
    } catch (error) {
      console.error("SVG rendering error:", error);
      throw new Error(
        `SVG rendering error:\n\n${error.message}\n\n--- Offending DOT String ---\n${dotString}`,
      );
    }
  }
}
