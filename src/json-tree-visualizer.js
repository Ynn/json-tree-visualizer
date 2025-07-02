import { JSONToDotConverter } from "./converter.js";
import { JSONValidator } from "./validator.js";
import { SVGRenderer } from "./renderer.js";
import { JSONTreeWidget } from "./widget.js";

/**
 * JSON Tree Visualizer - Standalone Library
 * Version: 1.0.0
 * Zero dependencies, works in any browser
 * Now with SVG rendering support via viz.js
 *
 * Usage:
 * - JSONTreeVisualizer.convertToDot(jsonData, options)
 * - JSONTreeVisualizer.validateJSON(jsonString)
 * - JSONTreeVisualizer.createWidget(containerId, options)
 * - JSONTreeVisualizer.renderSVG(jsonData, options)
 */

(function (global) {
  "use strict";

  const JSONTreeVisualizer = {
    convertToDot: function (jsonData, options = {}) {
      const converter = new JSONToDotConverter(options);
      return converter.convert(jsonData);
    },

    validateJSON: function (jsonString) {
      return JSONValidator.validate(jsonString);
    },

    createWidget: function (containerId, options = {}) {
      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(`Container with id '${containerId}' not found`);
      }
      return new JSONTreeWidget(container, options);
    },

    renderSVG: async function (jsonData, options = {}) {
      const converter = new JSONToDotConverter(options);
      const dotString = converter.convert(jsonData);
      const renderer = new SVGRenderer();
      return await renderer.renderSVG(dotString, options);
    },

    version: "1.0.0",
  };

  // Export to global scope
  global.JSONTreeVisualizer = JSONTreeVisualizer;

  // Also support CommonJS and AMD if available
  if (typeof module !== "undefined" && module.exports) {
    module.exports = JSONTreeVisualizer;
  }
  if (typeof define === "function" && define.amd) {
    define(function () {
      return JSONTreeVisualizer;
    });
  }
})(typeof window !== "undefined" ? window : this);
