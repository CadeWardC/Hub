(() => {
  "use strict";

  const { state, save, touch, bury, uid, pad } = window.TS;
  const $ = (id) => document.getElementById(id);
  const RUN_KEY = "taskschedule.run";
  const MAX_SECONDS = 99 * 3600 + 59 * 60 + 59;

  let screen = "list"; // list | editor | run
  let currentId = null;
  let currentView = document.querySelector(".view.active").id;
  let selecting = false; // editor "Select" mode
  const selected = new Set(); // block ids picked in Select mode
  let trail = []; // parent protocol ids when you open a nested protocol

  // Small DOM builder: el("div", { className: "x", onclick: fn }, child, "text")
  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else if (k === "dataset") Object.assign(node.dataset, v);
      else if (k in node && k !== "list") node[k] = v; // input.list is read-only
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

  // A wait's words wrap around its time: "Incubate for" -> "Incubate for 10
  // minutes"; "Incubate ___ at 37°C" puts the time where the ___ is.
  function fmtLong(sec) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const unit = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
    const parts = [];
    if (h) parts.push(unit(h, "hour"));
    if (m) parts.push(unit(m, "minute"));
    if (s || !parts.length) parts.push(unit(s, "second"));
    return parts.join(" ");
  }
  function waitSentence(b) {
    const time = b.wait.mode === "overnight" ? "overnight" : fmtLong(b.wait.seconds);
    const words = (b.text || "").trim();
    if (!words.replace(/_{3,}/, "").trim()) return `Wait ${time}`;
    return /_{3,}/.test(words) ? words.replace(/_{3,}/, time) : `${words} ${time}`;
  }
  // Width of an input's text in its own font, so word boxes hug their words.
  const measure = document.createElement("canvas").getContext("2d");
  function fitWidth(box) {
    measure.font = getComputedStyle(box).font;
    box.style.width = `${Math.ceil(measure.measureText(box.value || box.placeholder).width) + 14}px`;
  }

  // The wait's words split around the time: [before, after].
  function waitWords(b) {
    const text = b.text || "";
    const at = text.search(/_{3,}/);
    if (at === -1) return [text.trim(), ""];
    return [text.slice(0, at).trim(), text.slice(at).replace(/^_{3,}/, "").trim()];
  }

  function summary(p) {
    const blocks = flatten(p);
    const actions = blocks.filter((b) => b.type === "action").length;
    const waits = blocks.filter((b) => b.type === "wait");
    const timed = waits.filter((b) => b.wait.mode === "timer").reduce((n, b) => n + b.wait.seconds, 0);
    const nights = waits.filter((b) => b.wait.mode === "overnight").length;
    const parts = [`${blocks.length} step${blocks.length === 1 ? "" : "s"}`];
    if (actions) parts.push(`${actions} action${actions === 1 ? "" : "s"}`);
    if (timed) parts.push(`${fmtDuration(timed)} waiting`);
    if (nights) parts.push(nights === 1 ? "overnight" : `${nights} nights`);
    return parts.join(" · ");
  }

  const current = () => state.protocols.find((p) => p.id === currentId);

  // ---- nested protocols ----
  // A block { type: "protocol", protocolId } runs another protocol's steps in
  // its place. Loops are blocked when adding, and skipped when running.
  const byId = (id) => state.protocols.find((x) => x.id === id);
  const titleOf = (p) => (p && p.title) || "Untitled protocol";
  function includes(p, targetId, seen = new Set()) {
    if (!p || seen.has(p.id)) return false;
    seen.add(p.id);
    return p.blocks.some((b) => b.type === "protocol" && (b.protocolId === targetId || includes(byId(b.protocolId), targetId, seen)));
  }
  // Steps with nested protocols opened up in place; `path` names the nested
  // protocol(s) each step came from.
  //
  // With a protocol preset (p.variants: [{id, name}]) chosen by name, steps the
  // preset leaves out (block.skip has its id) are dropped, and its blank values
  // (block.values[id]) ride along as `fill`. Nested protocols use their own
  // preset with the same name, if they have one.
  const findVariant = (p, name) => (name && (p.variants || []).find((v) => v.name.trim().toLowerCase() === name.trim().toLowerCase())) || null;
  function flatten(p, path = [], seen = new Set(), variantName = null) {
    if (!p || seen.has(p.id)) return [];
    const inside = new Set(seen).add(p.id);
    const v = findVariant(p, variantName);
    return p.blocks.flatMap((b) => {
      if (v && (b.skip || []).includes(v.id)) return [];
      if (b.type !== "protocol") {
        const copy = { ...JSON.parse(JSON.stringify(b)), path };
        if (v && b.values?.[v.id]) copy.fill = [...b.values[v.id]];
        return [copy];
      }
      const sub = byId(b.protocolId);
      return sub ? flatten(sub, [...path, titleOf(sub)], inside, variantName) : [];
    });
  }
  const usedIn = (p) => state.protocols.filter((x) => x !== p && x.blocks.some((b) => b.type === "protocol" && b.protocolId === p.id));

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
    if (next === "list") trail = [];
    if (next !== "editor" || id !== currentId) { selecting = false; selected.clear(); }
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
    // Grouped by p.group (set in the editor); ungrouped ones come first.
    const groups = new Map();
    [...state.protocols].sort((a, b) => (b.updated || 0) - (a.updated || 0)).forEach((p) => {
      const g = groupOf(p);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(p);
    });
    const names = [...groups.keys()].sort((a, b) => a.localeCompare(b)); // "" sorts first
    const folded = foldedGroups();
    names.forEach((g) => {
      const list = el("ul", { className: "task-list" });
      groups.get(g).forEach((p) => list.append(protoRow(p)));
      if (!g) { root.append(list); return; }
      const open = !folded.includes(g);
      list.hidden = !open;
      root.append(el("button", { type: "button", className: `group-head${open ? " open" : ""}`, "aria-expanded": String(open), onclick: () => {
        setFolded(g, open);
        renderList();
      } }, el("span", { className: "chev" }, "›"), el("span", {}, g), el("small", {}, String(groups.get(g).length))), list);
    });
  }
  const groupOf = (p) => (p.group || "").trim();
  // Which groups are folded is a per-device view choice, not synced.
  const FOLD_KEY = "taskschedule.protoGroups";
  function foldedGroups() {
    try { return JSON.parse(localStorage.getItem(FOLD_KEY)) || []; } catch (e) { return []; }
  }
  function setFolded(g, fold) {
    const list = foldedGroups().filter((x) => x !== g);
    if (fold) list.push(g);
    try { localStorage.setItem(FOLD_KEY, JSON.stringify(list)); } catch (e) { /* storage blocked */ }
  }
  function protoRow(p) {
    const row = el("li", { className: "task-row" });
    const actions = el("div", { className: "swipe-actions" },
      el("button", { type: "button", className: "swipe-edit", onclick: () => duplicate(p) }, "Duplicate"),
      el("button", { type: "button", className: "swipe-delete", onclick: () => removeProtocol(p) }, "Delete"));
    const card = el("div", { className: "proto-card swipe-card" },
      el("button", { type: "button", className: "proto-open", onclick: () => go("editor", p.id) },
        el("span", { className: "task-title" }, p.title || "Untitled protocol"),
        el("span", { className: "task-meta" }, summary(p)),
        usedIn(p).length ? el("span", { className: "task-meta used-in" }, `Used in ${usedIn(p).map(titleOf).join(", ")}`) : null),
      el("button", { type: "button", className: "run-chip copy-chip", title: "Copy as bullet points (for OneNote)", "aria-label": `Copy ${titleOf(p)} as bullet points`, disabled: !p.blocks.length, onclick: () => startCopy(p) }, "Copy"),
      el("button", { type: "button", className: "run-chip", "aria-label": `Run ${p.title || "protocol"}`, disabled: !flatten(p).length, onclick: () => startRun(p) }, "▶ Run"));
    window.TS.enableSwipe(row, card);
    row.append(actions, card);
    return row;
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
    const parents = usedIn(p);
    const note = parents.length ? `\n\nIt's used in ${parents.map(titleOf).join(", ")}; that step will be removed there.` : "";
    if (!confirm(`Delete “${titleOf(p)}”?${note}`)) return;
    parents.forEach((parent) => {
      parent.blocks = parent.blocks.filter((b) => !(b.type === "protocol" && b.protocolId === p.id));
      touch(parent);
    });
    state.protocols = state.protocols.filter((x) => x !== p);
    bury("protocol", p.id);
    saveNow();
    go("list", null);
  }

  // ---- editor ----
  function autoGrow(t) { t.style.height = "auto"; t.style.height = `${t.scrollHeight}px`; }

  // ---- blanks in action text ----
  // "___" (three or more underscores) in an action is a blank. When the step
  // comes up in a run, that block's presets pop up so you can fill each one in.
  const BLANK = /_{3,}/g;
  const splitList = (str) => [...new Set(str.split(/[,\n]/).map((x) => x.trim()).filter(Boolean))].slice(0, 30);

  // Typed into the action at the cursor, spaced like "Add ___ ml".
  function insertAtCursor(area, token) {
    const start = area.selectionStart ?? area.value.length;
    const end = area.selectionEnd ?? start;
    const before = area.value.slice(0, start);
    const glue = !before || /\s$/.test(before) ? "" : " ";
    const after = area.value.slice(end);
    const tail = after && !/^[\s.,;:!?)°%×]/.test(after) ? " " : "";
    area.value = before + glue + token + tail + after;
    const caret = start + glue.length + token.length;
    area.focus();
    area.setSelectionRange(caret, caret);
    area.dispatchEvent(new Event("input"));
  }

  // Each action block has one preset list (block.presets). A preset holds one
  // value per blank, in order (["250", "5"] fills "Add ___ ml and ___ g"); a
  // one-value preset fills whichever blank you're on. Edited under the block:
  // Add, × to remove, tap a preset to load it back into the fields.
  const blankTotal = (text) => ((text || "").match(BLANK) || []).length;
  const presetValues = (v) => (Array.isArray(v) ? v : [v]);
  const presetKey = (v) => presetValues(v).join("\u0001");
  const presetLabel = (v) => presetValues(v).join(" · ");

  function renderPresetEditor(box, p, b) {
    const n = blankTotal(b.text);
    box.hidden = !n;
    box.dataset.blanks = String(n);
    if (!n) { box.replaceChildren(); return; }
    b.presets = b.presets || [];

    const fields = Array.from({ length: n }, (_, k) => el("input", {
      className: "preset-add",
      placeholder: n > 1 ? `Blank ${k + 1}` : (b.presets.length ? "Add more, e.g. 750" : "Add presets, e.g. 100, 250, 500"),
      inputMode: "decimal", autocomplete: "off", spellcheck: false,
    }));
    const has = (key) => b.presets.some((x) => presetKey(x) === key);
    const add = () => {
      let fresh;
      if (n === 1) {
        fresh = splitList(fields[0].value).map((v) => [v]);
      } else {
        const values = fields.map((f) => f.value.trim());
        const empty = values.findIndex((v) => !v);
        if (empty !== -1) { fields[empty].focus(); return; }
        fresh = [values];
      }
      fresh = fresh.filter((v) => !has(presetKey(v)));
      fields.forEach((f) => { f.value = ""; });
      if (!fresh.length) return;
      b.presets.push(...fresh);
      saveNow(p);
      renderPresetEditor(box, p, b);
      box.querySelector(".preset-add").focus();
    };
    fields.forEach((f, k) => f.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (k < n - 1) fields[k + 1].focus(); else add();
    }));
    const remove = (v) => { b.presets = b.presets.filter((x) => presetKey(x) !== presetKey(v)); saveNow(p); };

    box.replaceChildren(
      el("span", { className: "preset-title" }, n > 1 ? `Quick picks · one value per blank (${n})` : "Quick picks for the blank"),
      b.presets.length ? el("div", { className: "preset-tags" }, b.presets.map((v) => el("span", { className: "preset-tag" },
        el("button", { type: "button", className: "preset-val", title: "Edit", onclick: () => {
          remove(v);
          renderPresetEditor(box, p, b);
          const inputs = box.querySelectorAll(".preset-add");
          presetValues(v).slice(0, inputs.length).forEach((val, k) => { inputs[k].value = val; });
          inputs[0].focus();
        } }, presetLabel(v)),
        el("button", { type: "button", className: "preset-x", "aria-label": `Remove ${presetLabel(v)}`, onclick: () => { remove(v); renderPresetEditor(box, p, b); } }, "×")))) : null,
      el("div", { className: "preset-add-row" },
        el("div", { className: `preset-fields${n > 1 ? " multi" : ""}` }, fields),
        el("button", { type: "button", className: "ghost-btn", onclick: add }, "Add")));
  }

  // Action text with each blank replaced by its value (or left as ___).
  function fillText(text, fills) {
    let k = 0;
    return (text || "Action").replace(BLANK, () => (fills && fills[k++]) || "___");
  }

  function renderEditor() {
    const root = $("protoEditor");
    root.replaceChildren();
    const p = current();
    if (!p) { screen = "list"; return; }

    const parent = byId(trail[trail.length - 1]);
    root.append(el("div", { className: "screen-head" },
      el("button", { type: "button", className: "back", onclick: () => {
        const up = trail.pop();
        if (up && byId(up)) go("editor", up); else go("list", null);
      } }, parent ? `‹ ${titleOf(parent)}` : "‹ Protocols"),
      el("span", { className: "spacer" }),
      p.blocks.length ? el("button", { type: "button", className: "ghost-btn", onclick: () => {
        selecting = !selecting;
        selected.clear();
        renderEditor();
      } }, selecting ? "Cancel" : "Select") : null,
      selecting ? null : el("button", { type: "button", className: "ghost-btn", disabled: !p.blocks.length, title: "Copy as bullet points (for OneNote)", onclick: () => startCopy(p) }, "Copy"),
      selecting ? null : el("button", { type: "button", className: "primary-btn", disabled: !flatten(p).length, onclick: () => startRun(p) }, "▶ Run")));

    root.append(el("input", {
      id: "protoTitle", className: "proto-title", placeholder: "Protocol name", value: p.title, maxLength: 120,
      autocomplete: "off", oninput: (e) => { p.title = e.target.value; saveSoon(p); },
    }));

    if (!selecting) {
      const others = [...new Set(state.protocols.map(groupOf).filter(Boolean))].sort();
      root.append(el("label", { className: "group-field" }, "Group",
        el("input", { value: p.group || "", placeholder: "None", maxLength: 60, autocomplete: "off", list: "protoGroupNames",
          oninput: (e) => { p.group = e.target.value.trim(); saveSoon(p); } }),
        el("datalist", { id: "protoGroupNames" }, others.map((g) => el("option", { value: g })))));
      root.append(variantBar(p));
    }

    const list = el("ol", { className: `block-list${selecting ? " selecting" : ""}` });
    p.blocks.forEach((b, i) => list.append(selecting ? selectCard(p, b, i) : blockCard(p, b, i)));
    if (!p.blocks.length) list.append(el("li", { className: "empty" }, "Add action and wait blocks to build the protocol."));
    root.append(list);

    if (selecting) {
      root.append(el("p", { className: "hint" }, "Tap the steps to move into a new protocol. They'll be replaced here by one step that runs it."));
      root.append(el("div", { className: "select-bar" },
        el("span", {}, `${selected.size} selected`),
        el("span", { className: "spacer" }),
        el("button", { type: "button", className: "primary-btn", disabled: !selected.size, onclick: () => extractProtocol(p) }, "Make protocol")));
      return;
    }

    root.append(el("div", { className: "add-blocks three" },
      el("button", { type: "button", className: "add-action", onclick: () => addBlock(p, "action") }, "+ Action"),
      el("button", { type: "button", className: "add-wait", onclick: () => addBlock(p, "wait") }, "+ Wait"),
      el("button", { type: "button", className: "add-protocol", onclick: () => pickProtocol(p) }, "+ Protocol")));

    root.append(el("button", { type: "button", className: "delete-protocol", onclick: () => removeProtocol(p) }, "Delete protocol"));
    root.querySelectorAll("textarea").forEach(autoGrow);
  }

  // ---- protocol presets ----
  // Named versions of a protocol (e.g. "Small batch", "Large batch"). Each
  // preset can leave steps out and has its own values for every blank; Run
  // asks which one to use and fills the blanks in for you.
  function variantBar(p) {
    const vs = p.variants || [];
    const add = () => {
      const name = prompt("Name for the preset, e.g. Large batch");
      if (!name || !name.trim()) return;
      p.variants = [...vs, { id: uid(), name: name.trim() }];
      saveNow(p);
      renderEditor();
    };
    return el("div", { className: "variant-bar" },
      el("span", { className: "preset-title" }, "Protocol presets"),
      el("div", { className: "preset-tags" },
        vs.map((v) => el("span", { className: "preset-tag variant" },
          el("button", { type: "button", className: "preset-val", title: "Rename", onclick: () => {
            const name = prompt("Rename preset", v.name);
            if (!name || !name.trim()) return;
            v.name = name.trim();
            saveNow(p);
            renderEditor();
          } }, v.name),
          el("button", { type: "button", className: "preset-x", "aria-label": `Remove ${v.name}`, onclick: () => {
            if (!confirm(`Remove the preset “${v.name}”? Its values are deleted too.`)) return;
            p.variants = vs.filter((x) => x !== v);
            p.blocks.forEach((b) => {
              if (b.skip) { b.skip = b.skip.filter((id) => id !== v.id); if (!b.skip.length) delete b.skip; }
              if (b.values) delete b.values[v.id];
            });
            saveNow(p);
            renderEditor();
          } }, "×"))),
        el("button", { type: "button", className: "add-blank", onclick: add }, "+ Preset")),
      vs.length ? null : el("span", { className: "hint" }, "Add presets (like Small / Large batch) to fill in blanks and choose steps automatically when you run."));
  }

  // Under each step: which presets include it, and each preset's blank values.
  function variantBox(p, b) {
    const box = el("div", { className: "variant-box" });
    const paint = () => {
      const vs = p.variants || [];
      const n = b.type === "action" ? blankTotal(b.text) : 0;
      const skip = new Set(b.skip || []);
      const toggle = (v) => {
        if (skip.has(v.id)) skip.delete(v.id); else skip.add(v.id);
        if (skip.size) b.skip = [...skip]; else delete b.skip;
        saveNow(p);
        paint();
      };
      box.replaceChildren(
        el("div", { className: "variant-toggles" },
          el("span", { className: "preset-title" }, "In"),
          vs.map((v) => el("button", {
            type: "button", className: `variant-toggle${skip.has(v.id) ? "" : " on"}`,
            "aria-pressed": String(!skip.has(v.id)), onclick: () => toggle(v),
          }, v.name))),
        n ? el("div", { className: "variant-values" }, vs.filter((v) => !skip.has(v.id)).map((v) => el("div", { className: "variant-row" },
          el("span", { className: "variant-name" }, v.name),
          el("div", { className: `preset-fields${n > 1 ? " multi" : ""}` },
            Array.from({ length: n }, (_, k) => el("input", {
              className: "preset-add", placeholder: n > 1 ? `Blank ${k + 1}` : "Value",
              value: b.values?.[v.id]?.[k] || "", inputMode: "decimal", autocomplete: "off",
              oninput: (e) => {
                b.values = b.values || {};
                const arr = b.values[v.id] = b.values[v.id] || [];
                arr[k] = e.target.value.trim();
                saveSoon(p);
              },
            })))))) : null);
    };
    box.repaint = paint;
    paint();
    return box;
  }

  function blockCard(p, b, i) {
    const li = blockCardBody(p, b, i);
    if ((p.variants || []).length) li.append(variantBox(p, b));
    return li;
  }

  function blockCardBody(p, b, i) {
    const move = (dir) => {
      const j = i + dir;
      if (j < 0 || j >= p.blocks.length) return;
      [p.blocks[i], p.blocks[j]] = [p.blocks[j], p.blocks[i]];
      saveNow(p);
      renderEditor();
    };
    const head = el("div", { className: "block-head" },
      el("span", { className: "step-no" }, String(i + 1)),
      el("span", { className: "block-kind" }, b.type === "action" ? "Action" : b.type === "wait" ? "Wait" : "Protocol"),
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
      const presetBox = el("div", { className: "block-presets" });
      const area = el("textarea", {
        className: "block-text", rows: 1, placeholder: "What to do… (use ___ for a blank)", value: b.text || "",
        oninput: (e) => {
          b.text = e.target.value;
          autoGrow(e.target);
          if (String(blankTotal(b.text)) !== presetBox.dataset.blanks) {
            renderPresetEditor(presetBox, p, b);
            presetBox.closest("li")?.querySelector(".variant-box")?.repaint();
          }
          saveSoon(p);
        },
      });
      renderPresetEditor(presetBox, p, b);
      return el("li", { className: "block block-action" }, head, area,
        el("div", { className: "block-tools" },
          el("button", {
            type: "button", className: "add-blank",
            // Act on press so the cursor stays in the text (and the keyboard stays up).
            onpointerdown: (e) => { e.preventDefault(); insertAtCursor(area, "___"); },
            onclick: (e) => { if (e.detail === 0) insertAtCursor(area, "___"); },
          }, "+ Blank")),
        presetBox);
    }
    if (b.type === "protocol") {
      const sub = byId(b.protocolId);
      return el("li", { className: "block block-protocol" }, head,
        sub
          ? el("button", { type: "button", className: "proto-ref", onclick: () => { trail.push(p.id); go("editor", sub.id); } },
            el("span", { className: "proto-ref-icon" }, "▤"),
            el("span", { className: "proto-ref-text" }, el("strong", {}, titleOf(sub)), el("small", {}, summary(sub))),
            el("span", { className: "edit-hint" }, "Open ›"))
          : el("p", { className: "missing" }, "This protocol was deleted."));
    }
    // One line that reads like the step: [words before] [timer] [words after].
    const [beforeText, afterText] = waitWords(b);
    const before = el("input", { className: "wait-word before", placeholder: "words", value: beforeText, maxLength: 80, autocomplete: "off" });
    const after = el("input", { className: "wait-word after", placeholder: "words", value: afterText, maxLength: 80, autocomplete: "off" });
    const sync = () => {
      const a = before.value.trim(), z = after.value.trim();
      b.text = z ? [a, "___", z].filter(Boolean).join(" ") : a;
      saveSoon(p);
    };
    // Each box is as wide as its words, so the line reads like a sentence.
    [before, after].forEach((box) => {
      requestAnimationFrame(() => fitWidth(box));
      box.addEventListener("input", () => { fitWidth(box); sync(); });
    });
    return el("li", { className: "block block-wait" }, head,
      el("div", { className: "wait-line" },
        before,
        el("button", {
          type: "button", className: `time-chip ${b.wait.mode}`, title: "Change the time",
          onclick: () => openWait(b.wait, (w) => { b.wait = w; saveNow(p); renderEditor(); }),
        }, el("span", { className: "wait-icon" }, b.wait.mode === "overnight" ? "☾" : "⏱"), waitLabel(b.wait)),
        after));
  }

  // Compact, tappable card used in Select mode.
  function selectCard(p, b, i) {
    const on = selected.has(b.id);
    const label = b.type === "action" ? (b.text || "Action")
      : b.type === "wait" ? waitSentence(b)
      : `▤ ${titleOf(byId(b.protocolId))}`;
    return el("li", { className: `block block-${b.type} select-card${on ? " picked" : ""}`, onclick: () => {
      if (on) selected.delete(b.id); else selected.add(b.id);
      renderEditor();
    } },
      el("span", { className: "pick-box" }, on ? "✓" : ""),
      el("span", { className: "step-no" }, String(i + 1)),
      el("span", { className: "select-label" }, label));
  }

  // Move the selected steps into a new protocol and leave one step that runs it.
  function extractProtocol(p) {
    const idx = p.blocks.map((b, i) => (selected.has(b.id) ? i : -1)).filter((i) => i !== -1);
    if (!idx.length) return;
    const together = idx[idx.length - 1] - idx[0] + 1 === idx.length;
    if (!together && !confirm("The selected steps aren't next to each other. They'll run together, where the first one is. Continue?")) return;
    const name = prompt("Name for the new protocol", `${titleOf(p)} – part`);
    if (name === null) return;
    const sub = touch({ id: uid(), created: Date.now(), title: name.trim() || "Untitled protocol", blocks: idx.map((i) => p.blocks[i]) });
    // Same presets (same ids), so the moved steps keep their values and
    // the parent's preset picks the matching one by name.
    if ((p.variants || []).length) sub.variants = JSON.parse(JSON.stringify(p.variants));
    const ref = { id: uid(), type: "protocol", protocolId: sub.id };
    p.blocks = p.blocks.filter((b) => !selected.has(b.id));
    p.blocks.splice(idx[0], 0, ref);
    state.protocols.push(sub);
    selecting = false;
    selected.clear();
    saveNow(p);
    renderEditor();
  }

  // Choose an existing protocol to add as a step (never one that contains this one).
  const pickDialog = $("pickDialog");
  function pickProtocol(p) {
    const options = state.protocols.filter((x) => x !== p && !includes(x, p.id));
    const list = $("pickList");
    list.replaceChildren(...(options.length ? options.map((x) => el("button", { type: "button", className: "pick-item", onclick: () => {
      pickDialog.close();
      p.blocks.push({ id: uid(), type: "protocol", protocolId: x.id });
      saveNow(p);
      renderEditor();
    } }, el("strong", {}, titleOf(x)), el("small", {}, summary(x)))) : [el("p", { className: "empty" }, "No other protocols to add yet. Make one first, or use Select to turn steps into one.")]));
    pickDialog.showModal();
  }
  $("pickCancel").addEventListener("click", () => pickDialog.close());

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
        body: text, tag: "taskschedule-run", icon: "app-icon-192.png", renotify: true,
      })).catch(() => {});
    }
  }

  // A protocol with presets asks which one to run; otherwise it starts straight away.
  const runDialog = $("runDialog");
  $("runCancel").addEventListener("click", () => runDialog.close());
  function startRun(p) {
    choosePreset(p, `Run “${titleOf(p)}”`, "Pick a preset: its steps run and its blanks are filled in.",
      "blanks filled in", "fill blanks as you go", (v) => beginRun(p, v));
  }
  function choosePreset(p, title, hint, withText, withoutText, onPick) {
    const vs = p.variants || [];
    if (!vs.length) { onPick(null); return; }
    const option = (v) => {
      const steps = flatten(p, [], new Set(), v ? v.name : null).length;
      return el("button", { type: "button", className: `pick-item${v ? "" : " plain"}`, onclick: () => { runDialog.close(); onPick(v); } },
        el("strong", {}, v ? v.name : "No preset"),
        el("small", {}, v ? `${steps} step${steps === 1 ? "" : "s"}, ${withText}` : `All ${steps} steps, ${withoutText}`));
    };
    $("runTitle").textContent = title;
    $("runHint").textContent = hint;
    $("runList").replaceChildren(...vs.map(option), option(null));
    runDialog.showModal();
  }

  // ---- copy as bullet points ----
  // Steps become a bulleted list (nested protocols as sub-bullets) in Calibri
  // 11pt, OneNote's default, with a plain-text copy alongside for other apps.
  function startCopy(p) {
    choosePreset(p, `Copy “${titleOf(p)}”`, "Pick a preset: its steps are copied with its blanks filled in.",
      "blanks filled in", "blanks left as ___", (v) => copyProtocol(p, v ? v.name : null));
  }
  function bulletTree(p, variantName, seen = new Set()) {
    if (!p || seen.has(p.id)) return [];
    const inside = new Set(seen).add(p.id);
    const v = findVariant(p, variantName);
    return p.blocks.flatMap((b) => {
      if (v && (b.skip || []).includes(v.id)) return [];
      if (b.type === "wait") return [{ text: waitSentence(b) }];
      if (b.type === "action") return [{ text: fillText(b.text, v && b.values?.[v.id]) }];
      const sub = byId(b.protocolId);
      return sub ? [{ text: titleOf(sub), children: bulletTree(sub, variantName, inside) }] : [];
    });
  }
  async function copyProtocol(p, variantName) {
    const items = bulletTree(p, variantName);
    const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
    const font = "font-family:Calibri,sans-serif;font-size:11pt";
    const html = (list) => `<ul style="${font};margin-top:0;margin-bottom:0">${list.map((it) =>
      `<li style="${font}">${esc(it.text)}${it.children && it.children.length ? html(it.children) : ""}</li>`).join("")}</ul>`;
    const plain = (list, depth = 0) => list.map((it) =>
      `${"\t".repeat(depth)}• ${it.text.replace(/\n/g, " ")}\n${it.children ? plain(it.children, depth + 1) : ""}`).join("");
    const conclusion = `<p style="${font};margin:0"><b>Conclusion:</b></p>`;
    const htmlText = `<html><body><!--StartFragment-->${html(items)}${conclusion}<!--EndFragment--></body></html>`;
    const plainText = `${plain(items)}Conclusion:\n`;
    try {
      await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([htmlText], { type: "text/html" }),
        "text/plain": new Blob([plainText], { type: "text/plain" }),
      })]);
    } catch (e) {
      // Older browsers: copy a hidden rendered list the old way.
      const box = el("div", { contentEditable: "true", style: "position:fixed;left:-9999px;top:0" });
      box.innerHTML = html(items) + conclusion;
      document.body.append(box);
      const range = document.createRange();
      range.selectNodeContents(box);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      const ok = document.execCommand("copy");
      sel.removeAllRanges();
      box.remove();
      if (!ok) { window.TS.showToast("Couldn't copy on this device."); return; }
    }
    window.TS.showToast(`Copied ${titleOf(p)}${variantName ? ` · ${variantName}` : ""} as bullet points`);
  }

  function beginRun(p, variant) {
    const blocks = flatten(p, [], new Set(), variant ? variant.name : null);
    if (!blocks.length) return;
    if (run && run.blocks[run.index] && !confirm(`Stop “${run.title}” and start “${titleOf(p)}”?`)) return;
    unlockAudio();
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    // The preset's values fill the blanks up front; any left empty pop up as usual.
    const fills = {};
    blocks.forEach((b, i) => { if (b.fill && b.fill.some(Boolean)) fills[i] = b.fill.map((x) => x || ""); });
    run = {
      protocolId: p.id, title: variant ? `${titleOf(p)} · ${variant.name}` : titleOf(p),
      blocks, fills,
      index: 0, startedAt: Date.now(), stepStart: 0, waitEnd: null, pausedLeft: null,
    };
    enterStep(0, Date.now());
    go("run");
  }

  function enterStep(i, at) {
    run.index = i;
    run.pick = null;
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

  // The current action's text with tappable blanks, plus the preset pop-up
  // for the blank being filled (the first empty one, or the one you tapped).
  function actionWithBlanks(b) {
    const parts = (b.text || "Action").split(/_{3,}/);
    const n = parts.length - 1;
    if (!n) return [el("p", { className: "now-text" }, b.text || "Action")];
    run.fills = run.fills || {};
    const fills = run.fills[run.index] = run.fills[run.index] || [];
    let active = run.pick;
    if (active == null) { active = fills.findIndex((v, k) => k < n && !v); if (active === -1 && fills.length < n) active = fills.length; }
    if (active === -1 || active >= n) active = null;

    const choose = (k, value) => {
      fills[k] = value;
      run.pick = null;
      saveRun();
      renderAll();
    };
    const text = el("p", { className: "now-text" });
    parts.forEach((part, k) => {
      text.append(part);
      if (k < n) {
        text.append(el("button", {
          type: "button", className: `blank-fill${fills[k] ? " filled" : ""}${k === active ? " active" : ""}`,
          onclick: () => { run.pick = k; saveRun(); renderAll(); },
        }, fills[k] || "___"));
      }
    });
    if (active == null) return [text];

    const presets = b.presets || [];
    // A preset with several values fills the blanks in order; one value fills this blank.
    const apply = (v) => {
      const values = presetValues(v);
      if (values.length > 1) {
        values.slice(0, n).forEach((val, k) => { fills[k] = val; });
        run.pick = null;
        saveRun();
        renderAll();
      } else {
        choose(active, values[0]);
      }
    };
    const isOn = (v) => {
      const values = presetValues(v);
      return values.length > 1 ? values.slice(0, n).every((val, k) => fills[k] === val) : fills[active] === values[0];
    };
    const other = el("input", { className: "blank-other", placeholder: presets.length ? "Other…" : "Type a value", inputMode: "decimal", autocomplete: "off" });
    const submitOther = () => { const v = other.value.trim(); if (v) choose(active, v); };
    other.addEventListener("keydown", (e) => { if (e.key === "Enter") submitOther(); });
    const pop = el("div", { className: "blank-pop" },
      el("p", { className: "blank-pop-title" }, n > 1 ? `Fill blank ${active + 1} of ${n}` : "Fill the blank"),
      presets.length ? el("div", { className: "blank-chips" },
        presets.map((v) => el("button", { type: "button", className: `blank-chip${isOn(v) ? " on" : ""}`, onclick: () => apply(v) }, presetLabel(v)))) : null,
      el("div", { className: "blank-other-row" }, other,
        el("button", { type: "button", className: "ghost-btn", onclick: submitOther }, "Set")));
    return [text, pop];
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
        ...actionWithBlanks(b),
        el("button", { type: "button", className: "primary-btn big", onclick: () => { unlockAudio(); enterStep(run.index + 1, Date.now()); renderAll(); } }, "Done ✓")));
    } else if (isOvernight(b)) {
      const ready = overnightReady();
      const next = () => { unlockAudio(); enterStep(run.index + 1, Date.now()); renderAll(); };
      root.append(el("div", { className: "now-card wait-card" },
        el("p", { className: "now-kind" }, `Step ${run.index + 1} of ${run.blocks.length} · Overnight`),
        el("p", { className: "countdown moon", ...(ready ? { id: "overnightReady" } : {}) }, "☾"),
        el("p", { className: "now-text" }, waitSentence(b)),
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
        el("p", { className: "now-text wait-words" }, waitSentence(b)),
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

    // Steps from a nested protocol say which one they belong to.
    if (b?.path?.length) root.querySelector(".now-card")?.prepend(el("p", { className: "now-path" }, b.path.join(" › ")));

    const steps = el("ol", { className: "run-steps" });
    run.blocks.forEach((s, i) => {
      steps.append(el("li", { className: `run-step ${s.type}${i < run.index ? " past" : ""}${i === run.index ? " now" : ""}` },
        el("span", { className: "step-no" }, i < run.index ? "✓" : String(i + 1)),
        el("span", {},
          s.path?.length ? el("small", { className: "step-path" }, `${s.path.join(" › ")} · `) : null,
          s.type === "action" ? fillText(s.text, run.fills?.[i]) : waitSentence(s))));
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
