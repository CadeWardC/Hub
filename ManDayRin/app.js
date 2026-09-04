(function () {
  "use strict";

  const STORAGE_KEY = "mandayrinState.v1";
  const kinds = ["noun", "verb", "adjective"];
  const labels = { noun: "Noun", verb: "Verb", adjective: "Adjective" };
  const vocab = window.MANDAYRIN_VOCAB;
  const todayKey = localDateKey(new Date());
  let deferredInstallPrompt = null;
  let activeFilter = "all";
  let reminderTimer = null;

  const state = loadState();
  const day = getCourseDay(state.startedOn);
  ensureTodaySelection();
  renderToday();
  bindNavigation();
  bindHistoryFilters();
  setupInstall();
  setupReminders();
  registerWebMcpTools();
  registerServiceWorker();

  function defaultState() {
    return { startedOn: todayKey, selections: {}, history: [], reminder: { enabled: false, time: "09:00", lastNotified: "" } };
  }

  function loadState() {
    try {
      const defaults = defaultState();
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return { ...defaults, ...saved, reminder: { ...defaults.reminder, ...(saved.reminder || {}) } };
    } catch (_) {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const dayOfMonth = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${dayOfMonth}`;
  }

  function getCourseDay(startKey) {
    const [sy, sm, sd] = startKey.split("-").map(Number);
    const start = new Date(sy, sm - 1, sd);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.min(365, Math.max(1, Math.floor((now - start) / 86400000) + 1));
  }

  function scheduledIndex(kind, dayNumber) {
    const band = bandForDay(dayNumber);
    const bandStart = band * 40;
    const dayInBand = dayNumber - (band * 120) - 1;
    return bandStart + (dayInBand % 40);
  }

  function bandForDay(dayNumber) {
    if (dayNumber <= 120) return 0;
    if (dayNumber <= 240) return 1;
    return 2;
  }

  function ensureTodaySelection() {
    if (!state.selections[todayKey]) state.selections[todayKey] = {};
    kinds.forEach((kind) => {
      if (typeof state.selections[todayKey][kind] !== "number") {
        state.selections[todayKey][kind] = scheduledIndex(kind, day);
      }
      recordWord(kind, state.selections[todayKey][kind], false);
    });
    saveState();
  }

  function recordWord(kind, index, rerolled) {
    const word = vocab[kind][index];
    const fingerprint = `${todayKey}:${kind}:${word[0]}`;
    if (state.history.some((entry) => entry.fingerprint === fingerprint)) return;
    state.history.push({ fingerprint, date: todayKey, day, kind, word, rerolled, seenAt: Date.now() });
  }

  function renderToday() {
    const formatted = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());
    document.querySelector("#dateLabel").textContent = formatted;
    document.querySelector("#dayNumber").textContent = String(day).padStart(3, "0");
    document.querySelector("#progressFill").style.width = `${(day / 365) * 100}%`;
    document.querySelector("#levelLabel").textContent = day <= 120 ? "First steps · very basic" : day <= 240 ? "Everyday basics · still beginner" : "Growing basics · beginner";

    document.querySelector("#wordStack").innerHTML = kinds.map((kind) => {
      const word = vocab[kind][state.selections[todayKey][kind]];
      return `<article class="word-card" data-kind="${kind}">
        <div>
          <p class="part-of-speech">${labels[kind]}</p>
          <p class="hanzi" lang="zh-Hans">${word[0]}</p>
          <p class="pinyin">${word[1]}</p>
          <p class="meaning">${word[2]}</p>
        </div>
        <div class="card-actions">
          <button class="word-action speak-button" type="button" data-speak="${kind}" aria-label="Hear ${word[0]} pronounced">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 10v4h3l4 4V6L8 10H5zM16 9a4 4 0 0 1 0 6m2-8a7 7 0 0 1 0 10"/></svg>
          </button>
          <button class="word-action reroll-button" type="button" data-reroll="${kind}" aria-label="Reroll the ${labels[kind].toLowerCase()}">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 7h-5V2M4 17h5v5M19 12a7 7 0 0 0-12-5l-3 3m1 2a7 7 0 0 0 12 5l3-3"/></svg>
          </button>
        </div>
      </article>`;
    }).join("");

    document.querySelectorAll("[data-reroll]").forEach((button) => {
      button.addEventListener("click", () => reroll(button.dataset.reroll));
    });
    document.querySelectorAll("[data-speak]").forEach((button) => {
      button.addEventListener("click", () => speakWord(button.dataset.speak, button));
    });
  }

  function speakWord(kind, button) {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      showToast("Speech is not available in this browser");
      return;
    }
    const word = vocab[kind][state.selections[todayKey][kind]];
    const utterance = new SpeechSynthesisUtterance(word[0]);
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => /^zh-CN$/i.test(voice.lang)) || voices.find((voice) => /^zh/i.test(voice.lang)) || null;
    utterance.lang = "zh-CN";
    utterance.rate = 0.78;
    utterance.pitch = 1;
    utterance.onstart = () => { if (button) button.classList.add("speaking"); };
    utterance.onend = utterance.onerror = () => { if (button) button.classList.remove("speaking"); };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function reroll(kind) {
    const current = state.selections[todayKey][kind];
    const bandStart = bandForDay(day) * 40;
    const bandIndexes = Array.from({ length: 40 }, (_, index) => bandStart + index);
    const seenToday = new Set(state.history.filter((entry) => entry.date === todayKey && entry.kind === kind).map((entry) => entry.word[0]));
    let candidates = bandIndexes.filter((index) => index !== current && !seenToday.has(vocab[kind][index][0]));
    if (!candidates.length) candidates = bandIndexes.filter((index) => index !== current);
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    state.selections[todayKey][kind] = next;
    recordWord(kind, next, true);
    saveState();
    renderToday();
    showToast(`New ${labels[kind].toLowerCase()} added to history`);
    return { kind, hanzi: vocab[kind][next][0], pinyin: vocab[kind][next][1], meaning: vocab[kind][next][2] };
  }

  function bindNavigation() {
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".view").forEach((view) => { view.hidden = view.id !== button.dataset.view; });
        document.querySelectorAll("[data-view]").forEach((item) => {
          const active = item === button;
          item.classList.toggle("active", active);
          if (active) item.setAttribute("aria-current", "page"); else item.removeAttribute("aria-current");
        });
        if (button.dataset.view === "historyView") renderHistory();
      });
    });
  }

  function bindHistoryFilters() {
    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.filter;
        document.querySelectorAll("[data-filter]").forEach((chip) => chip.classList.toggle("active", chip === button));
        renderHistory();
      });
    });
  }

  function renderHistory() {
    const entries = state.history.filter((entry) => activeFilter === "all" || entry.kind === activeFilter).slice().reverse();
    document.querySelector("#historyTotal").textContent = `${state.history.length} ${state.history.length === 1 ? "word" : "words"}`;
    document.querySelector("#historyList").innerHTML = entries.length ? entries.map((entry) => `<article class="history-entry">
      <span class="history-hanzi" lang="zh-Hans">${entry.word[0]}</span>
      <div class="history-word"><strong>${entry.word[1]} · ${entry.word[2]}</strong><span>Day ${entry.day}${entry.rerolled ? " · rerolled" : ""}</span></div>
      <span class="history-kind">${labels[entry.kind]}</span>
    </article>`).join("") : `<div class="empty-state"><strong>No words here yet</strong>Your vocabulary will appear as you learn.</div>`;
  }

  function showToast(message) {
    const toast = document.querySelector("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function setupReminders() {
    const toggle = document.querySelector("#reminderToggle");
    const timeInput = document.querySelector("#reminderTime");
    const saveButton = document.querySelector("#saveReminderButton");
    const testButton = document.querySelector("#testReminderButton");
    const calendarButton = document.querySelector("#calendarReminderButton");

    toggle.checked = state.reminder.enabled;
    timeInput.value = validTime(state.reminder.time) ? state.reminder.time : "09:00";
    renderReminderStatus();
    scheduleLocalReminder();

    saveButton.addEventListener("click", async () => {
      const enabled = toggle.checked;
      const time = validTime(timeInput.value) ? timeInput.value : "09:00";

      if (enabled && !(await ensureNotificationPermission())) {
        toggle.checked = false;
        state.reminder.enabled = false;
        saveState();
        syncReminderToServiceWorker();
        scheduleLocalReminder();
        renderReminderStatus("Notifications could not be enabled. Check your browser or phone settings.");
        return;
      }

      state.reminder.enabled = enabled;
      state.reminder.time = time;
      saveState();
      syncReminderToServiceWorker();
      scheduleLocalReminder();
      renderReminderStatus();
      showToast(enabled ? `Daily reminder set for ${formatReminderTime(time)}` : "Daily reminder turned off");
    });

    testButton.addEventListener("click", async () => {
      if (!(await ensureNotificationPermission())) {
        renderReminderStatus("Allow notifications in your phone or browser settings to send a test.");
        return;
      }
      await showReminderNotification(true);
      showToast("Test notification sent");
    });

    calendarButton.addEventListener("click", () => createCalendarReminder(timeInput.value));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") maybeSendDueReminder();
    });
    window.addEventListener("focus", maybeSendDueReminder);
    maybeSendDueReminder();
  }

  function validTime(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value || "");
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  async function ensureNotificationPermission() {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIos && !isStandalone()) {
      renderReminderStatus("On iPhone or iPad, install ManDayRin first, then enable reminders from the Home Screen app.");
      return false;
    }
    if (!("Notification" in window) || !window.isSecureContext) {
      renderReminderStatus("Notifications need the installed app or a secure browser connection.");
      return false;
    }
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    try {
      return (await Notification.requestPermission()) === "granted";
    } catch (_) {
      return false;
    }
  }

  function renderReminderStatus(message) {
    const status = document.querySelector("#reminderStatus");
    if (message) {
      status.textContent = message;
      return;
    }
    if (state.reminder.enabled && "Notification" in window && Notification.permission === "denied") {
      status.textContent = "The reminder is saved, but notifications are blocked in your device settings.";
      return;
    }
    status.textContent = state.reminder.enabled
      ? `Daily reminder active at ${formatReminderTime(state.reminder.time)} on this device.`
      : "Reminders are off.";
  }

  function formatReminderTime(time) {
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  }

  function scheduleLocalReminder() {
    clearTimeout(reminderTimer);
    if (!state.reminder.enabled || !validTime(state.reminder.time)) return;
    const [hours, minutes] = state.reminder.time.split(":").map(Number);
    const now = new Date();
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    reminderTimer = setTimeout(async () => {
      await showReminderNotification(false);
      scheduleLocalReminder();
    }, next - now);
  }

  async function maybeSendDueReminder() {
    if (!("Notification" in window) || !state.reminder.enabled || state.reminder.lastNotified === todayKey || Notification.permission !== "granted") return;
    const now = new Date();
    const currentMinutes = (now.getHours() * 60) + now.getMinutes();
    const [hours, minutes] = state.reminder.time.split(":").map(Number);
    if (currentMinutes >= (hours * 60) + minutes) await showReminderNotification(false);
  }

  async function showReminderNotification(test) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const todaysWords = kinds.map((kind) => vocab[kind][state.selections[todayKey][kind]][0]).join(" · ");
    const title = test ? "ManDayRin notifications are ready" : "Three new words are waiting";
    const options = {
      body: test ? "Your daily reminder will sound like this." : `${todaysWords} — keep your Mandarin streak moving.`,
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      tag: test ? `mandayrin-test-${Date.now()}` : `mandayrin-${todayKey}`,
      data: { url: "./" }
    };

    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
    } else {
      new Notification(title, options);
    }

    if (!test) {
      state.reminder.lastNotified = todayKey;
      saveState();
      syncReminderToServiceWorker();
    }
  }

  function syncReminderToServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    navigator.serviceWorker.ready.then(async (registration) => {
      const worker = registration.active || registration.waiting || registration.installing;
      const words = kinds.map((kind) => vocab[kind][state.selections[todayKey][kind]][0]);
      if (worker) worker.postMessage({ type: "SAVE_REMINDER", reminder: { ...state.reminder, words } });
      if (!("periodicSync" in registration)) return;
      try {
        if (state.reminder.enabled) {
          await registration.periodicSync.register("mandayrin-daily-reminder", { minInterval: 24 * 60 * 60 * 1000 });
        } else {
          await registration.periodicSync.unregister("mandayrin-daily-reminder");
        }
      } catch (_) {
        // Background scheduling is best-effort; the active-app timer remains available.
      }
    }).catch(() => {});
  }

  function createCalendarReminder(time) {
    const safeTime = validTime(time) ? time : "09:00";
    const [hours, minutes] = safeTime.split(":").map(Number);
    const start = new Date();
    start.setHours(hours, minutes, 0, 0);
    if (start <= new Date()) start.setDate(start.getDate() + 1);
    const localStamp = `${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, "0")}${String(start.getDate()).padStart(2, "0")}T${String(hours).padStart(2, "0")}${String(minutes).padStart(2, "0")}00`;
    const utcStamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const calendar = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "CALSCALE:GREGORIAN", "PRODID:-//ManDayRin//Daily Reminder//EN",
      "BEGIN:VEVENT", `UID:mandayrin-${Date.now()}@local`, `DTSTAMP:${utcStamp}`, `DTSTART:${localStamp}`,
      "DURATION:PT10M", "RRULE:FREQ=DAILY;COUNT=365", "SUMMARY:Learn today’s Mandarin words",
      "DESCRIPTION:Open ManDayRin for today’s noun, verb, and adjective.",
      "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", "DESCRIPTION:Your ManDayRin words are ready.",
      "END:VALARM", "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "mandayrin-daily-reminder.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Open the calendar file to finish adding the alert");
  }

  function setupInstall() {
    const button = document.querySelector("#installButton");
    const dialog = document.querySelector("#installDialog");
    const standalone = isStandalone();
    button.hidden = standalone;
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      button.hidden = false;
    });
    button.addEventListener("click", async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        button.hidden = true;
      } else {
        dialog.hidden = false;
        document.body.style.overflow = "hidden";
        dialog.querySelector(".dialog-close").focus();
      }
    });
    dialog.querySelectorAll("[data-close-install]").forEach((closeButton) => closeButton.addEventListener("click", closeInstallDialog));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !dialog.hidden) closeInstallDialog(); });

    function closeInstallDialog() {
      dialog.hidden = true;
      document.body.style.overflow = "";
      button.focus();
    }
  }

  function registerWebMcpTools() {
    const context = document.modelContext;
    if (!context || typeof context.registerTool !== "function") return;
    try {
      Promise.resolve(context.registerTool({
        name: "reroll_daily_word",
        title: "Reroll a daily word",
        description: "Replace today's noun, verb, or adjective with another beginner word and add it to vocabulary history.",
        inputSchema: {
          type: "object",
          properties: { partOfSpeech: { type: "string", enum: kinds } },
          required: ["partOfSpeech"],
          additionalProperties: false
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          if (!input || !kinds.includes(input.partOfSpeech)) throw new Error("Choose noun, verb, or adjective.");
          return reroll(input.partOfSpeech);
        }
      })).catch(() => {});
      Promise.resolve(context.registerTool({
        name: "speak_daily_word",
        title: "Speak a daily word",
        description: "Pronounce today's noun, verb, or adjective with the device's Mandarin voice.",
        inputSchema: {
          type: "object",
          properties: { partOfSpeech: { type: "string", enum: kinds } },
          required: ["partOfSpeech"],
          additionalProperties: false
        },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute(input) {
          if (!input || !kinds.includes(input.partOfSpeech)) throw new Error("Choose noun, verb, or adjective.");
          const word = vocab[input.partOfSpeech][state.selections[todayKey][input.partOfSpeech]];
          speakWord(input.partOfSpeech, document.querySelector(`[data-speak="${input.partOfSpeech}"]`));
          return { kind: input.partOfSpeech, hanzi: word[0], pinyin: word[1] };
        }
      })).catch(() => {});
      Promise.resolve(context.registerTool({
        name: "set_daily_reminder",
        title: "Set the daily reminder",
        description: "Turn the device-local daily vocabulary reminder on or off and set its time.",
        inputSchema: {
          type: "object",
          properties: {
            enabled: { type: "boolean" },
            time: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" }
          },
          required: ["enabled", "time"],
          additionalProperties: false
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input) {
          if (!input || typeof input.enabled !== "boolean" || !validTime(input.time)) throw new Error("Provide enabled and a 24-hour time such as 09:00.");
          if (input.enabled && !(await ensureNotificationPermission())) throw new Error("Notification permission is required before enabling the reminder.");
          state.reminder.enabled = input.enabled;
          state.reminder.time = input.time;
          document.querySelector("#reminderToggle").checked = input.enabled;
          document.querySelector("#reminderTime").value = input.time;
          saveState();
          syncReminderToServiceWorker();
          scheduleLocalReminder();
          renderReminderStatus();
          return { enabled: state.reminder.enabled, time: state.reminder.time };
        }
      })).catch(() => {});
    } catch (_) {
      // WebMCP is optional and still experimental.
    }
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").then(() => syncReminderToServiceWorker()).catch(() => {}));
    }
  }
})();
