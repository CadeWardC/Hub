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
      settings: { sound: true, speech: true, reducedMotion: false }
    };
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

    reset() {
      state = defaults();
      persist();
    },

    dayKey
  };

  BRAIN.store = store;
})();
