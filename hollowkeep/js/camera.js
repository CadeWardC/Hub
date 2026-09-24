// ========================================
// HOLLOWKEEP - CAMERA
// One-finger pan with inertia, pinch zoom that snaps to three levels, clamping
// to the map edges, and tap detection. Mouse drag pans like a finger; the wheel
// steps through zoom levels around the cursor. A `dragHandler` may claim a
// one-finger drag (e.g. moving a building ghost) instead of panning.
// ========================================

(function (HK) {
    'use strict';

    const ZOOM_LEVELS = [0.75, 1.5, 3];
    const TAP_MAX_MOVE = 12;        // screen px
    const TAP_MAX_MS = 350;
    const FRICTION = 6;             // exponential decay per second
    const MIN_FLING_SPEED = 30;     // world px/s
    const MAX_FLING_SPEED = 5000;   // screen px/s
    const VELOCITY_WINDOW_MS = 100;
    const EDGE_MARGIN = 48;         // world px of slack past the map edge
    const ZOOM_SNAP_MS = 180;

    class Camera {
        constructor(element) {
            this.el = element;
            this.x = 0;
            this.y = 0;
            this.level = 1;
            this.zoom = ZOOM_LEVELS[this.level];
            this.bounds = null;
            this.onTap = null;
            this.onLevelChange = null;
            this.dragHandler = null;   // {begin(wx, wy) -> bool, move(wx, wy), end()}
            this.dragging = false;

            this.pointers = new Map(); // id -> {x, y}
            this.vx = 0;
            this.vy = 0;
            this.samples = [];         // [ms, dxWorld, dyWorld]
            this.tap = null;           // {x, y, t} while a tap is still possible
            this.pinch = null;         // {cx, cy, dist}
            this.anim = null;          // zoom snap animation

            element.addEventListener('pointerdown', e => this.onDown(e));
            element.addEventListener('pointermove', e => this.onMove(e));
            element.addEventListener('pointerup', e => this.onUp(e));
            element.addEventListener('pointercancel', e => this.onUp(e, true));
            element.addEventListener('wheel', e => {
                e.preventDefault();
                const p = this.local(e);
                this.stepZoom(e.deltaY < 0 ? 1 : -1, p.x, p.y);
            }, { passive: false });
        }

        get viewW() { return this.el.clientWidth; }
        get viewH() { return this.el.clientHeight; }

        setBounds(w, h) {
            this.bounds = { w, h };
            this.clamp();
        }

        jumpTo(x, y) {
            this.x = x;
            this.y = y;
            this.vx = this.vy = 0;
            this.clamp();
        }

        screenToWorld(sx, sy) {
            return {
                x: this.x + (sx - this.viewW / 2) / this.zoom,
                y: this.y + (sy - this.viewH / 2) / this.zoom
            };
        }

        stepZoom(dir, ax, ay) {
            this.animateTo(Math.max(0, Math.min(ZOOM_LEVELS.length - 1, this.level + dir)), ax, ay);
        }

        update(dt, nowMs) {
            if (this.anim) {
                const a = this.anim;
                const t = Math.min((nowMs - a.start) / ZOOM_SNAP_MS, 1);
                const k = 1 - Math.pow(1 - t, 3); // ease-out cubic
                this.setZoomAnchored(a.from + (a.to - a.from) * k, a.ax, a.ay);
                if (t >= 1) this.anim = null;
            }
            if (this.pointers.size === 0 && (this.vx || this.vy)) {
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                const decay = Math.exp(-FRICTION * dt);
                this.vx *= decay;
                this.vy *= decay;
                if (Math.hypot(this.vx, this.vy) < MIN_FLING_SPEED) this.vx = this.vy = 0;
                this.clamp();
            }
        }

        // ---- pointer handling ----

        local(e) {
            const r = this.el.getBoundingClientRect();
            return { x: e.clientX - r.left, y: e.clientY - r.top };
        }

        onDown(e) {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            try { this.el.setPointerCapture(e.pointerId); } catch (_) { /* synthetic pointers */ }
            const p = this.local(e);
            this.pointers.set(e.pointerId, p);
            this.vx = this.vy = 0;
            this.samples = [];
            this.anim = null;
            if (this.pointers.size === 1) {
                this.tap = { x: p.x, y: p.y, t: performance.now() };
                const w = this.screenToWorld(p.x, p.y);
                this.dragging = !!(this.dragHandler && this.dragHandler.begin(w.x, w.y));
            } else {
                this.tap = null;
                this.endDrag();
                this.beginPinch();
            }
        }

        onMove(e) {
            const prev = this.pointers.get(e.pointerId);
            if (!prev) return;
            const p = this.local(e);
            this.pointers.set(e.pointerId, p);
            if (this.pointers.size === 1 && this.dragging) {
                const w = this.screenToWorld(p.x, p.y);
                this.dragHandler.move(w.x, w.y);
                if (this.tap && Math.hypot(p.x - this.tap.x, p.y - this.tap.y) > TAP_MAX_MOVE) this.tap = null;
            } else if (this.pointers.size === 1) {
                const dx = -(p.x - prev.x) / this.zoom;
                const dy = -(p.y - prev.y) / this.zoom;
                this.x += dx;
                this.y += dy;
                this.clamp();
                const now = performance.now();
                this.samples.push([now, dx, dy]);
                while (this.samples.length && now - this.samples[0][0] > VELOCITY_WINDOW_MS) this.samples.shift();
                if (this.tap && Math.hypot(p.x - this.tap.x, p.y - this.tap.y) > TAP_MAX_MOVE) this.tap = null;
            } else {
                this.updatePinch();
            }
        }

        onUp(e, cancelled) {
            if (!this.pointers.has(e.pointerId)) return;
            const wasPinching = this.pointers.size >= 2;
            const p = this.local(e);
            this.pointers.delete(e.pointerId);
            if (this.tap && this.pointers.size === 0) {
                const t = this.tap;
                this.tap = null;
                if (!cancelled && Math.hypot(p.x - t.x, p.y - t.y) <= TAP_MAX_MOVE
                        && performance.now() - t.t <= TAP_MAX_MS && this.onTap) {
                    const w = this.screenToWorld(p.x, p.y);
                    this.onTap(w.x, w.y);
                }
            }
            if (wasPinching) {
                if (this.pointers.size >= 2) {
                    this.beginPinch();
                } else {
                    this.samples = []; // the remaining finger continues as a pan from here
                    this.snapZoom(this.pinch.cx, this.pinch.cy);
                    this.pinch = null;
                }
            } else if (this.pointers.size === 0) {
                if (this.dragging) this.endDrag();
                else this.estimateVelocity();
            }
        }

        endDrag() {
            if (!this.dragging) return;
            this.dragging = false;
            this.samples = [];
            if (this.dragHandler) this.dragHandler.end();
        }

        pinchPoints() {
            const it = this.pointers.values();
            return [it.next().value, it.next().value];
        }

        beginPinch() {
            const [a, b] = this.pinchPoints();
            this.pinch = { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, dist: Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1) };
        }

        updatePinch() {
            const [a, b] = this.pinchPoints();
            const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
            const dist = Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1);
            const anchor = this.screenToWorld(this.pinch.cx, this.pinch.cy);
            const lo = ZOOM_LEVELS[0] * 0.8, hi = ZOOM_LEVELS[ZOOM_LEVELS.length - 1] * 1.25;
            this.zoom = Math.max(lo, Math.min(hi, this.zoom * dist / this.pinch.dist));
            // keep the world point under the fingers under the fingers (also pans with two fingers)
            this.x = anchor.x - (cx - this.viewW / 2) / this.zoom;
            this.y = anchor.y - (cy - this.viewH / 2) / this.zoom;
            this.clamp();
            this.pinch = { cx, cy, dist };
        }

        snapZoom(ax, ay) {
            let best = 0;
            ZOOM_LEVELS.forEach((z, i) => {
                if (Math.abs(Math.log(this.zoom / z)) < Math.abs(Math.log(this.zoom / ZOOM_LEVELS[best]))) best = i;
            });
            this.animateTo(best, ax, ay);
        }

        animateTo(level, ax, ay) {
            const changed = level !== this.level;
            this.level = level;
            const target = ZOOM_LEVELS[level];
            this.anim = Math.abs(this.zoom - target) > 1e-4
                ? { from: this.zoom, to: target, ax, ay, start: performance.now() }
                : null;
            if (changed && this.onLevelChange) this.onLevelChange(level);
        }

        setZoomAnchored(z, ax, ay) {
            const w = this.screenToWorld(ax, ay);
            this.zoom = z;
            this.x = w.x - (ax - this.viewW / 2) / z;
            this.y = w.y - (ay - this.viewH / 2) / z;
            this.clamp();
        }

        estimateVelocity() {
            const now = performance.now();
            let dx = 0, dy = 0, oldest = now;
            for (const [t, sx, sy] of this.samples) {
                if (now - t <= VELOCITY_WINDOW_MS) { dx += sx; dy += sy; oldest = Math.min(oldest, t); }
            }
            this.samples = [];
            const span = Math.max(now - oldest, 16) / 1000;
            let vx = dx / span, vy = dy / span;
            const max = MAX_FLING_SPEED / this.zoom, speed = Math.hypot(vx, vy);
            if (speed > max) { vx *= max / speed; vy *= max / speed; }
            this.vx = vx;
            this.vy = vy;
        }

        clamp() {
            if (!this.bounds) return;
            const hw = this.viewW / 2 / this.zoom, hh = this.viewH / 2 / this.zoom;
            const clampAxis = (v, size, half, axis) => {
                const lo = -EDGE_MARGIN + half, hi = size + EDGE_MARGIN - half;
                const c = lo > hi ? size / 2 : Math.max(lo, Math.min(hi, v));
                if (c !== v) this[axis] = 0;
                return c;
            };
            this.x = clampAxis(this.x, this.bounds.w, hw, 'vx');
            this.y = clampAxis(this.y, this.bounds.h, hh, 'vy');
        }
    }

    Object.assign(HK, { Camera, ZOOM_LEVELS });
})(globalThis.HK = globalThis.HK || {});
