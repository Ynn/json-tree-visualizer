import { ColorScheme } from "./color-scheme.js";
export class JSONToDotConverter {
  constructor(options = {}) {
    this.options = {
      maxDepth: options.maxDepth || 10,
      maxArrayItems: options.maxArrayItems || 5,
      colorScheme: options.colorScheme || "default",
      nodeSpacing: options.nodeSpacing || 0.6,
      rankSpacing: options.rankSpacing || 1.2,
      truncateStrings: options.truncateStrings || 30,
      showArrayIndices: options.showArrayIndices !== false,
    };
    this.nodeCounter = 0;
    this.colorScheme = new ColorScheme(this.options.colorScheme);
  }
  convert(data) {
    this.nodeCounter = 0;
    const graph = this.buildGraph(data);
    return this.generateDotString(graph);
  }
  buildGraph(data) {
    const nodes = [];
    const edges = [];
    const queue = [{ data, nodeId: this.generateNodeId(), depth: 0 }];
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      this.processQueueItem(item, nodes, edges, queue);
    }
    return { nodes, edges };
  }
  processQueueItem(item, nodes, edges, queue) {
    const {
      data,
      nodeId,
      parentId,
      parentPort,
      depth,
      arrayIndex,
      propertyName,
    } = item;
    if (depth >= this.options.maxDepth) {
      nodes.push(this.createTruncatedNode(nodeId));
      if (parentId) {
        edges.push(
          this.createEdge(
            parentId,
            nodeId,
            parentPort,
            arrayIndex,
            propertyName,
          ),
        );
      }
      return;
    }
    if (this.isObject(data)) {
      this.processObject(
        data,
        nodeId,
        nodes,
        edges,
        queue,
        depth,
        parentId,
        parentPort,
        arrayIndex,
        propertyName,
      );
    } else if (Array.isArray(data)) {
      this.processArray(
        data,
        nodeId,
        nodes,
        edges,
        queue,
        depth,
        parentId,
        parentPort,
        arrayIndex,
        propertyName,
      );
    } else {
      this.processPrimitive(
        data,
        nodeId,
        nodes,
        edges,
        parentId,
        parentPort,
        arrayIndex,
        propertyName,
      );
    }
  }
  processObject(
    data,
    nodeId,
    nodes,
    edges,
    queue,
    depth,
    parentId,
    parentPort,
    arrayIndex,
    propertyName,
  ) {
    const fields = [];
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
      const sanitizedKey = this.sanitizePortName(key);
      if (this.isComplexValue(value)) {
        fields.push(
          `<${sanitizedKey}>${this.escapeLabel(key)}: ${this.getTypeLabel(value)}`,
        );
        const childId = this.generateNodeId();
        queue.push({
          data: value,
          nodeId: childId,
          parentId: nodeId,
          parentPort: sanitizedKey,
          depth: depth + 1,
          propertyName: key,
        });
      } else {
        const displayValue = this.formatPrimitiveValue(value);
        fields.push(
          `${this.escapeLabel(key)}: ${this.escapeLabel(displayValue)}`,
        );
      }
    }
    const node = {
      id: nodeId,
      label: fields.join("|"),
      shape: "record",
      color: this.colorScheme.getNodeColor(data),
      style: "filled",
    };
    nodes.push(node);
    if (parentId) {
      edges.push(
        this.createEdge(parentId, nodeId, parentPort, arrayIndex, propertyName),
      );
    }
  }
  processArray(
    data,
    nodeId,
    nodes,
    edges,
    queue,
    depth,
    parentId,
    parentPort,
    arrayIndex,
    propertyName,
  ) {
    const containerNode = {
      id: nodeId,
      label: `Array(${data.length})`,
      shape: "box",
      color: this.colorScheme.getArrayColor(),
      style: "filled",
    };
    nodes.push(containerNode);
    const itemsToProcess = Math.min(data.length, this.options.maxArrayItems);
    for (let i = 0; i < itemsToProcess; i++) {
      const item = data[i];
      const childId = this.generateNodeId();
      if (this.isComplexValue(item)) {
        queue.push({
          data: item,
          nodeId: childId,
          parentId: nodeId,
          depth: depth + 1,
          arrayIndex: i,
        });
      } else {
        this.processPrimitive(
          item,
          childId,
          nodes,
          edges,
          nodeId,
          undefined,
          i,
        );
      }
    }
    if (data.length > itemsToProcess) {
      const truncatedId = this.generateNodeId();
      nodes.push({
        id: truncatedId,
        label: this.escapeLabel(
          `... and ${data.length - itemsToProcess} more items`,
        ),
        shape: "ellipse",
        color: this.colorScheme.getTruncationColor(),
        style: "filled",
      });
      edges.push(
        this.createEdge(nodeId, truncatedId, undefined, itemsToProcess),
      );
    }
    if (parentId) {
      edges.push(
        this.createEdge(parentId, nodeId, parentPort, arrayIndex, propertyName),
      );
    }
  }
  processPrimitive(
    data,
    nodeId,
    nodes,
    edges,
    parentId,
    parentPort,
    arrayIndex,
    propertyName,
  ) {
    const displayValue = this.formatPrimitiveValue(data);
    const node = {
      id: nodeId,
      label: this.escapeLabel(displayValue),
      shape: "ellipse",
      color: this.colorScheme.getPrimitiveColor(data),
      style: "filled",
    };
    nodes.push(node);
    if (parentId) {
      edges.push(
        this.createEdge(parentId, nodeId, parentPort, arrayIndex, propertyName),
      );
    }
  }
  generateNodeId() {
    return `n${this.nodeCounter++}`;
  }
  isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  isComplexValue(value) {
    return typeof value === "object" && value !== null;
  }
  getTypeLabel(value) {
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (value === null) return "null";
    if (typeof value === "object") return "Object";
    return typeof value;
  }
  formatPrimitiveValue(value) {
    if (value === null) return "null";
    if (typeof value === "string") {
      return value.length > this.options.truncateStrings
        ? `\"${value.substring(0, this.options.truncateStrings)}...\"`
        : `\"${value}\"`;
    }
    return String(value);
  }
  createTruncatedNode(nodeId) {
    return {
      id: nodeId,
      label: this.escapeLabel("... (truncated)"),
      shape: "ellipse",
      color: this.colorScheme.getTruncationColor(),
      style: "filled",
    };
  }
  createEdge(fromId, toId, fromPort, arrayIndex, propertyName) {
    const from = fromPort ? `${fromId}:${fromPort}` : fromId;
    let label = "";
    if (propertyName) {
      label = this.escapeLabel(propertyName);
    } else if (arrayIndex !== undefined && this.options.showArrayIndices) {
      label = `[${arrayIndex}]`;
    }
    return { from, to: toId, label, color: this.colorScheme.getEdgeColor() };
  }
  sanitizePortName(name) {
    const sanitized = name.replace(/[^a-zA-Z0-9_]/g, "_");
    return /^[a-zA-Z_]/.test(sanitized) ? sanitized : `_${sanitized}`;
  }
  escapeLabel(text) {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/\"/g, '\\\"')
      .replace(/\|/g, "\\\|")
      .replace(/\</g, "\\\<")
      .replace(/\>/g, "\\\>")
      .replace(/\{/g, "\\\{")
      .replace(/\}/g, "\\\}")
      .replace(/\n/g, "\\\n");
  }
  generateDotString(graph) {
    const parts = [
      "digraph JSONTree {",
      "  rankdir=TB;",
      '  node [fontname="Arial", fontsize=10, margin=0.2];',
      '  edge [fontname="Arial", fontsize=8, arrowsize=0.7];',
      '  bgcolor="transparent";',
      `  nodesep=${this.options.nodeSpacing};`,
      `  ranksep=${this.options.rankSpacing};`,
      "",
    ];
    for (const node of graph.nodes) {
      parts.push(
        `  ${node.id} [label="${node.label}", shape=${node.shape}, fillcolor="${node.color}", style="${node.style}"];`,
      );
    }
    parts.push("");
    for (const edge of graph.edges) {
      const label = edge.label ? `, label="${edge.label}"` : "";
      parts.push(
        `  ${edge.from} -> ${edge.to} [color="${edge.color}"${label}];`,
      );
    }
    parts.push("}");
    return parts.join("\n");
  }
}
