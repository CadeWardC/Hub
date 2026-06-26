/* ============================================================
   engine.js — game registry + adaptive difficulty + scoring
   ------------------------------------------------------------
   - Games self-register via BRAIN.register(spec).
   - Adaptive staircase adjusts each game's level between sessions
     based on accuracy (the standard approach in cognitive
     training studies, e.g. Jaeggi et al. 2008 used an n-back
     staircase keyed to hit/false-alarm performance).
   ============================================================ */
(function () {
  'use strict';
  window.BRAIN = window.BRAIN || {};

  const games = [];
  const byId = {};

  // Cognitive domains. Each carries an accent color used across the UI.
  const DOMAINS = {
    memory:      { id: 'memory',      name: 'Working Memory',        color: '#8b7cf6', icon: '◈' },
    attention:   { id: 'attention',   name: 'Attention & Control',   color: '#34d3aa', icon: '◉' },
    speed:       { id: 'speed',       name: 'Processing Speed',      color: '#f6c453', icon: '⚡' },
    flexibility: { id: 'flexibility', name: 'Flexibility & Reasoning', color: '#f17eb8', icon: '↻' }
  };

  function register(spec) {
    if (byId[spec.id]) { console.warn('[brain] duplicate game id', spec.id); return; }
    spec.thresholds = spec.thresholds || { up: 0.85, down: 0.55 };
    games.push(spec);
    byId[spec.id] = spec;
  }

  // --- Adaptive staircase -------------------------------------
  // accuracy in [0,1] -> level delta. Tunable per game via thresholds.
  function adapt(game, accuracy, currentLevel) {
    const t = game.thresholds;
    let delta = 0;
    if (accuracy >= t.up) delta = 1;
    else if (accuracy <= t.down) delta = -1;
    const min = game.minLevel || 1;
    const max = game.maxLevel || 12;
    return Math.max(min, Math.min(max, currentLevel + delta));
  }

  // --- Score normalization ------------------------------------
  // Map a raw game score to a 0..100 "index" using the game's own
  // target ceiling so domains are comparable. Falls back to the
  // player's best when no explicit target is provided.
  function normalize(game, score) {
    const target = game.scoreTarget || Math.max(score, BRAIN.store.getBest(game.id), 1);
    return Math.max(0, Math.min(100, Math.round((score / target) * 100)));
  }

  // Rolling domain index = mean of normalized recent bests for that domain.
  function domainIndex(domainId) {
    const list = games.filter(function (g) { return g.domain === domainId; });
    if (!list.length) return 0;
    let sum = 0, count = 0;
    list.forEach(function (g) {
      const hist = BRAIN.store.getHistory(g.id);
      if (!hist.length) return;
      // average of the last up-to-5 plays, normalized
      const recent = hist.slice(-5);
      const avg = recent.reduce(function (a, r) { return a + r.score; }, 0) / recent.length;
      sum += normalize(g, avg);
      count++;
    });
    return count ? Math.round(sum / count) : 0;
  }

  function overallIndex() {
    const ids = Object.keys(DOMAINS);
    const vals = ids.map(domainIndex).filter(function (v) { return v > 0; });
    if (!vals.length) return 0;
    return Math.round(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length);
  }

  // --- Daily adaptive session ---------------------------------
  // Picks `n` games, prioritizing under-trained / weakest domains so
  // the session covers the whole profile rather than one favorite game.
  function pickDailySession(n) {
    n = n || 5;
    const scored = games.map(function (g) {
      const hist = BRAIN.store.getHistory(g.id);
      const last = hist.length ? hist[hist.length - 1].t : 0;
      const dIndex = domainIndex(g.domain);
      const plays = hist.length;
      // Lower priority value = picked sooner.
      // Favor: weaker domains, fewer plays, longer since last played.
      const recencyDays = last ? (Date.now() - last) / 86400000 : 999;
      const priority =
        (dIndex / 100) * 2          // weak domains first
        + Math.min(plays, 20) * 0.1 // spread across less-played games
        - Math.min(recencyDays, 14) * 0.05;
      return { game: g, priority: priority };
    });
    scored.sort(function (a, b) { return a.priority - b.priority; });

    // Ensure domain coverage: take the best from each domain first.
    const chosen = [];
    const usedDomains = {};
    scored.forEach(function (s) {
      if (chosen.length >= n) return;
      if (!usedDomains[s.game.domain]) {
        chosen.push(s.game);
        usedDomains[s.game.domain] = true;
      }
    });
    // Fill remaining slots by priority.
    scored.forEach(function (s) {
      if (chosen.length >= n) return;
      if (chosen.indexOf(s.game) === -1) chosen.push(s.game);
    });
    return chosen.slice(0, n);
  }

  BRAIN.register = register;
  BRAIN.engine = {
    games: games,
    byId: byId,
    DOMAINS: DOMAINS,
    domainList: function () { return Object.keys(DOMAINS).map(function (k) { return DOMAINS[k]; }); },
    gamesIn: function (domainId) { return games.filter(function (g) { return g.domain === domainId; }); },
    adapt: adapt,
    normalize: normalize,
    domainIndex: domainIndex,
    overallIndex: overallIndex,
    pickDailySession: pickDailySession
  };
})();
