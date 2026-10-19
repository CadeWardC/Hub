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
        raw.settings = Array.isArray(raw.settings) ? raw.settings : [];
        raw.deleted = raw.deleted && typeof raw.deleted === "object" ? raw.deleted : {};
        return raw;
      }
    } catch (e) { /* fall through */ }
    return { tasks: [], events: [], protocols: [], settings: [], deleted: {} };
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

  // Finished tasks are deleted a day after they were checked off (on every
  // device, since the deletion syncs like any other).
  const DONE_KEEP_MS = 24 * 60 * 60 * 1000;
  function purgeDone() {
    const cutoff = Date.now() - DONE_KEEP_MS;
    const old = state.tasks.filter((t) => t.done && (t.doneAt || t.updated || 0) < cutoff);
    if (!old.length) return;
    state.tasks = state.tasks.filter((t) => !old.includes(t));
    old.forEach((t) => { bury("task", t.id); dropSessions(t.id, true); });
    save();
  }

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

  let toastUndo = null;
  let toastTimer = 0;
  function showToast(text, undo) {
    const toast = $("toast");
    toast.querySelector("span").textContent = text;
    $("undoButton").hidden = !undo;
    toastUndo = undo || null;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; toastUndo = null; }, 6000);
  }
  $("undoButton").addEventListener("click", () => {
    const undo = toastUndo;
    toastUndo = null;
    $("toast").hidden = true;
    if (!undo) return;
    undo();
    save();
    render();
  });
  // Put a deleted item back and drop its deletion record.
  function restore(list, item, index = list.length) {
    list.splice(Math.min(index, list.length), 0, touch(item));
    delete state.deleted[item.id];
  }

  function deleteTask(task) {
    const index = state.tasks.indexOf(task);
    if (index === -1) return;
    state.tasks.splice(index, 1);
    bury("task", task.id);
    const sessions = dropSessions(task.id, true);
    save();
    render();
    showToast(`Deleted “${task.title}”`, () => {
      restore(state.tasks, task, index);
      sessions.forEach((ev) => restore(state.events, ev));
    });
  }

  // ---- planner ----
  // "Plan week" books one work session a day for each unfinished task with a
  // due date: up to 7 days before it, 10 minutes at first growing to 30 as
  // the due date gets close, in free time between 8am and 9pm (evenings
  // first). Re-planning replaces a task's upcoming sessions.
  const PLAN_FROM = 8 * 60, PLAN_TO = 21 * 60, PLAN_PREFER = 16 * 60;
  const hhmm = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
  const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const upcoming = (ev) => ev.date > toKey(new Date()) || (ev.date === toKey(new Date()) && toMinutes(ev.start) > nowMinutes());

  // Remove a task's planned sessions: the ones still to come, or all of them
  // (when the task itself is deleted).
  function dropSessions(taskId, all = false) {
    const gone = state.events.filter((ev) => ev.auto && ev.taskId === taskId && (all || upcoming(ev)));
    if (!gone.length) return [];
    state.events = state.events.filter((ev) => !gone.includes(ev));
    gone.forEach((ev) => bury("event", ev.id));
    return gone;
  }

  function findSlot(day, minutes, earliest) {
    const busy = state.events.filter((ev) => ev.date === day)
      .map((ev) => [toMinutes(ev.start), Math.max(toMinutes(ev.start) + 15, toMinutes(ev.end || ev.start))]);
    const free = (s) => s + minutes <= PLAN_TO && busy.every(([a, b]) => s + minutes + 5 <= a || s >= b + 5);
    const starts = [];
    for (let s = PLAN_PREFER; s < PLAN_TO; s += 15) starts.push(s);
    for (let s = PLAN_FROM; s < PLAN_PREFER; s += 15) starts.push(s);
    const hit = starts.find((s) => s >= earliest && free(s));
    return hit === undefined ? null : hit;
  }

  function planAll() {
    const today = toKey(new Date());
    const tasks = state.tasks.filter((t) => !t.done && t.date && t.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.created - b.created);
    if (!tasks.length) { showToast("Nothing to plan: add a due date to a task first."); return; }
    const removed = tasks.flatMap((t) => dropSessions(t.id));
    const added = [];
    tasks.forEach((task) => {
      const last = task.date > today ? addDays(task.date, -1) : today;
      const first = addDays(task.date, -7) > today ? addDays(task.date, -7) : today;
      const days = [];
      for (let d = first; d <= last; d = addDays(d, 1)) days.push(d);
      days.forEach((day, i) => {
        const frac = days.length === 1 ? 1 : i / (days.length - 1);
        const minutes = Math.round((10 + 20 * frac) / 5) * 5;
        const earliest = day === today ? Math.ceil((nowMinutes() + 15) / 15) * 15 : PLAN_FROM;
        const start = findSlot(day, minutes, earliest);
        if (start === null) return;
        const ev = touch({
          id: uid(), created: Date.now(), title: task.title, date: day,
          start: hhmm(start), end: hhmm(start + minutes), notes: "", taskId: task.id, auto: true,
        });
        state.events.push(ev);
        added.push(ev);
      });
    });
    save();
    render();
    const n = new Set(added.map((ev) => ev.taskId)).size;
    showToast(added.length
      ? `Planned ${added.length} session${added.length === 1 ? "" : "s"} for ${n} task${n === 1 ? "" : "s"}`
      : "No free time found before the due dates.", () => {
      state.events = state.events.filter((ev) => !added.includes(ev));
      added.forEach((ev) => bury("event", ev.id));
      removed.forEach((ev) => restore(state.events, ev));
    });
  }

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
      if (task.done) dropSessions(task.id);
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
    if (task.date) metaParts.push(dueText(task.date));
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
    [...state.events].sort((a, b) => a.start.localeCompare(b.start)).forEach((e) => push(e.date, { title: e.title, kind: e.auto ? "event planned" : "event" }));
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
      b.className = "event" + (ev.auto ? " planned" : "");
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
    purgeDone();
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
    f.title.placeholder = kind === "task" ? "What needs doing?" : "What's happening?";
  }

  // Quick due-date picks plus a date picker; the task's due date lives in `dueValue`.
  let dueValue = "";
  function dueChoices() {
    const today = toKey(new Date());
    const dow = new Date().getDay();
    const choices = [
      { label: "None", value: "" },
      { label: "Today", value: today },
      { label: "Tomorrow", value: addDays(today, 1) },
      { label: "Weekend", value: addDays(today, dow === 6 ? 0 : 6 - dow) }, // coming Saturday (next one on Sunday)
      { label: "Next week", value: addDays(today, ((8 - dow) % 7) || 7) }, // coming Monday
    ];
    // Skip a pick that lands on the same day as an earlier one (e.g. Monday on a Sunday).
    return choices.filter((c, i) => choices.findIndex((x) => x.value === c.value) === i);
  }
  function dueText(key) {
    const today = toKey(new Date());
    const days = Math.round((fromKey(key) - fromKey(today)) / 86400000);
    if (days < 0) return `Overdue · ${formatDay(key, "short")}`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    if (days < 7) return `Due ${fromKey(key).toLocaleDateString(undefined, { weekday: "long" })}`;
    return `Due ${formatDay(key, "short")}`;
  }
  // Built once per opening; afterwards refreshDue() only updates the
  // highlight, so the date field is never swapped out while its picker is open.
  function paintDue() {
    const chips = $("dueChips");
    chips.replaceChildren(...dueChoices().map((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "due-chip";
      b.dataset.value = c.value;
      b.textContent = c.label;
      b.addEventListener("click", () => { dueValue = c.value; refreshDue(); });
      return b;
    }));
    // "Pick date" is a real date field stretched over the chip and made
    // see-through, so the tap lands on the field itself. That opens the
    // native picker everywhere (iPhone/iPad included); with a mouse, the
    // click also asks for the calendar, since clicking the field alone
    // doesn't open it on desktop.
    const pick = document.createElement("div");
    pick.className = "due-chip pick";
    const label = document.createElement("span");
    const input = document.createElement("input");
    input.type = "date";
    input.setAttribute("aria-label", "Pick a due date");
    input.value = dueValue || toKey(new Date());
    input.addEventListener("click", () => { try { input.showPicker(); } catch (e) { /* the tap already opened it */ } });
    const take = () => { if (input.value) { dueValue = input.value; refreshDue(); } };
    input.addEventListener("input", take);
    input.addEventListener("change", take);
    pick.append(label, input);
    chips.append(pick);
    refreshDue();
  }
  function refreshDue() {
    const chips = $("dueChips");
    let matched = false;
    chips.querySelectorAll(".due-chip[data-value]").forEach((b) => {
      const on = b.dataset.value === dueValue;
      b.classList.toggle("on", on);
      matched = matched || on;
    });
    const pick = chips.querySelector(".due-chip.pick");
    if (pick) {
      pick.classList.toggle("on", !matched && !!dueValue);
      pick.querySelector("span").textContent = !matched && dueValue ? formatDay(dueValue, "short") : "Pick date";
    }
    $("dueText").textContent = dueValue
      ? `${dueText(dueValue)} · ${fromKey(dueValue).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`
      : "No due date";
  }

  function openEditor(kind, item) {
    editing = item ? { kind, id: item.id } : null;
    form.reset();
    setKind(kind);
    f.title.value = item?.title || "";
    dueValue = kind === "task" && item ? (item.date || "") : "";
    f.eventDate.value = kind === "event" && item ? item.date : selectedDay;
    f.start.value = item?.start || "";
    f.end.value = item?.end || "";
    f.notes.value = item?.notes || "";
    $("notesBox").open = !!item?.notes;
    f.today.checked = kind === "task" && item
      ? inToday(item)
      : $("tasksView").classList.contains("active") && taskTab === "today";
    paintDue();
    // Switching kind only makes sense for new items.
    form.querySelectorAll('input[name="kind"]').forEach((r) => { r.disabled = !!item; });
    $("deleteButton").hidden = !item;
    dialog.showModal();
    if (!item) f.title.focus();
  }

  form.addEventListener("change", (e) => {
    if (e.target.name === "kind") setKind(e.target.value);
  });

  form.addEventListener("submit", (e) => {
    const kind = f.kind.value;
    const title = f.title.value.trim();
    if (!title) { e.preventDefault(); return; }
    if (kind === "event") {
      if (!f.eventDate.value || !f.start.value) {
        e.preventDefault();
        (f.eventDate.value ? f.start : f.eventDate).focus();
        return;
      }
      if (f.end.value && f.end.value <= f.start.value) f.end.value = "";
    }
    const data = { title, date: kind === "task" ? dueValue : f.eventDate.value, notes: f.notes.value.trim() };
    if (kind === "event") Object.assign(data, { start: f.start.value, end: f.end.value });
    const list = kind === "event" ? state.events : state.tasks;
    if (editing) {
      const item = list.find((x) => x.id === editing.id);
      if (kind === "task") data.planned = f.today.checked ? (inToday(item) ? item.planned : toKey(new Date())) : null;
      touch(Object.assign(item, data));
    } else {
      const extra = kind === "task" ? { done: false, planned: f.today.checked ? toKey(new Date()) : null } : {};
      list.push(touch({ id: uid(), created: Date.now(), ...extra, ...data }));
    }
    if (data.date) selectedDay = data.date;
    save();
    render();
  });

  $("cancelButton").addEventListener("click", () => dialog.close());
  $("planButton").addEventListener("click", planAll);
  $("deleteButton").addEventListener("click", () => {
    if (!editing) return;
    const key = editing.kind === "event" ? "events" : "tasks";
    state[key] = state[key].filter((x) => x.id !== editing.id);
    bury(editing.kind, editing.id);
    if (editing.kind === "task") dropSessions(editing.id, true);
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
