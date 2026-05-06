// ========================================
// LASER ENGRAVING APP
// ========================================

(function () {
    'use strict';

    const STORAGE_KEY = 'laserEngraving_bedSize';

    const views = {
        welcome: document.getElementById('onboarding-welcome'),
        size: document.getElementById('onboarding-size'),
        main: document.getElementById('app-main')
    };

    const inputs = {
        x: document.getElementById('bed-x'),
        y: document.getElementById('bed-y')
    };

    const errorMsg = document.getElementById('size-error');

    let cadApp = null;

    function init() {
        const saved = loadBedSize();
        if (saved) {
            showMain(saved);
        } else {
            showView('welcome');
        }
        bindEvents();
    }

    function bindEvents() {
        document.getElementById('btn-start').addEventListener('click', () => {
            showView('size');
            setTimeout(() => inputs.x.focus(), 100);
        });

        document.getElementById('btn-save-size').addEventListener('click', handleSaveSize);

        [inputs.x, inputs.y].forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleSaveSize();
            });
        });

        document.getElementById('btn-reset').addEventListener('click', () => {
            if (confirm('Reset bed size and restart onboarding?')) {
                localStorage.removeItem(STORAGE_KEY);
                if (cadApp) { cadApp.destroy(); cadApp = null; }
                inputs.x.value = '';
                inputs.y.value = '';
                errorMsg.classList.add('hidden');
                showView('welcome');
            }
        });
    }

    function handleSaveSize() {
        const x = parseFloat(inputs.x.value);
        const y = parseFloat(inputs.y.value);

        if (!isFinite(x) || !isFinite(y) || x <= 0 || y <= 0) {
            errorMsg.classList.remove('hidden');
            return;
        }

        errorMsg.classList.add('hidden');
        const size = { x, y };
        saveBedSize(size);
        showMain(size);
    }

    function showMain(size) {
        showView('main');
        if (!cadApp) {
            cadApp = new CADApp(size);
        } else {
            cadApp.setBedSize(size);
        }
    }

    function showView(name) {
        Object.values(views).forEach(el => el.classList.add('hidden'));
        views[name].classList.remove('hidden');
    }

    function saveBedSize(size) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(size)); } catch (_e) {}
    }

    function loadBedSize() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed;
        } catch (_e) {}
        return null;
    }

    // ========================================
    // CAD ENGINE
    // ========================================

    class CADApp {
        constructor(bedSize) {
            this.bed = { x: bedSize.x, y: bedSize.y };
            this.scale = 2;
            this.offset = { x: 60, y: 60 };
            this.tool = 'select';
            this.mode = 'cut'; // 'cut' | 'engrave'
            this.objects = [];
            this.selectedId = null;
            this.nextId = 1;

            this.isDragging = false;
            this.dragType = null;
            this.dragStart = { sx: 0, sy: 0, wx: 0, wy: 0 };
            this.dragObject = null;
            this.dragObjectStart = null;
            this.resizeHandle = null;
            this.tempObject = null;
            this.drawShapeType = null;

            this.keys = { space: false };
            this.listeners = [];
            this.presets = this.loadPresets();
            this.undoStack = [];
            this.redoStack = [];
            this.snapSize = 1;
            this.guides = [];
            this.isPolylineDrawing = false;
            this.polylinePoints = [];

            this.cacheDOM();
            this.initEvents();
            this.renderPresets();
            this.fitToView();
            this.render();
        }

        destroy() {
            this.listeners.forEach(({ el, type, fn }) => el.removeEventListener(type, fn));
            this.listeners = [];
        }

        cacheDOM() {
            this.dom = {
                svg: document.getElementById('cad-svg'),
                viewport: document.getElementById('viewport'),
                bedRect: document.getElementById('bed-rect'),
                grid10: document.getElementById('grid-10'),
                grid50: document.getElementById('grid-50'),
                objectsLayer: document.getElementById('objects-layer'),
                selectionLayer: document.getElementById('selection-layer'),
                canvasArea: document.getElementById('canvas-area'),
                panelBody: document.getElementById('panel-body'),
                layersList: document.getElementById('layers-list'),
                statusPos: document.getElementById('status-pos'),
                statusZoom: document.getElementById('status-zoom'),
                statusBed: document.getElementById('status-bed'),
                toolBtns: document.querySelectorAll('.tool-btn[data-tool]'),
                imageInput: document.getElementById('image-input'),
                presetList: document.getElementById('preset-list'),
                presetAdd: document.getElementById('preset-add'),
                presetDropdown: document.getElementById('preset-dropdown'),
                presetRemove: document.getElementById('preset-remove'),
                presetDialog: document.getElementById('preset-dialog'),
                presetDialogName: document.getElementById('preset-dialog-name'),
                presetDialogPower: document.getElementById('preset-dialog-power'),
                presetDialogSpeed: document.getElementById('preset-dialog-speed'),
                presetSave: document.getElementById('preset-save'),
                presetCancel: document.getElementById('preset-cancel')
            };
            this.dom.bedRect.setAttribute('width', this.bed.x);
            this.dom.bedRect.setAttribute('height', this.bed.y);
            const inset = 1;
            const gw = Math.max(0, this.bed.x - inset * 2);
            const gh = Math.max(0, this.bed.y - inset * 2);
            this.dom.grid10.setAttribute('x', inset);
            this.dom.grid10.setAttribute('y', inset);
            this.dom.grid10.setAttribute('width', gw);
            this.dom.grid10.setAttribute('height', gh);
            this.dom.grid50.setAttribute('x', inset);
            this.dom.grid50.setAttribute('y', inset);
            this.dom.grid50.setAttribute('width', gw);
            this.dom.grid50.setAttribute('height', gh);
        }

        setBedSize(size) {
            this.bed = { x: size.x, y: size.y };
            this.dom.bedRect.setAttribute('width', this.bed.x);
            this.dom.bedRect.setAttribute('height', this.bed.y);
            const inset = 1;
            const gw = Math.max(0, this.bed.x - inset * 2);
            const gh = Math.max(0, this.bed.y - inset * 2);
            this.dom.grid10.setAttribute('x', inset);
            this.dom.grid10.setAttribute('y', inset);
            this.dom.grid10.setAttribute('width', gw);
            this.dom.grid10.setAttribute('height', gh);
            this.dom.grid50.setAttribute('x', inset);
            this.dom.grid50.setAttribute('y', inset);
            this.dom.grid50.setAttribute('width', gw);
            this.dom.grid50.setAttribute('height', gh);
            this.fitToView();
            this.render();
        }

        on(el, type, fn, opts) {
            el.addEventListener(type, fn, opts);
            this.listeners.push({ el, type, fn });
        }

        initEvents() {
            // Tool buttons
            this.dom.toolBtns.forEach(btn => {
                this.on(btn, 'click', () => this.setTool(btn.dataset.tool));
            });

            this.on(document.getElementById('tool-zoom-in'), 'click', () => {
                const rect = this.dom.canvasArea.getBoundingClientRect();
                this.zoomAt(rect.width / 2, rect.height / 2, 1.25);
            });
            this.on(document.getElementById('tool-zoom-out'), 'click', () => {
                const rect = this.dom.canvasArea.getBoundingClientRect();
                this.zoomAt(rect.width / 2, rect.height / 2, 0.8);
            });
            this.on(document.getElementById('tool-fit'), 'click', () => {
                this.fitToView();
            });
            this.on(document.getElementById('tool-export'), 'click', () => {
                this.exportGC();
            });
            this.on(document.getElementById('tool-undo'), 'click', () => {
                this.undo();
            });
            this.on(document.getElementById('tool-redo'), 'click', () => {
                this.redo();
            });

            // Upload image
            this.on(document.getElementById('tool-upload'), 'click', () => {
                this.dom.imageInput.click();
            });
            this.on(this.dom.imageInput, 'change', (e) => this.handleImageUpload(e));

            // Canvas mouse
            this.on(this.dom.canvasArea, 'mousedown', (e) => this.onMouseDown(e));
            this.on(window, 'mousemove', (e) => this.onMouseMove(e));
            this.on(window, 'mouseup', (e) => this.onMouseUp(e));
            this.on(this.dom.canvasArea, 'wheel', (e) => this.onWheel(e), { passive: false });
            this.on(this.dom.canvasArea, 'contextmenu', (e) => e.preventDefault());

            // Keyboard
            this.on(window, 'keydown', (e) => this.onKeyDown(e));
            this.on(window, 'keyup', (e) => this.onKeyUp(e));

            // Properties panel (delegated)
            this.on(this.dom.panelBody, 'input', (e) => this.onPropInput(e));
            this.on(this.dom.panelBody, 'click', (e) => this.onPropChange(e));

            // Layers panel (delegated)
            this.on(this.dom.layersList, 'click', (e) => this.onLayerClick(e));
            this.on(this.dom.layersList, 'dblclick', (e) => this.onLayerDblClick(e));

            // Mode toggle
            document.querySelectorAll('.mode-btn').forEach(btn => {
                this.on(btn, 'click', () => {
                    this.mode = btn.dataset.mode;
                    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === this.mode));
                    this.renderPresets();
                });
            });

            // Presets
            if (this.dom.presetAdd) {
                this.on(this.dom.presetAdd, 'click', () => this.showPresetDialog());
            }
            if (this.dom.presetSave) {
                this.on(this.dom.presetSave, 'click', () => this.savePresetFromDialog());
            }
            if (this.dom.presetCancel) {
                this.on(this.dom.presetCancel, 'click', () => this.cancelPresetDialog());
            }
            if (this.dom.presetRemove) {
                this.on(this.dom.presetRemove, 'click', () => this.removeSelectedPreset());
            }
            if (this.dom.presetDropdown) {
                this.on(this.dom.presetDropdown, 'change', (e) => this.applyPreset(e.target.value));
            }
        }

        setTool(name) {
            if (this.isPolylineDrawing && name !== 'polyline') {
                this.cancelPolyline();
            }
            this.tool = name;
            this.dom.toolBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tool === name);
            });
            this.dom.canvasArea.className = 'canvas-area' + (name !== 'select' ? ' tool-' + name : '');
        }

        screenToWorld(sx, sy) {
            const rect = this.dom.canvasArea.getBoundingClientRect();
            const x = sx - rect.left;
            const y = sy - rect.top;
            return {
                x: (x - this.offset.x) / this.scale,
                y: (y - this.offset.y) / this.scale
            };
        }

        worldToScreen(wx, wy) {
            return {
                x: wx * this.scale + this.offset.x,
                y: wy * this.scale + this.offset.y
            };
        }

        zoomAt(sx, sy, factor) {
            const rect = this.dom.canvasArea.getBoundingClientRect();
            const cx = sx - rect.left;
            const cy = sy - rect.top;
            const world = this.screenToWorld(sx, sy);
            this.scale = Math.max(0.1, Math.min(50, this.scale * factor));
            const newScreen = this.worldToScreen(world.x, world.y);
            this.offset.x += cx - newScreen.x;
            this.offset.y += cy - newScreen.y;
            this.renderTransform();
            this.updateStatus();
        }

        fitToView() {
            const rect = this.dom.canvasArea.getBoundingClientRect();
            const pad = 60;
            const availW = rect.width - pad * 2;
            const availH = rect.height - pad * 2;
            this.scale = Math.min(availW / this.bed.x, availH / this.bed.y, 10);
            this.scale = Math.max(0.1, this.scale);
            const bedW = this.bed.x * this.scale;
            const bedH = this.bed.y * this.scale;
            this.offset.x = (rect.width - bedW) / 2;
            this.offset.y = (rect.height - bedH) / 2;
            this.renderTransform();
            this.updateStatus();
        }

        // ---------- IMAGE UPLOAD ----------

        handleImageUpload(e) {
            const file = e.target.files[0];
            if (!file || !file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const maxDim = 800;
                    let dw = img.naturalWidth;
                    let dh = img.naturalHeight;
                    if (dw > maxDim || dh > maxDim) {
                        const ratio = Math.min(maxDim / dw, maxDim / dh);
                        dw = Math.round(dw * ratio);
                        dh = Math.round(dh * ratio);
                    }
                    canvas.width = dw;
                    canvas.height = dh;
                    ctx.drawImage(img, 0, 0, dw, dh);
                    const imageData = ctx.getImageData(0, 0, dw, dh);
                    ditherImageData(imageData);
                    ctx.putImageData(imageData, 0, 0);
                    const ditheredHref = canvas.toDataURL('image/png');

                    const aspect = img.naturalWidth / img.naturalHeight;
                    const cx = this.bed.x / 2;
                    const cy = this.bed.y / 2;
                    let w = 100;
                    let h = w / aspect;
                    if (h > 100) {
                        h = 100;
                        w = h * aspect;
                    }
                    this.addObject({
                        type: 'image',
                        x: cx - w / 2,
                        y: cy - h / 2,
                        width: w,
                        height: h,
                        href: ditheredHref,
                        mode: 'engrave',
                        pxWidth: dw,
                        pxHeight: dh
                    });
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
            this.dom.imageInput.value = '';
        }

        // ---------- MOUSE EVENTS ----------

        onMouseDown(e) {
            if (e.button === 1 || (e.button === 0 && this.keys.space)) {
                this.startPan(e.clientX, e.clientY);
                e.preventDefault();
                return;
            }
            if (e.button !== 0) return;

            const w = this.screenToWorld(e.clientX, e.clientY);

            if (this.tool === 'select') {
                const handle = this.hitHandle(w.x, w.y);
                if (handle) {
                    this.startResize(handle, w.x, w.y);
                    e.preventDefault();
                    return;
                }
                const obj = this.hitObject(w.x, w.y);
                if (obj) {
                    this.selectObject(obj.id);
                    this.startMove(obj, w.x, w.y);
                    e.preventDefault();
                    return;
                }
                this.selectObject(null);
                this.startPan(e.clientX, e.clientY);
                e.preventDefault();
                return;
            }

            if (this.tool === 'rectangle' || this.tool === 'circle') {
                const handle = this.hitHandle(w.x, w.y);
                if (handle) {
                    this.startResize(handle, w.x, w.y);
                    e.preventDefault();
                    return;
                }
                this.startDraw(w.x, w.y);
                e.preventDefault();
            }

            if (this.tool === 'text') {
                const text = prompt('Enter text:');
                if (text && text.trim()) {
                    this.addObject({
                        type: 'text',
                        x: w.x,
                        y: w.y,
                        text: text.trim(),
                        fontSize: 10,
                        width: 0,
                        height: 0,
                        mode: this.mode
                    });
                }
                this.setTool('select');
                e.preventDefault();
            }

            if (this.tool === 'polyline') {
                e.preventDefault();
                if (!this.isPolylineDrawing) {
                    this.isPolylineDrawing = true;
                    this.polylinePoints = [{ x: w.x, y: w.y }];
                    this.renderPolylinePreview();
                } else {
                    const first = this.polylinePoints[0];
                    const dist = Math.hypot(w.x - first.x, w.y - first.y);
                    if (dist < 5 && this.polylinePoints.length > 2) {
                        this.polylinePoints.push({ x: first.x, y: first.y });
                        this.finishPolyline();
                    } else {
                        this.polylinePoints.push({ x: w.x, y: w.y });
                        this.renderPolylinePreview();
                    }
                }
            }
        }

        onMouseMove(e) {
            const w = this.screenToWorld(e.clientX, e.clientY);
            this.updateMousePos(w.x, w.y);

            if (!this.isDragging) {
                if (this.tool === 'select') {
                    const handle = this.hitHandle(w.x, w.y);
                    const obj = this.hitObject(w.x, w.y);
                    if (handle) {
                        this.dom.canvasArea.style.cursor = this.handleCursor(handle.handle);
                    } else if (obj) {
                        this.dom.canvasArea.style.cursor = 'move';
                    } else {
                        this.dom.canvasArea.style.cursor = this.keys.space ? 'grab' : 'default';
                    }
                }
                return;
            }

            if (this.dragType === 'pan') {
                this.offset.x = this.dragStart.ox + (e.clientX - this.dragStart.sx);
                this.offset.y = this.dragStart.oy + (e.clientY - this.dragStart.sy);
                this.renderTransform();
                return;
            }

            if (this.dragType === 'move' && this.dragObject) {
                const dx = w.x - this.dragStart.wx;
                const dy = w.y - this.dragStart.wy;
                let nx = this.dragObjectStart.x + dx;
                let ny = this.dragObjectStart.y + dy;
                if (e.shiftKey) {
                    nx = Math.round(nx / this.snapSize) * this.snapSize;
                    ny = Math.round(ny / this.snapSize) * this.snapSize;
                }
                this.dragObject.x = nx;
                this.dragObject.y = ny;
                this.renderObjects();
                this.renderSelection();
                this.updatePropInputs();
                this.renderGuides(this.dragObject);
                return;
            }

            if (this.dragType === 'resize' && this.dragObject) {
                this.applyResize(w.x, w.y, e.ctrlKey);
                this.renderObjects();
                this.renderSelection();
                this.updatePropInputs();
                return;
            }

            if (this.dragType === 'draw') {
                const x0 = this.dragStart.wx;
                const y0 = this.dragStart.wy;
                let dx = w.x - x0;
                let dy = w.y - y0;

                if (e.ctrlKey) {
                    const size = Math.max(Math.abs(dx), Math.abs(dy));
                    dx = Math.sign(dx || 1) * size;
                    dy = Math.sign(dy || 1) * size;
                }

                let width = Math.abs(dx);
                let height = Math.abs(dy);
                let x, y;

                if (e.shiftKey) {
                    width *= 2;
                    height *= 2;
                    x = x0 - width / 2;
                    y = y0 - height / 2;
                } else {
                    x = dx >= 0 ? x0 : x0 + dx;
                    y = dy >= 0 ? y0 : y0 + dy;
                }

                this.tempObject = {
                    id: -1,
                    type: this.drawShapeType,
                    x,
                    y,
                    width,
                    height,
                    fill: 'rgba(255,255,255,0.15)',
                    stroke: '#ffffff',
                    strokeWidth: 1,
                    mode: this.mode
                };
                this.renderTempObject();
            }
        }

        onMouseUp(e) {
            if (!this.isDragging) return;

            if (this.dragType === 'draw' && this.tempObject) {
                const t = this.tempObject;
                if (t.width > 0.5 && t.height > 0.5) {
                    this.addObject({
                        type: t.type,
                        x: t.x,
                        y: t.y,
                        width: t.width,
                        height: t.height,
                        fill: 'rgba(255,255,255,0.15)',
                        stroke: '#ffffff',
                        strokeWidth: 1,
                        mode: t.mode
                    }, true);
                }
                this.tempObject = null;
                this.renderTempObject();
            }

            if (this.dragType === 'move' && this.dragObject) {
                const obj = this.dragObject;
                const start = this.dragObjectStart;
                if (obj.x !== start.x || obj.y !== start.y) {
                    this.pushUndo({
                        type: 'move',
                        objId: obj.id,
                        oldX: start.x,
                        oldY: start.y,
                        newX: obj.x,
                        newY: obj.y
                    });
                }
            }

            if (this.dragType === 'resize' && this.dragObject) {
                const obj = this.dragObject;
                const start = this.dragObjectStart;
                if (obj.x !== start.x || obj.y !== start.y || obj.width !== start.w || obj.height !== start.h) {
                    this.pushUndo({
                        type: 'resize',
                        objId: obj.id,
                        oldX: start.x,
                        oldY: start.y,
                        oldW: start.w,
                        oldH: start.h,
                        newX: obj.x,
                        newY: obj.y,
                        newW: obj.width,
                        newH: obj.height
                    });
                }
            }

            this.isDragging = false;
            this.dragType = null;
            this.dragObject = null;
            this.dragObjectStart = null;
            this.resizeHandle = null;
            this.drawShapeType = null;
            this.dom.canvasArea.classList.remove('is-panning');
            this.clearGuides();
        }

        onWheel(e) {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.15 : 0.87;
            this.zoomAt(e.clientX, e.clientY, factor);
        }

        // ---------- DRAG STARTERS ----------

        startPan(sx, sy) {
            this.isDragging = true;
            this.dragType = 'pan';
            this.dragStart = { sx, sy, ox: this.offset.x, oy: this.offset.y };
            this.dom.canvasArea.classList.add('is-panning');
        }

        startMove(obj, wx, wy) {
            this.isDragging = true;
            this.dragType = 'move';
            this.dragObject = obj;
            this.dragObjectStart = { x: obj.x, y: obj.y };
            this.dragStart = { wx, wy };
        }

        startResize(handleInfo, wx, wy) {
            this.isDragging = true;
            this.dragType = 'resize';
            this.dragObject = handleInfo.obj;
            this.dragObjectStart = { x: handleInfo.obj.x, y: handleInfo.obj.y, w: handleInfo.obj.width, h: handleInfo.obj.height };
            this.resizeHandle = handleInfo.handle;
            this.dragStart = { wx, wy };
        }

        startDraw(wx, wy) {
            this.isDragging = true;
            this.dragType = 'draw';
            this.dragStart = { wx, wy };
            this.drawShapeType = this.tool === 'circle' ? 'ellipse' : 'rect';
        }

        // ---------- HIT TESTING ----------

        hitObject(wx, wy) {
            for (let i = this.objects.length - 1; i >= 0; i--) {
                const o = this.objects[i];
                if (o.visible === false) continue;
                if (o.type === 'rect' || o.type === 'image' || o.type === 'text') {
                    if (wx >= o.x && wx <= o.x + o.width && wy >= o.y && wy <= o.y + o.height) {
                        return o;
                    }
                } else if (o.type === 'ellipse') {
                    const cx = o.x + o.width / 2;
                    const cy = o.y + o.height / 2;
                    const rx = o.width / 2;
                    const ry = o.height / 2;
                    if (rx <= 0 || ry <= 0) continue;
                    const dx = wx - cx;
                    const dy = wy - cy;
                    if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
                        return o;
                    }
                } else if (o.type === 'polyline') {
                    if (this.hitPolyline(o, wx, wy)) return o;
                }
            }
            return null;
        }

        hitPolyline(o, wx, wy) {
            const pts = o.points;
            if (!pts || pts.length < 2) return false;
            const threshold = 5;
            for (let i = 0; i < pts.length - 1; i++) {
                const p1 = pts[i];
                const p2 = pts[i + 1];
                const d = this.pointToSegmentDistance(wx, wy, p1.x, p1.y, p2.x, p2.y);
                if (d <= threshold) return true;
            }
            if (pts.length > 2) {
                const first = pts[0];
                const last = pts[pts.length - 1];
                if (first.x === last.x && first.y === last.y) {
                    const d = this.pointToSegmentDistance(wx, wy, last.x, last.y, first.x, first.y);
                    if (d <= threshold) return true;
                }
            }
            return false;
        }

        pointToSegmentDistance(px, py, x1, y1, x2, y2) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const lenSq = dx * dx + dy * dy;
            if (lenSq === 0) return Math.hypot(px - x1, py - y1);
            let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
            return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
        }

        hitHandle(wx, wy) {
            if (!this.selectedId) return null;
            const obj = this.objects.find(o => o.id === this.selectedId);
            if (!obj) return null;
            const handles = this.getHandles(obj);
            const threshold = 10 / this.scale;
            for (const h of handles) {
                const dx = wx - h.x;
                const dy = wy - h.y;
                if (Math.sqrt(dx * dx + dy * dy) <= threshold) {
                    return { obj, handle: h.name };
                }
            }
            return null;
        }

        getHandles(obj) {
            if (obj.type === 'polyline') {
                const bb = this.polylineBBox(obj);
                const cx = bb.x + bb.w / 2;
                const cy = bb.y + bb.h / 2;
                return [
                    { name: 'tl', x: bb.x, y: bb.y },
                    { name: 'tm', x: cx, y: bb.y },
                    { name: 'tr', x: bb.x + bb.w, y: bb.y },
                    { name: 'ml', x: bb.x, y: cy },
                    { name: 'mr', x: bb.x + bb.w, y: cy },
                    { name: 'bl', x: bb.x, y: bb.y + bb.h },
                    { name: 'bm', x: cx, y: bb.y + bb.h },
                    { name: 'br', x: bb.x + bb.w, y: bb.y + bb.h },
                ];
            }
            const cx = obj.x + obj.width / 2;
            const cy = obj.y + obj.height / 2;
            return [
                { name: 'tl', x: obj.x, y: obj.y },
                { name: 'tm', x: cx, y: obj.y },
                { name: 'tr', x: obj.x + obj.width, y: obj.y },
                { name: 'ml', x: obj.x, y: cy },
                { name: 'mr', x: obj.x + obj.width, y: cy },
                { name: 'bl', x: obj.x, y: obj.y + obj.height },
                { name: 'bm', x: cx, y: obj.y + obj.height },
                { name: 'br', x: obj.x + obj.width, y: obj.y + obj.height },
            ];
        }

        polylineBBox(o) {
            const pts = o.points;
            if (!pts || pts.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
            let minX = pts[0].x, maxX = pts[0].x, minY = pts[0].y, maxY = pts[0].y;
            for (const p of pts) {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y);
                maxY = Math.max(maxY, p.y);
            }
            return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        }

        handleCursor(name) {
            const map = { tl: 'nwse-resize', tm: 'ns-resize', tr: 'nesw-resize', ml: 'ew-resize', mr: 'ew-resize', bl: 'nesw-resize', bm: 'ns-resize', br: 'nwse-resize' };
            return map[name] || 'default';
        }

        // ---------- RESIZE LOGIC ----------

        applyResize(wx, wy, ctrlKey) {
            const s = this.dragObjectStart;
            const o = this.dragObject;
            const h = this.resizeHandle;
            let nx = s.x, ny = s.y, nw = s.w, nh = s.h;

            if (h.includes('r')) nw = Math.max(1, wx - s.x);
            if (h.includes('l')) {
                const right = s.x + s.w;
                nx = Math.min(wx, right - 1);
                nw = right - nx;
            }
            if (h.includes('b')) nh = Math.max(1, wy - s.y);
            if (h.includes('t')) {
                const bottom = s.y + s.h;
                ny = Math.min(wy, bottom - 1);
                nh = bottom - ny;
            }

            if (ctrlKey) {
                const size = Math.max(nw, nh);
                nw = size;
                nh = size;

                switch (h) {
                    case 'se':
                        nx = s.x;
                        ny = s.y;
                        break;
                    case 'sw':
                        nx = s.x + s.w - nw;
                        ny = s.y;
                        break;
                    case 'ne':
                        nx = s.x;
                        ny = s.y + s.h - nh;
                        break;
                    case 'nw':
                        nx = s.x + s.w - nw;
                        ny = s.y + s.h - nh;
                        break;
                    case 'e':
                        nx = s.x;
                        ny = s.y + (s.h - nh) / 2;
                        break;
                    case 'w':
                        nx = s.x + s.w - nw;
                        ny = s.y + (s.h - nh) / 2;
                        break;
                    case 's':
                        nx = s.x + (s.w - nw) / 2;
                        ny = s.y;
                        break;
                    case 'n':
                        nx = s.x + (s.w - nw) / 2;
                        ny = s.y + s.h - nh;
                        break;
                }
            }

            o.x = nx;
            o.y = ny;
            o.width = nw;
            o.height = nh;
        }

        // ---------- OBJECT MANAGEMENT ----------

        addObject(props, skipUndo) {
            const typeLabel = { rect: 'Rectangle', ellipse: 'Circle', image: 'Image', text: 'Text', polyline: 'Polyline' };
            const base = typeLabel[props.type] || 'Object';
            let count = 1;
            while (this.objects.some(o => o.name === base + ' ' + count)) count++;
            const obj = { ...props, id: this.nextId++, mode: props.mode || this.mode, name: base + ' ' + count, visible: true, passes: props.passes || 1, presetName: props.presetName || '' };
            if (props.type === 'text') {
                this.measureTextObject(obj);
            }
            this.objects.push(obj);
            this.selectObject(obj.id);
            this.renderObjects();
            this.renderSelection();
            this.renderLayersPanel();
            if (!skipUndo) {
                this.pushUndo({ type: 'add', obj: this.snapshotObject(obj) });
            }
        }

        selectObject(id) {
            this.selectedId = id || null;
            this.updatePropertiesPanel();
            this.renderSelection();
            this.renderLayersPanel();
        }

        deleteSelected() {
            if (!this.selectedId) return;
            const idx = this.objects.findIndex(o => o.id === this.selectedId);
            const obj = idx >= 0 ? this.objects[idx] : null;
            if (obj) {
                this.pushUndo({ type: 'delete', obj: this.snapshotObject(obj), index: idx });
            }
            this.objects = this.objects.filter(o => o.id !== this.selectedId);
            this.selectObject(null);
            this.renderObjects();
            this.renderLayersPanel();
        }

        // ---------- KEYBOARD ----------

        onKeyDown(e) {
            if (e.code === 'Space') {
                this.keys.space = true;
                if (!this.isDragging) this.dom.canvasArea.style.cursor = 'grab';
            }
            if (e.target.tagName === 'INPUT') return;

            if (e.key === 'v' || e.key === 'V' || e.key === 'Escape') {
                this.setTool('select');
                if (this.isPolylineDrawing) {
                    this.cancelPolyline();
                }
            }
            if (e.key === 'r' || e.key === 'R') {
                this.setTool('rectangle');
            }
            if (e.key === 'c' || e.key === 'C') {
                this.setTool('circle');
            }
            if (e.key === 't' || e.key === 'T') {
                this.setTool('text');
            }
            if (e.key === 'p' || e.key === 'P') {
                this.setTool('polyline');
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                this.deleteSelected();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.redo();
            }
            if (e.key === '+' || e.key === '=') {
                const rect = this.dom.canvasArea.getBoundingClientRect();
                this.zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.25);
            }
            if (e.key === '-' || e.key === '_') {
                const rect = this.dom.canvasArea.getBoundingClientRect();
                this.zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 0.8);
            }
            if (e.key === 'f' || e.key === 'F') {
                this.fitToView();
            }
        }

        onKeyUp(e) {
            if (e.code === 'Space') {
                this.keys.space = false;
                if (!this.isDragging) this.dom.canvasArea.style.cursor = '';
            }
        }

        // ---------- PROPERTIES PANEL ----------

        updatePropertiesPanel() {
            const obj = this.objects.find(o => o.id === this.selectedId);
            if (!obj) {
                this.dom.panelBody.innerHTML = '<p class="panel-hint">Select an object to edit its properties.</p>';
                return;
            }
            const typeLabels = { image: 'Image', ellipse: 'Circle', rect: 'Rectangle', text: 'Text', polyline: 'Polyline' };
            const typeLabel = typeLabels[obj.type] || 'Object';
            let presetOptions = '<option value="">Custom</option>';
            ['cut', 'engrave'].forEach(m => {
                const list = this.presets[m] || [];
                if (list.length) {
                    presetOptions += `<optgroup label="${m.charAt(0).toUpperCase() + m.slice(1)}">`;
                    list.forEach((p, i) => {
                        const sel = obj.presetName === p.name && obj.mode === m ? ' selected' : '';
                        presetOptions += `<option value="${m}:${i}"${sel}>${escapeHtml(p.name)}</option>`;
                    });
                    presetOptions += '</optgroup>';
                }
            });
            let textFields = '';
            if (obj.type === 'text') {
                textFields = `
                    <div class="prop-row">
                        <label>Text</label>
                        <input type="text" id="prop-text" value="${escapeHtml(obj.text || '')}">
                    </div>
                    <div class="prop-row">
                        <label>Font Size (mm)</label>
                        <input type="number" id="prop-fontsize" step="0.5" value="${fmt(obj.fontSize || 10)}">
                    </div>`;
            }
            let posFields = '';
            if (obj.type === 'polyline') {
                const ptCount = obj.points ? obj.points.length : 0;
                posFields = `
                    <div class="prop-row">
                        <label>Points</label>
                        <input type="text" value="${ptCount}" disabled>
                    </div>`;
            } else {
                posFields = `
                    <div class="prop-row">
                        <label>X</label>
                        <input type="number" id="prop-x" step="0.1" value="${fmt(obj.x)}">
                    </div>
                    <div class="prop-row">
                        <label>Y</label>
                        <input type="number" id="prop-y" step="0.1" value="${fmt(obj.y)}">
                    </div>
                    <div class="prop-row">
                        <label>Width</label>
                        <input type="number" id="prop-w" step="0.1" value="${fmt(obj.width)}"${obj.type === 'text' ? ' disabled' : ''}>
                    </div>
                    <div class="prop-row">
                        <label>Height</label>
                        <input type="number" id="prop-h" step="0.1" value="${fmt(obj.height)}"${obj.type === 'text' ? ' disabled' : ''}>
                    </div>`;
            }
            this.dom.panelBody.innerHTML = `
                <div class="prop-section">
                    <div class="prop-section-title">Object</div>
                    <div class="prop-row">
                        <label>Name</label>
                        <input type="text" id="prop-name" value="${escapeHtml(obj.name || '')}">
                    </div>
                    <div class="prop-row">
                        <label>Type</label>
                        <input type="text" value="${typeLabel}" disabled>
                    </div>
                </div>
                <div class="prop-section">
                    <div class="prop-section-title">Laser Settings</div>
                    <div class="prop-row">
                        <label>Mode</label>
                        <div class="prop-mode-toggle">
                            <button class="prop-mode-btn${obj.mode === 'cut' ? ' active' : ''}" data-set-mode="cut">Cut</button>
                            <button class="prop-mode-btn${obj.mode === 'engrave' ? ' active' : ''}" data-set-mode="engrave">Engrave</button>
                        </div>
                    </div>
                    <div class="prop-row">
                        <label>Preset</label>
                        <select id="prop-preset">${presetOptions}</select>
                    </div>
                    ${textFields}
                    <div class="prop-row">
                        <label>Power (%)</label>
                        <input type="number" id="prop-power" step="0.1" value="${fmt(typeof obj.power === 'number' ? obj.power : 0)}">
                    </div>
                    <div class="prop-row">
                        <label>Speed (mm/min)</label>
                        <input type="number" id="prop-speed" step="0.1" value="${fmt(typeof obj.speed === 'number' ? obj.speed : 0)}">
                    </div>
                    <div class="prop-row">
                        <label>Passes</label>
                        <input type="number" id="prop-passes" min="1" step="1" value="${obj.passes || 1}">
                    </div>
                </div>
                <div class="prop-section">
                    <div class="prop-section-title">Position</div>
                    ${posFields}
                </div>
                <div class="prop-section">
                    <div class="prop-section-title">Align to Bed</div>
                    <div class="align-grid">
                        <button class="align-btn" data-align="left" title="Align left">←</button>
                        <button class="align-btn" data-align="hcenter" title="Center horizontally">↔</button>
                        <button class="align-btn" data-align="right" title="Align right">→</button>
                        <button class="align-btn" data-align="top" title="Align top">↑</button>
                        <button class="align-btn" data-align="vcenter" title="Center vertically">↕</button>
                        <button class="align-btn" data-align="bottom" title="Align bottom">↓</button>
                    </div>
                </div>
                <div class="prop-divider"></div>
                <button class="btn-danger" id="btn-delete">Delete Object</button>
            `;
        }

        updatePropInputs() {
            const obj = this.objects.find(o => o.id === this.selectedId);
            if (!obj) return;
            const x = document.getElementById('prop-x');
            const y = document.getElementById('prop-y');
            const w = document.getElementById('prop-w');
            const h = document.getElementById('prop-h');
            const pwr = document.getElementById('prop-power');
            const spd = document.getElementById('prop-speed');
            const name = document.getElementById('prop-name');
            const passes = document.getElementById('prop-passes');
            const text = document.getElementById('prop-text');
            const fontSize = document.getElementById('prop-fontsize');
            if (x) x.value = fmt(obj.x);
            if (y) y.value = fmt(obj.y);
            if (w) w.value = fmt(obj.width);
            if (h) h.value = fmt(obj.height);
            if (pwr) pwr.value = fmt(typeof obj.power === 'number' ? obj.power : 0);
            if (spd) spd.value = fmt(typeof obj.speed === 'number' ? obj.speed : 0);
            if (name) name.value = obj.name || '';
            if (passes) passes.value = obj.passes || 1;
            if (text) text.value = obj.text || '';
            if (fontSize) fontSize.value = fmt(obj.fontSize || 10);
        }

        onPropInput(e) {
            if (!this.selectedId) return;
            const obj = this.objects.find(o => o.id === this.selectedId);
            if (!obj) return;
            const id = e.target.id;
            if (id === 'prop-name') {
                const oldName = obj.name;
                obj.name = e.target.value;
                this.pushUndo({ type: 'property', objId: obj.id, prop: 'name', oldVal: oldName, newVal: obj.name });
                this.renderLayersPanel();
                return;
            }
            if (id === 'prop-preset') {
                const val = e.target.value;
                const oldPreset = obj.presetName;
                const oldPower = obj.power;
                const oldSpeed = obj.speed;
                const oldMode = obj.mode;
                if (val) {
                    const [mode, idxStr] = val.split(':');
                    const idx = parseInt(idxStr, 10);
                    const preset = this.presets[mode][idx];
                    if (preset) {
                        obj.presetName = preset.name;
                        obj.power = preset.power;
                        obj.speed = preset.speed;
                        if (obj.type !== 'image') obj.mode = mode;
                    }
                } else {
                    obj.presetName = '';
                }
                this.pushUndo({ type: 'preset', objId: obj.id, oldPreset, oldPower, oldSpeed, oldMode, newPreset: obj.presetName, newPower: obj.power, newSpeed: obj.speed, newMode: obj.mode });
                this.updatePropertiesPanel();
                this.renderObjects();
                this.renderLayersPanel();
                return;
            }
            if (id === 'prop-text') {
                const oldText = obj.text;
                obj.text = e.target.value;
                this.measureTextObject(obj);
                this.pushUndo({ type: 'property', objId: obj.id, prop: 'text', oldVal: oldText, newVal: obj.text });
                this.renderObjects();
                this.renderSelection();
                this.updatePropInputs();
                return;
            }
            if (id === 'prop-fontsize') {
                const oldVal = obj.fontSize;
                const val = parseFloat(e.target.value);
                if (!isFinite(val)) return;
                obj.fontSize = Math.max(1, val);
                this.measureTextObject(obj);
                this.pushUndo({ type: 'property', objId: obj.id, prop: 'fontSize', oldVal, newVal: obj.fontSize });
                this.renderObjects();
                this.renderSelection();
                return;
            }
            const val = parseFloat(e.target.value);
            if (!isFinite(val)) return;
            const propMap = { 'prop-x': 'x', 'prop-y': 'y', 'prop-w': 'width', 'prop-h': 'height', 'prop-power': 'power', 'prop-speed': 'speed', 'prop-passes': 'passes' };
            const prop = propMap[id];
            if (!prop) return;
            const oldVal = obj[prop];
            if (id === 'prop-w') obj.width = Math.max(0.1, val);
            else if (id === 'prop-h') obj.height = Math.max(0.1, val);
            else if (id === 'prop-power') obj.power = Math.max(0, val);
            else if (id === 'prop-speed') obj.speed = Math.max(0, val);
            else if (id === 'prop-passes') obj.passes = Math.max(1, Math.floor(val));
            else obj[prop] = val;
            this.pushUndo({ type: 'property', objId: obj.id, prop, oldVal, newVal: obj[prop] });
            this.renderObjects();
            this.renderSelection();
        }

        onPropChange(e) {
            if (e.target.id === 'btn-delete') {
                this.deleteSelected();
                return;
            }
            if (e.target.classList.contains('prop-mode-btn')) {
                if (!this.selectedId) return;
                const obj = this.objects.find(o => o.id === this.selectedId);
                if (!obj) return;
                const newMode = e.target.dataset.setMode;
                if (newMode && obj.type !== 'image') {
                    obj.mode = newMode;
                    this.updatePropertiesPanel();
                    this.renderObjects();
                }
                return;
            }
            if (e.target.classList.contains('align-btn')) {
                this.alignObject(e.target.dataset.align);
                return;
            }
        }

        // ---------- PRESETS ----------

        loadPresets() {
            try {
                const raw = localStorage.getItem('laserEngraving_presets');
                if (raw) {
                    const p = JSON.parse(raw);
                    if (p && Array.isArray(p.cut) && Array.isArray(p.engrave)) return p;
                }
            } catch (_e) {}
            return { cut: [], engrave: [] };
        }

        savePresets() {
            try {
                localStorage.setItem('laserEngraving_presets', JSON.stringify(this.presets));
            } catch (_e) {}
        }

        renderPresets() {
            if (!this.dom.presetDropdown) return;
            const list = this.presets[this.mode] || [];
            let html = '<option value="">Select a preset...</option>';
            for (let i = 0; i < list.length; i++) {
                const p = list[i];
                const label = `${escapeHtml(p.name || 'Unnamed')} LP:${fmt(p.power || 0)} LS:${fmt(p.speed || 0)}`;
                html += `<option value="${i}">${label}</option>`;
            }
            this.dom.presetDropdown.innerHTML = html;
            if (this.dom.presetRemove) {
                this.dom.presetRemove.classList.toggle('hidden', list.length === 0);
            }
        }

        showPresetDialog() {
            if (!this.dom.presetDialog) return;
            this.dom.presetDialog.classList.remove('hidden');
            if (this.dom.presetDialogName) this.dom.presetDialogName.value = '';
            if (this.dom.presetDialogPower) this.dom.presetDialogPower.value = '';
            if (this.dom.presetDialogSpeed) this.dom.presetDialogSpeed.value = '';
            if (this.dom.presetDialogName) this.dom.presetDialogName.focus();
        }

        cancelPresetDialog() {
            if (!this.dom.presetDialog) return;
            this.dom.presetDialog.classList.add('hidden');
        }

        savePresetFromDialog() {
            const name = this.dom.presetDialogName ? this.dom.presetDialogName.value.trim() : '';
            const power = parseFloat(this.dom.presetDialogPower ? this.dom.presetDialogPower.value : 0) || 0;
            const speed = parseFloat(this.dom.presetDialogSpeed ? this.dom.presetDialogSpeed.value : 0) || 0;
            if (!name) return;
            this.presets[this.mode].push({ name, power, speed });
            this.savePresets();
            this.renderPresets();
            this.cancelPresetDialog();
        }

        removeSelectedPreset() {
            const idx = parseInt(this.dom.presetDropdown ? this.dom.presetDropdown.value : -1, 10);
            if (isNaN(idx) || idx < 0) return;
            this.presets[this.mode].splice(idx, 1);
            this.savePresets();
            this.renderPresets();
        }

        applyPreset(indexStr) {
            const idx = parseInt(indexStr, 10);
            if (isNaN(idx)) return;
            const preset = this.presets[this.mode][idx];
            if (!preset) return;
            const obj = this.objects.find(o => o.id === this.selectedId);
            if (obj) {
                obj.presetName = preset.name;
                obj.power = preset.power;
                obj.speed = preset.speed;
                if (obj.type !== 'image') {
                    obj.mode = this.mode;
                }
                this.updatePropertiesPanel();
                this.renderObjects();
            }
        }

        // ---------- G-CODE EXPORT ----------

        async exportGC() {
            const validObjects = this.objects.filter(o => o.visible !== false && typeof o.power === 'number' && typeof o.speed === 'number' && o.power > 0 && o.speed > 0);
            if (validObjects.length === 0) {
                alert('No objects with power and speed settings to export.');
                return;
            }
            let gc = [];
            gc.push('; Header');
            gc.push('G21 ; mm');
            gc.push('G90 ; Absolute');
            gc.push(`; Machine Standard: X0 Y0 to X${fmt(this.bed.x)} Y${fmt(this.bed.y)}`);
            gc.push(`; Work Area: ${fmt(this.bed.x)}mm x ${fmt(this.bed.y)}mm`);
            gc.push('; Generated by LaserEngraving');
            gc.push('G90');
            gc.push('');
            for (const obj of validObjects) {
                const body = await this.objectToGC(obj);
                gc.push(body);
            }
            gc.push('M5 ; Laser Off');
            gc.push('G0 X0 Y0 ; Home');
            const gcContent = gc.join('\n');
            if (typeof window.showSaveFilePicker === 'function') {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: 'engrave.gc',
                        types: [{ description: 'G-code files', accept: { 'text/plain': ['.gc', '.nc', '.gcode'] } }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(gcContent);
                    await writable.close();
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        console.error(err);
                        this.downloadGC(gcContent);
                    }
                }
            } else {
                this.downloadGC(gcContent);
            }
        }

        downloadGC(content) {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'engrave.gc';
            a.click();
            URL.revokeObjectURL(url);
        }

        getBounds(obj) {
            if (obj.type === 'polyline') {
                const bb = this.polylineBBox(obj);
                return {
                    x1: bb.x,
                    y1: this.bed.y - bb.y - bb.h,
                    x2: bb.x + bb.w,
                    y2: this.bed.y - bb.y
                };
            }
            return {
                x1: obj.x,
                y1: this.bed.y - obj.y - obj.height,
                x2: obj.x + obj.width,
                y2: this.bed.y - obj.y
            };
        }

        async objectToGC(obj) {
            const lines = [];
            const bounds = this.getBounds(obj);
            const modeLabel = obj.mode === 'engrave' ? 'Engrave' : 'Cut';
            lines.push(`; --- Layer: ${obj.name} (${obj.type}) ---`);
            lines.push(`; Speed: ${fmt(obj.speed)}, Power: ${fmt(obj.power)}`);
            lines.push(`; Mode: ${modeLabel}`);
            if (obj.presetName) lines.push(`; Preset: ${obj.presetName}`);
            if ((obj.passes || 1) > 1) lines.push(`; Passes: ${obj.passes || 1}`);
            lines.push(`; Bounds: X${fmt(bounds.x1)} Y${fmt(bounds.y1)} to X${fmt(bounds.x2)} Y${fmt(bounds.y2)}`);
            lines.push('G00 G17 G40 G21 G54');
            lines.push('G90');
            lines.push('M3');
            lines.push(`; ${obj.type} @ ${fmt(obj.speed)} mm/min, ${fmt(obj.power)}% power`);
            if (obj.mode === 'engrave') lines.push('M8');
            const body = await this.generateObjectMoves(obj);
            for (const line of body) lines.push(line);
            lines.push('M5');
            lines.push('G90');
            lines.push('');
            return lines.join('\n');
        }

        async generateObjectMoves(obj) {
            if (obj.type === 'image') return this.generateImageMoves(obj);
            if (obj.type === 'rect') return this.generateRectMoves(obj);
            if (obj.type === 'ellipse') return this.generateEllipseMoves(obj);
            if (obj.type === 'text') return this.generateTextMoves(obj);
            if (obj.type === 'polyline') return this.generatePolylineMoves(obj);
            return [];
        }

        generateTextMoves(obj) {
            const lines = [];
            const pwrOn = Math.round(obj.power * 10);
            const f = fmt(obj.speed);
            const passes = obj.passes || 1;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const pxSize = Math.max(10, obj.fontSize * 10);
            ctx.font = `${pxSize}px sans-serif`;
            const metrics = ctx.measureText(obj.text || '');
            const textW = Math.ceil(metrics.width);
            const textH = Math.ceil(obj.fontSize * 12);
            canvas.width = textW;
            canvas.height = textH;
            ctx.font = `${pxSize}px sans-serif`;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.textBaseline = 'top';
            ctx.fillText(obj.text || '', 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const stepX = obj.width / canvas.width;
            const stepY = obj.height / canvas.height;
            lines.push(`G0 X${fmt(obj.x)} Y${fmt(this.bed.y - obj.y)}`);
            lines.push('G91');
            let firstMove = true;
            for (let row = 0; row < canvas.height; row++) {
                const gy = this.bed.y - (obj.y + row * stepY);
                let pixels = [];
                for (let col = 0; col < canvas.width; col++) {
                    const idx = (row * canvas.width + col) * 4;
                    pixels.push(data[idx] > 128);
                }
                let groups = [];
                for (let i = 0; i < pixels.length; i++) {
                    if (groups.length === 0 || groups[groups.length - 1].on !== pixels[i]) {
                        groups.push({ on: pixels[i], count: 1 });
                    } else {
                        groups[groups.length - 1].count++;
                    }
                }
                if (groups.length === 1 && !groups[0].on) {
                    if (row < canvas.height - 1) lines.push(`G1 Y${fmt(-stepY)}S0`);
                    continue;
                }
                for (const g of groups) {
                    const dx = g.count * stepX;
                    const s = g.on ? pwrOn : 0;
                    if (firstMove) {
                        lines.push(`G1 X${fmt(dx)}S${s}F${f}`);
                        firstMove = false;
                    } else {
                        lines.push(`G1 X${fmt(dx)}S${s}`);
                    }
                }
                if (row < canvas.height - 1) lines.push(`G1 Y${fmt(-stepY)}S0`);
            }
            return lines;
        }

        generatePolylineMoves(obj) {
            const lines = [];
            const pwrOn = Math.round(obj.power * 10);
            const f = fmt(obj.speed);
            const passes = obj.passes || 1;
            const pts = obj.points;
            if (!pts || pts.length < 2) return lines;
            for (let pass = 0; pass < passes; pass++) {
                lines.push(`G0 X${fmt(pts[0].x)} Y${fmt(this.bed.y - pts[0].y)}`);
                for (let i = 1; i < pts.length; i++) {
                    lines.push(`G1 X${fmt(pts[i].x)} Y${fmt(this.bed.y - pts[i].y)} S${pwrOn} F${f}`);
                }
            }
            return lines;
        }

        generateRectMoves(obj) {
            const lines = [];
            const pwrOn = Math.round(obj.power * 10);
            const f = fmt(obj.speed);
            const passes = obj.passes || 1;
            const x1 = obj.x;
            const y1 = this.bed.y - obj.y;
            const x2 = obj.x + obj.width;
            const y2 = this.bed.y - (obj.y + obj.height);
            for (let pass = 0; pass < passes; pass++) {
                if (obj.mode === 'cut') {
                    lines.push(`G0 X${fmt(x1)} Y${fmt(y1)}`);
                    lines.push(`G1 X${fmt(x2)} Y${fmt(y1)} S${pwrOn} F${f}`);
                    lines.push(`G1 X${fmt(x2)} Y${fmt(y2)} S${pwrOn} F${f}`);
                    lines.push(`G1 X${fmt(x1)} Y${fmt(y2)} S${pwrOn} F${f}`);
                    lines.push(`G1 X${fmt(x1)} Y${fmt(y1)} S${pwrOn} F${f}`);
                } else {
                    const step = 0.1;
                    const numRows = Math.max(1, Math.floor(obj.height / step));
                    for (let row = 0; row < numRows; row++) {
                        const gy = this.bed.y - (obj.y + row * step);
                        if (row % 2 === 0) {
                            lines.push(`G0 X${fmt(x1)} Y${fmt(gy)}`);
                            lines.push(`G1 X${fmt(x2)} Y${fmt(gy)} S${pwrOn} F${f}`);
                        } else {
                            lines.push(`G0 X${fmt(x2)} Y${fmt(gy)}`);
                            lines.push(`G1 X${fmt(x1)} Y${fmt(gy)} S${pwrOn} F${f}`);
                        }
                    }
                }
            }
            return lines;
        }

        generateEllipseMoves(obj) {
            const lines = [];
            const pwrOn = Math.round(obj.power * 10);
            const f = fmt(obj.speed);
            const passes = obj.passes || 1;
            const cx = obj.x + obj.width / 2;
            const cy = obj.y + obj.height / 2;
            const rx = obj.width / 2;
            const ry = obj.height / 2;
            const isCircle = Math.abs(rx - ry) < 0.1;
            for (let pass = 0; pass < passes; pass++) {
                if (obj.mode === 'cut') {
                    if (isCircle) {
                        const r = rx;
                        const sx = cx + r;
                        const sy = this.bed.y - cy;
                        lines.push(`G0 X${fmt(sx)} Y${fmt(sy)}`);
                        lines.push(`G2 X${fmt(sx)} Y${fmt(sy)} I${fmt(-r)} J0 S${pwrOn} F${f}`);
                    } else {
                        const segments = 64;
                        for (let i = 0; i <= segments; i++) {
                            const angle = (i / segments) * Math.PI * 2;
                            const px = cx + rx * Math.cos(angle);
                            const py = this.bed.y - (cy + ry * Math.sin(angle));
                            const cmd = i === 0 ? 'G0' : 'G1';
                            const s = i === 0 ? '' : ` S${pwrOn}`;
                            const feed = i === 0 ? '' : ` F${f}`;
                            lines.push(`${cmd} X${fmt(px)} Y${fmt(py)}${s}${feed}`);
                        }
                    }
                } else {
                    const step = 0.1;
                    const numRows = Math.max(1, Math.floor(obj.height / step));
                    for (let row = 0; row < numRows; row++) {
                        const localY = -ry + row * step;
                        if (Math.abs(localY) > ry) continue;
                        const halfWidth = rx * Math.sqrt(Math.max(0, 1 - (localY * localY) / (ry * ry)));
                        const leftX = cx - halfWidth;
                        const rightX = cx + halfWidth;
                        const gy = this.bed.y - (cy + localY);
                        if (row % 2 === 0) {
                            lines.push(`G0 X${fmt(leftX)} Y${fmt(gy)}`);
                            lines.push(`G1 X${fmt(rightX)} Y${fmt(gy)} S${pwrOn} F${f}`);
                        } else {
                            lines.push(`G0 X${fmt(rightX)} Y${fmt(gy)}`);
                            lines.push(`G1 X${fmt(leftX)} Y${fmt(gy)} S${pwrOn} F${f}`);
                        }
                    }
                }
            }
            return lines;
        }

        generateImageMoves(obj) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const step = 0.1;
                    const cols = Math.max(1, Math.round(obj.width / step));
                    const rows = Math.max(1, Math.round(obj.height / step));
                    const canvas = document.createElement('canvas');
                    canvas.width = cols;
                    canvas.height = rows;
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(img, 0, 0, cols, rows);
                    const imageData = ctx.getImageData(0, 0, cols, rows);
                    const data = imageData.data;
                    const lines = [];
                    const pwrOn = Math.round(obj.power * 10);
                    const f = fmt(obj.speed);
                    const startX = obj.x;
                    const startY = this.bed.y - obj.y;
                    lines.push(`G0 X${fmt(startX)} Y${fmt(startY)}`);
                    lines.push('G91');
                    let firstMove = true;
                    for (let row = 0; row < rows; row++) {
                        const isEven = row % 2 === 0;
                        let pixels = [];
                        for (let col = 0; col < cols; col++) {
                            const idx = (row * cols + col) * 4;
                            pixels.push(data[idx] < 128);
                        }
                        let groups = [];
                        for (let i = 0; i < pixels.length; i++) {
                            if (groups.length === 0 || groups[groups.length - 1].on !== pixels[i]) {
                                groups.push({ on: pixels[i], count: 1 });
                            } else {
                                groups[groups.length - 1].count++;
                            }
                        }
                        if (groups.length === 1 && !groups[0].on) {
                            if (row < rows - 1) {
                                lines.push(`G1 Y${fmt(-step)}S0`);
                            }
                            continue;
                        }
                        for (const g of groups) {
                            const dx = isEven ? g.count * step : -g.count * step;
                            const s = g.on ? pwrOn : 0;
                            if (firstMove) {
                                lines.push(`G1 X${fmt(dx)}S${s}F${f}`);
                                firstMove = false;
                            } else {
                                lines.push(`G1 X${fmt(dx)}S${s}`);
                            }
                        }
                        if (row < rows - 1) {
                            lines.push(`G1 Y${fmt(-step)}S0`);
                        }
                    }
                    resolve(lines);
                };
                img.onerror = reject;
                img.src = obj.href;
            });
        }

        // ---------- RENDERING ----------

        render() {
            this.renderTransform();
            this.renderObjects();
            this.renderSelection();
            this.renderLayersPanel();
            this.updateStatus();
        }

        renderTransform() {
            this.dom.viewport.setAttribute('transform', `translate(${this.offset.x.toFixed(2)}, ${this.offset.y.toFixed(2)}) scale(${this.scale.toFixed(4)})`);
        }

        renderObjects() {
            const svg = this.objects.filter(o => o.visible !== false).map(o => this.objectToSVG(o)).join('');
            this.dom.objectsLayer.innerHTML = svg;
        }

        renderTempObject() {
            if (!this.tempObject) {
                this.renderObjects();
                return;
            }
            const svg = this.objects.map(o => this.objectToSVG(o)).join('') + this.objectToSVG(this.tempObject);
            this.dom.objectsLayer.innerHTML = svg;
        }

        objectToSVG(o) {
            if (o.type === 'image') {
                return `<image class="cad-object" x="${fmt(o.x)}" y="${fmt(o.y)}" width="${fmt(o.width)}" height="${fmt(o.height)}" href="${o.href}" style="filter:grayscale(1)" data-id="${o.id}"/>`;
            }

            const isSel = o.id === this.selectedId;
            const stroke = isSel ? '#ffffff' : (o.stroke || '#ffffff');
            const fill = 'none';
            const sw = 1;
            const dash = o.mode === 'engrave' ? `stroke-dasharray="${fmt(4 / this.scale)} ${fmt(4 / this.scale)}"` : '';

            if (o.type === 'rect') {
                return `<rect class="cad-object" x="${fmt(o.x)}" y="${fmt(o.y)}" width="${fmt(o.width)}" height="${fmt(o.height)}" fill="${fill}" stroke="${stroke}" stroke-width="${fmt(sw / this.scale)}" rx="${fmt(2 / this.scale)}" ${dash} data-id="${o.id}"/>`;
            }
            if (o.type === 'ellipse') {
                const cx = o.x + o.width / 2;
                const cy = o.y + o.height / 2;
                const rx = o.width / 2;
                const ry = o.height / 2;
                return `<ellipse class="cad-object" cx="${fmt(cx)}" cy="${fmt(cy)}" rx="${fmt(rx)}" ry="${fmt(ry)}" fill="${fill}" stroke="${stroke}" stroke-width="${fmt(sw / this.scale)}" ${dash} data-id="${o.id}"/>`;
            }
            if (o.type === 'text') {
                const fontPx = Math.max(1, o.fontSize * this.scale);
                return `<text class="cad-object" x="${fmt(o.x)}" y="${fmt(o.y + o.fontSize)}" font-family="sans-serif" font-size="${fmt(o.fontSize)}" fill="${o.mode === 'engrave' ? 'rgba(255,255,255,0.25)' : fill}" stroke="${stroke}" stroke-width="${fmt(sw / this.scale)}" ${dash} data-id="${o.id}">${escapeHtml(o.text || '')}</text>`;
            }
            if (o.type === 'polyline') {
                const pts = o.points;
                if (!pts || pts.length < 2) return '';
                const pointsStr = pts.map(p => `${fmt(p.x)},${fmt(p.y)}`).join(' ');
                const isClosed = pts.length > 2 && pts[0].x === pts[pts.length - 1].x && pts[0].y === pts[pts.length - 1].y;
                if (isClosed) {
                    return `<polygon class="cad-object" points="${pointsStr}" fill="${o.mode === 'engrave' ? 'rgba(255,255,255,0.15)' : fill}" stroke="${stroke}" stroke-width="${fmt(sw / this.scale)}" ${dash} data-id="${o.id}"/>`;
                }
                return `<polyline class="cad-object" points="${pointsStr}" fill="none" stroke="${stroke}" stroke-width="${fmt(sw / this.scale)}" ${dash} data-id="${o.id}"/>`;
            }
            return '';
        }

        renderSelection() {
            if (!this.selectedId) {
                this.dom.selectionLayer.innerHTML = '';
                return;
            }
            const obj = this.objects.find(o => o.id === this.selectedId);
            if (!obj) {
                this.dom.selectionLayer.innerHTML = '';
                return;
            }
            const hs = this.getHandles(obj);
            const s = 6 / this.scale;
            const hs2 = s / 2;
            let bx, by, bw, bh;
            if (obj.type === 'polyline') {
                const bb = this.polylineBBox(obj);
                bx = bb.x; by = bb.y; bw = bb.w; bh = bb.h;
            } else {
                bx = obj.x; by = obj.y; bw = obj.width; bh = obj.height;
            }
            let svg = `<rect x="${fmt(bx)}" y="${fmt(by)}" width="${fmt(bw)}" height="${fmt(bh)}" fill="none" stroke="#ffffff" stroke-width="${fmt(1.5 / this.scale)}" stroke-dasharray="${fmt(6 / this.scale)} ${fmt(4 / this.scale)}" pointer-events="none"/>`;
            for (const h of hs) {
                svg += `<rect x="${fmt(h.x - hs2)}" y="${fmt(h.y - hs2)}" width="${fmt(s)}" height="${fmt(s)}" fill="#ffffff" stroke="#0a0a0f" stroke-width="${fmt(1 / this.scale)}" rx="${fmt(1 / this.scale)}" data-handle="${h.name}" pointer-events="none"/>`;
            }
            this.dom.selectionLayer.innerHTML = svg;
        }

        updateStatus() {
            this.dom.statusBed.textContent = `${fmt(this.bed.x)} × ${fmt(this.bed.y)} mm`;
            this.dom.statusZoom.textContent = `${Math.round(this.scale * 100)}%`;
        }

        updateMousePos(wx, wy) {
            this.dom.statusPos.textContent = `${fmt(wx)}, ${fmt(wy)} mm`;
        }

        // ---------- LAYERS PANEL ----------

        renderLayersPanel() {
            if (!this.dom.layersList) return;
            const list = this.objects.slice().reverse();
            let html = '';
            for (const o of list) {
                const isSel = o.id === this.selectedId;
                const eyeSvg = o.visible !== false
                    ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
                    : '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
                html += `
                <div class="layer-item${isSel ? ' selected' : ''}" data-id="${o.id}">
                    <button class="layer-visibility${o.visible !== false ? ' active' : ''}" title="Toggle visibility">${eyeSvg}</button>
                    <span class="layer-name">${escapeHtml(o.name || 'Layer')}</span>
                    <div class="layer-actions">
                        <button class="layer-up" title="Move up">▲</button>
                        <button class="layer-down" title="Move down">▼</button>
                        <button class="layer-delete" title="Delete">×</button>
                    </div>
                </div>`;
            }
            this.dom.layersList.innerHTML = html;
        }

        onLayerClick(e) {
            const item = e.target.closest('.layer-item');
            if (!item) return;
            const id = parseInt(item.dataset.id, 10);

            if (e.target.closest('.layer-visibility')) {
                this.toggleLayerVisibility(id);
                return;
            }
            if (e.target.closest('.layer-up')) {
                this.moveLayerUp(id);
                return;
            }
            if (e.target.closest('.layer-down')) {
                this.moveLayerDown(id);
                return;
            }
            if (e.target.closest('.layer-delete')) {
                this.deleteLayer(id);
                return;
            }

            this.selectObject(id);
        }

        onLayerDblClick(e) {
            const nameEl = e.target.closest('.layer-name');
            if (!nameEl) return;
            const item = nameEl.closest('.layer-item');
            if (!item) return;
            const id = parseInt(item.dataset.id, 10);
            const obj = this.objects.find(o => o.id === id);
            if (!obj) return;

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'layer-rename-input';
            input.value = obj.name || '';
            nameEl.replaceWith(input);
            input.focus();
            input.select();

            const finish = () => {
                const val = input.value.trim();
                if (val) this.renameLayer(id, val);
                else this.renderLayersPanel();
            };

            input.addEventListener('blur', finish, { once: true });
            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
                if (ev.key === 'Escape') { input.value = obj.name || ''; input.blur(); }
            });
        }

        toggleLayerVisibility(id) {
            const obj = this.objects.find(o => o.id === id);
            if (!obj) return;
            obj.visible = obj.visible === false ? true : false;
            if (obj.visible === false && this.selectedId === id) {
                this.selectObject(null);
            }
            this.renderObjects();
            this.renderSelection();
            this.renderLayersPanel();
        }

        moveLayerUp(id) {
            const i = this.objects.findIndex(o => o.id === id);
            if (i === -1 || i >= this.objects.length - 1) return;
            [this.objects[i], this.objects[i + 1]] = [this.objects[i + 1], this.objects[i]];
            this.renderObjects();
            this.renderSelection();
            this.renderLayersPanel();
        }

        moveLayerDown(id) {
            const i = this.objects.findIndex(o => o.id === id);
            if (i <= 0) return;
            [this.objects[i], this.objects[i - 1]] = [this.objects[i - 1], this.objects[i]];
            this.renderObjects();
            this.renderSelection();
            this.renderLayersPanel();
        }

        renameLayer(id, name) {
            const obj = this.objects.find(o => o.id === id);
            if (!obj) return;
            obj.name = name;
            this.renderLayersPanel();
            if (this.selectedId === id) this.updatePropertiesPanel();
        }

        deleteLayer(id) {
            const idx = this.objects.findIndex(o => o.id === id);
            const obj = idx >= 0 ? this.objects[idx] : null;
            if (obj) {
                this.pushUndo({ type: 'delete', obj: this.snapshotObject(obj), index: idx });
            }
            this.objects = this.objects.filter(o => o.id !== id);
            if (this.selectedId === id) this.selectObject(null);
            this.renderObjects();
            this.renderLayersPanel();
        }

        // ---------- UNDO / REDO ----------

        snapshotObject(obj) {
            return JSON.parse(JSON.stringify(obj));
        }

        pushUndo(cmd) {
            this.undoStack.push(cmd);
            if (this.undoStack.length > 100) this.undoStack.shift();
            this.redoStack = [];
            this.updateUndoRedoButtons();
        }

        undo() {
            if (this.undoStack.length === 0) return;
            const cmd = this.undoStack.pop();
            this.applyCommand(cmd, true);
            this.redoStack.push(cmd);
            this.updateUndoRedoButtons();
        }

        redo() {
            if (this.redoStack.length === 0) return;
            const cmd = this.redoStack.pop();
            this.applyCommand(cmd, false);
            this.undoStack.push(cmd);
            this.updateUndoRedoButtons();
        }

        applyCommand(cmd, reverse) {
            const type = reverse ? this.invertType(cmd.type) : cmd.type;
            if (type === 'add') {
                const obj = { ...cmd.obj };
                this.objects.push(obj);
                this.selectObject(obj.id);
            } else if (type === 'delete') {
                this.objects = this.objects.filter(o => o.id !== cmd.obj.id);
                if (this.selectedId === cmd.obj.id) this.selectObject(null);
            } else if (type === 'move') {
                const obj = this.objects.find(o => o.id === cmd.objId);
                if (obj) { obj.x = cmd.oldX; obj.y = cmd.oldY; }
            } else if (type === 'unmove') {
                const obj = this.objects.find(o => o.id === cmd.objId);
                if (obj) { obj.x = cmd.newX; obj.y = cmd.newY; }
            } else if (type === 'resize') {
                const obj = this.objects.find(o => o.id === cmd.objId);
                if (obj) { obj.x = cmd.oldX; obj.y = cmd.oldY; obj.width = cmd.oldW; obj.height = cmd.oldH; }
            } else if (type === 'unresize') {
                const obj = this.objects.find(o => o.id === cmd.objId);
                if (obj) { obj.x = cmd.newX; obj.y = cmd.newY; obj.width = cmd.newW; obj.height = cmd.newH; }
            } else if (type === 'property') {
                const obj = this.objects.find(o => o.id === cmd.objId);
                if (obj) {
                    obj[cmd.prop] = cmd.oldVal;
                    if (cmd.prop === 'text' || cmd.prop === 'fontSize') this.measureTextObject(obj);
                }
            } else if (type === 'unproperty') {
                const obj = this.objects.find(o => o.id === cmd.objId);
                if (obj) {
                    obj[cmd.prop] = cmd.newVal;
                    if (cmd.prop === 'text' || cmd.prop === 'fontSize') this.measureTextObject(obj);
                }
            } else if (type === 'preset') {
                const obj = this.objects.find(o => o.id === cmd.objId);
                if (obj) { obj.presetName = cmd.oldPreset; obj.power = cmd.oldPower; obj.speed = cmd.oldSpeed; obj.mode = cmd.oldMode; }
            } else if (type === 'unpreset') {
                const obj = this.objects.find(o => o.id === cmd.objId);
                if (obj) { obj.presetName = cmd.newPreset; obj.power = cmd.newPower; obj.speed = cmd.newSpeed; obj.mode = cmd.newMode; }
            }
            this.renderObjects();
            this.renderSelection();
            this.renderLayersPanel();
            if (this.selectedId) this.updatePropertiesPanel();
        }

        invertType(type) {
            const map = { move: 'unmove', unmove: 'move', resize: 'unresize', unresize: 'resize', property: 'unproperty', unproperty: 'property', preset: 'unpreset', unpreset: 'preset', add: 'delete', delete: 'add' };
            return map[type] || type;
        }

        updateUndoRedoButtons() {
            const undoBtn = document.getElementById('tool-undo');
            const redoBtn = document.getElementById('tool-redo');
            if (undoBtn) undoBtn.style.opacity = this.undoStack.length ? '1' : '0.3';
            if (redoBtn) redoBtn.style.opacity = this.redoStack.length ? '1' : '0.3';
        }

        // ---------- TEXT ----------

        measureTextObject(obj) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const pxSize = Math.max(10, obj.fontSize * 10);
            ctx.font = `${pxSize}px sans-serif`;
            const metrics = ctx.measureText(obj.text || '');
            obj.width = metrics.width / 10;
            obj.height = obj.fontSize * 1.2;
        }

        // ---------- POLYLINE ----------

        renderPolylinePreview() {
            const pts = this.polylinePoints;
            if (pts.length < 2) return;
            const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + fmt(p.x) + ',' + fmt(p.y)).join(' ');
            const svg = `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="${fmt(1 / this.scale)}" stroke-dasharray="${fmt(4 / this.scale)} ${fmt(4 / this.scale)}"/>`;
            this.dom.objectsLayer.innerHTML = this.objects.filter(o => o.visible !== false).map(o => this.objectToSVG(o)).join('') + svg;
        }

        finishPolyline() {
            const pts = this.polylinePoints.map(p => ({ x: p.x, y: p.y }));
            if (pts.length >= 3) {
                this.addObject({
                    type: 'polyline',
                    points: pts,
                    mode: this.mode,
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0
                }, true);
            }
            this.isPolylineDrawing = false;
            this.polylinePoints = [];
            this.renderObjects();
        }

        cancelPolyline() {
            this.isPolylineDrawing = false;
            this.polylinePoints = [];
            this.renderObjects();
        }

        // ---------- SNAP & GUIDES ----------

        renderGuides(obj) {
            const guides = [];
            const threshold = 2;
            const centerX = obj.x + obj.width / 2;
            const centerY = obj.y + obj.height / 2;
            const rightX = obj.x + obj.width;
            const bottomY = obj.y + obj.height;

            const checks = [
                { val: obj.x, target: 0, label: 'bed-left' },
                { val: centerX, target: this.bed.x / 2, label: 'bed-hcenter' },
                { val: rightX, target: this.bed.x, label: 'bed-right' },
                { val: obj.y, target: 0, label: 'bed-top' },
                { val: centerY, target: this.bed.y / 2, label: 'bed-vcenter' },
                { val: bottomY, target: this.bed.y, label: 'bed-bottom' }
            ];

            for (const other of this.objects) {
                if (other.id === obj.id) continue;
                const ocx = other.x + other.width / 2;
                const ocy = other.y + other.height / 2;
                const orx = other.x + other.width;
                const oby = other.y + other.height;
                checks.push(
                    { val: obj.x, target: other.x, label: 'obj-left' },
                    { val: centerX, target: ocx, label: 'obj-hcenter' },
                    { val: rightX, target: orx, label: 'obj-right' },
                    { val: obj.y, target: other.y, label: 'obj-top' },
                    { val: centerY, target: ocy, label: 'obj-vcenter' },
                    { val: bottomY, target: oby, label: 'obj-bottom' }
                );
            }

            for (const c of checks) {
                if (Math.abs(c.val - c.target) < threshold) {
                    const isHoriz = c.label.includes('left') || c.label.includes('right') || c.label.includes('hcenter');
                    if (isHoriz) {
                        guides.push(`<line x1="${fmt(c.target)}" y1="0" x2="${fmt(c.target)}" y2="${fmt(this.bed.y)}" stroke="#d4a853" stroke-width="${fmt(1 / this.scale)}" stroke-dasharray="${fmt(4 / this.scale)} ${fmt(4 / this.scale)}" opacity="0.6"/>`);
                    } else {
                        guides.push(`<line x1="0" y1="${fmt(c.target)}" x2="${fmt(this.bed.x)}" y2="${fmt(c.target)}" stroke="#d4a853" stroke-width="${fmt(1 / this.scale)}" stroke-dasharray="${fmt(4 / this.scale)} ${fmt(4 / this.scale)}" opacity="0.6"/>`);
                    }
                }
            }

            this.guides = guides;
            this.renderGuideLayer();
        }

        clearGuides() {
            this.guides = [];
            this.renderGuideLayer();
        }

        renderGuideLayer() {
            const existing = document.getElementById('guide-layer');
            if (existing) existing.remove();
            if (this.guides.length === 0) return;
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.id = 'guide-layer';
            g.innerHTML = this.guides.join('');
            this.dom.viewport.appendChild(g);
        }

        // ---------- ALIGN ----------

        alignObject(align) {
            const obj = this.objects.find(o => o.id === this.selectedId);
            if (!obj) return;
            const oldX = obj.x;
            const oldY = obj.y;
            if (align === 'left') obj.x = 0;
            if (align === 'hcenter') obj.x = (this.bed.x - obj.width) / 2;
            if (align === 'right') obj.x = this.bed.x - obj.width;
            if (align === 'top') obj.y = 0;
            if (align === 'vcenter') obj.y = (this.bed.y - obj.height) / 2;
            if (align === 'bottom') obj.y = this.bed.y - obj.height;
            this.pushUndo({ type: 'move', objId: obj.id, oldX, oldY, newX: obj.x, newY: obj.y });
            this.renderObjects();
            this.renderSelection();
            this.updatePropInputs();
        }
    }

    function fmt(n) {
        return Number(n.toFixed(3));
    }

    function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function ditherImageData(imageData) {
        const w = imageData.width;
        const h = imageData.height;
        const data = imageData.data;
        const gray = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) {
            const idx = i * 4;
            gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        }
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = y * w + x;
                const oldVal = gray[i];
                const newVal = oldVal < 128 ? 0 : 255;
                const error = oldVal - newVal;
                gray[i] = newVal;
                if (x + 1 < w) gray[i + 1] += error * 7 / 16;
                if (y + 1 < h) {
                    if (x > 0) gray[i + w - 1] += error * 3 / 16;
                    gray[i + w] += error * 5 / 16;
                    if (x + 1 < w) gray[i + w + 1] += error * 1 / 16;
                }
            }
        }
        for (let i = 0; i < w * h; i++) {
            const idx = i * 4;
            const v = gray[i] < 128 ? 0 : 255;
            data[idx] = v;
            data[idx + 1] = v;
            data[idx + 2] = v;
            data[idx + 3] = 255;
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
