(() => {
  "use strict";

  // Goals tab: a 9x9 goal chart (Harada / mandala chart). The main goal sits in
  // the middle of the centre block, eight areas around it, and each area is the
  // middle of its own outer block with eight actions around it.
  // Stored as state.goals: { id, grid: 9 blocks x 9 cells, done: ["b-i"], ... }.
  // grid[4][4] is the goal and grid[4][b] is area b's title; grid[b][4] isn't
  // used, since an outer block's middle always shows grid[4][b].

  const { state, save, touch, bury, uid } = window.TS;
  const $ = (id) => document.getElementById(id);
  const CURRENT_KEY = "taskschedule.goalChart";
  const AROUND = [0, 1, 2, 3, 5, 6, 7, 8];

  let currentView = document.querySelector(".view.active").id;
  let zoom = null; // block index being edited, or null for the whole chart
  let saveTimer = null;

  // Small DOM builder, same as protocols.js.
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

  // Shohei Ohtani's high-school chart, offered as a starting example.
  const EXAMPLE = {
    goal: "Get drafted 1st overall (8 teams)",
    areas: [
      ["Body", "Body Care", "Take Supplements", "FSQ 90kg", "Flexibility", "RSQ 130kg", "Stamina", "Range of Motion", "Meals: PM 7 bowls, AM 3 bowls"],
      ["Control", "Improve Instep", "Core Strength", "Maintain Body Axis", "Consistent Release Point", "Remove Insecurities", "Lower Body Strength", "Don't Open Up Body", "Control Mental State"],
      ["Sharpness", "Create Angle of Delivery", "\"Hit\" the Ball from Above", "Wrist Strength", "Don't Overpower", "Lead with Lower Body", "Release the Ball in Front", "Increase Spin Rate", "Range of Motion"],
      ["Mental Toughness", "Set Clear Goals", "Don't Let Plays Affect Emotions", "Calm Mind, Burning Heart", "Thrive on Adversity", "Don't Get Caught Up in the Flow", "Don't Make Waves", "Dedication to Winning", "Be Considerate to Teammates"],
      ["Speed 100mph", "Turn Along Body Axis", "Lower Body Strength", "Increase Body Weight", "Core Strength", "Shoulder Strength", "Range of Motion", "Practice Catching Liners", "Pitch More"],
      ["Personality", "Emotions", "Likability", "Planning", "Consideration", "Thankfulness", "Politeness", "Reliability", "Persistence"],
      ["Karma", "Greetings", "Pick Up Trash", "Keep Room Clean", "Take Care of Equipment", "Show Respect to Umpires", "Be Positive", "Be Someone People Want to Support", "Read Books"],
      ["Pitch Variance", "Increase Ball Count", "Perfect the Forkball", "Sharpness of Slider", "Slow, Dropping Curveball", "Pitch for Finishing Batters", "Use Fastball Form for All Pitches", "Strike/Ball Control", "\"Deep\" Image"],
    ],
  };

  function blankChart() {
    return { id: uid(), grid: Array.from({ length: 9 }, () => Array(9).fill("")), done: [], created: Date.now() };
  }
  function exampleChart() {
    const c = blankChart();
    c.grid[4][4] = EXAMPLE.goal;
    EXAMPLE.areas.forEach(([title, ...actions], n) => {
      const b = AROUND[n];
      c.grid[4][b] = title;
      AROUND.forEach((i, k) => { c.grid[b][i] = actions[k]; });
    });
    return c;
  }

  const textAt = (c, b, i) => (b !== 4 && i === 4 ? c.grid[4][b] : c.grid[b][i]) || "";
  function setText(c, b, i, value) {
    if (b !== 4 && i === 4) c.grid[4][b] = value; else c.grid[b][i] = value;
  }
  const isDone = (c, b, i) => (c.done || []).includes(`${b}-${i}`);
  const isAction = (b, i) => b !== 4 && i !== 4;
  const nameOf = (c) => c.grid[4][4].trim() || "Untitled goal";
  const areaProgress = (c, b) => {
    const filled = AROUND.filter((i) => textAt(c, b, i).trim());
    return { done: filled.filter((i) => isDone(c, b, i)).length, total: filled.length };
  };

  function current() {
    let id = null;
    try { id = localStorage.getItem(CURRENT_KEY); } catch (e) { /* storage blocked */ }
    return state.goals.find((c) => c.id === id) || state.goals[0] || null;
  }
  function pick(c) {
    try { localStorage.setItem(CURRENT_KEY, c ? c.id : ""); } catch (e) { /* storage blocked */ }
  }

  // Typing saves after a short pause so sync isn't hit on every key.
  function saveSoon(c) {
    touch(c);
    window.TS.writeLocal();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 800);
  }
  function saveNow(c) {
    clearTimeout(saveTimer);
    touch(c);
    save();
  }

  // A new blank chart opens on its centre block, ready to type the goal.
  function addChart(c, openAt = 4) {
    state.goals.push(c);
    pick(c);
    zoom = openAt;
    saveNow(c);
    render(true);
  }

  function deleteChart(c) {
    const at = state.goals.indexOf(c);
    state.goals.splice(at, 1);
    bury("goal", c.id);
    pick(state.goals[0]);
    zoom = null;
    save();
    render(true);
    window.TS.showToast(`Deleted ${nameOf(c)}`, () => {
      state.goals.splice(Math.min(at, state.goals.length), 0, touch(c));
      delete state.deleted[c.id];
      pick(c);
    });
  }

  // ---- rendering ----
  function cellClass(b, i, c) {
    let cls = "gc-cell";
    if (b === 4 && i === 4) cls += " goal";
    else if (b === 4 || i === 4) cls += " area";
    if (isDone(c, b, i)) cls += " done";
    return cls;
  }

  function renderChart(root, c) {
    root.append(el("p", { className: "hint" }, "Tap a block to fill it in. Tick off actions as they become habits."));
    const chart = el("div", { className: "gc-chart" });
    for (let b = 0; b < 9; b++) {
      const block = el("button", { type: "button", className: `gc-block${b === 4 ? " centre" : ""}`, "aria-label": b === 4 ? "Goal and areas" : `Area: ${textAt(c, b, 4) || "empty"}`, onclick: () => { zoom = b; render(true); } });
      for (let i = 0; i < 9; i++) block.append(el("span", { className: cellClass(b, i, c) }, el("span", {}, textAt(c, b, i))));
      chart.append(block);
    }
    root.append(chart);

    const filled = AROUND.filter((b) => textAt(c, b, 4).trim());
    if (filled.length) {
      root.append(el("div", { className: "gc-progress" }, filled.map((b) => {
        const p = areaProgress(c, b);
        return el("button", { type: "button", className: "gc-prog", onclick: () => { zoom = b; render(true); } },
          el("span", { className: "gc-prog-name" }, textAt(c, b, 4)),
          el("span", { className: "gc-bar" }, el("span", { style: `width:${p.total ? (100 * p.done) / p.total : 0}%` })),
          el("span", { className: "gc-prog-n" }, `${p.done}/${p.total}`));
      })));
    }
  }

  function renderBlock(root, c, b) {
    const title = b === 4 ? "Goal & areas" : textAt(c, b, 4).trim() || "Area";
    const p = b === 4 ? null : areaProgress(c, b);
    root.append(el("div", { className: "gc-zoom-head" },
      el("button", { type: "button", className: "ghost-btn", onclick: () => { zoom = null; render(true); } }, "‹ Chart"),
      el("strong", {}, title, p && p.total ? el("small", {}, ` · ${p.done}/${p.total} done`) : null),
      minimap(c, b)));
    root.append(el("p", { className: "hint" }, b === 4
      ? "Write your main goal in the middle and the eight areas it takes around it."
      : "Eight concrete actions for this area. Tick one off once it's part of your routine."));

    const grid = el("div", { className: "gc-edit" });
    for (let i = 0; i < 9; i++) {
      const placeholder = b === 4 ? (i === 4 ? "Main goal" : "Area") : (i === 4 ? "Area" : "Action");
      const box = el("textarea", {
        className: "gc-input", value: textAt(c, b, i), placeholder, maxLength: 120, rows: 3,
        "aria-label": placeholder,
        oninput: () => { setText(c, b, i, box.value); saveSoon(c); },
        onchange: () => saveNow(c),
      });
      const cell = el("div", { className: cellClass(b, i, c) }, box);
      if (isAction(b, i)) {
        const tick = el("button", {
          type: "button", className: "gc-tick", "aria-label": "Done", "aria-pressed": String(isDone(c, b, i)),
          onclick: () => {
            const key = `${b}-${i}`;
            c.done = isDone(c, b, i) ? c.done.filter((k) => k !== key) : [...(c.done || []), key];
            saveNow(c);
            render(true);
          },
        });
        tick.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"/></svg>';
        cell.append(tick);
      } else if (b === 4 && i !== 4) {
        cell.append(el("button", { type: "button", className: "gc-go", "aria-label": "Open this area", onclick: () => { zoom = i; render(true); } }, "›"));
      }
      grid.append(cell);
    }
    root.append(grid);
  }

  // 3x3 dots to jump between blocks.
  function minimap(c, b) {
    const map = el("div", { className: "gc-mini", role: "group", "aria-label": "Blocks" });
    for (let n = 0; n < 9; n++) {
      map.append(el("button", {
        type: "button", className: `${n === b ? "here" : ""}${n === 4 ? " centre" : ""}`.trim(),
        title: n === 4 ? "Goal & areas" : textAt(c, n, 4) || "Area", onclick: () => { zoom = n; render(true); },
      }));
    }
    return map;
  }

  function renderBar(root, c) {
    const bar = el("div", { className: "gc-bar-top" });
    if (state.goals.length > 1) {
      const select = el("select", { className: "gc-select", "aria-label": "Goal chart", onchange: () => { pick(state.goals.find((x) => x.id === select.value)); zoom = null; render(true); } },
        state.goals.map((x) => el("option", { value: x.id, selected: x === c }, nameOf(x))));
      bar.append(select);
    } else {
      bar.append(el("strong", { className: "gc-name" }, nameOf(c)));
    }
    bar.append(el("button", { type: "button", className: "ghost-btn danger", onclick: () => deleteChart(c) }, "Delete"));
    root.append(bar);
  }

  function renderEmpty(root) {
    root.append(
      el("div", { className: "gc-empty" },
        el("h2", {}, "Goal chart"),
        el("p", {}, "Put one big goal in the middle, the eight areas it depends on around it, then eight concrete actions for each area: 64 small things that add up to the goal."),
        el("button", { type: "button", className: "primary-btn big", onclick: () => addChart(blankChart()) }, "Start a chart"),
        el("button", { type: "button", className: "ghost-btn gc-example", onclick: () => addChart(exampleChart(), null) }, "Start from Shohei Ohtani's chart")));
  }

  function render(force) {
    const root = $("goalsView");
    // Don't rebuild under the user's cursor (e.g. after a sync).
    if (force || !(root.contains(document.activeElement) && document.activeElement.tagName === "TEXTAREA")) {
      root.replaceChildren();
      const c = current();
      if (!c) { zoom = null; renderEmpty(root); }
      else {
        renderBar(root, c);
        if (zoom == null) renderChart(root, c); else renderBlock(root, c, zoom);
      }
    }
    if (currentView === "goalsView") $("addButton").hidden = zoom != null;
  }

  window.TS.renderHooks.push(() => render());
  window.TS.viewHooks.push((view) => {
    currentView = view;
    if (view === "goalsView") render(true);
  });
  window.TS.addHandlers.goalsView = () => addChart(blankChart());
  render(true);
})();
