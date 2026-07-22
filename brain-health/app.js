(function () {
  'use strict';

  const ui = BRAIN.ui;
  const store = BRAIN.store;
  const engine = BRAIN.engine;
  const el = ui.el;
  const root = document.getElementById('app');
  const navSlot = document.getElementById('primary-nav');
  const headerSlot = document.getElementById('header-stats');

  const NAV = [
    { id: 'today', label: 'Today' },
    { id: 'library', label: 'Game library' },
    { id: 'progress', label: 'Progress' },
    { id: 'rewards', label: 'Rewards' }
  ];
  let currentView = 'today';
  let libraryFilter = 'all';

  function renderApp() {
    renderNav();
    renderHeader();
    ui.clear(root);
    if (currentView === 'library') renderLibrary(root);
    else if (currentView === 'progress') renderProgress(root);
    else if (currentView === 'rewards') renderRewards(root);
    else renderToday(root);
    window.scrollTo({ top: 0, behavior: store.settings.reducedMotion ? 'auto' : 'smooth' });
  }

  function go(view) {
    currentView = view;
    renderApp();
  }

  function renderNav() {
    ui.clear(navSlot);
    NAV.forEach(function (item) {
      navSlot.appendChild(el('button', {
        class: 'nav-btn' + (currentView === item.id ? ' active' : ''),
        text: item.label,
        'aria-current': currentView === item.id ? 'page' : null,
        onclick: function () { if (currentView !== item.id) go(item.id); }
      }));
    });
  }

  function renderHeader() {
    ui.clear(headerSlot);
    headerSlot.appendChild(el('div', { class: 'header-pill' }, [
      el('strong', { text: String(engine.overallIndex() || '—') }),
      el('span', { text: 'index' })
    ]));
    headerSlot.appendChild(el('button', {
      class: 'header-pill wallet-mini',
      title: 'Open rewards',
      onclick: function () { go('rewards'); }
    }, [
      el('strong', { text: engine.formatMoney(store.walletCents()) }),
      el('span', { text: 'earned' })
    ]));
    headerSlot.appendChild(el('button', {
      class: 'icon-btn',
      title: 'Settings',
      'aria-label': 'Open settings',
      text: '•••',
      onclick: openSettings
    }));
  }

  function renderToday(view) {
    const lineup = engine.pickDailySession(5);
    const trained = store.trainedToday();
    const overall = engine.overallIndex();
    const hero = el('section', { class: 'session-hero' });
    const copy = el('div', { class: 'session-copy' }, [
      el('span', { class: 'eyebrow', text: trained ? 'Daily mix completed' : friendlyDate() }),
      el('h1', { text: trained ? 'Your mind showed up today.' : 'Build a sharper kind of focus.' }),
      el('p', { text: 'Five short, adaptive games chosen from your least-trained skills. No endless grind—just a focused daily circuit.' }),
      el('div', { class: 'hero-actions' }, [
        el('button', { class: 'g-btn coral large', text: trained ? 'Run another mix' : 'Start today’s mix', onclick: function () { runDaily(lineup); } }),
        el('span', { class: 'session-meta', text: '5 games · about 6 min' })
      ])
    ]);
    const orbit = el('div', { class: 'session-orbit', 'aria-hidden': 'true' });
    const ring = el('div', { class: 'orbit-ring' });
    lineup.forEach(function (game) { ring.appendChild(el('span', { class: 'orbit-game', text: game.icon })); });
    orbit.appendChild(ring);
    orbit.appendChild(el('div', { class: 'orbit-core' }, [
      el('strong', { text: overall ? String(overall) : 'NEW' }),
      el('span', { text: overall ? 'brain index' : 'start here' })
    ]));
    hero.appendChild(copy);
    hero.appendChild(orbit);
    view.appendChild(hero);

    const totals = getTodayStats();
    const stats = el('section', { class: 'stat-strip', 'aria-label': 'Training summary' });
    [
      { value: store.streak + ' days', label: 'Current rhythm', note: trained ? 'Checked in today' : 'Keep the chain alive', color: '#ffb39e' },
      { value: String(store.totalPlays()), label: 'Games completed', note: 'All-time training', color: '#8ad8ff' },
      { value: totals.minutes + ' min', label: 'Today’s focus', note: totals.plays + ' games completed', color: '#c7f36b' },
      { value: engine.formatMoney(store.walletCents()), label: 'Practice rewards', note: 'Saved in your ledger', color: '#ffd784' }
    ].forEach(function (item) {
      stats.appendChild(el('div', { class: 'stat-tile', style: { '--tile-accent': item.color } }, [
        el('strong', { text: item.value }), el('span', { text: item.label }), el('small', { text: item.note })
      ]));
    });
    view.appendChild(stats);

    const recommended = chooseRecommended();
    const sectionHead = el('div', { class: 'section-head' }, [
      el('div', {}, [el('span', { class: 'eyebrow', text: 'Quick play' }), el('h2', { text: 'One game. One clear target.' })]),
      el('p', { text: 'Jump into the skill that currently has the most room to grow, or browse a different domain.' })
    ]);
    view.appendChild(sectionHead);
    const quick = el('section', { class: 'quick-grid' });
    const dom = engine.DOMAINS[recommended.domain];
    const feature = el('article', { class: 'quick-feature', style: { '--accent': dom.color, background: dom.color } }, [
      el('div', { class: 'quick-feature-top' }, [
        el('span', { class: 'quick-icon', text: recommended.icon }),
        el('span', { class: 'quick-level', text: 'LEVEL ' + store.getLevel(recommended.id) })
      ]),
      el('h3', { text: recommended.name }),
      el('p', { text: recommended.blurb }),
      el('div', { class: 'quick-actions' }, [
        el('button', { class: 'g-btn', text: 'Play now', onclick: function () { launchGame(recommended); } }),
        el('button', { class: 'g-btn ghost', text: 'Why this works', onclick: function () { openScience(recommended); } })
      ])
    ]);
    quick.appendChild(feature);
    const domains = el('div', { class: 'domain-list' });
    engine.domainList().forEach(function (domain) {
      const index = engine.domainIndex(domain.id);
      domains.appendChild(el('div', { class: 'domain-mini', style: { '--accent': domain.color } }, [
        el('div', { class: 'domain-mini-head' }, [el('span', { text: domain.name }), el('span', { text: domain.icon })]),
        el('strong', { text: index ? String(index) : '—' }),
        el('div', { class: 'mini-track' }, [el('i', { style: { width: Math.max(3, index) + '%' } })])
      ]));
    });
    quick.appendChild(domains);
    view.appendChild(quick);
  }

  function chooseRecommended() {
    const list = engine.games.slice();
    list.sort(function (a, b) {
      const aPlays = store.getHistory(a.id).length;
      const bPlays = store.getHistory(b.id).length;
      if (aPlays !== bPlays) return aPlays - bPlays;
      return engine.domainIndex(a.domain) - engine.domainIndex(b.domain);
    });
    return list[0];
  }

  function renderLibrary(view) {
    view.appendChild(el('div', { class: 'page-heading' }, [
      el('div', {}, [el('span', { class: 'eyebrow', text: '14 adaptive games' }), el('h1', { text: 'Choose what to train.' })]),
      el('p', { text: 'Every game is short, responsive, and adjusts one level at a time. Your existing level and best score stay with you.' })
    ]));
    const filters = el('div', { class: 'filter-row' });
    [{ id: 'all', name: 'All games' }].concat(engine.domainList()).forEach(function (domain) {
      filters.appendChild(el('button', {
        class: 'filter-chip' + (libraryFilter === domain.id ? ' active' : ''),
        text: domain.name,
        onclick: function () { libraryFilter = domain.id; renderApp(); }
      }));
    });
    view.appendChild(filters);
    const grid = el('section', { class: 'game-grid' });
    engine.games.filter(function (game) { return libraryFilter === 'all' || game.domain === libraryFilter; })
      .forEach(function (game) { grid.appendChild(gameCard(game)); });
    view.appendChild(grid);
  }

  function gameCard(game) {
    const domain = engine.DOMAINS[game.domain];
    const level = store.getLevel(game.id);
    const last = store.lastResult(game.id);
    const best = store.getBest(game.id);
    const card = el('article', { class: 'game-card', style: { '--accent': domain.color } }, [
      el('div', { class: 'gc-head' }, [
        el('span', { class: 'gc-icon', text: game.icon }),
        el('div', {}, [el('h3', { class: 'gc-name', text: game.name }), el('span', { class: 'gc-domain', text: domain.name })]),
        el('span', { class: 'gc-level', text: 'LV ' + level })
      ]),
      el('p', { class: 'gc-blurb', text: game.blurb }),
      el('div', { class: 'gc-stats' }, [
        el('span', { text: best ? 'BEST ' + best : 'UNPLAYED' }),
        last && last.accuracy != null ? el('span', { text: 'LAST ' + Math.round(last.accuracy * 100) + '%' }) : null
      ]),
      el('div', { class: 'gc-actions' }, [
        el('button', { class: 'g-btn ghost small', text: 'Details', onclick: function () { openScience(game); } }),
        el('button', { class: 'g-btn small', text: 'Play', onclick: function () { launchGame(game); } })
      ])
    ]);
    return card;
  }

  function renderProgress(view) {
    const overall = engine.overallIndex();
    view.appendChild(el('div', { class: 'page-heading' }, [
      el('div', {}, [el('span', { class: 'eyebrow', text: 'Your training profile' }), el('h1', { text: 'Progress you can actually read.' })]),
      el('p', { text: 'Indices summarize your last five sessions in each trained game. They are practice signals, not clinical scores.' })
    ]));
    const layout = el('section', { class: 'progress-layout' });
    const score = el('article', { class: 'score-panel' }, [
      el('span', { class: 'eyebrow', text: 'Cortex index' }),
      el('div', { class: 'score-orb', style: { '--score': overall } }, [
        el('div', {}, [el('strong', { text: overall ? String(overall) : '—' }), el('span', { text: overall ? 'current index' : 'play to begin' })])
      ]),
      el('p', { text: 'Built from recent performance across memory, attention, speed, and flexible thinking.' })
    ]);
    layout.appendChild(score);
    const activity = el('article', { class: 'activity-panel' });
    activity.appendChild(el('h3', { text: 'Last seven days' }));
    activity.appendChild(renderWeekBars());
    const domainGrid = el('div', { class: 'domain-progress' });
    engine.domainList().forEach(function (domain) {
      const idx = engine.domainIndex(domain.id);
      domainGrid.appendChild(el('div', { class: 'domain-progress-card' }, [
        el('div', {}, [el('span', { text: domain.icon + ' ' + domain.name }), el('strong', { text: idx ? String(idx) : '—' })]),
        el('div', { class: 'mini-track', style: { marginTop: '12px', '--accent': domain.color } }, [el('i', { style: { width: Math.max(3, idx) + '%', background: domain.color } })])
      ]));
    });
    activity.appendChild(domainGrid);
    layout.appendChild(activity);

    const bests = el('article', { class: 'bests-panel' });
    bests.appendChild(el('h3', { text: 'Personal bests' }));
    const bestList = el('div', { class: 'best-list' });
    engine.games.slice().sort(function (a, b) { return store.getBest(b.id) - store.getBest(a.id); }).forEach(function (game) {
      bestList.appendChild(el('div', { class: 'best-row' }, [
        el('span', { text: game.icon }),
        el('div', {}, [el('small', { text: game.name }), el('strong', { text: store.getBest(game.id) ? String(store.getBest(game.id)) : 'Not played' })])
      ]));
    });
    bests.appendChild(bestList);
    layout.appendChild(bests);
    view.appendChild(layout);
  }

  function renderWeekBars() {
    const wrap = el('div', { class: 'week-bars' });
    const counts = {};
    Object.keys(store.raw().history).forEach(function (gameId) {
      store.raw().history[gameId].forEach(function (entry) {
        const key = store.dayKey(new Date(entry.t));
        counts[key] = (counts[key] || 0) + 1;
      });
    });
    let max = 1;
    Object.keys(counts).forEach(function (key) { max = Math.max(max, counts[key]); });
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = store.dayKey(date);
      const count = counts[key] || 0;
      wrap.appendChild(el('div', { class: 'day-bar' + (offset === 0 ? ' today' : '') }, [
        el('span', { text: String(count) }),
        el('i', { style: { height: Math.max(4, Math.round((count / max) * 155)) + 'px' } }),
        el('span', { text: date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2) })
      ]));
    }
    return wrap;
  }

  function renderRewards(view) {
    const total = store.walletCents();
    view.appendChild(el('section', { class: 'wallet-hero' }, [
      el('div', { class: 'wallet-amount', text: engine.formatMoney(total) }),
      el('span', { class: 'wallet-label', text: 'Total practice rewards' }),
      el('p', { class: 'wallet-note', text: 'Every completed task adds a small participation reward plus accuracy and level bonuses. Cloud sync is best-effort; your local ledger works offline.' })
    ]));
    const stats = el('div', { class: 'earn-stats' });
    view.appendChild(stats);
    const head = el('div', { class: 'earn-head' }, [
      el('h2', { text: 'Reward history' }),
      el('span', { class: 'earn-sync', text: BRAIN.cloud.configured ? 'SYNCING…' : 'LOCAL ONLY' })
    ]);
    view.appendChild(head);
    const list = el('div', { class: 'earn-list' });
    view.appendChild(list);

    function paint() {
      renderEarnStats(stats);
      renderEarnList(list);
    }
    paint();
    if (BRAIN.cloud.configured) {
      reconcileEarnings().then(function (ok) {
        head.lastChild.textContent = ok ? 'SYNCED ✓' : 'OFFLINE · SAVED';
        head.lastChild.classList.toggle('ok', ok);
        paint();
        renderHeader();
      });
    }
  }

  function renderEarnStats(row) {
    ui.clear(row);
    const all = store.getEarnings();
    const today = store.dayKey();
    const todayCents = all.filter(function (entry) { return store.dayKey(new Date(entry.date_created)) === today; })
      .reduce(function (sum, entry) { return sum + (entry.payout_cents || 0); }, 0);
    const avg = all.length ? Math.round(store.walletCents() / all.length) : 0;
    [['Today', engine.formatMoney(todayCents)], ['Paid tasks', String(all.length)], ['Average / task', engine.formatMoney(avg)]]
      .forEach(function (item) {
        row.appendChild(el('div', { class: 'earn-stat' }, [el('span', { class: 'earn-stat-val', text: item[1] }), el('span', { class: 'earn-stat-label', text: item[0] })]));
      });
  }

  function renderEarnList(wrap) {
    ui.clear(wrap);
    const list = store.getEarnings();
    if (!list.length) {
      wrap.appendChild(el('p', { class: 'earn-empty', text: 'Complete a game and your first reward will appear here.' }));
      return;
    }
    list.slice(0, 100).forEach(function (entry) {
      const domain = engine.DOMAINS[entry.domain];
      const game = engine.byId[entry.game_id];
      wrap.appendChild(el('div', { class: 'earn-row', style: { '--accent': domain ? domain.color : '#8ad8ff' } }, [
        el('span', { class: 'earn-row-icon', text: game ? game.icon : '◆' }),
        el('div', { class: 'earn-row-main' }, [
          el('span', { class: 'earn-row-name', text: entry.game_name || entry.game_id }),
          el('span', { class: 'earn-row-sub', text: timeAgo(entry.date_created) + (entry.accuracy != null ? ' · ' + Math.round(entry.accuracy * 100) + '%' : '') + ' · LV ' + (entry.level || 1) })
        ]),
        el('span', { class: 'earn-row-pay', text: '+' + engine.formatMoney(entry.payout_cents) })
      ]));
    });
  }

  function openOverlay(opts) {
    opts = opts || {};
    const overlay = el('div', { class: 'overlay' });
    const panel = el('div', { class: 'overlay-panel' });
    let canClose = opts.dismissible !== false;
    function close() {
      if (!canClose) return;
      document.removeEventListener('keydown', onKey, true);
      overlay.classList.remove('show');
      setTimeout(function () { overlay.remove(); }, 220);
    }
    function onKey(event) { if (event.key === 'Escape') close(); }
    const closeButton = el('button', { class: 'overlay-close', 'aria-label': 'Close', text: '×', onclick: close });
    panel.appendChild(closeButton);
    overlay.appendChild(panel);
    overlay.addEventListener('pointerdown', function (event) { if (event.target === overlay) close(); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('show'); });
    return {
      panel: panel,
      close: close,
      lock: function () { canClose = false; closeButton.style.display = 'none'; },
      unlock: function () { canClose = true; closeButton.style.display = ''; }
    };
  }

  function openScience(game) {
    const overlay = openOverlay();
    overlay.panel.classList.add('narrow');
    overlay.panel.appendChild(scienceBlock(game, true));
    overlay.panel.appendChild(el('button', { class: 'g-btn wide', text: 'Got it', onclick: overlay.close }));
  }

  function scienceBlock(game, full) {
    return el('div', { class: 'science' }, [
      el('div', { class: 'science-head' }, [el('span', { class: 'gc-icon', text: game.icon }), el('h3', { text: game.name + ': the science' })]),
      el('p', { class: 'sci-what', text: game.science.what }),
      full ? el('p', { class: 'sci-why', text: 'Why it matters: ' + game.science.why }) : null,
      el('p', { class: 'sci-cite', text: game.science.citation })
    ]);
  }

  function launchGame(game, session) {
    return new Promise(function (resolve) {
      const overlay = openOverlay();
      const level = store.getLevel(game.id);
      const domain = engine.DOMAINS[game.domain];
      const intro = el('div', { class: 'g-intro' }, [
        session ? el('span', { class: 'session-pill', text: 'DAILY MIX · ' + (session.index + 1) + ' / ' + session.total }) : null,
        el('div', { class: 'intro-art', style: { '--accent': domain.color } }, [
          el('span', { class: 'gc-icon', text: game.icon }),
          el('strong', { text: domain.name.toUpperCase() })
        ]),
        el('h2', { text: game.name }),
        el('p', { text: game.blurb }),
        el('div', { class: 'how-grid' }, [
          el('div', { class: 'how-card' }, [el('span', { text: 'Starting at' }), el('strong', { text: 'Level ' + level })]),
          el('div', { class: 'how-card' }, [el('span', { text: 'Adjustment' }), el('strong', { text: 'Accuracy after each round' })])
        ]),
        scienceBlock(game, false),
        el('div', { class: 'g-intro-actions' }, [
          el('button', { class: 'g-btn ghost', text: session ? 'Leave mix' : 'Not now', onclick: function () { overlay.close(); resolve(null); } }),
          el('button', { class: 'g-btn large', text: 'Begin round', onclick: startPlay })
        ])
      ]);
      overlay.panel.appendChild(intro);

      async function startPlay() {
        overlay.lock();
        ui.speech.warmUp();
        const host = el('div', { class: 'game-host' });
        ui.clear(overlay.panel);
        overlay.panel.appendChild(host);
        overlay.panel.classList.add('playing');
        let result;
        try {
          result = await game.play(host, { level: level });
        } catch (error) {
          console.error('[cortex] game failed', error);
          result = { score: 0, accuracy: 0, level: level, metric: { label: 'Round', value: 'Interrupted' }, detail: 'This round could not be completed.' };
        }
        overlay.panel.classList.remove('playing');
        const newLevel = engine.adapt(game, result.accuracy == null ? 0 : result.accuracy, level);
        store.setLevel(game.id, newLevel);
        const record = store.recordResult(game.id, result);
        store.touchStreak();
        const earned = await awardEarning(game, result);
        overlay.unlock();
        showResult(overlay, game, result, record, newLevel - level, session, resolve, earned);
      }
    });
  }

  function showResult(overlay, game, result, record, levelDelta, session, resolve, earned) {
    ui.clear(overlay.panel);
    overlay.panel.classList.add('narrow');
    const accuracy = result.accuracy == null ? null : Math.round(result.accuracy * 100);
    overlay.panel.appendChild(el('div', { class: 'result' }, [
      el('div', { class: 'result-emoji', text: record.isBest ? '★' : accuracy != null && accuracy >= 80 ? '◎' : '✓' }),
      el('h2', { text: record.isBest ? 'A new personal best.' : 'Round complete.' }),
      el('div', { class: 'payout-banner' }, [
        el('span', { class: 'payout-amt', text: '+' + engine.formatMoney(earned) }),
        el('span', { class: 'payout-sub', text: engine.formatMoney(store.walletCents()) + ' total rewards' })
      ]),
      el('div', { class: 'result-metrics' }, [
        metricBox(result.metric ? result.metric.label : 'Accuracy', result.metric ? result.metric.value : (accuracy + '%')),
        metricBox('Score', result.score),
        metricBox('Next level', store.getLevel(game.id))
      ]),
      result.detail ? el('p', { class: 'result-detail', text: result.detail }) : null,
      levelDelta > 0 ? el('p', { class: 'level-up', text: 'Level up. The next round will ask a little more.' }) :
        levelDelta < 0 ? el('p', { class: 'level-down', text: 'Difficulty adjusted down to keep the challenge productive.' }) : null
    ]));
    const actions = el('div', { class: 'g-intro-actions' });
    if (session) {
      actions.appendChild(el('button', {
        class: 'g-btn large wide',
        text: session.index + 1 < session.total ? 'Continue mix →' : 'Finish mix',
        onclick: function () { overlay.close(); resolve(result); }
      }));
    } else {
      actions.appendChild(el('button', { class: 'g-btn ghost', text: 'Back to Cortex', onclick: function () { overlay.close(); resolve(result); renderApp(); } }));
      actions.appendChild(el('button', { class: 'g-btn', text: 'Play again', onclick: function () { overlay.close(); resolve(result); launchGame(game); } }));
    }
    overlay.panel.appendChild(actions);
  }

  function metricBox(label, value) {
    return el('div', { class: 'metric-box' }, [el('span', { class: 'metric-value', text: String(value) }), el('span', { class: 'metric-label', text: label })]);
  }

  async function runDaily(lineup) {
    const results = [];
    for (let i = 0; i < lineup.length; i++) {
      const result = await launchGame(lineup[i], { index: i, total: lineup.length });
      if (!result) break;
      results.push({ game: lineup[i], res: result });
    }
    if (!results.length) return;
    store.recordSession({ games: results.map(function (item) { return item.game.id; }) });
    showSessionSummary(results, lineup.length);
  }

  function showSessionSummary(results, planned) {
    const overlay = openOverlay();
    overlay.panel.classList.add('narrow');
    const avg = Math.round(results.reduce(function (sum, item) { return sum + (item.res.accuracy || 0); }, 0) / results.length * 100);
    const total = results.reduce(function (sum, item) { return sum + engine.payoutCents(item.game, item.res); }, 0);
    overlay.panel.appendChild(el('div', { class: 'result' }, [
      el('div', { class: 'result-emoji', text: results.length === planned ? '✦' : '◐' }),
      el('h2', { text: results.length === planned ? 'Today’s mix is done.' : 'Mix saved for today.' }),
      el('div', { class: 'payout-banner' }, [el('span', { class: 'payout-amt', text: '+' + engine.formatMoney(total) }), el('span', { class: 'payout-sub', text: 'earned in this mix' })]),
      el('p', { class: 'result-detail', text: results.length + ' games · ' + avg + '% average accuracy · ' + store.streak + '-day rhythm' }),
      el('div', { class: 'summary-list' }, results.map(function (item) {
        return el('div', { class: 'summary-row' }, [el('span', { class: 'gc-icon', text: item.game.icon }), el('span', { class: 'summary-name', text: item.game.name }), el('span', { class: 'summary-score', text: item.res.score + ' pts' })]);
      }))
    ]));
    overlay.panel.appendChild(el('button', { class: 'g-btn large wide', text: 'Return to today', onclick: function () { overlay.close(); go('today'); } }));
  }

  function openSettings() {
    const overlay = openOverlay();
    overlay.panel.classList.add('narrow');
    overlay.panel.appendChild(el('span', { class: 'eyebrow', text: 'Preferences' }));
    overlay.panel.appendChild(el('h2', { text: 'Make Cortex yours.' }));
    function toggle(key, label, description) {
      const row = el('label', { class: 'setting-row' }, [
        el('div', {}, [el('strong', { text: label }), el('span', { class: 'setting-desc', text: description })]),
        el('button', { class: 'switch' + (store.settings[key] ? ' on' : ''), text: store.settings[key] ? 'On' : 'Off' })
      ]);
      row.lastChild.addEventListener('click', function (event) {
        event.preventDefault();
        const next = !store.settings[key];
        const patch = {}; patch[key] = next;
        store.saveSettings(patch);
        this.classList.toggle('on', next);
        this.textContent = next ? 'On' : 'Off';
        if (key === 'reducedMotion') document.body.classList.toggle('reduced-motion', next);
      });
      return row;
    }
    overlay.panel.appendChild(toggle('speech', 'Spoken cues', 'Read the audio stream in Dual N-Back.'));
    overlay.panel.appendChild(toggle('sound', 'Feedback sounds', 'Play short response and sequence tones.'));
    overlay.panel.appendChild(toggle('reducedMotion', 'Reduced motion', 'Remove orbit, pop, and transition effects.'));
    overlay.panel.appendChild(el('p', { class: 'settings-stats', text: store.totalPlays() + ' games · ' + engine.formatMoney(store.walletCents()) + ' rewards · ' + (BRAIN.cloud.configured ? 'cloud ledger configured' : 'local ledger') }));
    overlay.panel.appendChild(el('div', { class: 'g-intro-actions' }, [
      el('button', { class: 'g-btn ghost danger', text: 'Reset progress', onclick: function () { if (confirm('Erase all Cortex levels, scores, streaks, and local rewards?')) { store.reset(); overlay.close(); renderApp(); } } }),
      el('button', { class: 'g-btn', text: 'Done', onclick: function () { overlay.close(); renderApp(); } })
    ]));
  }

  async function awardEarning(game, result) {
    const cents = engine.payoutCents(game, result);
    const entry = store.addEarning({
      game_id: game.id, game_name: game.name, domain: game.domain,
      score: result.score, accuracy: result.accuracy == null ? null : result.accuracy,
      level: store.getLevel(game.id), payout_cents: cents
    });
    if (BRAIN.cloud.configured) {
      const response = await BRAIN.cloud.insertEarning(entry);
      if (response && response.data) store.markSynced(entry.cid, response.data.id);
      else if (response && response.status === 409) store.markSynced(entry.cid, null);
    }
    return cents;
  }

  async function reconcileEarnings() {
    if (!BRAIN.cloud.configured) return false;
    const pending = store.unsynced();
    for (let i = 0; i < pending.length; i++) {
      const response = await BRAIN.cloud.insertEarning(pending[i]);
      if (response && response.data) store.markSynced(pending[i].cid, response.data.id);
      else if (response && response.status === 409) store.markSynced(pending[i].cid, null);
      else return false;
    }
    const fetched = await BRAIN.cloud.fetchEarnings(200);
    if (fetched && fetched.data) { store.replaceEarnings(fetched.data); return true; }
    return false;
  }

  function getTodayStats() {
    const today = store.dayKey();
    let plays = 0;
    Object.keys(store.raw().history).forEach(function (gameId) {
      store.raw().history[gameId].forEach(function (entry) { if (store.dayKey(new Date(entry.t)) === today) plays++; });
    });
    return { plays: plays, minutes: Math.round(plays * 1.15) };
  }

  function friendlyDate() {
    return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function timeAgo(iso) {
    const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
  }

  function boot() {
    if (store.settings.reducedMotion) document.body.classList.add('reduced-motion');
    renderApp();
    if (BRAIN.cloud.configured) reconcileEarnings().then(function (ok) { if (ok) { renderHeader(); if (currentView === 'rewards') renderApp(); } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
