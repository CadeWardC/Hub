/* ============================================================
   app.js — dashboard, game launcher, daily session, settings
   Boots after all games have registered.
   ============================================================ */
(function () {
  'use strict';
  const ui = BRAIN.ui, store = BRAIN.store, engine = BRAIN.engine;
  const el = ui.el;

  const root = document.getElementById('app');
  const headerSlot = document.getElementById('header-stats');

  let currentTab = 'train'; // 'train' | 'earnings'

  // ---- app shell (tab bar + active view) ----------------------
  function renderApp() {
    renderHeader();
    ui.clear(root);
    const nav = el('nav', { class: 'tabbar' }, [
      tabBtn('train', '🏋️ Train'),
      tabBtn('earnings', '💵 Earnings')
    ]);
    const view = el('div', { class: 'tab-view' });
    root.appendChild(nav);
    root.appendChild(view);
    if (currentTab === 'earnings') renderEarnings(view);
    else renderTrain(view);
  }

  function tabBtn(id, label) {
    return el('button', {
      class: 'tabbar-btn' + (currentTab === id ? ' active' : ''),
      text: label,
      onclick: function () { if (currentTab !== id) { currentTab = id; renderApp(); } }
    });
  }

  // ---- small SVG ring gauge ----------------------------------
  function ring(percent, color, size, label) {
    const ns = 'http://www.w3.org/2000/svg';
    const r = 20, c = 2 * Math.PI * r;
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 48 48');
    svg.setAttribute('class', 'ring');
    svg.style.width = svg.style.height = (size || 48) + 'px';
    const bg = document.createElementNS(ns, 'circle');
    bg.setAttribute('cx', 24); bg.setAttribute('cy', 24); bg.setAttribute('r', r);
    bg.setAttribute('class', 'ring-bg');
    const fg = document.createElementNS(ns, 'circle');
    fg.setAttribute('cx', 24); fg.setAttribute('cy', 24); fg.setAttribute('r', r);
    fg.setAttribute('class', 'ring-fg');
    fg.setAttribute('stroke', color);
    fg.setAttribute('stroke-dasharray', c);
    fg.setAttribute('stroke-dashoffset', c * (1 - Math.max(0, Math.min(100, percent)) / 100));
    fg.setAttribute('transform', 'rotate(-90 24 24)');
    const txt = document.createElementNS(ns, 'text');
    txt.setAttribute('x', 24); txt.setAttribute('y', 28);
    txt.setAttribute('text-anchor', 'middle'); txt.setAttribute('class', 'ring-txt');
    txt.textContent = label != null ? label : percent;
    svg.appendChild(bg); svg.appendChild(fg); svg.appendChild(txt);
    return svg;
  }

  // ---- header --------------------------------------------------
  function renderHeader() {
    ui.clear(headerSlot);
    const overall = engine.overallIndex();
    const streak = store.streak;
    const wrap = el('div', { class: 'hstats' }, [
      el('button', { class: 'hstat wallet-pill', title: 'View earnings',
        onclick: function () { currentTab = 'earnings'; renderApp(); } }, [
        el('div', { class: 'hstat-big wallet-amt', text: engine.formatMoney(store.walletCents()) }),
        el('span', { class: 'hstat-label', text: 'Earned' })
      ]),
      el('div', { class: 'hstat' }, [
        ring(overall, '#8b7cf6', 44, overall || '–'),
        el('span', { class: 'hstat-label', text: 'Brain Index' })
      ]),
      el('div', { class: 'hstat' }, [
        el('div', { class: 'hstat-big', text: '🔥 ' + streak }),
        el('span', { class: 'hstat-label', text: 'Day streak' })
      ]),
      el('button', { class: 'icon-btn', title: 'Settings', text: '⚙', onclick: openSettings })
    ]);
    headerSlot.appendChild(wrap);
  }

  // ---- dashboard ----------------------------------------------
  function gameCard(game, opts) {
    opts = opts || {};
    const dom = engine.DOMAINS[game.domain];
    const level = store.getLevel(game.id);
    const last = store.lastResult(game.id);
    const best = store.getBest(game.id);
    const card = el('div', { class: 'game-card' });
    card.style.setProperty('--accent', dom.color);
    const head = el('div', { class: 'gc-head' }, [
      el('span', { class: 'gc-icon', text: game.icon }),
      el('div', {}, [
        el('h4', { class: 'gc-name', text: game.name }),
        el('span', { class: 'gc-domain', text: dom.name })
      ]),
      el('span', { class: 'gc-level', text: 'Lv ' + level })
    ]);
    const blurb = el('p', { class: 'gc-blurb', text: game.blurb });
    const stats = el('div', { class: 'gc-stats' }, [
      el('span', { text: best ? 'Best ' + best : 'Not played' }),
      last ? el('span', { text: last.accuracy != null ? Math.round(last.accuracy * 100) + '% last' : '' }) : null
    ]);
    const actions = el('div', { class: 'gc-actions' }, [
      el('button', { class: 'g-btn ghost small', text: 'Science', onclick: function (e) { e.stopPropagation(); openScience(game); } }),
      el('button', { class: 'g-btn small', text: 'Play', onclick: function (e) { e.stopPropagation(); launchGame(game); } })
    ]);
    card.appendChild(head); card.appendChild(blurb); card.appendChild(stats); card.appendChild(actions);
    card.addEventListener('click', function () { launchGame(game); });
    return card;
  }

  function renderTrain(view) {
    // Daily training hero
    const trained = store.trainedToday();
    const hero = el('section', { class: 'daily-hero' }, [
      el('div', { class: 'daily-copy' }, [
        el('h2', { text: trained ? 'Nice — you trained today' : 'Daily Brain Workout' }),
        el('p', { text: 'A 5-game adaptive session balanced across every cognitive domain. ~6 minutes.' }),
        el('button', {
          class: 'g-btn large', text: trained ? 'Train again' : 'Start daily session',
          onclick: runDaily
        })
      ]),
      el('div', { class: 'daily-rings' }, engine.domainList().map(function (d) {
        return el('div', { class: 'mini-ring' }, [
          ring(engine.domainIndex(d.id), d.color, 56, engine.domainIndex(d.id) || '–'),
          el('span', { class: 'mini-ring-label', text: d.name })
        ]);
      }))
    ]);
    view.appendChild(hero);

    // Domain sections
    engine.domainList().forEach(function (d) {
      const section = el('section', { class: 'domain-section' });
      section.appendChild(el('div', { class: 'domain-head' }, [
        el('span', { class: 'domain-icon', style: { color: d.color }, text: d.icon }),
        el('h3', { text: d.name }),
        el('span', { class: 'domain-index', text: 'Index ' + (engine.domainIndex(d.id) || '–') })
      ]));
      const grid = el('div', { class: 'game-grid' });
      engine.gamesIn(d.id).forEach(function (g) { grid.appendChild(gameCard(g)); });
      section.appendChild(grid);
      view.appendChild(section);
    });

    // Footer note
    view.appendChild(el('p', { class: 'science-note',
      html: 'Every game implements a validated cognitive paradigm with adaptive difficulty. ' +
            'Training improves performance on trained tasks; transfer to everyday cognition is debated — ' +
            'treat this as engaging practice, not a medical intervention.' }));
  }

  // ---- earnings tab -------------------------------------------
  function renderEarnings(view) {
    const totalEl = el('div', { class: 'wallet-amount', text: engine.formatMoney(store.walletCents()) });
    const syncBadge = el('span', { class: 'earn-sync',
      text: BRAIN.cloud.configured ? 'Syncing…' : 'Local only' });

    const hero = el('section', { class: 'wallet-hero' }, [
      totalEl,
      el('span', { class: 'wallet-label', text: 'Total earned' }),
      el('p', { class: 'wallet-note',
        text: 'You’re compensated as a paid research participant: a small micro-payment for each completed task, scaled by accuracy and difficulty (≈ $5–9/hour equivalent). Payouts sync to your account.' })
    ]);
    view.appendChild(hero);

    const statsRow = el('div', { class: 'earn-stats' });
    view.appendChild(statsRow);

    const head = el('div', { class: 'earn-head' }, [ el('h3', { text: 'Payout history' }), syncBadge ]);
    view.appendChild(head);
    const listWrap = el('div', { class: 'earn-list' });
    view.appendChild(listWrap);

    function paint() {
      totalEl.textContent = engine.formatMoney(store.walletCents());
      renderEarnStats(statsRow);
      renderEarnList(listWrap);
    }
    paint();

    // Reconcile with Supabase, then repaint with authoritative data.
    if (BRAIN.cloud.configured) {
      reconcileEarnings().then(function (ok) {
        syncBadge.textContent = ok ? 'Synced ✓' : 'Offline — saved locally';
        syncBadge.classList.toggle('ok', ok);
        paint();
      });
    } else {
      syncBadge.textContent = 'Local only (Supabase not configured)';
    }
  }

  function renderEarnStats(row) {
    ui.clear(row);
    const all = store.getEarnings();
    const today = store.dayKey();
    const todayCents = all.filter(function (e) {
      return store.dayKey(new Date(e.date_created)) === today;
    }).reduce(function (n, e) { return n + (e.payout_cents || 0); }, 0);
    const avg = all.length ? Math.round(store.walletCents() / all.length) : 0;
    [
      ['Today', engine.formatMoney(todayCents)],
      ['Tasks paid', String(all.length)],
      ['Avg / task', engine.formatMoney(avg)]
    ].forEach(function (s) {
      row.appendChild(el('div', { class: 'earn-stat' }, [
        el('span', { class: 'earn-stat-val', text: s[1] }),
        el('span', { class: 'earn-stat-label', text: s[0] })
      ]));
    });
  }

  function renderEarnList(wrap) {
    ui.clear(wrap);
    const list = store.getEarnings();
    if (!list.length) {
      wrap.appendChild(el('p', { class: 'earn-empty', text: 'No payouts yet — finish a game to get paid.' }));
      return;
    }
    list.slice(0, 100).forEach(function (e) {
      const dom = engine.DOMAINS[e.domain];
      const card = el('div', { class: 'earn-row' });
      if (dom) card.style.setProperty('--accent', dom.color);
      card.appendChild(el('span', { class: 'earn-row-icon', text: (engine.byId[e.game_id] && engine.byId[e.game_id].icon) || '🎮' }));
      card.appendChild(el('div', { class: 'earn-row-main' }, [
        el('span', { class: 'earn-row-name', text: e.game_name || e.game_id }),
        el('span', { class: 'earn-row-sub', text: timeAgo(e.date_created) +
          (e.accuracy != null ? ' · ' + Math.round(e.accuracy * 100) + '%' : '') +
          ' · Lv ' + (e.level || 1) })
      ]));
      card.appendChild(el('span', { class: 'earn-row-pay', text: '+' + engine.formatMoney(e.payout_cents) }));
      wrap.appendChild(card);
    });
  }

  function timeAgo(iso) {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }

  // Push any unsynced local earnings, then pull the server list as truth.
  async function reconcileEarnings() {
    if (!BRAIN.cloud.configured) return false;
    const pending = store.unsynced();
    for (let i = 0; i < pending.length; i++) {
      const res = await BRAIN.cloud.insertEarning(pending[i]);
      if (res && res.data) store.markSynced(pending[i].cid, res.data.id);
      else if (res && res.status === 409) store.markSynced(pending[i].cid, null); // dup cid
      else return false; // network/server issue — stop, stay local
    }
    const fetched = await BRAIN.cloud.fetchEarnings(200);
    if (fetched && fetched.data) { store.replaceEarnings(fetched.data); return true; }
    return false;
  }

  // Award payment for a completed game; record locally + push to Supabase.
  async function awardEarning(game, result) {
    const cents = engine.payoutCents(game, result);
    const entry = store.addEarning({
      game_id: game.id, game_name: game.name, domain: game.domain,
      score: result.score, accuracy: result.accuracy != null ? result.accuracy : null,
      level: store.getLevel(game.id), payout_cents: cents
    });
    if (BRAIN.cloud.configured) {
      const res = await BRAIN.cloud.insertEarning(entry);
      if (res && res.data) store.markSynced(entry.cid, res.data.id);
      else if (res && res.status === 409) store.markSynced(entry.cid, null);
    }
    return cents;
  }

  // ---- overlay plumbing ---------------------------------------
  function openOverlay() {
    const overlay = el('div', { class: 'overlay' });
    const panel = el('div', { class: 'overlay-panel' });
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('show'); });
    return {
      panel: panel,
      close: function () {
        overlay.classList.remove('show');
        setTimeout(function () { overlay.remove(); }, 250);
      }
    };
  }

  // ---- science modal ------------------------------------------
  function openScience(game) {
    const o = openOverlay();
    o.panel.classList.add('narrow');
    o.panel.appendChild(scienceBlock(game, true));
    o.panel.appendChild(el('button', { class: 'g-btn', text: 'Close', onclick: o.close }));
  }

  function scienceBlock(game, full) {
    return el('div', { class: 'science' }, [
      el('div', { class: 'science-head' }, [
        el('span', { class: 'gc-icon', text: game.icon }),
        el('h3', { text: game.name })
      ]),
      el('p', { class: 'sci-what', text: game.science.what }),
      full ? el('p', { class: 'sci-why', html: '<strong>Why it helps:</strong> ' + game.science.why }) : null,
      el('p', { class: 'sci-cite', text: game.science.citation })
    ]);
  }

  // ---- game launcher ------------------------------------------
  // Returns a Promise that resolves to the result (or null if quit).
  function launchGame(game, session) {
    return new Promise(function (resolve) {
      const o = openOverlay();
      const level = store.getLevel(game.id);

      // Intro screen
      const intro = el('div', { class: 'g-intro' }, [
        session ? el('div', { class: 'session-pill', text: 'Daily session · ' + (session.index + 1) + '/' + session.total }) : null,
        scienceBlock(game, true),
        el('div', { class: 'g-intro-meta' }, [
          el('span', { text: 'Starting level: ' + level }),
          el('span', { class: 'dom-chip', style: { '--accent': engine.DOMAINS[game.domain].color }, text: engine.DOMAINS[game.domain].name })
        ]),
        el('div', { class: 'g-intro-actions' }, [
          session ? null : el('button', { class: 'g-btn ghost', text: 'Back', onclick: function () { o.close(); resolve(null); } }),
          el('button', {
            class: 'g-btn large', text: 'Start', onclick: function () { startPlay(); }
          })
        ])
      ]);
      o.panel.appendChild(intro);

      async function startPlay() {
        ui.speech.warmUp();
        const host = el('div', { class: 'game-host' });
        ui.clear(o.panel); o.panel.appendChild(host);
        o.panel.classList.add('playing');
        let result;
        try {
          result = await game.play(host, { level: level });
        } catch (e) {
          console.error('[brain] game error', e);
          result = { score: 0, accuracy: 0, level: level, metric: { label: 'Error', value: '—' } };
        }
        o.panel.classList.remove('playing');
        // persist + adapt
        const newLevel = engine.adapt(game, result.accuracy != null ? result.accuracy : 0, level);
        store.setLevel(game.id, newLevel);
        const rec = store.recordResult(game.id, result);
        store.touchStreak();
        const earnedCents = await awardEarning(game, result);
        showResult(o, game, result, rec, newLevel - level, session, resolve, earnedCents);
      }
    });
  }

  function showResult(o, game, result, rec, levelDelta, session, resolve, earnedCents) {
    ui.clear(o.panel);
    o.panel.classList.add('narrow');
    const dom = engine.DOMAINS[game.domain];
    const acc = result.accuracy != null ? Math.round(result.accuracy * 100) : null;
    const card = el('div', { class: 'result' }, [
      el('div', { class: 'result-emoji', text: rec.isBest ? '🏆' : (acc != null && acc >= 80 ? '🎯' : '✓') }),
      el('h2', { text: rec.isBest ? 'New best!' : 'Session complete' }),
      earnedCents != null ? el('div', { class: 'payout-banner' }, [
        el('span', { class: 'payout-amt', text: '+' + engine.formatMoney(earnedCents) }),
        el('span', { class: 'payout-sub', text: 'paid · ' + engine.formatMoney(store.walletCents()) + ' total' })
      ]) : null,
      el('div', { class: 'result-metrics' }, [
        metricBox(result.metric ? result.metric.label : 'Score', result.metric ? result.metric.value : result.score),
        metricBox('Score', String(result.score)),
        metricBox('Level', (levelDelta > 0 ? '▲ ' : levelDelta < 0 ? '▼ ' : '') + store.getLevel(game.id))
      ]),
      result.detail ? el('p', { class: 'result-detail', text: result.detail }) : null,
      levelDelta > 0 ? el('p', { class: 'level-up', text: 'Leveled up to ' + store.getLevel(game.id) + ' — nice work.' }) :
        levelDelta < 0 ? el('p', { class: 'level-down', text: 'Eased to level ' + store.getLevel(game.id) + ' to keep it learnable.' }) : null
    ]);
    card.style.setProperty('--accent', dom.color);
    o.panel.appendChild(card);

    const actions = el('div', { class: 'g-intro-actions' });
    if (session) {
      actions.appendChild(el('button', {
        class: 'g-btn large', text: session.index + 1 < session.total ? 'Next game →' : 'Finish session',
        onclick: function () { o.close(); resolve(result); }
      }));
    } else {
      actions.appendChild(el('button', { class: 'g-btn ghost', text: 'Done', onclick: function () { o.close(); resolve(result); renderApp(); } }));
      actions.appendChild(el('button', { class: 'g-btn large', text: 'Play again', onclick: function () { o.close(); resolve(result); launchGame(game); } }));
    }
    o.panel.appendChild(actions);
  }

  function metricBox(label, value) {
    return el('div', { class: 'metric-box' }, [
      el('span', { class: 'metric-value', text: String(value) }),
      el('span', { class: 'metric-label', text: label })
    ]);
  }

  // ---- daily adaptive session ---------------------------------
  async function runDaily() {
    const lineup = engine.pickDailySession(5);
    const results = [];
    for (let i = 0; i < lineup.length; i++) {
      const res = await launchGame(lineup[i], { index: i, total: lineup.length });
      if (res) results.push({ game: lineup[i], res: res });
    }
    store.recordSession({ games: lineup.map(function (g) { return g.id; }) });
    showSessionSummary(lineup, results);
  }

  function showSessionSummary(lineup, results) {
    const o = openOverlay();
    o.panel.classList.add('narrow');
    const avgAcc = results.length
      ? Math.round(results.reduce(function (a, r) { return a + (r.res.accuracy || 0); }, 0) / results.length * 100)
      : 0;
    const sessionCents = results.reduce(function (a, r) { return a + engine.payoutCents(r.game, r.res); }, 0);
    o.panel.appendChild(el('div', { class: 'result' }, [
      el('div', { class: 'result-emoji', text: '🧠' }),
      el('h2', { text: 'Daily session done' }),
      el('div', { class: 'payout-banner' }, [
        el('span', { class: 'payout-amt', text: '+' + engine.formatMoney(sessionCents) }),
        el('span', { class: 'payout-sub', text: 'earned · ' + engine.formatMoney(store.walletCents()) + ' total' })
      ]),
      el('p', { class: 'result-detail', text: results.length + ' games · ' + avgAcc + '% average accuracy · streak ' + store.streak }),
      el('div', { class: 'summary-list' }, lineup.map(function (g) {
        const r = results.find(function (x) { return x.game.id === g.id; });
        return el('div', { class: 'summary-row' }, [
          el('span', { class: 'gc-icon', text: g.icon }),
          el('span', { class: 'summary-name', text: g.name }),
          el('span', { class: 'summary-score', text: r ? r.res.score + ' pts' : '—' })
        ]);
      }))
    ]));
    o.panel.appendChild(el('button', { class: 'g-btn large', text: 'Back to dashboard', onclick: function () { o.close(); renderApp(); } }));
  }

  // ---- settings ------------------------------------------------
  function openSettings() {
    const o = openOverlay();
    o.panel.classList.add('narrow');
    function toggle(key, label, desc) {
      const on = store.settings[key];
      const row = el('label', { class: 'setting-row' }, [
        el('div', {}, [el('strong', { text: label }), el('span', { class: 'setting-desc', text: desc })]),
        el('button', { class: 'switch' + (on ? ' on' : ''), 'data-k': key, text: on ? 'On' : 'Off' })
      ]);
      row.querySelector('.switch').addEventListener('click', function (e) {
        e.preventDefault();
        const next = !store.settings[key];
        const patch = {}; patch[key] = next; store.saveSettings(patch);
        this.classList.toggle('on', next); this.textContent = next ? 'On' : 'Off';
        if (key === 'reducedMotion') document.body.classList.toggle('reduced-motion', next);
      });
      return row;
    }
    o.panel.appendChild(el('h2', { text: 'Settings' }));
    o.panel.appendChild(toggle('speech', 'Spoken letters', 'Audio stream for Dual N-Back (Web Speech).'));
    o.panel.appendChild(toggle('sound', 'Sound effects', 'Beeps and feedback tones.'));
    o.panel.appendChild(toggle('reducedMotion', 'Reduced motion', 'Minimize animations and flashes.'));
    o.panel.appendChild(el('div', { class: 'settings-stats', text:
      store.totalPlays() + ' games played all-time · ' + engine.formatMoney(store.walletCents()) + ' earned · ' +
      (BRAIN.cloud.configured ? 'earnings sync to Supabase' : 'earnings stored locally only') + '. ' +
      'Progress (levels, streak) is stored locally in your browser.' }));
    o.panel.appendChild(el('div', { class: 'g-intro-actions' }, [
      el('button', {
        class: 'g-btn ghost danger', text: 'Reset all progress', onclick: function () {
          if (confirm('Erase all levels, scores, and streaks? This cannot be undone.')) {
            store.reset(); o.close(); renderApp();
          }
        }
      }),
      el('button', { class: 'g-btn', text: 'Close', onclick: function () { o.close(); renderApp(); } })
    ]));
  }

  // ---- boot ----------------------------------------------------
  function boot() {
    if (store.settings.reducedMotion) document.body.classList.add('reduced-motion');
    renderApp();
    // Background: pull authoritative earnings from Supabase, then refresh the
    // wallet figure (header + earnings tab if open).
    if (BRAIN.cloud.configured) {
      reconcileEarnings().then(function (ok) { if (ok) renderApp(); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
