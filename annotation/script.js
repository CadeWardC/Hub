/* Annotation — PDF viewer for research papers */

/* ═══ PDF.js Setup ═══ */
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/* ═══ Constants ═══ */
const SCALE_STEP = 1.25;
const SCALE_MIN = 0.25;
const SCALE_MAX = 5.0;

/* ═══ State ═══ */
const state = {
    view: 'onboarding',
    pdfDoc: null,
    scale: 1,
    currentPage: 1,
    totalPages: 0,
    fileName: '',
    pdfBuffer: null,
};

const anno = {
    shapes: new Map(),
    selectedId: null,
    nextId: 1,
    drag: null,
};

const annoSidebar = {
    open: false,
    pageNum: null,
};

/* ═══ DOM refs ═══ */
const $ = (id) => document.getElementById(id);
const els = {
    onboarding: $('onboarding'),
    viewer: $('viewer'),
    dropZone: $('drop-zone'),
    fileInput: $('file-input'),
    uploadBtn: $('upload-btn'),
    toolbar: $('toolbar'),
    backBtn: $('back-btn'),
    fileName: $('file-name'),
    deleteBtn: $('delete-btn'),
    zoomOut: $('zoom-out'),
    zoomLevel: $('zoom-level'),
    zoomIn: $('zoom-in'),
    fitBtn: $('fit-btn'),
    pageIndicator: $('page-indicator'),
    pageContainer: $('page-container'),
    pageContainerInner: $('page-container-inner'),
    loadingOverlay: $('loading-overlay'),
    loadingText: $('loading-text'),
    errorToast: $('error-toast'),
    errorText: $('error-text'),
    viewerBody: $('viewer-body'),
    annoSidebar: $('anno-sidebar'),
    annoSidebarBody: $('anno-sidebar-body'),
    annoClose: $('anno-close'),
    saveBtn: $('save-btn'),
    exportBtn: $('export-btn'),
    importBtn: $('import-btn'),
    importInput: $('import-input'),
};

/* ═══ Initialization ═══ */
function init() {
    // Onboarding
    els.dropZone.addEventListener('click', () => els.fileInput.click());
    els.dropZone.addEventListener('dragover', onDragOver);
    els.dropZone.addEventListener('dragleave', onDragLeave);
    els.dropZone.addEventListener('drop', onDrop);
    els.fileInput.addEventListener('change', onFileSelect);
    els.uploadBtn.addEventListener('click', () => els.fileInput.click());

    // Viewer
    els.backBtn.addEventListener('click', goToOnboarding);
    els.zoomOut.addEventListener('click', zoomOut);
    els.zoomIn.addEventListener('click', zoomIn);
    els.fitBtn.addEventListener('click', fitToWidth);

    // Delete button
    els.deleteBtn.addEventListener('click', deleteSelectedShape);

    // Keyboard shortcuts
    document.addEventListener('keydown', onKeyDown);

    // Scroll-based toolbar shadow & page tracking
    els.pageContainer.addEventListener('scroll', onScroll);

    // Wheel zoom
    els.pageContainer.addEventListener('wheel', onWheel, { passive: false });

    // Touch pinch-to-zoom (mobile)
    els.pageContainer.addEventListener('touchstart', onTouchStart, { passive: true });
    els.pageContainer.addEventListener('touchmove', onTouchMove, { passive: false });
    els.pageContainer.addEventListener('touchend', onTouchEnd);

    // Sidebar
    els.annoClose.addEventListener('click', closeSidebar);

    // Export / Import
    els.saveBtn.addEventListener('click', saveSession);
    els.exportBtn.addEventListener('click', exportFlattenedPDF);
    els.importBtn.addEventListener('click', () => els.importInput.click());
    els.importInput.addEventListener('change', onImportSelect);

    // Global mouse for annotation drag
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

/* ═══ Onboarding Handlers ═══ */

function onDragOver(e) {
    e.preventDefault();
    els.dropZone.classList.add('drag-over');
}

function onDragLeave() {
    els.dropZone.classList.remove('drag-over');
}

function onDrop(e) {
    e.preventDefault();
    els.dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
        loadPDF(file);
    } else if (file.type === 'application/json' || name.endsWith('.json') || name.endsWith('.annotations')) {
        importSession(file);
    } else {
        showError('Please drop a PDF or .annotations session file.');
    }
}

function onFileSelect(e) {
    const file = e.target.files[0];
    if (file) loadPDF(file);
}

/* ═══ PDF Loading ═══ */

function loadPDF(file) {
    if (state.pdfDoc) {
        state.pdfDoc.destroy();
        state.pdfDoc = null;
    }

    // Reset annotations
    anno.shapes.clear();
    anno.selectedId = null;
    anno.nextId = 1;
    anno.drag = null;

    state.fileName = file.name;
    showLoading(`Loading "${file.name}"`);
    state.pdfBuffer = null;

    const reader = new FileReader();
    reader.onload = (e) => {
        state.pdfBuffer = e.target.result;
        const data = new Uint8Array(e.target.result);
        pdfjsLib.getDocument({ data }).promise
            .then((pdf) => {
                state.pdfDoc = pdf;
                state.totalPages = pdf.numPages;
                state.currentPage = 1;

                switchToViewer();
                renderAllPages();
            })
            .catch((err) => {
                console.error(err);
                hideLoading();
                showError('Failed to load PDF. The file may be corrupted.');
            });
    };
    reader.onerror = () => {
        showError('Failed to read the file.');
    };
    reader.readAsArrayBuffer(file);
}

/* ═══ View Switching ═══ */

function switchToViewer() {
    state.view = 'viewer';
    els.onboarding.classList.remove('active');
    els.viewer.classList.add('active');
    els.fileName.textContent = state.fileName;
    updateZoomDisplay();
    updatePageIndicator();
}

function goToOnboarding() {
    if (state.pdfDoc) {
        state.pdfDoc.destroy();
        state.pdfDoc = null;
    }
    state.pdfBuffer = null;
    els.pageContainerInner.innerHTML = '';
    state.view = 'onboarding';
    els.viewer.classList.remove('active');
    els.onboarding.classList.add('active');
    els.fileInput.value = '';
    els.toolbar.classList.remove('is-scrolled');

    closeSidebar();
    els.viewerBody.classList.remove('sidebar-open');
    els.deleteBtn.classList.add('hidden');
    anno.shapes.clear();
    anno.selectedId = null;
    anno.nextId = 1;
    anno.drag = null;
}

/* ═══ Page Rendering ═══ */

let renderTasks = [];
let pageObserver = null;
let firstRenderDone = false;

function renderAllPages() {
    const container = els.pageContainerInner;
    container.innerHTML = '';
    renderTasks = [];
    firstRenderDone = false;

    if (!state.pdfDoc) return;

    const containerWidth = els.pageContainer.clientWidth - 48;

    // Calculate fit-to-width scale using the first page
    state.pdfDoc.getPage(1).then((page) => {
        const baseViewport = page.getViewport({ scale: 1 });
        const fitScale = (containerWidth - 4) / baseViewport.width;
        if (state.scale === 1 || !firstRenderDone) {
            state.scale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, fitScale));
            updateZoomDisplay();
        }

        // Render all pages
        const pagePromises = [];
        for (let i = 1; i <= state.totalPages; i++) {
            pagePromises.push(renderPage(i));
        }

        // Hide loading once everything is rendered
        Promise.all(pagePromises).then(() => {
            firstRenderDone = true;
            hideLoading();
            setupPageObserver();
            updatePageIndicator();
        });
    });
}

function renderPage(pageNum) {
    return state.pdfDoc.getPage(pageNum).then((page) => {
        const dpr = window.devicePixelRatio || 1;
        const baseViewport = page.getViewport({ scale: 1 });
        const renderScale = Math.max(state.scale, 1.5);
        const viewport = page.getViewport({ scale: renderScale });

        const wrapper = document.createElement('div');
        wrapper.className = 'page-wrapper';
        wrapper.dataset.page = pageNum;
        wrapper.style.position = 'relative';

        const canvas = document.createElement('canvas');
        canvas.className = 'page-canvas';
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = Math.floor(baseViewport.width * state.scale) + 'px';
        canvas.style.height = Math.floor(baseViewport.height * state.scale) + 'px';

        const label = document.createElement('div');
        label.className = 'page-label';
        label.textContent = `${pageNum} / ${state.totalPages}`;

        wrapper.appendChild(canvas);
        wrapper.appendChild(label);
        els.pageContainerInner.appendChild(wrapper);

        const ctx = canvas.getContext('2d');
        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;
        const renderTask = page.render({
            canvasContext: ctx,
            viewport: viewport,
            transform: transform,
        });

        renderTasks.push(renderTask);

        // Create annotation layer after canvas size is set
        createAnnotationLayer(wrapper, pageNum);

        return renderTask.promise;
    });
}

function reRenderAllPages() {
    if (!state.pdfDoc) return;

    // Cancel any in-flight renders
    renderTasks.forEach((t) => { try { t.cancel(); } catch (e) {} });
    renderTasks = [];

    // Save scroll position to restore after re-render
    const container = els.pageContainer;
    const scrollTop = container.scrollTop;

    const pagePromises = [];
    for (let i = 1; i <= state.totalPages; i++) {
        pagePromises.push(reRenderPage(i));
    }

    Promise.all(pagePromises).then(() => {
        // Update annotation layer sizes and re-render shapes
        document.querySelectorAll('.page-wrapper').forEach((wrapper) => {
            const pageNum = parseInt(wrapper.dataset.page, 10);
            const canvas = wrapper.querySelector('.page-canvas');
            const layer = wrapper.querySelector('.annotation-layer');
            if (canvas && layer) {
                layer.style.width = canvas.style.width;
                layer.style.height = canvas.style.height;
                renderShapesForPage(pageNum, layer);
            }
        });

        // Try to maintain scroll position by scrolling to current page
        const target = document.querySelector(`.page-wrapper[data-page="${state.currentPage}"]`);
        if (target) {
            const newTop = target.offsetTop;
            if (container.scrollTop === scrollTop || container.scrollTop === 0) {
                container.scrollTop = newTop;
            }
        }
        setupPageObserver();
    });
}

function reRenderPage(pageNum) {
    return state.pdfDoc.getPage(pageNum).then((page) => {
        const dpr = window.devicePixelRatio || 1;
        const baseViewport = page.getViewport({ scale: 1 });
        const renderScale = Math.max(state.scale, 1.5);
        const viewport = page.getViewport({ scale: renderScale });

        const wrapper = document.querySelector(`.page-wrapper[data-page="${pageNum}"]`);
        if (!wrapper) return;

        const canvas = wrapper.querySelector('.page-canvas');
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = Math.floor(baseViewport.width * state.scale) + 'px';
        canvas.style.height = Math.floor(baseViewport.height * state.scale) + 'px';

        const ctx = canvas.getContext('2d');
        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;
        const renderTask = page.render({
            canvasContext: ctx,
            viewport: viewport,
            transform: transform,
        });

        renderTasks.push(renderTask);
        return renderTask.promise;
    });
}

/* ═══ Annotation Layer ═══ */

function createAnnotationLayer(wrapper, pageNum) {
    const layer = document.createElement('div');
    layer.className = 'annotation-layer';
    layer.dataset.page = pageNum;

    const canvas = wrapper.querySelector('.page-canvas');
    layer.style.width = canvas.style.width;
    layer.style.height = canvas.style.height;

    layer.addEventListener('mousedown', onLayerMouseDown);
    wrapper.appendChild(layer);

    renderShapesForPage(pageNum, layer);
    return layer;
}

function renderShapesForPage(pageNum, layer) {
    // Preserve selection state
    layer.innerHTML = '';
    const shapes = anno.shapes.get(pageNum) || [];
    shapes.forEach((shape) => {
        const el = createShapeElement(shape);
        layer.appendChild(el);
    });
}

function createShapeElement(shape) {
    const el = document.createElement('div');
    el.className = 'shape';
    el.dataset.id = shape.id;
    el.style.left = shape.x + 'px';
    el.style.top = shape.y + 'px';
    el.style.width = Math.max(0, shape.w) + 'px';
    el.style.height = Math.max(0, shape.h) + 'px';

    if (shape.id === anno.selectedId) {
        el.classList.add('selected');
        addResizeHandles(el);
    }

    el.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        onShapeMouseDown(e, shape.id);
    });

    return el;
}

function updateShapeElement(shape, layer) {
    const el = layer.querySelector(`.shape[data-id="${shape.id}"]`);
    if (!el) return;
    el.style.left = shape.x + 'px';
    el.style.top = shape.y + 'px';
    el.style.width = Math.max(0, shape.w) + 'px';
    el.style.height = Math.max(0, shape.h) + 'px';
}

function addResizeHandles(el) {
    const positions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    positions.forEach((pos) => {
        const handle = document.createElement('div');
        handle.className = 'resize-handle ' + pos;
        handle.dataset.handle = pos;
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            onHandleMouseDown(e, el.dataset.id, pos);
        });
        el.appendChild(handle);
    });
}

/* ═══ Shape Helpers ═══ */

function findShape(pageNum, shapeId) {
    const shapes = anno.shapes.get(pageNum);
    if (!shapes) return null;
    return shapes.find((s) => s.id === shapeId) || null;
}

function deleteShape(pageNum, shapeId) {
    const shapes = anno.shapes.get(pageNum);
    if (!shapes) return;
    const idx = shapes.findIndex((s) => s.id === shapeId);
    if (idx !== -1) shapes.splice(idx, 1);
    if (anno.selectedId === shapeId) {
        anno.selectedId = null;
    }

    // Close sidebar if no shapes remain anywhere
    if (annoSidebar.open) {
        let anyShapes = false;
        for (const s of anno.shapes.values()) {
            if (s.length > 0) { anyShapes = true; break; }
        }
        if (!anyShapes) {
            closeSidebar();
        } else if (annoSidebar.pageNum === pageNum) {
            renderSidebar(pageNum, null);
        }
    }
}

function selectShape(shapeId) {
    anno.selectedId = shapeId;
    document.querySelectorAll('.shape.selected').forEach((el) => {
        el.classList.remove('selected');
        el.querySelectorAll('.resize-handle').forEach((h) => h.remove());
    });
    if (shapeId) {
        const el = document.querySelector(`.shape[data-id="${shapeId}"]`);
        if (el) {
            el.classList.add('selected');
            addResizeHandles(el);
        }
        els.deleteBtn.classList.remove('hidden');
        // Find page and open sidebar
        for (const [pageNum, shapes] of anno.shapes) {
            if (shapes.some((s) => s.id === shapeId)) {
                openSidebar(pageNum, shapeId);
                scrollSidebarToShape(shapeId);
                break;
            }
        }
    } else {
        els.deleteBtn.classList.add('hidden');
    }
}

function deselectShape() {
    selectShape(null);
}

/* ═══ Mouse Interaction ═══ */

function onLayerMouseDown(e) {
    if (e.button !== 0) return;
    if (e.target !== e.currentTarget) return;

    const layer = e.currentTarget;
    if (anno.selectedId) {
        deselectShape();
    } else {
        startCreate(e, layer);
    }
}

function onShapeMouseDown(e, shapeId) {
    if (e.button !== 0) return;
    const layer = e.currentTarget.closest('.annotation-layer');
    if (!layer) return;

    selectShape(shapeId);
    startMove(e, layer, shapeId);
}

function onHandleMouseDown(e, shapeId, handle) {
    if (e.button !== 0) return;
    const layer = e.target.closest('.annotation-layer');
    if (!layer) return;
    selectShape(shapeId);
    startResize(e, layer, shapeId, handle);
}

function startCreate(e, layer) {
    const pageNum = parseInt(layer.dataset.page, 10);
    const rect = layer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const shape = {
        id: 's' + anno.nextId++,
        type: 'rect',
        x,
        y,
        w: 0,
        h: 0,
        content: { text: '', drawing: null, mode: 'text' },
    };

    let shapes = anno.shapes.get(pageNum);
    if (!shapes) {
        shapes = [];
        anno.shapes.set(pageNum, shapes);
    }
    shapes.push(shape);

    const el = createShapeElement(shape);
    layer.appendChild(el);

    anno.drag = {
        type: 'create',
        pageNum,
        shapeId: shape.id,
        startX: x,
        startY: y,
        layer,
    };
}

function startMove(e, layer, shapeId) {
    const pageNum = parseInt(layer.dataset.page, 10);
    const shape = findShape(pageNum, shapeId);
    if (!shape) return;

    anno.drag = {
        type: 'move',
        pageNum,
        shapeId,
        startX: e.clientX,
        startY: e.clientY,
        origX: shape.x,
        origY: shape.y,
        layer,
    };
}

function startResize(e, layer, shapeId, handle) {
    const pageNum = parseInt(layer.dataset.page, 10);
    const shape = findShape(pageNum, shapeId);
    if (!shape) return;

    anno.drag = {
        type: 'resize',
        pageNum,
        shapeId,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        origX: shape.x,
        origY: shape.y,
        origW: shape.w,
        origH: shape.h,
        layer,
    };
}

function onMouseMove(e) {
    if (!anno.drag) return;
    const d = anno.drag;
    const shape = findShape(d.pageNum, d.shapeId);
    if (!shape) return;

    const layerRect = d.layer.getBoundingClientRect();

    if (d.type === 'create') {
        const mx = e.clientX - layerRect.left;
        const my = e.clientY - layerRect.top;
        let dx = mx - d.startX;
        let dy = my - d.startY;

        if (e.ctrlKey) {
            const size = Math.max(Math.abs(dx), Math.abs(dy));
            dx = Math.sign(dx || 1) * size;
            dy = Math.sign(dy || 1) * size;
        }

        shape.x = dx >= 0 ? d.startX : d.startX + dx;
        shape.y = dy >= 0 ? d.startY : d.startY + dy;
        shape.w = Math.abs(dx);
        shape.h = Math.abs(dy);

        updateShapeElement(shape, d.layer);
    } else if (d.type === 'move') {
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        shape.x = d.origX + dx;
        shape.y = d.origY + dy;
        updateShapeElement(shape, d.layer);
    } else if (d.type === 'resize') {
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        applyResize(shape, d.handle, dx, dy, e.ctrlKey);
        updateShapeElement(shape, d.layer);
    }
}

function onMouseUp(e) {
    if (!anno.drag) return;
    const d = anno.drag;
    const shape = findShape(d.pageNum, d.shapeId);

    if (shape && d.type === 'create') {
        if (shape.w < 4 || shape.h < 4) {
            deleteShape(d.pageNum, d.shapeId);
            renderShapesForPage(d.pageNum, d.layer);
        } else {
            selectShape(d.shapeId);
        }
    }

    anno.drag = null;
}

/* ═══ Annotation Sidebar ═══ */

function closeSidebar() {
    if (!annoSidebar.open) return;
    annoSidebar.open = false;
    annoSidebar.pageNum = null;
    els.annoSidebar.classList.add('hidden');
    els.viewerBody.classList.remove('sidebar-open');
}

function isEditingText() {
    return document.activeElement?.closest('.anno-card-editor') != null;
}

function deleteSelectedShape() {
    if (!anno.selectedId) return;
    const layer = document.querySelector('.shape.selected')?.closest('.annotation-layer');
    if (!layer) return;
    const pageNum = parseInt(layer.dataset.page, 10);
    deleteShape(pageNum, anno.selectedId);
    renderShapesForPage(pageNum, layer);
}

/* ═══ Sidebar Card List ═══ */

function openSidebar(pageNum, activeShapeId) {
    if (!annoSidebar.open) {
        annoSidebar.open = true;
        annoSidebar.pageNum = pageNum;
        els.annoSidebar.classList.remove('hidden');
        els.viewerBody.classList.add('sidebar-open');
    } else if (annoSidebar.pageNum !== pageNum) {
        annoSidebar.pageNum = pageNum;
    }
    renderSidebar(pageNum, activeShapeId);
}

function renderSidebar(pageNum, activeShapeId) {
    const body = els.annoSidebarBody;
    body.innerHTML = '';

    const shapes = anno.shapes.get(pageNum) || [];
    if (shapes.length === 0) {
        body.innerHTML = '<div class="anno-card-empty">No annotations on this page</div>';
        return;
    }

    // Sort shapes by Y position
    const sorted = [...shapes].sort((a, b) => a.y - b.y);

    sorted.forEach((shape) => {
        const isActive = shape.id === activeShapeId;

        const card = document.createElement('div');
        card.className = 'anno-card' + (isActive ? ' active' : '');
        card.dataset.shapeId = shape.id;
        card.dataset.page = pageNum;

        if (isActive) {
            buildExpandedCard(card, shape, pageNum);
        } else {
            buildCollapsedCard(card, shape, pageNum);
        }

        body.appendChild(card);
    });

    // Scroll to active card
    if (activeShapeId) {
        scrollSidebarToShape(activeShapeId);
    }
}

function scrollSidebarToShape(shapeId) {
    const el = els.annoSidebarBody.querySelector(`.anno-card[data-shape-id="${shapeId}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function buildCollapsedCard(card, shape, pageNum) {
    const content = shape.content || {};
    const text = content.text || '';

    card.innerHTML = `
        <div class="anno-card-header">
            <span class="anno-card-label">Annotation</span>
        </div>
        <div class="anno-card-text">${escapeHtml(text) || ''}</div>
    `;

    card.addEventListener('click', () => selectShapeFromSidebar(shape.id, pageNum));
}

function buildExpandedCard(card, shape, pageNum) {
    const content = shape.content || {};
    const text = content.text || '';
    const mode = content.mode || 'text';
    const hasDrawing = !!content.drawing;

    card.innerHTML = `
        <div class="anno-card-header">
            <span class="anno-card-label">Annotation</span>
            <button class="anno-card-collapse" title="Collapse">&#9650;</button>
        </div>
        <div class="anno-card-body">
            <div class="anno-card-editor" contenteditable="true">${textToHtml(text)}</div>
            <div class="anno-card-draw-area${mode === 'draw' ? '' : ' hidden'}">
                <canvas class="anno-card-draw-canvas"></canvas>
                <div class="anno-card-draw-actions">
                    <button class="anno-card-draw-clear toolbar-btn" style="font-size:0.75rem;height:26px;width:auto;padding:0 10px;">Clear</button>
                </div>
            </div>
        </div>
        <div class="anno-card-controls">
            <button class="anno-card-mode-btn${mode === 'text' ? ' active' : ''}" data-mode="text">T</button>
            <button class="anno-card-mode-btn${mode === 'draw' ? ' active' : ''}" data-mode="draw">&#9998;</button>
            <div class="anno-card-spacer"></div>
            <button class="anno-card-delete toolbar-btn" title="Delete">&#128465;</button>
        </div>
    `;

    // Collapse button
    card.querySelector('.anno-card-collapse').addEventListener('click', (e) => {
        e.stopPropagation();
        // Re-render sidebar with this shape collapsed
        const el = els.annoSidebarBody.querySelector(`.anno-card[data-shape-id="${shape.id}"]`);
        if (el) {
            const activeEl = els.annoSidebarBody.querySelector('.anno-card.active');
            if (activeEl) saveCardContent(activeEl);
        }
        renderSidebar(pageNum, null);
        deselectShape();
    });

    // Text editor auto-save
    const editor = card.querySelector('.anno-card-editor');
    editor.addEventListener('input', () => {
        if (!shape.content) shape.content = { text: '', drawing: null, mode: 'text' };
        shape.content.text = editor.innerText || '';
    });
    // Prevent clicks on editor from propagating (which would collapse)
    editor.addEventListener('mousedown', (e) => e.stopPropagation());

    // Mode buttons
    card.querySelectorAll('.anno-card-mode-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newMode = btn.dataset.mode;
            saveCardContent(card);
            if (!shape.content) shape.content = { text: '', drawing: null, mode: 'text' };
            shape.content.mode = newMode;
            buildExpandedCard(card, shape, pageNum);
        });
    });

    // Delete button
    card.querySelector('.anno-card-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteShape(pageNum, shape.id);
        renderShapesForPage(pageNum, document.querySelector(`.annotation-layer[data-page="${pageNum}"]`));
        renderSidebar(pageNum, null);
        deselectShape();
    });

    // Drawing canvas
    const drawCanvas = card.querySelector('.anno-card-draw-canvas');
    if (drawCanvas) {
        setupCardDrawing(drawCanvas, shape, card);
    }

    // Clear drawing button
    const clearBtn = card.querySelector('.anno-card-draw-clear');
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (drawCanvas) {
                const ctx = drawCanvas.getContext('2d');
                ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
                if (shape.content) shape.content.drawing = null;
            }
        });
    }
}

function saveCardContent(card) {
    const shapeId = card.dataset.shapeId;
    const pageNum = parseInt(card.dataset.page, 10);
    const shape = findShape(pageNum, shapeId);
    if (!shape) return;
    if (!shape.content) shape.content = { text: '', drawing: null, mode: 'text' };

    const editor = card.querySelector('.anno-card-editor');
    if (editor) shape.content.text = editor.innerText || '';

    const drawCanvas = card.querySelector('.anno-card-draw-canvas');
    if (drawCanvas) {
        // Check if canvas has any content
        const ctx = drawCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
        const hasContent = Array.from(imageData.data).some(v => v !== 0);
        if (hasContent) {
            shape.content.drawing = drawCanvas.toDataURL();
        }
    }
}

function setupCardDrawing(canvas, shape, card) {
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#d4a853';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Size the canvas
    function sizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = 120;
        ctx.strokeStyle = '#d4a853';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }
    sizeCanvas();

    // Restore existing drawing
    const content = shape.content || {};
    if (content.drawing) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = content.drawing;
    }

    let drawing = false;

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function startDraw(e) {
        e.stopPropagation();
        const pos = getPos(e);
        drawing = true;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }

    function moveDraw(e) {
        if (!drawing) return;
        e.preventDefault();
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }

    function endDraw() {
        if (!drawing) return;
        drawing = false;
        // Save drawing to shape
        if (!shape.content) shape.content = { text: '', drawing: null, mode: 'text' };
        shape.content.drawing = canvas.toDataURL();
    }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', moveDraw);
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('mouseleave', endDraw);

    canvas.addEventListener('touchstart', startDraw, { passive: true });
    canvas.addEventListener('touchmove', moveDraw, { passive: false });
    canvas.addEventListener('touchend', endDraw, { passive: true });
}

function selectShapeFromSidebar(shapeId, pageNum) {
    // Select the shape on the PDF
    selectShape(shapeId);

    // Scroll page to bring the box into view
    const wrapper = document.querySelector(`.page-wrapper[data-page="${pageNum}"]`);
    if (wrapper) {
        wrapper.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function textToHtml(str) {
    if (!str) return '';
    return escapeHtml(str).replace(/\n/g, '<br>');
}

function applyResize(shape, handle, dx, dy, ctrlKey) {
    let { x, y, w, h } = shape;
    const { origX, origY, origW, origH } = anno.drag;

    // Compute unconstrained new values
    switch (handle) {
        case 'se':
            w = origW + dx;
            h = origH + dy;
            x = origX;
            y = origY;
            break;
        case 'sw':
            w = origW - dx;
            h = origH + dy;
            x = origX + dx;
            y = origY;
            break;
        case 'ne':
            w = origW + dx;
            h = origH - dy;
            x = origX;
            y = origY + dy;
            break;
        case 'nw':
            w = origW - dx;
            h = origH - dy;
            x = origX + dx;
            y = origY + dy;
            break;
        case 'e':
            w = origW + dx;
            h = origH;
            x = origX;
            y = origY;
            break;
        case 'w':
            w = origW - dx;
            h = origH;
            x = origX + dx;
            y = origY;
            break;
        case 's':
            w = origW;
            h = origH + dy;
            x = origX;
            y = origY;
            break;
        case 'n':
            w = origW;
            h = origH - dy;
            x = origX;
            y = origY + dy;
            break;
    }

    if (ctrlKey) {
        const size = Math.max(Math.abs(w), Math.abs(h));
        w = size;
        h = size;

        // Adjust position so the opposite corner/edge stays fixed
        switch (handle) {
            case 'se':
                x = origX;
                y = origY;
                break;
            case 'sw':
                x = origX + origW - w;
                y = origY;
                break;
            case 'ne':
                x = origX;
                y = origY + origH - h;
                break;
            case 'nw':
                x = origX + origW - w;
                y = origY + origH - h;
                break;
            case 'e':
                x = origX;
                y = origY + (origH - h) / 2;
                break;
            case 'w':
                x = origX + origW - w;
                y = origY + (origH - h) / 2;
                break;
            case 's':
                x = origX + (origW - w) / 2;
                y = origY;
                break;
            case 'n':
                x = origX + (origW - w) / 2;
                y = origY + origH - h;
                break;
        }
    }

    // Enforce minimums
    if (w < 4) {
        if (handle === 'nw' || handle === 'sw' || handle === 'w') {
            x = origX + origW - 4;
        }
        w = 4;
    }
    if (h < 4) {
        if (handle === 'nw' || handle === 'ne' || handle === 'n') {
            y = origY + origH - 4;
        }
        h = 4;
    }

    shape.x = x;
    shape.y = y;
    shape.w = w;
    shape.h = h;
}

/* ═══ Page Observer ═══ */

function setupPageObserver() {
    if (pageObserver) pageObserver.disconnect();

    pageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const pageNum = parseInt(entry.target.dataset.page, 10);
                if (pageNum !== state.currentPage) {
                    state.currentPage = pageNum;
                    schedulePageUpdate();
                    // Re-render sidebar for the new page
                    if (annoSidebar.open && annoSidebar.pageNum !== pageNum) {
                        annoSidebar.pageNum = pageNum;
                        renderSidebar(pageNum, null);
                    }
                }
            }
        });
    }, {
        root: els.pageContainer,
        threshold: [0, 0.3, 0.6, 1],
    });

    document.querySelectorAll('.page-wrapper').forEach((el) => pageObserver.observe(el));
}

let pageUpdatePending = false;

function schedulePageUpdate() {
    if (pageUpdatePending) return;
    pageUpdatePending = true;
    requestAnimationFrame(() => {
        updatePageIndicator();
        pageUpdatePending = false;
    });
}

/* ═══ Zoom Controls ═══ */

function zoomIn() {
    const oldScale = state.scale;
    const newScale = state.scale * SCALE_STEP;
    if (newScale <= SCALE_MAX) {
        applyZoom(newScale, oldScale);
    }
}

function zoomOut() {
    const oldScale = state.scale;
    const newScale = state.scale / SCALE_STEP;
    if (newScale >= SCALE_MIN) {
        applyZoom(newScale, oldScale);
    }
}

function fitToWidth() {
    if (!state.pdfDoc) return;
    const containerWidth = els.pageContainer.clientWidth - 48;
    state.pdfDoc.getPage(1).then((page) => {
        const baseViewport = page.getViewport({ scale: 1 });
        const oldScale = state.scale;
        const newScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, (containerWidth - 4) / baseViewport.width));
        applyZoom(newScale, oldScale);
    });
}

function applyZoom(newScale, oldScale) {
    state.scale = newScale;
    updateZoomDisplay();
    updateZoomButtons();

    // Scale existing shape coordinates
    const ratio = newScale / oldScale;
    if (ratio !== 1) {
        anno.shapes.forEach((shapes) => {
            shapes.forEach((s) => {
                s.x *= ratio;
                s.y *= ratio;
                s.w *= ratio;
                s.h *= ratio;
            });
        });
    }

    reRenderAllPages();
}

function updateZoomDisplay() {
    els.zoomLevel.textContent = `${Math.round(state.scale * 100)}%`;
}

function updateZoomButtons() {
    els.zoomOut.disabled = state.scale <= SCALE_MIN;
    els.zoomIn.disabled = state.scale >= SCALE_MAX;
}

function updatePageIndicator() {
    els.pageIndicator.textContent = `Page ${state.currentPage} of ${state.totalPages}`;
}

/* ═══ Touch Pinch-to-Zoom ═══ */

let touchPinch = null;

function onTouchStart(e) {
    if (e.touches.length === 2) {
        touchPinch = {
            startDist: Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            ),
            startScale: state.scale,
        };
    }
}

function onTouchMove(e) {
    if (e.touches.length === 2 && touchPinch) {
        e.preventDefault();
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        const ratio = dist / touchPinch.startDist;
        const newScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, touchPinch.startScale * ratio));

        if (Math.abs(ratio - 1) > 0.02) {
            const oldScale = state.scale;
            applyZoom(newScale, oldScale);
            touchPinch.startDist = dist;
            touchPinch.startScale = newScale;
        }
    }
}

function onTouchEnd() {
    touchPinch = null;
}

/* ═══ Scroll Handling ═══ */

function onScroll() {
    const scrollTop = els.pageContainer.scrollTop;
    els.toolbar.classList.toggle('is-scrolled', scrollTop > 4);
}

/* ═══ Wheel Zoom ═══ */

function onWheel(e) {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
            zoomIn();
        } else {
            zoomOut();
        }
    }
}

/* ═══ Keyboard Shortcuts ═══ */

function onKeyDown(e) {
    if (state.view !== 'viewer') return;

    // Delete selected shape (Delete key only — Backspace is for text editing)
    if (e.key === 'Delete' && !isEditingText()) {
        deleteSelectedShape();
    } else if (e.key === 'Escape') {
        deselectShape();
    }

    // Zoom shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault();
        zoomIn();
    } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        zoomOut();
    } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        fitToWidth();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveSession();
    }
}

/* ═══ Loading / Error UI ═══ */

function showLoading(msg) {
    els.loadingText.textContent = msg || 'Loading PDF\u2026';
    els.loadingOverlay.classList.remove('hidden');
    void els.loadingOverlay.offsetWidth;
    els.loadingOverlay.classList.add('visible');
}

function hideLoading() {
    els.loadingOverlay.classList.remove('visible');
    setTimeout(() => {
        els.loadingOverlay.classList.add('hidden');
    }, 300);
}

let errorTimeout = null;

function showError(msg) {
    els.errorText.textContent = msg;
    els.errorToast.classList.remove('hidden');
    void els.errorToast.offsetWidth;
    els.errorToast.classList.add('visible');

    if (errorTimeout) clearTimeout(errorTimeout);
    errorTimeout = setTimeout(() => {
        els.errorToast.classList.remove('visible');
        setTimeout(() => els.errorToast.classList.add('hidden'), 300);
    }, 4000);
}

/* ═══ Persistence ═══ */

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

function serializeShapes(shapesMap) {
    const arr = [];
    for (const [pageNum, pageShapes] of shapesMap) {
        arr.push([pageNum, pageShapes]);
    }
    return arr;
}

function deserializeShapes(arr) {
    const map = new Map();
    for (const [pageNum, pageShapes] of arr) {
        map.set(pageNum, pageShapes);
    }
    return map;
}

function saveSession() {
    if (!state.pdfBuffer || !state.fileName) return;

    const pdfBase64 = arrayBufferToBase64(state.pdfBuffer);
    const data = {
        pdfBase64,
        fileName: state.fileName,
        scale: state.scale,
        nextId: anno.nextId,
        shapes: serializeShapes(anno.shapes),
    };

    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = state.fileName.replace(/\.pdf$/i, '') + '.annotations';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function onImportSelect(e) {
    const file = e.target.files[0];
    if (file) importSession(file);
    e.target.value = '';
}

function importSession(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.pdfBase64 || !data.shapes) {
                showError('Invalid session file.');
                return;
            }
            const buffer = base64ToArrayBuffer(data.pdfBase64);
            restoreFromSession(buffer, data.fileName || 'document.pdf', data);
        } catch (err) {
            console.error(err);
            showError('Failed to parse session file.');
        }
    };
    reader.readAsText(file);
}

function restoreFromSession(buffer, fileName, sessionData) {
    if (state.pdfDoc) {
        state.pdfDoc.destroy();
        state.pdfDoc = null;
    }

    state.pdfBuffer = buffer;
    state.fileName = fileName;
    state.scale = sessionData.scale || 1;
    anno.nextId = sessionData.nextId || 1;
    anno.shapes = deserializeShapes(sessionData.shapes || []);
    anno.selectedId = null;
    anno.drag = null;

    firstRenderDone = true;
    showLoading(`Restoring "${fileName}"`);

    const data = new Uint8Array(buffer);
    pdfjsLib.getDocument({ data }).promise
        .then((pdf) => {
            state.pdfDoc = pdf;
            state.totalPages = pdf.numPages;
            state.currentPage = 1;
            switchToViewer();
            renderAllPages();
        })
        .catch((err) => {
            console.error(err);
            hideLoading();
            showError('Failed to load PDF from session file.');
        });
}

function exportFlattenedPDF() {
    if (!state.pdfBuffer) return;

    showLoading('Exporting PDF\u2026');

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
    script.onload = async () => {
        try {
            const pdfDoc = await PDFLib.PDFDocument.load(state.pdfBuffer);
            const pages = pdfDoc.getPages();

            for (const [pageNum, shapes] of anno.shapes) {
                const pdfPage = pages[pageNum - 1];
                if (!pdfPage) continue;

                const pageHeight = pdfPage.getHeight();

                for (const shape of shapes) {
                    const x = shape.x / state.scale;
                    const y = shape.y / state.scale;
                    const w = shape.w / state.scale;
                    const h = shape.h / state.scale;

                    pdfPage.drawRectangle({
                        x: x,
                        y: pageHeight - (y + h),
                        width: w,
                        height: h,
                        borderColor: PDFLib.rgb(212 / 255, 168 / 255, 83 / 255),
                        borderWidth: 2,
                        color: PDFLib.rgba(212 / 255, 168 / 255, 83 / 255, 0.08),
                    });
                }
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = state.fileName.replace(/\.pdf$/i, '') + '_annotated.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            hideLoading();
        } catch (err) {
            console.error(err);
            hideLoading();
            showError('Failed to export PDF.');
        }
    };
    script.onerror = () => {
        hideLoading();
        showError('Failed to load PDF export library.');
    };
    document.head.appendChild(script);
}

/* ═══ Start ═══ */
init();
