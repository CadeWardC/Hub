// ========================================
// HOLLOWKEEP - RENDERING
// Reads sim state, never writes it. The whole map is pre-baked once into an
// offscreen canvas (8 art pixels per tile) and blitted each frame; tiles the
// colony changes (felled trees, quarried rock, raised land) are repainted in
// place. Villagers, buildings and effects are drawn from pre-built pixel-art
// canvases and interpolated between ticks. render-war.js adds monsters, the
// corruption, fire and power effects to this renderer.
// ========================================

(function (HK) {
    'use strict';

    const TILE_SIZE = 16;   // world units per tile
    const ART_PX = 8;       // baked art pixels per tile
    const SPRITE_W = 8, SPRITE_H = 10;
    const TINTS = ['#c9c2a8', '#b07d4f', '#8fa850', '#4f8e96', '#c96b4a'];
    const HIGHLIGHT = '#f6d365';
    const INK = '#1b1a24';
    const RES_COLORS = { wood: '#b07d4f', stone: '#a8a29a', food: '#c23b3b', gold: '#f6d365', mana: '#8fd3ff' };

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function hash(x, y) {
        const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return s - Math.floor(s);
    }

    // ---- Map baking --------------------------------------------------------
    // Painted per tile so single tiles can be repainted when the colony changes them.

    class MapPainter {
        constructor(map) {
            const { TILE, TILE_DEFS, makeRng } = HK;
            this.map = map;
            this.W = map.width * ART_PX;
            this.H = map.height * ART_PX;
            this.canvas = document.createElement('canvas');
            this.canvas.width = this.W;
            this.canvas.height = this.H;
            this.ctx = this.canvas.getContext('2d');
            this.img = this.ctx.createImageData(this.W, this.H);
            this.base = TILE_DEFS.map(d => hexToRgb(d.color));
            this.accent = TILE_DEFS.map(d => hexToRgb(d.accent));
            this.ground = this.base[TILE.GRASS].map(c => c * 0.62);
            const rng = makeRng(map.seed);
            this.variant = new Float32Array(map.tiles.length);
            for (let i = 0; i < this.variant.length; i++) this.variant[i] = rng.next();
            for (let ty = 0; ty < map.height; ty++) {
                for (let tx = 0; tx < map.width; tx++) this.paintTile(tx, ty);
            }
            this.ctx.putImageData(this.img, 0, 0);
            map.dirty.length = 0;
        }

        // Repaint whatever the sim changed since the last frame.
        flush() {
            const map = this.map;
            if (!map.dirty.length) return;
            for (const i of map.dirty) {
                const tx = i % map.width, ty = Math.floor(i / map.width);
                this.paintTile(tx, ty);
                this.ctx.putImageData(this.img, 0, 0, tx * ART_PX, ty * ART_PX, ART_PX, ART_PX);
            }
            map.dirty.length = 0;
        }

        paintTile(tx, ty) {
            const { TILE, GEN } = HK;
            const map = this.map, base = this.base, accent = this.accent, px = this.img.data, W = this.W;
            const ti = map.idx(tx, ty);
            const type = map.tiles[ti];
            const h = map.heights[ti];
            const v = this.variant[ti];
            const hx = map.heights[map.idx(Math.min(tx + 1, map.width - 1), ty)];
            const hy = map.heights[map.idx(tx, Math.min(ty + 1, map.height - 1))];
            // height shading + light from the top-left using neighbouring heights
            const light = (0.84 + h * 0.2) * (1 + Math.max(-0.1, Math.min(0.1, (h - hx) + (h - hy))) * 3);
            const cx = 0.5 + (v - 0.5) * 0.25;
            const cy = 0.5 + (((v * 7.31) % 1) - 0.5) * 0.25;

            for (let py = 0; py < ART_PX; py++) {
                for (let pxl = 0; pxl < ART_PX; pxl++) {
                    const qx = (pxl + 0.5) / ART_PX, qy = (py + 0.5) / ART_PX;
                    const n = hash(tx * ART_PX + pxl, ty * ART_PX + py);
                    let r, g, b;
                    if (type === TILE.WATER) {
                        const depth = Math.min(Math.max(h / GEN.WATER_LEVEL, 0), 1);
                        const a = accent[type], c = base[type];
                        r = a[0] + (c[0] - a[0]) * depth;
                        g = a[1] + (c[1] - a[1]) * depth;
                        b = a[2] + (c[2] - a[2]) * depth;
                        if (n > 0.985) { r += 30; g += 30; b += 30; }
                    } else {
                        let c;
                        if (type === TILE.GRASS) {
                            const k = 0.94 + n * 0.1;
                            c = n > 0.94 ? accent[type] : [base[type][0] * k, base[type][1] * k, base[type][2] * k];
                        } else if (type === TILE.FOREST) {
                            const rr = Math.hypot(qx - cx, qy - cy);
                            if (rr < 0.36) {
                                const t = Math.min(Math.max((cy - qy) * 2.2 + 0.3, 0), 1);
                                const k = 0.95 + n * 0.08;
                                c = [0, 1, 2].map(j => (base[type][j] + (accent[type][j] - base[type][j]) * t) * k);
                            } else if (Math.hypot(qx - cx - 0.09, qy - cy - 0.12) < 0.38) {
                                c = this.ground.map(x => x * 0.7);
                            } else {
                                c = this.ground;
                            }
                        } else if (type === TILE.CLIFF) {
                            // raised earth: lit top lip, dark footing, stony speckle
                            c = py < 2 ? accent[type] : py >= ART_PX - 2 ? base[type].map(x => x * 0.62) : base[type];
                            if (n > 0.9) c = c.map(x => x * 0.82);
                            if (pxl === 0 || pxl === ART_PX - 1) c = c.map(x => x * 0.9);
                        } else {
                            c = base[TILE.ROCK];
                            if (n > 0.88) c = accent[TILE.ROCK];
                            else if (n < 0.12) c = c.map(x => x * 0.8);
                            if (type === TILE.ORE && n > 0.8) c = accent[TILE.ORE];
                        }
                        r = c[0] * light; g = c[1] * light; b = c[2] * light;
                    }
                    const o = ((ty * ART_PX + py) * W + tx * ART_PX + pxl) * 4;
                    px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = 255;
                }
            }
        }
    }

    // ---- Pixel art ---------------------------------------------------------

    function canvasOf(w, h) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

    // Build a sprite from string rows and a palette ('.' = transparent).
    function fromRows(rows, palette) {
        const c = canvasOf(rows[0].length, rows.length);
        const ctx = c.getContext('2d');
        rows.forEach((row, y) => {
            [...row].forEach((ch, x) => {
                if (palette[ch]) { ctx.fillStyle = palette[ch]; ctx.fillRect(x, y, 1, 1); }
            });
        });
        return c;
    }

    // Build a sprite with rect calls: fn(r) where r(x, y, w, h, color).
    function paint(w, h, fn) {
        const c = canvasOf(w, h);
        const ctx = c.getContext('2d');
        fn((x, y, ww, hh, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, ww, hh); }, ctx);
        return c;
    }

    // Villager: tinted cloth, skin head, dark outline; two walk frames.
    function makeVillagerSprites() {
        const body = [
            '..oooo..',
            '.osssso.',
            '.osssso.',
            '..oooo..',
            '.owwwwo.',
            'owwwwwwo',
            'owwwwwwo',
            '.owwwwo.'
        ];
        const legsA = ['.ow..wo.', '.oo..oo.'];
        const legsB = ['..owwo..', '..oooo..'];
        return TINTS.map(tint => {
            const pal = { o: INK, s: '#f2d4b0', w: tint };
            return [fromRows(body.concat(legsA), pal), fromRows(body.concat(legsB), pal)];
        });
    }

    function makeIcons() {
        return {
            wood: fromRows([
                '.oooooo.',
                'oBbBbBRo',
                'obBbBbRo',
                'oBbBbBRo',
                '.oooooo.'
            ], { o: INK, B: '#8a5a36', b: '#6d4529', R: '#d9b07a' }),
            stone: fromRows([
                '..ooo..',
                '.oLLSo.',
                'oLSSSSo',
                'oSSSSDo',
                '.oooooo'
            ], { o: INK, L: '#c9c3b8', S: '#9a948a', D: '#6f6a64' }),
            food: fromRows([
                '...g...',
                '..gg...',
                '.oRoRo.',
                'oRrRRro',
                'oRRoRRo',
                '.oo.oo.'
            ], { o: INK, g: '#8fa850', R: '#c23b3b', r: '#f28a7a' }),
            ore: fromRows([
                '..ooo..',
                '.oSYSo.',
                'oSSSYSo',
                'oYSSSSo',
                '.oooooo'
            ], { o: INK, S: '#7c766d', Y: '#d4a84b' }),
            planks: fromRows([
                'oooooooo',
                'oLLLLLLo',
                'oooooooo',
                'oBBBBBBo',
                'oooooooo'
            ], { o: INK, L: '#d9b07a', B: '#b07d4f' }),
            bricks: fromRows([
                'ooooooo',
                'oRRoRRo',
                'ooooooo',
                'oRoRRRo',
                'ooooooo'
            ], { o: INK, R: '#b86a4c' }),
            iron: fromRows([
                '.oooooo.',
                'oLLLLLLo',
                'oIIIIIIo',
                '.oooooo.'
            ], { o: INK, L: '#a9b1bd', I: '#5d6470' }),
            tools: fromRows([
                'oooo...',
                'oIIIo..',
                'oooWo..',
                '...oWo.',
                '....oWo',
                '.....oo'
            ], { o: INK, I: '#a9b1bd', W: '#8a5a36' }),
            gold: fromRows([
                '.oooo.',
                'oYYyYo',
                'oYyYYo',
                'oYYYyo',
                '.oooo.'
            ], { o: INK, Y: '#f6d365', y: '#c9a23a' }),
            mana: fromRows([
                '..o..',
                '.oMo.',
                'oMWMo',
                'oMMMo',
                '.oMo.',
                '..o..'
            ], { o: INK, M: '#8fd3ff', W: '#e6f7ff' }),
            pop: fromRows([
                '..ooo..',
                '.ossso.',
                '.ossso.',
                '..ooo..',
                '.owwwo.',
                'owwwwwo',
                'owwwwwo'
            ], { o: INK, s: '#f2d4b0', w: '#c9c2a8' })
        };
    }

    const WOOD = '#8a5a36', WOOD_D = '#6d4529', WOOD_L = '#a8744a';
    const STONE = '#9a948a', STONE_D = '#7c766d', STONE_L = '#b3ada2';
    const ROOF = '#7a3b2a', ROOF_L = '#9a4f36', SLATE = '#3f4658', SLATE_L = '#566079';
    const DOOR = '#4a2f1d', GLASS = '#2b2a38', ACCENT = '#f2a03d';

    // Buildings are drawn 1:1 in world units (16 px per tile) and may rise above
    // their footprint; `windows` are lit at night.
    function makeBuildingArt() {
        const house = paint(32, 38, r => {
            r(3, 18, 26, 20, INK);
            r(4, 19, 24, 18, WOOD);
            for (let y = 22; y < 37; y += 3) r(4, y, 24, 1, WOOD_D);
            r(22, 4, 5, 10, INK); r(23, 5, 3, 9, STONE);
            for (let y = 5; y < 22; y++) {
                const hw = Math.round(2 + (y - 5) * 13 / 16);
                r(16 - hw - 1, y, 2 * hw + 2, 1, INK);
                r(16 - hw, y, 2 * hw, 1, (y % 3 === 0) ? ROOF_L : ROOF);
            }
            r(0, 22, 32, 2, INK);
            r(1, 22, 30, 1, ROOF);
            r(13, 27, 6, 11, INK); r(14, 28, 4, 9, DOOR); r(17, 32, 1, 1, ACCENT);
            r(21, 26, 5, 5, INK); r(22, 27, 3, 3, GLASS);
            r(6, 26, 5, 5, INK); r(7, 27, 3, 3, GLASS);
            r(3, 37, 26, 1, INK);
        });
        const keep = paint(48, 60, r => {
            r(4, 24, 40, 36, INK);
            r(5, 25, 38, 34, STONE);
            for (let y = 28; y < 59; y += 4) {
                r(5, y, 38, 1, STONE_D);
                for (let x = 5 + ((y / 4) % 2) * 4; x < 43; x += 8) r(x, y - 3, 1, 3, STONE_D);
            }
            r(9, 16, 30, 10, INK); r(10, 17, 28, 8, SLATE);
            for (let x = 11; x < 38; x += 4) r(x, 18, 2, 6, SLATE_L);
            [0, 36].forEach(tx => {
                r(tx, 12, 12, 48, INK);
                r(tx + 1, 13, 10, 46, STONE_L);
                for (let y = 16; y < 59; y += 5) r(tx + 1, y, 10, 1, STONE);
                r(tx, 8, 12, 5, INK);
                r(tx + 1, 9, 2, 3, STONE_L); r(tx + 5, 9, 2, 3, STONE_L); r(tx + 9, 9, 2, 3, STONE_L);
                r(tx + 4, 22, 4, 6, INK); r(tx + 5, 23, 2, 4, GLASS);
            });
            r(18, 42, 12, 18, INK); r(19, 43, 10, 17, DOOR);
            r(20, 42, 8, 1, STONE_D); r(23, 44, 1, 15, WOOD_D);
            r(15, 32, 4, 5, INK); r(16, 33, 2, 3, GLASS);
            r(29, 32, 4, 5, INK); r(30, 33, 2, 3, GLASS);
            r(23, 0, 1, 17, INK);
            r(24, 1, 8, 6, INK); r(24, 2, 7, 4, ACCENT); r(24, 5, 7, 1, '#c96b4a');
        });
        const woodcutter = paint(32, 36, r => {
            r(2, 16, 22, 20, INK);
            r(3, 17, 20, 18, WOOD);
            for (let x = 5; x < 23; x += 4) r(x, 17, 1, 18, WOOD_D);
            r(6, 23, 12, 12, INK); r(7, 24, 10, 11, '#3a2a1e');
            r(8, 30, 8, 2, WOOD_L); r(9, 28, 6, 2, WOOD);
            for (let y = 8; y < 17; y++) r(0, y, 26, 1, INK);
            for (let y = 9; y < 16; y++) r(1, y, 24, 1, y % 2 ? '#5d6b3a' : '#6f7f45');
            r(0, 16, 26, 1, INK);
            // log pile
            const logs = [[24, 29], [28, 29], [26, 25], [24, 33], [28, 33]];
            logs.forEach(([x, y]) => { r(x - 1, y - 1, 5, 5, INK); r(x, y, 3, 3, '#d9b07a'); r(x + 1, y + 1, 1, 1, WOOD); });
            r(10, 20, 2, 2, ACCENT);
        });
        const stockpile = paint(48, 48, (r, ctx) => {
            ctx.fillStyle = 'rgba(138, 118, 80, 0.55)';
            ctx.fillRect(1, 1, 46, 46);
            r(1, 3, 46, 1, WOOD_D); r(1, 45, 46, 1, WOOD_D);
            r(2, 1, 1, 46, WOOD_D); r(45, 1, 1, 46, WOOD_D);
            for (let k = 0; k <= 4; k++) {
                const p = 1 + k * 11;
                [[p, 0], [p, 42], [0, p], [43, p]].forEach(([x, y]) => { r(x, y, 4, 5, INK); r(x + 1, y + 1, 2, 3, WOOD_L); });
            }
        });
        const farm = paint(48, 48, r => {
            r(0, 0, 48, 48, '#4a3524');
            r(1, 1, 46, 46, '#6b4f33');
            for (let y = 3; y < 47; y += 4) r(1, y, 46, 1, '#57402a');
            r(16, 1, 1, 46, '#4a3524'); r(32, 1, 1, 46, '#4a3524');
        });
        return {
            keep: { img: keep, windows: [[5, 23, 2, 4], [41, 23, 2, 4], [16, 33, 2, 3], [30, 33, 2, 3]] },
            house: { img: house, windows: [[22, 27, 3, 3], [7, 27, 3, 3]] },
            woodcutter: { img: woodcutter, windows: [[10, 20, 2, 2]] },
            stockpile: { img: stockpile, windows: [] },
            farm: { img: farm, windows: [] }
        };
    }

    function makeFlora() {
        const bushRows = [
            '....oooooo....',
            '..ooGGGGggoo..',
            '.oGGgRRGGggGo.',
            '.oGgGRrGgRRgo.',
            'oGGGgGGGgRrGGo',
            'oGRRGGgGGGgGgo',
            'oGRrGgGRRGGggo',
            '.oGGgGGRrGggo.',
            '..ooGGGGGGoo..',
            '....oooooo....'
        ];
        const pal = { o: INK, G: '#4f7a3a', g: '#3e6035' };
        const bare = fromRows(bushRows, Object.assign({ R: '#46703a', r: '#46703a' }, pal));
        const ripe = fromRows(bushRows, Object.assign({ R: '#d9464a', r: '#ffb3a8' }, pal));
        const crops = [
            ['............', '............', '............', '..g...g...g.', '..g...g...g.', '............'],
            ['............', '............', '.g.g..g.g...', '.ggg..ggg..g', '..g....g...g', '..g....g...g'],
            ['..g....g....', '.ggg..ggg..g', '.ggg..ggg.gg', '..g....g...g', '..g....g...g', '..g....g...g'],
            ['.YY...YY..Y.', '.YYY..YYY.YY', '..Y....Y...Y', '..y....y...y', '..y....y...y', '..y....y...y']
        ].map(rows => fromRows(rows, { g: '#8fa850', Y: '#e6c35c', y: '#b89b43' }));
        return { bush: { bare, ripe }, crops };
    }

    // ---- Renderer ----------------------------------------------------------

    class Renderer {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d', { alpha: false });
            this.villagerSprites = makeVillagerSprites();
            this.icons = makeIcons();
            this.art = makeBuildingArt();
            this.flora = makeFlora();
            this.painter = null;
            this.world = null;
            this.selected = null;      // {x, y} tile
            this.selectedVillager = null;
            this.selectedBuilding = null;
            this.ghost = null;         // {type, x, y, ok}
            this.gridStrength = 0;
            this.dpr = 1;
            this.viewW = 0;
            this.viewH = 0;
            this.fx = [];
            this.bounce = new Map();   // building id -> start ms
            this.drawList = [];
            this.viewRect = { x0: 0, y0: 0, x1: 0, y1: 0 };
            this.initWar();
        }

        setWorld(world) {
            this.world = world;
            this.painter = new MapPainter(world.map);
            this.selected = null;
            this.selectedVillager = null;
            this.selectedBuilding = null;
            this.ghost = null;
            this.fx.length = 0;
            this.bounce.clear();
            this.resetWar(world);
        }

        resize() {
            this.dpr = Math.min(window.devicePixelRatio || 1, 3);
            this.viewW = this.canvas.clientWidth;
            this.viewH = this.canvas.clientHeight;
            this.canvas.width = Math.round(this.viewW * this.dpr);
            this.canvas.height = Math.round(this.viewH * this.dpr);
        }

        // Sprite + frame for the HUD (build menu buttons, resource chips).
        iconURL(name) { return this.icons[name].toDataURL(); }
        buildingURL(type) { return this.art[type].img.toDataURL(); }

        // ---- sim events -> effects ----

        onEvent(ev, now) {
            const T = TILE_SIZE;
            switch (ev.type) {
                case 'gather':
                    for (let k = 0; k < 4; k++) {
                        this.fx.push({ kind: 'chip', x: ev.x * T, y: ev.y * T - 6, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 40,
                            color: ev.res === 'food' ? '#d9464a' : ev.res === 'wood' ? '#d9b07a' : '#c9c3b8', t0: now, dur: 450 });
                    }
                    break;
                case 'deposit':
                case 'deliver':
                    this.fx.push({ kind: 'float', x: ev.x * T, y: ev.y * T - 12, text: `+${ev.n}`, icon: ev.res, t0: now, dur: 1100 });
                    break;
                case 'built': {
                    const b = ev.b;
                    const cx = (b.x + b.w / 2) * T, cy = (b.y + b.h) * T;
                    for (let k = 0; k < 18; k++) {
                        const a = Math.random() * Math.PI * 2, s = 30 + Math.random() * 50;
                        this.fx.push({ kind: 'dust', x: cx + Math.cos(a) * b.w * 6, y: cy - 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.4 - 12,
                            size: 2 + Math.random() * 3, t0: now, dur: 700 + Math.random() * 400 });
                    }
                    for (let k = 0; k < 14; k++) {
                        this.fx.push({ kind: 'chip', x: cx, y: cy - b.h * T * 0.8, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 60,
                            color: [ACCENT, HIGHLIGHT, '#ece6d6'][k % 3], t0: now, dur: 900 });
                    }
                    this.fx.push({ kind: 'banner', x: cx, y: cy - b.h * T - 14, text: `${b.def.name} built!`, t0: now, dur: 2200 });
                    this.bounce.set(b.id, now);
                    break;
                }
                case 'placed':
                    this.bounce.set(ev.b.id, now);
                    break;
                default:
                    this.onWarEvent(ev, now);
            }
        }

        // ---- frame ----

        draw(camera, alpha, now) {
            const ctx = this.ctx, world = this.world;
            const z = camera.zoom * this.dpr;
            // world -> device pixels: (p - cam) * z + view/2
            const [sx, sy] = this.shakeOffset(now);
            const ox = this.canvas.width / 2 - camera.x * z + sx;
            const oy = this.canvas.height / 2 - camera.y * z + sy;
            this.ox = ox; this.oy = oy; this.z = z;
            this.alpha = alpha;

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = INK;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            if (!world) return;

            this.painter.flush();
            ctx.imageSmoothingEnabled = false;
            ctx.setTransform(z, 0, 0, z, ox, oy);
            const scale = TILE_SIZE / ART_PX;
            ctx.drawImage(this.painter.canvas, 0, 0, this.painter.W * scale, this.painter.H * scale);

            // visible tile range
            const map = world.map;
            const x0 = Math.max(0, Math.floor(-ox / z / TILE_SIZE));
            const y0 = Math.max(0, Math.floor(-oy / z / TILE_SIZE));
            const x1 = Math.min(map.width, Math.ceil((this.canvas.width - ox) / z / TILE_SIZE));
            const y1 = Math.min(map.height, Math.ceil((this.canvas.height - oy) / z / TILE_SIZE));
            const view = { x0: x0 - 1, y0: y0 - 1, x1: x1 + 1, y1: y1 + 4 };
            this.viewRect = view;
            if (world.colony) this.drawBlight(ctx, world.colony, now);

            if (this.gridStrength > 0) {
                ctx.strokeStyle = `rgba(27, 26, 36, ${this.gridStrength})`;
                ctx.lineWidth = 1 / z;
                ctx.beginPath();
                for (let x = x0; x <= x1; x++) { ctx.moveTo(x * TILE_SIZE, y0 * TILE_SIZE); ctx.lineTo(x * TILE_SIZE, y1 * TILE_SIZE); }
                for (let y = y0; y <= y1; y++) { ctx.moveTo(x0 * TILE_SIZE, y * TILE_SIZE); ctx.lineTo(x1 * TILE_SIZE, y * TILE_SIZE); }
                ctx.stroke();
            }

            const colony = world.colony;
            if (colony) this.drawColony(ctx, colony, alpha, view, now);

            if (this.selected) {
                const pulse = 0.65 + 0.35 * Math.sin(now * 0.006);
                ctx.strokeStyle = HIGHLIGHT;
                ctx.globalAlpha = pulse;
                ctx.lineWidth = 2 * this.dpr / z;
                ctx.strokeRect(this.selected.x * TILE_SIZE, this.selected.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                ctx.globalAlpha = 1;
            }

            // Phase 1 load-test wanderers, feet on their position, culled to the view
            const w = world.wanderers;
            for (let i = 0; i < w.count; i++) {
                const ax = w.px[i] + (w.x[i] - w.px[i]) * alpha;
                const ay = w.py[i] + (w.y[i] - w.py[i]) * alpha;
                if (ax < view.x0 || ax > view.x1 || ay < view.y0 || ay > view.y1) continue;
                ctx.drawImage(this.villagerSprites[i % TINTS.length][0],
                    ax * TILE_SIZE - SPRITE_W / 2, ay * TILE_SIZE - SPRITE_H, SPRITE_W, SPRITE_H);
            }

            if (this.ghost) this.drawGhost(ctx, this.ghost, now);
            this.drawGhostTiles(ctx, now);
            if (colony) this.drawNight(ctx, colony, view, now);
            this.drawEffects(ctx, now);
            this.drawReticle(ctx, now);
            if (colony && this.selectedVillager) this.drawNameTag(ctx, this.selectedVillager, alpha);
            if (colony) this.drawOmen(ctx, colony, now);
            this.drawFlash(ctx, now);
        }

        drawColony(ctx, colony, alpha, view, now) {
            const T = TILE_SIZE;
            const inView = b => b.x + b.w >= view.x0 && b.x <= view.x1 && b.y + b.h >= view.y0 && b.y - 3 <= view.y1;

            // flat things first: stockpiles, farms, and every foundation
            for (const b of colony.buildings) {
                if (!inView(b)) continue;
                if (b.def.walkable && b.complete) ctx.drawImage(this.art[b.type].img, b.x * T, b.y * T);
                else if (!b.complete) this.drawFoundation(ctx, colony, b);
            }

            // bushes and crops
            const W = colony.W;
            for (const i of colony.foodTiles) {
                const x = i % W, y = (i - x) / W;
                if (x < view.x0 || x > view.x1 || y < view.y0 || y > view.y1) continue;
                if (colony.foodKind[i] === HK.FOOD_BUSH) {
                    ctx.drawImage(colony.amount[i] ? this.flora.bush.ripe : this.flora.bush.bare, x * T + 1, y * T + 4);
                } else {
                    const stage = colony.amount[i] ? 3 : Math.max(0, Math.min(2, Math.floor((1 - colony.grow[i] / HK.BAL.CROP_GROW) * 3)));
                    ctx.drawImage(this.flora.crops[stage], x * T + 2, y * T + 7);
                }
            }

            // stockpile contents reflect the global stock
            this.drawStockpileGoods(ctx, colony, inView);

            // y-sorted: standing buildings, construction and villagers
            const list = this.drawList;
            list.length = 0;
            for (const b of colony.buildings) {
                if ((b.def.walkable && b.complete) || !inView(b)) continue;
                if (!b.complete && b.progress <= 0) continue;
                list.push({ y: b.y + b.h, b });
            }
            for (const v of colony.villagers) {
                if (v.inside) continue;
                const ax = v.px + (v.x - v.px) * alpha, ay = v.py + (v.y - v.py) * alpha;
                if (ax < view.x0 || ax > view.x1 || ay < view.y0 || ay > view.y1) continue;
                list.push({ y: ay, v, ax, ay });
            }
            this.collectWar(list, colony, alpha, view);
            list.sort((a, b) => a.y - b.y);
            for (const e of list) {
                if (e.b) this.drawBuilding(ctx, colony, e.b, now);
                else if (e.v) this.drawVillager(ctx, e.v, e.ax, e.ay, now);
                else this.drawWarItem(ctx, e, colony, now);
            }
            this.drawFires(ctx, colony, view, now);
            this.drawHealth(ctx, colony, alpha, view);

            // bars above sites, selection outlines
            for (const b of colony.buildings) {
                if (!inView(b)) continue;
                if (!b.complete) this.drawSiteBar(ctx, colony, b);
                if (b === this.selectedBuilding) {
                    ctx.strokeStyle = HIGHLIGHT;
                    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(now * 0.006);
                    ctx.lineWidth = 2 * this.dpr / this.z;
                    ctx.strokeRect(b.x * T, b.y * T, b.w * T, b.h * T);
                    ctx.globalAlpha = 1;
                }
            }
        }

        drawFoundation(ctx, colony, b) {
            const T = TILE_SIZE;
            ctx.fillStyle = 'rgba(122, 106, 74, 0.55)';
            ctx.fillRect(b.x * T, b.y * T, b.w * T, b.h * T);
            ctx.save();
            ctx.strokeStyle = 'rgba(236, 230, 214, 0.85)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 2]);
            ctx.strokeRect(b.x * T + 0.5, b.y * T + 0.5, b.w * T - 1, b.h * T - 1);
            ctx.restore();
            if (b.progress > 0) return;
            // delivered materials piled on the plot
            let k = 0;
            const cols = b.w * 2;
            for (const r of HK.RES) {
                const n = Math.min(b.delivered[r], 12);
                for (let j = 0; j < n; j += 2) {
                    const icon = this.icons[r];
                    ctx.drawImage(icon, b.x * T + 2 + (k % cols) * 8, b.y * T + 3 + Math.floor(k / cols) * 7);
                    k++;
                }
            }
        }

        drawStockpileGoods(ctx, colony, inView) {
            const stores = colony.buildings.filter(b => b.complete && b.type === 'stockpile' && inView(b));
            if (!stores.length) return;
            const T = TILE_SIZE;
            for (const b of stores) {
                let slot = 0;
                for (const r of HK.RES) {
                    const piles = Math.min(4, Math.ceil(colony.stock[r] / 15));
                    for (let p = 0; p < piles; p++, slot++) {
                        const sx = b.x * T + 7 + (slot % 4) * 9, sy = b.y * T + 9 + Math.floor(slot / 4) * 11;
                        ctx.drawImage(this.icons[r], sx, sy);
                        ctx.drawImage(this.icons[r], sx + 1, sy - 3);
                    }
                }
            }
        }

        drawBuilding(ctx, colony, b, now) {
            const T = TILE_SIZE;
            const img = this.art[b.type].img;
            const bx = b.x * T + (b.w * T - img.width) / 2, by = (b.y + b.h) * T - img.height;
            let sy = 1;
            const t0 = this.bounce.get(b.id);
            if (t0 !== undefined) {
                const t = (now - t0) / 650;
                if (t >= 1) this.bounce.delete(b.id);
                else sy = 1 + Math.sin(t * Math.PI * 3) * 0.12 * (1 - t);
            }
            if (b.complete) {
                if (sy === 1) { ctx.drawImage(img, bx, by); return; }
                const bottom = (b.y + b.h) * T;
                ctx.drawImage(img, bx, bottom - img.height * sy, img.width, img.height * sy);
                return;
            }
            // under construction: rise from the ground with scaffolding
            const p = Math.min(1, b.progress / b.def.work);
            const h = Math.max(1, Math.round(img.height * p));
            ctx.globalAlpha = 0.95;
            ctx.drawImage(img, 0, img.height - h, img.width, h, bx, by + img.height - h, img.width, h);
            ctx.globalAlpha = 1;
            const top = by + img.height - h;
            ctx.fillStyle = WOOD_L;
            const left = b.x * T + 1, right = (b.x + b.w) * T - 3, bottom = (b.y + b.h) * T;
            ctx.fillRect(left, top - 4, 2, bottom - top + 4);
            ctx.fillRect(right, top - 4, 2, bottom - top + 4);
            ctx.fillRect(left, top - 3, right - left + 2, 1);
            ctx.fillStyle = INK;
            ctx.fillRect(left, top - 2, right - left + 2, 1);
        }

        drawSiteBar(ctx, colony, b) {
            const T = TILE_SIZE;
            const img = this.art[b.type].img;
            const frac = colony.deliveredFrac(b), p = b.progress / b.def.work;
            const w = b.w * T - 6, x = b.x * T + 3;
            const y = b.progress > 0 ? (b.y + b.h) * T - img.height * p - 12 : b.y * T - 7;
            ctx.fillStyle = INK;
            ctx.fillRect(x - 1, y - 1, w + 2, 6);
            ctx.fillStyle = '#34313f';
            ctx.fillRect(x, y, w, 4);
            ctx.fillStyle = '#4f8e96';
            ctx.fillRect(x, y, w * frac, 1);
            ctx.fillStyle = ACCENT;
            ctx.fillRect(x, y + 1, w * p, 3);
        }

        drawVillager(ctx, v, ax, ay, now) {
            const T = TILE_SIZE;
            const moving = !!v.path;
            const frame = moving ? Math.floor(v.walked * 5) % 2 : 0;
            const sprite = this.villagerSprites[v.tint][frame];
            const fx = Math.round(ax * T - SPRITE_W / 2), fy = Math.round(ay * T - SPRITE_H);
            const working = v.state === 'work' && !moving;
            const phase = Math.floor(now / 140 + v.id * 0.37) % 2;
            const bob = working && phase ? 1 : 0;

            if (v === this.selectedVillager) {
                ctx.strokeStyle = HIGHLIGHT;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(ax * T, ay * T - 0.5, 6, 2.5, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            const asleep = v.state === 'sleep' && !moving;
            if (asleep) {
                ctx.drawImage(sprite, fx, fy + 3, SPRITE_W, SPRITE_H - 3);
                ctx.fillStyle = '#ece6d6';
                ctx.font = '6px monospace';
                ctx.fillText('z', fx + 8, fy + 1 - (Math.floor(now / 400) % 3));
                return;
            }
            ctx.drawImage(sprite, fx, fy + bob);
            if (v.trait === 'hero') {
                ctx.fillStyle = INK; ctx.fillRect(fx + 1, fy - 2 + bob, 6, 3);
                ctx.fillStyle = '#c9ced8'; ctx.fillRect(fx + 2, fy - 1 + bob, 4, 1);
                ctx.fillStyle = '#c23b3b'; ctx.fillRect(fx + 3, fy - 3 + bob, 2, 1);
            }
            if (v.sick) { ctx.fillStyle = '#8fd14b'; ctx.fillRect(fx + 3, fy + 2 + bob, 1, 1); ctx.fillRect(fx + 5, fy + 1 + bob, 1, 1); }

            if (working || (v.state === 'fight' && !moving)) {
                // swinging tool on the facing side
                const hx = v.face > 0 ? fx + 7 : fx - 1;
                ctx.fillStyle = WOOD_D;
                if (phase) ctx.fillRect(hx, fy + 4 + bob, 2, 3);
                else ctx.fillRect(hx + (v.face > 0 ? 1 : -1), fy + 1, 2, 3);
                ctx.fillStyle = STONE_L;
                ctx.fillRect(phase ? hx : hx + (v.face > 0 ? 1 : -1), phase ? fy + 7 + bob : fy, 2, 1);
            }
            if (v.carryN) {
                const icon = this.icons[v.carry];
                const ix = Math.round(ax * T - icon.width / 2), iy = fy - icon.height;
                ctx.drawImage(icon, ix, iy + frame);
                if (v.carryN > 1) ctx.drawImage(icon, ix, iy - 3 + frame);
            }
        }

        drawGhost(ctx, g, now) {
            const T = TILE_SIZE, def = HK.BUILDINGS[g.type], img = this.art[g.type].img;
            ctx.fillStyle = g.ok ? 'rgba(143, 168, 80, 0.45)' : 'rgba(194, 59, 59, 0.5)';
            ctx.fillRect(g.x * T, g.y * T, def.w * T, def.h * T);
            ctx.globalAlpha = 0.6;
            ctx.drawImage(img, g.x * T + (def.w * T - img.width) / 2, (g.y + def.h) * T - img.height);
            ctx.globalAlpha = 1;
            ctx.strokeStyle = g.ok ? '#b8d47a' : '#ff6b6b';
            ctx.lineWidth = 2 * this.dpr / this.z;
            ctx.strokeRect(g.x * T, g.y * T, def.w * T, def.h * T);
            // drag handle: four arrows
            const cx = (g.x + def.w / 2) * T, cy = (g.y + def.h / 2) * T;
            const pulse = 1 + Math.sin(now * 0.008) * 0.8;
            ctx.fillStyle = '#ece6d6';
            const d = def.w * T / 2 + 3 + pulse;
            [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => {
                ctx.beginPath();
                const tx = cx + dx * d, ty = cy + dy * (def.h * T / 2 + 3 + pulse);
                ctx.moveTo(tx + dx * 4, ty + dy * 4);
                ctx.lineTo(tx - dy * 3, ty + dx * 3);
                ctx.lineTo(tx + dy * 3, ty - dx * 3);
                ctx.fill();
            });
        }

        // Cold multiply at night (red under a blood moon), warm pools and lit windows on
        // top, then the glowing things: portals, wisps, fire, shrines, the corruption edge.
        drawNight(ctx, colony, view, now) {
            const k = colony.darkness();
            if (k <= 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                this.drawWarLights(ctx, colony, 0, now);
                ctx.restore();
                this.drawBlightEdge(ctx, now);
                return;
            }
            const T = TILE_SIZE;
            const blood = colony.war && colony.war.bloodMoon;
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalCompositeOperation = 'multiply';
            const m = k * 0.78;
            ctx.fillStyle = blood
                ? `rgb(${Math.round(255 - 95 * m)}, ${Math.round(255 - 200 * m)}, ${Math.round(255 - 185 * m)})`
                : `rgb(${Math.round(255 - 185 * m)}, ${Math.round(255 - 165 * m)}, ${Math.round(255 - 110 * m)})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.restore();

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (const b of colony.buildings) {
                if (!b.complete || !this.art[b.type].windows.length) continue;
                if (b.x + b.w < view.x0 - 4 || b.x > view.x1 + 4 || b.y + b.h < view.y0 - 4 || b.y > view.y1 + 4) continue;
                const cx = (b.x + b.w / 2) * T, cy = (b.y + b.h * 0.7) * T, r = (b.w + 2) * T;
                const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
                grad.addColorStop(0, `rgba(242, 160, 61, ${0.32 * k})`);
                grad.addColorStop(1, 'rgba(242, 160, 61, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
            }
            this.drawWarLights(ctx, colony, k, now);
            ctx.restore();
            this.drawMonsterEyes(ctx, colony, this.alpha, k);
            this.drawBlightEdge(ctx, now);

            ctx.fillStyle = `rgba(246, 211, 101, ${Math.min(1, k * 1.3)})`;
            for (const b of colony.buildings) {
                if (!b.complete) continue;
                const art = this.art[b.type];
                const bx = b.x * T + (b.w * T - art.img.width) / 2, by = (b.y + b.h) * T - art.img.height;
                if (art.glow) ctx.fillStyle = art.glow;
                for (const [x, y, w, h] of art.windows) ctx.fillRect(bx + x, by + y, w, h);
                if (art.glow) ctx.fillStyle = `rgba(246, 211, 101, ${Math.min(1, k * 1.3)})`;
            }
        }

        drawEffects(ctx, now) {
            const z = this.z, ox = this.ox, oy = this.oy, dpr = this.dpr;
            const fx = this.fx;
            let keep = 0;
            for (let k = 0; k < fx.length; k++) {
                const e = fx[k];
                const t = (now - e.t0) / e.dur;
                if (t >= 1) continue;
                fx[keep++] = e;
                if (t < 0) continue;
                const s = (now - e.t0) / 1000;
                if (e.kind === 'chip') {
                    ctx.fillStyle = e.color;
                    ctx.globalAlpha = 1 - t;
                    ctx.fillRect(e.x + e.vx * s, e.y + e.vy * s + 160 * s * s, 1.5, 1.5);
                } else if (e.kind === 'dust') {
                    ctx.fillStyle = e.color || '#d8ccb0';
                    ctx.globalAlpha = 0.7 * (1 - t);
                    const sz = e.size * (1 + t);
                    ctx.fillRect(e.x + e.vx * s - sz / 2, e.y + e.vy * s - sz / 2, sz, sz);
                } else {
                    this.drawWarEffect(ctx, e, t);
                }
                ctx.globalAlpha = 1;
            }
            fx.length = keep;
            ctx.globalAlpha = 1;

            // text in screen space so it stays crisp at every zoom
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (const e of fx) {
                if (e.kind !== 'float' && e.kind !== 'banner') continue;
                const t = (now - e.t0) / e.dur;
                if (t < 0) continue;
                const sx = e.x * z + ox;
                if (e.kind === 'float') {
                    const sy = (e.y - t * 14) * z + oy;
                    ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
                    ctx.font = `700 ${Math.round(15 * dpr)}px system-ui, sans-serif`;
                    const icon = this.icons[e.icon];
                    const is = 2.5 * dpr;
                    ctx.drawImage(icon, sx - (icon.width * is) - 6 * dpr, sy - icon.height * is / 2, icon.width * is, icon.height * is);
                    ctx.lineWidth = 3 * dpr;
                    ctx.strokeStyle = INK;
                    ctx.strokeText(e.text, sx + 4 * dpr, sy);
                    ctx.fillStyle = e.icon === 'food' ? '#f28a7a' : e.icon === 'gold' ? '#f6d365' : e.icon === 'mana' ? '#8fd3ff' : '#ece6d6';
                    ctx.fillText(e.text, sx + 4 * dpr, sy);
                } else {
                    const ease = Math.min(1, t * 6);
                    const sy = (e.y - 10 * (1 - Math.pow(1 - ease, 3)) - t * 6) * z + oy;
                    ctx.globalAlpha = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2;
                    ctx.font = `700 ${Math.round(18 * dpr * (0.8 + 0.2 * ease))}px system-ui, sans-serif`;
                    ctx.lineWidth = 4 * dpr;
                    ctx.strokeStyle = INK;
                    ctx.strokeText(e.text, sx, sy);
                    ctx.fillStyle = e.color || ACCENT;
                    ctx.fillText(e.text, sx, sy);
                }
            }
            ctx.restore();
            ctx.globalAlpha = 1;
        }

        drawNameTag(ctx, v, alpha) {
            if (v.inside) return;
            const ax = v.px + (v.x - v.px) * alpha, ay = v.py + (v.y - v.py) * alpha;
            const sx = ax * TILE_SIZE * this.z + this.ox, sy = (ay * TILE_SIZE - SPRITE_H - 9) * this.z + this.oy;
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.font = `600 ${Math.round(12 * this.dpr)}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.lineWidth = 3 * this.dpr;
            ctx.strokeStyle = INK;
            ctx.strokeText(v.name, sx, sy);
            ctx.fillStyle = HIGHLIGHT;
            ctx.fillText(v.name, sx, sy);
            ctx.restore();
        }

        // Villager whose sprite covers the world point, if any.
        villagerAt(colony, wx, wy, alpha) {
            const T = TILE_SIZE;
            let best = null, bestD = Infinity;
            for (const v of colony.villagers) {
                if (v.inside) continue;
                const ax = (v.px + (v.x - v.px) * alpha) * T, ay = (v.py + (v.y - v.py) * alpha) * T;
                const dx = wx - ax, dy = wy - (ay - SPRITE_H / 2);
                if (Math.abs(dx) > 7 || Math.abs(dy) > 9) continue;
                const d = dx * dx + dy * dy;
                if (d < bestD) { bestD = d; best = v; }
            }
            return best;
        }

        monsterAt(colony, wx, wy, alpha) {
            if (!colony.war) return null;
            const T = TILE_SIZE;
            let best = null, bestD = Infinity;
            for (const m of colony.war.monsters) {
                if (m.dead) continue;
                const ax = (m.px + (m.x - m.px) * alpha) * T, ay = (m.py + (m.y - m.py) * alpha) * T;
                const half = m.def.boss ? 14 : 8;
                const dx = wx - ax, dy = wy - (ay - half);
                if (Math.abs(dx) > half || Math.abs(dy) > half + 2) continue;
                const d = dx * dx + dy * dy;
                if (d < bestD) { bestD = d; best = m; }
            }
            return best;
        }
    }

    HK.RenderKit = { paint, fromRows, canvasOf, INK, HIGHLIGHT, ART_PX, TILE_SIZE, RES_COLORS };
    Object.assign(HK, { TILE_SIZE, Renderer });
})(globalThis.HK = globalThis.HK || {});
