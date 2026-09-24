// ========================================
// HOLLOWKEEP - DIVINE (mana, god powers, the tech tree)
// Mana trickles from the keep, flows from shrines (faster with a priest) and
// from corruption the shrines purify. It pays for five powers (tap the power,
// then the target) and, with gold, for a 15-node tech tree in three branches.
// Pure data (no DOM); powers are cast from the UI and take effect immediately.
// ========================================

(function (HK) {
    'use strict';

    const { TILE } = HK;

    // cd in ticks (10 per second at 1x)
    const POWERS = {
        lightning: { name: 'Lightning', cost: 20, cd: 80, radius: 1.5, dmg: 18,
                     info: 'Strikes a small circle for heavy damage. Trees and wooden buildings it hits may catch fire.' },
        heal:      { name: 'Heal', cost: 15, cd: 150, radius: 3.5,
                     info: 'Restores villagers in the circle, cures plague, and mends and douses buildings.' },
        raise:     { name: 'Raise land', cost: 6, cd: 4, radius: 0.5,
                     info: 'Water becomes ground, ground becomes cliff. Cliffs block paths; monsters have to smash through.' },
        lower:     { name: 'Lower land', cost: 6, cd: 4, radius: 0.5,
                     info: 'Cliffs and rock become ground, ground becomes water. Monsters wade slowly through water.' },
        cleanse:   { name: 'Cleanse', cost: 30, cd: 200, radius: 3.5,
                     info: 'Scours corruption from a circle and destroys any corruption node in it (+25 mana). Wisps caught in it die.' }
    };
    const POWER_ORDER = ['lightning', 'heal', 'raise', 'lower', 'cleanse'];

    const TIER_COST = [null, { gold: 5, mana: 10 }, { gold: 10, mana: 20 }, { gold: 18, mana: 30 }, { gold: 28, mana: 40 }, { gold: 40, mana: 60 }];
    const TECH_BRANCHES = [
        { id: 'economy', name: 'Economy', techs: [
            { id: 'axes', name: 'Sharp Axes', info: 'Chopping is 30% faster.' },
            { id: 'rotation', name: 'Crop Rotation', info: 'Crops give double food and regrow 25% faster.' },
            { id: 'veins', name: 'Deep Veins', info: 'Quarrying and mining are 30% faster.' },
            { id: 'guilds', name: 'Guilds', info: 'Crafters work 40% faster.' },
            { id: 'golden', name: 'Golden Age', info: 'One more newcomer each dawn, and everyone is happier.' }
        ] },
        { id: 'defense', name: 'Defence', techs: [
            { id: 'fletching', name: 'Fletching', info: 'Towers, bastions and the keep hit for +1.' },
            { id: 'masonry', name: 'Masonry', info: 'Walls, ramparts and gates get 50% more hit points.' },
            { id: 'longbows', name: 'Longbows', info: 'Towers and bastions reach 1.5 tiles further.' },
            { id: 'militia', name: 'Militia', info: 'Every villager fights like the Brave.' },
            { id: 'ballistae', name: 'Ballistae', info: 'Towers and bastions hit 50% harder.' }
        ] },
        { id: 'divine', name: 'Divine', techs: [
            { id: 'devotion', name: 'Devotion', info: 'Mana cap 150, and shrines make 50% more.' },
            { id: 'swift', name: 'Swift Grace', info: 'Powers recharge 35% faster.' },
            { id: 'hallowed', name: 'Hallowed Ground', info: 'Shrines ward 3 tiles further.' },
            { id: 'chain', name: 'Chain Lightning', info: 'Lightning strikes a wider circle and hits 50% harder.' },
            { id: 'dawnbreaker', name: 'Dawnbreaker', info: 'Every dawn, corruption nodes shrink back by 3 tiles.' }
        ] }
    ];
    const TECH = {};
    TECH_BRANCHES.forEach(br => br.techs.forEach((t, k) => {
        Object.assign(t, { branch: br.id, tier: k + 1, prereq: k ? br.techs[k - 1].id : null }, TIER_COST[k + 1]);
        TECH[t.id] = t;
    }));

    const DIV = {
        START_MANA: 30,
        MAX_MANA: 100,
        KEEP_EVERY: 100,      // ticks per mana from the keep
        SHRINE_EVERY: 60      // ticks per mana from each shrine, before any priest
    };

    class Divine {
        constructor(colony) {
            this.colony = colony;
            this.mana = DIV.START_MANA;
            this.cooldown = {};
            POWER_ORDER.forEach(id => { this.cooldown[id] = 0; });
            this.tech = new Set();
            this.casts = 0;
        }

        maxMana() { return DIV.MAX_MANA + (this.tech.has('devotion') ? 50 : 0); }
        addMana(x) { this.mana = Math.min(this.maxMana(), this.mana + x); }

        tick() {
            const colony = this.colony;
            for (const id of POWER_ORDER) if (this.cooldown[id] > 0) this.cooldown[id]--;
            if (colony.ticks % DIV.KEEP_EVERY === 0) this.addMana(1);
            if (colony.ticks % DIV.SHRINE_EVERY === 0) {
                const shrines = colony.buildings.filter(b => b.type === 'shrine' && b.complete).length;
                if (shrines) this.addMana(shrines * (this.tech.has('devotion') ? 1.5 : 1));
            }
        }

        // ---- powers ----

        radius(id) { return POWERS[id].radius + (id === 'lightning' && this.tech.has('chain') ? 1 : 0); }
        maxCd(id) { return Math.round(POWERS[id].cd * (this.tech.has('swift') ? 0.65 : 1)); }

        // '' when the power can be cast on that tile, else why not
        check(id, tx, ty) {
            const p = POWERS[id], colony = this.colony;
            if (!p) return 'Unknown power';
            if (colony.over) return 'The run is over';
            if (this.cooldown[id] > 0) return 'Still recharging';
            if (this.mana < p.cost) return `Needs ${p.cost} mana`;
            if (tx === undefined) return '';
            if (!colony.map.inBounds(tx, ty)) return 'Off the map';
            if (id === 'raise' || id === 'lower') {
                const i = colony.map.idx(tx, ty), t = colony.map.tiles[i];
                if (colony.bldAt[i]) return 'A building is in the way';
                if (this.occupied(tx, ty)) return 'Someone is standing there';
                if (id === 'raise' && (t === TILE.CLIFF || t === TILE.ROCK || t === TILE.ORE)) return 'Already high ground';
                if (id === 'lower' && t === TILE.WATER) return 'Already water';
            }
            return '';
        }

        occupied(tx, ty) {
            const colony = this.colony;
            if (colony.villagers.some(v => !v.inside && Math.floor(v.x) === tx && Math.floor(v.y) === ty)) return true;
            return !!(colony.war && colony.war.monsters.some(m => !m.dead && !m.def.flying && Math.floor(m.x) === tx && Math.floor(m.y) === ty));
        }

        cast(id, tx, ty) {
            const why = this.check(id, tx, ty);
            if (why) return { ok: false, msg: why };
            const colony = this.colony, war = colony.war, p = POWERS[id];
            const cx = tx + 0.5, cy = ty + 0.5, r = this.radius(id);
            this.mana -= p.cost;
            this.cooldown[id] = this.maxCd(id);
            this.casts++;
            let msg = '';

            if (id === 'lightning') {
                const dmg = p.dmg * (this.tech.has('chain') ? 1.5 : 1);
                let kills = 0, hits = 0;
                if (war) {
                    for (const m of war.monsters.slice()) {
                        if (m.dead || Math.hypot(m.x - cx, m.y - cy) > r + 0.3) continue;
                        hits++;
                        war.damageMonster(m, dmg, 'lightning');
                        if (m.dead) kills++;
                    }
                    this.forTiles(cx, cy, r, i => {
                        const t = colony.map.tiles[i], b = colony.bldAt[i] ? colony.byId.get(colony.bldAt[i]) : null;
                        if (b ? (b.def.wooden && war.rng.next() < 0.25) : (t === TILE.FOREST && war.rng.next() < 0.45)) war.ignite(i);
                    });
                }
                msg = kills ? `Lightning! ${kills} slain.` : hits ? 'Lightning! A hit.' : 'Lightning strikes the ground.';
                if (kills >= 3) colony.record(`Lightning struck down ${kills} monsters ${colony.where(cx, cy)}.`, 'good');
            } else if (id === 'heal') {
                let n = 0;
                for (const v of colony.villagers) {
                    if (v.inside || Math.hypot(v.x - cx, v.y - cy) > r) continue;
                    if (v.sick) colony.record(`${v.name} was cured of the plague.`, 'good');
                    v.hp = v.maxHp; v.sick = 0; v.mood = Math.min(100, v.mood + 10);
                    n++;
                }
                let bn = 0;
                for (const b of colony.buildings) {
                    if (!b.complete) continue;
                    const dx = Math.max(b.x - cx, 0, cx - (b.x + b.w)), dy = Math.max(b.y - cy, 0, cy - (b.y + b.h));
                    if (Math.hypot(dx, dy) > r) continue;
                    b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.3);
                    b.burning = 0;
                    bn++;
                }
                msg = n || bn ? `Healed ${n} villager${n === 1 ? '' : 's'}${bn ? ` and ${bn} building${bn === 1 ? '' : 's'}` : ''}.` : 'The blessing falls on empty ground.';
            } else if (id === 'raise' || id === 'lower') {
                const t = colony.map.tiles[colony.map.idx(tx, ty)];
                let to;
                if (id === 'raise') to = t === TILE.WATER ? TILE.GRASS : TILE.CLIFF;
                else to = (t === TILE.CLIFF || t === TILE.ROCK || t === TILE.ORE) ? TILE.GRASS : TILE.WATER;
                colony.setGround(tx, ty, to);
                colony.refreshMasks();
            } else if (id === 'cleanse') {
                const res = colony.blight ? colony.blight.cleanse(cx, cy, r) : { tiles: 0, nodes: [] };
                if (war) {
                    for (const m of war.monsters.slice()) {
                        if (m.dead || Math.hypot(m.x - cx, m.y - cy) > r) continue;
                        war.damageMonster(m, m.def.flying ? 999 : 6, 'cleansing light');
                    }
                }
                const gain = Math.floor(res.tiles / 5) + res.nodes.length * HK.BLIGHT.NODE_MANA;
                this.addMana(gain);
                if (res.nodes.length) {
                    colony.record(`A corruption node ${colony.where(cx, cy)} was purified. Grass creeps back across the land.`, 'good');
                    colony.events.push({ type: 'purified', x: cx, y: cy, n: res.nodes.length });
                }
                msg = res.nodes.length ? `Node purified! +${gain} mana` : res.tiles ? `Cleansed ${res.tiles} tiles${gain ? `, +${gain} mana` : ''}.` : 'Nothing here to cleanse.';
            }
            colony.events.push({ type: 'power', id, x: cx, y: cy, r });
            return { ok: true, msg };
        }

        forTiles(cx, cy, r, fn) {
            const map = this.colony.map;
            for (let y = Math.floor(cy - r); y <= Math.floor(cy + r); y++) {
                for (let x = Math.floor(cx - r); x <= Math.floor(cx + r); x++) {
                    if (map.inBounds(x, y) && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) fn(map.idx(x, y));
                }
            }
        }

        // ---- tech ----

        techState(id) {
            const t = TECH[id];
            if (this.tech.has(id)) return 'learned';
            if (t.prereq && !this.tech.has(t.prereq)) return 'locked';
            return this.colony.stock.gold >= t.gold && this.mana >= t.mana ? 'ready' : 'poor';
        }

        learn(id) {
            const t = TECH[id], colony = this.colony;
            const state = this.techState(id);
            if (state === 'learned') return { ok: false, msg: 'Already learned' };
            if (state === 'locked') return { ok: false, msg: `Learn ${TECH[t.prereq].name} first` };
            if (state === 'poor') return { ok: false, msg: `Needs ${t.gold} gold and ${t.mana} mana` };
            colony.stock.gold -= t.gold;
            this.mana -= t.mana;
            this.tech.add(id);
            if (id === 'masonry') {
                for (const b of colony.buildings) {
                    if (!b.complete) continue;
                    const max = colony.maxHpOf(b);
                    if (max !== b.maxHp) { b.hp *= max / b.maxHp; b.maxHp = max; }
                }
                if (colony.war) colony.war.fieldDirty = true;
            }
            if (id === 'hallowed' && colony.blight) colony.blight.wantDirty = true;
            colony.record(`Learned ${t.name}: ${t.info}`, 'good');
            colony.events.push({ type: 'learned', tech: t });
            return { ok: true, msg: `${t.name} learned` };
        }
    }

    Object.assign(HK, { Divine, POWERS, POWER_ORDER, TECH, TECH_BRANCHES, DIV });
})(globalThis.HK = globalThis.HK || {});
