// ========================================
// HOLLOWKEEP - SIMULATION
// Pure data + logic, advanced only by SimClock's fixed tick. No DOM, no canvas,
// so it also runs under Node for benchmarking.
// ========================================

(function (HK) {
    'use strict';

    // ---- Tiles -------------------------------------------------------------

    const TILE = { WATER: 0, GRASS: 1, FOREST: 2, ROCK: 3, ORE: 4, CLIFF: 5 };

    const TILE_DEFS = [
        { id: 'water',  name: 'Water',  color: '#33687d', accent: '#1f3f55', walkable: false, info: 'Impassable. Blocks monsters as well as villagers.' },
        { id: 'grass',  name: 'Grass',  color: '#6b8a3a', accent: '#8fa850', walkable: true,  info: 'Open ground. Good for farms and buildings.' },
        { id: 'forest', name: 'Forest', color: '#3e6035', accent: '#5a7f43', walkable: true,  info: 'Trees. Source of wood; slows movement later.' },
        { id: 'rock',   name: 'Rock',   color: '#6f6a64', accent: '#8d877e', walkable: false, info: 'Stone outcrop. Quarry it for stone.' },
        { id: 'ore',    name: 'Ore',    color: '#65605a', accent: '#d4a84b', walkable: false, info: 'Rock with an ore seam. Mine it for ore (and the odd gold nugget).' },
        { id: 'cliff',  name: 'Cliff',  color: '#86704f', accent: '#b39a70', walkable: false, info: 'Land raised by your hand. Blocks villagers; monsters must smash through it.' }
    ];

    // ---- Seeded randomness -------------------------------------------------

    // mulberry32: small, fast, deterministic per seed
    function makeRng(seed) {
        let a = seed >>> 0;
        const next = () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        return {
            next,
            range: (lo, hi) => lo + next() * (hi - lo),
            int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1))
        };
    }

    // 2D simplex noise with a seeded permutation table, plus fractal (fBm) sum.
    function makeNoise(seed, frequency, octaves) {
        const rng = makeRng(seed);
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(rng.next() * (i + 1));
            const t = p[i]; p[i] = p[j]; p[j] = t;
        }
        const perm = new Uint8Array(512);
        for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
        const GX = [1, -1, 1, -1, 1, -1, 0, 0];
        const GY = [1, 1, -1, -1, 0, 0, 1, -1];
        const F2 = 0.5 * (Math.sqrt(3) - 1);
        const G2 = (3 - Math.sqrt(3)) / 6;

        function simplex(xin, yin) {
            const s = (xin + yin) * F2;
            const i = Math.floor(xin + s);
            const j = Math.floor(yin + s);
            const t = (i + j) * G2;
            const x0 = xin - (i - t);
            const y0 = yin - (j - t);
            const i1 = x0 > y0 ? 1 : 0;
            const j1 = x0 > y0 ? 0 : 1;
            const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
            const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
            const ii = i & 255, jj = j & 255;
            let n = 0;
            let t0 = 0.5 - x0 * x0 - y0 * y0;
            if (t0 > 0) { const g = perm[ii + perm[jj]] & 7; t0 *= t0; n += t0 * t0 * (GX[g] * x0 + GY[g] * y0); }
            let t1 = 0.5 - x1 * x1 - y1 * y1;
            if (t1 > 0) { const g = perm[ii + i1 + perm[jj + j1]] & 7; t1 *= t1; n += t1 * t1 * (GX[g] * x1 + GY[g] * y1); }
            let t2 = 0.5 - x2 * x2 - y2 * y2;
            if (t2 > 0) { const g = perm[ii + 1 + perm[jj + 1]] & 7; t2 *= t2; n += t2 * t2 * (GX[g] * x2 + GY[g] * y2); }
            return 70 * n; // roughly -1..1
        }

        return function fbm(x, y) {
            let sum = 0, amp = 1, norm = 0, f = frequency;
            for (let o = 0; o < octaves; o++) {
                sum += simplex(x * f, y * f) * amp;
                norm += amp;
                amp *= 0.5;
                f *= 2;
            }
            return sum / norm;
        };
    }

    // ---- World map ---------------------------------------------------------

    const GEN = {
        WATER_LEVEL: 0.34,
        ROCK_LEVEL: 0.70,
        FOREST_MOISTURE: 0.56,
        ORE_THRESHOLD: 0.62,
        CENTER_PULL: 0.7 // pulls the middle towards grassland height so the start is buildable
    };

    class WorldMap {
        constructor(width, height, seed) {
            this.width = width;
            this.height = height;
            this.seed = seed;
            this.tiles = new Uint8Array(width * height);
            this.heights = new Float32Array(width * height);
            this.landTiles = [];
            this.startTile = { x: width >> 1, y: height >> 1 };
            this.dirty = []; // tile indices changed after generation; the renderer repaints them
        }

        idx(x, y) { return y * this.width + x; }
        inBounds(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }
        tileAt(x, y) { return this.tiles[this.idx(x, y)]; }
        heightAt(x, y) { return this.heights[this.idx(x, y)]; }
        isWalkable(x, y) { return this.inBounds(x, y) && TILE_DEFS[this.tiles[this.idx(x, y)]].walkable; }

        setTile(x, y, type) {
            const i = this.idx(x, y);
            if (this.tiles[i] === type) return;
            this.tiles[i] = type;
            this.dirty.push(i);
        }

        finalize() {
            this.landTiles = [];
            for (let i = 0; i < this.tiles.length; i++) {
                if (TILE_DEFS[this.tiles[i]].walkable) this.landTiles.push(i);
            }
            this.startTile = this.nearestWalkable(this.width >> 1, this.height >> 1);
        }

        nearestWalkable(fx, fy) {
            const maxR = Math.max(this.width, this.height);
            for (let r = 0; r < maxR; r++) {
                for (let y = fy - r; y <= fy + r; y++) {
                    for (let x = fx - r; x <= fx + r; x++) {
                        if (Math.max(Math.abs(x - fx), Math.abs(y - fy)) === r && this.isWalkable(x, y)) return { x, y };
                    }
                }
            }
            return { x: fx, y: fy };
        }
    }

    // Layered noise: elevation decides water / land / rock, moisture decides forest,
    // a third layer places ore seams in and around rock.
    function generateMap(width, height, seed) {
        const map = new WorldMap(width, height, seed);
        const elevation = makeNoise(seed, 0.03, 5);
        const moisture = makeNoise(seed + 1, 0.055, 3);
        const ore = makeNoise(seed + 2, 0.14, 2);

        const raw = new Float32Array(width * height);
        let lo = Infinity, hi = -Infinity;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const v = elevation(x, y);
                raw[map.idx(x, y)] = v;
                if (v < lo) lo = v;
                if (v > hi) hi = v;
            }
        }

        const cx = width / 2, cy = height / 2;
        const maxDist = Math.hypot(cx, cy);
        const mid = (GEN.WATER_LEVEL + GEN.ROCK_LEVEL) / 2;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = map.idx(x, y);
                let e = (raw[i] - lo) / (hi - lo);
                const d = Math.hypot(x - cx, y - cy) / maxDist;
                e += (mid - e) * GEN.CENTER_PULL * (1 - smoothstep(0.05, 0.4, d));
                map.heights[i] = e;

                const m = moisture(x, y) * 0.5 + 0.5;
                const o = ore(x, y) * 0.5 + 0.5;
                let type = TILE.GRASS;
                if (e < GEN.WATER_LEVEL) type = TILE.WATER;
                else if (e > GEN.ROCK_LEVEL) type = o > GEN.ORE_THRESHOLD ? TILE.ORE : TILE.ROCK;
                else if (e > GEN.ROCK_LEVEL - 0.03 && o > GEN.ORE_THRESHOLD + 0.08) type = TILE.ORE;
                else if (m > GEN.FOREST_MOISTURE) type = TILE.FOREST;
                map.tiles[i] = type;
            }
        }
        map.finalize();
        return map;
    }

    function smoothstep(a, b, x) {
        const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
        return t * t * (3 - 2 * t);
    }

    // ---- Wanderers (dummy villagers for the perf test) ---------------------
    // Each picks a nearby walkable tile, walks there in a straight line, idles, repeats.
    // Positions are in tile units; prev* hold last tick's positions for interpolation.

    const WANDER = { SPAWN_RADIUS: 32, RADIUS: 8, MIN_SPEED: 0.10, MAX_SPEED: 0.18 };

    class Wanderers {
        constructor(map, seed, count) {
            this.map = map;
            this.rng = makeRng(seed ^ 0x9e3779b9);
            this.count = 0;
            this.capacity = 0;
            this.x = new Float32Array(0); this.y = new Float32Array(0);
            this.px = new Float32Array(0); this.py = new Float32Array(0);
            this.tx = new Float32Array(0); this.ty = new Float32Array(0);
            this.wait = new Int32Array(0);
            this.speed = new Float32Array(0);
            const s = map.startTile;
            this.spawnTiles = map.landTiles.filter(i =>
                Math.hypot((i % map.width) - s.x, Math.floor(i / map.width) - s.y) <= WANDER.SPAWN_RADIUS);
            if (this.spawnTiles.length === 0) this.spawnTiles = map.landTiles;
            this.setCount(count);
        }

        grow(n) {
            const cap = Math.max(n, this.capacity * 2, 64);
            for (const k of ['x', 'y', 'px', 'py', 'tx', 'ty', 'speed']) {
                const a = new Float32Array(cap); a.set(this[k]); this[k] = a;
            }
            const w = new Int32Array(cap); w.set(this.wait); this.wait = w;
            this.capacity = cap;
        }

        setCount(n) {
            n = this.spawnTiles.length ? Math.max(0, n) : 0;
            if (n > this.capacity) this.grow(n);
            const rng = this.rng, w = this.map.width;
            while (this.count < n) {
                const i = this.count;
                const t = this.spawnTiles[rng.int(0, this.spawnTiles.length - 1)];
                const x = (t % w) + 0.5, y = Math.floor(t / w) + 0.5;
                this.x[i] = this.px[i] = x;
                this.y[i] = this.py[i] = y;
                this.pickTarget(i, x, y);
                this.wait[i] = rng.int(0, 20);
                this.speed[i] = rng.range(WANDER.MIN_SPEED, WANDER.MAX_SPEED);
                this.count++;
            }
            this.count = n;
        }

        tick() {
            const map = this.map, rng = this.rng;
            for (let i = 0; i < this.count; i++) {
                const x = this.x[i], y = this.y[i];
                this.px[i] = x; this.py[i] = y;
                if (this.wait[i] > 0) { this.wait[i]--; continue; }
                const dx = this.tx[i] - x, dy = this.ty[i] - y;
                const dist = Math.hypot(dx, dy);
                const step = this.speed[i];
                if (dist <= step) {
                    this.x[i] = this.tx[i]; this.y[i] = this.ty[i];
                    this.wait[i] = rng.int(5, 30);
                    this.pickTarget(i, this.tx[i], this.ty[i]);
                    continue;
                }
                const nx = x + dx / dist * step, ny = y + dy / dist * step;
                if (map.isWalkable(Math.floor(nx), Math.floor(ny))) {
                    this.x[i] = nx; this.y[i] = ny;
                } else {
                    this.pickTarget(i, x, y);
                    this.wait[i] = 2;
                }
            }
        }

        pickTarget(i, fx, fy) {
            const rng = this.rng, r = WANDER.RADIUS;
            for (let a = 0; a < 8; a++) {
                const x = Math.floor(fx) + rng.int(-r, r);
                const y = Math.floor(fy) + rng.int(-r, r);
                if (this.map.isWalkable(x, y)) {
                    this.tx[i] = x + rng.range(0.2, 0.8);
                    this.ty[i] = y + rng.range(0.2, 0.8);
                    return;
                }
            }
            this.tx[i] = fx; this.ty[i] = fy;
        }

        countOnTile(tx, ty) {
            let n = 0;
            for (let i = 0; i < this.count; i++) {
                if (Math.floor(this.x[i]) === tx && Math.floor(this.y[i]) === ty) n++;
            }
            return n;
        }
    }

    // ---- World root --------------------------------------------------------

    // The colony (js/colony.js) is optional so the Phase 1 perf harness still runs
    // without it; wanderers remain as a debug-only load test.
    class World {
        constructor(seed, width, height, agentCount) {
            this.seed = seed;
            this.map = generateMap(width, height, seed);
            this.colony = HK.Colony ? new HK.Colony(this) : null;
            this.wanderers = new Wanderers(this.map, seed, agentCount);
            this.tickCount = 0;
        }

        tick() {
            this.tickCount++;
            if (this.colony) this.colony.tick();
            this.wanderers.tick();
        }

        entityCount() { return this.wanderers.count + (this.colony ? this.colony.villagers.length : 0); }

        describeTile(x, y) {
            const def = TILE_DEFS[this.map.tileAt(x, y)];
            return {
                name: def.name,
                info: def.info,
                x, y,
                height: this.map.heightAt(x, y),
                walkable: this.map.isWalkable(x, y),
                villagers: this.wanderers.countOnTile(x, y) + (this.colony ? this.colony.countOnTile(x, y) : 0),
                resource: this.colony ? this.colony.describeResource(x, y) : ''
            };
        }
    }

    // ---- Fixed-timestep clock ----------------------------------------------
    // The sim advances in whole ticks at TICKS_PER_SECOND * speed; renderers read
    // `alpha` (0..1 progress towards the next tick) to interpolate.

    class SimClock {
        constructor() {
            this.world = null;
            this.speed = 1;
            this.resumeSpeed = 1;
            this.alpha = 0;
            this.acc = 0;
            this.tickMsAvg = 0;
            this.tickMsPeak = 0;
            this.ticksPerSecond = 0;
            this.windowStart = 0;
            this.windowTicks = 0;
            this.windowPeak = 0;
            this.onSpeedChange = null;
        }

        setWorld(world) {
            this.world = world;
            this.acc = 0;
            this.alpha = 0;
        }

        setSpeed(value) {
            value = Math.max(0, Math.min(SimClock.MAX_SPEED, value | 0));
            if (value === this.speed) return;
            if (value > 0) this.resumeSpeed = value;
            this.speed = value;
            if (this.onSpeedChange) this.onSpeedChange(value);
        }

        togglePause() { this.setSpeed(this.speed > 0 ? 0 : this.resumeSpeed); }

        // Advance exactly one tick; handy for debugging while paused.
        step() {
            if (!this.world) return;
            this.runTick();
            this.alpha = 1;
        }

        update(dt, nowMs) {
            if (this.world && this.speed > 0) {
                const step = 1 / SimClock.TICKS_PER_SECOND;
                this.acc += dt * this.speed;
                let n = 0;
                while (this.acc >= step && n < SimClock.MAX_TICKS_PER_FRAME) {
                    this.runTick();
                    this.acc -= step;
                    n++;
                }
                if (this.acc >= step) this.acc = 0; // can't keep up: drop the backlog rather than spiral
                this.alpha = this.acc / step;
            }
            if (nowMs - this.windowStart >= 1000) {
                this.ticksPerSecond = this.windowTicks;
                this.tickMsPeak = this.windowPeak;
                this.windowTicks = 0;
                this.windowPeak = 0;
                this.windowStart = nowMs;
            }
        }

        runTick() {
            const t0 = now();
            this.world.tick();
            const ms = now() - t0;
            this.tickMsAvg = this.tickMsAvg === 0 ? ms : this.tickMsAvg + (ms - this.tickMsAvg) * 0.1;
            this.windowPeak = Math.max(this.windowPeak, ms);
            this.windowTicks++;
        }
    }
    SimClock.TICKS_PER_SECOND = 10;
    SimClock.MAX_TICKS_PER_FRAME = 8;
    SimClock.MAX_SPEED = 3;

    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

    Object.assign(HK, { TILE, TILE_DEFS, GEN, makeRng, makeNoise, generateMap, WorldMap, Wanderers, World, SimClock });
})(globalThis.HK = globalThis.HK || {});
