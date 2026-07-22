(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let status = null;
  let story = null;
  let report = null;
  let validationErrors = [];
  let reviewPassed = false;
  let published = false;
  let previewSection = 1;
  let previewLanguage = 'chinese';

  async function api(path, options) {
    const response = await fetch(path, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
    return body;
  }

  async function boot() {
    try {
      status = await api('/api/status');
      renderStatus();
      populateOptions();
      renderLevelGuide();
      await Promise.all([loadStarters(), loadDrafts()]);
    } catch (error) {
      feedback(error.message, true);
    }
  }

  function renderStatus() {
    const element = $('#status');
    const ready = status.deepseek.ready;
    const audioReady = status.qwen.models.custom && status.ffmpeg;
    element.className = `status ${ready && audioReady ? 'ready' : 'warn'}`;
    if (ready && audioReady) {
      const qwenState = status.qwen.device === 'not loaded' ? 'Qwen installed' : status.qwen.device;
      element.textContent = `Ready · ${status.deepseek.model} · ${qwenState}`;
    }
    else if (ready) element.textContent = 'Writing ready · audio setup incomplete';
    else element.textContent = 'DeepSeek setup needs attention';
    $('#generate').disabled = !ready;
    $('#render-audio').disabled = !audioReady;
    $('#generate-note').textContent = ready
      ? 'Creates a local draft. It will not use Qwen or publish anything.'
      : 'Add DEEPSEEK_API_KEY to the repo-root .env, then restart this server.';
  }

  function populateOptions() {
    const levelOrder = ['newbie', 'elementary', 'intermediate', 'upper-intermediate', 'advanced', 'master'];
    $('#new-level').innerHTML = levelOrder
      .map((id) => [id, status.levels[id]])
      .filter(([, level]) => level)
      .map(([id, level]) => `<option value="${id}">${escapeHtml(level.label)} · ~${level.vocabulary} word base</option>`)
      .join('');
    $('#preview-speaker').innerHTML = status.qwen.speakers
      .map((speaker) => `<option>${escapeHtml(speaker)}</option>`)
      .join('');
  }

  function renderLevelGuide() {
    const level = status.levels[$('#new-level').value];
    if (!level) return;
    $('#level-guide').innerHTML = [
      [`${level.chars[0]}–${level.chars[1]}`, 'Chinese characters'],
      [`${level.sections[0]}–${level.sections[1]}`, 'reader sections'],
      [`≤ ${level.target_unique_words || level.max_unique_words}`, 'preferred distinct words'],
      [`≤ ${level.target_new_words || level.max_new_words}`, 'preferred taught words'],
      [`≥ ${Math.round(level.min_coverage * 100)}%`, 'known-word coverage'],
    ].map(([value, label]) => `<span><strong>${value}</strong>${label}</span>`).join('');
  }

  async function loadDrafts() {
    const { drafts } = await api('/api/stories/drafts');
    $('#drafts').innerHTML = drafts.length
      ? drafts.map((draft) => `
          <button class="draft ${story && draft.id === story.id ? 'active' : ''}" data-id="${escapeAttr(draft.id)}">
            <strong>${escapeHtml(draft.title)}</strong>
            <span>${escapeHtml(levelLabel(draft.level))} · ${escapeHtml(draft.englishTitle)}</span>
          </button>`).join('')
      : '<p class="note">No active drafts. The former set is safely archived.</p>';
    $$('#drafts .draft').forEach((button) => button.addEventListener('click', () => openDraft(button.dataset.id)));
  }

  async function loadStarters() {
    const { stories } = await api('/api/starter-prompts');
    $('#starters').innerHTML = stories.map((item, index) => `
      <button class="draft starter" data-index="${index}">
        <strong>${escapeHtml(item.englishTitle)}</strong>
        <span>${escapeHtml(levelLabel(item.level))} · ${escapeHtml(item.topic)}</span>
      </button>`).join('');
    $$('.starter').forEach((button) => button.addEventListener('click', () => {
      const item = stories[Number(button.dataset.index)];
      $('#new-level').value = item.level;
      $('#new-topic').value = item.topic;
      $('#new-title').value = item.englishTitle;
      $('#new-genre').value = item.genre;
      $('#new-notes').value = item.notes;
      $('#new-title').dataset.storyId = item.id;
      renderLevelGuide();
      $('.create-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  }

  async function generate() {
    const title = $('#new-title').value.trim();
    const topic = $('#new-topic').value.trim();
    if (!title || !topic) {
      feedback('Add an English title and a clear story idea first.', true);
      return;
    }
    busy($('#generate'), true, 'Writing and checking…');
    feedback('DeepSeek is drafting the story and checking every sentence. This can take a few minutes.');
    try {
      const body = await api('/api/stories/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: $('#new-title').dataset.storyId || '',
          level: $('#new-level').value,
          topic,
          englishTitle: title,
          genre: $('#new-genre').value,
          notes: $('#new-notes').value.trim(),
          requestedWords: splitWords($('#new-words').value),
        }),
      });
      story = body.story;
      report = body.report;
      validationErrors = body.errors || [];
      reviewPassed = validationErrors.length === 0;
      published = false;
      previewSection = 1;
      renderEditor();
      await loadDrafts();
      feedback(
        reviewPassed
          ? 'Draft created and level checks passed. Read it before rendering audio.'
          : 'The best draft was saved. Use the exact level-check notes to revise it before audio.',
        !reviewPassed,
      );
    } catch (error) {
      feedback(error.message, true);
    } finally {
      busy($('#generate'), false, 'Generate checked draft');
    }
  }

  async function openDraft(id) {
    try {
      const body = await api(`/api/stories/drafts/${encodeURIComponent(id)}`);
      story = body.story;
      report = body.report;
      validationErrors = [];
      reviewPassed = false;
      published = false;
      previewSection = firstSection(story);
      renderEditor();
      await loadDrafts();
      feedback('Draft opened. Run the level check after reviewing it.');
    } catch (error) {
      feedback(error.message, true);
    }
  }

  function renderEditor() {
    $('#workspace').classList.remove('empty');
    $('#empty-state').hidden = true;
    $('#editor').hidden = false;
    $('#editor-level').textContent = levelLabel(story.level);
    $('#editor-title').textContent = story.title || story.englishTitle;
    $('#editor-id').textContent = story.id;
    $('#story-title').value = story.title || '';
    $('#story-pinyin-title').value = story.pinyinTitle || '';
    $('#story-english-title').value = story.englishTitle || '';
    $('#story-topic').value = story.topic || '';
    $('#story-summary').value = story.summary || '';
    $('#story-learning-words').value = (story.learningWords || []).join(', ');
    renderBlocks();
    renderMetrics();
    renderPreview();
    renderStages();
  }

  function renderBlocks() {
    let priorSection = null;
    $('#blocks').innerHTML = story.blocks.map((block, index) => {
      const section = Number(block.section) || 1;
      const divider = section !== priorSection
        ? `<div class="section-divider"><span>${section}</span><h3>Section ${section}</h3></div>`
        : '';
      priorSection = section;
      return divider + blockHtml(block, index);
    }).join('');
    bindBlockControls();
  }

  function blockHtml(block, index) {
    const audio = block.audio || {};
    const audioReady = Number(audio.durationMs) > 0;
    const voices = story.voices || [];
    return `
      <article class="sentence" data-index="${index}" data-original-hanzi="${escapeAttr(block.hanzi || '')}" data-original-speaker="${escapeAttr(block.speakerId || '')}">
        <div class="sentence-head">
          <strong>${escapeHtml(block.id)}</strong>
          <input class="section-input" type="number" min="1" value="${Number(block.section) || 1}" aria-label="Section number">
          <select class="kind" aria-label="Sentence type">
            <option value="narration" ${block.kind === 'narration' ? 'selected' : ''}>Narration</option>
            <option value="dialogue" ${block.kind === 'dialogue' ? 'selected' : ''}>Dialogue</option>
          </select>
          <select class="speaker" aria-label="Voice">${voices.map((voice) => `
            <option value="${escapeAttr(voice.id)}" ${voice.id === block.speakerId ? 'selected' : ''}>${escapeHtml(voice.name)} · ${escapeHtml(voice.speaker)}</option>`).join('')}</select>
          <span class="spacer"></span>
          <span class="audio-state ${audioReady ? 'ready' : 'missing'}">${audioReady ? 'Audio ready' : 'No current audio'}</span>
          <div class="sentence-tools">
            <button type="button" data-action="annotate">Recheck words</button>
            <button type="button" data-action="up" aria-label="Move up">↑</button>
            <button type="button" data-action="down" aria-label="Move down">↓</button>
            <button type="button" data-action="delete" aria-label="Delete">Delete</button>
          </div>
        </div>
        <div class="sentence-grid">
          <label>Chinese sentence<textarea class="hanzi" rows="2">${escapeHtml(block.hanzi || '')}</textarea></label>
          <label>English translation<textarea class="translation" rows="2">${escapeHtml(block.translation || '')}</textarea></label>
        </div>
        <details>
          <summary>Pinyin and learner data</summary>
          <label>Sentence pinyin<textarea class="pinyin" rows="2">${escapeHtml(block.pinyin || '')}</textarea></label>
          <p class="token-count">${(block.tokens || []).filter((token) => token.pinyin).length} defined word pieces</p>
          ${audioReady ? `<audio controls src="/api/stories/drafts/${encodeURIComponent(story.id)}/audio/${encodeURIComponent(block.id)}.mp3"></audio>` : ''}
        </details>
      </article>`;
  }

  function bindBlockControls() {
    $$('.sentence').forEach((card) => {
      $('.kind', card).addEventListener('change', () => syncKindVoice(card));
      $('[data-action="annotate"]', card).addEventListener('click', () => annotateBlock(card));
      $('[data-action="up"]', card).addEventListener('click', () => moveBlock(Number(card.dataset.index), -1));
      $('[data-action="down"]', card).addEventListener('click', () => moveBlock(Number(card.dataset.index), 1));
      $('[data-action="delete"]', card).addEventListener('click', () => deleteBlock(Number(card.dataset.index)));
    });
  }

  function syncKindVoice(card) {
    const kind = $('.kind', card).value;
    const speaker = $('.speaker', card);
    if (kind === 'narration') speaker.value = 'narrator';
    else if (speaker.value === 'narrator') {
      const character = (story.voices || []).find((voice) => voice.id !== 'narrator');
      if (character) speaker.value = character.id;
    }
    markChanged();
  }

  function readEditor() {
    if (!story) return null;
    story.title = $('#story-title').value.trim();
    story.pinyinTitle = $('#story-pinyin-title').value.trim();
    story.englishTitle = $('#story-english-title').value.trim();
    story.topic = $('#story-topic').value.trim();
    story.summary = $('#story-summary').value.trim();
    story.learningWords = splitWords($('#story-learning-words').value);
    $$('.sentence').forEach((card, index) => {
      const block = story.blocks[index];
      const hanzi = $('.hanzi', card).value.trim();
      const speakerId = $('.speaker', card).value;
      const textChanged = hanzi !== card.dataset.originalHanzi;
      const voiceChanged = speakerId !== card.dataset.originalSpeaker;
      block.section = Math.max(1, Number.parseInt($('.section-input', card).value, 10) || 1);
      block.kind = $('.kind', card).value;
      block.speakerId = speakerId;
      block.hanzi = hanzi;
      block.translation = $('.translation', card).value.trim();
      block.pinyin = $('.pinyin', card).value.trim();
      if (textChanged) {
        block.tokens = [];
        block.pinyin = '';
      }
      if (textChanged || voiceChanged) block.audio = { path: `audio/${block.id}.mp3`, durationMs: 0 };
    });
    return story;
  }

  async function save() {
    readEditor();
    busy($('#save'), true, 'Saving…');
    try {
      const body = await api(`/api/stories/drafts/${encodeURIComponent(story.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story }),
      });
      story = body.story;
      report = body.report;
      validationErrors = body.errors || [];
      reviewPassed = validationErrors.length === 0;
      published = false;
      renderEditor();
      await loadDrafts();
      feedback(reviewPassed ? 'Saved. The current draft passes every level check.' : 'Saved. Review the level-check notes below.', !reviewPassed);
      return reviewPassed;
    } catch (error) {
      feedback(error.message, true);
      return false;
    } finally {
      busy($('#save'), false, 'Save draft');
    }
  }

  async function validate(requireAudio = false) {
    const saved = await save();
    if (!saved && !requireAudio) return false;
    busy($('#validate'), true, 'Checking…');
    try {
      const body = await api(`/api/stories/drafts/${encodeURIComponent(story.id)}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requireAudio }),
      });
      report = body.report;
      validationErrors = body.errors || [];
      reviewPassed = !requireAudio && body.valid ? true : reviewPassed;
      renderMetrics();
      renderStages();
      feedback(body.valid
        ? requireAudio ? 'Text and every audio file are ready.' : 'This story passes every level check.'
        : 'The story still needs attention. The exact fixes are listed below.', !body.valid);
      return body.valid;
    } catch (error) {
      feedback(error.message, true);
      return false;
    } finally {
      busy($('#validate'), false, 'Run level check');
    }
  }

  async function annotateBlock(card) {
    readEditor();
    const index = Number(card.dataset.index);
    const block = story.blocks[index];
    const button = $('[data-action="annotate"]', card);
    busy(button, true, 'Checking…');
    try {
      await save();
      const body = await api(`/api/stories/drafts/${encodeURIComponent(story.id)}/annotate/${encodeURIComponent(block.id)}`, { method: 'POST' });
      story.blocks[index] = body.block;
      report = body.report;
      reviewPassed = false;
      published = false;
      renderEditor();
      feedback(`${block.id} was re-annotated. Run the level check when editing is complete.`);
    } catch (error) {
      feedback(error.message, true);
    } finally {
      if (document.body.contains(button)) busy(button, false, 'Recheck words');
    }
  }

  async function annotateAll() {
    readEditor();
    const button = $('#recheck-all');
    busy(button, true, 'Checking every sentence…');
    try {
      await save();
      const body = await api(`/api/stories/drafts/${encodeURIComponent(story.id)}/annotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      });
      story = body.story;
      report = body.report;
      validationErrors = body.errors || [];
      reviewPassed = validationErrors.length === 0;
      published = false;
      renderEditor();
      feedback(
        reviewPassed
          ? 'Every sentence was re-annotated and the story passes its level check.'
          : 'Word data is current. The remaining notes are about the story itself.',
        !reviewPassed,
      );
    } catch (error) {
      feedback(error.message, true);
    } finally {
      if (document.body.contains(button)) busy(button, false, 'Recheck all words');
    }
  }

  async function syncVocabulary() {
    readEditor();
    const button = $('#sync-vocabulary');
    busy(button, true, 'Checking story…');
    try {
      await save();
      const body = await api(`/api/stories/drafts/${encodeURIComponent(story.id)}/vocabulary`, { method: 'POST' });
      story = body.story;
      report = body.report;
      validationErrors = body.errors || [];
      reviewPassed = validationErrors.length === 0;
      published = false;
      renderEditor();
      feedback(`The teaching list now matches the ${report.new_words.length} above-level words actually used. Recheck definitions after the Chinese is final.`);
    } catch (error) {
      feedback(error.message, true);
    } finally {
      if (document.body.contains(button)) busy(button, false, 'Use detected new words');
    }
  }

  function addSentence() {
    readEditor();
    const next = Math.max(0, ...story.blocks.map((block) => Number.parseInt(String(block.id).replace(/\D/g, ''), 10) || 0)) + 1;
    const id = `b${String(next).padStart(3, '0')}`;
    const last = story.blocks.at(-1);
    story.blocks.push({
      id,
      section: last ? Number(last.section) || 1 : 1,
      kind: 'narration',
      speakerId: 'narrator',
      hanzi: '',
      traditional: null,
      pinyin: '',
      translation: '',
      tokens: [],
      audio: { path: `audio/${id}.mp3`, durationMs: 0 },
    });
    markChanged();
    renderBlocks();
    $$('.sentence').at(-1)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function moveBlock(index, offset) {
    readEditor();
    const target = index + offset;
    if (target < 0 || target >= story.blocks.length) return;
    [story.blocks[index], story.blocks[target]] = [story.blocks[target], story.blocks[index]];
    normalizeSections();
    markChanged();
    renderBlocks();
  }

  function deleteBlock(index) {
    readEditor();
    if (story.blocks.length <= 1) {
      feedback('A story needs at least one sentence.', true);
      return;
    }
    story.blocks.splice(index, 1);
    normalizeSections();
    markChanged();
    renderBlocks();
    renderPreview();
  }

  function normalizeSections() {
    let section = 1;
    let previous = 1;
    story.blocks.forEach((block, index) => {
      const requested = Math.max(1, Number(block.section) || 1);
      if (index && requested > previous) section += 1;
      block.section = section;
      previous = requested;
    });
  }

  async function renderAudio() {
    if (!(await validate(false))) return;
    if (!confirm(`Render ${story.blocks.length} sentences with Qwen on this computer? This is the GPU-intensive step.`)) return;
    busy($('#render-audio'), true, 'Starting Qwen…');
    $('#job-progress').hidden = false;
    try {
      const body = await api(`/api/stories/drafts/${encodeURIComponent(story.id)}/audio/jobs`, { method: 'POST' });
      await pollJob(body.job.id);
      const refreshed = await api(`/api/stories/drafts/${encodeURIComponent(story.id)}`);
      story = refreshed.story;
      report = refreshed.report;
      renderEditor();
      feedback('Qwen audio is complete. Preview the story, then publish it.');
    } catch (error) {
      feedback(error.message, true);
    } finally {
      busy($('#render-audio'), false, 'Render Qwen audio');
    }
  }

  async function pollJob(jobId) {
    while (true) {
      const { job } = await api(`/api/jobs/${encodeURIComponent(jobId)}`);
      $('#job-label').textContent = job.currentBlock ? `Voicing ${job.currentBlock}…` : statusLabel(job.status);
      $('#job-count').textContent = `${job.completed} / ${job.total}`;
      $('#job-bar').max = Math.max(1, job.total);
      $('#job-bar').value = job.completed;
      if (job.status === 'complete') return;
      if (job.status === 'failed') throw new Error(job.error || 'Audio rendering failed.');
      await delay(900);
    }
  }

  async function publishStory() {
    if (!(await validate(true))) return;
    if (!confirm('Publish this reviewed story and its audio to the Flutter library?')) return;
    busy($('#publish'), true, 'Publishing…');
    try {
      await api(`/api/stories/drafts/${encodeURIComponent(story.id)}/publish`, { method: 'POST' });
      published = true;
      renderStages();
      feedback('Published to Flutter. Commit and push the tracked story files when you are ready.');
    } catch (error) {
      feedback(error.message, true);
    } finally {
      busy($('#publish'), false, 'Publish to Flutter');
    }
  }

  function renderMetrics() {
    if (!report || !story) {
      $('#metrics').innerHTML = '';
      return;
    }
    const rules = status.levels[story.level];
    const metrics = [
      ['Chinese length', `${report.hanzi_count} / ${rules.chars[0]}–${rules.chars[1]}`, report.hanzi_count >= rules.chars[0] && report.hanzi_count <= rules.chars[1]],
      ['Known words', `${Math.round(report.coverage * 100)}%`, report.coverage >= rules.min_coverage],
      ['Above level', `${report.new_words.length} / ${rules.max_new_words}`, report.new_words.length <= rules.max_new_words],
      ['Distinct words', `${report.unique_words} / ${rules.max_unique_words}`, report.unique_words <= rules.max_unique_words],
      ['Repetition', `${Number(report.repetition).toFixed(2)}×`, report.repetition >= rules.min_repetition],
      ['Longest sentence', `${report.max_block_hanzi} / ${rules.max_block_hanzi}`, report.max_block_hanzi <= rules.max_block_hanzi],
      ['Sections', `${report.section_count} / ${rules.sections[0]}–${rules.sections[1]}`, report.section_count >= rules.sections[0] && report.section_count <= rules.sections[1]],
    ];
    $('#metrics').innerHTML = metrics.map(([label, value, good]) => `
      <div class="metric ${good ? 'good' : 'bad'}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join('');
    const quality = $('#quality-state');
    quality.className = `quality-state ${reviewPassed ? 'pass' : validationErrors.length ? 'fail' : ''}`;
    quality.textContent = reviewPassed ? 'Level check passed' : validationErrors.length ? 'Needs revision' : 'Run level check';
    const annotationErrors = validationErrors.filter((error) => /token|pinyin|required|reconstruct/i.test(error));
    const storyErrors = validationErrors.filter((error) => !annotationErrors.includes(error));
    const vocabularyNote = report.new_words.length
      ? `<div class="word-summary"><strong>Planned/new words</strong>${report.new_words.map((word) => `<span class="${report.unplanned_words.includes(word) ? 'unplanned' : ''}">${escapeHtml(word)}</span>`).join('')}</div>`
      : '<div class="word-summary"><strong>New words</strong><span>None</span></div>';
    const notes = storyErrors.map((error) => `<div class="warning">${escapeHtml(error)}</div>`);
    if (annotationErrors.length) notes.push(`<div class="warning">${annotationErrors.length} learner definitions need refreshing. Use “Recheck all words” once the Chinese text is final.</div>`);
    if (!notes.length) notes.push(`<div class="warning ok">${reviewPassed ? 'All fixed-level checks pass. Read the story for naturalness before using Qwen.' : 'Metrics are a preview. Save and run the level check to confirm.'}</div>`);
    $('#warnings').innerHTML = vocabularyNote + notes.join('');
  }

  function renderPreview() {
    if (!story) return;
    $('#preview-level').textContent = levelLabel(story.level);
    $('#learner-title').textContent = story.title || story.englishTitle;
    $('#learner-english-title').textContent = story.englishTitle || '';
    const sections = groupSections(story);
    if (!sections.some(([number]) => number === previewSection)) previewSection = sections[0]?.[0] || 1;
    $('#preview-sections').innerHTML = sections.map(([number]) => `
      <button class="${number === previewSection ? 'active' : ''}" data-section="${number}">Section ${number}</button>`).join('');
    $$('#preview-sections button').forEach((button) => button.addEventListener('click', () => {
      previewSection = Number(button.dataset.section);
      renderPreview();
    }));
    const blocks = sections.find(([number]) => number === previewSection)?.[1] || [];
    $('#learner-page').innerHTML = `<div class="section-label">SECTION ${previewSection}</div>` + blocks.map((block) => {
      if (previewLanguage === 'english') return `<p class="learner-translation">${escapeHtml(block.translation || 'Translation pending')}</p>`;
      const voice = (story.voices || []).find((item) => item.id === block.speakerId);
      return `<p class="learner-sentence ${block.kind === 'dialogue' ? 'dialogue' : ''}" data-speaker="${escapeAttr(voice?.name || '')}">${escapeHtml(block.hanzi || 'Chinese sentence pending')}</p>`;
    }).join('');
    $$('.language-switch button').forEach((button) => button.classList.toggle('active', button.dataset.language === previewLanguage));
  }

  function renderStages() {
    if (!story) return;
    const audioReady = story.blocks.length > 0 && story.blocks.every((block) => Number(block.audio?.durationMs) > 0);
    setStage('draft', reviewPassed ? 'done' : 'current');
    setStage('review', reviewPassed ? (audioReady ? 'done' : 'current') : '');
    setStage('audio', audioReady ? (published ? 'done' : 'current') : '');
    setStage('publish', published ? 'done' : '');
    $('#save-state').textContent = published ? 'Published locally' : reviewPassed ? 'Draft passes checks' : 'Local draft';
  }

  function setStage(id, state) {
    const element = $(`#stage-${id}`);
    element.classList.remove('done', 'current');
    if (state) element.classList.add(state);
  }

  function markChanged() {
    reviewPassed = false;
    published = false;
    validationErrors = [];
    $('#save-state').textContent = 'Unsaved changes';
    renderStages();
  }

  async function voicePreview() {
    const text = $('#preview-text').value.trim();
    if (!text) return feedback('Add preview text first.', true);
    busy($('#preview'), true, 'Rendering…');
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'custom', text, speaker: $('#preview-speaker').value }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Voice preview failed.');
      $('#preview-audio').src = URL.createObjectURL(await response.blob());
      await $('#preview-audio').play();
    } catch (error) {
      feedback(error.message, true);
    } finally {
      busy($('#preview'), false, 'Preview');
    }
  }

  async function clonePreview() {
    const file = $('#clone-file').files[0];
    const referenceText = $('#clone-reference-text').value.trim();
    const target = $('#clone-target').value.trim();
    if (!file || !referenceText || !target) return feedback('Choose reference audio and fill in both text fields.', true);
    const data = new FormData();
    data.append('mode', 'base');
    data.append('ref_audio', file);
    data.append('ref_text', referenceText);
    data.append('text', target);
    busy($('#clone'), true, 'Rendering…');
    try {
      const response = await fetch('/api/tts', { method: 'POST', body: data });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Clone preview failed.');
      $('#clone-audio').src = URL.createObjectURL(await response.blob());
      await $('#clone-audio').play();
    } catch (error) {
      feedback(error.message, true);
    } finally {
      busy($('#clone'), false, 'Render clone preview');
    }
  }

  function groupSections(value) {
    const groups = new Map();
    (value.blocks || []).forEach((block) => {
      const section = Math.max(1, Number(block.section) || 1);
      if (!groups.has(section)) groups.set(section, []);
      groups.get(section).push(block);
    });
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }

  function firstSection(value) {
    return groupSections(value)[0]?.[0] || 1;
  }

  function splitWords(value) {
    return [...new Set(String(value || '').split(/[,，、\s]+/).map((word) => word.trim()).filter(Boolean))];
  }

  function levelLabel(id) {
    return status?.levels?.[id]?.label || id || 'Story';
  }

  function statusLabel(value) {
    return ({ queued: 'Waiting for Qwen…', running: 'Rendering audio…', complete: 'Audio complete', failed: 'Audio failed' })[value] || value;
  }

  function feedback(message, error = false) {
    const element = $('#feedback');
    if (!element) return;
    element.textContent = message;
    element.className = `feedback show ${error ? 'error' : ''}`;
  }

  function busy(button, value, label) {
    button.disabled = value;
    button.textContent = label;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/\r?\n/g, '&#10;');
  }

  $('#new-level').addEventListener('change', renderLevelGuide);
  $('#new-title').addEventListener('input', () => { delete $('#new-title').dataset.storyId; });
  $('#generate').addEventListener('click', generate);
  $('#refresh').addEventListener('click', loadDrafts);
  $('#save').addEventListener('click', save);
  $('#validate').addEventListener('click', () => validate(false));
  $('#render-audio').addEventListener('click', renderAudio);
  $('#publish').addEventListener('click', publishStory);
  $('#add-sentence').addEventListener('click', addSentence);
  $('#sync-vocabulary').addEventListener('click', syncVocabulary);
  $('#recheck-all').addEventListener('click', annotateAll);
  $('#preview').addEventListener('click', voicePreview);
  $('#clone').addEventListener('click', clonePreview);
  $$('.workspace-tabs button').forEach((button) => button.addEventListener('click', () => {
    const preview = button.dataset.view === 'learner';
    if (preview) {
      readEditor();
      renderPreview();
    }
    $$('.workspace-tabs button').forEach((item) => item.classList.toggle('active', item === button));
    $('#edit-view').hidden = preview;
    $('#learner-view').hidden = !preview;
  }));
  $$('.language-switch button').forEach((button) => button.addEventListener('click', () => {
    previewLanguage = button.dataset.language;
    renderPreview();
  }));
  ['story-title', 'story-pinyin-title', 'story-english-title', 'story-topic', 'story-summary', 'story-learning-words']
    .forEach((id) => $(`#${id}`).addEventListener('input', markChanged));

  boot();
})();
