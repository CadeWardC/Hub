(function () {
  "use strict";

  const STORAGE_KEY = "mandayrinState.v2";
  const LEGACY_STORAGE_KEY = "mandayrinState.v1";
  const course = window.MANDAYRIN_COURSE;
  const TOTAL_WEEKS = course.themes.length;
  const mainKinds = ["noun", "verb", "adjective"];
  const labels = {
    noun: "Noun", verb: "Verb", adjective: "Adjective", pronoun: "Pronoun", number: "Number",
    measure: "Measure word", question: "Question word", adverb: "Adverb", particle: "Particle",
    conjunction: "Conjunction", phrase: "Phrase", time: "Time word", position: "Position word",
    preposition: "Preposition"
  };
  // Recorded clips (build_audio.py): per week, a "words" pack (theme + words) and a "lines" pack (sentences).
  const audioIndex = window.MANDAYRIN_AUDIO || {};
  const audioPacks = new Map();
  const speakerIcon = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 10v4h3l4 4V6L8 10H5zM16 9a4 4 0 0 1 0 6m2-8a7 7 0 0 1 0 10"/></svg>`;
  const todayKey = localDateKey(new Date());
  const words = buildWords();
  const wordById = new Map(words.map((word) => [word.id, word]));
  let deferredInstallPrompt = null;
  let activeFilter = "all";
  let historyQuery = "";
  let reminderTimer = null;
  let activeUtterance = null;
  let activeWordAudio = null;
  let activeWordAudioUrl = null;
  let activeWordButton = null;
  let playback = null;
  let sheetReturnFocus = null;
  let quizState = { current: null, choices: [], correct: 0, attempts: 0, questionNumber: 0, answered: false, previousKey: "" };

  const state = loadState();
  // ?week=N previews the course as if N weeks had unlocked (nothing is saved for it).
  const previewWeek = Number(new URLSearchParams(location.search).get("week"));
  const currentWeek = Number.isInteger(previewWeek) && previewWeek >= 1 && previewWeek <= TOTAL_WEEKS ? previewWeek : weekNumber(state.startedOn);
  let selectedWeek = currentWeek;
  let scenarioIndex = 0;
  saveState();
  renderWeek();
  configureSpeechAudioSession();
  bindNavigation();
  bindSpeakButtons();
  bindWeekControls();
  bindScenarioView();
  bindHistoryFilters();
  bindHistorySearch();
  setupSheets();
  setupQuiz();
  setupInstall();
  setupReminders();
  registerWebMcpTools();
  registerServiceWorker();

  function buildWords() {
    return Object.keys(course.weeks).map(Number).sort((a, b) => a - b).flatMap((week) =>
      course.weeks[week].words.map(([hanzi, pinyin, meaning, kind, exZh, exPy, exEn], index) => ({
        id: `${week}-${index}`, week, index, hanzi, pinyin, meaning, kind, example: { zh: exZh, py: exPy, en: exEn }
      })));
  }

  function defaultState() {
    return {
      startedOn: localDateKey(mondayOf(new Date())),
      reminder: { enabled: false, time: "09:00", lastNotified: "" },
      prefs: { pinyin: true, english: true }
    };
  }

  function loadState() {
    const defaults = defaultState();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved) {
        return {
          ...defaults,
          ...saved,
          startedOn: /^\d{4}-\d{2}-\d{2}$/.test(saved.startedOn || "") ? saved.startedOn : defaults.startedOn,
          reminder: { ...defaults.reminder, ...(saved.reminder || {}) },
          prefs: { ...defaults.prefs, ...(saved.prefs || {}) }
        };
      }
      // The weekly course starts fresh; only reminder settings carry over from the daily version.
      const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "null");
      if (legacy?.reminder) defaults.reminder = { ...defaults.reminder, ...legacy.reminder };
    } catch (_) {
      // Fall back to a fresh course.
    }
    return defaults;
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

  function parseDateKey(key) {
    const [year, month, date] = key.split("-").map(Number);
    return new Date(year, month - 1, date);
  }

  function mondayOf(date) {
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return monday;
  }

  function weekNumber(startKey) {
    const start = parseDateKey(startKey);
    const now = new Date();
    const elapsedDays = Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000);
    return Math.min(TOTAL_WEEKS, Math.max(1, Math.floor(elapsedDays / 7) + 1));
  }

  function weekStart(week) {
    const date = parseDateKey(state.startedOn);
    date.setDate(date.getDate() + ((week - 1) * 7));
    return date;
  }

  function levelFor(week) {
    return course.levels.find((level) => week >= level.from && week <= level.to) || course.levels[0];
  }

  function theme(week) {
    const [en, zh, py] = course.themes[week - 1];
    return { en, zh, py };
  }

  function pad(number) {
    return String(number).padStart(2, "0");
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
  }

  function accentKind(kind) {
    return mainKinds.includes(kind) ? kind : "other";
  }

  function sayButton(text, label, clip = "") {
    return `<button class="mini-speak" type="button" data-say="${esc(text)}" data-clip="${clip}" aria-label="${esc(label)}">${speakerIcon}</button>`;
  }

  function formatShortDate(date) {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
  }

  // ----- Week view -----

  function renderWeek() {
    const weekTheme = theme(selectedWeek);
    const isCurrent = selectedWeek === currentWeek;
    const level = levelFor(selectedWeek);
    const start = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" }).format(weekStart(selectedWeek));
    document.querySelector("#weekDateLabel").textContent = isCurrent ? `This week · from ${start}` : `Week of ${start}`;
    document.querySelector("#weekNumber").textContent = pad(selectedWeek);
    document.querySelector("#progressFill").style.width = `${(currentWeek / TOTAL_WEEKS) * 100}%`;
    document.querySelector("#levelLabel").textContent = `Level ${level.number} · ${level.name}`;
    document.querySelector("#themeZh").textContent = weekTheme.zh;
    document.querySelector("#themePinyin").textContent = weekTheme.py;
    document.querySelector("#themeEn").textContent = weekTheme.en;
    document.querySelector("#themeSpeak").dataset.say = weekTheme.zh;
    document.querySelector("#themeSpeak").dataset.clip = `${selectedWeek}:t`;
    loadAudio(selectedWeek, "words");
    loadAudio(selectedWeek, "lines");
    document.querySelector("#prevWeekButton").disabled = selectedWeek <= 1;
    document.querySelector("#nextWeekButton").disabled = selectedWeek >= currentWeek;
    document.querySelector("#weekPickerLabel").textContent = isCurrent ? "This week" : `Week ${pad(selectedWeek)}`;

    const data = course.weeks[selectedWeek];
    document.querySelector("#weekContent").innerHTML = data ? weekContentHtml(data) : `<div class="empty-state">
      <strong>Week ${selectedWeek}’s list is on its way</strong>
      The theme is set, but its 15 words and scenarios haven’t been written yet.
    </div>`;
  }

  function weekContentHtml(data) {
    const listWords = words.filter((word) => word.week === selectedWeek);
    return `<section class="week-block" aria-labelledby="wordListHeading">
      <div class="block-heading"><h2 id="wordListHeading">Word list</h2><span>${listWords.length} words</span></div>
      <div class="word-list">${listWords.map(wordRowHtml).join("")}</div>
    </section>

    <section class="week-block" aria-labelledby="patternsHeading">
      <div class="block-heading"><h2 id="patternsHeading">Patterns</h2><span>${pad(data.patterns.length)}</span></div>
      ${data.patterns.map(([zh, py, en, exZh, exPy, exEn], index) => `<article class="pattern">
        <div>
          <p class="pattern-frame" lang="zh-Hans">${esc(zh)}</p>
          <p class="pattern-meaning">${esc(py)} · ${esc(en)}</p>
          <p class="pattern-example"><span lang="zh-Hans">${esc(exZh)}</span> ${esc(exPy)} — ${esc(exEn)}</p>
        </div>
        ${sayButton(exZh, `Hear: ${exEn}`, `${selectedWeek}:p${index}`)}
      </article>`).join("")}
    </section>

    <section class="week-block" aria-labelledby="scenariosHeading">
      <div class="block-heading"><h2 id="scenariosHeading">Scenarios</h2><span>Read along</span></div>
      <div class="scenario-list">
        ${data.scenarios.map((scenario, index) => `<button class="scenario-card" type="button" data-open-scenario="${index}">
          <span class="scenario-index">${pad(index + 1)}</span>
          <strong>${esc(scenario.title)}</strong>
          <span class="scenario-card-zh" lang="zh-Hans">${esc(scenario.zh)}</span>
          <span class="scenario-card-setting">${esc(scenario.setting)}</span>
          <span class="scenario-card-meta">${scenario.lines.length} lines · Read along →</span>
        </button>`).join("")}
      </div>
    </section>`;
  }

  function wordRowHtml(word) {
    return `<article class="list-word" data-kind="${accentKind(word.kind)}">
      <div class="list-word-row">
        <button class="list-word-toggle" type="button" aria-expanded="false" data-expand-word="${word.id}">
          <span class="lw-hanzi" lang="zh-Hans">${esc(word.hanzi)}</span>
          <span class="lw-text"><strong>${esc(word.pinyin)}</strong><span>${esc(word.meaning)}</span><small>${labels[word.kind] || word.kind}</small></span>
        </button>
        ${sayButton(word.hanzi, `Hear ${word.hanzi} pronounced`, `${word.week}:w${word.index}`)}
      </div>
      <div class="list-word-example" hidden>
        <div>
          <p class="ex-zh" lang="zh-Hans">${esc(word.example.zh)}</p>
          <p class="ex-py">${esc(word.example.py)}</p>
          <p class="ex-en">${esc(word.example.en)}</p>
        </div>
        ${sayButton(word.example.zh, "Hear the example sentence", `${word.week}:x${word.index}`)}
      </div>
    </article>`;
  }

  function selectWeek(week) {
    selectedWeek = Math.min(currentWeek, Math.max(1, week));
    renderWeek();
  }

  function bindWeekControls() {
    document.querySelector("#prevWeekButton").addEventListener("click", () => selectWeek(selectedWeek - 1));
    document.querySelector("#nextWeekButton").addEventListener("click", () => selectWeek(selectedWeek + 1));
    document.querySelector("#weekPickerButton").addEventListener("click", (event) => {
      renderWeekList();
      openSheet(document.querySelector("#weekSheet"), event.currentTarget);
      document.querySelector("#weekList .week-row.active")?.scrollIntoView({ block: "center" });
    });
    document.querySelector("#weekList").addEventListener("click", (event) => {
      const row = event.target.closest("[data-pick-week]");
      if (!row || row.disabled) return;
      closeSheet(document.querySelector("#weekSheet"));
      selectWeek(Number(row.dataset.pickWeek));
      showView("weekView");
      window.scrollTo({ top: 0 });
    });
    document.querySelector("#weekContent").addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-expand-word]");
      if (toggle) {
        const open = toggle.getAttribute("aria-expanded") !== "true";
        toggle.setAttribute("aria-expanded", String(open));
        toggle.closest(".list-word").querySelector(".list-word-example").hidden = !open;
        return;
      }
      const card = event.target.closest("[data-open-scenario]");
      if (card) openScenario(Number(card.dataset.openScenario));
    });
  }

  function renderWeekList() {
    document.querySelector("#weekList").innerHTML = course.levels.map((level) => {
      const rows = [];
      for (let week = level.from; week <= level.to; week += 1) {
        const weekTheme = theme(week);
        const locked = week > currentWeek;
        const status = locked ? `Opens ${formatShortDate(weekStart(week))}` : week === currentWeek ? "This week" : course.weeks[week] ? "Open" : "Coming soon";
        rows.push(`<button class="week-row${week === selectedWeek ? " active" : ""}" type="button" data-pick-week="${week}"${locked ? " disabled" : ""}>
          <span class="wr-num">${pad(week)}</span>
          <span class="wr-theme"><strong>${esc(weekTheme.en)}</strong><span lang="zh-Hans">${esc(weekTheme.zh)}</span></span>
          <span class="wr-status">${status}</span>
        </button>`);
      }
      return `<p class="week-list-level">Level ${level.number} · ${esc(level.name)}</p>${rows.join("")}`;
    }).join("");
  }

  // ----- Scenario read-along -----

  function openScenario(index) {
    scenarioIndex = index;
    showView("scenarioView");
    renderScenario();
    window.scrollTo({ top: 0 });
  }

  function renderScenario() {
    stopPlayback();
    const data = course.weeks[selectedWeek];
    const scenario = data.scenarios[scenarioIndex];
    const dictionary = dictionaryFor(selectedWeek);
    document.querySelector("#scenarioBackLabel").textContent = `Week ${pad(selectedWeek)} · ${theme(selectedWeek).en}`;
    document.querySelector("#scenarioLabel").textContent = `Scenario ${pad(scenarioIndex + 1)} / ${pad(data.scenarios.length)}`;
    document.querySelector("#scenarioHeading").textContent = scenario.title;
    document.querySelector("#scenarioZh").textContent = scenario.zh;
    document.querySelector("#scenarioSetting").textContent = scenario.setting;
    document.querySelector("#dialogue").innerHTML = scenario.lines.map(([who, zh, py, en], index) => {
      const [name, namePinyin] = scenario.cast[who];
      return `<li class="line" data-speaker="${who % 2}" data-line="${index}">
        <div class="line-body">
          <p class="line-who"><span lang="zh-Hans">${esc(name)}</span> ${esc(namePinyin)}</p>
          <p class="line-zh" lang="zh-Hans">${tokenize(zh, dictionary)}</p>
          <p class="line-py">${esc(py)}</p>
          <p class="line-en">${esc(en)}</p>
        </div>
        ${sayButton(zh, `Hear line ${index + 1}`, `${selectedWeek}:s${scenarioIndex}-${index}`)}
      </li>`;
    }).join("");
    document.querySelector("#prevScenarioButton").disabled = scenarioIndex === 0;
    document.querySelector("#nextScenarioButton").disabled = scenarioIndex >= data.scenarios.length - 1;
    applyPrefs();
  }

  function dictionaryFor(week) {
    const known = new Map(words.filter((word) => word.week <= week).map((word) => [word.hanzi, word]));
    const names = new Set(course.names || []);
    const maxLength = Math.max(1, ...[...known.keys(), ...names].map((key) => key.length));
    return { week, known, names, maxLength };
  }

  // Greedy longest match against every word unlocked by this week, so taps work on earlier weeks' words too.
  function tokenize(text, dictionary) {
    let html = "";
    let position = 0;
    while (position < text.length) {
      let match = null;
      for (let length = Math.min(dictionary.maxLength, text.length - position); length > 0; length -= 1) {
        const piece = text.slice(position, position + length);
        if (dictionary.names.has(piece)) { match = { piece }; break; }
        const word = dictionary.known.get(piece);
        if (word) { match = { piece, word }; break; }
      }
      if (match?.word) {
        // Inline spans (not buttons) so Chinese punctuation never wraps onto its own line.
        html += `<span class="tok${match.word.week === dictionary.week ? " tok-new" : ""}" role="button" tabindex="0" data-word="${match.word.id}">${esc(match.piece)}</span>`;
      } else {
        html += esc(match ? match.piece : text[position]);
      }
      position += match ? match.piece.length : 1;
    }
    return html;
  }

  function bindScenarioView() {
    document.querySelector("#scenarioBack").addEventListener("click", () => {
      showView("weekView");
      document.querySelector(`[data-open-scenario="${scenarioIndex}"]`)?.focus();
    });
    document.querySelector("#prevScenarioButton").addEventListener("click", () => openScenario(scenarioIndex - 1));
    document.querySelector("#nextScenarioButton").addEventListener("click", () => openScenario(scenarioIndex + 1));
    document.querySelector("#playAllButton").addEventListener("click", togglePlayAll);
    document.querySelectorAll("[data-pref]").forEach((button) => {
      button.addEventListener("click", () => {
        state.prefs[button.dataset.pref] = !state.prefs[button.dataset.pref];
        saveState();
        applyPrefs();
      });
    });
    const dialogue = document.querySelector("#dialogue");
    dialogue.addEventListener("click", (event) => {
      const token = event.target.closest("[data-word]");
      if (token) openWordSheet(wordById.get(token.dataset.word), token);
    });
    dialogue.addEventListener("keydown", (event) => {
      const token = event.target.closest("[data-word]");
      if (!token || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      openWordSheet(wordById.get(token.dataset.word), token);
    });
  }

  function applyPrefs() {
    const dialogue = document.querySelector("#dialogue");
    dialogue.classList.toggle("hide-pinyin", !state.prefs.pinyin);
    dialogue.classList.toggle("hide-english", !state.prefs.english);
    document.querySelectorAll("[data-pref]").forEach((button) => {
      const on = Boolean(state.prefs[button.dataset.pref]);
      button.setAttribute("aria-pressed", String(on));
      button.classList.toggle("active", on);
    });
  }

  function togglePlayAll() {
    if (playback) {
      stopPlayback();
      return;
    }
    const lines = course.weeks[selectedWeek].scenarios[scenarioIndex].lines;
    const token = {};
    playback = token;
    document.querySelector("#playAllButton").textContent = "Stop";
    const playLine = (index) => {
      if (playback !== token) return;
      if (index >= lines.length) {
        stopPlayback();
        return;
      }
      document.querySelectorAll(".line").forEach((line) => line.classList.toggle("playing", Number(line.dataset.line) === index));
      const line = document.querySelector(`.line[data-line="${index}"]`);
      line.scrollIntoView({ block: "nearest", behavior: "smooth" });
      const button = line.querySelector("[data-say]");
      speakChinese(lines[index][1], button, (finished) => {
        if (playback !== token) return;
        if (!finished) {
          stopPlayback();
          return;
        }
        setTimeout(() => playLine(index + 1), 450);
      }, button.dataset.clip);
    };
    playLine(0);
  }

  function stopPlayback() {
    const wasPlaying = Boolean(playback);
    playback = null;
    document.querySelectorAll(".line.playing").forEach((line) => line.classList.remove("playing"));
    document.querySelector("#playAllButton").textContent = "Play all";
    if (wasPlaying) cancelSpeech();
  }

  // ----- Word sheet -----

  function openWordSheet(word, opener) {
    if (!word) return;
    const weekTheme = theme(word.week);
    document.querySelector("#sheetWeek").textContent = `WEEK ${pad(word.week)} · ${weekTheme.en.toUpperCase()} · ${(labels[word.kind] || word.kind).toUpperCase()}`;
    document.querySelector("#sheetHanzi").textContent = word.hanzi;
    document.querySelector("#sheetPinyin").textContent = word.pinyin;
    document.querySelector("#sheetMeaning").textContent = word.meaning;
    document.querySelector("#sheetExZh").textContent = word.example.zh;
    document.querySelector("#sheetExPy").textContent = word.example.py;
    document.querySelector("#sheetExEn").textContent = word.example.en;
    document.querySelector("#sheetExSpeak").dataset.say = word.example.zh;
    document.querySelector("#sheetExSpeak").dataset.clip = `${word.week}:x${word.index}`;
    document.querySelector("#sheetSpeak").dataset.say = word.hanzi;
    document.querySelector("#sheetSpeak").dataset.clip = `${word.week}:w${word.index}`;
    loadAudio(word.week, "words");
    loadAudio(word.week, "lines");
    openSheet(document.querySelector("#wordSheet"), opener);
  }

  function setupSheets() {
    document.querySelectorAll("[data-close-sheet]").forEach((button) => {
      button.addEventListener("click", () => closeSheet(button.closest(".install-dialog")));
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      document.querySelectorAll("#wordSheet, #weekSheet").forEach((sheet) => { if (!sheet.hidden) closeSheet(sheet); });
    });
  }

  function openSheet(sheet, opener) {
    sheetReturnFocus = opener || document.activeElement;
    sheet.hidden = false;
    document.body.style.overflow = "hidden";
    sheet.querySelector(".dialog-close").focus();
  }

  function closeSheet(sheet) {
    sheet.hidden = true;
    document.body.style.overflow = "";
    if (sheetReturnFocus && document.contains(sheetReturnFocus)) sheetReturnFocus.focus();
    sheetReturnFocus = null;
  }

  // ----- Speech -----

  function bindSpeakButtons() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-say]");
      if (!button || !button.dataset.say) return;
      stopPlayback();
      speakChinese(button.dataset.say, button, undefined, button.dataset.clip);
    });
  }

  function clipPart(key) {
    return key === "t" || /^w\d/.test(key) ? "words" : "lines";
  }

  // Fetches a week's pack once; a failed fetch is retried the next time it is asked for.
  function loadAudio(week, part) {
    const entry = audioIndex[week]?.[part];
    if (!entry) return;
    const id = `${week}:${part}`;
    if (audioPacks.has(id) && !audioPacks.get(id).failed) return;
    const pack = { buffer: null, failed: false };
    audioPacks.set(id, pack);
    fetch(`./audio/${entry.file}`).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.arrayBuffer();
    }).then((buffer) => {
      pack.buffer = buffer;
    }).catch((error) => {
      pack.failed = true;
      console.warn(`ManDayRin week ${week} ${part} recordings unavailable:`, error);
    });
  }

  // A clip ref is "week:key". Returns the recording, { loading: true }, or null (no recording: use device speech).
  function findClip(ref) {
    if (!ref) return null;
    const [week, key] = ref.split(":");
    const part = clipPart(key);
    const range = audioIndex[week]?.[part]?.clips[key];
    if (!range) return null;
    const pack = audioPacks.get(`${week}:${part}`);
    if (!pack || pack.failed) {
      loadAudio(week, part);
      return pack?.failed ? null : { loading: true };
    }
    return pack.buffer ? { buffer: pack.buffer, range } : { loading: true };
  }

  function cancelSpeech() {
    if (activeWordAudio) {
      activeWordAudio.pause();
      if (activeWordAudioUrl) URL.revokeObjectURL(activeWordAudioUrl);
      if (activeWordButton) activeWordButton.classList.remove("speaking");
      activeWordAudio = null;
      activeWordAudioUrl = null;
      activeWordButton = null;
    }
    if (activeUtterance) {
      activeUtterance = null;
      window.speechSynthesis?.cancel();
    }
    document.querySelectorAll(".speaking").forEach((element) => element.classList.remove("speaking"));
  }

  // onDone(true) fires when speech finishes normally, onDone(false) when it fails or is cut off.
  // Recordings play as media audio (not muted by the iPhone silent switch); device speech is only the fallback.
  function speakChinese(hanzi, button, onDone = () => {}, clipRef = "") {
    configureSpeechAudioSession();
    const clip = findClip(clipRef);
    if (clip?.buffer) {
      if (activeWordAudio) {
        activeWordAudio.pause();
        if (activeWordAudioUrl) URL.revokeObjectURL(activeWordAudioUrl);
        if (activeWordButton) activeWordButton.classList.remove("speaking");
      }
      if (activeUtterance) window.speechSynthesis?.cancel();
      const [offset, length] = clip.range;
      const blob = new Blob([clip.buffer.slice(offset, offset + length)], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      activeWordAudio = audio;
      activeWordAudioUrl = url;
      activeWordButton = button;
      const finish = () => {
        if (button) button.classList.remove("speaking");
        if (activeWordAudio === audio) {
          activeWordAudio = null;
          activeWordAudioUrl = null;
          activeWordButton = null;
        }
        URL.revokeObjectURL(url);
      };
      audio.onplaying = () => {
        if (button) button.classList.add("speaking");
      };
      audio.onended = () => {
        finish();
        onDone(true);
      };
      audio.onerror = () => {
        finish();
        showToast("Recording could not play. Try the speaker again.");
        onDone(false);
      };
      audio.play().catch(() => {
        finish();
        showToast("Recording could not play. Try the speaker again.");
        onDone(false);
      });
      return;
    }
    if (clip?.loading) {
      showToast("Audio is loading. Tap the speaker again shortly.");
      onDone(false);
      return;
    }
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      showToast("Speech is not available in this browser");
      onDone(false);
      return;
    }
    const synthesis = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(hanzi);
    const voices = synthesis.getVoices();
    const mandarinVoices = voices.filter((voice) => /^zh/i.test(voice.lang));
    utterance.voice = mandarinVoices.find((voice) => /^zh-CN$/i.test(voice.lang)) || mandarinVoices[0] || null;
    utterance.lang = "zh-CN";
    utterance.rate = 0.78;
    utterance.pitch = 1;
    utterance.onstart = () => {
      if (button) button.classList.add("speaking");
    };
    utterance.onend = () => {
      if (button) button.classList.remove("speaking");
      if (activeUtterance === utterance) activeUtterance = null;
      onDone(true);
    };
    utterance.onerror = (event) => {
      if (button) button.classList.remove("speaking");
      onDone(false);
      if (activeUtterance !== utterance) return;
      activeUtterance = null;
      if (event.error === "canceled" || event.error === "interrupted") return;
      const message = event.error === "language-unavailable" || event.error === "voice-unavailable"
        ? "Mandarin speech voice is unavailable on this device"
        : event.error === "not-allowed"
          ? "Speech was blocked. Tap the speaker again."
          : "Speech failed. Check your device sound settings.";
      showToast(message);
      console.warn("ManDayRin speech failed:", event.error);
    };
    activeUtterance = utterance;
    try {
      if (synthesis.speaking || synthesis.pending) {
        synthesis.cancel();
      }
      if (synthesis.paused) {
        synthesis.resume();
      }
      synthesis.speak(utterance);
    } catch (error) {
      activeUtterance = null;
      showToast("Speech failed. Try the speaker again.");
      console.warn("ManDayRin speech failed:", error);
      onDone(false);
    }
  }

  function configureSpeechAudioSession() {
    if (!("audioSession" in navigator)) return;
    try {
      navigator.audioSession.type = "playback";
    } catch (_) {
      // The media element still plays normally on browsers without this API.
    }
  }

  // ----- Navigation -----

  function showView(id) {
    if (id !== "scenarioView") stopPlayback();
    const navTarget = id === "scenarioView" ? "weekView" : id;
    document.querySelectorAll(".view").forEach((view) => { view.hidden = view.id !== id; });
    document.querySelectorAll("[data-view]").forEach((item) => {
      const active = item.dataset.view === navTarget;
      item.classList.toggle("active", active);
      if (active) item.setAttribute("aria-current", "page"); else item.removeAttribute("aria-current");
    });
    if (id === "historyView") {
      for (let week = 1; week <= currentWeek; week += 1) loadAudio(week, "words");
      renderHistory();
    }
  }

  function bindNavigation() {
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => showView(button.dataset.view));
    });
  }

  // ----- Words archive -----

  function unlockedWords() {
    return words.filter((word) => word.week <= currentWeek);
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

  function bindHistorySearch() {
    const input = document.querySelector("#historySearch");
    const clearButton = document.querySelector("#clearHistorySearch");
    input.addEventListener("input", () => {
      historyQuery = input.value;
      clearButton.hidden = !historyQuery;
      renderHistory();
    });
    clearButton.addEventListener("click", () => {
      input.value = "";
      historyQuery = "";
      clearButton.hidden = true;
      renderHistory();
      input.focus();
    });
  }

  function normalizeSearch(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[’']/g, "")
      .toLocaleLowerCase()
      .trim();
  }

  function matchesFilter(word) {
    if (activeFilter === "all") return true;
    if (activeFilter === "week") return word.week === currentWeek;
    if (activeFilter === "other") return !mainKinds.includes(word.kind);
    return word.kind === activeFilter;
  }

  function renderHistory() {
    const queryTokens = normalizeSearch(historyQuery).split(/\s+/).filter(Boolean);
    const unlocked = unlockedWords();
    const entries = unlocked.filter((word) => {
      if (!matchesFilter(word)) return false;
      if (!queryTokens.length) return true;
      const searchable = normalizeSearch(`${word.hanzi} ${word.pinyin} ${word.meaning}`);
      return queryTokens.every((token) => searchable.includes(token));
    }).sort((a, b) => b.week - a.week || a.index - b.index);
    const filtered = activeFilter !== "all" || queryTokens.length > 0;
    document.querySelector("#historyTotal").textContent = filtered
      ? `${entries.length} ${entries.length === 1 ? "match" : "matches"}`
      : `${unlocked.length} ${unlocked.length === 1 ? "word" : "words"}`;
    document.querySelector("#historyList").innerHTML = entries.length ? entries.map((word) => `<article class="history-entry">
      <span class="history-hanzi" lang="zh-Hans">${esc(word.hanzi)}</span>
      <div class="history-word"><strong>${esc(word.pinyin)} · ${esc(word.meaning)}</strong><span>Week ${pad(word.week)} · ${esc(theme(word.week).en)}</span></div>
      <div class="history-actions">
        <span class="history-kind">${labels[word.kind] || word.kind}</span>
        <button class="history-speak" type="button" data-say="${esc(word.hanzi)}" data-clip="${word.week}:w${word.index}" aria-label="Hear ${esc(word.hanzi)} pronounced">${speakerIcon}</button>
      </div>
    </article>`).join("") : `<div class="empty-state"><strong>${queryTokens.length ? "No matching words" : "No words here yet"}</strong>${queryTokens.length ? "Try another English word, pinyin spelling, or Chinese character." : "Words appear here as each week’s list unlocks."}</div>`;
  }

  // ----- Quiz -----

  function setupQuiz() {
    const toggleButton = document.querySelector("#quizToggleButton");
    const nextButton = document.querySelector("#quizNextButton");
    const speakButton = document.querySelector("#quizSpeakButton");

    toggleButton.addEventListener("click", () => toggleQuiz(toggleButton.getAttribute("aria-expanded") !== "true"));
    nextButton.addEventListener("click", nextQuizQuestion);
    speakButton.addEventListener("click", () => {
      const current = quizState.current;
      if (current) speakChinese(current.hanzi, speakButton, undefined, `${current.week}:w${current.index}`);
    });
  }

  function toggleQuiz(open) {
    const toggleButton = document.querySelector("#quizToggleButton");
    document.querySelector("#historyArchive").hidden = open;
    document.querySelector("#quizPanel").hidden = !open;
    toggleButton.setAttribute("aria-expanded", String(open));
    toggleButton.querySelector("span").textContent = open ? "Close quiz" : "Quiz";
    if (open) {
      if (!quizState.current) nextQuizQuestion();
      document.querySelector("#quizPanel").scrollIntoView({ block: "start", behavior: "smooth" });
    } else {
      renderHistory();
      toggleButton.focus();
    }
  }

  function nextQuizQuestion() {
    const learned = unlockedWords();
    if (!learned.length) return;
    // Half the questions come from this week's list; the rest review earlier weeks.
    const thisWeek = learned.filter((word) => word.week === currentWeek);
    const source = thisWeek.length && Math.random() < 0.5 ? thisWeek : learned;
    const alternatives = source.filter((word) => word.id !== quizState.previousKey);
    const pool = alternatives.length ? alternatives : learned;
    const current = pool[Math.floor(Math.random() * pool.length)];
    const meanings = (candidates) => candidates.map((word) => word.meaning)
      .filter((meaning, index, list) => meaning !== current.meaning && list.indexOf(meaning) === index);
    const sameKind = meanings(learned.filter((word) => accentKind(word.kind) === accentKind(current.kind)));
    const distractors = shuffle(sameKind.length >= 3 ? sameKind : meanings(learned.length >= 4 ? learned : words)).slice(0, 3);

    quizState = {
      ...quizState,
      current,
      choices: shuffle([current.meaning, ...distractors]),
      questionNumber: quizState.questionNumber + 1,
      answered: false,
      previousKey: current.id
    };
    renderQuiz();
  }

  function shuffle(items) {
    const shuffled = items.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  function renderQuiz() {
    const current = quizState.current;
    if (!current) return;
    document.querySelector("#quizKind").textContent = `Week ${pad(current.week)} · ${String(quizState.questionNumber).padStart(2, "0")}`;
    document.querySelector("#quizScore").textContent = `${quizState.correct} / ${quizState.attempts}`;
    document.querySelector("#quizHanzi").textContent = current.hanzi;
    document.querySelector("#quizPinyin").textContent = current.pinyin;
    document.querySelector("#quizFeedback").textContent = "";
    document.querySelector("#quizNextButton").hidden = true;
    const options = document.querySelector("#quizOptions");
    options.replaceChildren();
    quizState.choices.forEach((choice) => {
      const button = document.createElement("button");
      button.className = "quiz-option";
      button.type = "button";
      button.textContent = choice;
      button.addEventListener("click", () => answerQuiz(choice, button));
      options.appendChild(button);
    });
  }

  function answerQuiz(choice, selectedButton) {
    if (quizState.answered || !quizState.current) return;
    const correctMeaning = quizState.current.meaning;
    const correct = choice === correctMeaning;
    quizState.answered = true;
    quizState.attempts += 1;
    if (correct) quizState.correct += 1;

    document.querySelectorAll(".quiz-option").forEach((button) => {
      button.disabled = true;
      if (button.textContent === correctMeaning) button.classList.add("correct");
    });
    if (!correct) selectedButton.classList.add("wrong");
    document.querySelector("#quizScore").textContent = `${quizState.correct} / ${quizState.attempts}`;
    document.querySelector("#quizFeedback").textContent = correct
      ? "Correct. Nice work."
      : `Not quite — ${quizState.current.hanzi} means ${correctMeaning}.`;
    document.querySelector("#quizNextButton").hidden = false;
  }

  function showToast(message) {
    const toast = document.querySelector("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  // ----- Reminders -----

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

  function reminderBody() {
    const weekTheme = theme(currentWeek);
    return `Week ${currentWeek} · ${weekTheme.zh} ${weekTheme.en} — your list and scenarios are waiting.`;
  }

  async function showReminderNotification(test) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const isMonday = new Date().getDay() === 1;
    const title = test ? "ManDayRin notifications are ready" : isMonday ? "A new word list is ready" : "Time for your Mandarin";
    const options = {
      body: test ? "Your daily reminder will sound like this." : reminderBody(),
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
      if (worker) worker.postMessage({ type: "SAVE_REMINDER", reminder: { ...state.reminder, body: reminderBody() } });
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
      "DURATION:PT10M", "RRULE:FREQ=DAILY;COUNT=365", "SUMMARY:Practice this week’s Mandarin",
      "DESCRIPTION:Open ManDayRin for this week’s word list and scenarios.",
      "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", "DESCRIPTION:Your ManDayRin week is waiting.",
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
        name: "get_week_list",
        title: "Get a week's word list",
        description: "Return the theme, 15 words, and scenario titles for an unlocked week (defaults to the current week).",
        inputSchema: {
          type: "object",
          properties: { week: { type: "integer", minimum: 1, maximum: TOTAL_WEEKS } },
          additionalProperties: false
        },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute(input) {
          const week = input?.week ?? currentWeek;
          if (!Number.isInteger(week) || week < 1 || week > TOTAL_WEEKS) throw new Error(`Choose a week from 1 to ${TOTAL_WEEKS}.`);
          if (week > currentWeek) throw new Error(`Week ${week} unlocks on ${formatShortDate(weekStart(week))}.`);
          const data = course.weeks[week];
          return {
            week,
            theme: theme(week),
            written: Boolean(data),
            words: words.filter((word) => word.week === week).map(({ hanzi, pinyin, meaning, kind }) => ({ hanzi, pinyin, meaning, kind })),
            scenarios: data ? data.scenarios.map((scenario) => scenario.title) : []
          };
        }
      })).catch(() => {});
      Promise.resolve(context.registerTool({
        name: "set_daily_reminder",
        title: "Set the daily reminder",
        description: "Turn the device-local daily practice reminder on or off and set its time.",
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
