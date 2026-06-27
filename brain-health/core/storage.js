/* ============================================================
   storage.js — namespaced localStorage progress model
   Single source of truth for player progress, levels, history.
   ============================================================ */
(function () {
  'use strict';
  window.BRAIN = window.BRAIN || {};

  const KEY = 'brainHealth.v1';

  function defaults() {
    return {
      levels: {},     // gameId -> integer level (>= 1)
      history: {},    // gameId -> [{ t, score, accuracy, level, metric }]
      bests: {},      // gameId -> best score
      streak: { count: 0, last: null }, // last = YYYY-MM-DD
      sessions: [],   // [{ t, dayKey, games: [gameId], domainScores: {} }]
      earnings: [],   // ledger: [{ cid, game_id, game_name, domain, score, accuracy, level, payout_cents, date_created, synced, server_id }]
      settings: { sound: true, speech: true, reducedMotion: false }
    };
  }

  function uuid() {
    try {
      if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    } catch (e) { /* fall through */ }
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.floor(Math.random() * 16);
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const parsed = JSON.parse(raw);
      return Object.assign(defaults(), parsed, {
        settings: Object.assign(defaults().settings, parsed.settings || {})
      });
    } catch (e) {
      console.warn('[brain] storage load failed, resetting', e);
      return defaults();
    }
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[brain] storage persist failed', e);
    }
  }

  function dayKey(d) {
    const date = d || new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function daysBetween(a, b) {
    const da = new Date(a + 'T00:00:00');
    const db = new Date(b + 'T00:00:00');
    return Math.round((db - da) / 86400000);
  }

  const store = {
    KEY,
    raw() { return state; },

    get settings() { return state.settings; },
    saveSettings(patch) {
      state.settings = Object.assign({}, state.settings, patch);
      persist();
      return state.settings;
    },

    getLevel(gameId) {
      return state.levels[gameId] || 1;
    },
    setLevel(gameId, level) {
      state.levels[gameId] = Math.max(1, Math.round(level));
      persist();
      return state.levels[gameId];
    },

    getBest(gameId) {
      return state.bests[gameId] || 0;
    },

    getHistory(gameId) {
      return state.history[gameId] || [];
    },

    lastResult(gameId) {
      const h = state.history[gameId];
      return h && h.length ? h[h.length - 1] : null;
    },

    // Record one completed game session.
    recordResult(gameId, result) {
      const entry = {
        t: Date.now(),
        score: Math.round(result.score || 0),
        accuracy: result.accuracy != null ? result.accuracy : null,
        level: result.level || 1,
        metric: result.metric || null
      };
      if (!state.history[gameId]) state.history[gameId] = [];
      state.history[gameId].push(entry);
      // Keep history bounded (last 200 plays per game).
      if (state.history[gameId].length > 200) {
        state.history[gameId] = state.history[gameId].slice(-200);
      }
      const prevBest = state.bests[gameId] || 0;
      const isBest = entry.score > prevBest;
      if (isBest) state.bests[gameId] = entry.score;
      persist();
      return { entry, isBest };
    },

    // Mark that training happened today and update the streak counter.
    touchStreak() {
      const today = dayKey();
      const s = state.streak;
      if (s.last === today) { persist(); return s; }
      if (s.last && daysBetween(s.last, today) === 1) {
        s.count += 1;
      } else {
        s.count = 1;
      }
      s.last = today;
      persist();
      return s;
    },

    get streak() {
      // Streak is broken if the last training day was before yesterday.
      const s = state.streak;
      if (!s.last) return 0;
      const gap = daysBetween(s.last, dayKey());
      return gap <= 1 ? s.count : 0;
    },

    trainedToday() {
      return state.streak.last === dayKey();
    },

    recordSession(session) {
      state.sessions.push(Object.assign({ t: Date.now(), dayKey: dayKey() }, session));
      if (state.sessions.length > 100) state.sessions = state.sessions.slice(-100);
      persist();
    },

    totalPlays() {
      return Object.values(state.history).reduce((n, arr) => n + arr.length, 0);
    },

    // ---- Earnings ledger ----
    // Append a new earning (locally, marked unsynced). Returns the full entry.
    addEarning(partial) {
      const entry = Object.assign({
        cid: uuid(),
        date_created: new Date().toISOString(),
        synced: false,
        server_id: null
      }, partial);
      state.earnings.push(entry);
      if (state.earnings.length > 1000) state.earnings = state.earnings.slice(-1000);
      persist();
      return entry;
    },

    // Most-recent-first list of earnings.
    getEarnings() {
      return state.earnings.slice().sort(function (a, b) {
        return new Date(b.date_created) - new Date(a.date_created);
      });
    },

    walletCents() {
      return state.earnings.reduce(function (n, e) { return n + (e.payout_cents || 0); }, 0);
    },

    unsynced() {
      return state.earnings.filter(function (e) { return !e.synced; });
    },

    markSynced(cid, serverId) {
      const e = state.earnings.find(function (x) { return x.cid === cid; });
      if (e) { e.synced = true; if (serverId != null) e.server_id = serverId; persist(); }
    },

    // Replace the local ledger with the authoritative server list (after a
    // successful sync). Server rows are mapped to the local entry shape.
    replaceEarnings(serverRows) {
      state.earnings = serverRows.map(function (r) {
        return {
          cid: r.cid || ('srv-' + r.id),
          server_id: r.id,
          game_id: r.game_id, game_name: r.game_name, domain: r.domain,
          score: r.score, accuracy: r.accuracy, level: r.level,
          payout_cents: r.payout_cents, date_created: r.date_created,
          synced: true
        };
      });
      persist();
    },

    reset() {
      state = defaults();
      persist();
    },

    dayKey
  };

  BRAIN.store = store;
})();
