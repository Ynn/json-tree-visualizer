export class ColorScheme {
  constructor(scheme = "default") {
    this.palette = this.getPalette(scheme);
  }

  getNodeColor(data) {
    if (data === null) return this.palette.null;
    if (Array.isArray(data)) return this.palette.array;

    if (typeof data === "object") {
      return this.getObjectColor(data);
    }

    return this.getPrimitiveColor(data);
  }

  getPrimitiveColor(value) {
    if (value === null) return this.palette.null;
    if (typeof value === "string") return this.palette.string;
    if (typeof value === "number") return this.palette.number;
    if (typeof value === "boolean") return this.palette.boolean;
    return this.palette.object;
  }

  getArrayColor() {
    return this.palette.array;
  }

  getTruncationColor() {
    return this.palette.truncation;
  }

  getEdgeColor() {
    return this.palette.edge;
  }

  getObjectColor(data) {
    const keys = Object.keys(data);
    if (keys.length <= 2) return this.palette.simple;
    if (keys.length <= 5) return this.palette.object;
    return this.palette.complex;
  }

  hasKeys(keySet, requiredKeys) {
    return requiredKeys.some((key) => keySet.has(key));
  }

  getPalette(scheme) {
    const palettes = {
      default: {
        object: "#f1f5f9",
        array: "#ecfdf5",
        string: "#fef3c7",
        number: "#dbeafe",
        boolean: "#e0e7ff",
        null: "#f3f4f6",
        truncation: "#fef3c7",
        edge: "#059669",
        person: "#e0f2fe",
        address: "#fed7aa",
        contact: "#fce7f3",
        simple: "#f8fafc",
        complex: "#dcfce7",
      },
      minimal: {
        object: "#ffffff",
        array: "#f8f9fa",
        string: "#f8f9fa",
        number: "#f8f9fa",
        boolean: "#f8f9fa",
        null: "#e9ecef",
        truncation: "#dee2e6",
        edge: "#6c757d",
        person: "#f8f9fa",
        address: "#f8f9fa",
        contact: "#f8f9fa",
        simple: "#ffffff",
        complex: "#e9ecef",
      },
      vibrant: {
        object: "#e1f5fe",
        array: "#c8e6c9",
        string: "#fff9c4",
        number: "#bbdefb",
        boolean: "#d1c4e9",
        null: "#f5f5f5",
        truncation: "#ffc107",
        edge: "#2e7d32",
        person: "#81d4fa",
        address: "#ffab91",
        contact: "#f48fb1",
        simple: "#e8f5e8",
        complex: "#a5d6a7",
      },
    };

    return palettes[scheme] || palettes.default;
  }
}
