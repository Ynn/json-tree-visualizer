# JSON Tree Visualizer

Simple library for visualizing JSON data structures as interactive tree diagrams.

JSON -> DOT -> GraphViz

## Examples :

Examples are in /docs/examples

+ [Simple with no widget](https://ynn.github.io/json-tree-visualizer/examples/simple.html)
+ [Simple Random](https://ynn.github.io/json-tree-visualizer/examples/big.html)
+ [Using widget](https://ynn.github.io/json-tree-visualizer/examples/widget.html)


## Quick Start

### 1. Download and Include

Download `json-tree-visualizer.js` and include it in your HTML:

```html
<script src="json-tree-visualizer.js"></script>
```

### 2. Create a Visualization

```html
<div id="my-tree"></div>

<script>
  JSONTreeVisualizer.createWidget('my-tree', {
    initialJSON: { 
      name: "John Doe", 
      age: 30, 
      skills: ["JavaScript", "Python"] 
    }
  });
</script>
```

That's it! You now have a fully interactive JSON tree visualizer.

## API Reference

### JSONTreeVisualizer.convertToDot(jsonData, options)

Convert JSON data to Graphviz DOT format for custom rendering.

```javascript
const dotString = JSONTreeVisualizer.convertToDot(
    { 
      user: { name: "Alice", age: 28 },
      active: true 
    },
    {
        maxDepth: 10,
        maxArrayItems: 5,
        colorScheme: 'vibrant',
        nodeSpacing: 0.6,
        rankSpacing: 1.2
    }
);
```

**Parameters:**
- `jsonData` (Object): The JSON data to convert
- `options` (Object, optional): Configuration options

**Options:**
- `maxDepth` (number): Maximum depth to traverse (default: 10)
- `maxArrayItems` (number): Maximum array items to display (default: 5)
- `colorScheme` (string): Color scheme - 'default', 'minimal', 'vibrant' (default: 'default')
- `nodeSpacing` (number): Horizontal spacing between nodes (default: 0.6)
- `rankSpacing` (number): Vertical spacing between levels (default: 1.2)
- `truncateStrings` (number): String truncation length (default: 30)
- `showArrayIndices` (boolean): Show array indices as edge labels (default: true)

### JSONTreeVisualizer.validateJSON(jsonString)

Validate and parse JSON string with detailed error reporting.

```javascript
const result = JSONTreeVisualizer.validateJSON('{"name": "John", "age": 30}');

if (result.valid) {
    console.log("Parsed data:", result.data);
} else {
    console.log("Error:", result.error);
    console.log("Error type:", result.errorType);
}
```

**Returns:**
- `valid` (boolean): Whether the JSON is valid
- `data` (Object): Parsed JSON data (if valid)
- `error` (string): Human-readable error message (if invalid)
- `errorType` (string): Error category - 'empty', 'invalid_root', 'parse_error'
- `originalError` (string): Original parser error message

### JSONTreeVisualizer.createWidget(containerId, options)

Create a complete interactive visualization widget.

```javascript
const widget = JSONTreeVisualizer.createWidget('container-id', {
    showInput: true,        // Show JSON input panel
    showControls: true,     // Show control buttons
    initialJSON: null,      // Initial JSON data
    colorScheme: 'default', // Color scheme
    maxDepth: 10,          // Maximum depth
    maxArrayItems: 5       // Maximum array items
});

// Load new data
widget.loadJSON({ message: "Updated data!" });

// Export DOT format
const dotString = widget.exportDOT();
```

**Widget Methods:**
- `loadJSON(jsonData)` - Load new JSON data into the widget
- `exportDOT()` - Export current visualization as DOT format string


## Distribution Formats & Usage

### Available Builds

- **dist/json-tree-visualizer.js**: UMD, usable as a classic `<script>` or as CommonJS (Node.js)
- **dist/json-tree-visualizer.min.js**: Minified version for CDN (unpkg, jsdelivr)
- **dist/json-tree-visualizer.esm.js**: ES module (modern import)

### CDN Usage

Via [unpkg](https://unpkg.com/) or [jsdelivr](https://jsdelivr.com/):

```html
<script src="https://unpkg.com/json-tree-visualizer/dist/json-tree-visualizer.min.js"></script>
<!-- or -->
<script src="https://cdn.jsdelivr.net/npm/json-tree-visualizer/dist/json-tree-visualizer.min.js"></script>
```

### ESM / Modern Import

```js
import JSONTreeVisualizer from 'json-tree-visualizer/dist/json-tree-visualizer.esm.js';

// Usage is identical to the classic API
const dot = JSONTreeVisualizer.convertToDot({ foo: 'bar' });
```

### viz.js Dependency (for SVG rendering)

To use the SVG rendering feature, the library will automatically load viz.js from a CDN if needed. If you want to include it manually (for full control or offline usage):

```html
<script src="https://unpkg.com/@viz-js/viz@3.2.4/lib/viz-standalone.js"></script>
```

## Integration Examples

### Basic HTML Page

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>JSON Tree Visualizer Demo</title>
</head>
<body>
    <h1>My JSON Data</h1>
    <div id="json-tree" style="height: 600px;"></div>
    
    <script src="json-tree-visualizer.js"></script>
    <script>
        const myData = {
            user: {
                name: "Alice Johnson",
                email: "alice@example.com",
                preferences: {
                    theme: "dark",
                    notifications: true
                }
            },
            lastLogin: "2024-01-15T10:30:00Z"
        };

        JSONTreeVisualizer.createWidget('json-tree', {
            initialJSON: myData,
            colorScheme: 'vibrant'
        });
    </script>
</body>
</html>
```

