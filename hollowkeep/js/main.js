// ========================================
// HOLLOWKEEP - MAIN
// Wires the sim (pure data, fixed tick) to the renderer, camera and HUD:
// top bar (stores, gold, mana, population, day / omen / wave), bottom build
// trays with ghost placement (walls are laid as lines), job priorities, the
// tech tree, god powers (tap the power, then the target), the chronicle,
// caravan trades, info cards, toasts and the end-of-run screen.
// URL params: ?seed=N&agents=N (agents = Phase 1 load-test wanderers)
// Keys: Space pause, 1/2/3 speed, . single tick while paused, D debug,
// Q/W/E/R/T powers, L chronicle, Enter confirm, Esc cancel / close.
// ========================================

(function (HK) {
    'use strict';

    const MAP_SIZE = 128;
    const MAX_AGENTS = 5000;
    const GRID_BY_LEVEL = [0, 0.2, 0.4];
    const STATS_INTERVAL_MS = 250;
    const HUD_INTERVAL_MS = 100;
    const TOAST_MS = 3600;
    const PRIORITY_LABELS = ['Off', 'Low', 'Med', 'High'];
    const PRIORITY_NAMES = { build: 'Building', wood: 'Wood', stone: 'Stone', food: 'Food', ore: 'Ore', craft: 'Crafting' };
    const GOODS = ['ore', 'planks', 'bricks', 'iron', 'tools'];
    const POWER_KEYS = { q: 'lightning', w: 'heal', e: 'raise', r: 'lower', t: 'cleanse' };
    const POWER_GLYPH = { lightning: '⚡', heal: '✚', raise: '▲', lower: '▼', cleanse: '✵' };
    const REPEAT_POWERS = ['raise', 'lower'];

    document.addEventListener('DOMContentLoaded', () => {
        const $ = id => document.getElementById(id);
        const params = new URLSearchParams(location.search);
        const canvas = $('game');
        const renderer = new HK.Renderer(canvas);
        const camera = new HK.Camera(canvas);
        const clock = new HK.SimClock();
        let world = null;
        let colony = null;
        let agentCount = clampAgents(parseInt(params.get('agents'), 10) || 0);
        let selection = null;   // {kind: 'tile'|'villager'|'building'|'monster', ...}
        let placing = null;     // {type, x, y, ok, reason, grab} or {type, paint: true, tiles, anchor}
        let targeting = null;   // {id} while a power waits for its target
        let openTray = null;
        let lastNow = performance.now();

        const ui = {
            debug: $('debug-panel'),
            fps: $('fps'),
            stats: $('stats'),
            card: $('tile-card'),
            cardTitle: $('tile-title'),
            cardBody: $('tile-body'),
            cardBars: $('tile-bars'),
            cardAction: $('tile-action'),
            speeds: [...document.querySelectorAll('.speed')],
            res: {}, chips: {},
            manaFill: $('mana-fill'),
            dayIcon: $('day-icon'),
            dayLabel: $('day-label'),
            daySub: $('day-sub'),
            toasts: $('toasts'),
            buildbar: $('buildbar'),
            tray: $('build-tray'),
            trayTitle: $('tray-title'),
            trayItems: $('tray-items'),
            placebar: $('placebar'),
            placeName: $('place-name'),
            placeCost: $('place-cost'),
            placeHint: $('place-hint'),
            placeOk: $('place-ok'),
            jobs: $('jobs-panel'),
            jobsRows: $('jobs-rows'),
            tech: $('tech-panel'),
            techHead: $('tech-head'),
            techCols: $('tech-cols'),
            log: $('log-panel'),
            logList: $('log-list'),
            trade: $('trade-panel'),
            tradeRows: $('trade-rows'),
            caravanBtn: $('caravan-btn'),
            powers: $('powers'),
            powerToggle: $('power-toggle'),
            powerRing: $('power-ring'),
            over: $('gameover'),
            overTitle: $('over-title'),
            overBody: $('over-body')
        };
        ['wood', 'stone', 'food', 'gold', 'mana', 'pop'].concat(GOODS).forEach(k => {
            ui.res[k] = $(`res-${k}`);
            ui.chips[k] = $(`chip-${k}`);
        });

        function clampAgents(n) { return Math.max(0, Math.min(MAX_AGENTS, n)); }

        function newWorld(seed) {
            world = new HK.World(seed >>> 0, MAP_SIZE, MAP_SIZE, agentCount);
            colony = world.colony;
            clock.setWorld(world);
            renderer.setWorld(world);
            cancelPlacement();
            endTargeting();
            closePanels();
            hideCard();
            ui.over.hidden = true;
            ui.toasts.textContent = '';
            const t = HK.TILE_SIZE;
            const keep = colony.keepB;
            camera.setBounds(MAP_SIZE * t, MAP_SIZE * t);
            camera.jumpTo((keep.x + keep.w / 2) * t, (keep.y + keep.h / 2 + 1) * t);
            lastHud = {};
            buildJobsPanel();
            buildTechPanel();
            colony.events.length = 0;
            if (clock.speed === 0) clock.setSpeed(1);
            toast('Your villagers work on their own. Build homes by day; the purple arrow shows where tonight’s monsters will come from.', 'hint', 7000);
        }

        // ---- icons from the renderer's pixel art ----

        document.querySelectorAll('img[data-icon]').forEach(img => { img.src = renderer.iconURL(img.dataset.icon); });

        function costHTML(cost, times) {
            const n = times || 1;
            const parts = HK.RES.filter(r => cost[r]).map(r =>
                `<span class="cost-item"><img src="${renderer.iconURL(r)}" alt="${r}">${cost[r] * n}</span>`);
            return parts.length ? parts.join('') : '<span class="cost-item">Free</span>';
        }

        // on a phone the power button would sit on top of an open bottom panel
        function syncPanelClass() {
            document.body.classList.toggle('panel-open', !ui.tray.hidden || !ui.jobs.hidden || !ui.tech.hidden || !ui.log.hidden);
        }

        function closePanels(except) {
            if (except !== 'jobs') toggleJobs(false);
            if (except !== 'tray') showTray(null);
            if (except !== 'tech') toggleTech(false);
            if (except !== 'log') toggleLog(false);
            if (except !== 'trade') toggleTrade(false);
            if (except !== 'powers') toggleRing(false);
        }

        // ---- bottom bar: build trays, jobs, tech ----

        function barButton(cls, icon, name, sub, onClick) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = `build-btn ${cls}`;
            b.setAttribute('aria-pressed', 'false');
            b.innerHTML = `<span class="build-art"><img src="${icon}" alt=""></span>
                <span class="build-name">${name}</span><span class="build-cost">${sub}</span>`;
            b.addEventListener('click', onClick);
            ui.buildbar.appendChild(b);
            return b;
        }

        const catButtons = {};
        const CAT_ICON = { village: 'house', industry: 'sawmill', defense: 'tower' };
        HK.BUILD_CATS.forEach(cat => {
            catButtons[cat.id] = barButton('cat-btn', renderer.buildingURL(CAT_ICON[cat.id]), cat.name, `${cat.types.length} buildings`,
                () => showTray(openTray === cat.id ? null : cat.id));
        });
        const jobsBtn = barButton('jobs-btn', renderer.iconURL('pop'), 'Jobs', 'priorities', () => toggleJobs());
        const techBtn = barButton('tech-btn', renderer.buildingURL('shrine'), 'Tech', 'gold + mana', () => toggleTech());

        function showTray(id) {
            openTray = id;
            Object.keys(catButtons).forEach(k => catButtons[k].setAttribute('aria-pressed', String(k === id)));
            ui.tray.hidden = !id;
            syncPanelClass();
            if (!id) return;
            closePanels('tray');
            hideCard();
            const cat = HK.BUILD_CATS.find(c => c.id === id);
            ui.trayTitle.textContent = cat.name;
            ui.trayItems.textContent = '';
            cat.types.forEach(type => {
                const def = HK.BUILDINGS[type];
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'build-btn';
                b.title = def.info;
                b.innerHTML = `<span class="build-art"><img src="${renderer.buildingURL(type)}" alt=""></span>
                    <span class="build-name">${def.name}</span><span class="build-cost">${costHTML(def.cost)}</span>`;
                b.addEventListener('click', () => startPlacement(type));
                ui.trayItems.appendChild(b);
            });
        }

        function toggleJobs(force) {
            const show = force !== undefined ? force : ui.jobs.hidden;
            ui.jobs.hidden = !show;
            syncPanelClass();
            jobsBtn.setAttribute('aria-pressed', String(show));
            if (show) { closePanels('jobs'); hideCard(); refreshJobs(); }
        }

        function buildJobsPanel() {
            ui.jobsRows.textContent = '';
            HK.PRIORITY_KEYS.forEach(key => {
                const row = document.createElement('div');
                row.className = 'job-row';
                row.innerHTML = `<span class="job-name">${PRIORITY_NAMES[key]} <small data-count="${key}"></small></span>
                    <span class="seg" role="radiogroup" aria-label="${PRIORITY_NAMES[key]} priority">${PRIORITY_LABELS.map((l, i) =>
                        `<button type="button" class="seg-btn" data-key="${key}" data-value="${i}">${l}</button>`).join('')}</span>`;
                ui.jobsRows.appendChild(row);
            });
            ui.jobsRows.querySelectorAll('.seg-btn').forEach(b => b.addEventListener('click', () => {
                colony.setPriority(b.dataset.key, Number(b.dataset.value));
                refreshJobs();
            }));
            refreshJobs();
        }

        function refreshJobs() {
            if (ui.jobs.hidden || !colony) return;
            ui.jobsRows.querySelectorAll('.seg-btn').forEach(b => {
                b.setAttribute('aria-pressed', String(colony.priorities[b.dataset.key] === Number(b.dataset.value)));
            });
            const counts = colony.workforce();
            ui.jobsRows.querySelectorAll('[data-count]').forEach(el => {
                const n = counts[el.dataset.count];
                el.textContent = n ? `· ${n} working` : '';
            });
        }

        // ---- tech tree ----

        function toggleTech(force) {
            const show = force !== undefined ? force : ui.tech.hidden;
            ui.tech.hidden = !show;
            syncPanelClass();
            techBtn.setAttribute('aria-pressed', String(show));
            if (show) { closePanels('tech'); hideCard(); refreshTech(); }
        }

        function buildTechPanel() {
            ui.techCols.textContent = '';
            HK.TECH_BRANCHES.forEach(br => {
                const col = document.createElement('div');
                col.className = `tech-col ${br.id}`;
                col.innerHTML = `<h3>${br.name}</h3>`;
                br.techs.forEach(t => {
                    const b = document.createElement('button');
                    b.type = 'button';
                    b.className = 'tech-node';
                    b.dataset.tech = t.id;
                    b.innerHTML = `<strong>${t.name}</strong><span class="tech-info">${t.info}</span>
                        <span class="tech-cost"><span class="cost-item"><img src="${renderer.iconURL('gold')}" alt="gold">${t.gold}</span>
                        <span class="cost-item"><img src="${renderer.iconURL('mana')}" alt="mana">${t.mana}</span></span>`;
                    b.addEventListener('click', () => {
                        const res = colony.divine.learn(t.id);
                        toast(res.msg, res.ok ? 'good' : 'warn');
                        refreshTech();
                    });
                    col.appendChild(b);
                });
                ui.techCols.appendChild(col);
            });
        }

        function refreshTech() {
            if (ui.tech.hidden || !colony) return;
            const d = colony.divine;
            ui.techHead.innerHTML = `<span class="cost-item"><img src="${renderer.iconURL('gold')}" alt="">${colony.stock.gold} gold</span>
                <span class="cost-item"><img src="${renderer.iconURL('mana')}" alt="">${Math.floor(d.mana)} mana</span>`;
            ui.techCols.querySelectorAll('.tech-node').forEach(b => {
                const st = d.techState(b.dataset.tech);
                if (b.dataset.state !== st) { b.dataset.state = st; b.disabled = st === 'learned' || st === 'locked'; }
            });
        }

        // ---- chronicle ----

        function toggleLog(force) {
            const show = force !== undefined ? force : ui.log.hidden;
            ui.log.hidden = !show;
            syncPanelClass();
            $('log-btn').setAttribute('aria-pressed', String(show));
            if (show) { closePanels('log'); hideCard(); refreshLog(); }
        }

        let logCount = -1;
        function refreshLog(force) {
            if (ui.log.hidden || !colony) return;
            const list = colony.chronicle;
            if (!force && list.length === logCount && list[list.length - 1] === ui.logList.lastEntry) return;
            logCount = list.length;
            ui.logList.lastEntry = list[list.length - 1];
            ui.logList.textContent = '';
            for (let k = list.length - 1; k >= 0; k--) {
                const e = list[k];
                const li = document.createElement('li');
                li.className = `log-${e.kind}`;
                li.innerHTML = `<span class="log-when">${e.night ? 'Night' : 'Day'} ${e.night && e.t < HK.DAY.DAWN ? e.day - 1 : e.day} · ${clockTime(e.t)}</span>`;
                li.appendChild(document.createTextNode(e.text));
                ui.logList.appendChild(li);
            }
        }

        // ---- caravan ----

        function toggleTrade(force) {
            const show = force !== undefined ? force : ui.trade.hidden;
            ui.trade.hidden = !show;
            if (show) { closePanels('trade'); hideCard(); refreshTrade(); }
        }

        function goodsHTML(g) {
            return Object.keys(g).map(r => `<span class="cost-item"><img src="${renderer.iconURL(r)}" alt="${r}">${g[r]} ${r}</span>`).join(' ');
        }

        function refreshTrade() {
            if (ui.trade.hidden || !colony) return;
            const c = colony.story && colony.story.caravan;
            if (!c) { toggleTrade(false); return; }
            ui.tradeRows.textContent = '';
            c.offers.forEach((o, k) => {
                const row = document.createElement('div');
                row.className = 'trade-row';
                const can = !o.used && Object.keys(o.give).every(r => colony.avail(r) >= o.give[r]);
                row.innerHTML = `<span class="trade-give">${goodsHTML(o.give)}</span><span class="trade-arrow">→</span>
                    <span class="trade-get">${goodsHTML(o.get)}</span>`;
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'btn';
                b.textContent = o.used ? 'Sold' : 'Trade';
                b.disabled = !can;
                b.addEventListener('click', () => {
                    const res = colony.story.trade(k);
                    toast(res.msg, res.ok ? 'good' : 'warn', 1800);
                    refreshTrade();
                });
                row.appendChild(b);
                ui.tradeRows.appendChild(row);
            });
        }
        ui.caravanBtn.addEventListener('click', () => toggleTrade());
        $('trade-close').addEventListener('click', () => toggleTrade(false));

        // ---- placement: menu -> ghost -> drag -> confirm (walls: tap out a line) ----

        function startPlacement(type) {
            const def = HK.BUILDINGS[type];
            endTargeting();
            closePanels();
            hideCard();
            ui.buildbar.hidden = true;
            ui.placebar.hidden = false;
            ui.placeName.textContent = def.name;
            ui.placeOk.hidden = false;
            if (def.paint) {
                placing = { type, paint: true, tiles: [], anchor: null };
                refreshPaint();
                return;
            }
            const T = HK.TILE_SIZE;
            placing = { type, x: 0, y: 0, ok: false, reason: '', grab: null };
            const spot = nearestSpot(type, Math.round(camera.x / T - def.w / 2), Math.round(camera.y / T - def.h / 2));
            moveGhost(spot.x, spot.y);
            ui.placeCost.innerHTML = costHTML(def.cost);
        }

        // Start the ghost somewhere it fits, preferring a tile of breathing room
        // around other buildings so paths stay open.
        function nearestSpot(type, cx, cy) {
            const def = HK.BUILDINGS[type];
            const roomy = (x, y) => {
                for (let yy = y - 1; yy <= y + def.h; yy++) {
                    for (let xx = x - 1; xx <= x + def.w; xx++) if (colony.buildingAt(xx, yy)) return false;
                }
                return true;
            };
            let fallback = null;
            for (let r = 0; r < 14; r++) {
                for (let y = cy - r; y <= cy + r; y++) {
                    for (let x = cx - r; x <= cx + r; x++) {
                        if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== r || !colony.canPlace(type, x, y).ok) continue;
                        if (roomy(x, y)) return { x, y };
                        if (!fallback) fallback = { x, y };
                    }
                }
            }
            return fallback || { x: cx, y: cy };
        }

        function moveGhost(x, y) {
            const def = HK.BUILDINGS[placing.type];
            placing.x = Math.max(0, Math.min(MAP_SIZE - def.w, x));
            placing.y = Math.max(0, Math.min(MAP_SIZE - def.h, y));
            const check = colony.canPlace(placing.type, placing.x, placing.y);
            placing.ok = check.ok;
            placing.reason = check.reason;
            renderer.ghost = { type: placing.type, x: placing.x, y: placing.y, ok: placing.ok };
            ui.placeHint.textContent = placing.ok ? 'Drag to move, then confirm' : check.reason;
            ui.placeHint.classList.toggle('bad', !placing.ok);
            ui.placeOk.disabled = !placing.ok;
        }

        // wall painting: each tap extends the line from the last point (8-connected is
        // monster-tight: monsters can't slip between two diagonal wall tiles)
        function paintTap(tx, ty) {
            const p = placing;
            const k = p.tiles.findIndex(t => t.x === tx && t.y === ty);
            if (k >= 0) {
                p.tiles.splice(k, 1);
                p.anchor = p.tiles.length ? p.tiles[p.tiles.length - 1] : null;
            } else {
                const line = p.anchor ? lineTiles(p.anchor.x, p.anchor.y, tx, ty) : [{ x: tx, y: ty }];
                for (const t of line) {
                    if (p.tiles.length >= 80) break;
                    if (!p.tiles.some(o => o.x === t.x && o.y === t.y)) p.tiles.push(t);
                }
                p.anchor = { x: tx, y: ty };
            }
            refreshPaint();
        }

        function lineTiles(x0, y0, x1, y1) {
            const out = [], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
            for (let k = 1; k <= n; k++) out.push({ x: Math.round(x0 + (x1 - x0) * k / n), y: Math.round(y0 + (y1 - y0) * k / n) });
            return out;
        }

        function refreshPaint() {
            const p = placing, def = HK.BUILDINGS[p.type];
            p.tiles.forEach(t => { t.type = p.type; t.ok = colony.canPlace(p.type, t.x, t.y).ok; });
            const good = p.tiles.filter(t => t.ok).length;
            renderer.ghostTiles = p.tiles;
            renderer.ghostAnchor = p.anchor;
            ui.placeCost.innerHTML = good ? costHTML(def.cost, good) : '';
            ui.placeHint.textContent = !p.tiles.length ? 'Tap a start point, then tap again to lay a line'
                : `${good} ${def.name.toLowerCase()}${good === 1 ? '' : 's'} · tap to extend, tap a piece to remove`;
            ui.placeHint.classList.remove('bad');
            ui.placeOk.disabled = !good;
        }

        function confirmPlacement() {
            if (!placing) return;
            if (placing.paint) {
                const good = placing.tiles.filter(t => t.ok);
                let n = 0;
                good.forEach(t => { if (colony.place(placing.type, t.x, t.y)) n++; });
                if (n) toast(`${n} ${HK.BUILDINGS[placing.type].name.toLowerCase()} piece${n === 1 ? '' : 's'} planned.`);
                cancelPlacement();
                return;
            }
            if (!placing.ok) return;
            const b = colony.place(placing.type, placing.x, placing.y);
            if (!b) return;
            const short = HK.RES.filter(r => (b.def.cost[r] || 0) > colony.avail(r));
            toast(short.length ? `${b.def.name} planned. Villagers need ${short.join(' and ')} for it.`
                : `${b.def.name} planned. Villagers will haul materials and build it.`);
            cancelPlacement();
        }

        function cancelPlacement() {
            placing = null;
            renderer.ghost = null;
            renderer.ghostTiles = null;
            renderer.ghostAnchor = null;
            if (!targeting) {
                ui.placebar.hidden = true;
                ui.buildbar.hidden = false;
            }
        }

        camera.dragHandler = {
            begin(wx, wy) {
                if (!placing || placing.paint) return false;
                const T = HK.TILE_SIZE, def = HK.BUILDINGS[placing.type];
                const tx = wx / T, ty = wy / T;
                // generous grab area: the footprint plus a tile of slack for thumbs
                if (tx < placing.x - 1 || ty < placing.y - 1.5 || tx > placing.x + def.w + 1 || ty > placing.y + def.h + 1) return false;
                placing.grab = { dx: tx - placing.x, dy: ty - placing.y };
                return true;
            },
            move(wx, wy) {
                if (!placing || !placing.grab) return;
                const T = HK.TILE_SIZE;
                const nx = Math.round(wx / T - placing.grab.dx), ny = Math.round(wy / T - placing.grab.dy);
                if (nx !== placing.x || ny !== placing.y) moveGhost(nx, ny);
            },
            end() { if (placing) placing.grab = null; }
        };

        $('place-ok').addEventListener('click', confirmPlacement);
        $('place-cancel').addEventListener('click', () => { if (targeting) endTargeting(); else cancelPlacement(); });

        // ---- god powers: radial menu -> target -> cast ----

        const powerBtns = {};
        HK.POWER_ORDER.forEach((id, k) => {
            const p = HK.POWERS[id];
            const b = document.createElement('button');
            b.type = 'button';
            b.className = `power-btn power-${id}`;
            b.style.setProperty('--i', k);
            b.title = `${p.name} (${p.cost} mana): ${p.info}`;
            b.innerHTML = `<span class="power-glyph">${POWER_GLYPH[id]}</span><span class="power-cost">${p.cost}</span><span class="power-cd"></span>`;
            b.setAttribute('aria-label', `${p.name}, ${p.cost} mana`);
            b.addEventListener('click', () => startTargeting(id));
            ui.powerRing.appendChild(b);
            powerBtns[id] = b;
        });

        function toggleRing(force) {
            const show = force !== undefined ? force : ui.powerRing.hidden;
            ui.powerRing.hidden = !show;
            ui.powerToggle.setAttribute('aria-expanded', String(show));
            if (show) { closePanels('powers'); hideCard(); refreshPowers(); }
        }
        ui.powerToggle.addEventListener('click', () => toggleRing());

        function refreshPowers() {
            if (!colony) return;
            const d = colony.divine;
            HK.POWER_ORDER.forEach(id => {
                const b = powerBtns[id];
                const cd = d.cooldown[id] / d.maxCd(id);
                b.style.setProperty('--cd', cd.toFixed(3));
                b.classList.toggle('poor', d.mana < HK.POWERS[id].cost);
                b.classList.toggle('active', !!targeting && targeting.id === id);
            });
            ui.powerToggle.classList.toggle('ready', d.mana >= 20);
        }

        function startTargeting(id) {
            cancelPlacement();
            toggleRing(false);
            closePanels();
            hideCard();
            targeting = { id };
            const p = HK.POWERS[id];
            ui.buildbar.hidden = true;
            ui.placebar.hidden = false;
            ui.placeOk.hidden = true;
            ui.placeName.textContent = `${POWER_GLYPH[id]} ${p.name}`;
            ui.placeCost.innerHTML = `<span class="cost-item"><img src="${renderer.iconURL('mana')}" alt="mana">${p.cost}</span>`;
            refreshTargeting();
            refreshPowers();
        }

        function refreshTargeting() {
            if (!targeting) return;
            const why = colony.divine.check(targeting.id);
            ui.placeHint.textContent = why || (REPEAT_POWERS.includes(targeting.id) ? 'Tap tiles to reshape the land' : 'Tap the map to cast');
            ui.placeHint.classList.toggle('bad', !!why);
        }

        function endTargeting() {
            targeting = null;
            renderer.reticle = null;
            ui.placeOk.hidden = false;
            if (!placing) {
                ui.placebar.hidden = true;
                ui.buildbar.hidden = false;
            }
            refreshPowers();
        }

        function aimAt(tx, ty) {
            if (!targeting) return;
            const d = colony.divine;
            renderer.reticle = { x: tx, y: ty, r: d.radius(targeting.id), ok: !d.check(targeting.id, tx, ty) };
        }

        function castAt(tx, ty) {
            const id = targeting.id;
            aimAt(tx, ty);
            const res = colony.divine.cast(id, tx, ty);
            if (!res.ok) { toast(res.msg, 'warn', 1600); return; }
            if (res.msg) toast(res.msg, id === 'lightning' ? 'power' : 'good', 1800);
            if (!REPEAT_POWERS.includes(id)) endTargeting();
            else aimAt(tx, ty);
        }

        canvas.addEventListener('pointermove', e => {
            if (!targeting || e.pointerType !== 'mouse') return;
            const p = camera.local(e), w = camera.screenToWorld(p.x, p.y), T = HK.TILE_SIZE;
            aimAt(Math.floor(w.x / T), Math.floor(w.y / T));
        });

        // ---- info card ----

        function bar(label, value, cls) {
            const pct = Math.max(0, Math.min(100, Math.round(value)));
            return `<div class="bar-row"><span>${label}</span><span class="bar ${cls || ''}"><i style="width:${pct}%"></i></span></div>`;
        }

        function showCard() {
            ui.card.hidden = false;
            closePanels();
            refreshCard();
        }

        function refreshCard() {
            if (!selection || ui.card.hidden) return;
            let title = '', body = '', bars = '', action = '';
            if (selection.kind === 'villager') {
                const v = selection.v;
                if (v.dead || !colony.villagers.includes(v)) { hideCard(); return; }
                const trait = v.trait ? HK.TRAITS[v.trait] : null;
                title = trait ? `${v.name} · ${trait.name}` : v.name;
                const lines = [colony.villagerActivity(v)];
                if (trait) lines.push(trait.info);
                if (v.carryN) lines.push(`Carrying ${v.carryN} ${v.carry}`);
                if (v.tool) lines.push('Has tools: works 25% faster');
                if (v.sick) lines.push('Sick with plague');
                if (v.hunger <= 0) lines.push('Starving: slow and weak');
                lines.push(v.home ? `Sleeps at the ${v.home.def.name.toLowerCase()}` : 'No bed');
                body = lines.join('\n');
                bars = bar('Health', v.hp / v.maxHp * 100, v.hp < v.maxHp * 0.4 ? 'warn' : 'good')
                    + bar('Hunger', v.hunger, v.hunger < HK.BAL.HUNGRY ? 'warn' : 'good')
                    + bar('Rest', v.rest, v.rest < 20 ? 'warn' : 'rest')
                    + bar('Mood', v.mood, v.mood < 30 ? 'warn' : 'mood');
            } else if (selection.kind === 'monster') {
                const m = selection.m;
                if (m.dead) { hideCard(); return; }
                title = m.def.name;
                const doing = m.def.flying ? 'Drifting over the village, spreading corruption. If it survives until dawn it takes root.'
                    : m.atk ? `Smashing ${m.atk.b ? `the ${m.atk.b.def.name.toLowerCase()}` : 'a cliff'}`
                        : 'Heading for the keep';
                body = [doing, m.def.boss ? 'A boss. Lightning and bastions are your best answer.' : ''].filter(Boolean).join('\n');
                bars = bar('Health', m.hp / m.maxHp * 100, 'warn');
            } else if (selection.kind === 'building') {
                const b = selection.b;
                if (b.removed) { hideCard(); return; }
                if (b.complete) {
                    title = b.def.name;
                    const lines = [b.def.info];
                    if (b.burning) lines.push('ON FIRE! Villagers douse fires near a Well.');
                    if (b.def.beds) {
                        const n = colony.villagers.filter(v => v.home === b).length;
                        lines.push(`${n} of ${b.def.beds} beds taken`);
                    }
                    if (b.def.stores.length === HK.RES.length) {
                        lines.push(`Stores: ${HK.RES.filter(r => colony.stock[r]).map(r => `${colony.stock[r]} ${r}`).join(' · ') || 'empty'}`);
                    }
                    if (b.def.craft) {
                        const w = colony.villagers.find(v => v.id === b.worker);
                        const c = b.def.craft;
                        const ins = Object.keys(c.in).map(r => `${c.in[r]} ${r}`).join(' + ');
                        const outs = Object.keys(c.out).map(r => `${c.out[r]} ${r}`).join(' + ');
                        lines.push(ins ? `${ins} → ${outs}` : `→ ${outs}`);
                        lines.push(w ? `${w.name} is ${c.verb.toLowerCase()}` : colony.priorities.craft ? (colony.canCraft(b) ? 'Waiting for a worker' : 'Missing inputs (or the store is full)') : 'Crafting priority is Off');
                    }
                    if (b.type === 'farm') {
                        let ripe = 0;
                        for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) if (colony.amount[world.map.idx(x, y)]) ripe++;
                        lines.push(`${ripe} of ${b.w * b.h} plots ripe`);
                    }
                    body = lines.join('\n');
                    bars = bar('Health', b.hp / b.maxHp * 100, b.hp < b.maxHp * 0.3 ? 'warn' : 'good');
                } else {
                    title = `${b.def.name} (planned)`;
                    const missing = HK.RES.filter(r => (b.def.cost[r] || 0) > b.delivered[r])
                        .map(r => `${(b.def.cost[r] || 0) - b.delivered[r]} ${r}`);
                    const lines = [];
                    if (missing.length) lines.push(`Waiting for ${missing.join(', ')}`);
                    if (b.builders) lines.push(`${b.builders} builder${b.builders > 1 ? 's' : ''} at work`);
                    else if (!missing.length || b.progress < colony.buildCap(b)) lines.push('Waiting for a builder');
                    if (colony.priorities.build === 0) lines.push('Building priority is Off');
                    body = lines.join('\n');
                    bars = bar('Materials', colony.deliveredFrac(b) * 100, 'mat') + bar('Built', b.progress / b.def.work * 100, 'good');
                    action = 'Cancel and refund';
                }
            } else {
                const info = world.describeTile(selection.x, selection.y);
                title = `${info.name}  (${info.x}, ${info.y})`;
                body = [info.info, info.resource,
                    `Height ${info.height.toFixed(2)} · ${info.walkable ? 'walkable' : 'blocked'} · villagers here: ${info.villagers}`]
                    .filter(Boolean).join('\n');
            }
            if (ui.cardTitle.textContent !== title) ui.cardTitle.textContent = title;
            if (ui.cardBody.textContent !== body) ui.cardBody.textContent = body;
            if (ui.cardBars.innerHTML !== bars) ui.cardBars.innerHTML = bars;
            ui.cardAction.hidden = !action;
            ui.cardAction.textContent = action;
        }

        ui.cardAction.addEventListener('click', () => {
            if (selection && selection.kind === 'building' && colony.cancel(selection.b)) {
                toast(`${selection.b.def.name} cancelled. Materials returned.`);
                hideCard();
            }
        });

        function hideCard() {
            ui.card.hidden = true;
            selection = null;
            renderer.selected = null;
            renderer.selectedVillager = null;
            renderer.selectedBuilding = null;
        }

        // ---- top bar ----

        let lastHud = {};
        function refreshHud() {
            const d = colony.divine, war = colony.war;
            const vals = {
                wood: colony.stock.wood, stone: colony.stock.stone, food: colony.stock.food, gold: colony.stock.gold,
                mana: Math.floor(d.mana), pop: `${colony.villagers.length}/${colony.popCap()}`
            };
            GOODS.forEach(g => { vals[g] = colony.stock[g]; });
            for (const k of Object.keys(vals)) {
                if (lastHud[k] === vals[k]) continue;
                const up = typeof vals[k] === 'number' && typeof lastHud[k] === 'number' ? vals[k] > lastHud[k] : null;
                ui.res[k].textContent = vals[k];
                if (GOODS.includes(k)) ui.chips[k].hidden = !vals[k];
                if (up !== null && k !== 'mana') {
                    const chip = ui.chips[k];
                    chip.classList.remove('up', 'down');
                    void chip.offsetWidth; // restart the flash
                    chip.classList.add(up ? 'up' : 'down');
                }
                lastHud[k] = vals[k];
            }
            ui.manaFill.style.width = `${Math.round(d.mana / d.maxMana() * 100)}%`;
            ui.chips.food.classList.toggle('low', colony.stock.food < colony.villagers.length);
            const tod = colony.timeOfDay();
            const night = colony.isNight();
            const n = night && tod < HK.DAY.DAWN ? colony.day() - 1 : colony.day();
            const label = `${night ? 'Night' : 'Day'} ${n} · ${clockTime(tod)}`;
            if (ui.dayLabel.textContent !== label) ui.dayLabel.textContent = label;
            let sub = '';
            if (war) {
                if (war.portals.length || war.monsters.length) sub = `${war.remaining()} monster${war.remaining() === 1 ? '' : 's'} left${war.bloodMoon ? ' · blood moon' : ''}`;
                else if (war.omen && !night) sub = `Omen: ${war.omen.label}${war.boss ? ' · BOSS' : ''}${war.bloodMoon ? ' · blood moon' : ''}`;
            }
            if (ui.daySub.textContent !== sub) ui.daySub.textContent = sub;
            ui.daySub.classList.toggle('danger', !!(war && (war.boss || war.bloodMoon || war.monsters.length)));
            ui.dayIcon.classList.toggle('moon', colony.darkness() > 0.5);
            ui.dayIcon.classList.toggle('blood', !!(war && war.bloodMoon));
            const caravan = !!(colony.story && colony.story.caravan);
            if (ui.caravanBtn.hidden === caravan) ui.caravanBtn.hidden = !caravan;
            refreshPowers();
            refreshTargeting();
        }

        // dawn 05:00-06:00, day 06:00-19:00, dusk 19:00-20:00, night 20:00-05:00
        function clockTime(t) {
            const D = HK.DAY;
            let h;
            if (t < D.DAWN) h = 5 + t / D.DAWN;
            else if (t < D.DUSK) h = 6 + 13 * (t - D.DAWN) / (D.DUSK - D.DAWN);
            else if (t < D.NIGHT) h = 19 + (t - D.DUSK) / (D.NIGHT - D.DUSK);
            else h = 20 + 9 * (t - D.NIGHT) / (D.LENGTH - D.NIGHT);
            h %= 24;
            const hh = Math.floor(h), mm = Math.floor((h - hh) * 6) * 10;
            return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        }

        // ---- toasts ----

        function toast(text, kind, ms) {
            const el = document.createElement('div');
            el.className = `toast ${kind || ''}`;
            el.textContent = text;
            ui.toasts.appendChild(el);
            while (ui.toasts.children.length > 3) ui.toasts.firstChild.remove();
            setTimeout(() => el.classList.add('out'), ms || TOAST_MS);
            setTimeout(() => el.remove(), (ms || TOAST_MS) + 400);
        }

        function handleEvents(now) {
            const events = colony.events;
            if (!events.length) return;
            let logDirty = false;
            for (const ev of events) {
                renderer.onEvent(ev, now);
                switch (ev.type) {
                    case 'built':
                        toast(ev.b.def.beds && ev.b.type !== 'keep'
                            ? `${ev.b.def.name} built! Room for ${colony.popCap()} villagers.`
                            : `${ev.b.def.name} built!`, 'good');
                        break;
                    case 'arrived':
                        toast(`${ev.villagers.map(v => v.name).join(' and ')} ${ev.villagers.length > 1 ? 'have' : 'has'} joined the village.`, 'good');
                        break;
                    case 'day': toast(`Day ${ev.day}`, 'day', 2400); break;
                    case 'omen':
                        if (colony.ticks > 5) toast(ev.boss ? `The omen points ${ev.omen.label}. A Siege Golem comes tonight!` : `Tonight's omen points ${ev.omen.label}.`, ev.boss ? 'warn' : 'night', 5000);
                        break;
                    case 'dusk': toast('Dusk. Villagers head home, and the portals are about to open.', 'night'); break;
                    case 'portals': toast(`${ev.portals.length > 1 ? `${ev.portals.length} portals open` : 'A portal opens'}! ${ev.count} monsters are coming.`, 'warn', 4500); break;
                    case 'nightEnd': toast(`Dawn. Night ${ev.night} survived: ${ev.kills} slain, keep at ${ev.keepPct}%.`, 'good', 5000); break;
                    case 'death': toast(ev.text, 'bad', 5000); break;
                    case 'destroyed': toast(`The ${ev.b.def.name.toLowerCase()} was destroyed!`, 'bad'); break;
                    case 'fire': toast(`Fire! The ${ev.b.def.name.toLowerCase()} is burning.${colony.buildings.some(b => b.type === 'well' && b.complete) ? '' : ' A Well lets villagers put fires out.'}`, 'warn'); break;
                    case 'story': toast(ev.text, ev.tone === 'bad' ? 'warn' : 'good', 6000); break;
                    case 'caravanLeft': toast('The caravan rolls away.', 'hint'); toggleTrade(false); break;
                    case 'hungry': toast('Food is running low. Raise Food in Jobs, or build a Farm.', 'warn', 5000); break;
                    case 'nohousing': toast('No free beds, so no newcomers today. Build a House.', 'warn', 5000); break;
                    case 'nofood': toast('Not enough food stored for newcomers today.', 'warn', 5000); break;
                    case 'gameover': showGameOver(ev.reason); break;
                    case 'log': logDirty = true; break;
                    default:
                }
            }
            events.length = 0;
            if (logDirty) refreshLog();
            if (selection) refreshCard();
        }

        function showGameOver(reason) {
            clock.setSpeed(0);
            endTargeting();
            cancelPlacement();
            const war = colony.war, over = colony.over;
            ui.overTitle.textContent = 'Hollowkeep has fallen';
            const lines = [
                reason,
                `You held out until ${over.night ? 'night' : 'day'} ${over.night && colony.timeOfDay() < HK.DAY.DAWN ? over.day - 1 : over.day}.`,
                `${war ? war.stats.kills : 0} monsters slain · ${colony.stats.deaths} villagers lost · ${colony.stats.built} buildings raised`,
                `${colony.divine.tech.size} of 15 techs learned · ${colony.divine.casts} powers cast`
            ];
            ui.overBody.textContent = lines.join('\n');
            ui.over.hidden = false;
        }
        $('new-run').addEventListener('click', () => newWorld(Math.random() * 2 ** 32));
        $('over-log').addEventListener('click', () => { ui.over.hidden = true; toggleLog(true); });

        // ---- speed, debug, keys ----

        function syncSpeedButtons(speed) {
            ui.speeds.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === speed)));
        }

        function toggleDebug() { ui.debug.hidden = !ui.debug.hidden; }

        ui.speeds.forEach(b => b.addEventListener('click', () => { if (!colony.over) clock.setSpeed(Number(b.dataset.speed)); }));
        clock.onSpeedChange = syncSpeedButtons;
        syncSpeedButtons(clock.speed);
        $('debug-toggle').addEventListener('click', toggleDebug);
        $('log-btn').addEventListener('click', () => toggleLog());
        $('log-close').addEventListener('click', () => toggleLog(false));
        $('tech-close').addEventListener('click', () => toggleTech(false));
        $('tile-close').addEventListener('click', hideCard);
        $('agents-minus').addEventListener('click', () => { agentCount = clampAgents(world.wanderers.count - 100); world.wanderers.setCount(agentCount); });
        $('agents-plus').addEventListener('click', () => { agentCount = clampAgents(world.wanderers.count + 100); world.wanderers.setCount(agentCount); });
        $('new-map').addEventListener('click', () => newWorld(Math.random() * 2 ** 32));

        document.addEventListener('keydown', e => {
            if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
            const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            if (POWER_KEYS[key]) { startTargeting(POWER_KEYS[key]); e.preventDefault(); return; }
            switch (key) {
                case ' ': if (!colony.over) clock.togglePause(); break;
                case '1': case '2': case '3': if (!colony.over) clock.setSpeed(Number(key)); break;
                case '.': clock.step(); break;
                case 'd': case 'F3': toggleDebug(); break;
                case 'l': toggleLog(); break;
                case 'Enter': if (!placing) return; confirmPlacement(); break;
                case 'Escape':
                    if (targeting) endTargeting();
                    else if (placing) cancelPlacement();
                    else if (!ui.card.hidden) hideCard();
                    else closePanels();
                    break;
                default: return;
            }
            e.preventDefault();
        });

        // ---- camera events ----

        camera.onTap = (wx, wy) => {
            const T = HK.TILE_SIZE;
            const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
            if (targeting) { if (world.map.inBounds(tx, ty)) castAt(tx, ty); return; }
            if (placing) {
                if (placing.paint) { if (world.map.inBounds(tx, ty)) paintTap(tx, ty); return; }
                const def = HK.BUILDINGS[placing.type];
                const onGhost = tx >= placing.x && ty >= placing.y && tx < placing.x + def.w && ty < placing.y + def.h;
                if (!onGhost) moveGhost(Math.round(wx / T - def.w / 2), Math.round(wy / T - def.h / 2));
                return;
            }
            closePanels();
            if (!world.map.inBounds(tx, ty)) { hideCard(); return; }
            hideCard();
            const m = renderer.monsterAt(colony, wx, wy, clock.alpha);
            const v = m ? null : renderer.villagerAt(colony, wx, wy, clock.alpha);
            if (m) {
                selection = { kind: 'monster', m };
            } else if (v) {
                selection = { kind: 'villager', v };
                renderer.selectedVillager = v;
            } else {
                // tall sprites: a tap just above a building counts as the building
                const b = colony.buildingAt(tx, ty) || colony.buildingAt(tx, ty + 1);
                if (b) {
                    selection = { kind: 'building', b };
                    renderer.selectedBuilding = b;
                } else {
                    selection = { kind: 'tile', x: tx, y: ty };
                    renderer.selected = { x: tx, y: ty };
                }
            }
            showCard();
        };
        camera.onLevelChange = level => { renderer.gridStrength = GRID_BY_LEVEL[level]; };
        renderer.gridStrength = GRID_BY_LEVEL[camera.level];

        function onResize() {
            renderer.resize();
            camera.clamp();
        }
        window.addEventListener('resize', onResize);
        onResize();

        // console handle for poking at a running game
        HK.debug = {
            get world() { return world; }, get colony() { return colony; }, clock, camera, renderer,
            skipTo(t) { const c = colony; while (c.timeOfDay() !== t && !c.over) world.tick(); },
            mana(n) { colony.divine.mana = n; }, gold(n) { colony.stock.gold = n; }
        };

        const seedParam = parseInt(params.get('seed'), 10);
        newWorld(Number.isFinite(seedParam) ? seedParam : Math.random() * 2 ** 32);

        // ---- main loop ----

        let frames = 0, fpsWindowStart = lastNow, fps = 0, statsAt = 0, hudAt = 0, cardAt = 0;

        function frame(now) {
            const dt = Math.min((now - lastNow) / 1000, 0.25);
            lastNow = now;
            clock.update(dt, now);
            camera.update(dt, now);
            handleEvents(now);
            renderer.draw(camera, clock.alpha, now);

            frames++;
            if (now - fpsWindowStart >= 1000) {
                fps = Math.round(frames * 1000 / (now - fpsWindowStart));
                frames = 0;
                fpsWindowStart = now;
            }
            if (now - hudAt >= HUD_INTERVAL_MS) { hudAt = now; refreshHud(); }
            if (now - cardAt >= 250) { cardAt = now; refreshCard(); refreshJobs(); refreshTech(); refreshTrade(); }
            if (!ui.debug.hidden && now - statsAt >= STATS_INTERVAL_MS) {
                statsAt = now;
                ui.fps.textContent = `FPS ${fps}`;
                ui.fps.style.color = fps >= 55 ? 'var(--good)' : fps >= 30 ? 'var(--warn)' : 'var(--bad)';
                const wf = colony.workforce();
                ui.stats.textContent = [
                    `frame   ${(1000 / Math.max(fps, 1)).toFixed(2)} ms`,
                    `tick    ${clock.tickMsAvg.toFixed(3)} ms avg  ${clock.tickMsPeak.toFixed(3)} peak`,
                    `ticks/s ${clock.ticksPerSecond}  (${clock.speed}x) · #${world.tickCount}`,
                    `entities ${world.entityCount()} (${colony.villagers.length} villagers, ${colony.war ? colony.war.monsters.length : 0} monsters)`,
                    `jobs    build ${wf.build} wood ${wf.wood} stone ${wf.stone} food ${wf.food} ore ${wf.ore} craft ${wf.craft}`,
                    `        idle ${wf.idle} resting ${wf.rest} defending ${wf.defend}`,
                    `blight  ${colony.blight ? colony.blight.count : 0} tiles, ${colony.blight ? colony.blight.nodes.length : 0} nodes`,
                    `canvas  ${canvas.width}x${canvas.height} @${renderer.dpr}x`,
                    `zoom    ${camera.level + 1}/3 · seed ${world.seed}`
                ].join('\n');
            }
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);

        if ('serviceWorker' in navigator && location.protocol !== 'file:') {
            navigator.serviceWorker.register('./sw.js').catch(() => {});
        }
    });
})(globalThis.HK = globalThis.HK || {});
