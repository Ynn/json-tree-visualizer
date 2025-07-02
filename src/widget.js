import { JSONToDotConverter } from './converter.js';
import { JSONValidator } from './validator.js';
import { SVGRenderer } from './renderer.js';

export class JSONTreeWidget {
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
                        🖱️ Drag to pan • 🖱️ Scroll to zoom
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
                                svg.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + zoomLevel + ')';
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