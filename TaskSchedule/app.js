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
        raw.goals = Array.isArray(raw.goals) ? raw.goals : [];
        raw.deleted = raw.deleted && typeof raw.deleted === "object" ? raw.deleted : {};
        return raw;
      }
    } catch (e) { /* fall through */ }
    return { tasks: [], events: [], protocols: [], settings: [], goals: [], deleted: {} };
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
  // Tasks switched on for planning (task.plan) get work sessions from today
  // until the day before they're due. Sessions are events with auto: true and
  // a taskId, and they re-plan by themselves whenever a planned task or the
  // calendar changes, and once a day.
  //  - Spacing, counted back from the due date: daily in the last three days,
  //    every other day to two weeks out, then every third day (plus today).
  //  - Length: 20 min to 1 h far out (longer as the date nears), 30 min to 2 h
  //    in the last three days, favouring long (2 h the day before). Shorter
  //    lengths are tried when the wanted one doesn't fit.
  //  - Missed time: past sessions not ticked off are added back onto the next
  //    sessions (up to +30 min each, 2 h max per session).
  //  - Free time only, from the "start after" time (one for weekdays, one for
  //    weekends) to the "finish by" time, earliest first, 10 min clear of
  //    events and 30 min clear of other sessions. The times are a synced
  //    setting record (see planTimes()).
  const PLAN_MAX = 120;
  const PLAN_SETTING = "setting-plan";
  const PLAN_DEFAULTS = { weekday: "16:00", weekend: "10:00", until: "21:00" };
  function planTimes() {
    const rec = state.settings.find((x) => x.id === PLAN_SETTING) || {};
    const t = (k) => (/^\d\d:\d\d$/.test(rec[k] || "") ? rec[k] : PLAN_DEFAULTS[k]);
    return { weekday: t("weekday"), weekend: t("weekend"), until: t("until") };
  }
  function setPlanTimes(times) {
    let rec = state.settings.find((x) => x.id === PLAN_SETTING);
    if (!rec) { rec = { id: PLAN_SETTING, created: Date.now() }; state.settings.push(rec); }
    if (["weekday", "weekend", "until"].every((k) => rec[k] === times[k])) return false;
    Object.assign(rec, times);
    touch(rec);
    return true;
  }
  // Earliest start for a day ("YYYY-MM-DD") and the latest end, in minutes.
  function planWindow(day) {
    const t = planTimes();
    const dow = fromKey(day).getDay();
    return { from: toMinutes(dow === 0 || dow === 6 ? t.weekend : t.weekday), to: toMinutes(t.until) };
  }
  const hhmm = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
  const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const upcoming = (ev) => ev.date > toKey(new Date()) || (ev.date === toKey(new Date()) && toMinutes(ev.start) > nowMinutes());
  const fmtMins = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`);
  const sessionMinutes = (ev) => toMinutes(ev.end) - toMinutes(ev.start);
  // A session whose end time has passed without being ticked off.
  const missed = (ev) => ev.auto && !ev.done && (ev.date < toKey(new Date()) || (ev.date === toKey(new Date()) && toMinutes(ev.end) <= nowMinutes()));

  // Remove a task's planned sessions: the ones still to come, or all of them
  // (when the task itself is deleted).
  function dropSessions(taskId, all = false) {
    const gone = state.events.filter((ev) => ev.auto && ev.taskId === taskId && (all || upcoming(ev)));
    if (!gone.length) return [];
    state.events = state.events.filter((ev) => !gone.includes(ev));
    gone.forEach((ev) => bury("event", ev.id));
    return gone;
  }

  // "3 sessions · 2h 15m" for a task's upcoming planned time.
  function sessionsSummary(taskId) {
    const list = state.events.filter((ev) => ev.auto && ev.taskId === taskId && upcoming(ev));
    if (!list.length) return "";
    const total = list.reduce((n, ev) => n + sessionMinutes(ev), 0);
    return `${list.length} session${list.length === 1 ? "" : "s"} · ${fmtMins(total)}`;
  }

  function findSlot(events, day, minutes, earliest) {
    const busy = events.filter((ev) => ev.date === day).map((ev) => {
      const a = toMinutes(ev.start), b = Math.max(a + 15, toMinutes(ev.end || ev.start));
      const gap = ev.auto ? 30 : 10;
      return [a - gap, b + gap];
    });
    const { from, to } = planWindow(day);
    const free = (s) => s + minutes <= to && busy.every(([a, b]) => s + minutes <= a || s >= b);
    for (let s = Math.max(from, Math.ceil(earliest / 15) * 15); s < to; s += 15) if (free(s)) return s;
    return null;
  }

  // Session length by days left until the due date.
  function sessionShape(daysLeft, farthest) {
    if (daysLeft <= 3) return { want: [120, 120, 105, 90][Math.max(0, daysLeft)], min: 30 };
    const t = Math.min(1, (daysLeft - 4) / Math.max(1, farthest - 4)); // 0 = nearest of the far days
    return { want: Math.round((60 - 40 * t) / 5) * 5, min: 20 };
  }
  // Which days get a session, counted back from the due date so the gaps
  // shrink evenly; today is always included.
  function sessionDaysLeft(farthest) {
    if (farthest <= 0) return [0];
    const out = [];
    for (let l = 1; l <= farthest; l += l < 3 ? 1 : l < 14 ? 2 : 3) out.push(l);
    if (out[out.length - 1] !== farthest) out.push(farthest);
    return out;
  }

  const plannable = () => {
    const today = toKey(new Date());
    return state.tasks.filter((t) => !t.done && t.date && t.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.created - b.created);
  };

  // Work out the sessions every planned task should have, without changing anything.
  function computePlan() {
    const today = toKey(new Date());
    const open = plannable();
    const openIds = new Set(open.map((t) => t.id));
    const ours = (ev) => ev.auto && openIds.has(ev.taskId) && upcoming(ev);
    const working = state.events.filter((ev) => !ours(ev));
    const wanted = [];
    open.filter((t) => t.plan).forEach((task) => {
      const left = (key) => Math.round((fromKey(task.date) - fromKey(key)) / 86400000);
      const farthest = left(today);
      let extra = state.events.filter((ev) => ev.taskId === task.id && missed(ev)).reduce((n, ev) => n + sessionMinutes(ev), 0);
      sessionDaysLeft(farthest).reverse().forEach((daysLeft) => {
        const day = addDays(task.date, -daysLeft);
        const { want, min } = sessionShape(daysLeft, farthest);
        const bonus = Math.min(30, extra, PLAN_MAX - want);
        const earliest = day === today ? Math.ceil((nowMinutes() + 15) / 15) * 15 : 0;
        for (let len = want + Math.max(0, bonus); len >= min; len -= 10) {
          const start = findSlot(working, day, len, earliest);
          if (start === null) continue;
          const s = { taskId: task.id, title: task.title, date: day, start: hhmm(start), end: hhmm(start + len), auto: true };
          working.push(s);
          wanted.push(s);
          extra = Math.max(0, extra - Math.max(0, len - want));
          break;
        }
      });
    });
    return { wanted, current: state.events.filter(ours) };
  }

  // Bring the calendar in line with computePlan(), keeping sessions that
  // haven't moved (so nothing churns or re-syncs needlessly).
  function applyPlan() {
    const tasksById = new Map(state.tasks.map((t) => [t.id, t]));
    const { wanted, current } = computePlan();
    const key = (s) => [s.taskId, s.date, s.start, s.end].join("|");
    const have = new Map(current.map((ev) => [key(ev), ev]));
    const keep = new Set(wanted.map(key));
    const removed = current.filter((ev) => !keep.has(key(ev)));
    const added = wanted.filter((s) => !have.has(key(s))).map((s) => touch({ id: uid(), created: Date.now(), notes: "", ...s }));
    let renamed = false;
    current.forEach((ev) => {
      const t = tasksById.get(ev.taskId);
      if (t && keep.has(key(ev)) && ev.title !== t.title) { ev.title = t.title; touch(ev); renamed = true; }
    });
    if (!removed.length && !added.length && !renamed) return { added, removed };
    state.events = state.events.filter((ev) => !removed.includes(ev));
    removed.forEach((ev) => bury("event", ev.id));
    state.events.push(...added);
    save();
    render();
    return { added, removed };
  }

  // Re-plan quietly a moment after something changes.
  let autoPlanTimer = 0;
  function autoPlan() {
    clearTimeout(autoPlanTimer);
    autoPlanTimer = setTimeout(() => {
      if (plannable().some((t) => t.plan) || state.events.some((ev) => ev.auto && upcoming(ev))) applyPlan();
    }, 300);
  }
  // Once a day (a few seconds after opening, so sync can bring in other
  // devices' changes first), move missed time forward.
  const PLAN_DAY_KEY = "taskschedule.planDay";
  function dailyPlan() {
    let last = "";
    try { last = localStorage.getItem(PLAN_DAY_KEY) || ""; } catch (e) { /* storage blocked */ }
    const today = toKey(new Date());
    if (last === today) return;
    try { localStorage.setItem(PLAN_DAY_KEY, today); } catch (e) { /* storage blocked */ }
    autoPlan();
  }
  setTimeout(dailyPlan, 5000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(dailyPlan, 5000); });

  // Tick off (or un-tick) a work session.
  function toggleSession(ev) {
    ev.done = !ev.done;
    touch(ev);
    save();
    render();
    autoPlan();
  }

  // Switch tasks on or off for planning; the choices are remembered on each task.
  function openPlanDialog() {
    const open = plannable();
    if (!open.length) { showToast("Nothing to plan: give a task a due date first."); return; }
    $("planList").replaceChildren(...open.map((t) => {
      const row = document.createElement("label");
      row.className = "plan-row";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.className = "switch";
      box.checked = !!t.plan;
      box.dataset.id = t.id;
      const text = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = t.title;
      const meta = document.createElement("small");
      meta.textContent = [dueText(t.date), sessionsSummary(t.id)].filter(Boolean).join(" · ");
      text.append(title, meta);
      row.append(text, box);
      return row;
    }));
    const t = planTimes();
    $("planWeekday").value = t.weekday;
    $("planWeekend").value = t.weekend;
    $("planUntil").value = t.until;
    $("planDialog").showModal();
  }
  $("planCancel").addEventListener("click", () => $("planDialog").close());
  $("planGo").addEventListener("click", () => {
    $("planList").querySelectorAll("input[data-id]").forEach((box) => {
      const t = state.tasks.find((x) => x.id === box.dataset.id);
      if (t && !!t.plan !== box.checked) { t.plan = box.checked; touch(t); }
    });
    const time = (id, k) => $(id).value || planTimes()[k];
    setPlanTimes({ weekday: time("planWeekday", "weekday"), weekend: time("planWeekend", "weekend"), until: time("planUntil", "until") });
    $("planDialog").close();
    const { added, removed } = applyPlan();
    const upcomingAll = state.events.filter((ev) => ev.auto && upcoming(ev));
    const total = upcomingAll.reduce((m, ev) => m + sessionMinutes(ev), 0);
    const n = new Set(upcomingAll.map((ev) => ev.taskId)).size;
    showToast(upcomingAll.length
      ? `${upcomingAll.length} session${upcomingAll.length === 1 ? "" : "s"} planned (${fmtMins(total)}) for ${n} task${n === 1 ? "" : "s"}`
      : "No sessions planned.", (added.length || removed.length) ? () => {
      state.events = state.events.filter((ev) => !added.includes(ev));
      added.forEach((ev) => bury("event", ev.id));
      removed.forEach((ev) => restore(state.events, ev));
    } : null);
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
      if (task.done) dropSessions(task.id);
      touch(task);
      save();
      render();
      if (!task.done && task.plan) autoPlan();
    });

    const body = document.createElement("div");
    body.className = "task-body";
    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;
    body.append(title);
    const metaParts = [];
    if (task.date) metaParts.push(dueText(task.date));
    if (!task.done && task.plan) { const planned = sessionsSummary(task.id); if (planned) metaParts.push(planned); }
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
      b.className = "event" + (ev.auto ? " planned" : "") + (ev.auto && ev.done ? " done" : "") + (missed(ev) ? " missed" : "");
      b.style.top = `${top(s)}px`;
      b.style.height = `${Math.max(22, ((e - s) / 60) * HOUR_PX - 2)}px`;
      b.style.left = `calc(6px + ${(ev._lane / laneCount) * 100}%)`;
      b.style.width = `calc(${100 / laneCount}% - 8px)`;
      b.style.right = "auto";
      const title = document.createElement("strong");
      title.textContent = ev.auto ? `${ev.title} · ${fmtMins(sessionMinutes(ev))}` : ev.title;
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

  // Today's work sessions, shown above the Today list with a tick box.
  function renderTodaySessions() {
    const box = $("todaySessions");
    const today = toKey(new Date());
    const list = taskTab === "today"
      ? state.events.filter((ev) => ev.auto && ev.date === today).sort((a, b) => a.start.localeCompare(b.start))
      : [];
    box.hidden = !list.length;
    if (!list.length) { box.replaceChildren(); return; }
    const head = document.createElement("h2");
    head.className = "section-label";
    head.textContent = "Work sessions today";
    const ul = document.createElement("ul");
    ul.className = "task-list";
    list.forEach((ev) => {
      const li = document.createElement("li");
      li.className = "task session-row" + (ev.done ? " done" : "") + (missed(ev) ? " missed" : "");
      const check = document.createElement("button");
      check.type = "button";
      check.className = "check";
      check.setAttribute("aria-label", ev.done ? "Mark session not done" : "Mark session done");
      check.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"/></svg>';
      check.addEventListener("click", () => toggleSession(ev));
      const body = document.createElement("div");
      body.className = "task-body";
      const title = document.createElement("span");
      title.className = "task-title";
      title.textContent = ev.title;
      const meta = document.createElement("span");
      meta.className = "task-meta";
      meta.textContent = `${formatTime(ev.start)} · ${fmtMins(sessionMinutes(ev))}${missed(ev) ? " · missed, moved to later sessions" : ""}`;
      body.append(title, meta);
      li.append(check, body);
      ul.append(li);
    });
    box.replaceChildren(head, ul);
  }

  // On today's Schedule, the Today list's open tasks (not already listed as
  // due) follow the due list as plain bullet points; tap one to edit it.
  function renderTodayBullets() {
    const ul = $("todayBullets");
    const list = selectedDay === toKey(new Date())
      ? state.tasks.filter((t) => inToday(t) && !t.done && t.date !== selectedDay).sort(byDateThenCreated)
      : [];
    ul.hidden = $("todayBulletsLabel").hidden = !list.length;
    ul.replaceChildren(...list.map((t) => {
      const li = document.createElement("li");
      li.textContent = t.title;
      if (t.date) {
        const small = document.createElement("small");
        small.textContent = dueText(t.date);
        li.append(small);
      }
      li.addEventListener("click", () => openEditor("task", t));
      return li;
    }));
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
    renderTodayBullets();
    renderTimeline();

    const todayTasks = state.tasks.filter(inToday);
    const otherTasks = state.tasks.filter((t) => !inToday(t));
    $("todayCount").textContent = todayTasks.filter((t) => !t.done).length || "";
    $("allCount").textContent = otherTasks.filter((t) => !t.done).length || "";
    // Open tasks first, then completed ones (most recently finished on top).
    const order = (a, b) => a.done - b.done || (a.done ? (b.doneAt || 0) - (a.doneAt || 0) : byDateThenCreated(a, b));
    renderTodaySessions();
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
  // Built once per opening; afterwards refreshDue() only updates the highlight.
  function paintDue() {
    const chips = $("dueChips");
    chips.replaceChildren(...dueChoices().map((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "due-chip";
      b.dataset.value = c.value;
      b.textContent = c.label;
      b.addEventListener("click", () => {
        dueValue = c.value;
        if (dueValue) calMonth = dueValue.slice(0, 7); // show the picked day
        refreshDue();
      });
      return b;
    }));
    // The app's own month calendar sits right in the sheet (native date
    // fields misbehave in installed apps), starting on the due date's month.
    calMonth = (dueValue || toKey(new Date())).slice(0, 7);
    refreshDue();
  }

  let calMonth = ""; // "YYYY-MM" shown in the due-date calendar
  function paintCalendar() {
    const cal = $("dueCalendar");
    const [y, m] = calMonth.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const today = toKey(new Date());
    const shift = (n) => { const d = new Date(y, m - 1 + n, 1); calMonth = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; paintCalendar(); };
    const head = document.createElement("div");
    head.className = "cal-head";
    const prev = document.createElement("button");
    prev.type = "button"; prev.className = "cal-nav"; prev.textContent = "‹"; prev.setAttribute("aria-label", "Previous month");
    prev.addEventListener("click", () => shift(-1));
    const next = document.createElement("button");
    next.type = "button"; next.className = "cal-nav"; next.textContent = "›"; next.setAttribute("aria-label", "Next month");
    next.addEventListener("click", () => shift(1));
    const title = document.createElement("strong");
    title.textContent = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    head.append(prev, title, next);

    const grid = document.createElement("div");
    grid.className = "cal-grid";
    for (let i = 0; i < 7; i++) {
      const w = document.createElement("span");
      w.className = "cal-dow";
      w.textContent = new Date(2024, 0, 1 + i).toLocaleDateString(undefined, { weekday: "narrow" });
      grid.append(w);
    }
    for (let i = 0; i < lead; i++) grid.append(document.createElement("span"));
    for (let d = 1; d <= daysInMonth(y, m - 1); d++) {
      const key = `${calMonth}-${pad(d)}`;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cal-day" + (key === dueValue ? " on" : "") + (key === today ? " today" : "") + (key < today ? " past" : "");
      b.textContent = d;
      // Tap a day to set it; tap it again to clear the due date.
      b.addEventListener("click", () => {
        dueValue = dueValue === key ? "" : key;
        refreshDue();
      });
      grid.append(b);
    }
    cal.replaceChildren(head, grid);
  }
  function refreshDue() {
    const chips = $("dueChips");
    chips.querySelectorAll(".due-chip[data-value]").forEach((b) => b.classList.toggle("on", b.dataset.value === dueValue));
    paintCalendar();
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
    f.planWork.checked = kind === "task" && item ? !!item.plan : false;
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
    if (kind === "task") data.plan = f.planWork.checked;
    if (kind === "event") Object.assign(data, { start: f.start.value, end: f.end.value });
    const list = kind === "event" ? state.events : state.tasks;
    if (editing) {
      const item = list.find((x) => x.id === editing.id);
      if (kind === "task") {
        data.planned = f.today.checked ? (inToday(item) ? item.planned : toKey(new Date())) : null;
        if (!data.plan) dropSessions(item.id); // switched off: its upcoming sessions go
      }
      touch(Object.assign(item, data));
    } else {
      const extra = kind === "task" ? { done: false, planned: f.today.checked ? toKey(new Date()) : null } : {};
      list.push(touch({ id: uid(), created: Date.now(), ...extra, ...data }));
    }
    if (data.date) selectedDay = data.date;
    save();
    render();
    autoPlan();
  });

  $("cancelButton").addEventListener("click", () => dialog.close());
  $("planButtonTasks").addEventListener("click", openPlanDialog);
  $("deleteButton").addEventListener("click", () => {
    if (!editing) return;
    const key = editing.kind === "event" ? "events" : "tasks";
    state[key] = state[key].filter((x) => x.id !== editing.id);
    bury(editing.kind, editing.id);
    if (editing.kind === "task") dropSessions(editing.id, true);
    save();
    dialog.close();
    render();
    autoPlan();
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
    state, save, writeLocal, touch, bury, uid, pad, render, enableSwipe, setRowOpen, showToast,
    saveHooks, renderHooks, viewHooks, addHandlers,
  };

  render();
})();
