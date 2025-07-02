import assert from 'assert';

console.log('Running tests for JSONTreeVisualizer global exposure...');

// Simulate browser environment for testing global exposure
const global = {};

// Dynamically import the built IIFE file
// This is a simplified simulation; in a real browser, the script tag would handle this.
// For Node.js testing, we'll load it as a script.

// Load the IIFE bundle as if it were a script in a browser
// This requires a bit of a hack in Node.js to simulate script loading
const fs = await import('fs');
const path = await import('path');
const { fileURLToPath } = await import('url');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iifeBundlePath = path.resolve(__dirname, '../dist/json-tree-visualizer.js');
const iifeBundleContent = fs.readFileSync(iifeBundlePath, 'utf-8');

// Create a mock window object for the IIFE to attach to
const mockWindow = {};

// Execute the IIFE content in a context where mockWindow is 'window'
// This is a dangerous eval, but necessary for simulating IIFE in Node.js
new Function('window', iifeBundleContent)(mockWindow);

const JSONTreeVisualizer = mockWindow.JSONTreeVisualizer;

// Test 1: Check if JSONTreeVisualizer is exposed globally
assert.ok(JSONTreeVisualizer, 'JSONTreeVisualizer should be exposed globally');
console.log('Test 1 PASSED: JSONTreeVisualizer is exposed globally.');

// Test 2: Check if renderSVG method exists and is a function
assert.ok(typeof JSONTreeVisualizer.renderSVG === 'function', 'JSONTreeVisualizer.renderSVG should be a function');
console.log('Test 2 PASSED: JSONTreeVisualizer.renderSVG is a function.');

// Test 3: Check if convertToDot method exists and is a function
assert.ok(typeof JSONTreeVisualizer.convertToDot === 'function', 'JSONTreeVisualizer.convertToDot should be a function');
console.log('Test 3 PASSED: JSONTreeVisualizer.convertToDot is a function.');

// Test 4: Test convertToDot with simple data (re-using previous test logic)
const simpleData = {
    user: {
        name: "Alice Johnson",
        email: "alice@example.com",
        preferences: {
            theme: "dark",
            notifications: true
        },
        prefered_numbers: [7, 4, 12, 49, 30, 40, 31],
        prefered_colors: [{"color": "red"}, {"color": "blue"}, "orange"]
    },
    lastLogin: "2024-01-15T10:30:00Z"
};

const original_escapeLabel = (text) => {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\"')
        .replace(/\|/g, '\\|')
        .replace(/[{}]/g, '\\$&')
        .replace(/[<>]/g, '\\$&')
        .replace(/[\n\r]/g, '\\n');
};

const original_formatPrimitiveValue = (value) => {
    if (value === null) return 'null';
    if (typeof value === 'string') {
        const truncateStrings = 30;
        return value.length > truncateStrings
            ? `\"${value.substring(0, truncateStrings)}...\"`
            : `\"${value}\"`;
    }
    return String(value);
};

const dotString = JSONTreeVisualizer.convertToDot(simpleData);

// Corrected expected labels with double-escaped quotes
const expectedDateLabel = 'lastLogin: \\\"2024-01-15T10:30:00Z\\\"';
assert(dotString.includes(expectedDateLabel), `Test 4 Failed: Date string formatting is incorrect.\nExpected to contain: ${expectedDateLabel}\nActual: ${dotString}`);

const expectedColorLabel = '\\\"orange\\\"';
assert(dotString.includes(expectedColorLabel), `Test 4 Failed: Primitive string formatting is incorrect.\nExpected to contain: ${expectedColorLabel}\nActual: ${dotString}`);

console.log('Test 4 PASSED: convertToDot works as expected.');

console.log('All tests passed successfully!');