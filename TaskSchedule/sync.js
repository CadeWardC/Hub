(() => {
  "use strict";

  // Two-way sync with a Directus collection. Every task, event and protocol is
  // one row: { id, kind, data (json), updated (ms), deleted }. The newest
  // `updated` wins; deleted rows stay as markers so every device drops them.
  // Connection details live only on this device (never in the synced data).
  const { state, writeLocal, render } = window.TS;
  const $ = (id) => document.getElementById(id);
  const KEY = "taskschedule.sync";
  const LISTS = { task: "tasks", event: "events", protocol: "protocols" };
  const PAGE = 500;
  const DEFAULT_URL = "https://api.opcw032522.uk";

  let cfg = { url: "", token: "", collection: "taskschedule_items", lastSync: 0, lastError: "" };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* defaults */ }
  const saveCfg = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* storage blocked */ } };
  const configured = () => !!(cfg.url && cfg.token && cfg.collection);
  // Encrypted token baked into the build by make-sync-config.mjs (may be absent).
  const SEALED = window.TASKSCHEDULE_SYNC || null;
  const locked = () => !configured() && !!SEALED;

  // Must match normalise() in make-sync-config.mjs: case and extra spaces don't matter.
  const normalise = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function unseal(passphrase) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(normalise(passphrase)), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt: unb64(SEALED.salt), iterations: SEALED.iterations },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"],
    );
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(SEALED.iv) }, key, unb64(SEALED.token));
    return new TextDecoder().decode(plain);
  }

  let syncing = false;
  let again = false;
  let timer = 0;

  async function api(path, method = "GET", body) {
    const res = await fetch(cfg.url.replace(/\/+$/, "") + path, {
      method,
      cache: "no-store",
      headers: { Authorization: `Bearer ${cfg.token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`.trim();
      try { msg = (await res.json()).errors?.[0]?.message || msg; } catch (e) { /* not JSON */ }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }

  async function fetchAll() {
    const rows = [];
    const coll = encodeURIComponent(cfg.collection);
    for (let offset = 0; ; offset += PAGE) {
      const res = await api(`/items/${coll}?fields=id,kind,data,updated,deleted&limit=${PAGE}&offset=${offset}&sort=id`);
      rows.push(...res.data);
      if (res.data.length < PAGE) return rows;
    }
  }

  async function sync() {
    if (!configured() || !navigator.onLine) { paint(); return; }
    if (syncing) { again = true; return; }
    syncing = true;
    paint();
    try {
      const remote = new Map((await fetchAll()).map((r) => [String(r.id), r]));

      // Index local items by id.
      const local = new Map();
      Object.entries(LISTS).forEach(([kind, list]) => state[list].forEach((item, i) => local.set(item.id, { kind, list, item, i })));

      // Pull: take any remote row newer than what this device has.
      let changed = false;
      remote.forEach((r, id) => {
        const list = LISTS[r.kind];
        if (!list) return;
        const updated = Number(r.updated) || 0;
        const mine = local.get(id);
        const grave = state.deleted[id];
        const myUpdated = mine ? (mine.item.updated || 0) : grave ? grave.updated : -1;
        if (updated <= myUpdated) return;
        if (r.deleted) {
          if (mine) state[list] = state[list].filter((x) => x.id !== id);
          state.deleted[id] = { kind: r.kind, updated };
        } else {
          const data = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
          if (!data) return;
          data.id = id;
          data.updated = updated;
          const at = state[list].findIndex((x) => x.id === id);
          if (at === -1) state[list].push(data); else state[list][at] = data;
          delete state.deleted[id];
        }
        changed = true;
      });

      // Push: anything this device has that is newer than the server's copy.
      const out = [];
      Object.entries(LISTS).forEach(([kind, list]) => state[list].forEach((item) => {
        const r = remote.get(item.id);
        if (!item.updated) item.updated = item.created || Date.now();
        if (!r || (Number(r.updated) || 0) < item.updated || r.deleted) {
          out.push({ id: item.id, kind, data: item, updated: item.updated, deleted: false });
        }
      }));
      Object.entries(state.deleted).forEach(([id, grave]) => {
        const r = remote.get(id);
        if (!r || (!r.deleted && (Number(r.updated) || 0) < grave.updated)) {
          out.push({ id, kind: grave.kind, data: null, updated: grave.updated, deleted: true });
        }
      });
      const coll = encodeURIComponent(cfg.collection);
      const creates = out.filter((o) => !remote.has(o.id));
      const updates = out.filter((o) => remote.has(o.id));
      if (creates.length) await api(`/items/${coll}`, "POST", creates);
      if (updates.length) {
        try {
          await api(`/items/${coll}`, "PATCH", updates);
        } catch (e) {
          // Older Directus versions don't take an array; fall back to one at a time.
          if (e.status !== 400) throw e;
          for (const u of updates) await api(`/items/${coll}/${encodeURIComponent(u.id)}`, "PATCH", u);
        }
      }

      if (changed) { writeLocal(); render(); }
      cfg.lastSync = Date.now();
      cfg.lastError = "";
    } catch (e) {
      cfg.lastError = e.message === "Failed to fetch"
        ? "Couldn't reach Directus (check the URL, your connection, and CORS)."
        : e.message;
    } finally {
      saveCfg();
      syncing = false;
      paint();
      if (again) { again = false; sync(); }
    }
  }

  function syncSoon(ms = 1500) {
    if (!configured()) return;
    clearTimeout(timer);
    timer = setTimeout(sync, ms);
  }

  // ---- UI ----
  function ago(t) {
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 45) return "just now";
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    return new Date(t).toLocaleDateString();
  }

  function paint() {
    const btn = $("syncButton");
    const st = locked() ? "locked" : !configured() ? "off" : syncing ? "busy" : cfg.lastError ? "error" : "ok";
    btn.dataset.state = st;
    const text = st === "locked" ? "Locked. Enter the passphrase once on this device to turn on sync."
      : st === "off" ? "Not connected — data stays on this device."
      : st === "busy" ? "Syncing…"
      : st === "error" ? `Sync failed: ${cfg.lastError}`
      : cfg.lastSync ? `Synced ${ago(cfg.lastSync)}.` : "Connected.";
    btn.title = text;
    $("syncStatus").textContent = text;
    $("syncStatus").dataset.state = st;
    $("syncNow").disabled = !configured() || syncing;
    $("syncDisconnect").hidden = !configured();
    $("unlockBox").hidden = !locked();
    $("syncNow").hidden = locked();
  }

  async function unlock() {
    const input = $("syncPassphrase");
    const err = $("unlockError");
    if (!input.value.trim()) { input.focus(); return; }
    if (!window.crypto?.subtle) { err.textContent = "This browser can't unlock sync here (needs HTTPS)."; err.hidden = false; return; }
    $("syncUnlock").disabled = true;
    err.hidden = true;
    try {
      const token = await unseal(input.value);
      // Remember on this device so the passphrase is only needed once.
      Object.assign(cfg, { url: SEALED.url, token, collection: SEALED.collection, lastError: "" });
      saveCfg();
      input.value = "";
      paint();
      sync();
    } catch (e) {
      err.textContent = "That passphrase didn't work.";
      err.hidden = false;
      input.select();
    } finally {
      $("syncUnlock").disabled = false;
    }
  }

  const dialog = $("syncDialog");
  const form = $("syncForm");
  $("syncButton").addEventListener("click", () => {
    form.elements.url.value = cfg.url || DEFAULT_URL;
    form.elements.token.value = cfg.token;
    form.elements.collection.value = cfg.collection;
    $("manualSync").open = !SEALED && !configured();
    $("unlockError").hidden = true;
    paint();
    dialog.showModal();
    if (locked()) $("syncPassphrase").focus();
  });
  $("syncUnlock").addEventListener("click", unlock);
  $("syncClose").addEventListener("click", () => dialog.close());
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    // Enter in the passphrase box means "unlock", not "save the manual fields".
    if (document.activeElement === $("syncPassphrase")) { unlock(); return; }
    let url = form.elements.url.value.trim();
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    cfg.url = url;
    cfg.token = form.elements.token.value.trim();
    cfg.collection = form.elements.collection.value.trim() || "taskschedule_items";
    cfg.lastError = "";
    saveCfg();
    sync();
  });
  $("syncNow").addEventListener("click", () => sync());
  $("syncDisconnect").addEventListener("click", () => {
    if (!confirm("Disconnect this device from Directus? Your data stays on this device.")) return;
    cfg = { url: "", token: "", collection: cfg.collection, lastSync: 0, lastError: "" };
    form.reset();
    form.elements.collection.value = cfg.collection;
    saveCfg();
    paint();
  });

  window.TS.saveHooks.push(() => syncSoon());
  window.addEventListener("online", () => sync());
  document.addEventListener("visibilitychange", () => { if (!document.hidden) sync(); });
  setInterval(() => { if (!document.hidden) sync(); }, 120000);
  setInterval(paint, 30000);

  paint();
  sync();
  // First visit on a device with a sealed token: ask for the passphrase once.
  if (locked() && !cfg.asked) {
    cfg.asked = true;
    saveCfg();
    setTimeout(() => $("syncButton").click(), 400);
  }
})();
