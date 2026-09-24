// ========================================
// HOLLOWKEEP - WAR (the night)
// Dawn rolls an omen, dusk tears portals open, and the night's wave walks a
// flow field to the keep, smashing whatever is cheapest to break on the way.
// Towers and the keep shoot, brave villagers fight, everyone else runs.
// Fire lives here too: lightning and tower arrows start it, wells put it out.
// Pure data (no DOM), advanced by Colony.tick().
// ========================================

(function (HK) {
    'use strict';

    const { TILE, DAY, octile, compass, heapPush, heapPop } = HK;

    // unit: how much of a night's budget one costs. from: the first night it can appear.
    // gold: expected gold per kill (fractions are rolled).
    const MONSTERS = {
        husk:    { name: 'Husk', hp: 12, speed: 0.07, dmg: 2, cd: 10, bm: 1, gold: 0.4, unit: 1, from: 1, weight: 10 },
        wisp:    { name: 'Wisp', hp: 7, speed: 0.06, dmg: 0, cd: 0, bm: 0, gold: 1, unit: 1.5, from: 2, weight: 2.5, flying: true },
        runner:  { name: 'Runner', hp: 6, speed: 0.13, dmg: 1, cd: 6, bm: 0.5, gold: 0.3, unit: 0.75, from: 3, weight: 4 },
        brute:   { name: 'Brute', hp: 45, speed: 0.05, dmg: 8, cd: 14, bm: 2.5, gold: 2, unit: 3, from: 4, weight: 2.5 },
        spitter: { name: 'Spitter', hp: 9, speed: 0.06, dmg: 2, cd: 22, bm: 1.5, gold: 1, unit: 1.5, from: 6, weight: 2, range: 4 },
        golem:   { name: 'Siege Golem', hp: 500, speed: 0.035, dmg: 30, cd: 22, bm: 1.6, gold: 30, unit: 0, from: 10, weight: 0, boss: true }
    };

    const WAR = {
        PORTAL_MIN: 14,         // portals never open closer than this to the keep
        PORTAL_BASE: 36,        // ...or further than this; corruption in the omen's direction pulls them in
        PORTAL_OPEN: DAY.DUSK + 60,
        SPAWN_START: DAY.NIGHT,
        SPAWN_BURSTS: [0, 200, 400], // the wave arrives in three packs...
        BURST_SPREAD: 40,       // ...each spilling out over 4 s
        BOSS_EVERY: 10,
        SUN_BURN: 0.004,        // share of max hp lost per tick in the dawn light
        FIRE_TREE: 180,         // ticks a tree burns
        FIRE_BUILDING: 450,
        FIRE_SPREAD_TREE: 0.08, // per neighbour, checked every 10 ticks
        FIRE_SPREAD_BLD: 0.04,
        FIRE_BLD_DMG: 0.22,     // hp per tick
        FIRE_HURT: 0.1,
        FIRE_ARROW: 0.04,       // chance a tower arrow into a forest starts a fire
        STUCK_TICKS: 600
    };

    function waveBudget(n) { return 2 + 1.5 * n + 0.35 * Math.max(0, n - 3) ** 2; }
    function portalCount(n, rng) { return n < 5 ? 1 : n < 8 ? (rng.next() < 0.5 ? 2 : 1) : n < 12 ? 2 : 3; }

    const DX = [1, -1, 0, 0, 1, 1, -1, -1];
    const DY = [0, 0, 1, -1, 1, -1, 1, -1];

    class War {
        constructor(colony) {
            const n = colony.map.width * colony.map.height;
            this.colony = colony;
            this.map = colony.map;
            this.W = colony.map.width;
            this.rng = HK.makeRng((colony.world.seed ^ 0x2545f491) >>> 0);
            this.monsters = [];
            this.nextMonsterId = 1;
            this.portals = [];
            this.queue = [];
            this.field = new Float64Array(n).fill(Infinity); // doubles: the heap keys must compare exactly
            this.cost = new Float32Array(n);
            this.open = new Uint8Array(n);
            this.fieldDirty = true;
            this.ids = [];
            this.keys = [];
            this.fireT = new Uint16Array(n);
            this.fireList = [];
            this.nightNum = 0;
            this.bloodMoon = false;
            this.boss = false;
            this.omen = null;
            this.stats = { kills: 0, nightKills: 0, bossKills: 0 };
            this.nightStartKeep = 0;
            this.planNight(1);
        }

        keepCentre() { const k = this.colony.keepB; return { x: k.x + 1.5, y: k.y + 1.5 }; }

        // ---- the omen and the plan ----

        planNight(n) {
            const rng = this.rng;
            const angle = rng.int(0, 3) * Math.PI / 2 + rng.range(-0.35, 0.35);
            const fuzzy = n >= 3;
            this.nightNum = n;
            this.boss = n % WAR.BOSS_EVERY === 0;
            const dir = compass(Math.cos(angle), -Math.sin(angle));
            this.omen = { angle, fuzzy, spread: fuzzy ? Math.PI / 3 : 0.3, dir, label: fuzzy ? `somewhere ${dir}` : dir };
            this.colony.events.push({ type: 'omen', omen: this.omen, night: n, boss: this.boss });
            if (this.boss) this.colony.record('The ground trembles. Something huge walks tonight: a Siege Golem.', 'bad');
        }

        openPortals() {
            const n = this.nightNum, rng = this.rng, colony = this.colony;
            if (this.fieldDirty) this.computeField();
            const count = portalCount(n, rng);
            const angles = [this.omen.angle];
            for (let k = 1; k < count; k++) {
                let a;
                for (let t = 0; t < 20; t++) {
                    a = rng.range(0, Math.PI * 2);
                    if (angles.every(b => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) > 1.2)) break;
                }
                angles.push(a);
            }
            this.portals = [];
            for (const a of angles) {
                const spot = this.portalSpot(a);
                if (spot) this.portals.push({ x: spot.x + 0.5, y: spot.y + 0.5, angle: a, t0: colony.ticks });
            }
            if (!this.portals.length) return;

            // the wave: spend the night's budget on whatever has crawled out by now
            let budget = waveBudget(n) * (this.bloodMoon ? 2 : 1);
            const pool = Object.keys(MONSTERS).filter(k => MONSTERS[k].weight && MONSTERS[k].from <= n);
            const total = pool.reduce((s, k) => s + MONSTERS[k].weight, 0);
            const wave = [];
            while (budget > 0) {
                let r = rng.next() * total, type = pool[0];
                for (const k of pool) { r -= MONSTERS[k].weight; if (r <= 0) { type = k; break; } }
                wave.push(type);
                budget -= MONSTERS[type].unit;
            }
            if (this.boss) wave.splice(Math.floor(wave.length / 3), 0, 'golem');
            // the first portal (the omen's) gets the lion's share
            const packs = WAR.SPAWN_BURSTS.length;
            this.queue = wave.map((type, k) => ({
                t: WAR.SPAWN_START + WAR.SPAWN_BURSTS[k % packs] + rng.int(0, WAR.BURST_SPREAD),
                type,
                portal: this.portals.length === 1 || rng.next() < 0.6 ? this.portals[0] : this.portals[1 + rng.int(0, this.portals.length - 2)]
            }));
            this.queue.sort((a, b) => a.t - b.t);
            this.stats.nightKills = 0;
            this.nightStartKeep = colony.keepB.hp;
            const dirs = this.portals.map(p => compass(p.x - this.keepCentre().x, p.y - this.keepCentre().y));
            colony.events.push({ type: 'portals', portals: this.portals, count: wave.length });
            colony.record(`Night ${n}: ${this.portals.length > 1 ? `${this.portals.length} portals tear open (${dirs.join(', ')})` : `a portal tears open to the ${dirs[0]}`}. ${wave.length} monsters are coming${this.bloodMoon ? ' under a blood moon' : ''}.`, 'night');
        }

        // Walk out from the keep along the angle: the first corrupted tile past the
        // minimum distance is where the portal opens, so creeping corruption brings
        // the portals closer every night.
        portalSpot(angle) {
            const map = this.map, c = this.keepCentre(), bl = this.colony.blight;
            const cos = Math.cos(angle), sin = -Math.sin(angle);
            let r = WAR.PORTAL_BASE;
            for (let d = WAR.PORTAL_MIN; d <= WAR.PORTAL_BASE; d++) {
                const x = Math.floor(c.x + cos * d), y = Math.floor(c.y + sin * d);
                if (!map.inBounds(x, y)) { r = d - 1; break; }
                if (bl && bl.corr[map.idx(x, y)] >= 128) { r = d; break; }
            }
            for (; r >= 6; r -= 2) {
                const px = Math.max(2, Math.min(map.width - 3, Math.floor(c.x + cos * r)));
                const py = Math.max(2, Math.min(map.height - 3, Math.floor(c.y + sin * r)));
                let best = null, bestD = Infinity;
                for (let y = py - 6; y <= py + 6; y++) {
                    for (let x = px - 6; x <= px + 6; x++) {
                        if (!map.inBounds(x, y)) continue;
                        const i = map.idx(x, y);
                        if (!this.open[i] || this.field[i] === Infinity || this.colony.bldAt[i] || map.tiles[i] === TILE.WATER) continue;
                        const d = Math.hypot(x - px, y - py);
                        if (d < bestD) { bestD = d; best = { x, y }; }
                    }
                }
                if (best) return best;
            }
            return null;
        }

        // ---- flow field ----
        // Dijkstra outward from the keep. Entering a tile costs cost[j]: open ground is
        // cheap, water slow, and walls, buildings and cliffs cost more the more hit
        // points they have, so monsters go around strong walls and through weak ones.

        tileCost(j) {
            const colony = this.colony;
            const id = colony.bldAt[j];
            if (id) {
                const b = colony.byId.get(id);
                if (b && b.complete) {
                    if (b.type === 'keep') return [1, 0];
                    if (!b.def.walkable || b.def.blocksMonsters) return [2 + b.hp / 6, 0];
                }
            }
            switch (this.map.tiles[j]) {
                case TILE.WATER: return [5, 1];
                case TILE.ROCK: case TILE.ORE: return [Infinity, 0];
                case TILE.CLIFF: return [2 + colony.cliffHp[j] / 6, 0];
                case TILE.FOREST: return [1.3, 1];
                default: return [1, 1];
            }
        }

        computeField() {
            this.fieldDirty = false;
            const { field, cost, open, ids, keys, W } = this;
            const H = this.map.height, n = field.length;
            for (let j = 0; j < n; j++) {
                const c = this.tileCost(j);
                cost[j] = c[0];
                open[j] = c[1];
            }
            field.fill(Infinity);
            ids.length = 0; keys.length = 0;
            const k = this.colony.keepB;
            for (let y = k.y; y < k.y + k.h; y++) {
                for (let x = k.x; x < k.x + k.w; x++) { const i = y * W + x; field[i] = 0; heapPush(ids, keys, i, 0); }
            }
            while (ids.length) {
                const d0 = keys[0];
                const j = heapPop(ids, keys);
                if (d0 > field[j]) continue;
                const cj = cost[j];
                if (cj === Infinity) continue;
                const jx = j % W, jy = (j - jx) / W;
                for (let d = 0; d < 8; d++) {
                    const ix = jx + DX[d], iy = jy + DY[d];
                    if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
                    const i = iy * W + ix;
                    if (cost[i] === Infinity) continue;
                    let step = 1;
                    if (d >= 4) {
                        if (!open[jy * W + ix] || !open[iy * W + jx]) continue;
                        step = Math.SQRT2;
                    }
                    const nd = d0 + step * cj;
                    if (nd < field[i]) { field[i] = nd; heapPush(ids, keys, i, nd); }
                }
            }
        }

        // ---- monsters ----

        spawn(type, x, y) {
            const def = MONSTERS[type];
            const m = {
                id: this.nextMonsterId++, type, def, x, y, px: x, py: y, hp: def.hp, maxHp: def.hp,
                cd: this.rng.int(0, 8), next: null, atk: null, face: 1, hitAt: -1000, attackAt: -1000,
                dead: false, stuck: 0, goal: null, seedT: 0, jx: this.rng.range(-0.25, 0.25), jy: this.rng.range(-0.2, 0.2)
            };
            if (def.flying) this.wispGoal(m);
            this.monsters.push(m);
            return m;
        }

        wispGoal(m) {
            const c = this.keepCentre();
            const a = this.rng.range(0, Math.PI * 2), r = this.rng.range(3, 9);
            m.goal = {
                x: Math.max(1, Math.min(this.W - 2, c.x + Math.cos(a) * r)),
                y: Math.max(1, Math.min(this.map.height - 2, c.y + Math.sin(a) * r))
            };
        }

        nearestMonster(x, y, r, groundOnly) {
            let best = null, bestD = r * r;
            for (const m of this.monsters) {
                if (m.dead || (groundOnly && m.def.flying)) continue;
                const d = (m.x - x) ** 2 + (m.y - y) ** 2;
                if (d <= bestD) { bestD = d; best = m; }
            }
            return best;
        }

        damageMonster(m, dmg, by) {
            if (m.dead) return;
            m.hp -= dmg;
            m.hitAt = this.colony.ticks;
            if (m.hp <= 0) this.killMonster(m, by, by !== 'sun');
        }

        killMonster(m, by, reward) {
            if (m.dead) return;
            m.dead = true;
            const colony = this.colony;
            if (reward) {
                const gold = Math.floor(m.def.gold + this.rng.next());
                colony.stock.gold += gold;
                this.stats.kills++;
                this.stats.nightKills++;
                if (gold) colony.events.push({ type: 'deposit', x: m.x, y: m.y - 0.6, res: 'gold', n: gold });
            }
            colony.events.push({ type: 'mdeath', m, x: m.x, y: m.y });
            if (m.def.boss && reward) {
                this.stats.bossKills++;
                colony.record(`The Siege Golem has fallen${by ? ` (the final blow: ${by})` : ''}! +${m.def.gold} gold.`, 'good');
            }
        }

        villagerNear(m, r) {
            let best = null, bestD = r * r;
            for (const v of this.colony.villagers) {
                if (v.inside || v.dead) continue;
                const d = (v.x - m.x) ** 2 + (v.y - m.y) ** 2;
                if (d <= bestD) { bestD = d; best = v; }
            }
            return best;
        }

        tickMonster(m) {
            const colony = this.colony, W = this.W, def = m.def;
            m.px = m.x; m.py = m.y;
            if (m.cd > 0) m.cd--;
            const here = Math.floor(m.y) * W + Math.floor(m.x);
            if (this.fireT[here] && !def.flying) this.damageMonster(m, 0.15, 'fire');
            if (m.dead) return;

            if (def.flying) {
                const dx = m.goal.x - m.x, dy = m.goal.y - m.y, d = Math.hypot(dx, dy);
                if (d < 0.3) this.wispGoal(m);
                else { m.x += dx / d * def.speed; m.y += dy / d * def.speed; if (Math.abs(dx) > 0.05) m.face = dx > 0 ? 1 : -1; }
                if (++m.seedT >= 6 && colony.blight) { m.seedT = 0; colony.blight.seed(here); }
                return;
            }

            // fight whoever is in reach
            const v = this.villagerNear(m, 1.1);
            if (v) {
                m.next = null;
                if (Math.abs(v.x - m.x) > 0.05) m.face = v.x > m.x ? 1 : -1;
                if (m.cd === 0) {
                    m.cd = def.cd;
                    m.attackAt = colony.ticks;
                    colony.hurt(v, def.dmg, def.name);
                    colony.events.push({ type: 'mhit', x: v.x, y: v.y - 0.4 });
                }
                return;
            }

            // spitters stop and spit at anything in range
            if (def.range && m.cd === 0) {
                const t = this.spitTarget(m);
                if (t) {
                    m.cd = def.cd;
                    m.attackAt = colony.ticks;
                    colony.events.push({ type: 'spit', x0: m.x, y0: m.y - 0.5, x1: t.x, y1: t.y });
                    if (t.v) colony.hurt(t.v, def.dmg, def.name);
                    else colony.damageBuilding(t.b, def.dmg * def.bm, def.name);
                    return;
                }
            }

            // smash what's in the way
            if (m.atk) {
                const a = m.atk;
                const alive = a.b ? (!a.b.removed && a.b.complete && a.b.hp > 0) : this.map.tiles[a.i] === TILE.CLIFF;
                if (!alive) { m.atk = null; }
                else {
                    if (m.cd === 0) {
                        m.cd = def.cd;
                        m.attackAt = colony.ticks;
                        const dmg = def.dmg * def.bm;
                        colony.events.push({ type: 'mhit', x: a.x, y: a.y });
                        if (a.b) colony.damageBuilding(a.b, dmg, def.name);
                        else {
                            colony.cliffHp[a.i] = Math.max(0, colony.cliffHp[a.i] - dmg);
                            if (colony.cliffHp[a.i] <= 0) colony.setGround(a.i % W, Math.floor(a.i / W), TILE.GRASS);
                            else this.fieldDirty = true;
                        }
                    }
                    return;
                }
            }

            if (!m.next) this.chooseStep(m, here);
            if (!m.next) {
                if (++m.stuck > WAR.STUCK_TICKS) this.killMonster(m, null, false);
                return;
            }
            m.stuck = 0;
            const speed = def.speed * (this.map.tiles[here] === TILE.WATER ? 0.4 : 1);
            const dx = m.next.x - m.x, dy = m.next.y - m.y, d = Math.hypot(dx, dy);
            if (Math.abs(dx) > 0.02) m.face = dx > 0 ? 1 : -1;
            if (d <= speed) { m.x = m.next.x; m.y = m.next.y; m.next = null; }
            else { m.x += dx / d * speed; m.y += dy / d * speed; }
        }

        chooseStep(m, i) {
            const { field, cost, open, W } = this;
            const H = this.map.height;
            const x = i % W, y = (i - x) / W;
            let best = -1, bestV = Infinity;
            for (let d = 0; d < 8; d++) {
                const nx = x + DX[d], ny = y + DY[d];
                if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                const j = ny * W + nx;
                if (cost[j] === Infinity) continue;
                let step = 1;
                if (d >= 4) {
                    if (!open[y * W + nx] || !open[ny * W + x]) continue;
                    step = Math.SQRT2;
                }
                const val = field[j] + step * cost[j];
                if (val < bestV) { bestV = val; best = j; }
            }
            if (best < 0) return;
            if (field[i] === Infinity && bestV === Infinity) {
                // cut off from the keep entirely: shamble straight at it
                const c = this.keepCentre();
                const tx = Math.floor(m.x + Math.sign(c.x - m.x)), ty = Math.floor(m.y + Math.sign(c.y - m.y));
                if (this.map.inBounds(tx, ty) && open[ty * W + tx]) m.next = { x: tx + 0.5, y: ty + 0.5 };
                return;
            }
            const bx = best % W, by = (best - bx) / W;
            if (!open[best]) {
                const id = this.colony.bldAt[best];
                const b = id ? this.colony.byId.get(id) : null;
                if (b && b.complete) { m.atk = { b, x: bx + 0.5, y: by + 0.5 }; return; }
                if (this.map.tiles[best] === TILE.CLIFF) { m.atk = { i: best, x: bx + 0.5, y: by + 0.5 }; return; }
            }
            m.next = { x: bx + 0.5 + m.jx * 0.5, y: by + 0.5 + m.jy * 0.5 };
        }

        spitTarget(m) {
            const r = m.def.range;
            const v = this.villagerNear(m, r);
            if (v) return { v, x: v.x, y: v.y - 0.4 };
            let best = null, bestD = r * r;
            for (const b of this.colony.buildings) {
                if (!b.complete || b.def.cat !== 'defense') continue;
                const bx = b.x + b.w / 2, by = b.y + b.h / 2;
                const d = (bx - m.x) ** 2 + (by - m.y) ** 2;
                if (d <= bestD) { bestD = d; best = b; }
            }
            return best ? { b: best, x: best.x + best.w / 2, y: best.y + best.h / 2 - 0.5 } : null;
        }

        // ---- towers ----

        tickTowers() {
            const colony = this.colony;
            const fletch = colony.hasTech('fletching') ? 1 : 0;
            const longbow = colony.hasTech('longbows') ? 1.5 : 0;
            const ballista = colony.hasTech('ballistae') ? 1.5 : 1;
            for (const b of colony.buildings) {
                const t = b.def.tower;
                if (!t || !b.complete) continue;
                if (b.cd > 0) { b.cd--; continue; }
                if (!this.monsters.length) continue;
                const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
                const range = t.range + (b.type === 'keep' ? 0 : longbow);
                const m = this.nearestMonster(cx, cy, range, false);
                if (!m) continue;
                b.cd = t.cd;
                const dmg = (t.dmg + fletch) * (b.type === 'keep' ? 1 : ballista);
                colony.events.push({ type: 'shot', kind: b.type, x0: cx, y0: b.type === 'keep' ? b.y + 0.2 : b.y - 0.8, x1: m.x, y1: m.y - 0.4 });
                const mi = Math.floor(m.y) * this.W + Math.floor(m.x);
                this.damageMonster(m, dmg, `the ${b.def.name.toLowerCase()}`);
                if (b.type === 'tower' && this.map.tiles[mi] === TILE.FOREST && this.rng.next() < WAR.FIRE_ARROW) this.ignite(mi);
            }
        }

        // ---- fire ----

        ignite(i) {
            const colony = this.colony;
            const id = colony.bldAt[i];
            if (id) {
                const b = colony.byId.get(id);
                if (b && b.complete) this.igniteBuilding(b);
                return;
            }
            if (this.fireT[i] || this.map.tiles[i] !== TILE.FOREST) return;
            this.fireT[i] = WAR.FIRE_TREE;
            this.fireList.push(i);
            colony.events.push({ type: 'ignite', x: (i % this.W) + 0.5, y: Math.floor(i / this.W) + 0.5 });
        }

        igniteBuilding(b) {
            if (!b.def.wooden || b.burning || b.removed) return;
            b.burning = WAR.FIRE_BUILDING;
            this.colony.events.push({ type: 'fire', b });
            this.colony.record(`Fire! The ${b.def.name.toLowerCase()} ${this.colony.where(b.x + b.w / 2, b.y + b.h / 2, b)} is burning.`, 'bad');
        }

        tickFire() {
            const colony = this.colony, W = this.W, rng = this.rng, bl = colony.blight;
            const spreadFrom = (x, y, chanceTree, chanceBld) => {
                for (let d = 0; d < 4; d++) {
                    const nx = x + DX[d], ny = y + DY[d];
                    if (!this.map.inBounds(nx, ny)) continue;
                    const j = ny * W + nx;
                    const id = colony.bldAt[j];
                    if (id) { if (rng.next() < chanceBld) this.ignite(j); }
                    else if (this.map.tiles[j] === TILE.FOREST && !this.fireT[j] && rng.next() < chanceTree) this.ignite(j);
                }
            };
            let keep = 0;
            for (let k = 0; k < this.fireList.length; k++) {
                const i = this.fireList[k];
                if (!this.fireT[i]) continue; // doused
                if (bl && bl.corr[i]) bl.purge(i); // fire burns corruption away
                if (--this.fireT[i] === 0) { colony.killTree(i); continue; }
                if (this.fireT[i] % 10 === 0) spreadFrom(i % W, Math.floor(i / W), WAR.FIRE_SPREAD_TREE, WAR.FIRE_SPREAD_BLD);
                this.fireList[keep++] = i;
            }
            this.fireList.length = keep;
            for (const b of colony.buildings.slice()) {
                if (!b.burning) continue;
                b.burning--;
                colony.damageBuilding(b, WAR.FIRE_BLD_DMG, 'fire');
                if (b.removed || colony.over) continue;
                if (b.burning % 20 === 0) {
                    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) spreadFrom(x, y, WAR.FIRE_SPREAD_TREE, WAR.FIRE_SPREAD_BLD * 0.5);
                }
            }
            if (this.fireList.length) {
                for (const v of colony.villagers.slice()) {
                    if (!v.inside && this.fireT[colony.tileOf(v)]) colony.hurt(v, WAR.FIRE_HURT, 'fire');
                }
            }
        }

        // Fires the villagers will fight: only within reach of a well.
        fireTargets() {
            const colony = this.colony;
            const wells = colony.buildings.filter(b => b.type === 'well' && b.complete);
            if (!wells.length) return [];
            const R = HK.BAL.WELL_RADIUS;
            const near = (x, y) => wells.some(w => Math.hypot(w.x + 0.5 - x, w.y + 0.5 - y) <= R);
            const out = [];
            for (const i of this.fireList) {
                const x = i % this.W, y = Math.floor(i / this.W);
                if (this.fireT[i] > 20 && near(x + 0.5, y + 0.5)) out.push({ i, x, y });
            }
            for (const b of colony.buildings) if (b.burning && near(b.x + b.w / 2, b.y + b.h / 2)) out.push({ b });
            return out;
        }

        douse(target, v) {
            if (target.b) { target.b.burning = 0; }
            else if (this.fireT[target.i]) { this.fireT[target.i] = 0; }
            else return;
            const x = target.b ? target.b.x + target.b.w / 2 : (target.i % this.W) + 0.5;
            const y = target.b ? target.b.y + target.b.h / 2 : Math.floor(target.i / this.W) + 0.5;
            this.colony.events.push({ type: 'douse', x, y });
        }

        // ---- the cycle ----

        dawn(day) {
            const colony = this.colony, bl = colony.blight;
            const n = this.nightNum;
            // the sun finishes off stragglers; wisps that survived take root
            let rooted = 0, burned = 0;
            for (const m of this.monsters) {
                if (m.dead) continue;
                if (m.def.flying && bl) { bl.addNode(m.x, m.y, 1.5); rooted++; }
                else burned++;
                this.killMonster(m, null, false);
            }
            this.monsters.length = 0;
            this.queue.length = 0;
            if (bl) for (const p of this.portals) bl.addNode(p.x, p.y, 3);
            const hadPortals = this.portals.length;
            this.portals = [];
            if (hadPortals) {
                const k = colony.keepB;
                const pct = Math.round(k.hp / k.maxHp * 100);
                colony.record(`Night ${n} is over. ${this.stats.nightKills} monsters slain${burned ? `, ${burned} burned in the sunrise` : ''}. The keep stands at ${pct}%.`, 'night');
                if (rooted) colony.record(`${rooted > 1 ? `${rooted} wisps` : 'A wisp'} survived the night and took root as corruption.`, 'bad');
                if (hadPortals) colony.record(`The portal${hadPortals > 1 ? 's' : ''} closed, leaving corruption behind.`, 'bad');
                colony.events.push({ type: 'nightEnd', night: n, kills: this.stats.nightKills, keepPct: pct });
            }
            this.bloodMoon = false;
            this.planNight(day);
        }

        tick() {
            const colony = this.colony;
            const t = colony.timeOfDay();
            if (t === WAR.PORTAL_OPEN) this.openPortals();
            while (this.queue.length && t >= DAY.DUSK && this.queue[0].t <= t) {
                const q = this.queue.shift();
                this.spawn(q.type, q.portal.x + this.rng.range(-0.3, 0.3), q.portal.y + this.rng.range(-0.3, 0.3));
            }
            if (this.fieldDirty && (this.monsters.length || this.queue.length) && colony.ticks % 3 === 0) this.computeField();
            if (this.monsters.length) {
                const dawnLight = t < DAY.DAWN ? 1 - t / DAY.DAWN : 0;
                for (const m of this.monsters) {
                    if (m.dead) continue;
                    this.tickMonster(m);
                    if (dawnLight > 0.3 && !m.dead && !m.def.boss) this.damageMonster(m, m.maxHp * WAR.SUN_BURN, 'sun');
                    if (colony.over) return;
                }
                this.monsters = this.monsters.filter(m => !m.dead);
            }
            this.tickTowers();
            this.tickFire();
        }

        remaining() { return this.monsters.reduce((n, m) => n + (m.dead ? 0 : 1), 0) + this.queue.length; }
    }

    Object.assign(HK, { War, MONSTERS, WAR, waveBudget });
})(globalThis.HK = globalThis.HK || {});
