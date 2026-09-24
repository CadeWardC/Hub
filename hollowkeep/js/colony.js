// ========================================
// HOLLOWKEEP - COLONY (economy, villagers, buildings)
// Villagers with needs, traits, mood and hit points run a state machine over a
// priority job board: gathering, hauling, construction, crafting in production
// chains, repairs and firefighting, and they flee from (or fight) monsters.
// Pure data like sim.js: advanced only by World.tick(), never touches the DOM,
// and runs under Node for balance runs. Positions are in tile units (tile
// centre = +0.5). The night war (war.js), corruption (blight.js), mana, powers
// and tech (divine.js) and random events (story.js) hang off the colony.
// ========================================

(function (HK) {
    'use strict';

    const { TILE, makeRng } = HK;

    // ---- Tuning ------------------------------------------------------------

    // One day is 5 min at 1x (10 ticks/s). The game starts at DAWN of day 1, so
    // "end of day 1" is tick DUSK - DAWN = 1800 (3 min of daylight).
    const DAY = { LENGTH: 3000, DAWN: 150, DUSK: 1950, NIGHT: 2150 };

    // Everything that can sit in the village stores. Gold is spent on tech; mana lives in divine.js.
    const RES = ['wood', 'stone', 'food', 'ore', 'planks', 'bricks', 'iron', 'tools', 'gold'];

    const BAL = {
        START_VILLAGERS: 8,
        START_STOCK: { wood: 10, stone: 6, food: 30, ore: 0, planks: 0, bricks: 0, iron: 0, tools: 0, gold: 0 },
        SPEED: 0.12,              // tiles per tick
        STARVING_SLOW: 0.6,       // speed and work multiplier at 0 hunger
        CARRY: 2,
        STRONG_CARRY: 3,
        WORK_TICKS: { chop: 45, mine: 60, forage: 30, farm: 30, ore: 70 },
        TREE_WOOD: 3,
        ROCK_STONE: 4,
        ORE_AMOUNT: 3,
        GOLD_CHANCE: 0.25,        // each ore mined may turn up a gold nugget
        BUSH_FOOD: 3,
        CROP_FOOD: 1,
        BUSH_REGROW: 2400,
        CROP_GROW: 1200,
        BUSH_CHANCE: 0.02,
        HUNGER_DECAY: 100 / 1500, // eat about twice a day
        HUNGRY: 40,
        MEAL: 65,
        EAT_TICKS: 15,
        REST_DECAY: 100 / 2600,
        REST_SLEEP: 100 / 500,
        NAP_TICKS: 150,
        BUILDERS_PER_SITE: 3,
        BUILD_RATE: 1,            // build points per builder per tick
        ARRIVAL_EVERY_DAYS: 1,
        ARRIVALS: 2,
        ARRIVAL_FOOD_PER_HEAD: 1, // food in store per current villager before newcomers settle
        WOODCUTTER_RADIUS: 8,
        WOODCUTTER_BONUS: 1.6,
        DIST_SCALE: 12,           // score = priority / (1 + distance / DIST_SCALE)
        CROWDING: 0.2,            // gather jobs lose appeal as more villagers take them
        PREFERENCE: 1.15,         // each villager slightly prefers one kind of work
        SEARCH_NODES: 5000,
        SOURCE_RETRY: 60,         // ticks before re-searching a gather kind that found nothing
        // combat, health, mood
        VILLAGER_HP: 10,
        STRONG_HP: 14,
        HERO_HP: 40,
        HP_REGEN: 0.003,
        THREAT_RADIUS: 4.5,       // villagers react to monsters this close
        SHELTER_CLEAR: 12,        // shelterers leave the keep once no monster is this close to it
        FIGHT_DMG: 1,
        HERO_DMG: 5,
        FIGHT_CD: 10,
        CORRUPT_HURT: 0.012,      // hp per tick standing on corruption
        SICK_HURT: 0.004,
        TRAIT_CHANCE: 0.7,
        TOOL_BONUS: 1.25,
        MOOD_LEAVE: 18,
        // upkeep
        REPAIR_RATE: 0.6,         // hp per repairer per tick
        REPAIR_HP_PER_UNIT: 20,   // one stone (or wood) per 20 hp repaired
        REPAIRERS_PER_SITE: 2,
        DOUSE_TICKS: 25,
        WELL_RADIUS: 12,
        STOCK_CAP: 80             // crafters stop when this much of their product is stored
    };

    // cat: which build tray it sits in. hp: at full health. wooden: can catch fire.
    // tower: {range, dmg, cd}. craft: {in, out, ticks, verb, role}. paint: placed as a line of tiles.
    const BUILDINGS = {
        keep:       { name: 'Keep', w: 3, h: 3, cost: {}, work: 0, beds: 8, stores: RES, walkable: false, hp: 400,
                      tower: { range: 6, dmg: 2, cd: 16 }, repair: 'stone',
                      info: 'The heart of the village. Stores everything, sleeps 8, shelters everyone and shoots arrows. If it falls, the run ends.' },
        house:      { name: 'House', cat: 'village', w: 2, h: 2, cost: { wood: 12, stone: 1 }, work: 300, beds: 4, stores: [], walkable: false, hp: 100, wooden: true, repair: 'wood',
                      info: 'Sleeps 4 and raises the population cap.' },
        farm:       { name: 'Farm', cat: 'village', w: 3, h: 3, cost: { wood: 8 }, work: 150, beds: 0, stores: [], walkable: true, hp: 60, wooden: true, repair: 'wood',
                      info: 'Nine crop plots that regrow after each harvest. Crop Rotation doubles the yield.' },
        stockpile:  { name: 'Stockpile', cat: 'village', w: 3, h: 3, cost: {}, work: 30, beds: 0, stores: RES, walkable: true, hp: 60, wooden: true, repair: 'wood',
                      info: 'Drop-off for all goods. Put it near the work to cut hauling.' },
        well:       { name: 'Well', cat: 'village', w: 1, h: 1, cost: { stone: 6, wood: 2 }, work: 120, beds: 0, stores: [], walkable: false, hp: 80, repair: 'stone',
                      info: 'Villagers douse fires within 12 tiles. Nearby farms shrug off drought and the sick recover faster.' },
        shrine:     { name: 'Shrine', cat: 'village', w: 2, h: 2, cost: { stone: 12, wood: 6 }, work: 350, beds: 0, stores: [], walkable: false, hp: 120, repair: 'stone',
                      ward: 5, craft: { in: {}, out: { mana: 1 }, ticks: 30, verb: 'Praying', role: 'priest' },
                      info: 'Makes mana, more with a priest. Holds corruption back within 5 tiles and turns what it purifies into mana.' },
        woodcutter: { name: 'Woodcutter', cat: 'industry', w: 2, h: 2, cost: { wood: 14, stone: 4 }, work: 400, beds: 0, stores: ['wood'], walkable: false, hp: 100, wooden: true, repair: 'wood',
                      info: 'Wood drop-off. Trees within 8 tiles are chopped 60% faster.' },
        sawmill:    { name: 'Sawmill', cat: 'industry', w: 2, h: 2, cost: { wood: 16, stone: 4 }, work: 350, beds: 0, stores: ['wood', 'planks'], walkable: false, hp: 100, wooden: true, repair: 'wood',
                      craft: { in: { wood: 2 }, out: { planks: 1 }, ticks: 40, verb: 'Sawing planks', role: 'sawyer' },
                      info: 'A sawyer turns 2 wood into 1 plank.' },
        kiln:       { name: 'Kiln', cat: 'industry', w: 2, h: 2, cost: { stone: 10, wood: 6 }, work: 350, beds: 0, stores: [], walkable: false, hp: 140, repair: 'stone',
                      craft: { in: { stone: 2, wood: 1 }, out: { bricks: 2 }, ticks: 60, verb: 'Firing bricks', role: 'brickmaker' },
                      info: 'Fires 2 stone and 1 wood into 2 bricks.' },
        smelter:    { name: 'Smelter', cat: 'industry', w: 2, h: 2, cost: { bricks: 6, stone: 6, wood: 4 }, work: 400, beds: 0, stores: ['ore'], walkable: false, hp: 160, repair: 'stone',
                      craft: { in: { ore: 2, wood: 1 }, out: { iron: 1 }, ticks: 70, verb: 'Smelting iron', role: 'smelter' },
                      info: 'Smelts 2 ore and 1 wood into 1 iron. Needs miners on ore seams.' },
        smithy:     { name: 'Smithy', cat: 'industry', w: 2, h: 2, cost: { planks: 6, bricks: 4 }, work: 400, beds: 0, stores: [], walkable: false, hp: 140, repair: 'stone',
                      craft: { in: { iron: 1, planks: 1 }, out: { tools: 1 }, ticks: 80, verb: 'Forging tools', role: 'smith' },
                      info: 'Forges 1 iron and 1 plank into tools. A villager with tools works 25% faster.' },
        wall:       { name: 'Wall', cat: 'defense', w: 1, h: 1, cost: { stone: 2 }, work: 40, beds: 0, stores: [], walkable: false, hp: 80, repair: 'stone', paint: true,
                      info: 'Blocks monsters (and villagers: leave a Gate). Tap two points to lay a line.' },
        gate:       { name: 'Gate', cat: 'defense', w: 1, h: 1, cost: { wood: 4, stone: 2 }, work: 60, beds: 0, stores: [], walkable: true, blocksMonsters: true, hp: 120, wooden: true, repair: 'wood',
                      info: 'Villagers walk through; monsters have to break it.' },
        tower:      { name: 'Tower', cat: 'defense', w: 1, h: 1, cost: { wood: 6, stone: 6 }, work: 160, beds: 0, stores: [], walkable: false, hp: 120, wooden: true, repair: 'wood',
                      tower: { range: 6.5, dmg: 3, cd: 14 },
                      info: 'Shoots monsters within 6.5 tiles. Arrows into a forest can start a fire.' },
        rampart:    { name: 'Rampart', cat: 'defense', w: 1, h: 1, cost: { bricks: 3 }, work: 60, beds: 0, stores: [], walkable: false, hp: 220, repair: 'stone', paint: true,
                      info: 'A brick wall with nearly three times the hit points.' },
        bastion:    { name: 'Bastion', cat: 'defense', w: 1, h: 1, cost: { bricks: 8, planks: 4, iron: 2 }, work: 260, beds: 0, stores: [], walkable: false, hp: 260, repair: 'stone',
                      tower: { range: 7.5, dmg: 5, cd: 12 },
                      info: 'A stone tower: longer range, harder hits, and it will not burn.' }
    };
    const BUILD_CATS = [
        { id: 'village', name: 'Village', types: ['house', 'farm', 'stockpile', 'well', 'shrine'] },
        { id: 'industry', name: 'Industry', types: ['woodcutter', 'sawmill', 'kiln', 'smelter', 'smithy'] },
        { id: 'defense', name: 'Defence', types: ['wall', 'gate', 'tower', 'rampart', 'bastion'] }
    ];
    const BUILD_MENU = BUILD_CATS.flatMap(c => c.types);

    const GATHER = {
        chop:   { res: 'wood',  prio: 'wood',  verb: 'Chopping wood',   role: 'woodcutter' },
        mine:   { res: 'stone', prio: 'stone', verb: 'Quarrying stone', role: 'quarrier' },
        ore:    { res: 'ore',   prio: 'ore',   verb: 'Mining ore',      role: 'miner' },
        forage: { res: 'food',  prio: 'food',  verb: 'Foraging berries', role: 'forager' },
        farm:   { res: 'food',  prio: 'food',  verb: 'Harvesting crops', role: 'farmer' }
    };
    const PRIORITY_KEYS = ['build', 'wood', 'stone', 'food', 'ore', 'craft'];

    const TRAITS = {
        brave:    { name: 'Brave', info: 'Fights monsters instead of running.' },
        lazy:     { name: 'Lazy', info: 'Works 25% slower but is hard to upset.' },
        strong:   { name: 'Strong', info: 'Carries 3, builds 30% faster and takes more hits.' },
        nightowl: { name: 'Night-owl', info: 'Works late into the night and sleeps in.' },
        hero:     { name: 'Hero', info: 'A seasoned fighter: tough, strong and fearless.' }
    };
    const TRAIT_ROLL = ['brave', 'lazy', 'strong', 'nightowl'];

    const FOOD_NONE = 0, FOOD_BUSH = 1, FOOD_CROP = 2;
    const SRC_OF_TILE = { [TILE.FOREST]: 'chop', [TILE.ROCK]: 'mine', [TILE.ORE]: 'ore' };
    const CLIFF_HP = 60;

    const NAMES = ['Ada', 'Bram', 'Cora', 'Dain', 'Edda', 'Fenn', 'Greta', 'Hale', 'Ines', 'Jory', 'Kit', 'Lise',
        'Marek', 'Nell', 'Odo', 'Pim', 'Quill', 'Rhea', 'Sten', 'Tova', 'Ulf', 'Vera', 'Wren', 'Yara', 'Alder',
        'Bree', 'Cass', 'Dov', 'Elna', 'Finch', 'Gil', 'Hester', 'Ivo', 'Juna', 'Kel', 'Lark', 'Mott', 'Nim',
        'Orla', 'Perrin', 'Rook', 'Sable', 'Tam', 'Ulla', 'Vesk', 'Wilm', 'Ysolde', 'Zev', 'Mara', 'Brin'];

    // ---- Pathfinding -------------------------------------------------------
    // Dijkstra / A* over the passability grid with 8-way moves (no corner cutting).
    // The goal is a predicate, so one search can find "the nearest unreserved tree".

    const DX = [1, -1, 0, 0, 1, 1, -1, -1];
    const DY = [0, 0, 1, -1, 1, -1, 1, -1];

    function heapPush(ids, keys, id, key) {
        let i = ids.length;
        ids.push(id); keys.push(key);
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (keys[p] <= key) break;
            ids[i] = ids[p]; keys[i] = keys[p];
            i = p;
        }
        ids[i] = id; keys[i] = key;
    }

    function heapPop(ids, keys) {
        const top = ids[0];
        const id = ids.pop(), key = keys.pop();
        const n = ids.length;
        if (n) {
            let i = 0;
            for (;;) {
                let c = 2 * i + 1;
                if (c >= n) break;
                if (c + 1 < n && keys[c + 1] < keys[c]) c++;
                if (keys[c] >= key) break;
                ids[i] = ids[c]; keys[i] = keys[c];
                i = c;
            }
            ids[i] = id; keys[i] = key;
        }
        return top;
    }

    class Pathfinder {
        constructor(width, height, pass) {
            const n = width * height;
            this.w = width;
            this.h = height;
            this.pass = pass;
            this.g = new Float32Array(n);
            this.from = new Int32Array(n);
            this.seen = new Uint32Array(n);
            this.closed = new Uint32Array(n);
            this.gen = 0;
            this.ids = [];
            this.keys = [];
            this.cost = 0;
        }

        // Returns the tiles to walk after `start` (empty when start is already a goal) or null.
        // `h` must never overestimate (null = Dijkstra). The start tile may be blocked, so a
        // villager caught inside a finished building can still walk out.
        find(start, isGoal, h, maxNodes) {
            const gen = ++this.gen;
            const { w, pass, g, from, seen, closed, ids, keys } = this;
            ids.length = 0; keys.length = 0;
            g[start] = 0; from[start] = -1; seen[start] = gen;
            heapPush(ids, keys, start, h ? h(start) : 0);
            let expanded = 0;
            while (ids.length) {
                const cur = heapPop(ids, keys);
                if (closed[cur] === gen) continue;
                closed[cur] = gen;
                if (isGoal(cur)) {
                    this.cost = g[cur];
                    const path = [];
                    for (let i = cur; i !== start; i = from[i]) path.push(i);
                    return path.reverse();
                }
                if (++expanded > maxNodes) break;
                const cx = cur % w, cy = (cur - cx) / w;
                for (let d = 0; d < 8; d++) {
                    const nx = cx + DX[d], ny = cy + DY[d];
                    if (nx < 0 || ny < 0 || nx >= w || ny >= this.h) continue;
                    const ni = ny * w + nx;
                    if (!pass[ni] || closed[ni] === gen) continue;
                    let step = 1;
                    if (d >= 4) {
                        if (!pass[cy * w + nx] || !pass[ny * w + cx]) continue;
                        step = Math.SQRT2;
                    }
                    const ng = g[cur] + step;
                    if (seen[ni] === gen && ng >= g[ni]) continue;
                    seen[ni] = gen; g[ni] = ng; from[ni] = cur;
                    heapPush(ids, keys, ni, ng + (h ? h(ni) : 0));
                }
            }
            return null;
        }
    }

    function octile(dx, dy) {
        dx = Math.abs(dx); dy = Math.abs(dy);
        return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    }

    const COMPASS = ['east', 'north-east', 'north', 'north-west', 'west', 'south-west', 'south', 'south-east'];
    function compass(dx, dy) {
        const a = Math.atan2(-dy, dx);
        return COMPASS[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
    }

    // ---- Job board ---------------------------------------------------------
    // A priority-sorted list. Standing jobs (gather kinds, repair, douse) find their
    // target when claimed; site jobs (deliver / build / craft) belong to a building.

    class JobBoard {
        constructor() {
            this.jobs = [];
            this.nextId = 1;
            this.dirty = false;
        }

        post(job) {
            job.id = this.nextId++;
            job.taken = 0;
            job.priority = job.priority || 0;
            this.jobs.push(job);
            this.dirty = true;
            return job;
        }

        remove(job) {
            const i = this.jobs.indexOf(job);
            if (i >= 0) this.jobs.splice(i, 1);
            job.removed = true;
        }

        sorted() {
            if (this.dirty) {
                this.jobs.sort((a, b) => b.priority - a.priority);
                this.dirty = false;
            }
            return this.jobs;
        }
    }

    // ---- Villager ----------------------------------------------------------
    // States: idle, seek, wander, travel, work, haul, eat, sleep, flee, shelter, fight.
    // IDLE -> SEEK -> TRAVEL -> WORK -> HAUL -> SEEK, with EAT / SLEEP whenever needs
    // call and FLEE / FIGHT whenever a monster comes close.

    class Villager {
        constructor(id, name, x, y, rng, trait) {
            this.id = id;
            this.name = name;
            this.x = this.px = x;
            this.y = this.py = y;
            this.state = 'seek';
            this.job = null;
            this.path = null;
            this.pathI = 0;
            this.dest = null;
            this.carry = null;
            this.carryN = 0;
            this.hunger = rng.range(70, 100);
            this.rest = rng.range(80, 100);
            this.timer = 0;
            this.nap = false;
            this.home = null;
            this.inside = false;
            this.face = 1;
            this.walked = 0;
            this.jx = rng.range(-0.22, 0.22);
            this.jy = rng.range(-0.15, 0.2);
            this.tint = id % 5;
            this.pref = ['chop', 'mine', 'forage', 'build'][rng.int(0, 3)];
            this.noSource = {};
            this.trait = trait !== undefined ? trait : (rng.next() < BAL.TRAIT_CHANCE ? TRAIT_ROLL[rng.int(0, TRAIT_ROLL.length - 1)] : null);
            this.maxHp = this.trait === 'hero' ? BAL.HERO_HP : this.trait === 'strong' ? BAL.STRONG_HP : BAL.VILLAGER_HP;
            this.hp = this.maxHp;
            this.mood = 65;
            this.tool = false;
            this.sick = 0;
            this.target = null;
            this.fightCd = 0;
            this.hurtAt = -1000;
            this.lastWork = null;
            this.dead = false;
        }
    }

    // ---- Colony ------------------------------------------------------------

    class Colony {
        constructor(world) {
            const map = world.map;
            const n = map.width * map.height;
            this.world = world;
            this.map = map;
            this.W = map.width;
            this.rng = makeRng((world.seed ^ 0x5bd1e995) >>> 0);
            this.ticks = 0;

            this.pass = new Uint8Array(n);
            this.amount = new Uint8Array(n);     // wood / stone / ore / food left on a tile
            this.foodKind = new Uint8Array(n);
            this.grow = new Int32Array(n);       // ticks until an empty bush / crop is ripe
            this.reserved = new Int32Array(n);   // villager id working a source tile
            this.bldAt = new Int32Array(n);      // building id per tile
            this.cliffHp = new Uint8Array(n);
            this.foodTiles = [];
            this.srcCount = { chop: 0, mine: 0, ore: 0, forage: 0, farm: 0 };

            this.buildings = [];
            this.byId = new Map();
            this.nextBuildingId = 1;
            this.keepB = null;
            this.villagers = [];
            this.nextVillagerId = 1;
            this.names = NAMES.slice();
            for (let i = this.names.length - 1; i > 0; i--) {
                const j = this.rng.int(0, i);
                [this.names[i], this.names[j]] = [this.names[j], this.names[i]];
            }

            this.stock = Object.assign({}, BAL.START_STOCK);
            this.reservedStock = {};
            RES.forEach(r => { this.reservedStock[r] = 0; });
            this.priorities = { build: 3, wood: 2, stone: 1, food: 2, ore: 1, craft: 2 };
            this.masks = {};
            RES.forEach(r => { this.masks[r] = new Uint8Array(n); });
            this.board = new JobBoard();
            this.gatherJobs = {};
            Object.keys(GATHER).forEach(kind => { this.gatherJobs[kind] = this.board.post({ kind, standing: true }); });
            this.repairJob = this.board.post({ kind: 'repair', standing: true });
            this.douseJob = this.board.post({ kind: 'douse', standing: true });
            this.damaged = [];
            this.fires = [];
            this.events = [];
            this.chronicle = [];
            this.warned = {};
            this.stats = { built: 0, arrived: 0, deaths: 0, left: 0, gathered: { wood: 0, stone: 0, food: 0, ore: 0 } };
            this.recentDeaths = [];
            this.drought = false;
            this.over = null;

            for (let i = 0; i < n; i++) {
                const t = map.tiles[i];
                if (t === TILE.FOREST) { this.amount[i] = BAL.TREE_WOOD; this.srcCount.chop++; }
                else if (t === TILE.ROCK) { this.amount[i] = BAL.ROCK_STONE; this.srcCount.mine++; }
                else if (t === TILE.ORE) { this.amount[i] = BAL.ORE_AMOUNT; this.srcCount.ore++; }
                this.refreshPass(i);
            }
            this.pathfinder = new Pathfinder(map.width, map.height, this.pass);
            this.setupStart();

            // the night, the land and the heavens (each optional so the economy runs alone)
            this.divine = HK.Divine ? new HK.Divine(this) : null;
            this.blight = HK.Blight ? new HK.Blight(this) : null;
            this.war = HK.War ? new HK.War(this) : null;
            this.story = HK.Story ? new HK.Story(this) : null;
            this.refreshPriorities();
            this.record('Your people raise the keep. The land is quiet, for now.', 'day');
        }

        // ---- time ----

        timeOfDay() { return (this.ticks + DAY.DAWN) % DAY.LENGTH; }
        day() { return Math.floor((this.ticks + DAY.DAWN) / DAY.LENGTH) + 1; }
        isBedtime() { const t = this.timeOfDay(); return t >= DAY.DUSK || t < DAY.DAWN; }
        isNight() { const t = this.timeOfDay(); return t >= DAY.DUSK || t < DAY.DAWN; }

        isBedtimeFor(v) {
            if (v.trait !== 'nightowl') return this.isBedtime();
            const t = this.timeOfDay();
            return t >= DAY.NIGHT + 500 || t < DAY.DAWN + 350;
        }

        // 0 at full day, 1 at full night
        darkness() {
            const t = this.timeOfDay();
            if (t < DAY.DAWN) return 1 - t / DAY.DAWN;
            if (t < DAY.DUSK) return 0;
            if (t < DAY.NIGHT) return (t - DAY.DUSK) / (DAY.NIGHT - DAY.DUSK);
            return 1;
        }

        hasTech(id) { return !!(this.divine && this.divine.tech.has(id)); }

        // ---- setup ----

        setupStart() {
            const map = this.map, s = map.startTile;
            let spot = this.findKeepSpot(s.x, s.y);
            if (!spot) {
                spot = { x: Math.max(1, Math.min(map.width - 4, s.x - 1)), y: Math.max(1, Math.min(map.height - 4, s.y - 1)) };
                for (let y = spot.y - 1; y <= spot.y + 3; y++) {
                    for (let x = spot.x - 1; x <= spot.x + 3; x++) this.setGround(x, y, TILE.GRASS);
                }
            }
            const keep = this.addBuilding('keep', spot.x, spot.y, true);
            this.keepB = keep;
            const kx = keep.x + 1.5, ky = keep.y + 1.5;
            this.ensureNearby(kx, ky, TILE.FOREST, 30, 9, 3.6);
            this.ensureNearby(kx, ky, TILE.ROCK, 6, 11, 1.8);
            this.ensureNearby(kx, ky, TILE.ORE, 4, 14, 1.3, 20);
            this.scatterBushes(kx, ky);

            const ring = [];
            for (let y = keep.y - 2; y <= keep.y + 4; y++) {
                for (let x = keep.x - 2; x <= keep.x + 4; x++) {
                    if (map.inBounds(x, y) && this.pass[map.idx(x, y)]) ring.push(map.idx(x, y));
                }
            }
            for (let k = 0; k < BAL.START_VILLAGERS; k++) {
                const i = ring.length ? ring[this.rng.int(0, ring.length - 1)] : map.idx(s.x, s.y);
                this.spawnVillager((i % this.W) + 0.5, Math.floor(i / this.W) + 0.5);
            }
            this.assignHomes();
        }

        findKeepSpot(cx, cy) {
            const map = this.map;
            const ok = (x, y) => {
                if (x < 1 || y < 1 || x + 4 > map.width || y + 4 > map.height) return false;
                for (let yy = y; yy < y + 3; yy++) {
                    for (let xx = x; xx < x + 3; xx++) if (map.tileAt(xx, yy) !== TILE.GRASS) return false;
                }
                let open = 0;
                for (let yy = y - 1; yy <= y + 3; yy++) {
                    for (let xx = x - 1; xx <= x + 3; xx++) if (map.isWalkable(xx, yy)) open++;
                }
                return open >= 23; // at most 2 blocked tiles around it
            };
            for (let r = 0; r < 24; r++) {
                for (let y = cy - r; y <= cy + r; y++) {
                    for (let x = cx - r; x <= cx + r; x++) {
                        if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) === r && ok(x - 1, y - 1)) return { x: x - 1, y: y - 1 };
                    }
                }
            }
            return null;
        }

        setGround(x, y, type) {
            const map = this.map;
            if (!map.inBounds(x, y)) return;
            const i = map.idx(x, y), old = map.tiles[i];
            if (old === type) return;
            const oldSrc = SRC_OF_TILE[old];
            if (oldSrc && this.amount[i]) this.srcCount[oldSrc]--;
            if (type !== TILE.GRASS && this.foodKind[i]) this.removeFoodTile(i);
            map.setTile(x, y, type);
            this.amount[i] = type === TILE.FOREST ? BAL.TREE_WOOD : type === TILE.ROCK ? BAL.ROCK_STONE : type === TILE.ORE ? BAL.ORE_AMOUNT : 0;
            const src = SRC_OF_TILE[type];
            if (src) this.srcCount[src]++;
            this.cliffHp[i] = type === TILE.CLIFF ? CLIFF_HP : 0;
            if (this.reserved[i]) this.reserved[i] = 0;
            this.refreshPass(i);
            if (this.war) this.war.fieldDirty = true;
        }

        // Every start needs trees, a little rock and an ore seam within a walk, or the
        // early game can't be won. If the map didn't provide them, grow them.
        ensureNearby(kx, ky, type, minCount, dist, radius, searchR) {
            const map = this.map, R = searchR || 15;
            let near = 0;
            for (let y = Math.floor(ky - R); y <= ky + R; y++) {
                for (let x = Math.floor(kx - R); x <= kx + R; x++) {
                    if (map.inBounds(x, y) && map.tileAt(x, y) === type && Math.hypot(x + 0.5 - kx, y + 0.5 - ky) <= R) near++;
                }
            }
            if (near >= minCount) return;
            for (let attempt = 0; attempt < 24; attempt++) {
                const a = this.rng.range(0, Math.PI * 2);
                const gx = Math.floor(kx + Math.cos(a) * dist), gy = Math.floor(ky + Math.sin(a) * dist);
                if (!map.inBounds(gx, gy) || map.tileAt(gx, gy) !== TILE.GRASS) continue;
                const r = Math.ceil(radius);
                for (let y = gy - r; y <= gy + r; y++) {
                    for (let x = gx - r; x <= gx + r; x++) {
                        if (!map.inBounds(x, y) || map.tileAt(x, y) !== TILE.GRASS || this.bldAt[map.idx(x, y)]) continue;
                        if (Math.hypot(x - gx, y - gy) > radius - this.rng.next() * radius * 0.33) continue;
                        if (Math.hypot(x + 0.5 - kx, y + 0.5 - ky) < 4) continue;
                        this.setGround(x, y, type);
                    }
                }
                return;
            }
        }

        scatterBushes(kx, ky) {
            const map = this.map;
            const canBush = i => map.tiles[i] === TILE.GRASS && !this.bldAt[i] && !this.foodKind[i];
            for (let i = 0; i < map.tiles.length; i++) {
                if (!canBush(i) || this.rng.next() >= BAL.BUSH_CHANCE) continue;
                const x = i % this.W, y = Math.floor(i / this.W);
                if (Math.hypot(x + 0.5 - kx, y + 0.5 - ky) < 3) continue;
                this.addFoodTile(i, FOOD_BUSH);
            }
            let near = this.foodTiles.filter(i => Math.hypot((i % this.W) + 0.5 - kx, Math.floor(i / this.W) + 0.5 - ky) <= 11).length;
            for (let attempt = 0; near < 8 && attempt < 400; attempt++) {
                const a = this.rng.range(0, Math.PI * 2), d = this.rng.range(3.5, 11);
                const x = Math.floor(kx + Math.cos(a) * d), y = Math.floor(ky + Math.sin(a) * d);
                if (!map.inBounds(x, y)) continue;
                const i = map.idx(x, y);
                if (!canBush(i)) continue;
                this.addFoodTile(i, FOOD_BUSH);
                near++;
            }
        }

        addFoodTile(i, kind) {
            this.foodKind[i] = kind;
            if (kind === FOOD_BUSH) {
                this.amount[i] = BAL.BUSH_FOOD;
                this.grow[i] = 0;
                this.srcCount.forage++;
            } else {
                this.amount[i] = 0;
                this.grow[i] = Math.round(BAL.CROP_GROW * this.rng.range(0.5, 1));
            }
            this.foodTiles.push(i);
        }

        removeFoodTile(i) {
            if (!this.foodKind[i]) return;
            if (this.amount[i]) this.srcCount[this.foodKind[i] === FOOD_BUSH ? 'forage' : 'farm']--;
            this.foodKind[i] = FOOD_NONE;
            this.amount[i] = 0;
            this.grow[i] = 0;
            this.foodTiles.splice(this.foodTiles.indexOf(i), 1);
        }

        // corruption / fire: ripe food spoils and has to regrow
        spoilFood(i) {
            if (!this.foodKind[i]) return;
            if (this.amount[i]) {
                this.srcCount[this.foodKind[i] === FOOD_BUSH ? 'forage' : 'farm']--;
                this.amount[i] = 0;
            }
            this.grow[i] = this.foodKind[i] === FOOD_BUSH ? BAL.BUSH_REGROW : BAL.CROP_GROW;
        }

        // a tree killed by corruption or fire: the wood is lost
        killTree(i) {
            if (this.map.tiles[i] !== TILE.FOREST) return;
            this.setGround(i % this.W, Math.floor(i / this.W), TILE.GRASS);
        }

        spawnVillager(x, y, trait, name) {
            if (!this.names.length) this.names = NAMES.map(n => n + ' II');
            const v = new Villager(this.nextVillagerId++, name || this.names.pop(), x, y, this.rng, trait);
            this.villagers.push(v);
            return v;
        }

        // ---- passability & stores ----

        refreshPass(i) {
            const b = this.bldAt[i] ? this.byId.get(this.bldAt[i]) : null;
            const walkable = HK.TILE_DEFS[this.map.tiles[i]].walkable;
            this.pass[i] = walkable && !(b && b.complete && !b.def.walkable) ? 1 : 0;
        }

        // Tiles from which a villager can use a building: its ring, plus the inside
        // for walkable buildings. Blocking buildings are worked from outside.
        atBuilding(i, b) {
            const x = i % this.W, y = (i - x) / this.W;
            if (x < b.x - 1 || y < b.y - 1 || x > b.x + b.w || y > b.y + b.h) return false;
            if (!this.pass[i]) return false;
            const inside = x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h;
            return !inside || b.def.walkable || !b.complete;
        }

        refreshMasks() {
            RES.forEach(r => this.masks[r].fill(0));
            for (const b of this.buildings) {
                if (!b.complete || !b.def.stores.length) continue;
                for (let y = b.y - 1; y <= b.y + b.h; y++) {
                    for (let x = b.x - 1; x <= b.x + b.w; x++) {
                        if (!this.map.inBounds(x, y)) continue;
                        const i = this.map.idx(x, y);
                        if (!this.atBuilding(i, b)) continue;
                        b.def.stores.forEach(r => { this.masks[r][i] = 1; });
                    }
                }
            }
        }

        avail(r) { return this.stock[r] - this.reservedStock[r]; }

        popCap() {
            let beds = 0;
            for (const b of this.buildings) if (b.complete) beds += b.def.beds;
            return beds;
        }

        // ---- buildings ----

        canPlace(type, x, y) {
            const def = BUILDINGS[type], map = this.map;
            if (!def) return { ok: false, reason: 'Unknown building' };
            for (let yy = y; yy < y + def.h; yy++) {
                for (let xx = x; xx < x + def.w; xx++) {
                    if (!map.inBounds(xx, yy)) return { ok: false, reason: 'Off the map' };
                    const i = map.idx(xx, yy);
                    if (this.bldAt[i]) return { ok: false, reason: 'Overlaps a building' };
                    const t = map.tiles[i];
                    if (t === TILE.FOREST) return { ok: false, reason: 'Trees in the way' };
                    if (t === TILE.CLIFF) return { ok: false, reason: 'A cliff is in the way' };
                    if (t !== TILE.GRASS) return { ok: false, reason: 'Needs open grass' };
                    if (this.war && this.war.fireT[i]) return { ok: false, reason: 'The ground is burning' };
                }
            }
            return { ok: true, reason: '' };
        }

        maxHpOf(b) {
            let hp = b.def.hp;
            if ((b.type === 'wall' || b.type === 'rampart' || b.type === 'gate') && this.hasTech('masonry')) hp *= 1.5;
            return hp;
        }

        addBuilding(type, x, y, complete) {
            const def = BUILDINGS[type];
            const b = {
                id: this.nextBuildingId++, type, def, x, y, w: def.w, h: def.h,
                complete: false, removed: false, progress: 0, builders: 0, jobs: [],
                delivered: {}, incoming: {},
                placedAt: this.ticks, doneAt: -1,
                hp: 0, maxHp: def.hp, hitAt: -1000, burning: 0, cd: 0, worker: 0, repairers: 0, repairAcc: 0
            };
            RES.forEach(r => { b.delivered[r] = 0; b.incoming[r] = 0; });
            for (let yy = y; yy < y + def.h; yy++) {
                for (let xx = x; xx < x + def.w; xx++) {
                    const i = this.map.idx(xx, yy);
                    this.bldAt[i] = b.id;
                    this.removeFoodTile(i);
                }
            }
            this.buildings.push(b);
            this.byId.set(b.id, b);
            if (complete) {
                this.finish(b, true);
            } else {
                RES.forEach(r => { if (def.cost[r]) b.jobs.push(this.board.post({ kind: 'deliver', site: b, res: r })); });
                b.jobs.push(this.board.post({ kind: 'build', site: b }));
                this.refreshPriorities();
            }
            return b;
        }

        place(type, x, y) {
            if (this.over || !BUILD_MENU.includes(type) || !this.canPlace(type, x, y).ok) return null;
            const b = this.addBuilding(type, x, y, false);
            this.events.push({ type: 'placed', b });
            return b;
        }

        costTotal(b) { return RES.reduce((s, r) => s + (b.def.cost[r] || 0), 0); }
        need(b, r) { return (b.def.cost[r] || 0) - b.delivered[r] - b.incoming[r]; }
        deliveredFrac(b) {
            const total = this.costTotal(b);
            return total ? RES.reduce((s, r) => s + b.delivered[r], 0) / total : 1;
        }
        buildCap(b) { return b.def.work * this.deliveredFrac(b); }

        finish(b, silent) {
            b.complete = true;
            b.progress = b.def.work;
            b.doneAt = this.ticks;
            b.maxHp = b.hp = this.maxHpOf(b);
            b.jobs.forEach(j => this.board.remove(j));
            b.jobs = [];
            for (let yy = b.y; yy < b.y + b.h; yy++) {
                for (let xx = b.x; xx < b.x + b.w; xx++) {
                    const i = this.map.idx(xx, yy);
                    this.refreshPass(i);
                    if (b.type === 'farm') this.addFoodTile(i, FOOD_CROP);
                }
            }
            if (b.def.craft) b.jobs.push(this.board.post({ kind: 'craft', site: b }));
            this.refreshMasks();
            if (!b.def.walkable) this.evict(b);
            this.assignHomes();
            if (this.war) this.war.fieldDirty = true;
            if (this.blight && b.def.ward) this.blight.wantDirty = true;
            if (!silent) {
                this.stats.built++;
                this.events.push({ type: 'built', b });
            }
            this.refreshPriorities();
        }

        evict(b) {
            for (const v of this.villagers) {
                if (v.inside) continue;
                const i = this.tileOf(v);
                if (this.bldAt[i] !== b.id) continue;
                this.release(v);
                const path = this.pathfinder.find(i, j => this.pass[j] === 1, null, 400);
                if (path) { this.setPath(v, path, null); v.state = 'wander'; }
            }
        }

        // Take a building off the map: cancelled sites refund, destroyed buildings don't.
        removeBuilding(b) {
            b.removed = true;
            b.jobs.forEach(j => this.board.remove(j));
            b.jobs = [];
            for (const v of this.villagers) {
                if (v.job && v.job.site === b) {
                    this.release(v);
                    v.path = null;
                    v.state = 'seek';
                }
            }
            for (let yy = b.y; yy < b.y + b.h; yy++) {
                for (let xx = b.x; xx < b.x + b.w; xx++) {
                    const i = this.map.idx(xx, yy);
                    this.bldAt[i] = 0;
                    if (b.type === 'farm') this.removeFoodTile(i);
                    this.refreshPass(i);
                }
            }
            this.buildings.splice(this.buildings.indexOf(b), 1);
            this.byId.delete(b.id);
            this.refreshMasks();
            if (this.war) this.war.fieldDirty = true;
            if (this.blight && b.def.ward) this.blight.wantDirty = true;
            this.refreshPriorities();
        }

        cancel(b) {
            if (!b || b.complete || b.removed) return false;
            RES.forEach(r => { this.stock[r] += b.delivered[r]; });
            this.removeBuilding(b);
            this.events.push({ type: 'cancelled', b });
            return true;
        }

        damageBuilding(b, dmg, cause) {
            if (!b.complete || b.removed || this.over) return;
            b.hp -= dmg;
            b.hitAt = this.ticks;
            if (b.hp <= 0) this.destroyBuilding(b, cause);
        }

        destroyBuilding(b, cause) {
            const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
            if (b.type === 'keep') {
                b.hp = 0;
                this.gameOver(cause ? `The keep was torn down by a ${cause}.` : 'The keep has fallen.');
                return;
            }
            const where = this.where(cx, cy, b);
            // sleepers pour out and run for the keep
            const sleepers = this.villagers.filter(v => v.home === b);
            this.removeBuilding(b);
            for (const v of sleepers) {
                v.home = null;
                if (v.inside) {
                    v.inside = false;
                    v.x = v.px = b.x + b.w / 2; v.y = v.py = b.y + b.h + 0.5;
                    this.flee(v);
                }
            }
            this.assignHomes();
            this.events.push({ type: 'destroyed', b, x: cx, y: cy });
            this.record(`The ${b.def.name.toLowerCase()} ${where} was ${cause === 'fire' ? 'lost to fire' : 'destroyed' + (cause ? ` by a ${cause}` : '')}.`, 'bad');
        }

        assignHomes() {
            const used = new Map();
            for (const v of this.villagers) {
                if (v.home && (v.home.removed || !v.home.complete)) v.home = null;
                if (v.home) used.set(v.home, (used.get(v.home) || 0) + 1);
            }
            // houses first so the keep frees up as the village grows
            const homes = this.buildings.filter(b => b.complete && b.def.beds)
                .sort((a, b) => (a.type === 'keep') - (b.type === 'keep'));
            for (const v of this.villagers) {
                if (v.home) continue;
                const h = homes.find(b => (used.get(b) || 0) < b.def.beds);
                if (!h) break;
                v.home = h;
                used.set(h, (used.get(h) || 0) + 1);
            }
        }

        // ---- priorities / job board ----

        setPriority(key, value) {
            if (!PRIORITY_KEYS.includes(key)) return;
            this.priorities[key] = Math.max(0, Math.min(3, value | 0));
            this.refreshPriorities();
        }

        refreshPriorities() {
            const p = this.priorities;
            const short = {};
            RES.forEach(r => { short[r] = 0; });
            for (const b of this.buildings) {
                if (b.complete) continue;
                RES.forEach(r => { short[r] += Math.max(0, this.need(b, r)); });
            }
            const lowFood = this.stock.food < this.villagers.length * 2;
            Object.keys(GATHER).forEach(kind => {
                const g = GATHER[kind], base = p[g.prio];
                let prio = base;
                if (base > 0) {
                    if (short[g.res] > this.avail(g.res)) prio += 1;
                    if (g.res === 'food' && lowFood) prio += 1;
                }
                this.gatherJobs[kind].priority = prio;
            });
            for (const b of this.buildings) {
                for (const j of b.jobs) {
                    if (j.kind === 'craft') j.priority = p.craft > 0 ? p.craft + 0.3 : 0;
                    else j.priority = p.build > 0 ? p.build + (j.kind === 'build' ? 0.6 : 0.5) : 0;
                }
            }
            this.repairJob.priority = p.build > 0 ? p.build + 0.7 : 0.5;
            this.douseJob.priority = 6;
            this.damaged = this.buildings.filter(b => b.complete && !b.removed && b.hp < b.maxHp - 0.5 && !b.burning);
            this.fires = this.war ? this.war.fireTargets() : [];
            this.board.dirty = true;
        }

        jobOpen(job) {
            if (job.kind === 'repair') return this.damaged.length > 0;
            if (job.kind === 'douse') return this.fires.length > 0;
            if (job.standing) return this.srcCount[job.kind] > 0;
            const s = job.site;
            if (s.removed) return false;
            if (job.kind === 'craft') return s.complete && !s.worker && this.canCraft(s);
            if (s.complete) return false;
            if (job.kind === 'deliver') return this.need(s, job.res) > 0 && this.avail(job.res) > 0;
            return s.builders < BAL.BUILDERS_PER_SITE && s.progress < this.buildCap(s) - 1e-6;
        }

        canCraft(b) {
            const c = b.def.craft;
            for (const r in c.in) if (this.avail(r) < c.in[r]) return false;
            for (const r in c.out) {
                if (r === 'mana') { if (!this.divine || this.divine.mana >= this.divine.maxMana()) return false; }
                else if (this.stock[r] >= BAL.STOCK_CAP) return false;
            }
            return true;
        }

        distToBuilding(v, s) {
            const dx = Math.max(s.x - v.x, 0, v.x - (s.x + s.w));
            const dy = Math.max(s.y - v.y, 0, v.y - (s.y + s.h));
            return octile(dx, dy);
        }

        pickJob(v) {
            let best = null, bestScore = 0, bestSrc = null;
            const builder = v.pref === 'build';
            for (const job of this.board.sorted()) {
                if (job.priority * BAL.PREFERENCE <= bestScore) break; // nothing further down can win
                if (!this.jobOpen(job)) continue;
                if (job.kind === 'repair' || job.kind === 'douse') {
                    const t = job.kind === 'repair' ? this.nearestDamaged(v) : this.nearestFire(v);
                    if (!t) continue;
                    const score = job.priority * (builder ? BAL.PREFERENCE : 1) / (1 + t.d / BAL.DIST_SCALE);
                    if (score > bestScore) { best = job; bestScore = score; bestSrc = t; }
                } else if (job.standing) {
                    const like = job.kind === v.pref ? BAL.PREFERENCE : 1;
                    if ((v.noSource[job.kind] || 0) > this.ticks) continue;
                    const crowd = like / (1 + BAL.CROWDING * job.taken);
                    if (job.priority * crowd <= bestScore) continue;
                    const src = this.findSource(v, job.kind, BAL.SEARCH_NODES);
                    if (!src) { v.noSource[job.kind] = this.ticks + BAL.SOURCE_RETRY; continue; }
                    const score = job.priority * crowd / (1 + src.cost / BAL.DIST_SCALE);
                    if (score > bestScore) { best = job; bestScore = score; bestSrc = src; }
                } else {
                    const like = builder && job.kind !== 'craft' ? BAL.PREFERENCE : 1;
                    const score = job.priority * like / (1 + this.distToBuilding(v, job.site) / BAL.DIST_SCALE);
                    if (score > bestScore) { best = job; bestScore = score; bestSrc = null; }
                }
            }
            return best ? { job: best, src: bestSrc } : null;
        }

        nearestDamaged(v) {
            let best = null, bestD = Infinity;
            for (const b of this.damaged) {
                if (b.removed || b.repairers >= BAL.REPAIRERS_PER_SITE || this.avail(b.def.repair || 'stone') < 1) continue;
                const d = this.distToBuilding(v, b);
                if (d < bestD) { bestD = d; best = b; }
            }
            return best ? { b: best, d: bestD } : null;
        }

        nearestFire(v) {
            let best = null, bestD = Infinity;
            for (const f of this.fires) {
                const d = f.b ? this.distToBuilding(v, f.b) : octile(f.x + 0.5 - v.x, f.y + 0.5 - v.y);
                if (d < bestD) { bestD = d; best = f; }
            }
            return best ? Object.assign({ d: bestD }, best) : null;
        }

        isSource(kind, j) {
            if (this.reserved[j] || !this.amount[j] || this.unsafe(j)) return false;
            if (kind === 'chop') return this.map.tiles[j] === TILE.FOREST;
            if (kind === 'forage') return this.foodKind[j] === FOOD_BUSH;
            if (kind === 'farm') return this.foodKind[j] === FOOD_CROP;
            return false;
        }

        // corrupted or burning ground: villagers won't work there
        unsafe(j) {
            return !!((this.blight && this.blight.corr[j] >= 128) || (this.war && this.war.fireT[j]));
        }

        adjacentMinable(j, tile) {
            if (this.unsafe(j)) return -1;
            const w = this.W, x = j % w;
            const n = [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j - w, j + w];
            for (const k of n) {
                if (k >= 0 && k < this.amount.length && this.map.tiles[k] === tile && this.amount[k] && !this.reserved[k]) return k;
            }
            return -1;
        }

        findSource(v, kind, maxNodes) {
            let found = -1;
            const isGoal = kind === 'mine' ? j => (found = this.adjacentMinable(j, TILE.ROCK)) >= 0
                : kind === 'ore' ? j => (found = this.adjacentMinable(j, TILE.ORE)) >= 0
                    : j => { if (this.isSource(kind, j)) { found = j; return true; } return false; };
            const start = this.tileOf(v);
            const path = this.pathfinder.find(start, isGoal, null, maxNodes);
            if (!path) return null;
            return { path, source: found, spot: path.length ? path[path.length - 1] : start, cost: this.pathfinder.cost };
        }

        claim(v, pick) {
            const job = pick.job;
            job.taken++;
            if (job.kind === 'repair') {
                const b = pick.src.b;
                b.repairers++;
                v.lastWork = 'builder';
                v.job = { board: job, kind: 'repair', site: b };
                if (!this.goTo(v, { b }, 'travel')) this.giveUp(v);
                return;
            }
            if (job.kind === 'douse') {
                const f = pick.src;
                v.lastWork = 'firefighter';
                v.job = { board: job, kind: 'douse', fire: f.b ? { b: f.b } : { i: f.i } };
                if (!this.goTo(v, f.b ? { b: f.b } : { near: f.i }, 'travel')) this.giveUp(v);
                return;
            }
            if (job.standing) {
                this.reserved[pick.src.source] = v.id;
                v.lastWork = GATHER[job.kind].role;
                v.job = { board: job, kind: job.kind, source: pick.src.source };
                this.setPath(v, pick.src.path, { i: pick.src.spot });
                v.state = 'travel';
                return;
            }
            const s = job.site;
            if (job.kind === 'craft') {
                s.worker = v.id;
                v.lastWork = s.def.craft.role;
                v.job = { board: job, kind: 'craft', site: s, crafting: false };
                if (!this.goTo(v, { b: s }, 'travel')) this.giveUp(v);
                return;
            }
            if (job.kind === 'deliver') {
                const amount = Math.min(this.carryCap(v), this.need(s, job.res), this.avail(job.res));
                this.reservedStock[job.res] += amount;
                s.incoming[job.res] += amount;
                v.lastWork = 'hauler';
                v.job = { board: job, kind: 'deliver', site: s, res: job.res, amount, phase: 'pickup' };
                if (!this.goTo(v, { mask: this.masks[job.res] }, 'travel')) this.giveUp(v);
                return;
            }
            s.builders++;
            v.lastWork = 'builder';
            v.job = { board: job, kind: 'build', site: s };
            if (!this.goTo(v, { b: s }, 'travel')) this.giveUp(v);
        }

        release(v) {
            const j = v.job;
            if (!j) return;
            v.job = null;
            j.board.taken = Math.max(0, j.board.taken - 1);
            if (GATHER[j.kind]) {
                if (this.reserved[j.source] === v.id) this.reserved[j.source] = 0;
            } else if (j.kind === 'build') {
                j.site.builders--;
            } else if (j.kind === 'repair') {
                j.site.repairers--;
            } else if (j.kind === 'craft') {
                if (j.site.worker === v.id) j.site.worker = 0;
                if (j.crafting) { // refund a half-finished batch
                    const c = j.site.def.craft;
                    for (const r in c.in) this.stock[r] += c.in[r];
                }
            } else if (j.kind === 'deliver') {
                if (j.phase === 'pickup') this.reservedStock[j.res] -= j.amount;
                if (j.phase === 'pickup' || j.phase === 'carry') j.site.incoming[j.res] -= j.amount;
            }
        }

        giveUp(v) {
            this.release(v);
            v.path = null;
            v.state = 'idle';
            v.timer = this.rng.int(20, 40);
        }

        // ---- villager stats ----

        carryCap(v) { return v.trait === 'strong' || v.trait === 'hero' ? BAL.STRONG_CARRY : BAL.CARRY; }

        // everything that speeds up or slows down a villager's work
        workMul(v, kind) {
            let m = v.hunger <= 0 ? BAL.STARVING_SLOW : 1;
            if (v.tool) m *= BAL.TOOL_BONUS;
            if (v.trait === 'lazy') m *= 0.75;
            if ((v.trait === 'strong' || v.trait === 'hero') && (kind === 'build' || kind === 'repair')) m *= 1.3;
            if (v.sick) m *= 0.5;
            m *= 0.85 + 0.25 * v.mood / 100;
            if (kind === 'chop' && this.hasTech('axes')) m *= 1.3;
            if ((kind === 'mine' || kind === 'ore') && this.hasTech('veins')) m *= 1.3;
            if (kind === 'craft' && this.hasTech('guilds')) m *= 1.4;
            return m;
        }

        isBrave(v) { return v.trait === 'brave' || v.trait === 'hero' || this.hasTech('militia'); }

        role(v) {
            if (v.trait === 'hero') return 'hero';
            return v.lastWork || 'villager';
        }

        // ---- movement ----

        tileOf(v) { return Math.floor(v.y) * this.W + Math.floor(v.x); }

        setPath(v, path, dest) {
            v.path = path;
            v.pathI = 0;
            v.dest = dest;
        }

        goalFor(dest) {
            const w = this.W;
            if (dest.i !== undefined) {
                const gx = dest.i % w, gy = (dest.i - gx) / w;
                return { isGoal: j => j === dest.i, h: j => octile((j % w) - gx, Math.floor(j / w) - gy) };
            }
            if (dest.near !== undefined) {
                const gx = dest.near % w, gy = (dest.near - gx) / w;
                return {
                    isGoal: j => { const x = j % w, y = (j - x) / w; return Math.max(Math.abs(x - gx), Math.abs(y - gy)) <= 1 && this.pass[j] === 1; },
                    h: j => Math.max(0, octile((j % w) - gx, Math.floor(j / w) - gy) - 1.5)
                };
            }
            if (dest.b) {
                const b = dest.b;
                return {
                    isGoal: j => this.atBuilding(j, b),
                    h: j => {
                        const x = j % w, y = Math.floor(j / w);
                        return octile(Math.max(b.x - 1 - x, 0, x - (b.x + b.w)), Math.max(b.y - 1 - y, 0, y - (b.y + b.h)));
                    }
                };
            }
            return { isGoal: j => dest.mask[j] === 1, h: null };
        }

        goTo(v, dest, state) {
            const goal = this.goalFor(dest);
            const path = this.pathfinder.find(this.tileOf(v), goal.isGoal, goal.h, BAL.SEARCH_NODES * 2);
            if (!path) return false;
            this.setPath(v, path, dest);
            v.state = state;
            return true;
        }

        // Returns true once the path is finished.
        move(v) {
            const fleeing = v.state === 'flee' ? 1.35 : 1;
            let budget = BAL.SPEED * fleeing * (v.hunger <= 0 ? BAL.STARVING_SLOW : 1);
            const w = this.W;
            while (budget > 0 && v.pathI < v.path.length) {
                const ti = v.path[v.pathI];
                if (!this.pass[ti]) {
                    // the way got blocked (a building finished, land was raised): find a new route
                    if (!v.dest) { v.path = null; return true; }
                    const goal = this.goalFor(v.dest);
                    const path = this.pathfinder.find(this.tileOf(v), goal.isGoal, goal.h, BAL.SEARCH_NODES * 2);
                    if (!path) { this.giveUp(v); return false; }
                    this.setPath(v, path, v.dest);
                    continue;
                }
                const last = v.pathI === v.path.length - 1;
                const tx = (ti % w) + 0.5 + (last ? v.jx : 0);
                const ty = Math.floor(ti / w) + 0.5 + (last ? v.jy : 0);
                const dx = tx - v.x, dy = ty - v.y;
                const dist = Math.hypot(dx, dy);
                if (Math.abs(dx) > 0.01) v.face = dx > 0 ? 1 : -1;
                if (dist <= budget) {
                    v.x = tx; v.y = ty;
                    budget -= dist;
                    v.walked += dist;
                    v.pathI++;
                } else {
                    v.x += dx / dist * budget;
                    v.y += dy / dist * budget;
                    v.walked += budget;
                    budget = 0;
                }
            }
            if (v.pathI >= v.path.length) { v.path = null; return true; }
            return false;
        }

        // ---- villager brain ----

        tickVillager(v) {
            v.px = v.x; v.py = v.y;
            const sleeping = v.state === 'sleep' && !v.path;
            v.hunger = Math.max(0, v.hunger - BAL.HUNGER_DECAY * (sleeping ? 0.5 : 1));
            if (!sleeping) v.rest = Math.max(0, v.rest - BAL.REST_DECAY * (v.trait === 'lazy' ? 1.2 : 1));

            // health: corruption underfoot and sickness hurt, food and sleep heal
            const here = this.tileOf(v);
            if (!v.inside && this.blight && this.blight.corr[here] >= 128) this.hurt(v, BAL.CORRUPT_HURT, 'corruption');
            if (v.sick > 0) {
                v.sick -= this.nearWell(v.home ? v.home.x : v.x, v.home ? v.home.y : v.y) ? 2 : 1;
                if (v.sick <= 0) { v.sick = 0; this.record(`${v.name} has recovered from the plague.`, 'good'); }
                this.hurt(v, BAL.SICK_HURT, 'plague');
            } else if (v.hunger > 0 && v.hp < v.maxHp) {
                v.hp = Math.min(v.maxHp, v.hp + BAL.HP_REGEN * (sleeping ? 3 : 1));
            }
            if (v.dead) return;

            if ((this.ticks + v.id) % 4 === 0 && !v.inside && v.state !== 'fight' && v.state !== 'flee' && this.war) {
                const m = this.war.nearestMonster(v.x, v.y, BAL.THREAT_RADIUS, true);
                if (m) this.react(v, m);
            }
            if (v.state === 'fight') { this.fight(v); return; }
            if (v.state === 'shelter') { this.shelter(v); return; }

            if (v.path) {
                if (this.move(v)) this.arrive(v);
                return;
            }
            switch (v.state) {
                case 'seek': this.decide(v); break;
                case 'idle': if (--v.timer <= 0) v.state = 'seek'; break;
                case 'work': this.work(v); break;
                case 'eat':
                    if (--v.timer <= 0) {
                        if (this.stock.food > this.reservedStock.food) {
                            this.stock.food--;
                            v.hunger = Math.min(100, v.hunger + BAL.MEAL);
                        }
                        v.state = 'seek';
                    }
                    break;
                case 'sleep': this.sleep(v); break;
                default: v.state = 'seek';
            }
        }

        decide(v) {
            if (v.carryN) { this.startHaul(v); return; }
            if (this.isBedtimeFor(v)) { this.goSleep(v); return; }
            if (v.rest <= 0) { v.state = 'sleep'; v.nap = true; v.timer = BAL.NAP_TICKS; return; }
            if (v.hunger < BAL.HUNGRY) {
                if (this.avail('food') >= 1 && this.goTo(v, { mask: this.masks.food }, 'eat')) return;
                if (!this.warned.hungry) {
                    this.warned.hungry = true;
                    this.events.push({ type: 'hungry' });
                }
            }
            if (!v.tool && this.avail('tools') >= 1) {
                this.stock.tools--;
                v.tool = true;
            }
            const pick = this.pickJob(v);
            if (pick) { this.claim(v, pick); return; }
            this.wander(v);
        }

        wander(v) {
            const map = this.map, r = 4;
            const home = v.home || this.keepB;
            // drift back towards the village rather than into the woods
            const far = home && Math.hypot(v.x - home.x, v.y - home.y) > 10;
            const bx = far ? Math.sign(home.x - v.x) * 2 : 0;
            const by = far ? Math.sign(home.y - v.y) * 2 : 0;
            for (let a = 0; a < 6; a++) {
                const x = Math.floor(v.x) + bx + this.rng.int(-r, r), y = Math.floor(v.y) + by + this.rng.int(-r, r);
                if (!map.inBounds(x, y) || !this.pass[map.idx(x, y)] || this.unsafe(map.idx(x, y))) continue;
                if (this.goTo(v, { i: map.idx(x, y) }, 'wander')) return;
            }
            v.state = 'idle';
            v.timer = this.rng.int(20, 40);
        }

        startHaul(v) {
            const j = v.job;
            if (j && j.kind === 'deliver' && j.phase === 'carry' && !j.site.removed) {
                if (this.goTo(v, { b: j.site }, 'haul')) return;
                this.release(v);
            }
            if (this.goTo(v, { mask: this.masks[v.carry] }, 'haul')) return;
            // nowhere to take it: drop it into the village stock where you stand rather than loop
            this.dropCarry(v);
            v.state = 'idle';
            v.timer = 30;
        }

        dropCarry(v) {
            if (!v.carryN) return;
            this.stock[v.carry] += v.carryN;
            v.carry = null;
            v.carryN = 0;
        }

        goSleep(v) {
            if (!v.home) this.assignHomes();
            v.nap = false;
            if (v.home && this.goTo(v, { b: v.home }, 'sleep')) return;
            v.state = 'sleep'; // no bed (or no way home): sleep where you stand
        }

        arrive(v) {
            const j = v.job;
            switch (v.state) {
                case 'wander':
                    v.state = 'idle';
                    v.timer = this.rng.int(15, 45);
                    return;
                case 'flee':
                    this.dropCarry(v);
                    v.inside = true;
                    v.state = 'shelter';
                    v.timer = 20;
                    return;
                case 'travel':
                    if (!j) { v.state = 'seek'; return; }
                    if (GATHER[j.kind]) {
                        if (this.reserved[j.source] !== v.id || !this.amount[j.source]) { this.release(v); v.state = 'seek'; return; }
                        v.state = 'work';
                        v.timer = this.gatherTicks(v, j);
                        this.faceTile(v, j.source);
                        return;
                    }
                    if (j.kind === 'douse') {
                        v.state = 'work';
                        v.timer = BAL.DOUSE_TICKS;
                        return;
                    }
                    if (j.site.removed || (j.site.complete && j.kind !== 'craft' && j.kind !== 'repair')) { this.release(v); v.state = 'seek'; return; }
                    if (j.kind === 'build' || j.kind === 'repair' || j.kind === 'craft') {
                        v.state = 'work';
                        v.timer = 0;
                        v.face = v.x < j.site.x + j.site.w / 2 ? 1 : -1;
                        return;
                    }
                    // deliver: at a store, pick the goods up
                    this.stock[j.res] -= j.amount;
                    this.reservedStock[j.res] -= j.amount;
                    v.carry = j.res;
                    v.carryN = j.amount;
                    j.phase = 'carry';
                    this.startHaul(v);
                    return;
                case 'haul':
                    if (j && j.kind === 'deliver' && j.phase === 'carry' && !j.site.removed) {
                        j.site.delivered[j.res] += v.carryN;
                        j.site.incoming[j.res] -= j.amount;
                        j.phase = 'done';
                        this.events.push({ type: 'deliver', x: v.x, y: v.y, res: v.carry, n: v.carryN });
                        v.carry = null;
                        v.carryN = 0;
                        this.release(v);
                        v.state = 'seek';
                        return;
                    }
                    this.stock[v.carry] += v.carryN;
                    if (this.stats.gathered[v.carry] !== undefined) this.stats.gathered[v.carry] += v.carryN;
                    this.events.push({ type: 'deposit', x: v.x, y: v.y, res: v.carry, n: v.carryN });
                    v.carry = null;
                    v.carryN = 0;
                    if (j) this.release(v);
                    v.state = 'seek';
                    if (this.warned.hungry && this.stock.food > this.villagers.length) this.warned.hungry = false;
                    return;
                case 'eat':
                    v.timer = BAL.EAT_TICKS;
                    return;
                case 'sleep':
                    v.inside = !!v.home;
                    return;
                default:
                    v.state = 'seek';
            }
        }

        faceTile(v, i) {
            const x = (i % this.W) + 0.5;
            if (Math.abs(x - v.x) > 0.05) v.face = x > v.x ? 1 : -1;
        }

        gatherTicks(v, j) {
            let t = BAL.WORK_TICKS[j.kind];
            if (j.kind === 'chop' && this.nearWoodcutter(j.source)) t /= BAL.WOODCUTTER_BONUS;
            t /= this.workMul(v, j.kind);
            return Math.max(1, Math.round(t));
        }

        nearWoodcutter(i) {
            const x = i % this.W + 0.5, y = Math.floor(i / this.W) + 0.5;
            return this.buildings.some(b => b.type === 'woodcutter' && b.complete &&
                Math.hypot(b.x + b.w / 2 - x, b.y + b.h / 2 - y) <= BAL.WOODCUTTER_RADIUS);
        }

        nearWell(x, y) {
            return this.buildings.some(b => b.type === 'well' && b.complete &&
                Math.hypot(b.x + 0.5 - x, b.y + 0.5 - y) <= BAL.WELL_RADIUS);
        }

        work(v) {
            const j = v.job;
            if (!j) { v.state = 'seek'; return; }
            const stop = () => { this.release(v); v.state = 'seek'; };
            const tired = this.isBedtimeFor(v) || (v.hunger < BAL.HUNGRY && this.avail('food') >= 1);

            if (j.kind === 'build') {
                const s = j.site;
                if (s.removed || s.complete || tired) { stop(); return; }
                s.progress = Math.min(s.progress + BAL.BUILD_RATE * this.workMul(v, 'build'), this.buildCap(s));
                if (s.progress >= s.def.work - 1e-6) {
                    this.release(v);
                    this.finish(s, false);
                    v.state = 'seek';
                } else if (s.progress >= this.buildCap(s) - 1e-6) {
                    stop(); // waiting on materials
                }
                return;
            }

            if (j.kind === 'repair') {
                const b = j.site, res = b.def.repair || 'stone';
                if (b.removed || tired || b.burning) { stop(); return; }
                if (b.repairAcc <= 0) {
                    if (this.avail(res) < 1) { stop(); return; }
                    this.stock[res]--;
                    b.repairAcc += BAL.REPAIR_HP_PER_UNIT;
                }
                const add = Math.min(BAL.REPAIR_RATE * this.workMul(v, 'repair'), b.repairAcc, b.maxHp - b.hp);
                b.hp += add;
                b.repairAcc -= add;
                if (b.hp >= b.maxHp - 1e-6) {
                    b.hp = b.maxHp;
                    this.damaged = this.damaged.filter(d => d !== b);
                    stop();
                }
                return;
            }

            if (j.kind === 'douse') {
                v.timer -= this.workMul(v, 'douse');
                if (v.timer > 0) return;
                if (this.war) this.war.douse(j.fire, v);
                this.fires = this.war ? this.war.fireTargets() : [];
                stop();
                return;
            }

            if (j.kind === 'craft') {
                const s = j.site, c = s.def.craft;
                if (s.removed || !s.complete || tired) { stop(); return; }
                if (!j.crafting) {
                    if (!this.canCraft(s)) { stop(); return; }
                    for (const r in c.in) this.stock[r] -= c.in[r];
                    j.crafting = true;
                    v.timer = c.ticks;
                }
                v.timer -= this.workMul(v, 'craft');
                if (v.timer > 0) return;
                j.crafting = false;
                for (const r in c.out) {
                    if (r === 'mana') { if (this.divine) this.divine.addMana(c.out[r] * (this.hasTech('devotion') ? 1.5 : 1)); }
                    else this.stock[r] += c.out[r];
                    this.events.push({ type: 'deposit', x: s.x + s.w / 2, y: s.y, res: r, n: c.out[r] });
                }
                return;
            }

            // gathering: one unit per work cycle, up to a full load
            v.timer -= 1;
            if (v.timer > 0) return;
            const src = j.source, kind = j.kind;
            if (!this.amount[src]) { stop(); return; }
            this.takeUnit(src, kind);
            v.carry = GATHER[kind].res;
            v.carryN++;
            this.events.push({ type: 'gather', x: (src % this.W) + 0.5, y: Math.floor(src / this.W) + 0.5, res: v.carry });

            const done = v.carryN >= this.carryCap(v) || this.isBedtimeFor(v);
            if (!done && this.amount[src]) { v.timer = this.gatherTicks(v, j); return; }
            this.release(v);
            if (!done) {
                // this one's used up: top up the load from a neighbour before walking home
                const next = this.findSource(v, kind, 120);
                if (next) {
                    const job = this.gatherJobs[kind];
                    this.claim(v, { job, src: next });
                    return;
                }
            }
            this.startHaul(v);
        }

        takeUnit(i, kind) {
            this.amount[i]--;
            const x = i % this.W, y = Math.floor(i / this.W);
            if (kind === 'ore' && this.rng.next() < BAL.GOLD_CHANCE) {
                this.stock.gold++;
                this.events.push({ type: 'deposit', x: x + 0.5, y, res: 'gold', n: 1 });
            }
            if (this.amount[i]) return;
            if (kind === 'chop' || kind === 'mine' || kind === 'ore') {
                this.srcCount[kind]--;
                this.map.setTile(x, y, TILE.GRASS);
                this.refreshPass(i);
                if (kind !== 'chop') this.refreshMasks(); // a quarried rock may open a new side of a store
                if (this.war) this.war.fieldDirty = true;
            } else if (kind === 'forage') {
                this.srcCount.forage--;
                this.grow[i] = BAL.BUSH_REGROW;
            } else {
                this.srcCount.farm--;
                this.grow[i] = this.hasTech('rotation') ? Math.round(BAL.CROP_GROW * 0.75) : BAL.CROP_GROW;
            }
        }

        sleep(v) {
            v.rest = Math.min(100, v.rest + BAL.REST_SLEEP);
            if (v.nap) {
                if (--v.timer > 0 && v.rest < 100) return;
                v.nap = false;
            } else if (this.isBedtimeFor(v)) {
                return;
            }
            v.inside = false;
            v.state = 'seek';
        }

        // ---- danger: flee, shelter, fight ----

        react(v, m) {
            if (this.isBrave(v) && v.hp > v.maxHp * 0.35) {
                this.release(v);
                v.path = null;
                v.inside = false;
                v.state = 'fight';
                v.target = m;
                v.fightCd = 0;
                v.timer = 0;
                return;
            }
            this.flee(v);
        }

        flee(v) {
            this.release(v);
            v.target = null;
            v.path = null;
            if (this.keepB && this.goTo(v, { b: this.keepB }, 'flee')) return;
            v.state = 'idle';
            v.timer = 20;
        }

        shelter(v) {
            if (--v.timer > 0) return;
            v.timer = 20;
            const k = this.keepB;
            if (this.war && k && this.war.nearestMonster(k.x + 1.5, k.y + 1.5, BAL.SHELTER_CLEAR, true)) return;
            if (this.isBedtimeFor(v) && v.home === k) { v.state = 'sleep'; return; }
            v.inside = false;
            v.state = 'seek';
        }

        fight(v) {
            const m = v.target;
            if (!m || m.dead || Math.hypot(m.x - v.x, m.y - v.y) > 9) {
                v.target = null; v.path = null; v.state = 'seek';
                return;
            }
            if (v.hp < v.maxHp * 0.25 && v.trait !== 'hero') { this.flee(v); return; }
            const d = Math.hypot(m.x - v.x, m.y - v.y);
            if (d <= 1.05) {
                v.path = null;
                if (Math.abs(m.x - v.x) > 0.05) v.face = m.x > v.x ? 1 : -1;
                if (--v.fightCd > 0) return;
                const dmg = v.trait === 'hero' ? BAL.HERO_DMG : BAL.FIGHT_DMG + (v.tool ? 1 : 0) + (v.trait === 'strong' ? 1 : 0);
                v.fightCd = BAL.FIGHT_CD;
                this.events.push({ type: 'swing', x: (v.x + m.x) / 2, y: (v.y + m.y) / 2 - 0.3 });
                if (this.war) this.war.damageMonster(m, dmg, v.name);
                return;
            }
            if (!v.path || --v.timer <= 0) {
                v.timer = 8;
                const mi = Math.floor(m.y) * this.W + Math.floor(m.x);
                const goal = this.goalFor({ near: mi });
                const path = this.pathfinder.find(this.tileOf(v), goal.isGoal, goal.h, 900);
                if (!path) { v.target = null; v.state = 'seek'; return; }
                this.setPath(v, path, null);
            }
            if (this.move(v)) v.path = null;
        }

        hurt(v, dmg, cause) {
            if (v.dead) return;
            v.hp -= dmg;
            if (dmg >= 0.5) v.hurtAt = this.ticks;
            if (v.hp <= 0) this.killVillager(v, cause);
        }

        killVillager(v, cause) {
            if (v.dead) return;
            const where = this.where(v.x, v.y);
            const who = `${v.name} the ${this.role(v)}`;
            let text;
            if (cause === 'corruption') text = `${who} withered away in the corruption ${where}.`;
            else if (cause === 'plague') text = `${who} succumbed to the plague.`;
            else if (cause === 'fire') text = `${who} was caught in the flames ${where}.`;
            else text = `${who} was slain by a ${cause} ${where}.`;
            this.release(v);
            v.dead = true;
            v.inside = false;
            this.villagers.splice(this.villagers.indexOf(v), 1);
            this.stats.deaths++;
            this.recentDeaths.push(this.ticks);
            this.assignHomes();
            this.events.push({ type: 'death', v, x: v.x, y: v.y, text });
            this.record(text, 'death');
            if (!this.villagers.length) this.gameOver('The last villager has fallen.');
        }

        // ---- mood ----

        updateMood(v, shrines) {
            let target = 55;
            target += v.home ? 10 : -10;
            target += v.hunger <= 0 ? -25 : v.hunger < BAL.HUNGRY ? -8 : 5;
            if (v.rest < 20) target -= 8;
            if (v.sick) target -= 10;
            if (v.trait === 'lazy') target += 5;
            if (this.hasTech('golden')) target += 10;
            const bl = this.blight;
            if (bl) {
                const tx = Math.floor(v.x), ty = Math.floor(v.y);
                for (const [ox, oy] of [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
                    const x = tx + ox, y = ty + oy;
                    if (this.map.inBounds(x, y) && bl.corr[this.map.idx(x, y)] >= 128) { target -= 15; break; }
                }
            }
            if (shrines.some(b => Math.hypot(b.x + 1 - v.x, b.y + 1 - v.y) <= 10)) target += 12;
            if (this.nearWell(v.x, v.y)) target += 4;
            const since = this.ticks - DAY.LENGTH;
            target -= 7 * Math.min(4, this.recentDeaths.filter(t => t > since).length);
            if (this.war && this.war.bloodMoon && this.isNight()) target -= 10;
            v.mood += (Math.max(0, Math.min(100, target)) - v.mood) * 0.15;
        }

        // ---- the log ----

        record(text, kind) {
            const t = this.timeOfDay();
            this.chronicle.push({ day: this.day(), night: this.isNight(), t, text, kind: kind || 'info' });
            if (this.chronicle.length > 300) this.chronicle.shift();
            this.events.push({ type: 'log' });
        }

        // "at the east gate", "by the house north of the keep", "far south-west of the keep"
        where(x, y, exclude) {
            const k = this.keepB;
            if (!k) return '';
            const kx = k.x + 1.5, ky = k.y + 1.5;
            let near = null, nearD = 2.2;
            for (const b of this.buildings) {
                if (b === k || b === exclude || !b.complete) continue;
                const d = octile(Math.max(b.x - x, 0, x - (b.x + b.w)), Math.max(b.y - y, 0, y - (b.y + b.h)));
                if (d < nearD) { nearD = d; near = b; }
            }
            const dir = compass(x - kx, y - ky);
            const dist = Math.hypot(x - kx, y - ky);
            if (near) {
                const bdir = compass(near.x + near.w / 2 - kx, near.y + near.h / 2 - ky);
                const defend = near.def.cat === 'defense';
                return defend ? `at the ${bdir} ${near.def.name.toLowerCase()}` : `by the ${near.def.name.toLowerCase()} ${bdir} of the keep`;
            }
            if (dist < 3.5) return 'at the keep';
            return `${dist > 22 ? 'far ' : ''}${dir} of the keep`;
        }

        gameOver(reason) {
            if (this.over) return;
            this.over = { reason, day: this.day(), night: this.isNight() };
            this.record(reason, 'death');
            this.events.push({ type: 'gameover', reason });
        }

        // ---- world tick ----

        tick() {
            if (this.over) return;
            this.ticks++;
            const t = this.timeOfDay();
            if (t === DAY.DAWN) this.newDay();
            if (t === DAY.DUSK) this.events.push({ type: 'dusk' });

            const bl = this.blight;
            for (let k = 0; k < this.foodTiles.length; k++) {
                const i = this.foodTiles[k];
                if (this.amount[i]) continue;
                if (bl && bl.corr[i] >= 128) continue; // nothing grows in corruption
                if (this.drought && !this.nearWell(i % this.W, Math.floor(i / this.W))) continue;
                if (--this.grow[i] > 0) continue;
                if (this.foodKind[i] === FOOD_BUSH) { this.amount[i] = BAL.BUSH_FOOD; this.srcCount.forage++; }
                else { this.amount[i] = BAL.CROP_FOOD + (this.hasTech('rotation') ? 1 : 0); this.srcCount.farm++; }
            }
            if (this.ticks % 10 === 0) this.refreshPriorities();
            let shrines = null;
            for (const v of this.villagers.slice()) {
                if (v.dead) continue;
                this.tickVillager(v);
                if (!v.dead && (this.ticks + v.id) % 50 === 0) {
                    if (!shrines) shrines = this.buildings.filter(b => b.type === 'shrine' && b.complete);
                    this.updateMood(v, shrines);
                }
                if (this.over) return;
            }
            if (this.divine) this.divine.tick();
            if (this.blight) this.blight.tick();
            if (this.war) this.war.tick();
            if (this.story) this.story.tick();
        }

        newDay() {
            const day = this.day();
            this.warned = {};
            this.events.push({ type: 'day', day });
            if (this.war) this.war.dawn(day);
            if (this.blight) this.blight.dawn(day);
            this.recentDeaths = this.recentDeaths.filter(t => t > this.ticks - DAY.LENGTH * 2);

            // the miserable leave with the sunrise
            for (const v of this.villagers.slice()) {
                if (v.mood >= BAL.MOOD_LEAVE || this.villagers.length <= 2 || this.rng.next() < 0.5) continue;
                this.release(v);
                v.dead = true;
                this.villagers.splice(this.villagers.indexOf(v), 1);
                this.stats.left++;
                this.record(`${v.name} the ${this.role(v)} packed up and left the village, miserable.`, 'bad');
            }
            this.assignHomes();
            if (this.story) this.story.dawn(day);
            this.arrivals(day);
        }

        arrivals(day) {
            if ((day - 1) % BAL.ARRIVAL_EVERY_DAYS !== 0) return;
            const pop = this.villagers.length, free = this.popCap() - pop;
            if (free <= 0) { this.events.push({ type: 'nohousing' }); return; }
            if (this.stock.food < pop * BAL.ARRIVAL_FOOD_PER_HEAD) { this.events.push({ type: 'nofood' }); return; }
            const count = Math.min(BAL.ARRIVALS + (this.hasTech('golden') ? 1 : 0), free);
            const arrived = [];
            for (let k = 0; k < count; k++) arrived.push(this.walkIn());
            this.stats.arrived += arrived.length;
            this.assignHomes();
            this.events.push({ type: 'arrived', villagers: arrived });
            this.record(`${arrived.map(v => v.name).join(' and ')} ${arrived.length > 1 ? 'have' : 'has'} joined the village.`, 'good');
        }

        // spawn a newcomer somewhere ~14 tiles out that's connected to the keep
        walkIn(trait, name) {
            const keep = this.keepB;
            const start = keep ? this.map.idx(keep.x + 1, keep.y + keep.h) : this.tileOf(this.villagers[0]);
            const sx = start % this.W, sy = Math.floor(start / this.W);
            const salt = this.rng.next();
            const path = this.pathfinder.find(start, j => {
                const d = Math.hypot((j % this.W) - sx, Math.floor(j / this.W) - sy);
                return d >= 14 && !this.unsafe(j) && ((j * 2654435761 >>> 0) / 4294967296 + salt) % 1 < 0.08;
            }, null, 4000);
            const i = path && path.length ? path[path.length - 1] : start;
            return this.spawnVillager((i % this.W) + 0.5, Math.floor(i / this.W) + 0.5, trait, name);
        }

        // ---- queries for the UI ----

        countOnTile(x, y) {
            let n = 0;
            for (const v of this.villagers) if (!v.inside && Math.floor(v.x) === x && Math.floor(v.y) === y) n++;
            return n;
        }

        buildingAt(x, y) {
            if (!this.map.inBounds(x, y)) return null;
            const id = this.bldAt[this.map.idx(x, y)];
            return id ? this.byId.get(id) : null;
        }

        describeResource(x, y) {
            const i = this.map.idx(x, y), t = this.map.tiles[i];
            const parts = [];
            if (this.foodKind[i] === FOOD_BUSH) parts.push(this.amount[i] ? `Berry bush · ${this.amount[i]} food` : 'Berry bush · regrowing');
            else if (this.foodKind[i] === FOOD_CROP) parts.push(this.amount[i] ? `Ripe crops · ${this.amount[i]} food` : 'Crops · growing');
            else if (t === TILE.FOREST) parts.push(`${this.amount[i]} wood left`);
            else if (t === TILE.ROCK) parts.push(`${this.amount[i]} stone left`);
            else if (t === TILE.ORE) parts.push(`${this.amount[i]} ore left`);
            else if (t === TILE.CLIFF) parts.push(`Cliff · ${this.cliffHp[i]} hp`);
            if (this.blight && this.blight.corr[i] >= 128) parts.push('Corrupted: kills crops and trees, hurts villagers');
            if (this.war && this.war.fireT[i]) parts.push('On fire!');
            return parts.join('\n');
        }

        villagerActivity(v) {
            const j = v.job;
            switch (v.state) {
                case 'sleep': return v.nap ? 'Napping' : v.path ? 'Heading home to sleep' : v.inside ? 'Asleep at home' : 'Sleeping rough';
                case 'eat': return v.path ? 'Going to eat' : 'Eating';
                case 'flee': return 'Running for the keep!';
                case 'shelter': return 'Sheltering in the keep';
                case 'fight': return v.target ? `Fighting a ${v.target.def.name}` : 'Fighting';
                case 'work':
                    if (j && j.kind === 'build') return `Building a ${j.site.def.name}`;
                    if (j && j.kind === 'repair') return `Repairing the ${j.site.def.name}`;
                    if (j && j.kind === 'craft') return j.site.def.craft.verb;
                    if (j && j.kind === 'douse') return 'Putting out a fire';
                    return j ? GATHER[j.kind].verb : 'Working';
                case 'travel':
                    if (!j) return 'Walking';
                    if (j.kind === 'build') return `Off to build a ${j.site.def.name}`;
                    if (j.kind === 'repair') return `Off to repair the ${j.site.def.name}`;
                    if (j.kind === 'craft') return `Off to the ${j.site.def.name.toLowerCase()}`;
                    if (j.kind === 'douse') return 'Running to put out a fire';
                    if (j.kind === 'deliver') return `Fetching ${j.res} for a ${j.site.def.name}`;
                    return `Off to ${GATHER[j.kind].verb.toLowerCase()}`;
                case 'haul':
                    if (j && j.kind === 'deliver') return `Delivering ${v.carryN} ${v.carry} to a ${j.site.def.name}`;
                    return `Hauling ${v.carryN} ${v.carry} to storage`;
                case 'seek': return 'Looking for work';
                default: return 'Idle';
            }
        }

        // who's doing what, keyed like the priorities
        workforce() {
            const counts = { build: 0, wood: 0, stone: 0, food: 0, ore: 0, craft: 0, idle: 0, rest: 0, defend: 0 };
            for (const v of this.villagers) {
                const j = v.job;
                if (v.state === 'sleep' || v.state === 'eat' || v.state === 'shelter') counts.rest++;
                else if (v.state === 'fight' || v.state === 'flee') counts.defend++;
                else if (!j) counts[v.carryN ? (RES_KEY[v.carry] || 'idle') : 'idle']++;
                else if (GATHER[j.kind]) counts[GATHER[j.kind].prio]++;
                else if (j.kind === 'craft') counts.craft++;
                else counts.build++;
            }
            return counts;
        }
    }

    const RES_KEY = { wood: 'wood', stone: 'stone', food: 'food', ore: 'ore' };

    Object.assign(HK, {
        Colony, Pathfinder, JobBoard, DAY, BAL, RES, BUILDINGS, BUILD_MENU, BUILD_CATS, GATHER, PRIORITY_KEYS,
        TRAITS, FOOD_BUSH, FOOD_CROP, octile, compass, heapPush, heapPop
    });
})(globalThis.HK = globalThis.HK || {});
