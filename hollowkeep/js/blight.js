// ========================================
// HOLLOWKEEP - BLIGHT (the corruption field)
// Every portal that closes leaves a corruption node behind; each node's reach
// grows day by day and the creep spreads tile by tile inside it. Corrupted
// ground kills trees and crops and slowly hurts villagers. Wisps leave trails
// that fade unless a node claims them. Shrines hold it back and turn what they
// purify into mana; the Cleanse power burns nodes out entirely.
// Pure data (no DOM), advanced by Colony.tick().
// ========================================

(function (HK) {
    'use strict';

    const { TILE, DAY } = HK;

    const BLIGHT = {
        STEP: 20,               // ticks between creep updates
        NODE_GROWTH: 2.2 / DAY.LENGTH, // reach gained per tick (about 2 tiles a day)
        NODE_MAX: 12,
        CREEP_CHANCE: 0.45,
        CREEP_GAIN: 40,
        FADE: 10,               // corruption lost per step outside any node's reach
        FADE_WARD: 45,
        FADE_HEALING: 30,       // for a while after a node is cleansed
        HEALING_TICKS: 1500,
        WILD_STEPS: 150,        // steps a wisp trail lasts (about a day)
        TREE_DEATH: 0.012,      // per step on corrupted ground
        WARD_MANA: 0.4,         // mana per tile a shrine purifies
        NODE_MANA: 25
    };

    class Blight {
        constructor(colony) {
            const map = colony.map, n = map.width * map.height;
            this.colony = colony;
            this.map = map;
            this.W = map.width;
            this.rng = HK.makeRng((colony.world.seed ^ 0x68e31da4) >>> 0);
            this.noise = HK.makeNoise(colony.world.seed + 77, 0.16, 2);
            this.corr = new Uint8Array(n);
            this.wild = new Uint8Array(n);
            this.want = new Uint8Array(n);
            this.ward = new Uint8Array(n);
            this.nodes = [];
            this.nextNodeId = 1;
            this.wantDirty = true;
            this.healing = 0;
            this.dirty = [];            // tiles whose look changed; the renderer repaints them
            this.fullRepaint = false;
            this.version = 0;
            this.count = 0;             // corrupted tiles
        }

        isCorrupt(i) { return this.corr[i] >= 128; }

        addNode(x, y, r) {
            const node = { id: this.nextNodeId++, x, y, r, born: this.colony.ticks };
            this.nodes.push(node);
            const i = this.map.idx(Math.floor(x), Math.floor(y));
            this.set(i, 255);
            this.wantDirty = true;
            return node;
        }

        set(i, c) {
            const old = this.corr[i];
            if (old === c) return;
            this.corr[i] = c;
            if ((old >> 5) === (c >> 5)) return;
            if (this.dirty.length < 60000) this.dirty.push(i);
            else this.fullRepaint = true; // nobody is drawing (a Node run): stop queueing
        }

        // fire burns corruption away without paying mana
        purge(i) {
            this.wild[i] = 0;
            this.set(i, 0);
        }

        // a wisp passing over
        seed(i) {
            if (this.ward[i]) return;
            this.wild[i] = BLIGHT.WILD_STEPS;
            if (this.corr[i] < 220) this.set(i, 220);
        }

        wardRadius() { return HK.BUILDINGS.shrine.ward + (this.colony.hasTech('hallowed') ? 3 : 0); }

        recomputeWant() {
            this.wantDirty = false;
            const { want, ward, W } = this;
            const H = this.map.height;
            want.fill(0);
            ward.fill(0);
            for (const nd of this.nodes) {
                const R = Math.ceil(nd.r * 1.2) + 1;
                const x0 = Math.max(0, Math.floor(nd.x - R)), x1 = Math.min(W - 1, Math.floor(nd.x + R));
                const y0 = Math.max(0, Math.floor(nd.y - R)), y1 = Math.min(H - 1, Math.floor(nd.y + R));
                for (let y = y0; y <= y1; y++) {
                    for (let x = x0; x <= x1; x++) {
                        const d = Math.hypot(x + 0.5 - nd.x, y + 0.5 - nd.y);
                        if (d < 0.8 || d < nd.r * (0.8 + 0.35 * this.noise(x, y))) want[y * W + x] = 1;
                    }
                }
            }
            const wr = this.wardRadius();
            for (const b of this.colony.buildings) {
                if (!b.complete || !b.def.ward) continue;
                const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
                for (let y = Math.max(0, Math.floor(cy - wr)); y <= Math.min(H - 1, Math.floor(cy + wr)); y++) {
                    for (let x = Math.max(0, Math.floor(cx - wr)); x <= Math.min(W - 1, Math.floor(cx + wr)); x++) {
                        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > wr) continue;
                        const i = y * W + x;
                        ward[i] = 1;
                        want[i] = 0;
                    }
                }
            }
        }

        tick() {
            const colony = this.colony;
            if (this.healing > 0) this.healing--;
            for (const nd of this.nodes) nd.r = Math.min(BLIGHT.NODE_MAX, nd.r + BLIGHT.NODE_GROWTH);
            if (colony.ticks % 100 === 0) this.wantDirty = true;
            if (colony.ticks % BLIGHT.STEP !== 7) return;
            if (this.wantDirty) this.recomputeWant();
            this.step();
        }

        step() {
            const { corr, wild, want, ward, W, rng, colony } = this;
            const n = corr.length;
            const tiles = this.map.tiles;
            let count = 0, mana = 0;
            const fade = this.healing > 0 ? BLIGHT.FADE_HEALING : BLIGHT.FADE;
            for (let i = 0; i < n; i++) {
                const c = corr[i];
                if (want[i]) {
                    if (c < 255) {
                        let grow = c > 0;
                        if (!grow) {
                            const x = i % W;
                            grow = (x > 0 && corr[i - 1] >= 160) || (x < W - 1 && corr[i + 1] >= 160) ||
                                (i >= W && corr[i - W] >= 160) || (i < n - W && corr[i + W] >= 160);
                        }
                        if (grow && rng.next() < BLIGHT.CREEP_CHANCE) this.set(i, Math.min(255, c + BLIGHT.CREEP_GAIN + Math.floor(rng.next() * BLIGHT.CREEP_GAIN)));
                    }
                } else if (c > 0) {
                    if (wild[i] > 0 && !ward[i]) wild[i]--;
                    else {
                        wild[i] = 0;
                        const nc = Math.max(0, c - (ward[i] ? BLIGHT.FADE_WARD : fade));
                        if (ward[i] && c >= 128 && nc < 128) mana += BLIGHT.WARD_MANA;
                        this.set(i, nc);
                    }
                }
                if (corr[i] >= 128) {
                    count++;
                    if (tiles[i] === TILE.FOREST && rng.next() < BLIGHT.TREE_DEATH) colony.killTree(i);
                    else if (colony.foodKind[i] && colony.amount[i]) colony.spoilFood(i);
                }
            }
            this.count = count;
            if (mana && colony.divine) colony.divine.addMana(mana);
            if (this.dirty.length) this.version++;
        }

        // The Cleanse power: scour a circle, and burn out any node inside it.
        cleanse(cx, cy, r) {
            const { W } = this, H = this.map.height;
            let tiles = 0;
            for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(H - 1, Math.floor(cy + r)); y++) {
                for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(W - 1, Math.floor(cx + r)); x++) {
                    if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > r) continue;
                    const i = y * W + x;
                    if (this.corr[i] >= 128) tiles++;
                    this.wild[i] = 0;
                    this.set(i, 0);
                }
            }
            const gone = this.nodes.filter(nd => Math.hypot(nd.x - cx, nd.y - cy) <= r + 0.75);
            if (gone.length) {
                this.nodes = this.nodes.filter(nd => !gone.includes(nd));
                this.healing = BLIGHT.HEALING_TICKS;
                this.wantDirty = true;
            }
            if (this.dirty.length) this.version++;
            return { tiles, nodes: gone };
        }

        dawn() {
            if (!this.colony.hasTech('dawnbreaker')) return;
            for (const nd of this.nodes) nd.r = Math.max(1, nd.r - 3);
            this.wantDirty = true;
        }

        nearestNode(x, y) {
            let best = null, bestD = Infinity;
            for (const nd of this.nodes) {
                const d = Math.hypot(nd.x - x, nd.y - y);
                if (d < bestD) { bestD = d; best = nd; }
            }
            return best ? { node: best, d: bestD } : null;
        }
    }

    Object.assign(HK, { Blight, BLIGHT });
})(globalThis.HK = globalThis.HK || {});
