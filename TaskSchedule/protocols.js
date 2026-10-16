(() => {
  "use strict";

  const { state, save, touch, bury, uid, pad } = window.TS;
  const $ = (id) => document.getElementById(id);
  const RUN_KEY = "taskschedule.run";
  const MAX_SECONDS = 99 * 3600 + 59 * 60 + 59;

  let screen = "list"; // list | editor | run
  let currentId = null;
  let currentView = document.querySelector(".view.active").id;

  // Small DOM builder: el("div", { className: "x", onclick: fn }, child, "text")
  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else if (k === "dataset") Object.assign(node.dataset, v);
      else if (k in node) node[k] = v;
      else node.setAttribute(k, v);
    });
    children.flat().forEach((c) => { if (c != null && c !== false) node.append(c); });
    return node;
  }

  // ---- formatting ----
  function fmtDuration(sec) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const parts = [];
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    if (s || !parts.length) parts.push(`${s}s`);
    return parts.join(" ");
  }
  function fmtClock(sec) {
    sec = Math.max(0, Math.ceil(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }
  // An overnight wait has no clock time: it is ready once the calendar day
  // has changed since the step started, and then waits for you to continue.
  const dayStart = (t) => new Date(t).setHours(0, 0, 0, 0);
  const overnightReady = () => dayStart(Date.now()) > dayStart(run.stepStart);
  const isOvernight = (b) => b && b.type === "wait" && b.wait.mode === "overnight";

  const waitLabel = (w) => w.mode === "overnight" ? "Overnight" : fmtDuration(w.seconds);

  function summary(p) {
    const actions = p.blocks.filter((b) => b.type === "action").length;
    const waits = p.blocks.filter((b) => b.type === "wait");
    const timed = waits.filter((b) => b.wait.mode === "timer").reduce((n, b) => n + b.wait.seconds, 0);
    const nights = waits.filter((b) => b.wait.mode === "overnight").length;
    const parts = [`${p.blocks.length} step${p.blocks.length === 1 ? "" : "s"}`];
    if (actions) parts.push(`${actions} action${actions === 1 ? "" : "s"}`);
    if (timed) parts.push(`${fmtDuration(timed)} waiting`);
    if (nights) parts.push(nights === 1 ? "overnight" : `${nights} nights`);
    return parts.join(" · ");
  }

  const current = () => state.protocols.find((p) => p.id === currentId);

  let saveTimer = 0;
  function saveSoon(p) {
    touch(p);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 500);
  }
  function saveNow(p) {
    if (p) touch(p);
    clearTimeout(saveTimer);
    save();
  }

  function go(next, id) {
    screen = next;
    if (id !== undefined) currentId = id;
    renderAll(true);
    window.scrollTo(0, 0);
  }

  // ---- list ----
  function renderList() {
    const root = $("protoList");
    root.replaceChildren();
    if (run) {
      const b = run.blocks[run.index];
      root.append(el("button", { type: "button", className: "run-banner", onclick: () => go("run") },
        el("span", { className: "pulse" }),
        el("span", {}, el("strong", {}, run.title), el("small", { id: "bannerStatus" }, bannerText())),
        el("span", { className: "chev" }, "›")));
      if (!b) root.lastChild.classList.add("complete");
    }
    if (!state.protocols.length) {
      root.append(el("p", { className: "empty" }, "No protocols yet. Tap + to build one from action and wait blocks."));
      return;
    }
    root.append(el("p", { className: "hint" }, "Tap a protocol to edit it. Swipe left to duplicate or delete."));
    const list = el("ul", { className: "task-list" });
    [...state.protocols].sort((a, b) => (b.updated || 0) - (a.updated || 0)).forEach((p) => {
      const row = el("li", { className: "task-row" });
      const actions = el("div", { className: "swipe-actions" },
        el("button", { type: "button", className: "swipe-edit", onclick: () => duplicate(p) }, "Copy"),
        el("button", { type: "button", className: "swipe-delete", onclick: () => removeProtocol(p) }, "Delete"));
      const card = el("div", { className: "proto-card swipe-card" },
        el("button", { type: "button", className: "proto-open", onclick: () => go("editor", p.id) },
          el("span", { className: "task-title" }, p.title || "Untitled protocol"),
          el("span", { className: "task-meta" }, summary(p))),
        el("button", { type: "button", className: "run-chip", "aria-label": `Run ${p.title || "protocol"}`, disabled: !p.blocks.length, onclick: () => startRun(p) }, "▶ Run"));
      window.TS.enableSwipe(row, card);
      row.append(actions, card);
      list.append(row);
    });
    root.append(list);
  }

  function createProtocol() {
    const p = touch({ id: uid(), created: Date.now(), title: "", blocks: [] });
    state.protocols.push(p);
    saveNow();
    go("editor", p.id);
    setTimeout(() => $("protoTitle")?.focus(), 0);
  }

  function duplicate(p) {
    const copy = touch(JSON.parse(JSON.stringify(p)));
    copy.id = uid();
    copy.created = Date.now();
    copy.title = `${p.title || "Untitled protocol"} (copy)`;
    copy.blocks.forEach((b) => { b.id = uid(); });
    state.protocols.push(copy);
    saveNow();
    renderAll(true);
  }

  function removeProtocol(p) {
    if (!confirm(`Delete “${p.title || "Untitled protocol"}”?`)) return;
    state.protocols = state.protocols.filter((x) => x !== p);
    bury("protocol", p.id);
    saveNow();
    go("list", null);
  }

  // ---- editor ----
  function autoGrow(t) { t.style.height = "auto"; t.style.height = `${t.scrollHeight}px`; }

  // ---- number presets for action text ----
  // One synced settings item. Until it's edited, every device uses the
  // defaults without saving them, so a fresh device can't overwrite your list.
  const PRESETS_ID = "number-presets";
  const DEFAULT_PRESETS = { numbers: ["1", "2", "5", "10", "25", "50", "100", "250", "500"], units: ["ml", "µL", "g", "mg", "°C", "min", "×"] };
  const presets = () => state.settings.find((x) => x.id === PRESETS_ID) || DEFAULT_PRESETS;

  // Typed into the action at the cursor, spaced like "Add 250 ml" / "230°C".
  function insertAtCursor(area, token) {
    const start = area.selectionStart ?? area.value.length;
    const end = area.selectionEnd ?? start;
    const before = area.value.slice(0, start);
    const glue = /^[°%×]/.test(token) || !before || /\s$/.test(before) ? "" : " ";
    const after = area.value.slice(end);
    // Keep a space before following words ("2 Add"), not before punctuation.
    const tail = after && !/^[\s.,;:!?)°%×]/.test(after) ? " " : "";
    area.value = before + glue + token + tail + after;
    const caret = start + glue.length + token.length;
    area.focus();
    area.setSelectionRange(caret, caret);
    area.dispatchEvent(new Event("input"));
  }

  function showPresets(area) {
    document.querySelectorAll(".block-action.editing").forEach((x) => x.classList.remove("editing"));
    area.closest(".block").classList.add("editing");
  }

  function presetBar(area) {
    const { numbers, units } = presets();
    const chip = (text, cls) => el("button", {
      type: "button", className: `preset-chip ${cls}`,
      // Act on press so the textarea keeps focus (and the phone keyboard stays up).
      onpointerdown: (e) => { e.preventDefault(); insertAtCursor(area, text); },
      onclick: (e) => e.preventDefault(),
    }, text);
    return el("div", { className: "preset-bar" },
      el("div", { className: "preset-row" }, numbers.map((n) => chip(n, "num"))),
      el("div", { className: "preset-row" }, units.map((u) => chip(u, "unit")),
        el("button", { type: "button", className: "preset-chip edit", "aria-label": "Edit presets", onclick: openPresets }, "✎ Edit")));
  }

  const presetDialog = $("presetDialog");
  function openPresets() {
    const { numbers, units } = presets();
    $("presetNumbers").value = numbers.join(", ");
    $("presetUnits").value = units.join(", ");
    presetDialog.showModal();
  }
  const splitList = (s) => [...new Set(s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean))].slice(0, 30);
  $("presetCancel").addEventListener("click", () => presetDialog.close());
  $("presetReset").addEventListener("click", () => {
    $("presetNumbers").value = DEFAULT_PRESETS.numbers.join(", ");
    $("presetUnits").value = DEFAULT_PRESETS.units.join(", ");
  });
  $("presetSave").addEventListener("click", () => {
    const item = touch({ id: PRESETS_ID, numbers: splitList($("presetNumbers").value), units: splitList($("presetUnits").value) });
    const at = state.settings.findIndex((x) => x.id === PRESETS_ID);
    if (at === -1) state.settings.push(item); else state.settings[at] = item;
    presetDialog.close();
    saveNow();
    renderEditor();
  });

  function renderEditor() {
    const root = $("protoEditor");
    root.replaceChildren();
    const p = current();
    if (!p) { screen = "list"; return; }

    root.append(el("div", { className: "screen-head" },
      el("button", { type: "button", className: "back", onclick: () => go("list", null) }, "‹ Protocols"),
      el("span", { className: "spacer" }),
      el("button", { type: "button", className: "primary-btn", disabled: !p.blocks.length, onclick: () => startRun(p) }, "▶ Run")));

    root.append(el("input", {
      id: "protoTitle", className: "proto-title", placeholder: "Protocol name", value: p.title, maxLength: 120,
      autocomplete: "off", oninput: (e) => { p.title = e.target.value; saveSoon(p); },
    }));

    const list = el("ol", { className: "block-list" });
    p.blocks.forEach((b, i) => list.append(blockCard(p, b, i)));
    if (!p.blocks.length) list.append(el("li", { className: "empty" }, "Add action and wait blocks to build the protocol."));
    root.append(list);

    root.append(el("div", { className: "add-blocks" },
      el("button", { type: "button", className: "add-action", onclick: () => addBlock(p, "action") }, "+ Action"),
      el("button", { type: "button", className: "add-wait", onclick: () => addBlock(p, "wait") }, "+ Wait")));

    root.append(el("button", { type: "button", className: "delete-protocol", onclick: () => removeProtocol(p) }, "Delete protocol"));
    root.querySelectorAll("textarea").forEach(autoGrow);
  }

  function blockCard(p, b, i) {
    const move = (dir) => {
      const j = i + dir;
      if (j < 0 || j >= p.blocks.length) return;
      [p.blocks[i], p.blocks[j]] = [p.blocks[j], p.blocks[i]];
      saveNow(p);
      renderEditor();
    };
    const head = el("div", { className: "block-head" },
      el("span", { className: "step-no" }, String(i + 1)),
      el("span", { className: "block-kind" }, b.type === "action" ? "Action" : "Wait"),
      el("span", { className: "spacer" }),
      el("button", { type: "button", className: "mini", "aria-label": "Move up", disabled: i === 0, onclick: () => move(-1) }, "↑"),
      el("button", { type: "button", className: "mini", "aria-label": "Move down", disabled: i === p.blocks.length - 1, onclick: () => move(1) }, "↓"),
      el("button", { type: "button", className: "mini", "aria-label": "Duplicate block", onclick: () => {
        p.blocks.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(b)), id: uid() });
        saveNow(p);
        renderEditor();
      } }, "⧉"),
      el("button", { type: "button", className: "mini danger", "aria-label": "Delete block", onclick: () => {
        p.blocks.splice(i, 1);
        saveNow(p);
        renderEditor();
      } }, "✕"));

    if (b.type === "action") {
      const area = el("textarea", {
        className: "block-text", rows: 1, placeholder: "What to do…", value: b.text || "",
        oninput: (e) => { b.text = e.target.value; autoGrow(e.target); saveSoon(p); },
        // Show the number presets under the action being edited.
        onfocus: () => showPresets(area),
        onpointerdown: () => showPresets(area),
      });
      return el("li", { className: "block block-action" }, head, area, presetBar(area));
    }
    return el("li", { className: "block block-wait" }, head,
      el("button", { type: "button", className: `wait-display ${b.wait.mode}`, onclick: () => openWait(b.wait, (w) => { b.wait = w; saveNow(p); renderEditor(); }) },
        el("span", { className: "wait-icon" }, b.wait.mode === "overnight" ? "☾" : "⏱"),
        waitLabel(b.wait),
        el("span", { className: "edit-hint" }, "Change")),
      el("input", {
        className: "block-note", placeholder: "Label (optional), e.g. Let it rest", value: b.text || "", maxLength: 120,
        oninput: (e) => { b.text = e.target.value; saveSoon(p); },
      }));
  }

  function addBlock(p, type) {
    if (type === "action") {
      p.blocks.push({ id: uid(), type: "action", text: "" });
      saveNow(p);
      renderEditor();
      const areas = $("protoEditor").querySelectorAll(".block-text");
      areas[areas.length - 1]?.focus();
      return;
    }
    openWait({ mode: "timer", seconds: 0 }, (w) => {
      p.blocks.push({ id: uid(), type: "wait", text: "", wait: w });
      saveNow(p);
      renderEditor();
    });
  }

  // ---- wait dialog (microwave keypad) ----
  const waitDialog = $("waitDialog");
  let buffer = "";
  let waitMode = "timer";
  let onWaitSave = null;

  const secondsFromBuffer = () => {
    const d = buffer.padStart(6, "0");
    return Number(d.slice(0, 2)) * 3600 + Number(d.slice(2, 4)) * 60 + Number(d.slice(4, 6));
  };
  const bufferFromSeconds = (sec) => {
    sec = Math.min(MAX_SECONDS, Math.max(0, sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return `${h}${pad(m)}${pad(s)}`.replace(/^0+/, "");
  };

  function paintWait() {
    const d = buffer.padStart(6, "0");
    const digits = $("mwDisplay").querySelectorAll(".d");
    // Digits the user has typed light up; the zero padding stays dim.
    [...d].forEach((ch, i) => {
      digits[i].textContent = ch;
      digits[i].classList.toggle("typed", i >= 6 - buffer.length);
    });
    const sec = secondsFromBuffer();
    $("mwSummary").textContent = sec ? `= ${fmtDuration(sec)}` : "Type a time — like a microwave";
    waitDialog.querySelectorAll("[data-wait-mode]").forEach((b) => b.classList.toggle("active", b.dataset.waitMode === waitMode));
    $("timerPane").hidden = waitMode !== "timer";
    $("overnightPane").hidden = waitMode !== "overnight";
    $("waitError").hidden = true;
  }

  function openWait(wait, onSave) {
    onWaitSave = onSave;
    waitMode = wait.mode;
    buffer = wait.mode === "timer" ? bufferFromSeconds(wait.seconds || 0) : "";
    paintWait();
    waitDialog.showModal();
  }

  function press(key) {
    if (key === "back") buffer = buffer.slice(0, -1);
    else if (key === "clear") buffer = "";
    else if (buffer.length < 6 && !(buffer === "" && key === "0")) buffer += key;
    paintWait();
  }

  waitDialog.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.key) press(t.dataset.key);
    else if (t.dataset.add) { buffer = bufferFromSeconds(secondsFromBuffer() + Number(t.dataset.add)); paintWait(); }
    else if (t.dataset.waitMode) { waitMode = t.dataset.waitMode; paintWait(); }
  });
  waitDialog.addEventListener("keydown", (e) => {
    if (waitMode !== "timer" || e.target.tagName === "INPUT") return;
    if (/^\d$/.test(e.key)) { press(e.key); e.preventDefault(); }
    else if (e.key === "Backspace") { press("back"); e.preventDefault(); }
    else if (e.key === "Enter") { $("waitSave").click(); e.preventDefault(); }
  });
  $("waitCancel").addEventListener("click", () => waitDialog.close());
  $("waitSave").addEventListener("click", () => {
    let wait;
    if (waitMode === "timer") {
      const seconds = secondsFromBuffer();
      if (!seconds) { $("waitError").hidden = false; return; }
      wait = { mode: "timer", seconds };
    } else {
      wait = { mode: "overnight" };
    }
    waitDialog.close();
    onWaitSave?.(wait);
  });

  // ---- running a protocol ----
  // The run lives on this device only; it snapshots the blocks so editing
  // the protocol mid-run can't shift the steps underneath it.
  let run = null;
  try { run = JSON.parse(localStorage.getItem(RUN_KEY)); } catch (e) { run = null; }
  const saveRun = () => {
    try { run ? localStorage.setItem(RUN_KEY, JSON.stringify(run)) : localStorage.removeItem(RUN_KEY); } catch (e) { /* storage blocked */ }
  };

  let audio = null;
  function unlockAudio() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
    } catch (e) { audio = null; }
  }
  function alarm(text) {
    if (audio) {
      const t0 = audio.currentTime;
      [0, 0.25, 0.5].forEach((dt) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, t0 + dt);
        g.gain.exponentialRampToValueAtTime(0.3, t0 + dt + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.18);
        o.connect(g).connect(audio.destination);
        o.start(t0 + dt);
        o.stop(t0 + dt + 0.2);
      });
    }
    if (navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.([200, 100, 200, 100, 400]);
    if (document.hidden && "Notification" in window && Notification.permission === "granted") {
      navigator.serviceWorker?.ready.then((reg) => reg.showNotification(run ? run.title : "Task & Schedule", {
        body: text, tag: "taskschedule-run", icon: "icon-192.png", renotify: true,
      })).catch(() => {});
    }
  }

  function startRun(p) {
    if (!p.blocks.length) return;
    if (run && run.blocks[run.index] && !confirm(`Stop “${run.title}” and start “${p.title || "Untitled protocol"}”?`)) return;
    unlockAudio();
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    run = {
      protocolId: p.id, title: p.title || "Untitled protocol",
      blocks: JSON.parse(JSON.stringify(p.blocks)),
      index: 0, startedAt: Date.now(), stepStart: 0, waitEnd: null, pausedLeft: null,
    };
    enterStep(0, Date.now());
    go("run");
  }

  function enterStep(i, at) {
    run.index = i;
    run.stepStart = at;
    run.pausedLeft = null;
    const b = run.blocks[i];
    if (b && b.type === "wait") {
      run.waitEnd = b.wait.mode === "overnight" ? null : at + b.wait.seconds * 1000;
    } else {
      run.waitEnd = null;
    }
    if (!b) run.finishedAt = at;
    saveRun();
  }

  // Finishes any waits whose time has passed (several, if the app was closed).
  function tick() {
    if (!run) return;
    let advanced = false;
    let b = run.blocks[run.index];
    while (b && b.type === "wait" && !isOvernight(b) && run.pausedLeft == null && Date.now() >= run.waitEnd) {
      enterStep(run.index + 1, run.waitEnd);
      advanced = true;
      b = run.blocks[run.index];
    }
    if (advanced) {
      alarm(b ? (b.type === "action" ? `Next: ${b.text || "action"}` : "Wait finished") : "Protocol complete");
      renderAll();
      return;
    }
    // Crossing midnight with the run screen open: show that it's ready.
    if (isOvernight(b) && screen === "run" && overnightReady() && !$("overnightReady")) { renderAll(); return; }
    const left = $("runCountdown");
    if (left && b && b.type === "wait" && !isOvernight(b)) {
      const ms = run.pausedLeft ?? run.waitEnd - Date.now();
      left.textContent = fmtClock(ms / 1000);
      const total = run.waitEnd - run.stepStart;
      const bar = $("runProgress");
      if (bar && total > 0) bar.style.width = `${Math.min(100, (1 - ms / total) * 100)}%`;
    }
    const banner = $("bannerStatus");
    if (banner) banner.textContent = bannerText();
  }
  setInterval(tick, 500);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });

  function bannerText() {
    if (!run) return "";
    const b = run.blocks[run.index];
    if (!b) return "Complete";
    const step = `Step ${run.index + 1}/${run.blocks.length}`;
    if (b.type === "action") return `${step} · ${b.text || "Action"}`;
    if (isOvernight(b)) return `${step} · ${overnightReady() ? "Overnight done, ready to continue" : "Overnight, continue tomorrow"}`;
    const ms = run.pausedLeft ?? run.waitEnd - Date.now();
    return `${step} · ${run.pausedLeft != null ? "Paused" : "Waiting"} ${fmtClock(ms / 1000)}`;
  }

  function renderRun() {
    const root = $("protoRun");
    root.replaceChildren();
    if (!run) { screen = "list"; return; }
    const b = run.blocks[run.index];

    root.append(el("div", { className: "screen-head" },
      el("button", { type: "button", className: "back", onclick: () => go("list", null) }, "‹ Protocols"),
      el("span", { className: "spacer" }),
      b ? el("button", { type: "button", className: "ghost-btn danger", onclick: () => {
        if (!confirm("Stop this run?")) return;
        run = null; saveRun(); go("list", null);
      } }, "Stop") : null));
    root.append(el("h2", { className: "run-title" }, run.title));

    if (!b) {
      const mins = Math.round((run.finishedAt - run.startedAt) / 60000);
      root.append(el("div", { className: "now-card done-card" },
        el("p", { className: "now-kind" }, "Complete"),
        el("p", { className: "now-text" }, "All steps done."),
        el("p", { className: "now-sub" }, `Took ${mins >= 60 ? fmtDuration(mins * 60) : `${mins} min`}`),
        el("button", { type: "button", className: "primary-btn big", onclick: () => { run = null; saveRun(); go("list", null); } }, "Finish")));
    } else if (b.type === "action") {
      root.append(el("div", { className: "now-card action-card" },
        el("p", { className: "now-kind" }, `Step ${run.index + 1} of ${run.blocks.length} · Action`),
        el("p", { className: "now-text" }, b.text || "Action"),
        el("button", { type: "button", className: "primary-btn big", onclick: () => { unlockAudio(); enterStep(run.index + 1, Date.now()); renderAll(); } }, "Done ✓")));
    } else if (isOvernight(b)) {
      const ready = overnightReady();
      const next = () => { unlockAudio(); enterStep(run.index + 1, Date.now()); renderAll(); };
      root.append(el("div", { className: "now-card wait-card" },
        el("p", { className: "now-kind" }, `Step ${run.index + 1} of ${run.blocks.length} · Overnight`),
        el("p", { className: "countdown moon", ...(ready ? { id: "overnightReady" } : {}) }, "☾"),
        b.text ? el("p", { className: "now-text" }, b.text) : null,
        el("p", { className: "now-sub" }, ready
          ? "It's the next day. Continue when you're ready."
          : `Started ${new Date(run.stepStart).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}. Come back tomorrow.`),
        ready
          ? el("button", { type: "button", className: "primary-btn big", onclick: next }, "Continue")
          : el("div", { className: "run-controls" },
            el("button", { type: "button", className: "ghost-btn", onclick: () => { if (confirm("Continue before the night is over?")) next(); } }, "Continue now"))));
    } else {
      const paused = run.pausedLeft != null;
      const ms = paused ? run.pausedLeft : run.waitEnd - Date.now();
      root.append(el("div", { className: "now-card wait-card" },
        el("p", { className: "now-kind" }, `Step ${run.index + 1} of ${run.blocks.length} · Wait`),
        b.text ? el("p", { className: "now-sub" }, b.text) : null,
        el("p", { className: "countdown", id: "runCountdown" }, fmtClock(ms / 1000)),
        el("div", { className: "progress" }, el("div", { id: "runProgress" })),
        el("p", { className: "now-sub" }, paused ? "Paused" : `Ends ${new Date(run.waitEnd).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}`),
        el("div", { className: "run-controls" },
          el("button", { type: "button", className: "ghost-btn", onclick: () => {
            if (paused) { run.waitEnd = Date.now() + run.pausedLeft; run.pausedLeft = null; }
            else run.pausedLeft = Math.max(0, run.waitEnd - Date.now());
            saveRun(); renderAll();
          } }, paused ? "Resume" : "Pause"),
          el("button", { type: "button", className: "ghost-btn", onclick: () => {
            if (paused) run.pausedLeft += 60000; else run.waitEnd += 60000;
            saveRun(); renderAll();
          } }, "+1 min"),
          el("button", { type: "button", className: "ghost-btn", onclick: () => { enterStep(run.index + 1, Date.now()); renderAll(); } }, "Skip"))));
    }

    const steps = el("ol", { className: "run-steps" });
    run.blocks.forEach((s, i) => {
      steps.append(el("li", { className: `run-step ${s.type}${i < run.index ? " past" : ""}${i === run.index ? " now" : ""}` },
        el("span", { className: "step-no" }, i < run.index ? "✓" : String(i + 1)),
        el("span", {}, s.type === "action" ? (s.text || "Action") : `${waitLabel(s.wait)}${s.text ? ` — ${s.text}` : ""}`)));
    });
    root.append(el("h3", { className: "section-label" }, "Steps"), steps);
    if (b && run.index > 0) {
      root.append(el("button", { type: "button", className: "link-btn", onclick: () => { enterStep(run.index - 1, Date.now()); renderAll(); } }, "‹ Go back a step"));
    }
    tick();
  }

  // ---- wiring ----
  function renderAll(force) {
    $("protoList").hidden = screen !== "list";
    $("protoEditor").hidden = screen !== "editor";
    $("protoRun").hidden = screen !== "run";
    if (screen === "list") renderList();
    // Don't rebuild the editor under the user's cursor (e.g. after a sync).
    else if (screen === "editor" && (force || !$("protoEditor").contains(document.activeElement))) renderEditor();
    else if (screen === "run") renderRun();
    $("addButton").hidden = currentView === "protocolsView" && screen !== "list";
    document.querySelector('.tab[data-view="protocolsView"]').classList.toggle("running", !!(run && run.blocks[run.index]));
  }

  window.TS.renderHooks.push(() => renderAll());
  window.TS.viewHooks.push((view) => { currentView = view; renderAll(); });
  window.TS.addHandlers.protocolsView = createProtocol;
  tick();
  renderAll(true);
})();
