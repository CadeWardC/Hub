(() => {
  "use strict";

  const state = {
    settings: null,
    api: null,
    qwen: null,
    projects: [],
    project: null,
    books: [],
    book: null,
    step: 1,
    saveTimer: null,
    toastTimer: null,
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const elements = {
    deepseekStatus: $("#deepseekStatus"),
    saveState: $("#saveState"),
    stepEyebrow: $("#stepEyebrow"),
    stepTitle: $("#stepTitle"),
    storyTitle: $("#storyTitle"),
    storyIdea: $("#storyIdea"),
    storyLevel: $("#storyLevel"),
    storyLength: $("#storyLength"),
    storyConstraints: $("#storyConstraints"),
    storyPrompt: $("#storyPrompt"),
    englishStory: $("#englishStory"),
    revisionInstructions: $("#revisionInstructions"),
    wordCount: $("#wordCount"),
    readTime: $("#readTime"),
    qwenCard: $("#qwenCard"),
    emptyPackage: $("#emptyPackage"),
    packageError: $("#packageError"),
    packageView: $("#packageView"),
    packageTitle: $("#packageTitle"),
    packageTitlePinyin: $("#packageTitlePinyin"),
    segmentList: $("#segmentList"),
    checkpointStep: $("#checkpointStep"),
    audioStep: $("#audioStep"),
    publishStep: $("#publishStep"),
    checkpointButton: $("#checkpointButton"),
    audioButton: $("#generateAudioButton"),
    publishButton: $("#publishToFlutterButton"),
    historyDialog: $("#historyDialog"),
    historyList: $("#historyList"),
    booksDialog: $("#booksDialog"),
    booksList: $("#booksList"),
    newBookDialog: $("#newBookDialog"),
    bookTitle: $("#bookTitle"),
    bookIdea: $("#bookIdea"),
    bookLevel: $("#bookLevel"),
    bookChapterCount: $("#bookChapterCount"),
    bookConstraints: $("#bookConstraints"),
    chapterBanner: $("#chapterBanner"),
    chapterEyebrow: $("#chapterEyebrow"),
    chapterBookTitle: $("#chapterBookTitle"),
    chapterOutline: $("#chapterOutline"),
    toast: $("#toast"),
    busyOverlay: $("#busyOverlay"),
    busyTitle: $("#busyTitle"),
    busyMessage: $("#busyMessage"),
  };

  const titles = {
    1: ["Step 1 of 3", "Create the English story"],
    2: ["Step 2 of 3", "Review and approve"],
    3: ["Step 3 of 3", "Prepare the learning package"],
  };

  async function request(path, options = {}) {
    const config = {
      headers: { "Content-Type": "application/json" },
      ...options,
    };
    const response = await fetch(path, config);
    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }
    if (!response.ok) {
      throw new Error(payload.error || `Request failed (${response.status}).`);
    }
    return payload;
  }

  function showToast(message, isError = false) {
    clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.toggle("is-error", isError);
    elements.toast.classList.add("is-visible");
    state.toastTimer = setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 3600);
  }

  function setSaveState(message, saved = false) {
    elements.saveState.textContent = message;
    elements.saveState.classList.toggle("is-saved", saved);
  }

  function setBusy(active, title = "", message = "") {
    elements.busyOverlay.classList.toggle("is-hidden", !active);
    if (title) elements.busyTitle.textContent = title;
    if (message) elements.busyMessage.textContent = message;
  }

  function setPackageError(message = "") {
    elements.packageError.textContent = message;
    elements.packageError.classList.toggle("is-hidden", !message);
  }

  function defaultLevel() {
    return (state.levels && state.levels.default) || "TOCFL Novice 1";
  }

  // The TOCFL ladder lives in tocfl.py; building the dropdowns from the
  // bootstrap payload keeps the two from drifting apart.
  function fillLevelOptions() {
    const options = (state.levels && state.levels.options) || [];
    if (!options.length) return;
    [elements.storyLevel, elements.bookLevel].forEach((select) => {
      select.replaceChildren();
      options.forEach((option) => {
        const node = document.createElement("option");
        node.value = option.value;
        const words = option.budgeted
          ? `${option.wordCount} words`
          : `~${option.wordCount} words`;
        node.textContent = `${option.label} · ${option.cefr} · ${words}`;
        select.append(node);
      });
      select.value = defaultLevel();
    });
  }

  function formValues() {
    return {
      title: elements.storyTitle.value.trim(),
      idea: elements.storyIdea.value.trim(),
      level: elements.storyLevel.value,
      length: elements.storyLength.value,
      constraints: elements.storyConstraints.value.trim(),
      englishStory: elements.englishStory.value.trim(),
      revisionNotes: elements.revisionInstructions.value.trim(),
    };
  }

  function fillForm(project) {
    const value = project || {};
    elements.storyTitle.value = value.title || "";
    elements.storyIdea.value = value.idea || "";
    elements.storyLevel.value = value.level || defaultLevel();
    elements.storyLength.value = value.length || "600–900 words";
    elements.storyConstraints.value = value.constraints || "";
    elements.englishStory.value = value.englishStory || "";
    elements.revisionInstructions.value = value.revisionNotes || "";
    updateStoryStats();
    renderChapterBanner(project);
    renderPackage(value.package);
  }

  // Shows which chapter of which book the loaded project is, so a twelve-part
  /// book does not turn into twelve interchangeable drafts.
  function renderChapterBanner(project) {
    const book = project && project.book;
    elements.chapterBanner.classList.toggle("is-hidden", !book);
    if (!book) return;
    elements.chapterEyebrow.textContent = `Chapter ${book.chapterNumber} of ${book.chapterCount}`;
    elements.chapterBookTitle.textContent = book.titleChinese
      ? `${book.titleEnglish} · ${book.titleChinese}`
      : book.titleEnglish || "Book";
    elements.chapterOutline.textContent = book.chapterTitleEnglish || "";
  }

  function updateStoryStats() {
    const text = elements.englishStory.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const minutes = words ? Math.max(1, Math.ceil(words / 220)) : 0;
    elements.wordCount.textContent = `${words.toLocaleString()} words`;
    elements.readTime.textContent = `${minutes} min read`;
  }

  function desiredStepForProject(project) {
    if (!project) return 1;
    if (project.status === "ready" || project.status === "approved" || project.approved) return 3;
    if (project.englishStory) return 2;
    return 1;
  }

  function canOpenStep(step) {
    if (step === 1) return true;
    const story = elements.englishStory.value.trim();
    if (step === 2 && !story) {
      showToast("Generate or write the English story first.", true);
      return false;
    }
    if (step === 3 && !(state.project && state.project.approved)) {
      showToast("Approve the English story before opening Step 3.", true);
      return false;
    }
    return true;
  }

  function goToStep(step, force = false) {
    if (!force && !canOpenStep(step)) return;
    state.step = step;
    $$(".panel").forEach((panel) => {
      panel.classList.toggle("is-active", Number(panel.dataset.stepPanel) === step);
    });
    $$(".step").forEach((button) => {
      const buttonStep = Number(button.dataset.stepTarget);
      button.classList.toggle("is-active", buttonStep === step);
      button.classList.toggle("is-complete", buttonStep < step);
      button.setAttribute("aria-current", buttonStep === step ? "step" : "false");
    });
    elements.stepEyebrow.textContent = titles[step][0];
    elements.stepTitle.textContent = titles[step][1];
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveCurrentProject({ create = true, silent = false } = {}) {
    const values = formValues();
    setSaveState("Saving…");
    try {
      let result;
      if (!state.project) {
        if (!create) return null;
        result = await request("/api/projects", {
          method: "POST",
          body: JSON.stringify(values),
        });
      } else {
        result = await request(`/api/projects/${state.project.id}`, {
          method: "PUT",
          body: JSON.stringify({
            ...values,
            approved: state.project.approved,
          }),
        });
      }
      state.project = result.project;
      setSaveState("Saved locally", true);
      if (!silent) showToast("Story saved locally.");
      return state.project;
    } catch (error) {
      setSaveState("Save failed");
      if (!silent) showToast(error.message, true);
      throw error;
    }
  }

  function queueAutoSave() {
    updateStoryStats();
    if (!state.project) {
      setSaveState("Unsaved changes");
      return;
    }
    setSaveState("Unsaved changes");
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => {
      saveCurrentProject({ silent: true }).catch(() => {
        showToast("Could not save the latest changes.", true);
      });
    }, 900);
  }

  async function savePrompt() {
    const storyPrompt = elements.storyPrompt.value.trim();
    if (!storyPrompt) {
      showToast("The master prompt cannot be empty.", true);
      return;
    }
    try {
      const result = await request("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ storyPrompt }),
      });
      state.settings = result.settings;
      showToast("Master story prompt saved.");
    } catch (error) {
      showToast(error.message, true);
    }
  }

  async function generateStory() {
    if (!elements.storyIdea.value.trim()) {
      showToast("Add a story idea first.", true);
      elements.storyIdea.focus();
      return;
    }
    try {
      await saveCurrentProject({ silent: true });
      setBusy(
        true,
        "Writing the English story",
        "DeepSeek is following your saved prompt and story brief. This can take a minute.",
      );
      const result = await request(`/api/projects/${state.project.id}/generate`, {
        method: "POST",
        body: JSON.stringify(formValues()),
      });
      state.project = result.project;
      fillForm(state.project);
      goToStep(2, true);
      setSaveState("Draft saved", true);
      await refreshProjects();
      showToast("English story generated. Read and edit it before approval.");
    } catch (error) {
      showToast(error.message, true);
    } finally {
      setBusy(false);
    }
  }

  async function reviseStory() {
    const instructions = elements.revisionInstructions.value.trim();
    if (!elements.englishStory.value.trim()) {
      showToast("There is no English story to revise.", true);
      return;
    }
    if (!instructions) {
      showToast("Describe what you want DeepSeek to change.", true);
      elements.revisionInstructions.focus();
      return;
    }
    try {
      if (state.project) {
        state.project.approved = false;
        state.project.package = null;
      }
      await saveCurrentProject({ silent: true });
      setBusy(
        true,
        "Revising the story",
        "DeepSeek is applying your editorial notes while preserving the complete story.",
      );
      const result = await request(`/api/projects/${state.project.id}/revise`, {
        method: "POST",
        body: JSON.stringify({
          ...formValues(),
          instructions,
          approved: false,
        }),
      });
      state.project = result.project;
      fillForm(state.project);
      setSaveState("Revision saved", true);
      await refreshProjects();
      showToast("Revision complete. Give it another careful read.");
    } catch (error) {
      showToast(error.message, true);
    } finally {
      setBusy(false);
    }
  }

  async function approveStory() {
    if (!elements.englishStory.value.trim()) {
      showToast("Write or generate the English story first.", true);
      return;
    }
    try {
      await saveCurrentProject({ silent: true });
      const result = await request(`/api/projects/${state.project.id}/approve`, {
        method: "POST",
        body: JSON.stringify(formValues()),
      });
      state.project = result.project;
      setSaveState("English approved", true);
      goToStep(3, true);
      await refreshProjects();
      showToast("English approved. The Mandarin package is ready to generate.");
    } catch (error) {
      showToast(error.message, true);
    }
  }

  async function localizeStory() {
    if (!state.project || !state.project.approved) {
      showToast("Approve the English story first.", true);
      return;
    }
    try {
      setPackageError();
      await saveCurrentProject({ silent: true });
      setBusy(
        true,
        "Preparing Mandarin, pinyin, and audio",
        "DeepSeek is aligning every segment and building the Qwen audio queue. Longer stories can take a few minutes.",
      );
      const result = await request(`/api/projects/${state.project.id}/localize`, {
        method: "POST",
        body: JSON.stringify({
          ...formValues(),
          approved: true,
        }),
      });
      state.project = result.project;
      renderPackage(state.project.package);
      setPackageError();
      setSaveState("Story files saved", true);
      await refreshProjects();
      showToast("Story files are ready. Save a checkpoint before generating audio.");
    } catch (error) {
      setPackageError(error.message);
      showToast(error.message, true);
    } finally {
      setBusy(false);
    }
  }

  async function checkpointStoryFiles() {
    if (!state.project || !state.project.package) {
      showToast("Create the Mandarin story files first.", true);
      return;
    }
    try {
      const result = await request(`/api/projects/${state.project.id}/checkpoint`, {
        method: "POST",
        body: JSON.stringify({
          ...formValues(),
          approved: true,
        }),
      });
      state.project = result.project;
      updateProductionState();
      setSaveState("Checkpoint saved", true);
      await refreshProjects();
      showToast("Checkpoint saved. You can close the workshop and generate audio later.");
    } catch (error) {
      showToast(error.message, true);
    }
  }

  async function generateAudio() {
    if (!state.project || !state.project.checkpoint) {
      showToast("Save a story checkpoint before generating audio.", true);
      return;
    }
    try {
      setBusy(
        true,
        "Generating Qwen narration",
        "The local model is creating one WAV clip per segment. The checkpoint stays safe if you return later. The first run can take several minutes.",
      );
      const result = await request(`/api/projects/${state.project.id}/synthesize`, {
        method: "POST",
        body: JSON.stringify({
          ...formValues(),
          approved: true,
        }),
      });
      state.project = result.project;
      renderPackage(state.project.package);
      setSaveState("Qwen audio saved", true);
      await refreshProjects();
      showToast("Qwen audio is ready. Publish the finished package when you choose.");
    } catch (error) {
      showToast(error.message, true);
    } finally {
      setBusy(false);
    }
  }

  async function publishToFlutter() {
    if (
      !state.project ||
      !["audio_ready", "published"].includes(state.project.status)
    ) {
      showToast("Generate the Qwen audio before publishing.", true);
      return;
    }
    try {
      const result = await request(`/api/projects/${state.project.id}/publish`, {
        method: "POST",
        body: JSON.stringify({
          ...formValues(),
          approved: true,
        }),
      });
      state.project = result.project;
      renderPackage(state.project.package);
      setSaveState("Published to Flutter", true);
      await refreshProjects();
      showToast("Story and audio published to the Mandarin Flutter app.");
    } catch (error) {
      showToast(error.message, true);
    }
  }

  function renderPackage(packageData) {
    const hasPackage = Boolean(packageData && Array.isArray(packageData.segments));
    elements.emptyPackage.classList.toggle("is-hidden", hasPackage);
    elements.packageView.classList.toggle("is-hidden", !hasPackage);
    elements.segmentList.replaceChildren();
    if (!hasPackage) {
      updateProductionState();
      return;
    }

    const title = packageData.title || {};
    elements.packageTitle.textContent = title.chinese
      ? `${title.chinese} · ${title.english || ""}`
      : title.english || "Prepared story";
    elements.packageTitlePinyin.textContent = title.pinyin || "";

    packageData.segments.forEach((segment) => {
      const card = document.createElement("article");
      card.className = "segment";

      const id = document.createElement("span");
      id.className = "segment-id";
      id.textContent = segment.id;

      const copy = document.createElement("div");
      const chinese = document.createElement("p");
      chinese.className = "segment-chinese";
      chinese.textContent = segment.chinese;
      const pinyin = document.createElement("p");
      pinyin.className = "segment-pinyin";
      pinyin.textContent = segment.pinyin;
      const english = document.createElement("p");
      english.className = "segment-english";
      english.textContent = segment.english;
      copy.append(chinese, pinyin, english);

      const audio = document.createElement("span");
      audio.className = "audio-file";
      audio.textContent = segment.audioFile || `audio/${segment.id}.wav`;
      card.append(id, copy, audio);
      elements.segmentList.append(card);
    });
    updateProductionState();
  }

  function updateProductionState() {
    const status = state.project ? state.project.status : "";
    const checkpointed = Boolean(
      state.project &&
      state.project.checkpoint &&
      ["checkpointed", "audio_ready", "published"].includes(status),
    );
    const audioReady = ["audio_ready", "published"].includes(status);
    const published = status === "published";

    elements.checkpointStep.classList.toggle("is-complete", checkpointed);
    elements.audioStep.classList.toggle("is-complete", audioReady);
    elements.publishStep.classList.toggle("is-complete", published);

    elements.checkpointButton.disabled = checkpointed;
    elements.checkpointButton.textContent = checkpointed
      ? "Checkpoint saved"
      : "Save checkpoint";
    elements.audioButton.disabled = !checkpointed;
    elements.audioButton.textContent = audioReady
      ? "Regenerate Qwen audio"
      : "Generate Qwen audio";
    elements.publishButton.disabled = !audioReady;
    elements.publishButton.textContent = published
      ? "Publish latest again"
      : "Publish to app";
  }

  function renderDeepSeekStatus() {
    const ready = state.api && state.api.configured;
    elements.deepseekStatus.classList.toggle("is-ready", ready);
    elements.deepseekStatus.classList.toggle("is-error", !ready);
    elements.deepseekStatus.querySelector("span:last-child").textContent = ready
      ? state.api.model
      : "API key missing";
  }

  function renderQwenStatus() {
    if (!state.qwen) return;
    elements.qwenCard.classList.toggle("is-ready", state.qwen.ready);
    const strong = elements.qwenCard.querySelector("strong");
    const small = elements.qwenCard.querySelector("small");
    strong.textContent = state.qwen.ready ? "Qwen models ready" : "Qwen models incomplete";
    const available = Object.values(state.qwen.models).filter((model) => model.available).length;
    small.textContent = state.qwen.ready
      ? "Base · CustomVoice · Tokenizer"
      : `${available} of 3 model folders found`;
  }

  async function refreshProjects() {
    const result = await request("/api/bootstrap");
    state.projects = result.projects;
    state.books = result.books || [];
    renderHistory();
  }

  function renderHistory() {
    elements.historyList.replaceChildren();
    if (!state.projects.length) {
      const empty = document.createElement("p");
      empty.className = "history-empty";
      empty.textContent = "No stories yet. Your first saved draft will appear here.";
      elements.historyList.append(empty);
      return;
    }
    state.projects.forEach((project) => {
      const row = document.createElement("div");
      row.className = "history-row";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "history-item";
      button.dataset.projectId = project.id;

      const copy = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = project.title || "Untitled Story";
      const date = document.createElement("small");
      const parsed = project.updatedAt ? new Date(project.updatedAt) : null;
      date.textContent = parsed && !Number.isNaN(parsed.valueOf())
        ? `Updated ${parsed.toLocaleString()}`
        : "Saved locally";
      copy.append(title, date);

      const status = document.createElement("span");
      status.className = "history-status";
      status.textContent = project.status || "draft";
      button.append(copy, status);
      button.addEventListener("click", () => loadProject(project.id));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "history-delete";
      remove.textContent = "🗑";
      remove.title = "Delete story";
      remove.setAttribute(
        "aria-label",
        `Delete ${project.title || "Untitled Story"}`,
      );
      remove.addEventListener("click", () => deleteProject(project));

      row.append(button, remove);
      elements.historyList.append(row);
    });
  }

  async function planBook() {
    const idea = elements.bookIdea.value.trim();
    if (!idea) {
      showToast("Describe what the book is about first.", true);
      elements.bookIdea.focus();
      return;
    }
    const chapterCount = Number(elements.bookChapterCount.value);
    if (!Number.isInteger(chapterCount) || chapterCount < 4 || chapterCount > 12) {
      showToast("Choose between 4 and 12 chapters.", true);
      return;
    }
    try {
      setBusy(
        true,
        "Planning the book",
        "DeepSeek is writing the premise, the cast, the shared word budget, and one outline per chapter.",
      );
      const result = await request("/api/books", {
        method: "POST",
        body: JSON.stringify({
          title: elements.bookTitle.value.trim(),
          idea,
          level: elements.bookLevel.value,
          chapterCount,
          constraints: elements.bookConstraints.value.trim(),
        }),
      });
      state.books = result.books || [];
      state.projects = result.projects || [];
      elements.newBookDialog.close();
      showBook(result.book);
      showToast(
        `Planned "${result.book.titleEnglish}" with ${result.book.chapters.length} chapters. Each chapter is now a draft.`,
      );
    } catch (error) {
      showToast(error.message, true);
    } finally {
      setBusy(false);
    }
  }

  async function openBook(bookId) {
    try {
      const result = await request(`/api/books/${bookId}`);
      showBook(result.book);
    } catch (error) {
      showToast(error.message, true);
    }
  }

  function showBook(book) {
    state.book = book;
    renderBooks();
    if (!elements.booksDialog.open) elements.booksDialog.showModal();
  }

  function renderBooks() {
    elements.booksList.replaceChildren();
    if (!state.books.length) {
      const empty = document.createElement("p");
      empty.className = "history-empty";
      empty.textContent = "No books yet. Plan one to write a themed reader in chapters.";
      elements.booksList.append(empty);
      return;
    }
    state.books.forEach((summary) => {
      const open = state.book && state.book.id === summary.id;
      const row = document.createElement("div");
      row.className = "history-row";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "history-item";
      const copy = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = summary.titleChinese
        ? `${summary.titleEnglish} · ${summary.titleChinese}`
        : summary.titleEnglish;
      const detail = document.createElement("small");
      detail.textContent = `${summary.chapterCount} chapters · ${summary.level || "level unset"}`;
      copy.append(title, detail);
      const status = document.createElement("span");
      status.className = "history-status";
      status.textContent = open ? "open" : "book";
      button.append(copy, status);
      button.addEventListener("click", () => {
        if (open) {
          state.book = null;
          renderBooks();
        } else {
          openBook(summary.id);
        }
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "history-delete";
      remove.textContent = "🗑";
      remove.title = "Delete book";
      remove.setAttribute("aria-label", `Delete ${summary.titleEnglish}`);
      remove.addEventListener("click", () => deleteBook(summary));

      row.append(button, remove);
      elements.booksList.append(row);

      if (open) elements.booksList.append(chapterList(state.book));
    });
  }

  function chapterList(book) {
    const wrapper = document.createElement("div");
    wrapper.className = "chapter-list";
    (book.chapters || []).forEach((chapter) => {
      const project = state.projects.find((item) => item.id === chapter.projectId);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "history-item chapter-item";
      const copy = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = `${chapter.number}. ${chapter.titleEnglish}`;
      const outline = document.createElement("small");
      outline.textContent = chapter.outline || "";
      copy.append(title, outline);
      const status = document.createElement("span");
      status.className = "history-status";
      status.textContent = project ? project.status : "missing";
      button.append(copy, status);
      button.disabled = !project;
      if (project) {
        button.addEventListener("click", () => {
          elements.booksDialog.close();
          loadProject(project.id);
        });
      }
      wrapper.append(button);
    });
    return wrapper;
  }

  async function deleteBook(summary) {
    const confirmed = window.confirm(
      `Delete "${summary.titleEnglish}" and all ${summary.chapterCount} chapter projects? Published chapters are removed from the reader app too.`,
    );
    if (!confirmed) return;
    try {
      const result = await request(`/api/books/${summary.id}`, { method: "DELETE" });
      state.books = result.books || [];
      state.projects = result.projects || [];
      if (state.book && state.book.id === summary.id) state.book = null;
      if (
        state.project &&
        state.project.book &&
        state.project.book.id === summary.id
      ) {
        newStory();
      }
      renderBooks();
      renderHistory();
      showToast(`Deleted "${summary.titleEnglish}".`);
    } catch (error) {
      showToast(error.message, true);
    }
  }

  async function deleteProject(project) {
    const name = project.title || "Untitled Story";
    const confirmed = window.confirm(
      `Delete "${name}"? This removes the workshop project and unpublishes the story from the reader app.`,
    );
    if (!confirmed) return;
    try {
      const result = await request(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      state.projects = result.projects || [];
      renderHistory();
      if (state.project && state.project.id === project.id) {
        newStory();
      }
      showToast(`Deleted "${name}".`);
    } catch (error) {
      showToast(error.message, true);
    }
  }

  async function loadProject(projectId) {
    try {
      const result = await request(`/api/projects/${projectId}`);
      state.project = result.project;
      fillForm(state.project);
      goToStep(desiredStepForProject(state.project), true);
      elements.historyDialog.close();
      setSaveState("Loaded from disk", true);
    } catch (error) {
      showToast(error.message, true);
    }
  }

  function newStory() {
    state.project = null;
    fillForm(null);
    goToStep(1, true);
    setSaveState("New unsaved story");
    elements.storyTitle.focus();
  }

  function downloadExport(type) {
    if (!state.project) {
      showToast("There is no generated package to download.", true);
      return;
    }
    window.location.assign(`/api/projects/${state.project.id}/export/${type}`);
  }

  async function openProjectFolder() {
    if (!state.project) return;
    try {
      await request(`/api/projects/${state.project.id}/open-folder`, {
        method: "POST",
        body: "{}",
      });
    } catch (error) {
      showToast(error.message, true);
    }
  }

  function wireEvents() {
    $$("[data-step-target]").forEach((button) => {
      button.addEventListener("click", () => goToStep(Number(button.dataset.stepTarget)));
    });

    [
      elements.storyTitle,
      elements.storyIdea,
      elements.storyLevel,
      elements.storyLength,
      elements.storyConstraints,
      elements.englishStory,
      elements.revisionInstructions,
    ].forEach((element) => {
      element.addEventListener("input", () => {
        if (element === elements.englishStory && state.project) {
          state.project.approved = false;
          state.project.status = "review";
          state.project.package = null;
          renderPackage(null);
        }
        queueAutoSave();
      });
    });

    $("#savePromptButton").addEventListener("click", savePrompt);
    $("#generateStoryButton").addEventListener("click", generateStory);
    $("#reviseStoryButton").addEventListener("click", reviseStory);
    $("#saveStoryButton").addEventListener("click", () => saveCurrentProject());
    $("#approveStoryButton").addEventListener("click", approveStory);
    $("#localizeButton").addEventListener("click", localizeStory);
    $("#checkpointButton").addEventListener("click", checkpointStoryFiles);
    $("#generateAudioButton").addEventListener("click", generateAudio);
    $("#publishToFlutterButton").addEventListener("click", publishToFlutter);
    $("#newStoryButton").addEventListener("click", newStory);
    $("#openHistoryButton").addEventListener("click", () => {
      renderHistory();
      elements.historyDialog.showModal();
    });
    $("#closeHistoryButton").addEventListener("click", () => elements.historyDialog.close());
    elements.historyDialog.addEventListener("click", (event) => {
      if (event.target === elements.historyDialog) elements.historyDialog.close();
    });
    $("#openBooksButton").addEventListener("click", () => {
      renderBooks();
      elements.booksDialog.showModal();
    });
    $("#closeBooksButton").addEventListener("click", () => elements.booksDialog.close());
    elements.booksDialog.addEventListener("click", (event) => {
      if (event.target === elements.booksDialog) elements.booksDialog.close();
    });
    $("#newBookButton").addEventListener("click", () => {
      elements.newBookDialog.showModal();
      elements.bookIdea.focus();
    });
    $("#closeNewBookButton").addEventListener("click", () => elements.newBookDialog.close());
    elements.newBookDialog.addEventListener("click", (event) => {
      if (event.target === elements.newBookDialog) elements.newBookDialog.close();
    });
    $("#planBookButton").addEventListener("click", planBook);
    $("#openChapterBookButton").addEventListener("click", () => {
      if (state.project && state.project.book) openBook(state.project.book.id);
    });
    $("#downloadStoryButton").addEventListener("click", () => downloadExport("story"));
    $("#downloadAudioButton").addEventListener("click", () => downloadExport("audio"));
    $("#openFolderButton").addEventListener("click", openProjectFolder);
  }

  async function boot() {
    wireEvents();
    try {
      const bootstrap = await request("/api/bootstrap");
      state.settings = bootstrap.settings;
      state.api = bootstrap.api;
      state.qwen = bootstrap.qwen;
      state.projects = bootstrap.projects;
      state.books = bootstrap.books || [];
      state.project = bootstrap.activeProject;
      state.levels = bootstrap.levels || {};
      elements.storyPrompt.value = state.settings.storyPrompt;
      fillLevelOptions();
      fillForm(state.project);
      renderDeepSeekStatus();
      renderQwenStatus();
      renderHistory();
      goToStep(desiredStepForProject(state.project), true);
      setSaveState(state.project ? "Loaded from disk" : "Ready", Boolean(state.project));
      if (!state.api.configured) {
        showToast("Add DEEPSEEK_API_KEY to the repository .env file before generating.", true);
      }
    } catch (error) {
      showToast(`Could not start the workshop: ${error.message}`, true);
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
