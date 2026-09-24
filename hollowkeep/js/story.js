// ========================================
// HOLLOWKEEP - STORY (random events)
// From day 3, some dawns bring an event: a merchant caravan, a drought, a
// blood moon (a double wave), a wandering hero, or plague. They exist to make
// runs diverge and to force a change of plan. Pure data (no DOM).
// ========================================

(function (HK) {
    'use strict';

    const { DAY } = HK;

    const STORY = {
        FIRST_DAY: 3,
        CHANCE: 0.45,
        MAX_HEROES: 2,
        PLAGUE_TICKS: 1500
    };

    // weight, and the first day each can happen
    const EVENTS = {
        caravan:   { weight: 30, from: 3 },
        drought:   { weight: 15, from: 3 },
        bloodmoon: { weight: 15, from: 4 },
        hero:      { weight: 10, from: 4 },
        plague:    { weight: 15, from: 5 }
    };

    // what a caravan might offer: give -> get
    const TRADES = [
        { give: { wood: 12 }, get: { gold: 4 } },
        { give: { food: 15 }, get: { gold: 5 } },
        { give: { stone: 8 }, get: { gold: 5 } },
        { give: { planks: 5 }, get: { gold: 6 } },
        { give: { bricks: 5 }, get: { gold: 6 } },
        { give: { gold: 6 }, get: { food: 25 } },
        { give: { gold: 8 }, get: { stone: 12 } },
        { give: { gold: 10 }, get: { iron: 4 } },
        { give: { gold: 12 }, get: { tools: 3 } },
        { give: { gold: 6 }, get: { ore: 8 } },
        { give: { wood: 20 }, get: { planks: 8 } }
    ];

    const HERO_NAMES = ['Ser Aldric', 'Dame Brienne', 'Ser Corwin', 'Dame Isolde', 'Ser Roderick', 'Dame Sigrun'];

    class Story {
        constructor(colony) {
            this.colony = colony;
            this.rng = HK.makeRng((colony.world.seed ^ 0x1b873593) >>> 0);
            this.caravan = null;
            this.today = null;
            this.heroes = 0;
            this.heroNames = HERO_NAMES.slice();
        }

        dawn(day) {
            const colony = this.colony, rng = this.rng;
            colony.drought = false;
            this.caravan = null;
            this.today = null;
            if (day < STORY.FIRST_DAY || rng.next() >= STORY.CHANCE) return;
            const war = colony.war;
            const pool = Object.keys(EVENTS).filter(k => {
                if (EVENTS[k].from > day) return false;
                if (k === 'bloodmoon' && war && war.boss) return false;
                if (k === 'hero' && this.heroes >= STORY.MAX_HEROES) return false;
                if (k === 'plague' && colony.villagers.length < 6) return false;
                return true;
            });
            if (!pool.length) return;
            const total = pool.reduce((s, k) => s + EVENTS[k].weight, 0);
            let r = rng.next() * total, pick = pool[0];
            for (const k of pool) { r -= EVENTS[k].weight; if (r <= 0) { pick = k; break; } }
            this.start(pick);
        }

        start(kind) {
            const colony = this.colony, rng = this.rng;
            let text = '', tone = 'info';
            if (kind === 'caravan') {
                const pool = TRADES.slice();
                const offers = [];
                while (offers.length < 3 && pool.length) offers.push(Object.assign({ used: false }, pool.splice(rng.int(0, pool.length - 1), 1)[0]));
                this.caravan = { offers };
                text = 'A merchant caravan has stopped at the keep. It leaves at dusk.';
                tone = 'good';
            } else if (kind === 'drought') {
                colony.drought = true;
                text = 'Drought. Crops and berries will not grow today, except near a Well.';
                tone = 'bad';
            } else if (kind === 'bloodmoon') {
                if (colony.war) colony.war.bloodMoon = true;
                text = 'A blood moon will rise tonight. Twice as many monsters will come.';
                tone = 'bad';
            } else if (kind === 'hero') {
                const name = this.heroNames.splice(rng.int(0, this.heroNames.length - 1), 1)[0] || 'A wanderer';
                const v = colony.walkIn('hero', name);
                colony.assignHomes();
                this.heroes++;
                text = `${v.name}, a wandering hero, has come to defend the village.`;
                tone = 'good';
            } else if (kind === 'plague') {
                const healthy = colony.villagers.filter(v => !v.sick && v.trait !== 'hero');
                const n = Math.min(healthy.length, rng.int(2, 3));
                const sick = [];
                for (let k = 0; k < n; k++) {
                    const v = healthy.splice(rng.int(0, healthy.length - 1), 1)[0];
                    v.sick = STORY.PLAGUE_TICKS;
                    sick.push(v.name);
                }
                text = `Plague! ${sick.join(', ')} fell sick. A Well or the Heal power will help.`;
                tone = 'bad';
            }
            this.today = kind;
            colony.record(text, tone);
            colony.events.push({ type: 'story', kind, text, tone });
        }

        trade(k) {
            const colony = this.colony, c = this.caravan;
            const o = c && c.offers[k];
            if (!o || o.used) return { ok: false, msg: 'That trade is gone' };
            for (const r in o.give) if (colony.avail(r) < o.give[r]) return { ok: false, msg: `Not enough ${r}` };
            for (const r in o.give) colony.stock[r] -= o.give[r];
            for (const r in o.get) colony.stock[r] += o.get[r];
            o.used = true;
            return { ok: true, msg: 'Deal!' };
        }

        tick() {
            if (this.caravan && this.colony.timeOfDay() === DAY.DUSK) {
                this.caravan = null;
                this.colony.events.push({ type: 'caravanLeft' });
            }
        }
    }

    Object.assign(HK, { Story, STORY, TRADES });
})(globalThis.HK = globalThis.HK || {});
