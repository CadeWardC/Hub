/* ============================================================
   cloud.js — Supabase (PostgREST) client for the earnings ledger
   Reads config from window.BRAIN_CONFIG (see config.js).
   All methods are best-effort: on any failure they return
   { error: true, ... } and the app falls back to localStorage.
   ============================================================ */
(function () {
  'use strict';
  window.BRAIN = window.BRAIN || {};

  const cfg = window.BRAIN_CONFIG || {};
  const URL = cfg.SUPABASE_URL || '';
  const KEY = cfg.SUPABASE_ANON_KEY || '';
  const REST = URL + '/rest/v1';
  const configured = !!(URL && KEY);

  if (!configured) {
    console.warn('[brain] Supabase not configured — earnings stay local. Copy config.example.js → config.js.');
  }

  async function req(path, method, body, prefer) {
    const headers = {
      'apikey': KEY,
      'Authorization': 'Bearer ' + KEY,
      'Content-Type': 'application/json'
    };
    if (prefer) headers['Prefer'] = prefer;
    const opts = { method: method || 'GET', headers: headers };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(REST + path, opts);
      if (!res.ok) {
        const text = await res.text();
        return { error: true, status: res.status, message: text };
      }
      if (res.status === 204) return [];
      const text = await res.text();
      return text ? JSON.parse(text) : [];
    } catch (e) {
      return { error: true, message: e.message };
    }
  }

  BRAIN.cloud = {
    configured: configured,

    // Insert one earning row. Returns { data: row } or { error, status }.
    async insertEarning(e) {
      if (!configured) return { error: true, offline: true };
      const res = await req('/brain_earnings', 'POST', {
        cid: e.cid, game_id: e.game_id, game_name: e.game_name, domain: e.domain,
        score: e.score, accuracy: e.accuracy, level: e.level, payout_cents: e.payout_cents
      }, 'return=representation');
      if (res.error) return res;
      return { data: Array.isArray(res) ? res[0] : res };
    },

    // Fetch recent earnings (newest first). Returns { data: [...] } or { error }.
    async fetchEarnings(limit) {
      if (!configured) return { error: true, offline: true };
      const res = await req('/brain_earnings?select=*&order=date_created.desc&limit=' + (limit || 200));
      if (res.error) return res;
      return { data: Array.isArray(res) ? res : [] };
    }
  };
})();
