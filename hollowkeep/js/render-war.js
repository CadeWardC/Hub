// ========================================
// HOLLOWKEEP - RENDERING (war, blight, powers)
// Extends the Renderer with the Phase 3-5 art: production, defence and sacred
// buildings, monsters (bright eyes and rims so they read on corruption at
// night), portals, corruption nodes, the animated purple creep with its
// marching boundary line, fire, arrows, lightning and power effects, hit-point
// bars, the power reticle and the omen arrow. Reads sim state, never writes it.
// ========================================

(function (HK) {
    'use strict';

    const { paint, fromRows, canvasOf, INK, ART_PX, TILE_SIZE: T } = HK.RenderKit;
    const WOOD = '#8a5a36', WOOD_D = '#6d4529', WOOD_L = '#a8744a';
    const STONE = '#9a948a', STONE_D = '#7c766d', STONE_L = '#b3ada2';
    const BRICK = '#9a4f38', BRICK_D = '#6d3527', BRICK_L = '#b86a4c';
    const ROOF = '#7a3b2a', SLATE = '#3f4658', SLATE_L = '#566079';
    const GLASS = '#2b2a38', ACCENT = '#f2a03d', FIRE = '#f6d365', MANA = '#8fd3ff', IRON = '#5d6470';
    const CORR = '#6d3a7a', CORR_GLOW = '#b35bc4';

    function hash(x, y) {
        const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return s - Math.floor(s);
    }

    // ---- building art --------------------------------------------------------

    function makeArt() {
        const wall = paint(16, 22, r => {
            r(0, 6, 16, 16, INK); r(1, 7, 14, 14, STONE);
            for (let y = 10; y < 21; y += 4) { r(1, y, 14, 1, STONE_D); r(((y / 4) % 2) ? 5 : 9, y - 3, 1, 3, STONE_D); }
            r(1, 7, 14, 1, STONE_L);
            [0, 6, 12].forEach(x => { r(x, 2, 4, 5, INK); r(x + 1, 3, 2, 3, STONE_L); });
        });
        const rampart = paint(16, 24, r => {
            r(0, 6, 16, 18, INK); r(1, 7, 14, 16, BRICK);
            for (let y = 9; y < 23; y += 3) { r(1, y, 14, 1, BRICK_D); r(((y / 3) % 2) ? 4 : 10, y - 2, 1, 2, BRICK_D); }
            r(1, 7, 14, 1, BRICK_L);
            [0, 6, 12].forEach(x => { r(x, 1, 4, 6, INK); r(x + 1, 2, 2, 4, BRICK_L); });
            r(1, 21, 14, 2, STONE_D);
        });
        const gate = paint(16, 24, r => {
            r(0, 3, 5, 21, INK); r(11, 3, 5, 21, INK);
            r(1, 4, 3, 19, STONE); r(12, 4, 3, 19, STONE);
            r(1, 4, 3, 1, STONE_L); r(12, 4, 3, 1, STONE_L);
            r(4, 7, 8, 17, INK); r(5, 8, 6, 16, WOOD);
            r(7, 8, 1, 16, WOOD_D); r(8, 8, 1, 16, WOOD_D);
            r(5, 12, 6, 1, IRON); r(5, 19, 6, 1, IRON);
            r(4, 4, 8, 3, INK); r(5, 5, 6, 1, WOOD_L);
        });
        const tower = paint(16, 36, r => {
            // legs and bracing
            r(2, 16, 3, 20, INK); r(11, 16, 3, 20, INK);
            r(3, 16, 1, 20, WOOD); r(12, 16, 1, 20, WOOD);
            for (let y = 20; y < 34; y += 6) { r(4, y, 8, 1, WOOD_D); r(4 + ((y / 6) % 2) * 3, y + 1, 5, 1, WOOD_D); }
            // platform
            r(0, 12, 16, 5, INK); r(1, 13, 14, 3, WOOD_L); r(1, 15, 14, 1, WOOD_D);
            // roof
            for (let y = 1; y < 10; y++) { const hw = 1 + y; r(8 - hw - 1, y, 2 * hw + 2, 1, INK); r(8 - hw, y, 2 * hw, 1, y % 3 ? ROOF : '#9a4f36'); }
            r(0, 9, 16, 2, INK); r(1, 9, 14, 1, ROOF);
            r(3, 11, 1, 2, WOOD_D); r(12, 11, 1, 2, WOOD_D);
            r(7, 12, 2, 1, ACCENT);
        });
        const bastion = paint(16, 40, r => {
            r(1, 10, 14, 30, INK); r(2, 11, 12, 28, STONE);
            for (let y = 14; y < 39; y += 4) { r(2, y, 12, 1, STONE_D); r(((y / 4) % 2) ? 6 : 10, y - 3, 1, 3, STONE_D); }
            r(2, 11, 2, 28, STONE_L);
            r(0, 6, 16, 6, INK); r(1, 7, 14, 4, STONE_L);
            [0, 5, 10].forEach(x => { r(x + 1, 3, 4, 4, INK); r(x + 2, 4, 2, 3, STONE_L); });
            r(6, 18, 4, 6, INK); r(7, 19, 2, 4, GLASS);
            r(12, 0, 1, 7, INK); r(13, 1, 3, 3, '#c23b3b');
        });
        const well = paint(16, 22, r => {
            r(2, 2, 12, 3, INK); r(3, 3, 10, 1, ROOF);
            r(3, 5, 1, 9, WOOD_D); r(12, 5, 1, 9, WOOD_D);
            r(6, 6, 4, 1, WOOD_L); r(7, 7, 2, 3, STONE_L);
            r(1, 12, 14, 10, INK); r(2, 13, 12, 8, STONE);
            r(3, 13, 10, 3, '#2d5a6e'); r(4, 14, 3, 1, '#4f8e96');
            r(2, 17, 12, 1, STONE_D); r(2, 20, 12, 1, STONE_D);
        });
        const shrine = paint(32, 42, r => {
            // plinth and steps
            r(1, 34, 30, 8, INK); r(2, 35, 28, 6, '#d8d2c2'); r(2, 38, 28, 1, STONE_L);
            r(4, 32, 24, 3, INK); r(5, 33, 22, 1, '#ece6d6');
            // pillars
            [5, 13, 19, 25].forEach(x => { r(x - 1, 16, 4, 17, INK); r(x, 17, 2, 16, '#ece6d6'); r(x + 1, 17, 1, 16, '#c9c2a8'); });
            // pediment
            for (let y = 6; y < 16; y++) { const hw = 3 + (y - 6) * 1.35; r(Math.round(16 - hw - 1), y, Math.round(hw * 2 + 2), 1, INK); r(Math.round(16 - hw), y, Math.round(hw * 2), 1, y % 3 ? '#d8d2c2' : '#ece6d6'); }
            r(1, 15, 30, 2, INK); r(2, 15, 28, 1, '#c9c2a8');
            // crystal
            r(14, 0, 4, 1, INK); r(13, 1, 6, 5, INK); r(14, 1, 4, 5, MANA); r(15, 2, 1, 3, '#e6f7ff');
            r(12, 22, 8, 10, INK); r(13, 23, 6, 9, '#3a4a66'); r(15, 25, 2, 4, MANA);
        });
        const sawmill = paint(32, 34, r => {
            r(1, 14, 30, 20, INK); r(2, 15, 28, 18, WOOD);
            for (let x = 4; x < 30; x += 4) r(x, 15, 1, 18, WOOD_D);
            for (let y = 6; y < 15; y++) r(0, y, 32, 1, INK);
            for (let y = 7; y < 14; y++) r(1, y, 30, 1, y % 2 ? '#5d6b3a' : '#6f7f45');
            r(0, 14, 32, 1, INK);
            // saw blade and log
            r(9, 20, 12, 12, INK); r(10, 21, 10, 10, '#c9c3b8'); r(14, 25, 2, 2, IRON);
            for (let k = 0; k < 4; k++) r(10 + k * 3, 20, 1, 1, '#ece6d6');
            r(20, 27, 11, 5, INK); r(21, 28, 9, 3, '#d9b07a'); r(21, 29, 9, 1, WOOD_L);
            r(4, 18, 3, 3, INK); r(5, 19, 1, 1, ACCENT);
        });
        const kiln = paint(32, 38, r => {
            r(22, 0, 7, 20, INK); r(23, 1, 5, 19, BRICK_D); r(23, 1, 5, 2, STONE_D);
            for (let y = 12; y < 38; y++) {
                const t = (y - 12) / 26, hw = Math.round(8 + Math.sqrt(Math.min(1, t * 2.5)) * 7);
                r(16 - hw - 1, y, 2 * hw + 2, 1, INK);
                r(16 - hw, y, 2 * hw, 1, y % 4 === 0 ? BRICK_D : BRICK);
            }
            r(1, 37, 30, 1, INK);
            r(11, 26, 10, 11, INK); r(12, 27, 8, 10, '#3a1f18'); r(13, 31, 6, 5, '#e0662e'); r(14, 33, 4, 3, FIRE);
            r(8, 16, 3, 2, BRICK_L); r(18, 14, 4, 2, BRICK_L);
        });
        const smelter = paint(32, 40, r => {
            r(3, 0, 8, 22, INK); r(4, 1, 6, 21, STONE_D); r(4, 1, 6, 2, '#4a4450');
            r(1, 16, 30, 24, INK); r(2, 17, 28, 22, STONE);
            for (let y = 20; y < 39; y += 4) r(2, y, 28, 1, STONE_D);
            r(2, 17, 28, 2, STONE_L);
            r(10, 24, 12, 15, INK); r(11, 25, 10, 14, '#2a1a14');
            r(12, 30, 8, 8, '#e0662e'); r(13, 32, 6, 5, FIRE); r(15, 34, 2, 2, '#fff3c4');
            r(23, 30, 7, 9, INK); r(24, 31, 5, 7, IRON); r(24, 31, 5, 1, '#8a929e');
        });
        const smithy = paint(32, 32, r => {
            r(0, 8, 32, 3, INK); r(1, 9, 30, 1, SLATE_L);
            for (let y = 4; y < 9; y++) r(2 + (8 - y), y, 28 - (8 - y) * 2, 1, y === 4 ? INK : SLATE);
            r(2, 11, 3, 21, INK); r(27, 11, 3, 21, INK); r(3, 11, 1, 21, WOOD); r(28, 11, 1, 21, WOOD);
            r(4, 22, 12, 10, INK); r(5, 23, 10, 9, STONE_D); r(6, 24, 8, 4, '#e0662e'); r(8, 25, 4, 2, FIRE);
            r(18, 24, 9, 3, INK); r(19, 25, 7, 1, IRON); r(20, 27, 5, 5, INK); r(21, 27, 3, 5, IRON);
            r(22, 20, 1, 4, WOOD_D); r(21, 19, 3, 2, IRON);
        });
        const wagon = paint(26, 18, r => {
            r(2, 2, 20, 10, INK); r(3, 3, 18, 8, '#e6dcc0');
            for (let x = 5; x < 21; x += 5) r(x, 3, 1, 8, '#c9b88f');
            r(0, 10, 24, 4, INK); r(1, 11, 22, 2, WOOD);
            [4, 17].forEach(x => { r(x, 12, 6, 6, INK); r(x + 1, 13, 4, 4, WOOD_D); r(x + 2, 14, 2, 2, WOOD_L); });
            r(22, 11, 4, 1, WOOD_D);
            r(8, 5, 8, 3, '#c23b3b'); r(9, 6, 6, 1, ACCENT);
        });
        return {
            wall: { img: wall, windows: [] },
            rampart: { img: rampart, windows: [] },
            gate: { img: gate, windows: [] },
            tower: { img: tower, windows: [[7, 12, 2, 1]] },
            bastion: { img: bastion, windows: [[7, 19, 2, 4]] },
            well: { img: well, windows: [] },
            shrine: { img: shrine, windows: [[14, 1, 4, 5], [15, 25, 2, 4]], glow: MANA },
            sawmill: { img: sawmill, windows: [[5, 19, 1, 1]] },
            kiln: { img: kiln, windows: [[13, 31, 6, 5]] },
            smelter: { img: smelter, windows: [[12, 30, 8, 8]] },
            smithy: { img: smithy, windows: [[6, 24, 8, 4]] },
            wagon: { img: wagon, windows: [] }
        };
    }

    // ---- monsters ------------------------------------------------------------
    // Cold purple bodies with bright yellow eyes and a violet rim: they have to read on
    // top of the purple creep in the dark (the mockup's lesson).

    function makeMonsters() {
        const pal = { o: INK, P: '#4e2e5e', p: '#6a4480', R: CORR_GLOW, E: '#f6f06b', G: '#8fd14b', g: '#5f9a32', S: '#5b5566', s: '#77708a', C: '#d27ae6' };
        const frames = (top, legsA, legsB) => [fromRows(top.concat(legsA), pal), fromRows(top.concat(legsB), pal)];
        const husk = frames([
            '...RR...',
            '..oPPo..',
            '.oEPPEo.',
            '.oPPPPo.',
            '..oPPo..',
            '.oRPPRo.',
            'oPopPoPo',
            'oPoPPoPo',
            '.ooPPoo.'
        ], ['.oPooPo.', '.oo..oo.'], ['..oPPo..', '..oooo..']);
        const runner = frames([
            '.......RR.',
            '......oPEo',
            'oo...oPPPo',
            'oRooooPPo.',
            '.oPPPPPPo.',
            '.oPpPPpPo.'
        ], ['.oPooooPo.', '.oo....oo.'], ['..oPooPo..', '..oo..oo..']);
        const brute = frames([
            '....RRRRRR....',
            '...oPPPPPPo...',
            '..oPPEPPEPPo..',
            '..oPPPPPPPPo..',
            '.ooRPPppPPRoo.',
            'oPPPPPPPPPPPPo',
            'oPPoPPPPPPoPPo',
            'oPPoPPPPPPoPPo',
            'oPo.oPPPPo.oPo',
            '.o..oPPPPo..o.'
        ], ['...oPPooPPo...', '...oPo..oPo...', '...ooo..ooo...'], ['....oPPPPo....', '....oPooPo....', '....oo..oo....']);
        const spitter = frames([
            '...ooo...',
            '..oGGGo..',
            '.oGgGGGo.',
            '.oGGGgGo.',
            '..oEPEo..',
            '.oRPPPRo.',
            '.oPPPPPo.',
            '..oPPPo..'
        ], ['..oPoPo..', '..oo.oo..'], ['...oPo...', '...ooo...']);
        const golemTop = paint(24, 28, r => {
            r(5, 0, 14, 11, INK); r(6, 1, 12, 9, '#5b5566'); r(6, 1, 12, 2, '#77708a');
            r(8, 4, 3, 2, '#f6f06b'); r(13, 4, 3, 2, '#f6f06b');
            r(10, 7, 4, 1, CORR_GLOW);
            r(0, 10, 24, 12, INK); r(1, 11, 22, 10, '#5b5566'); r(1, 11, 22, 2, '#77708a');
            r(0, 12, 5, 10, INK); r(19, 12, 5, 10, INK); r(1, 13, 3, 8, '#4a4554'); r(20, 13, 3, 8, '#4a4554');
            r(8, 13, 1, 6, CORR_GLOW); r(9, 16, 4, 1, CORR_GLOW); r(15, 12, 1, 5, CORR_GLOW); r(12, 17, 1, 3, CORR_GLOW);
            r(0, 21, 5, 4, INK); r(19, 21, 5, 4, INK); r(1, 22, 3, 2, '#77708a'); r(20, 22, 3, 2, '#77708a');
        });
        const golemLegs = [0, 1].map(k => paint(24, 28, r => {
            const a = k ? 1 : 0;
            r(5 + a, 21, 6, 7, INK); r(13 - a, 21, 6, 7, INK);
            r(6 + a, 22, 4, 5, '#4a4554'); r(14 - a, 22, 4, 5, '#4a4554');
        }));
        const golem = golemLegs.map(legs => {
            const c = canvasOf(24, 28), ctx = c.getContext('2d');
            ctx.drawImage(legs, 0, 0);
            ctx.drawImage(golemTop, 0, 0);
            return c;
        });
        const node = paint(12, 14, r => {
            r(4, 0, 4, 1, INK); r(3, 1, 6, 11, INK); r(4, 1, 4, 10, '#3a1f48'); r(5, 2, 1, 7, CORR_GLOW);
            r(0, 5, 4, 8, INK); r(1, 6, 2, 6, '#4e2e5e'); r(1, 7, 1, 3, CORR);
            r(8, 4, 4, 9, INK); r(9, 5, 2, 7, '#4e2e5e'); r(10, 6, 1, 4, CORR);
            r(0, 12, 12, 2, INK); r(1, 12, 10, 1, '#2a1a30');
        });
        return { husk, runner, brute, spitter, golem, node };
    }

    // tiny animated flame, drawn fresh each frame: pixel columns that taper and flicker,
    // red outside, orange, then a yellow core
    const FLAME_LAYERS = [['#c23b3b', 1], [ACCENT, 0.72], [FIRE, 0.42]];
    function flame(ctx, x, y, h, t) {
        x = Math.round(x); y = Math.round(y);
        for (const [color, k] of FLAME_LAYERS) {
            ctx.fillStyle = color;
            const half = Math.max(1, Math.round(3 * k));
            for (let c = -half; c < half; c++) {
                const taper = 1 - Math.abs(c + 0.5) / (half + 0.5);
                const ch = Math.round(h * k * taper * (0.75 + 0.25 * Math.sin(t * 1.7 + c * 1.3)));
                if (ch > 0) ctx.fillRect(x + c, y - ch, 1, ch);
            }
        }
    }

    // eye pixels per sprite, for the night glow
    const EYES = { husk: [[2, 2], [5, 2]], runner: [[8, 1]], brute: [[5, 2], [8, 2]], spitter: [[3, 4], [5, 4]], golem: [[8, 4], [9, 4], [10, 4], [13, 4], [14, 4], [15, 4]] };

    // ---- corruption painter ---------------------------------------------------
    // The creep is baked like the map (8 art px per tile) and repainted per tile as the
    // blight changes. Density shows the frontier creeping in; the clip region and the
    // boundary line are rebuilt from the same data when it changes.

    class BlightPainter {
        constructor(blight) {
            this.blight = blight;
            const map = blight.map;
            this.W = map.width * ART_PX;
            this.H = map.height * ART_PX;
            this.canvas = canvasOf(this.W, this.H);
            this.ctx = this.canvas.getContext('2d');
            this.img = this.ctx.createImageData(this.W, this.H);
            this.version = -1;
            this.pathsAt = 0;
            this.region = null;
            this.edges = null;
            this.hasAny = false;
            this.flush(true);
        }

        flush(all) {
            const bl = this.blight, map = bl.map;
            if (all || bl.fullRepaint) {
                bl.fullRepaint = false;
                bl.dirty.length = 0;
                for (let i = 0; i < bl.corr.length; i++) this.paintTile(i);
                this.ctx.putImageData(this.img, 0, 0);
                return;
            }
            if (!bl.dirty.length) return;
            for (const i of bl.dirty) {
                this.paintTile(i);
                const tx = i % map.width, ty = (i - tx) / map.width;
                this.ctx.putImageData(this.img, 0, 0, tx * ART_PX, ty * ART_PX, ART_PX, ART_PX);
            }
            bl.dirty.length = 0;
        }

        paintTile(i) {
            const map = this.blight.map, c = this.blight.corr[i], px = this.img.data, W = this.W;
            const tx = i % map.width, ty = (i - tx) / map.width;
            const level = c >> 5; // 0..7
            const a = level === 0 ? 0 : Math.min(1, level / 4);
            for (let py = 0; py < ART_PX; py++) {
                for (let pxl = 0; pxl < ART_PX; pxl++) {
                    const o = ((ty * ART_PX + py) * W + tx * ART_PX + pxl) * 4;
                    if (!a) { px[o + 3] = 0; continue; }
                    const n = hash(tx * ART_PX + pxl + 0.37, ty * ART_PX + py + 0.71);
                    // dark, desaturated ground with violet veins and the odd glowing mote
                    let r = 42, g = 26, b = 50, al = 0.72;
                    if (n > 0.93) { r = 179; g = 91; b = 196; al = 0.95; }
                    else if (n > 0.78) { r = 109; g = 58; b = 122; al = 0.85; }
                    else if (n < 0.1) { r = 28; g = 16; b = 34; al = 0.8; }
                    // the frontier is patchy: only some pixels have turned yet
                    if (level < 4 && hash(tx * 13.1 + pxl, ty * 7.7 + py) > level / 4) { px[o + 3] = 0; continue; }
                    px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = Math.round(255 * al * (level < 4 ? 1 : a));
                }
            }
        }

        // clip region (run-length rows of fully corrupted tiles) and boundary edges
        rebuildPaths() {
            const bl = this.blight, map = bl.map, W = map.width, H = map.height, corr = bl.corr;
            const region = new Path2D(), edges = new Path2D();
            const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && corr[y * W + x] >= 128;
            let any = false;
            for (let y = 0; y < H; y++) {
                let run = -1;
                let top = -1, bottom = -1;
                for (let x = 0; x <= W; x++) {
                    const c = x < W && on(x, y);
                    if (c && run < 0) run = x;
                    if (!c && run >= 0) { region.rect(run * T, y * T, (x - run) * T, T); run = -1; any = true; }
                    // horizontal edges, merged along the row
                    const t = c && !on(x, y - 1), b = c && !on(x, y + 1);
                    if (t && top < 0) top = x;
                    if (!t && top >= 0) { edges.moveTo(top * T, y * T); edges.lineTo(x * T, y * T); top = -1; }
                    if (b && bottom < 0) bottom = x;
                    if (!b && bottom >= 0) { edges.moveTo(bottom * T, (y + 1) * T); edges.lineTo(x * T, (y + 1) * T); bottom = -1; }
                }
            }
            for (let x = 0; x < W; x++) {
                let left = -1, right = -1;
                for (let y = 0; y <= H; y++) {
                    const c = y < H && on(x, y);
                    const l = c && !on(x - 1, y), r = c && !on(x + 1, y);
                    if (l && left < 0) left = y;
                    if (!l && left >= 0) { edges.moveTo(x * T, left * T); edges.lineTo(x * T, y * T); left = -1; }
                    if (r && right < 0) right = y;
                    if (!r && right >= 0) { edges.moveTo((x + 1) * T, right * T); edges.lineTo((x + 1) * T, y * T); right = -1; }
                }
            }
            this.region = region;
            this.edges = edges;
            this.hasAny = any;
        }
    }

    function makeVeinPattern(ctx) {
        const c = canvasOf(24, 24), x = c.getContext('2d');
        for (let k = 0; k < 40; k++) {
            const px = Math.floor(hash(k, 3.1) * 24), py = Math.floor(hash(k, 9.7) * 24);
            x.fillStyle = k % 5 === 0 ? 'rgba(210, 122, 230, 0.8)' : 'rgba(179, 91, 196, 0.45)';
            x.fillRect(px, py, k % 3 === 0 ? 2 : 1, 1);
        }
        return ctx.createPattern(c, 'repeat');
    }

    // ---- Renderer extension -----------------------------------------------------

    const R = HK.Renderer.prototype;

    R.initWar = function () {
        Object.assign(this.art, makeArt());
        this.mon = makeMonsters();
        this.blightPainter = null;
        this.veins = makeVeinPattern(this.ctx);
        this.flash = null;
        this.shake = null;
        this.reticle = null;       // {x, y, r, ok}
        this.ghostTiles = null;    // wall painting: [{x, y, ok}]
        this.omenTarget = null;
    };

    R.resetWar = function (world) {
        const bl = world.colony && world.colony.blight;
        this.blightPainter = bl ? new BlightPainter(bl) : null;
        this.flash = null;
        this.shake = null;
        this.reticle = null;
        this.ghostTiles = null;
    };

    R.shakeOffset = function (now) {
        const s = this.shake;
        if (!s) return [0, 0];
        const t = (now - s.t0) / s.dur;
        if (t >= 1) { this.shake = null; return [0, 0]; }
        const a = s.amp * (1 - t) * this.dpr;
        return [Math.sin(now * 0.09) * a, Math.cos(now * 0.071) * a];
    };

    R.onWarEvent = function (ev, now) {
        const fx = this.fx;
        switch (ev.type) {
            case 'shot':
                fx.push({ kind: 'arrow', x0: ev.x0 * T, y0: ev.y0 * T, x1: ev.x1 * T, y1: ev.y1 * T, t0: now, dur: 200, heavy: ev.kind === 'bastion' });
                break;
            case 'spit':
                fx.push({ kind: 'spit', x0: ev.x0 * T, y0: ev.y0 * T, x1: ev.x1 * T, y1: ev.y1 * T, t0: now, dur: 350 });
                break;
            case 'mhit': case 'swing':
                for (let k = 0; k < 3; k++) fx.push({ kind: 'chip', x: ev.x * T, y: ev.y * T, vx: (Math.random() - 0.5) * 70, vy: -30 - Math.random() * 40, color: ev.type === 'mhit' ? '#ff6b6b' : '#ece6d6', t0: now, dur: 350 });
                break;
            case 'mdeath':
                for (let k = 0; k < 10; k++) {
                    const a = Math.random() * Math.PI * 2, s = 15 + Math.random() * 35;
                    fx.push({ kind: 'dust', x: ev.x * T, y: ev.y * T - 4, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.5 - 20, size: 2 + Math.random() * 2, t0: now, dur: 600, color: CORR });
                }
                fx.push({ kind: 'soul', x: ev.x * T, y: ev.y * T - 6, t0: now, dur: 900 });
                break;
            case 'death':
                for (let k = 0; k < 8; k++) fx.push({ kind: 'dust', x: ev.x * T, y: ev.y * T - 4, vx: (Math.random() - 0.5) * 40, vy: -10 - Math.random() * 20, size: 2 + Math.random() * 2, t0: now, dur: 900, color: '#8a8494' });
                fx.push({ kind: 'banner', x: ev.x * T, y: ev.y * T - 22, text: `${ev.v.name} has fallen`, t0: now, dur: 2600, color: '#ff8a7a' });
                break;
            case 'destroyed':
                for (let k = 0; k < 22; k++) {
                    const a = Math.random() * Math.PI * 2, s = 30 + Math.random() * 60;
                    fx.push({ kind: 'dust', x: ev.x * T, y: ev.y * T, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.5 - 15, size: 2 + Math.random() * 4, t0: now, dur: 900 + Math.random() * 500 });
                }
                this.shake = { t0: now, dur: 300, amp: 3 };
                break;
            case 'ignite': case 'fire':
                break;
            case 'douse':
                for (let k = 0; k < 10; k++) fx.push({ kind: 'chip', x: ev.x * T, y: ev.y * T - 6, vx: (Math.random() - 0.5) * 60, vy: -50 - Math.random() * 30, color: '#8fd3ff', t0: now, dur: 500 });
                break;
            case 'power':
                this.onPower(ev, now);
                break;
            case 'purified':
                fx.push({ kind: 'ring', x: ev.x * T, y: ev.y * T, r0: 8, r1: 120, t0: now, dur: 1400, color: '#fff3c4', w: 3 });
                fx.push({ kind: 'banner', x: ev.x * T, y: ev.y * T - 28, text: 'Purified!', t0: now, dur: 2600, color: '#fff3c4' });
                break;
            case 'portals':
                for (const p of ev.portals) fx.push({ kind: 'ring', x: p.x * T, y: p.y * T, r0: 4, r1: 40, t0: now, dur: 900, color: CORR_GLOW, w: 2 });
                break;
            default:
        }
    };

    R.onPower = function (ev, now) {
        const fx = this.fx, x = ev.x * T, y = ev.y * T, r = ev.r * T;
        if (ev.id === 'lightning') {
            const pts = [];
            let px = x + (Math.random() - 0.5) * 40, py = y - 260;
            for (let k = 0; k <= 9; k++) {
                const t = k / 9;
                pts.push([px + (x - px) * t + (k && k < 9 ? (Math.random() - 0.5) * 22 : 0), py + (y - py) * t]);
            }
            fx.push({ kind: 'bolt', pts, t0: now, dur: 420 });
            fx.push({ kind: 'ring', x, y, r0: 4, r1: r + 10, t0: now, dur: 450, color: '#e6f7ff', w: 3 });
            for (let k = 0; k < 16; k++) {
                const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 80;
                fx.push({ kind: 'chip', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, color: k % 2 ? '#e6f7ff' : FIRE, t0: now, dur: 600 });
            }
            this.flash = { t0: now, dur: 260, color: '230, 247, 255' };
            this.shake = { t0: now, dur: 380, amp: 6 };
        } else if (ev.id === 'heal') {
            fx.push({ kind: 'ring', x, y, r0: r, r1: r * 0.2, t0: now, dur: 700, color: '#b8d47a', w: 2 });
            for (let k = 0; k < 22; k++) {
                const a = Math.random() * Math.PI * 2, d = Math.random() * r;
                fx.push({ kind: 'plus', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, t0: now + Math.random() * 300, dur: 900 });
            }
        } else if (ev.id === 'cleanse') {
            fx.push({ kind: 'ring', x, y, r0: 4, r1: r, t0: now, dur: 700, color: '#fff3c4', w: 4 });
            fx.push({ kind: 'ring', x, y, r0: 2, r1: r * 0.7, t0: now + 120, dur: 700, color: MANA, w: 2 });
            for (let k = 0; k < 24; k++) {
                const a = Math.random() * Math.PI * 2, d = Math.random() * r;
                fx.push({ kind: 'chip', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: 0, vy: -40 - Math.random() * 40, color: k % 2 ? '#fff3c4' : MANA, t0: now, dur: 800 });
            }
            this.flash = { t0: now, dur: 300, color: '255, 243, 196' };
        } else {
            for (let k = 0; k < 14; k++) {
                const a = Math.random() * Math.PI * 2, s = 20 + Math.random() * 40;
                fx.push({ kind: 'dust', x, y: y + 4, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.4 - 10, size: 2 + Math.random() * 3, t0: now, dur: 600, color: ev.id === 'lower' ? '#6b8aa0' : '#b39a70' });
            }
            this.shake = { t0: now, dur: 160, amp: 1.5 };
        }
    };

    // ---- drawing: ground layer --------------------------------------------------

    R.drawBlight = function (ctx, colony, now) {
        const bp = this.blightPainter;
        if (!bp) return;
        bp.flush(false);
        const bl = colony.blight;
        if (bp.version !== bl.version && now - bp.pathsAt > 200) {
            bp.version = bl.version;
            bp.pathsAt = now;
            bp.rebuildPaths();
        }
        const scale = T / ART_PX;
        ctx.drawImage(bp.canvas, 0, 0, bp.W * scale, bp.H * scale);
        if (!bp.hasAny) return;
        // slow drifting veins inside the claimed ground
        ctx.save();
        ctx.clip(bp.region);
        const off = (now * 0.004) % 24;
        if (this.veins.setTransform && typeof DOMMatrix !== 'undefined') this.veins.setTransform(new DOMMatrix([1, 0, 0, 1, off, off * 0.6]));
        ctx.globalAlpha = 0.45 + 0.2 * Math.sin(now * 0.002);
        ctx.fillStyle = this.veins;
        const v = this.viewRect;
        ctx.fillRect(v.x0 * T, v.y0 * T, (v.x1 - v.x0) * T, (v.y1 - v.y0) * T);
        ctx.restore();
    };

    // The line where the creep ends: a soft glow plus a marching dashed edge. Drawn
    // after the night overlay so it stays bright in the dark.
    R.drawBlightEdge = function (ctx, now) {
        const bp = this.blightPainter;
        if (!bp || !bp.hasAny) return;
        ctx.save();
        ctx.lineCap = 'square';
        ctx.strokeStyle = 'rgba(179, 91, 196, 0.35)';
        ctx.lineWidth = 3;
        ctx.stroke(bp.edges);
        ctx.strokeStyle = '#d27ae6';
        ctx.lineWidth = Math.max(1, 1.5 * this.dpr / this.z);
        ctx.setLineDash([4, 3]);
        ctx.lineDashOffset = -now * 0.006;
        ctx.stroke(bp.edges);
        ctx.restore();
    };

    // ---- drawing: y-sorted things -----------------------------------------------

    R.collectWar = function (list, colony, alpha, view) {
        const war = colony.war;
        if (war) {
            for (const m of war.monsters) {
                if (m.dead) continue;
                const ax = m.px + (m.x - m.px) * alpha, ay = m.py + (m.y - m.py) * alpha;
                if (ax < view.x0 || ax > view.x1 || ay < view.y0 || ay > view.y1) continue;
                list.push({ y: ay, m, ax, ay });
            }
            for (const p of war.portals) list.push({ y: p.y, portal: p });
        }
        const bl = colony.blight;
        if (bl) for (const nd of bl.nodes) {
            if (nd.x < view.x0 || nd.x > view.x1 || nd.y < view.y0 || nd.y > view.y1) continue;
            list.push({ y: nd.y, node: nd });
        }
        const story = colony.story;
        if (story && story.caravan && colony.keepB) {
            const k = colony.keepB;
            list.push({ y: k.y + k.h + 1.2, wagon: { x: k.x + k.w + 1.6, y: k.y + k.h + 1.2 } });
        }
    };

    R.drawWarItem = function (ctx, e, colony, now) {
        if (e.m) this.drawMonster(ctx, e.m, e.ax, e.ay, colony, now);
        else if (e.portal) this.drawPortal(ctx, e.portal, now);
        else if (e.node) this.drawNode(ctx, e.node, now);
        else if (e.wagon) ctx.drawImage(this.art.wagon.img, Math.round(e.wagon.x * T - 13), Math.round(e.wagon.y * T - 18));
    };

    R.drawMonster = function (ctx, m, ax, ay, colony, now) {
        const def = m.def;
        if (def.flying) {
            const x = ax * T, y = ay * T - 8 + Math.sin(now * 0.006 + m.id) * 2;
            const flick = 0.75 + 0.25 * Math.sin(now * 0.03 + m.id * 3);
            ctx.fillStyle = `rgba(179, 91, 196, ${0.35 * flick})`;
            ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = CORR_GLOW;
            ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f3d6ff';
            ctx.fillRect(x - 1, y - 1, 2, 2);
            this.monsterBar(ctx, m, x, y - 8);
            return;
        }
        const sprites = this.mon[m.type];
        const moving = m.next && !m.atk;
        const frame = moving ? Math.floor(now / 160 + m.id) % 2 : 0;
        const img = sprites[frame];
        const lunge = colony.ticks - m.attackAt < 3 ? 2 * m.face : 0;
        const x = Math.round(ax * T - img.width / 2 + lunge), y = Math.round(ay * T - img.height);
        ctx.fillStyle = 'rgba(27, 26, 36, 0.35)';
        ctx.fillRect(x + 1, Math.round(ay * T) - 1, img.width - 2, 2);
        ctx.save();
        if (m.face < 0) { ctx.translate(x * 2 + img.width, 0); ctx.scale(-1, 1); }
        ctx.drawImage(img, x, y);
        if (colony.ticks - m.hitAt < 2) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.7;
            ctx.drawImage(img, x, y);
        }
        ctx.restore();
        this.monsterBar(ctx, m, ax * T, y - 3);
    };

    // eyes that glow through the dark, so monsters read on the creep at night
    R.drawMonsterEyes = function (ctx, colony, alpha, k) {
        const war = colony.war, view = this.viewRect;
        if (!war || k <= 0.2) return;
        ctx.fillStyle = `rgba(246, 240, 107, ${Math.min(1, k * 1.2)})`;
        for (const m of war.monsters) {
            if (m.dead || m.def.flying) continue;
            const ax = m.px + (m.x - m.px) * alpha, ay = m.py + (m.y - m.py) * alpha;
            if (ax < view.x0 || ax > view.x1 || ay < view.y0 || ay > view.y1) continue;
            const e = EYES[m.type], img = this.mon[m.type][0];
            const x0 = Math.round(ax * T - img.width / 2), y0 = Math.round(ay * T - img.height);
            for (const [ex, ey] of e) {
                const px = m.face < 0 ? img.width - 1 - ex : ex;
                ctx.fillRect(x0 + px, y0 + ey, 1, 1);
            }
        }
    };

    R.monsterBar = function (ctx, m, cx, y) {
        if (m.hp >= m.maxHp) return;
        const w = m.def.boss ? 26 : 10;
        ctx.fillStyle = INK;
        ctx.fillRect(Math.round(cx - w / 2) - 1, y - 1, w + 2, 4);
        ctx.fillStyle = '#c23b3b';
        ctx.fillRect(Math.round(cx - w / 2), y, w * Math.max(0, m.hp / m.maxHp), 2);
    };

    R.drawPortal = function (ctx, p, now) {
        const x = p.x * T, y = p.y * T;
        const age = Math.min(1, (now - (p.shownAt || (p.shownAt = now))) / 700);
        const rx = 11 * age, ry = 15 * age;
        ctx.save();
        ctx.translate(x, y - ry);
        ctx.fillStyle = '#12091a';
        ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 2;
        for (let k = 0; k < 3; k++) {
            const a = now * 0.004 * (k % 2 ? -1 : 1) + k * 2.1;
            ctx.strokeStyle = [CORR_GLOW, '#d27ae6', CORR][k];
            ctx.beginPath();
            ctx.ellipse(0, 0, rx * (1 - k * 0.22), ry * (1 - k * 0.22), 0, a, a + 3.6);
            ctx.stroke();
        }
        ctx.fillStyle = '#f6f06b';
        ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();
    };

    R.drawNode = function (ctx, nd, now) {
        const img = this.mon.node;
        const x = Math.round(nd.x * T - img.width / 2), y = Math.round(nd.y * T - img.height + 2);
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.003 + nd.id);
        ctx.fillStyle = `rgba(179, 91, 196, ${0.15 + 0.2 * pulse})`;
        ctx.beginPath(); ctx.ellipse(nd.x * T, nd.y * T, 9 + pulse * 3, 4 + pulse, 0, 0, Math.PI * 2); ctx.fill();
        ctx.drawImage(img, x, y);
    };

    R.drawFires = function (ctx, colony, view, now) {
        const war = colony.war;
        if (!war) return;
        const W = colony.W;
        for (const i of war.fireList) {
            const x = i % W, y = (i - x) / W;
            if (x < view.x0 || x > view.x1 || y < view.y0 || y > view.y1 || !war.fireT[i]) continue;
            const t = now * 0.02 + i;
            flame(ctx, x * T + 5, y * T + 12, 7 + Math.sin(t) * 2, t);
            flame(ctx, x * T + 10, y * T + 13, 9 + Math.sin(t * 1.3) * 2, t * 1.3);
        }
        for (const b of colony.buildings) {
            if (!b.burning) continue;
            const n = b.w * 2;
            for (let k = 0; k < n; k++) {
                const t = now * 0.018 + k * 1.7 + b.id;
                const fx = (b.x + (k + 0.5) / n * b.w) * T, fy = (b.y + b.h * 0.55) * T - (k % 2) * 4;
                flame(ctx, fx, fy, 8 + Math.sin(t) * 3, t);
            }
            if (Math.random() < 0.08) this.fx.push({ kind: 'dust', x: (b.x + Math.random() * b.w) * T, y: b.y * T, vx: (Math.random() - 0.5) * 8, vy: -18, size: 3, t0: now, dur: 1400, color: '#4a4550' });
        }
    };

    // hit points on damaged buildings, the keep at night, and hurt villagers
    R.drawHealth = function (ctx, colony, alpha, view) {
        for (const b of colony.buildings) {
            if (!b.complete || b.hp >= b.maxHp - 0.5) continue;
            if (b.x + b.w < view.x0 || b.x > view.x1 || b.y + b.h < view.y0 || b.y > view.y1) continue;
            const art = this.art[b.type];
            const w = Math.max(12, b.w * T - 6), x = b.x * T + (b.w * T - w) / 2;
            const y = (b.y + b.h) * T - art.img.height - 5;
            const f = Math.max(0, b.hp / b.maxHp);
            ctx.fillStyle = INK;
            ctx.fillRect(x - 1, y - 1, w + 2, 5);
            ctx.fillStyle = '#34313f';
            ctx.fillRect(x, y, w, 3);
            ctx.fillStyle = f > 0.5 ? '#8fa850' : f > 0.25 ? ACCENT : '#c23b3b';
            ctx.fillRect(x, y, w * f, 3);
        }
        for (const v of colony.villagers) {
            if (v.inside || v.hp >= v.maxHp - 0.05) continue;
            const ax = v.px + (v.x - v.px) * alpha, ay = v.py + (v.y - v.py) * alpha;
            if (ax < view.x0 || ax > view.x1 || ay < view.y0 || ay > view.y1) continue;
            const x = Math.round(ax * T - 5), y = Math.round(ay * T - 14);
            ctx.fillStyle = INK;
            ctx.fillRect(x - 1, y - 1, 12, 3);
            ctx.fillStyle = '#8fa850';
            ctx.fillRect(x, y, 10 * Math.max(0, v.hp / v.maxHp), 1);
        }
    };

    // additive light at night: portals, wisps, nodes, fire, shrines
    R.drawWarLights = function (ctx, colony, k, now) {
        const glow = (x, y, r, rgb, a) => {
            const g = ctx.createRadialGradient(x, y, 1, x, y, r);
            g.addColorStop(0, `rgba(${rgb}, ${a})`);
            g.addColorStop(1, `rgba(${rgb}, 0)`);
            ctx.fillStyle = g;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        };
        const war = colony.war, bl = colony.blight;
        const kk = Math.max(0.25, k);
        if (war) {
            for (const p of war.portals) glow(p.x * T, p.y * T - 14, 60, '179, 91, 196', 0.5 * kk);
            for (const m of war.monsters) if (m.def.flying && !m.dead) glow(m.x * T, m.y * T - 8, 22, '179, 91, 196', 0.55 * kk);
            for (const i of war.fireList) {
                if (!war.fireT[i]) continue;
                const x = (i % colony.W) + 0.5, y = Math.floor(i / colony.W) + 0.5;
                glow(x * T, y * T, 34, '242, 160, 61', (0.35 + 0.1 * Math.sin(now * 0.02 + i)) * kk);
            }
            for (const b of colony.buildings) if (b.burning) glow((b.x + b.w / 2) * T, (b.y + b.h / 2) * T, (b.w + 3) * T, '242, 140, 61', 0.45 * kk);
        }
        if (bl && k > 0) for (const nd of bl.nodes) glow(nd.x * T, nd.y * T - 6, 40, '179, 91, 196', (0.25 + 0.1 * Math.sin(now * 0.003 + nd.id)) * k);
        if (k > 0) for (const b of colony.buildings) {
            if (b.complete && b.type === 'shrine') glow((b.x + 1) * T, b.y * T - 10, 70, '143, 211, 255', 0.4 * k);
        }
    };

    // ---- drawing: overlays ------------------------------------------------------

    R.drawGhostTiles = function (ctx, now) {
        const tiles = this.ghostTiles;
        if (!tiles || !tiles.length) return;
        const pulse = 0.6 + 0.3 * Math.sin(now * 0.008);
        for (const g of tiles) {
            ctx.fillStyle = g.ok ? `rgba(143, 168, 80, ${0.45 * pulse})` : 'rgba(194, 59, 59, 0.5)';
            ctx.fillRect(g.x * T, g.y * T, T, T);
            ctx.globalAlpha = 0.55;
            const img = this.art[g.type].img;
            ctx.drawImage(img, g.x * T + (T - img.width) / 2, (g.y + 1) * T - img.height);
            ctx.globalAlpha = 1;
        }
        const a = this.ghostAnchor;
        if (a) {
            ctx.strokeStyle = HK.RenderKit.HIGHLIGHT;
            ctx.lineWidth = 2 * this.dpr / this.z;
            ctx.strokeRect(a.x * T, a.y * T, T, T);
        }
    };

    R.drawReticle = function (ctx, now) {
        const r = this.reticle;
        if (!r) return;
        const x = (r.x + 0.5) * T, y = (r.y + 0.5) * T;
        ctx.save();
        ctx.strokeStyle = r.ok ? '#fff3c4' : '#ff6b6b';
        ctx.lineWidth = 2 * this.dpr / this.z;
        ctx.setLineDash([5, 4]);
        ctx.lineDashOffset = -now * 0.02;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(r.r * T, 9), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeRect(r.x * T, r.y * T, T, T);
        ctx.restore();
    };

    // Where tonight's trouble comes from, pinned to the screen edge when it's off-screen.
    R.drawOmen = function (ctx, colony, now) {
        const war = colony.war;
        if (!war || !colony.keepB) return;
        const targets = [];
        const k = colony.keepB, kx = (k.x + 1.5) * T, ky = (k.y + 1.5) * T;
        if (war.portals.length) {
            for (const p of war.portals) targets.push({ x: p.x * T, y: p.y * T, spread: 0, label: '' });
        } else if (war.omen) {
            const a = war.omen.angle;
            targets.push({ x: kx + Math.cos(a) * 30 * T, y: ky - Math.sin(a) * 30 * T, spread: war.omen.fuzzy ? war.omen.spread : 0, label: 'Tonight' });
        }
        const cw = this.canvas.width, ch = this.canvas.height, dpr = this.dpr;
        // the free band between the HUD bars
        const left = 40 * dpr, right = cw - 40 * dpr, top = (cw < 720 * dpr ? 130 : 80) * dpr, bottom = ch - 110 * dpr;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        for (const t of targets) {
            const sx = t.x * this.z + this.ox, sy = t.y * this.z + this.oy;
            if (sx > left && sx < right && sy > top && sy < bottom) continue;
            const cx = cw / 2, cy = (top + bottom) / 2;
            const ang = Math.atan2(sy - cy, sx - cx);
            const dx = Math.cos(ang), dy = Math.sin(ang);
            const tx = dx > 1e-6 ? (right - cx) / dx : dx < -1e-6 ? (left - cx) / dx : Infinity;
            const ty = dy > 1e-6 ? (bottom - cy) / dy : dy < -1e-6 ? (top - cy) / dy : Infinity;
            const s = Math.min(tx, ty);
            const px = cx + dx * s, py = cy + dy * s;
            const pulse = 1 + 0.12 * Math.sin(now * 0.006);
            ctx.translate(px, py);
            if (t.spread) {
                ctx.fillStyle = 'rgba(179, 91, 196, 0.28)';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, 34 * dpr, ang - t.spread / 2, ang + t.spread / 2);
                ctx.closePath();
                ctx.fill();
            }
            ctx.rotate(ang);
            ctx.scale(pulse, pulse);
            ctx.fillStyle = INK;
            ctx.beginPath(); ctx.moveTo(16 * dpr, 0); ctx.lineTo(-8 * dpr, -11 * dpr); ctx.lineTo(-3 * dpr, 0); ctx.lineTo(-8 * dpr, 11 * dpr); ctx.closePath(); ctx.fill();
            ctx.fillStyle = war.portals.length ? '#d27ae6' : CORR_GLOW;
            ctx.beginPath(); ctx.moveTo(12 * dpr, 0); ctx.lineTo(-5 * dpr, -8 * dpr); ctx.lineTo(-1 * dpr, 0); ctx.lineTo(-5 * dpr, 8 * dpr); ctx.closePath(); ctx.fill();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            if (t.label) {
                ctx.font = `700 ${Math.round(12 * dpr)}px system-ui, sans-serif`;
                ctx.textAlign = 'center';
                ctx.lineWidth = 3 * dpr;
                ctx.strokeStyle = INK;
                const ly = py + (Math.sin(ang) > 0 ? -22 : 26) * dpr;
                ctx.strokeText(t.label, px, ly);
                ctx.fillStyle = '#e6c3f0';
                ctx.fillText(t.label, px, ly);
            }
        }
        ctx.restore();
    };

    R.drawFlash = function (ctx, now) {
        const f = this.flash;
        if (!f) return;
        const t = (now - f.t0) / f.dur;
        if (t >= 1) { this.flash = null; return; }
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = `rgba(${f.color}, ${0.55 * (1 - t) * (1 - t)})`;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();
    };

    // world-space effects the base renderer doesn't know
    R.drawWarEffect = function (ctx, e, t) {
        if (e.kind === 'arrow') {
            const k = Math.min(1, t * 1.2), x = e.x0 + (e.x1 - e.x0) * k, y = e.y0 + (e.y1 - e.y0) * k - Math.sin(k * Math.PI) * 6;
            const dx = e.x1 - e.x0, dy = e.y1 - e.y0, d = Math.hypot(dx, dy) || 1;
            ctx.strokeStyle = e.heavy ? '#ece6d6' : '#d9b07a';
            ctx.lineWidth = e.heavy ? 1.5 : 1;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dx / d * 5, y - dy / d * 5); ctx.stroke();
            return true;
        }
        if (e.kind === 'spit') {
            const x = e.x0 + (e.x1 - e.x0) * t, y = e.y0 + (e.y1 - e.y0) * t - Math.sin(t * Math.PI) * 14;
            ctx.fillStyle = '#8fd14b';
            ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
            return true;
        }
        if (e.kind === 'soul') {
            ctx.globalAlpha = 0.8 * (1 - t);
            ctx.fillStyle = '#d27ae6';
            ctx.fillRect(e.x - 1 + Math.sin(t * 9) * 2, e.y - t * 22, 2, 3);
            return true;
        }
        if (e.kind === 'ring') {
            if (t < 0) return true;
            ctx.globalAlpha = 1 - t;
            ctx.strokeStyle = e.color;
            ctx.lineWidth = e.w;
            ctx.beginPath(); ctx.arc(e.x, e.y, Math.max(0.5, e.r0 + (e.r1 - e.r0) * (1 - (1 - t) * (1 - t))), 0, Math.PI * 2); ctx.stroke();
            return true;
        }
        if (e.kind === 'plus') {
            if (t < 0) return true;
            ctx.globalAlpha = 1 - t;
            ctx.fillStyle = '#b8d47a';
            const y = e.y - t * 18;
            ctx.fillRect(e.x - 2, y - 0.5, 5, 1.5); ctx.fillRect(e.x - 0.25, y - 2.25, 1.5, 5);
            return true;
        }
        if (e.kind === 'bolt') {
            ctx.globalAlpha = t < 0.5 ? 1 : 1 - (t - 0.5) * 2;
            ctx.lineJoin = 'round';
            for (const [w, c] of [[7, 'rgba(143, 211, 255, 0.35)'], [3, '#e6f7ff'], [1.2, '#ffffff']]) {
                ctx.strokeStyle = c;
                ctx.lineWidth = w;
                ctx.beginPath();
                e.pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
                ctx.stroke();
            }
            return true;
        }
        return false;
    };

    Object.assign(HK, { BlightPainter });
})(globalThis.HK = globalThis.HK || {});
