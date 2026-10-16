(() => {
  "use strict";

  const STORAGE_KEY = "taskschedule.v1";
  const HOUR_PX = 48;
  const DAY_START = 6;
  const DAY_END = 23;

  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");
  const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = (key) => { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (key, n) => { const d = fromKey(key); d.setDate(d.getDate() + n); return toKey(d); };
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const addMonths = (key, n) => {
    const d = fromKey(key);
    const y = d.getFullYear(), m = d.getMonth() + n;
    return toKey(new Date(y, m, Math.min(d.getDate(), daysInMonth(y, m))));
  };
  const toMinutes = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function formatTime(t) {
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}${m ? ":" + pad(m) : ""}${h < 12 ? "am" : "pm"}`;
  }

  function formatDay(key, style = "long") {
    const today = toKey(new Date());
    if (key === today) return "Today";
    if (key === addDays(today, 1)) return "Tomorrow";
    if (key === addDays(today, -1)) return "Yesterday";
    return fromKey(key).toLocaleDateString(undefined, style === "long"
      ? { weekday: "long", month: "short", day: "numeric" }
      : { month: "short", day: "numeric" });
  }

  // ---- state ----
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (raw && Array.isArray(raw.tasks) && Array.isArray(raw.events)) {
        raw.protocols = Array.isArray(raw.protocols) ? raw.protocols : [];
        raw.deleted = raw.deleted && typeof raw.deleted === "object" ? raw.deleted : {};
        return raw;
      }
    } catch (e) { /* fall through */ }
    return { tasks: [], events: [], protocols: [], deleted: {} };
  }
  const state = load();
  const saveHooks = [];
  // writeLocal only persists; save() also tells listeners (sync) that data changed.
  const writeLocal = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ }
  };
  const save = () => { writeLocal(); saveHooks.forEach((fn) => fn()); };
  // Every change stamps `updated` so sync can keep the newest copy; deletions
  // leave a record behind so other devices learn about them.
  const touch = (item) => { item.updated = Date.now(); return item; };
  const bury = (kind, id) => { state.deleted[id] = { kind, updated: Date.now() }; };

  let selectedDay = toKey(new Date());
  const RANGE_KEY = "taskschedule.range";
  let range = "week";
  try { if (localStorage.getItem(RANGE_KEY) === "month") range = "month"; } catch (e) { /* storage blocked */ }
  let taskTab = "today";
  let editing = null; // { kind, id } when editing an existing item

  // ---- today list ----
  // A task is on the Today list when it was planned for today, or planned
  // for an earlier day and still not done (unfinished work rolls over).
  const inToday = (t) => {
    const today = toKey(new Date());
    return !!t.planned && (t.planned === today || (t.planned < today && !t.done));
  };

  function moveTask(task) {
    task.planned = inToday(task) ? null : toKey(new Date());
    touch(task);
    save();
    render();
  }

  let lastDeleted = null;
  let toastTimer = 0;
  function deleteTask(task) {
    const index = state.tasks.indexOf(task);
    if (index === -1) return;
    state.tasks.splice(index, 1);
    bury("task", task.id);
    lastDeleted = { task, index };
    save();
    render();
    const toast = $("toast");
    toast.querySelector("span").textContent = `Deleted “${task.title}”`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; lastDeleted = null; }, 5000);
  }
  $("undoButton").addEventListener("click", () => {
    if (!lastDeleted) return;
    state.tasks.splice(Math.min(lastDeleted.index, state.tasks.length), 0, touch(lastDeleted.task));
    delete state.deleted[lastDeleted.task.id];
    lastDeleted = null;
    $("toast").hidden = true;
    save();
    render();
  });

  // ---- swipe rows ----
  const SWIPE_OPEN = -144; // width of the Edit + Delete buttons
  let openRow = null;

  function setRowOpen(row, open) {
    row.classList.toggle("open", open);
    row.querySelector(".swipe-card").style.transform = open ? `translateX(${SWIPE_OPEN}px)` : "";
    // Keep the buttons hidden at rest so their colour can't bleed past the
    // card's rounded corners; wait for the close animation before hiding.
    clearTimeout(row._hideTimer);
    if (open) row.classList.add("revealed");
    else row._hideTimer = setTimeout(() => row.classList.remove("revealed"), 220);
    if (open) {
      if (openRow && openRow !== row) setRowOpen(openRow, false);
      openRow = row;
    } else if (openRow === row) {
      openRow = null;
    }
  }

  function enableSwipe(row, card) {
    let startX = 0, startY = 0, base = 0, dx = 0;
    let tracking = false, dragging = false, swallowClick = false;

    card.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      startX = e.clientX;
      startY = e.clientY;
      base = row.classList.contains("open") ? SWIPE_OPEN : 0;
      dx = base;
      tracking = true;
      dragging = false;
    });
    card.addEventListener("pointermove", (e) => {
      if (!tracking) return;
      const mx = e.clientX - startX;
      const my = e.clientY - startY;
      if (!dragging) {
        if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) { tracking = false; return; }
        if (Math.abs(mx) < 10) return;
        dragging = true;
        card.setPointerCapture(e.pointerId);
        card.classList.add("dragging");
        clearTimeout(row._hideTimer);
        row.classList.add("revealed");
        if (openRow && openRow !== row) setRowOpen(openRow, false);
      }
      dx = Math.min(0, Math.max(SWIPE_OPEN * 1.1, base + mx));
      card.style.transform = `translateX(${dx}px)`;
    });
    const finish = () => {
      if (!tracking) return;
      tracking = false;
      if (!dragging) return;
      card.classList.remove("dragging");
      swallowClick = true;
      setTimeout(() => { swallowClick = false; }, 0);
      setRowOpen(row, dx < SWIPE_OPEN / 2);
    };
    card.addEventListener("pointerup", finish);
    card.addEventListener("pointercancel", finish);
    // A drag ends with a click; don't let it toggle anything. A tap on an
    // open row just closes it.
    card.addEventListener("click", (e) => {
      if (swallowClick || row.classList.contains("open")) {
        e.stopPropagation();
        e.preventDefault();
        if (!swallowClick) setRowOpen(row, false);
      }
    }, true);
  }

  document.addEventListener("pointerdown", (e) => {
    if (openRow && !openRow.contains(e.target)) setRowOpen(openRow, false);
  });

  // ---- rendering ----
  function taskItem(task) {
    const row = document.createElement("li");
    row.className = "task-row";

    const actions = document.createElement("div");
    actions.className = "swipe-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "swipe-edit";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => { setRowOpen(row, false); openEditor("task", task); });
    const del = document.createElement("button");
    del.type = "button";
    del.className = "swipe-delete";
    del.textContent = "Delete";
    del.addEventListener("click", () => deleteTask(task));
    actions.append(edit, del);

    const card = document.createElement("div");
    card.className = "task swipe-card" + (task.done ? " done" : "");
    const check = document.createElement("button");
    check.className = "check";
    check.type = "button";
    check.setAttribute("aria-label", task.done ? "Mark not done" : "Mark done");
    check.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"/></svg>';
    check.addEventListener("click", () => {
      task.done = !task.done;
      task.doneAt = task.done ? Date.now() : null;
      touch(task);
      save();
      render();
    });

    const body = document.createElement("div");
    body.className = "task-body";
    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;
    body.append(title);
    const metaParts = [];
    if (task.date) metaParts.push(formatDay(task.date, "short"));
    if (task.notes) metaParts.push(task.notes.split("\n")[0]);
    if (metaParts.length) {
      const meta = document.createElement("span");
      meta.className = "task-meta" + (!task.done && task.date && task.date < toKey(new Date()) ? " overdue" : "");
      meta.textContent = metaParts.join(" · ");
      body.append(meta);
    }

    const move = document.createElement("button");
    move.type = "button";
    move.className = "move";
    move.textContent = inToday(task) ? "→ All" : "→ Today";
    move.setAttribute("aria-label", inToday(task) ? "Move to All" : "Move to Today");
    move.addEventListener("click", () => moveTask(task));

    card.append(check, body, move);
    card.addEventListener("dblclick", (e) => { if (!e.target.closest("button")) openEditor("task", task); });
    enableSwipe(row, card);
    row.append(actions, card);
    return row;
  }

  function fillList(list, tasks, emptyText) {
    list.replaceChildren();
    if (!tasks.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = emptyText;
      list.append(li);
      return;
    }
    tasks.forEach((t) => list.append(taskItem(t)));
  }

  const byDateThenCreated = (a, b) =>
    (a.date || "9999") < (b.date || "9999") ? -1 : (a.date || "9999") > (b.date || "9999") ? 1 : a.created - b.created;

  function renderWeek() {
    const strip = $("weekStrip");
    strip.replaceChildren();
    const sel = fromKey(selectedDay);
    const monday = addDays(selectedDay, -((sel.getDay() + 6) % 7));
    const today = toKey(new Date());
    const busy = new Set([...state.events.map((e) => e.date), ...state.tasks.filter((t) => !t.done).map((t) => t.date)]);
    for (let i = 0; i < 7; i++) {
      const key = addDays(monday, i);
      const d = fromKey(key);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "week-day" + (key === selectedDay ? " selected" : "") + (key === today ? " today" : "") + (busy.has(key) ? " has-items" : "");
      b.innerHTML = `${d.toLocaleDateString(undefined, { weekday: "narrow" })}<strong>${d.getDate()}</strong>`;
      b.addEventListener("click", () => { selectedDay = key; render(); });
      strip.append(b);
    }
  }

  const wide = window.matchMedia("(min-width: 720px)");
  wide.addEventListener?.("change", () => render());

  function renderMonth() {
    const grid = $("monthGrid");
    grid.replaceChildren();
    const sel = fromKey(selectedDay);
    const y = sel.getFullYear(), m = sel.getMonth();
    const firstKey = toKey(new Date(y, m, 1));
    const lead = (new Date(y, m, 1).getDay() + 6) % 7; // Monday-first
    const weeks = Math.ceil((lead + daysInMonth(y, m)) / 7);
    const start = addDays(firstKey, -lead);
    const today = toKey(new Date());

    // Monday-to-Sunday header, using any known Monday (2024-01-01).
    for (let i = 0; i < 7; i++) {
      const head = document.createElement("span");
      head.className = "month-head";
      head.textContent = new Date(2024, 0, 1 + i).toLocaleDateString(undefined, { weekday: "narrow" });
      grid.append(head);
    }

    const items = new Map();
    const push = (key, item) => { if (!items.has(key)) items.set(key, []); items.get(key).push(item); };
    [...state.events].sort((a, b) => a.start.localeCompare(b.start)).forEach((e) => push(e.date, { title: e.title, kind: "event" }));
    state.tasks.filter((t) => t.date && !t.done).forEach((t) => push(t.date, { title: t.title, kind: "task" }));

    for (let i = 0; i < weeks * 7; i++) {
      const key = addDays(start, i);
      const d = fromKey(key);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "month-day" + (d.getMonth() !== m ? " other-month" : "") +
        (key === today ? " today" : "") + (key === selectedDay ? " selected" : "");
      const num = document.createElement("span");
      num.className = "num";
      num.textContent = d.getDate();
      cell.append(num);
      const list = items.get(key) || [];
      const chipMax = wide.matches ? 4 : 2;
      list.slice(0, chipMax).forEach((it) => {
        const chip = document.createElement("span");
        chip.className = "chip-" + it.kind;
        chip.textContent = it.title;
        cell.append(chip);
      });
      if (list.length > chipMax) {
        const more = document.createElement("span");
        more.className = "more";
        more.textContent = `+${list.length - chipMax}`;
        cell.append(more);
      }
      cell.setAttribute("aria-label", `${d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}, ${list.length} item${list.length === 1 ? "" : "s"}`);
      cell.addEventListener("click", () => { selectedDay = key; render(); });
      grid.append(cell);
    }
  }

  function renderTimeline() {
    const tl = $("timeline");
    tl.replaceChildren();
    const events = state.events.filter((e) => e.date === selectedDay).sort((a, b) => a.start.localeCompare(b.start));
    const startHour = Math.min(DAY_START, ...events.map((e) => Math.floor(toMinutes(e.start) / 60)));
    for (let h = startHour; h <= DAY_END; h++) {
      const row = document.createElement("div");
      row.className = "hour";
      row.innerHTML = `<span>${formatTime(pad(h) + ":00")}</span>`;
      tl.append(row);
    }
    const top = (min) => (min / 60 - startHour) * HOUR_PX;

    // Overlapping events share the width side by side.
    const lanes = [];
    events.forEach((ev) => {
      const s = toMinutes(ev.start);
      let lane = lanes.findIndex((end) => end <= s);
      if (lane === -1) lane = lanes.length;
      lanes[lane] = Math.max(s + 15, toMinutes(ev.end || ev.start));
      ev._lane = lane;
    });
    const laneCount = Math.max(1, lanes.length);

    events.forEach((ev) => {
      const s = toMinutes(ev.start);
      const e = Math.max(s + 30, toMinutes(ev.end || ev.start));
      const b = document.createElement("button");
      b.type = "button";
      b.className = "event";
      b.style.top = `${top(s)}px`;
      b.style.height = `${Math.max(22, ((e - s) / 60) * HOUR_PX - 2)}px`;
      b.style.left = `calc(6px + ${(ev._lane / laneCount) * 100}%)`;
      b.style.width = `calc(${100 / laneCount}% - 8px)`;
      b.style.right = "auto";
      const title = document.createElement("strong");
      title.textContent = ev.title;
      const time = document.createElement("small");
      time.textContent = ev.end ? `${formatTime(ev.start)} – ${formatTime(ev.end)}` : formatTime(ev.start);
      b.append(title, time);
      b.addEventListener("click", () => openEditor("event", ev));
      tl.append(b);
      delete ev._lane;
    });

    if (selectedDay === toKey(new Date())) {
      const now = new Date();
      const min = now.getHours() * 60 + now.getMinutes();
      if (min >= startHour * 60 && min <= (DAY_END + 1) * 60) {
        const line = document.createElement("div");
        line.className = "now-line";
        line.style.top = `${top(min)}px`;
        tl.append(line);
      }
    }
  }

  function render() {
    const monthly = range === "month";
    $("todayButton").textContent = monthly
      ? fromKey(selectedDay).toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : formatDay(selectedDay);
    $("dueLabel").textContent = monthly ? `Due · ${formatDay(selectedDay)}` : "Due this day";
    $("weekStrip").hidden = monthly;
    $("monthGrid").hidden = !monthly;
    document.querySelectorAll(".range-toggle .segment").forEach((s) => s.classList.toggle("active", s.dataset.range === range));
    if (monthly) renderMonth(); else renderWeek();
    fillList($("dayTasks"),
      state.tasks.filter((t) => t.date === selectedDay).sort((a, b) => a.done - b.done || a.created - b.created),
      "Nothing due.");
    renderTimeline();

    const todayTasks = state.tasks.filter(inToday);
    const otherTasks = state.tasks.filter((t) => !inToday(t));
    $("todayCount").textContent = todayTasks.filter((t) => !t.done).length || "";
    $("allCount").textContent = otherTasks.filter((t) => !t.done).length || "";
    // Open tasks first, then completed ones (most recently finished on top).
    const order = (a, b) => a.done - b.done || (a.done ? (b.doneAt || 0) - (a.doneAt || 0) : byDateThenCreated(a, b));
    fillList($("taskList"),
      (taskTab === "today" ? todayTasks : otherTasks).sort(order),
      taskTab === "today" ? "Nothing planned for today. Move tasks here from All." : "No tasks. Tap + to add one.");
    renderHooks.forEach((fn) => fn());
  }
  const renderHooks = [];

  // ---- editor ----
  const dialog = $("editor");
  const form = $("editorForm");
  const f = form.elements;

  function setKind(kind) {
    form.dataset.kind = kind;
    f.kind.value = kind;
  }

  function openEditor(kind, item) {
    editing = item ? { kind, id: item.id } : null;
    form.reset();
    setKind(kind);
    f.title.value = item?.title || "";
    f.date.value = item ? (item.date || "") : (kind === "event" || $("scheduleView").classList.contains("active") ? selectedDay : "");
    f.start.value = item?.start || "";
    f.end.value = item?.end || "";
    f.notes.value = item?.notes || "";
    // Switching kind only makes sense for new items.
    form.querySelectorAll('input[name="kind"]').forEach((r) => { r.disabled = !!item; });
    $("deleteButton").hidden = !item;
    dialog.showModal();
    if (!item) f.title.focus();
  }

  form.addEventListener("change", (e) => {
    if (e.target.name === "kind") {
      setKind(e.target.value);
      if (e.target.value === "event" && !f.date.value) f.date.value = selectedDay;
    }
  });

  form.addEventListener("submit", (e) => {
    const kind = f.kind.value;
    const title = f.title.value.trim();
    if (!title) { e.preventDefault(); return; }
    if (kind === "event") {
      if (!f.date.value || !f.start.value) {
        e.preventDefault();
        (f.date.value ? f.start : f.date).focus();
        return;
      }
      if (f.end.value && f.end.value <= f.start.value) f.end.value = "";
    }
    const data = { title, date: f.date.value, notes: f.notes.value.trim() };
    if (kind === "event") Object.assign(data, { start: f.start.value, end: f.end.value });
    const list = kind === "event" ? state.events : state.tasks;
    if (editing) {
      touch(Object.assign(list.find((x) => x.id === editing.id), data));
    } else {
      const extra = kind === "task"
        ? { done: false, planned: $("tasksView").classList.contains("active") && taskTab === "today" ? toKey(new Date()) : null }
        : {};
      list.push(touch({ id: uid(), created: Date.now(), ...extra, ...data }));
    }
    if (data.date) selectedDay = data.date;
    save();
    render();
  });

  $("cancelButton").addEventListener("click", () => dialog.close());
  $("deleteButton").addEventListener("click", () => {
    if (!editing) return;
    const key = editing.kind === "event" ? "events" : "tasks";
    state[key] = state[key].filter((x) => x.id !== editing.id);
    bury(editing.kind, editing.id);
    save();
    dialog.close();
    render();
  });

  // ---- navigation ----
  document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === tab.dataset.view));
    $("rangeToggle").hidden = tab.dataset.view !== "scheduleView";
    viewHooks.forEach((fn) => fn(tab.dataset.view));
  }));
  const viewHooks = [];
  const addHandlers = {};
  document.querySelectorAll("#tasksView .segment").forEach((seg) => seg.addEventListener("click", () => {
    taskTab = seg.dataset.list;
    document.querySelectorAll("#tasksView .segment").forEach((s) => s.classList.toggle("active", s === seg));
    render();
  }));
  document.querySelectorAll(".range-toggle .segment").forEach((seg) => seg.addEventListener("click", () => {
    range = seg.dataset.range;
    try { localStorage.setItem(RANGE_KEY, range); } catch (e) { /* storage blocked */ }
    render();
  }));
  const step = (n) => { selectedDay = range === "month" ? addMonths(selectedDay, n) : addDays(selectedDay, n); render(); };
  $("prevDay").addEventListener("click", () => step(-1));
  $("nextDay").addEventListener("click", () => step(1));
  $("todayButton").addEventListener("click", () => { selectedDay = toKey(new Date()); render(); });
  $("addButton").addEventListener("click", () => {
    const view = document.querySelector(".view.active").id;
    if (addHandlers[view]) addHandlers[view]();
    else openEditor(view === "scheduleView" ? "event" : "task");
  });

  // Keep "now" line and Today labels fresh.
  setInterval(() => { if (!openRow) render(); }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });

  // ---- PWA ----
  let deferredInstall = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstall = e;
    $("installButton").hidden = false;
  });
  $("installButton").addEventListener("click", async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
    $("installButton").hidden = true;
  });
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  window.TS = {
    state, save, writeLocal, touch, bury, uid, pad, render, enableSwipe, setRowOpen,
    saveHooks, renderHooks, viewHooks, addHandlers,
  };

  render();
})();
