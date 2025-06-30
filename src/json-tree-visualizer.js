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

(function(global) {
    'use strict';

    // Core conversion engine
    class JSONToDotConverter {
        constructor(options = {}) {
            this.options = {
                maxDepth: options.maxDepth || 10,
                maxArrayItems: options.maxArrayItems || 5,
                colorScheme: options.colorScheme || 'default',
                nodeSpacing: options.nodeSpacing || 0.6,
                rankSpacing: options.rankSpacing || 1.2,
                truncateStrings: options.truncateStrings || 30,
                showArrayIndices: options.showArrayIndices !== false
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
            const queue = [];

            const rootId = this.generateNodeId();
            queue.push({ data, nodeId: rootId, depth: 0 });

            while (queue.length > 0) {
                const item = queue.shift();
                this.processQueueItem(item, nodes, edges, queue);
            }

            return { nodes, edges };
        }

        processQueueItem(item, nodes, edges, queue) {
            const { data, nodeId, parentId, parentPort, depth, arrayIndex } = item;

            if (depth >= this.options.maxDepth) {
                nodes.push(this.createTruncatedNode(nodeId));
                if (parentId) {
                    edges.push(this.createEdge(parentId, nodeId, parentPort, arrayIndex));
                }
                return;
            }

            if (this.isObject(data)) {
                this.processObject(data, nodeId, nodes, edges, queue, depth, parentId, parentPort, arrayIndex);
            } else if (Array.isArray(data)) {
                this.processArray(data, nodeId, nodes, edges, queue, depth, parentId, parentPort, arrayIndex);
            } else {
                this.processPrimitive(data, nodeId, nodes, parentId, parentPort, arrayIndex);
            }
        }

        processObject(data, nodeId, nodes, edges, queue, depth, parentId, parentPort, arrayIndex) {
            const fields = [];
            const entries = Object.entries(data);

            for (const [key, value] of entries) {
                const sanitizedKey = this.sanitizePortName(key);
                
                if (this.isComplexValue(value)) {
                    fields.push(`<${sanitizedKey}>${this.escapeLabel(key)}: ${this.getTypeLabel(value)}`);
                    const childId = this.generateNodeId();
                    queue.push({
                        data: value,
                        nodeId: childId,
                        parentId: nodeId,
                        parentPort: sanitizedKey,
                        depth: depth + 1
                    });
                } else {
                    const displayValue = this.formatPrimitiveValue(value);
                    fields.push(`${this.escapeLabel(key)}: ${this.escapeLabel(displayValue)}`);
                }
            }

            const node = {
                id: nodeId,
                label: fields.join('|'),
                shape: 'record',
                color: this.colorScheme.getNodeColor(data),
                style: 'filled'
            };

            nodes.push(node);

            if (parentId) {
                edges.push(this.createEdge(parentId, nodeId, parentPort, arrayIndex));
            }
        }

        processArray(data, nodeId, nodes, edges, queue, depth, parentId, parentPort, arrayIndex) {
            // Affiche tous les éléments (complexes ou primitifs) comme enfants du tableau
            const containerNode = {
                id: nodeId,
                label: `Array(${data.length})`,
                shape: 'box',
                color: this.colorScheme.getArrayColor(),
                style: 'filled'
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
                        arrayIndex: i
                    });
                } else {
                    // Primitif : crée le nœud directement et ajoute l'arête
                    this.processPrimitive(item, childId, nodes, edges, nodeId, undefined, i);
                }
            }
            if (data.length > itemsToProcess) {
                const truncatedId = this.generateNodeId();
                nodes.push({
                    id: truncatedId,
                    label: this.escapeLabel(`... and ${data.length - itemsToProcess} more items`),
                    shape: 'ellipse',
                    color: this.colorScheme.getTruncationColor(),
                    style: 'filled'
                });
                edges.push(this.createEdge(nodeId, truncatedId, undefined, itemsToProcess));
            }
            if (parentId) {
                edges.push(this.createEdge(parentId, nodeId, parentPort, arrayIndex));
            }
        }

        processPrimitive(data, nodeId, nodes, edges, parentId, parentPort, arrayIndex) {
            const displayValue = this.formatPrimitiveValue(data);
            const node = {
                id: nodeId,
                label: this.escapeLabel(displayValue),
                shape: 'ellipse',
                color: this.colorScheme.getPrimitiveColor(data),
                style: 'filled'
            };

            nodes.push(node);

            if (parentId) {
                edges.push(this.createEdge(parentId, nodeId, parentPort, arrayIndex));
            }
        }

        // Utility methods
        generateNodeId() {
            return `n${this.nodeCounter++}`;
        }

        isObject(value) {
            return typeof value === 'object' && value !== null && !Array.isArray(value);
        }

        isComplexValue(value) {
            return typeof value === 'object' && value !== null;
        }

        getTypeLabel(value) {
            if (Array.isArray(value)) return `Array(${value.length})`;
            if (value === null) return 'null';
            if (typeof value === 'object') return 'Object';
            return typeof value;
        }

        formatPrimitiveValue(value) {
            if (value === null) return 'null';
            if (typeof value === 'string') {
                return value.length > this.options.truncateStrings 
                    ? `"${value.substring(0, this.options.truncateStrings)}..."` 
                    : `"${value}"`;
            }
            return String(value);
        }

        formatArrayValue(array) {
            if (array.length === 0) return '[]';
            const max = this.options.maxArrayItems;
            if (array.length <= max) {
                return `[${array.map(v => this.formatPrimitiveValue(v)).join(', ')}]`;
            }
            return `[${array.slice(0, max).map(v => this.formatPrimitiveValue(v)).join(', ')}, ...]`;
        }

        createTruncatedNode(nodeId) {
            return {
                id: nodeId,
                label: this.escapeLabel('... (truncated)'),
                shape: 'ellipse',
                color: this.colorScheme.getTruncationColor(),
                style: 'filled'
            };
        }

        createEdge(fromId, toId, fromPort, arrayIndex) {
            const from = fromPort ? `${fromId}:${fromPort}` : fromId;
            const label = arrayIndex !== undefined && this.options.showArrayIndices ? `[${arrayIndex}]` : '';
            
            return {
                from,
                to: toId,
                label,
                color: this.colorScheme.getEdgeColor()
            };
        }

        sanitizePortName(name) {
            const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
            return /^[a-zA-Z_]/.test(sanitized) ? sanitized : `_${sanitized}`;
        }

        escapeLabel(text) {
            return text
                .replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\|/g, '\\|')
                .replace(/[{}]/g, '\\$&')
                .replace(/[<>]/g, '\\$&')
                .replace(/[\n\r]/g, '\\n');
        }

        generateDotString(graph) {
            const parts = [];
            
            parts.push(
                'digraph JSONTree {',
                '  rankdir=TB;',
                '  node [fontname="Arial", fontsize=10, margin=0.2];',
                '  edge [fontname="Arial", fontsize=8, arrowsize=0.7];',
                '  bgcolor="transparent";',
                `  nodesep=${this.options.nodeSpacing};`,
                `  ranksep=${this.options.rankSpacing};`,
                ''
            );

            for (const node of graph.nodes) {
                parts.push(`  ${node.id} [label="${node.label}", shape=${node.shape}, fillcolor="${node.color}", style="${node.style}"];`);
            }

            parts.push('');

            for (const edge of graph.edges) {
                const label = edge.label ? `, label="${edge.label}"` : '';
                parts.push(`  ${edge.from} -> ${edge.to} [color="${edge.color}"${label}];`);
            }

            parts.push('}');

            return parts.join('\n');
        }
    }

    // Color scheme management
    class ColorScheme {
        constructor(scheme = 'default') {
            this.palette = this.getPalette(scheme);
        }

        getNodeColor(data) {
            if (data === null) return this.palette.null;
            if (Array.isArray(data)) return this.palette.array;
            
            if (typeof data === 'object') {
                return this.getObjectColor(data);
            }
            
            return this.getPrimitiveColor(data);
        }

        getPrimitiveColor(value) {
            if (value === null) return this.palette.null;
            if (typeof value === 'string') return this.palette.string;
            if (typeof value === 'number') return this.palette.number;
            if (typeof value === 'boolean') return this.palette.boolean;
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
            const keySet = new Set(keys);

            if (this.hasKeys(keySet, ['name', 'age']) || 
                this.hasKeys(keySet, ['first_name', 'last_name'])) {
                return this.palette.person;
            }

            if (this.hasKeys(keySet, ['street', 'city']) ||
                this.hasKeys(keySet, ['address']) ||
                this.hasKeys(keySet, ['street_address', 'city'])) {
                return this.palette.address;
            }

            if (this.hasKeys(keySet, ['type', 'value']) ||
                this.hasKeys(keySet, ['email']) ||
                this.hasKeys(keySet, ['phone'])) {
                return this.palette.contact;
            }

            if (keys.length <= 2) return this.palette.simple;
            if (keys.length <= 5) return this.palette.object;
            return this.palette.complex;
        }

        hasKeys(keySet, requiredKeys) {
            return requiredKeys.some(key => keySet.has(key));
        }

        getPalette(scheme) {
            const palettes = {
                default: {
                    object: '#f1f5f9',
                    array: '#ecfdf5',
                    string: '#fef3c7',
                    number: '#dbeafe',
                    boolean: '#e0e7ff',
                    null: '#f3f4f6',
                    truncation: '#fef3c7',
                    edge: '#059669',
                    person: '#e0f2fe',
                    address: '#fed7aa',
                    contact: '#fce7f3',
                    simple: '#f8fafc',
                    complex: '#dcfce7'
                },
                minimal: {
                    object: '#ffffff',
                    array: '#f8f9fa',
                    string: '#f8f9fa',
                    number: '#f8f9fa',
                    boolean: '#f8f9fa',
                    null: '#e9ecef',
                    truncation: '#dee2e6',
                    edge: '#6c757d',
                    person: '#f8f9fa',
                    address: '#f8f9fa',
                    contact: '#f8f9fa',
                    simple: '#ffffff',
                    complex: '#e9ecef'
                },
                vibrant: {
                    object: '#e1f5fe',
                    array: '#c8e6c9',
                    string: '#fff9c4',
                    number: '#bbdefb',
                    boolean: '#d1c4e9',
                    null: '#f5f5f5',
                    truncation: '#ffc107',
                    edge: '#2e7d32',
                    person: '#81d4fa',
                    address: '#ffab91',
                    contact: '#f48fb1',
                    simple: '#e8f5e8',
                    complex: '#a5d6a7'
                }
            };

            return palettes[scheme] || palettes.default;
        }
    }

    // JSON Validator
    class JSONValidator {
        static validate(jsonString) {
            if (!jsonString || jsonString.trim() === '') {
                return {
                    valid: false,
                    error: 'Empty input',
                    errorType: 'empty'
                };
            }

            try {
                const parsed = JSON.parse(jsonString);
                
                if (typeof parsed !== 'object' || parsed === null) {
                    return {
                        valid: false,
                        error: 'Root must be an object or array',
                        errorType: 'invalid_root',
                        data: parsed
                    };
                }

                return {
                    valid: true,
                    data: parsed
                };
            } catch (error) {
                return {
                    valid: false,
                    error: this.formatParseError(error.message),
                    errorType: 'parse_error',
                    originalError: error.message
                };
            }
        }

        static formatParseError(message) {
            const errorMappings = {
                'Unexpected token': 'Invalid JSON syntax',
                'Unexpected end of JSON input': 'Incomplete JSON - missing closing brackets or quotes',
                'Expected property name': 'Missing property name or quotes around property name',
                'Unexpected string': 'Invalid string format or missing comma'
            };

            for (const [pattern, friendlyMessage] of Object.entries(errorMappings)) {
                if (message.includes(pattern)) {
                    return friendlyMessage;
                }
            }

            return message;
        }
    }

    // SVG Renderer with viz.js integration
    class SVGRenderer {
        constructor() {
            this.vizInstance = null;
            this.isLoading = false;
        }

        async loadVizJs() {
            if (this.vizInstance) {
                return this.vizInstance;
            }

            if (this.isLoading) {
                // Wait for existing load to complete
                while (this.isLoading) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                return this.vizInstance;
            }

            this.isLoading = true;

            try {
                // Try to load viz.js from CDN
                if (!window.Viz) {
                    await this.loadScript('https://unpkg.com/@viz-js/viz@3.2.4/lib/viz-standalone.js');
                }

                if (window.Viz && window.Viz.instance) {
                    this.vizInstance = await window.Viz.instance();
                    console.log('Viz.js loaded successfully');
                    return this.vizInstance;
                } else {
                    throw new Error('Viz.js failed to load properly');
                }
            } catch (error) {
                console.error('Failed to load viz.js:', error);
                throw new Error('SVG rendering requires viz.js library. Please include it in your page.');
            } finally {
                this.isLoading = false;
            }
        }

        loadScript(src) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
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
                    engine: options.engine || 'dot',
                    format: 'svg'
                };

                const svgElement = viz.renderSVGElement(dotString, renderOptions);
                return svgElement.outerHTML;
            } catch (error) {
                console.error('SVG rendering error:', error);
                throw new Error(`SVG rendering error:\n\n${error.message}`);
            }
        }
    }

    // Widget creator
    class WidgetCreator {
        static createWidget(containerId, options = {}) {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container with id '${containerId}' not found`);
            }

            const widget = new JSONTreeWidget(container, options);
            return widget;
        }
    }

    // Main widget class with enhanced SVG navigation
    class JSONTreeWidget {
        constructor(container, options = {}) {
            this.container = container;
            this.options = {
                showInput: options.showInput !== false,
                showControls: options.showControls !== false,
                initialJSON: options.initialJSON || null,
                renderSVG: options.renderSVG !== false,
                ...options
            };
            
            this.currentData = this.options.initialJSON;
            this.svgRenderer = new SVGRenderer();
            this.currentSVG = null;
            this.zoomLevel = 1;
            this.panX = 0;
            this.panY = 0;
            this.isDragging = false;
            this.lastMouseX = 0;
            this.lastMouseY = 0;
            
            this.init();
        }

        init() {
            this.container.innerHTML = this.createHTML();
            this.setupEventListeners();
            
            if (this.currentData) {
                this.loadJSON(this.currentData);
            }
        }

        createHTML() {
            const showInput = this.options.showInput;
            const showControls = this.options.showControls;

            return `
                <div style="display: flex; height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    ${showInput ? `
                        <div style="width: 300px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column;">
                            <div style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
                                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">JSON Input</h3>
                                <p style="margin: 0; font-size: 12px; color: #64748b;">Enter your JSON data</p>
                            </div>
                            ${showControls ? `
                                <div style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
                                    <button class="widget-btn widget-btn-primary" data-action="generate">🚀 Generate Tree</button>
                                    <button class="widget-btn widget-btn-secondary" data-action="clear">🧹 Clear</button>
                                </div>
                            ` : ''}
                            <div style="flex: 1; padding: 12px;">
                                <textarea 
                                    class="widget-textarea" 
                                    placeholder="Paste your JSON here..."
                                    style="width: 100%; height: 100%; resize: none; border: 1px solid #d1d5db; border-radius: 4px; padding: 8px; font-family: monospace; font-size: 12px;"
                                ></textarea>
                            </div>
                        </div>
                    ` : ''}
                    <div style="flex: 1; background: #f8f9fa; position: relative; overflow: hidden;">
                        <!-- Navigation Controls -->
                        <div style="position: absolute; top: 10px; right: 10px; z-index: 100; display: flex; gap: 5px;">
                            <div style="background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: flex; overflow: hidden;">
                                <button class="nav-btn" data-action="zoom-in" title="Zoom In">🔍+</button>
                                <button class="nav-btn" data-action="zoom-out" title="Zoom Out">🔍-</button>
                                <button class="nav-btn" data-action="reset-view" title="Reset View">🔄</button>
                                <button class="nav-btn" data-action="new-tab" title="Open in New Tab">🔗</button>
                            </div>
                        </div>
                        
                        <!-- Zoom Level Indicator -->
                        <div class="zoom-indicator" style="position: absolute; bottom: 10px; right: 10px; z-index: 100; background: white; padding: 5px 10px; border-radius: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); font-size: 12px; color: #666;">
                            <span class="zoom-level">100%</span>
                        </div>
                        
                        <!-- Instructions -->
                        <div style="position: absolute; bottom: 10px; left: 10px; z-index: 100; background: rgba(0,0,0,0.7); color: white; padding: 8px 12px; border-radius: 15px; font-size: 11px;">
                            🖱️ Glissez pour naviguer • 🖱️ Molette pour zoomer
                        </div>
                        
                        <!-- SVG Container -->
                        <div class="widget-output" style="width: 100%; height: 100%; overflow: hidden; cursor: grab; position: relative;">
                            <div class="svg-container" style="width: 100%; height: 100%; transform-origin: 0 0; transition: transform 0.1s ease-out;">
                                <div style="display: flex; align-items: center; justify-content: center; height: 100%; text-align: center; color: #64748b;">
                                    <div>
                                        <div style="font-size: 48px; margin-bottom: 16px;">🌳</div>
                                        <p style="font-size: 16px; margin: 0;">No tree generated yet</p>
                                        <p style="font-size: 14px; margin: 8px 0 0 0;">Enter JSON data and click Generate</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <style>
                    .widget-btn {
                        padding: 6px 12px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 500;
                        margin-right: 8px;
                        margin-bottom: 8px;
                        transition: all 0.2s;
                    }
                    .widget-btn:hover {
                        transform: translateY(-1px);
                    }
                    .widget-btn-primary {
                        background: #3b82f6;
                        color: white;
                    }
                    .widget-btn-secondary {
                        background: #6b7280;
                        color: white;
                    }
                    .nav-btn {
                        padding: 8px 12px;
                        border: none;
                        background: white;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background-color 0.2s;
                        border-right: 1px solid #e5e7eb;
                    }
                    .nav-btn:last-child {
                        border-right: none;
                    }
                    .nav-btn:hover {
                        background: #f3f4f6;
                    }
                    .widget-textarea:focus {
                        outline: none;
                        border-color: #3b82f6;
                        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
                    }
                    .widget-output.dragging {
                        cursor: grabbing !important;
                    }
                    .svg-container svg {
                        max-width: none !important;
                        max-height: none !important;
                    }
                </style>
            `;
        }

        setupEventListeners() {
            // Button event listeners
            const buttons = this.container.querySelectorAll('.widget-btn, .nav-btn');
            buttons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = e.target.getAttribute('data-action');
                    this.handleAction(action);
                });
            });

            // Textarea setup
            const textarea = this.container.querySelector('.widget-textarea');
            if (textarea && this.currentData) {
                textarea.value = JSON.stringify(this.currentData, null, 2);
            }

            // SVG navigation setup
            this.setupSVGNavigation();
        }

        setupSVGNavigation() {
            const output = this.container.querySelector('.widget-output');
            const svgContainer = this.container.querySelector('.svg-container');
            
            if (!output || !svgContainer) return;

            // Mouse events for drag and drop
            output.addEventListener('mousedown', (e) => {
                if (e.button === 0) { // Left mouse button
                    this.isDragging = true;
                    this.lastMouseX = e.clientX;
                    this.lastMouseY = e.clientY;
                    output.classList.add('dragging');
                    e.preventDefault();
                }
            });

            document.addEventListener('mousemove', (e) => {
                if (this.isDragging) {
                    const deltaX = e.clientX - this.lastMouseX;
                    const deltaY = e.clientY - this.lastMouseY;
                    
                    this.panX += deltaX;
                    this.panY += deltaY;
                    
                    this.updateTransform();
                    
                    this.lastMouseX = e.clientX;
                    this.lastMouseY = e.clientY;
                }
            });

            document.addEventListener('mouseup', () => {
                if (this.isDragging) {
                    this.isDragging = false;
                    output.classList.remove('dragging');
                }
            });

            // Wheel event for zoom
            output.addEventListener('wheel', (e) => {
                e.preventDefault();
                
                const rect = output.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                const newZoom = Math.max(0.1, Math.min(5, this.zoomLevel * zoomFactor));
                
                if (newZoom !== this.zoomLevel) {
                    // Zoom towards mouse position
                    const zoomRatio = newZoom / this.zoomLevel;
                    this.panX = mouseX - (mouseX - this.panX) * zoomRatio;
                    this.panY = mouseY - (mouseY - this.panY) * zoomRatio;
                    
                    this.zoomLevel = newZoom;
                    this.updateTransform();
                    this.updateZoomIndicator();
                }
            });

            // Touch events for mobile
            let lastTouchDistance = 0;
            
            output.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    this.isDragging = true;
                    this.lastMouseX = e.touches[0].clientX;
                    this.lastMouseY = e.touches[0].clientY;
                } else if (e.touches.length === 2) {
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    lastTouchDistance = Math.sqrt(
                        Math.pow(touch2.clientX - touch1.clientX, 2) +
                        Math.pow(touch2.clientY - touch1.clientY, 2)
                    );
                }
                e.preventDefault();
            });

            output.addEventListener('touchmove', (e) => {
                if (e.touches.length === 1 && this.isDragging) {
                    const deltaX = e.touches[0].clientX - this.lastMouseX;
                    const deltaY = e.touches[0].clientY - this.lastMouseY;
                    
                    this.panX += deltaX;
                    this.panY += deltaY;
                    
                    this.updateTransform();
                    
                    this.lastMouseX = e.touches[0].clientX;
                    this.lastMouseY = e.touches[0].clientY;
                } else if (e.touches.length === 2) {
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    const currentDistance = Math.sqrt(
                        Math.pow(touch2.clientX - touch1.clientX, 2) +
                        Math.pow(touch2.clientY - touch1.clientY, 2)
                    );
                    
                    if (lastTouchDistance > 0) {
                        const zoomFactor = currentDistance / lastTouchDistance;
                        const newZoom = Math.max(0.1, Math.min(5, this.zoomLevel * zoomFactor));
                        
                        if (newZoom !== this.zoomLevel) {
                            this.zoomLevel = newZoom;
                            this.updateTransform();
                            this.updateZoomIndicator();
                        }
                    }
                    
                    lastTouchDistance = currentDistance;
                }
                e.preventDefault();
            });

            output.addEventListener('touchend', () => {
                this.isDragging = false;
                lastTouchDistance = 0;
            });
        }

        updateTransform() {
            const svgContainer = this.container.querySelector('.svg-container');
            if (svgContainer) {
                svgContainer.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
            }
        }

        updateZoomIndicator() {
            const indicator = this.container.querySelector('.zoom-level');
            if (indicator) {
                indicator.textContent = `${Math.round(this.zoomLevel * 100)}%`;
            }
        }

        handleAction(action) {
            switch (action) {
                case 'generate':
                    this.generateFromInput();
                    break;
                case 'clear':
                    this.clear();
                    break;
                case 'zoom-in':
                    this.zoomIn();
                    break;
                case 'zoom-out':
                    this.zoomOut();
                    break;
                case 'reset-view':
                    this.resetView();
                    break;
                case 'new-tab':
                    this.openInNewTab();
                    break;
            }
        }

        zoomIn() {
            this.zoomLevel = Math.min(5, this.zoomLevel * 1.2);
            this.updateTransform();
            this.updateZoomIndicator();
        }

        zoomOut() {
            this.zoomLevel = Math.max(0.1, this.zoomLevel / 1.2);
            this.updateTransform();
            this.updateZoomIndicator();
        }

        resetView() {
            this.zoomLevel = 1;
            this.panX = 0;
            this.panY = 0;
            this.updateTransform();
            this.updateZoomIndicator();
        }

        openInNewTab() {
            if (!this.currentSVG) {
                alert('Aucune visualisation disponible. Générez d\'abord un arbre.');
                return;
            }

            const newWindow = window.open('', '_blank');
            if (newWindow) {
                newWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>JSON Tree Visualization</title>
                        <style>
                            body {
                                margin: 0;
                                padding: 20px;
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                background: #f8f9fa;
                            }
                            .header {
                                background: white;
                                padding: 20px;
                                border-radius: 8px;
                                margin-bottom: 20px;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                            }
                            .controls {
                                display: flex;
                                gap: 10px;
                            }
                            .btn {
                                padding: 8px 16px;
                                border: none;
                                border-radius: 4px;
                                cursor: pointer;
                                font-weight: 500;
                                transition: all 0.2s;
                            }
                            .btn-primary { background: #3b82f6; color: white; }
                            .btn-secondary { background: #6b7280; color: white; }
                            .btn:hover { transform: translateY(-1px); }
                            .svg-container {
                                background: white;
                                border-radius: 8px;
                                padding: 20px;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                                overflow: auto;
                                cursor: grab;
                                position: relative;
                                min-height: 500px;
                            }
                            .svg-container.dragging {
                                cursor: grabbing;
                            }
                            .zoom-info {
                                position: fixed;
                                bottom: 20px;
                                right: 20px;
                                background: rgba(0,0,0,0.7);
                                color: white;
                                padding: 8px 12px;
                                border-radius: 15px;
                                font-size: 12px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div>
                                <h1 style="margin: 0; font-size: 24px;">🌳 JSON Tree Visualization</h1>
                                <p style="margin: 5px 0 0 0; color: #666;">Zoom: <span id="zoom-level">100%</span></p>
                            </div>
                            <div class="controls">
                                <button class="btn btn-primary" onclick="zoomIn()">🔍 Zoom +</button>
                                <button class="btn btn-primary" onclick="zoomOut()">🔍 Zoom -</button>
                                <button class="btn btn-secondary" onclick="resetZoom()">🔄 Reset</button>
                                <button class="btn btn-secondary" onclick="downloadSVG()">💾 Download</button>
                            </div>
                        </div>
                        
                        <div id="svg-container" class="svg-container">
                            ${this.currentSVG}
                        </div>
                        
                        <div class="zoom-info">
                            🖱️ Glissez pour naviguer • 🖱️ Molette pour zoomer
                        </div>
                        
                        <script>
                            let zoomLevel = 1;
                            let panX = 0;
                            let panY = 0;
                            let isDragging = false;
                            let lastMouseX = 0;
                            let lastMouseY = 0;
                            
                            const container = document.getElementById('svg-container');
                            const svg = container.querySelector('svg');
                            
                            function updateTransform() {
                                if (svg) {
                                    svg.style.transform = \`translate(\${panX}px, \${panY}px) scale(\${zoomLevel})\`;
                                    svg.style.transformOrigin = '0 0';
                                }
                                document.getElementById('zoom-level').textContent = Math.round(zoomLevel * 100) + '%';
                            }
                            
                            function zoomIn() {
                                zoomLevel = Math.min(5, zoomLevel * 1.2);
                                updateTransform();
                            }
                            
                            function zoomOut() {
                                zoomLevel = Math.max(0.1, zoomLevel / 1.2);
                                updateTransform();
                            }
                            
                            function resetZoom() {
                                zoomLevel = 1;
                                panX = 0;
                                panY = 0;
                                updateTransform();
                            }
                            
                            function downloadSVG() {
                                const svgData = container.innerHTML;
                                const blob = new Blob([svgData], { type: 'image/svg+xml' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = 'json-tree.svg';
                                link.click();
                                URL.revokeObjectURL(url);
                            }
                            
                            // Mouse drag events
                            container.addEventListener('mousedown', (e) => {
                                if (e.button === 0) {
                                    isDragging = true;
                                    lastMouseX = e.clientX;
                                    lastMouseY = e.clientY;
                                    container.classList.add('dragging');
                                    e.preventDefault();
                                }
                            });
                            
                            document.addEventListener('mousemove', (e) => {
                                if (isDragging) {
                                    const deltaX = e.clientX - lastMouseX;
                                    const deltaY = e.clientY - lastMouseY;
                                    panX += deltaX;
                                    panY += deltaY;
                                    updateTransform();
                                    lastMouseX = e.clientX;
                                    lastMouseY = e.clientY;
                                }
                            });
                            
                            document.addEventListener('mouseup', () => {
                                isDragging = false;
                                container.classList.remove('dragging');
                            });
                            
                            // Wheel zoom
                            container.addEventListener('wheel', (e) => {
                                e.preventDefault();
                                const rect = container.getBoundingClientRect();
                                const mouseX = e.clientX - rect.left;
                                const mouseY = e.clientY - rect.top;
                                
                                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                                const newZoom = Math.max(0.1, Math.min(5, zoomLevel * zoomFactor));
                                
                                if (newZoom !== zoomLevel) {
                                    const zoomRatio = newZoom / zoomLevel;
                                    panX = mouseX - (mouseX - panX) * zoomRatio;
                                    panY = mouseY - (mouseY - panY) * zoomRatio;
                                    zoomLevel = newZoom;
                                    updateTransform();
                                }
                            });
                            
                            // Initialize
                            updateTransform();
                        </script>
                    </body>
                    </html>
                `);
                newWindow.document.close();
            }
        }

        generateFromInput() {
            const textarea = this.container.querySelector('.widget-textarea');
            if (!textarea) return;

            const jsonString = textarea.value.trim();
            if (!jsonString) {
                this.showError('Please enter some JSON data');
                return;
            }

            const validation = JSONValidator.validate(jsonString);
            if (!validation.valid) {
                this.showError(`Invalid JSON: ${validation.error}`);
                return;
            }

            this.loadJSON(validation.data);
        }

        async loadJSON(jsonData) {
            try {
                this.currentData = jsonData;
                
                // Update textarea if it exists
                const textarea = this.container.querySelector('.widget-textarea');
                if (textarea) {
                    textarea.value = JSON.stringify(jsonData, null, 2);
                }

                // Show loading state
                this.showLoading();

                // Convert to DOT
                const converter = new JSONToDotConverter(this.options);
                const dotString = converter.convert(jsonData);

                if (this.options.renderSVG) {
                    // Render SVG
                    const svgString = await this.svgRenderer.renderSVG(dotString, this.options);
                    this.currentSVG = svgString;
                    this.showSVGOutput(svgString);
                } else {
                    // Show DOT string only
                    this.showDotOutput(dotString);
                }

            } catch (error) {
                this.showError(`Conversion failed: ${error.message}`);
                console.error('Conversion error:', error);
            }
        }

        showLoading() {
            const output = this.container.querySelector('.svg-container');
            if (!output) return;

            output.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; text-align: center; color: #64748b;">
                    <div>
                        <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
                        <p style="font-size: 16px; margin: 0;">Generating visualization...</p>
                        <p style="font-size: 14px; margin: 8px 0 0 0;">Please wait while we render your tree</p>
                    </div>
                </div>
            `;
        }

        showSVGOutput(svgString) {
            const output = this.container.querySelector('.svg-container');
            if (!output) return;

            output.innerHTML = svgString;
            
            // Reset view
            this.resetView();
            
            // Ensure SVG is properly styled
            const svg = output.querySelector('svg');
            if (svg) {
                svg.style.maxWidth = 'none';
                svg.style.maxHeight = 'none';
                svg.style.transformOrigin = '0 0';
            }
        }

        showDotOutput(dotString) {
            const output = this.container.querySelector('.svg-container');
            if (!output) return;

            output.innerHTML = `
                <div style="width: 100%; height: 100%; display: flex; flex-direction: column;">
                    <div style="padding: 16px; background: white; border-bottom: 1px solid #e2e8f0;">
                        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Generated DOT Format</h3>
                        <p style="margin: 0; font-size: 12px; color: #64748b;">
                            Use with Graphviz or viz.js to render SVG visualization
                        </p>
                        <button onclick="navigator.clipboard.writeText(this.nextElementSibling.textContent)" 
                                style="margin-top: 8px; padding: 4px 8px; background: #10b981; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
                            Copy DOT
                        </button>
                    </div>
                    <div style="flex: 1; overflow: auto;">
                        <pre style="margin: 0; padding: 16px; font-family: monospace; font-size: 12px; line-height: 1.4; white-space: pre-wrap; background: #f8f9fa;">${this.escapeHtml(dotString)}</pre>
                    </div>
                </div>
            `;
        }

        showError(message) {
            const output = this.container.querySelector('.svg-container');
            if (!output) return;

            output.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; text-align: center; color: #dc2626;">
                    <div>
                        <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                        <p style="font-size: 16px; margin: 0; font-weight: 600;">Error</p>
                        <p style="font-size: 14px; margin: 8px 0 0 0;">${this.escapeHtml(message)}</p>
                    </div>
                </div>
            `;
        }

        clear() {
            const textarea = this.container.querySelector('.widget-textarea');
            if (textarea) {
                textarea.value = '';
            }

            const output = this.container.querySelector('.svg-container');
            if (output) {
                output.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; text-align: center; color: #64748b;">
                        <div>
                            <div style="font-size: 48px; margin-bottom: 16px;">🌳</div>
                            <p style="font-size: 16px; margin: 0;">No tree generated yet</p>
                            <p style="font-size: 14px; margin: 8px 0 0 0;">Enter JSON data and click Generate</p>
                        </div>
                    </div>
                `;
            }

            this.currentData = null;
            this.currentSVG = null;
            this.resetView();
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Public API methods
        exportDOT() {
            if (!this.currentData) {
                throw new Error('No data to export');
            }

            const converter = new JSONToDotConverter(this.options);
            return converter.convert(this.currentData);
        }

        exportSVG() {
            return this.currentSVG;
        }
    }

    // Public API
    const JSONTreeVisualizer = {
        convertToDot: function(jsonData, options = {}) {
            const converter = new JSONToDotConverter(options);
            return converter.convert(jsonData);
        },

        validateJSON: function(jsonString) {
            return JSONValidator.validate(jsonString);
        },

        createWidget: function(containerId, options = {}) {
            return WidgetCreator.createWidget(containerId, options);
        },

        renderSVG: async function(jsonData, options = {}) {
            const converter = new JSONToDotConverter(options);
            const dotString = converter.convert(jsonData);
            const renderer = new SVGRenderer();
            return await renderer.renderSVG(dotString, options);
        },

        version: '1.0.0'
    };

    // Export to global scope
    global.JSONTreeVisualizer = JSONTreeVisualizer;

    // Also support CommonJS and AMD if available
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = JSONTreeVisualizer;
    }
    if (typeof define === 'function' && define.amd) {
        define(function() { return JSONTreeVisualizer; });
    }

})(typeof window !== 'undefined' ? window : this);