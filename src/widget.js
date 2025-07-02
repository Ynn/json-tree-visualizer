import { JSONToDotConverter } from "./converter.js";
import { JSONValidator } from "./validator.js";
import { SVGRenderer } from "./renderer.js";

export class JSONTreeWidget {
  constructor(container, options = {}) {
    this.options = {
      showInput: options.showInput !== false,
      showControls: options.showControls !== false,
      initialJSON: options.initialJSON || null,
      renderSVG: options.renderSVG !== false,
      ...options,
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

    // Shadow DOM root
    this.shadow = container.attachShadow({ mode: "open" });
    this.shadow.appendChild(this.createStyle());
    this.shadow.appendChild(this.createHTML());
    this.setupEventListeners();
    if (this.currentData) {
      this.loadJSON(this.currentData);
    }
  }

  createStyle() {
    const style = document.createElement("style");
    style.textContent = `
            :host { display: block; height: 100%; }
            .jtv-root { display: flex; height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .jtv-sidebar { width: 300px; min-width: 40px; max-width: 80vw; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; transition: width 0.1s; }
            .jtv-resizer {
                width: 6px;
                min-width: 6px;
                max-width: 12px;
                cursor: ew-resize;
                background: linear-gradient(90deg, #e0e7ef 0%, #c7d2fe 100%);
                box-shadow: 0 0 2px 0 #3b82f633;
                position: relative;
                z-index: 20;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s, box-shadow 0.2s;
                user-select: none;
            }
            .jtv-resizer::before {
                content: '';
                display: block;
                width: 2px;
                height: 28px;
                border-radius: 1px;
                background: #a5b4fc;
                box-shadow: 0 0 1px #3b82f6, 0 0 4px #60a5fa22;
                margin: 0 auto;
            }
            .jtv-resizer:hover, .jtv-resizer.active {
                background: linear-gradient(90deg, #a5b4fc 0%, #3b82f6 100%);
                box-shadow: 0 0 8px 1px #3b82f6aa;
            }
            .jtv-resizer.active::before {
                background: #dbeafe;
            }
            .jtv-sidebar-header { padding: 16px; border-bottom: 1px solid #e2e8f0; }
            .jtv-sidebar-controls { padding: 12px; border-bottom: 1px solid #e2e8f0; }
            .jtv-textarea { width: 100%; height: 100%; resize: none; border: 1px solid #d1d5db; border-radius: 4px; padding: 8px; font-family: monospace; font-size: 12px; }
            .jtv-btn { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500; margin-right: 8px; margin-bottom: 8px; transition: all 0.2s; }
            .jtv-btn:hover { transform: translateY(-1px); }
            .jtv-btn-primary { background: #3b82f6; color: white; }
            .jtv-btn-secondary { background: #6b7280; color: white; }
            .jtv-main { flex: 1; background: #f8f9fa; position: relative; overflow: hidden; }
            .jtv-nav { position: absolute; top: 10px; right: 10px; z-index: 100; display: flex; gap: 5px; }
            .jtv-nav-inner { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: flex; overflow: hidden; }
            .jtv-nav-btn { padding: 8px 12px; border: none; background: white; cursor: pointer; font-size: 14px; transition: background-color 0.2s; border-right: 1px solid #e5e7eb; }
            .jtv-nav-btn:last-child { border-right: none; }
            .jtv-nav-btn:hover { background: #f3f4f6; }
            .jtv-zoom-indicator { position: absolute; bottom: 10px; right: 10px; z-index: 100; background: white; padding: 5px 10px; border-radius: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); font-size: 12px; color: #666; }
            .jtv-instructions { position: absolute; bottom: 10px; left: 10px; z-index: 100; background: rgba(0,0,0,0.7); color: white; padding: 8px 12px; border-radius: 15px; font-size: 11px; }
            .jtv-output { width: 100%; height: 100%; overflow: hidden; cursor: grab; position: relative; }
            .jtv-output.dragging { cursor: grabbing !important; }
            .jtv-svg-container { width: 100%; height: 100%; transform-origin: 0 0; transition: transform 0.1s ease-out; }
            .jtv-svg-container svg { max-width: none !important; max-height: none !important; }
        `;
    return style;
  }

  createHTML() {
    const root = document.createElement("div");
    root.className = "jtv-root";
    let sidebar = null;
    let resizer = null;
    if (this.options.showInput) {
      sidebar = document.createElement("div");
      sidebar.className = "jtv-sidebar";
      // Header
      const header = document.createElement("div");
      header.className = "jtv-sidebar-header";
      header.innerHTML = `<h3 style="margin:0 0 8px 0;font-size:16px;font-weight:600;">JSON Input</h3><p style="margin:0;font-size:12px;color:#64748b;">Enter your JSON data</p>`;
      sidebar.appendChild(header);
      // Controls
      if (this.options.showControls) {
        const controls = document.createElement("div");
        controls.className = "jtv-sidebar-controls";
        controls.innerHTML = `
                    <button class="jtv-btn jtv-btn-primary" data-action="generate">🚀 Generate Tree</button>
                    <button class="jtv-btn jtv-btn-secondary" data-action="clear">🧹 Clear</button>
                `;
        sidebar.appendChild(controls);
      }
      // Textarea
      const textareaWrap = document.createElement("div");
      textareaWrap.style.flex = "1";
      textareaWrap.style.padding = "0";
      textareaWrap.style.display = "flex";
      textareaWrap.style.flexDirection = "column";
      textareaWrap.style.justifyContent = "stretch";
      textareaWrap.style.alignItems = "stretch";
      const textarea = document.createElement("textarea");
      textarea.className = "jtv-textarea";
      textarea.placeholder = "Paste your JSON here...";
      textarea.style.borderRadius = "0";
      textarea.style.borderLeft = "none";
      textarea.style.borderRight = "none";
      textarea.style.margin = "0";
      textarea.style.height = "100%";
      textarea.style.width = "100%";
      textareaWrap.appendChild(textarea);
      sidebar.appendChild(textareaWrap);
      root.appendChild(sidebar);
      // Resizer
      resizer = document.createElement("div");
      resizer.className = "jtv-resizer";
      root.appendChild(resizer);
    }
    // Main
    const main = document.createElement("div");
    main.className = "jtv-main";
    // Navigation
    const nav = document.createElement("div");
    nav.className = "jtv-nav";
    nav.innerHTML = `
            <div class="jtv-nav-inner">
                <button class="jtv-nav-btn" data-action="zoom-in" title="Zoom In">🔍+</button>
                <button class="jtv-nav-btn" data-action="zoom-out" title="Zoom Out">🔍-</button>
                <button class="jtv-nav-btn" data-action="reset-view" title="Reset View">🔄</button>
                <button class="jtv-nav-btn" data-action="new-tab" title="Open in New Tab">🔗</button>
            </div>
        `;
    main.appendChild(nav);
    // Zoom indicator
    const zoomIndicator = document.createElement("div");
    zoomIndicator.className = "jtv-zoom-indicator";
    zoomIndicator.innerHTML = `<span class="zoom-level">100%</span>`;
    main.appendChild(zoomIndicator);
    // Instructions
    const instructions = document.createElement("div");
    instructions.className = "jtv-instructions";
    instructions.textContent = "🖱️ Drag to pan • 🖱️ Scroll to zoom";
    main.appendChild(instructions);
    // Output
    const output = document.createElement("div");
    output.className = "jtv-output";
    const svgContainer = document.createElement("div");
    svgContainer.className = "jtv-svg-container";
    svgContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; text-align: center; color: #64748b;">
                <div>
                    <div style="font-size: 48px; margin-bottom: 16px;">🌳</div>
                    <p style="font-size: 16px; margin: 0;">No tree generated yet</p>
                    <p style="font-size: 14px; margin: 8px 0 0 0;">Enter JSON data and click Generate</p>
                </div>
            </div>
        `;
    output.appendChild(svgContainer);
    main.appendChild(output);
    root.appendChild(main);
    return root;
  }

  setupEventListeners() {
    // Button event listeners
    const buttons = this.shadow.querySelectorAll(".jtv-btn, .jtv-nav-btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const action = e.target.getAttribute("data-action");
        this.handleAction(action);
      });
    });
    // Textarea setup
    const textarea = this.shadow.querySelector(".jtv-textarea");
    if (textarea && this.currentData) {
      textarea.value = JSON.stringify(this.currentData, null, 2);
    }
    if (textarea) {
      textarea.addEventListener("keydown", (e) => {
        if (e.key === "Tab") {
          e.preventDefault();
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const tab = "    ";
          textarea.value =
            textarea.value.substring(0, start) +
            tab +
            textarea.value.substring(end);
          textarea.selectionStart = textarea.selectionEnd = start + tab.length;
        }
      });
    }
    // SVG navigation setup
    this.setupSVGNavigation();
    // Resizer events
    const resizer = this.shadow.querySelector(".jtv-resizer");
    const sidebar = this.shadow.querySelector(".jtv-sidebar");
    if (resizer && sidebar) {
      let isResizing = false;
      let startX = 0;
      let startWidth = 0;
      // Pour garder le resizer toujours visible même sidebar réduite
      const ensureResizerVisible = () => {
        resizer.style.pointerEvents = "auto";
        resizer.style.zIndex = "20";
      };
      resizer.addEventListener("mousedown", (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;
        resizer.classList.add("active");
        document.body.style.cursor = "ew-resize";
        ensureResizerVisible();
        e.preventDefault();
      });
      document.addEventListener("mousemove", (e) => {
        if (!isResizing) return;
        let newWidth = startWidth + (e.clientX - startX);
        newWidth = Math.max(40, Math.min(window.innerWidth * 0.8, newWidth));
        sidebar.style.width = newWidth + "px";
        // Feedback visuel : effet d’ombre
        resizer.style.boxShadow = "0 0 24px 4px #3b82f6cc";
      });
      document.addEventListener("mouseup", () => {
        if (isResizing) {
          isResizing = false;
          resizer.classList.remove("active");
          document.body.style.cursor = "";
          resizer.style.boxShadow = "";
          ensureResizerVisible();
        }
      });
      // Double-clic pour réduire/agrandir
      resizer.addEventListener("dblclick", () => {
        if (sidebar.offsetWidth > 60) {
          sidebar.style.width = "40px";
        } else {
          sidebar.style.width = "300px";
        }
        ensureResizerVisible();
      });
      // Toujours visible même sidebar réduite
      ensureResizerVisible();
    }
  }

  setupSVGNavigation() {
    const output = this.shadow.querySelector(".jtv-output");
    const svgContainer = this.shadow.querySelector(".jtv-svg-container");
    if (!output || !svgContainer) return;
    // Mouse events for drag and drop
    output.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        output.classList.add("dragging");
        e.preventDefault();
      }
    });
    document.addEventListener("mousemove", (e) => {
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
    document.addEventListener("mouseup", () => {
      if (this.isDragging) {
        this.isDragging = false;
        output.classList.remove("dragging");
      }
    });
    // Wheel event for zoom
    output.addEventListener("wheel", (e) => {
      e.preventDefault();
      const rect = output.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5, this.zoomLevel * zoomFactor));
      if (newZoom !== this.zoomLevel) {
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
    output.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        lastTouchDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2),
        );
      }
      e.preventDefault();
    });
    output.addEventListener("touchmove", (e) => {
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
            Math.pow(touch2.clientY - touch1.clientY, 2),
        );
        if (lastTouchDistance > 0) {
          const zoomFactor = currentDistance / lastTouchDistance;
          const newZoom = Math.max(
            0.1,
            Math.min(5, this.zoomLevel * zoomFactor),
          );
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
    output.addEventListener("touchend", () => {
      this.isDragging = false;
      lastTouchDistance = 0;
    });
  }

  updateTransform() {
    const svgContainer = this.shadow.querySelector(".jtv-svg-container");
    if (svgContainer) {
      svgContainer.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
    }
  }

  updateZoomIndicator() {
    const indicator = this.shadow.querySelector(".zoom-level");
    if (indicator) {
      indicator.textContent = `${Math.round(this.zoomLevel * 100)}%`;
    }
  }

  handleAction(action) {
    switch (action) {
      case "generate":
        this.generateFromInput();
        break;
      case "clear":
        this.clear();
        break;
      case "zoom-in":
        this.zoomIn();
        break;
      case "zoom-out":
        this.zoomOut();
        break;
      case "reset-view":
        this.resetView();
        break;
      case "new-tab":
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
      alert("Aucune visualisation disponible. Générez d'abord un arbre.");
      return;
    }
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>JSON Tree Visualization</title>
                    <style>
                        body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; }
                        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; }
                        .controls { display: flex; gap: 10px; }
                        .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; transition: all 0.2s; }
                        .btn-primary { background: #3b82f6; color: white; }
                        .btn-secondary { background: #6b7280; color: white; }
                        .btn:hover { transform: translateY(-1px); }
                        .svg-container { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: auto; cursor: grab; position: relative; min-height: 500px; }
                        .svg-container.dragging { cursor: grabbing; }
                        .zoom-info { position: fixed; bottom: 20px; right: 20px; background: rgba(0,0,0,0.7); color: white; padding: 8px 12px; border-radius: 15px; font-size: 12px; }
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
                    <div class="zoom-info">🖱️ Glissez pour naviguer • 🖱️ Molette pour zoomer</div>
                    <script>
                        let zoomLevel = 1, panX = 0, panY = 0, isDragging = false, lastMouseX = 0, lastMouseY = 0;
                        const container = document.getElementById('svg-container');
                        const svg = container.querySelector('svg');
                        function updateTransform() {
                            if (svg) {
                                svg.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + zoomLevel + ')';
                                svg.style.transformOrigin = '0 0';
                            }
                            document.getElementById('zoom-level').textContent = Math.round(zoomLevel * 100) + '%';
                        }
                        function zoomIn() { zoomLevel = Math.min(5, zoomLevel * 1.2); updateTransform(); }
                        function zoomOut() { zoomLevel = Math.max(0.1, zoomLevel / 1.2); updateTransform(); }
                        function resetZoom() { zoomLevel = 1; panX = 0; panY = 0; updateTransform(); }
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
                        container.addEventListener('mousedown', (e) => { if (e.button === 0) { isDragging = true; lastMouseX = e.clientX; lastMouseY = e.clientY; container.classList.add('dragging'); e.preventDefault(); } });
                        document.addEventListener('mousemove', (e) => { if (isDragging) { const deltaX = e.clientX - lastMouseX; const deltaY = e.clientY - lastMouseY; panX += deltaX; panY += deltaY; updateTransform(); lastMouseX = e.clientX; lastMouseY = e.clientY; } });
                        document.addEventListener('mouseup', () => { isDragging = false; container.classList.remove('dragging'); });
                        container.addEventListener('wheel', (e) => { e.preventDefault(); const rect = container.getBoundingClientRect(); const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top; const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1; const newZoom = Math.max(0.1, Math.min(5, zoomLevel * zoomFactor)); if (newZoom !== zoomLevel) { const zoomRatio = newZoom / zoomLevel; panX = mouseX - (mouseX - panX) * zoomRatio; panY = mouseY - (mouseY - panY) * zoomRatio; zoomLevel = newZoom; updateTransform(); } });
                        updateTransform();
                    </script>
                </body>
                </html>
            `);
      newWindow.document.close();
    }
  }

  generateFromInput() {
    const textarea = this.shadow.querySelector(".jtv-textarea");
    if (!textarea) return;
    const jsonString = textarea.value.trim();
    if (!jsonString) {
      this.showError("Please enter some JSON data");
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
      const textarea = this.shadow.querySelector(".jtv-textarea");
      if (textarea) {
        textarea.value = JSON.stringify(jsonData, null, 2);
      }
      this.showLoading();
      const converter = new JSONToDotConverter(this.options);
      const dotString = converter.convert(jsonData);
      if (this.options.renderSVG) {
        const svgString = await this.svgRenderer.renderSVG(
          dotString,
          this.options,
        );
        this.currentSVG = svgString;
        this.showSVGOutput(svgString);
      } else {
        this.showDotOutput(dotString);
      }
    } catch (error) {
      this.showError(`Conversion failed: ${error.message}`);
      console.error("Conversion error:", error);
    }
  }

  showLoading() {
    const output = this.shadow.querySelector(".jtv-svg-container");
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
    const output = this.shadow.querySelector(".jtv-svg-container");
    if (!output) return;
    output.innerHTML = svgString;
    this.resetView();
    const svg = output.querySelector("svg");
    if (svg) {
      svg.style.maxWidth = "none";
      svg.style.maxHeight = "none";
      svg.style.transformOrigin = "0 0";
    }
  }

  showDotOutput(dotString) {
    const output = this.shadow.querySelector(".jtv-svg-container");
    if (!output) return;
    // Clear previous content
    output.innerHTML = "";
    // Container
    const container = document.createElement("div");
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    // Header
    const header = document.createElement("div");
    header.style.padding = "16px";
    header.style.background = "white";
    header.style.borderBottom = "1px solid #e2e8f0";
    header.innerHTML = `<h3 style="margin:0 0 8px 0;font-size:16px;font-weight:600;">Generated DOT Format</h3><p style="margin:0;font-size:12px;color:#64748b;">Use with Graphviz or viz.js to render SVG visualization</p>`;
    // Copy button
    const copyBtn = document.createElement("button");
    copyBtn.className = "jtv-btn";
    copyBtn.style.marginTop = "8px";
    copyBtn.style.background = "#10b981";
    copyBtn.style.color = "white";
    copyBtn.textContent = "Copy DOT";
    copyBtn.onclick = () => navigator.clipboard.writeText(dotString);
    header.appendChild(copyBtn);
    container.appendChild(header);
    // Pre
    const preWrap = document.createElement("div");
    preWrap.style.flex = "1";
    preWrap.style.overflow = "auto";
    const pre = document.createElement("pre");
    pre.style.margin = "0";
    pre.style.padding = "16px";
    pre.style.fontFamily = "monospace";
    pre.style.fontSize = "12px";
    pre.style.lineHeight = "1.4";
    pre.style.whiteSpace = "pre-wrap";
    pre.style.background = "#f8f9fa";
    pre.textContent = dotString;
    preWrap.appendChild(pre);
    container.appendChild(preWrap);
    output.appendChild(container);
  }

  showError(message) {
    const output = this.shadow.querySelector(".jtv-svg-container");
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
    const textarea = this.shadow.querySelector(".jtv-textarea");
    if (textarea) textarea.value = "";
    const output = this.shadow.querySelector(".jtv-svg-container");
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
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  exportDOT() {
    if (!this.currentData) throw new Error("No data to export");
    const converter = new JSONToDotConverter(this.options);
    return converter.convert(this.currentData);
  }

  exportSVG() {
    return this.currentSVG;
  }
}
