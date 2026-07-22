(function () {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  let status = null;
  let story = null;

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
      await loadStarters();
      await loadDrafts();
    } catch (error) { feedback(error.message, true); }
  }

  function renderStatus() {
    const element = $('#status');
    const ready = status.deepseek.ready && status.qwen.models.custom && status.ffmpeg;
    element.className = `status ${ready ? 'ready' : 'warn'}`;
    element.textContent = ready ? `Ready · ${status.deepseek.model}` : 'Setup needs attention';
    $('#generate').disabled = !status.deepseek.ready;
    $('#generate-note').textContent = status.deepseek.ready ? '' : 'Add DEEPSEEK_API_KEY to the repo-root .env, then restart this server.';
  }

  function populateOptions() {
    $('#new-level').innerHTML = Object.entries(status.levels).map(([id, level]) => `<option value="${id}">${level.label} · ~${level.vocabulary} character base</option>`).join('');
    $('#preview-speaker').innerHTML = status.qwen.speakers.map((speaker) => `<option>${speaker}</option>`).join('');
  }

  async function loadDrafts() {
    const { drafts } = await api('/api/stories/drafts');
    $('#drafts').innerHTML = drafts.length ? drafts.map((draft) => `<button class="draft" data-id="${draft.id}"><strong>${escapeHtml(draft.title)}</strong><span>${draft.level} · ${escapeHtml(draft.englishTitle)}</span></button>`).join('') : '<p class="note">No local drafts yet.</p>';
    document.querySelectorAll('#drafts .draft').forEach((button) => button.addEventListener('click', () => openDraft(button.dataset.id)));
  }

  async function loadStarters() {
    const { stories } = await api('/api/starter-prompts');
    $('#starters').innerHTML = stories.map((item, index) => `<button class="draft starter" data-index="${index}"><strong>${escapeHtml(item.englishTitle)}</strong><span>${item.level} · ${escapeHtml(item.topic)}</span></button>`).join('');
    document.querySelectorAll('.starter').forEach((button) => button.addEventListener('click', () => {
      const item = stories[Number(button.dataset.index)];
      $('#new-level').value = item.level; $('#new-topic').value = item.topic; $('#new-title').value = item.englishTitle; $('#new-genre').value = item.genre; $('#new-notes').value = item.notes;
      $('#new-title').dataset.storyId = item.id;
      $('#new-level').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
  }

  async function generate() {
    busy($('#generate'), true, 'Generating…');
    try {
      const body = await api('/api/stories/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: $('#new-title').dataset.storyId || '', level: $('#new-level').value, topic: $('#new-topic').value, englishTitle: $('#new-title').value, genre: $('#new-genre').value, notes: $('#new-notes').value }) });
      story = body.story;
      renderEditor();
      await loadDrafts();
    } catch (error) { feedback(error.message, true); }
    finally { busy($('#generate'), false, 'Generate with DeepSeek'); }
  }

  async function openDraft(id) {
    try { story = (await api(`/api/stories/drafts/${id}`)).story; renderEditor(); }
    catch (error) { feedback(error.message, true); }
  }

  function renderEditor() {
    $('#workspace').classList.remove('empty'); $('#empty-state').hidden = true; $('#editor').hidden = false;
    $('#editor-level').textContent = story.level; $('#editor-title').textContent = `${story.title} · ${story.englishTitle}`; $('#editor-id').textContent = story.id;
    $('#story-title').value = story.title; $('#story-pinyin-title').value = story.pinyinTitle || ''; $('#story-english-title').value = story.englishTitle; $('#story-topic').value = story.topic || ''; $('#story-summary').value = story.summary || '';
    $('#blocks').innerHTML = story.blocks.map((block, index) => blockHtml(block, index)).join('');
    document.querySelectorAll('[data-annotate]').forEach((button) => button.addEventListener('click', () => annotate(button.dataset.annotate)));
  }

  function blockHtml(block, index) {
    const voices = story.voices.map((voice) => `<option value="${voice.id}" ${voice.id === block.speakerId ? 'selected' : ''}>${escapeHtml(voice.name)} · ${voice.speaker}</option>`).join('');
    const audioName = block.audio && block.audio.path ? block.audio.path.split('/').pop() : '';
    return `<article class="block" data-index="${index}"><div class="block-head"><strong>${block.id}</strong><select class="kind"><option ${block.kind === 'narration' ? 'selected' : ''}>narration</option><option ${block.kind === 'dialogue' ? 'selected' : ''}>dialogue</option></select><select class="speaker">${voices}</select><span class="spacer"></span><span class="token-count">${block.tokens.length} tokens</span><button data-annotate="${block.id}">Re-annotate</button></div><div class="block-grid"><label>Chinese<textarea class="hanzi" rows="4">${escapeHtml(block.hanzi)}</textarea></label><label>English<textarea class="translation" rows="4">${escapeHtml(block.translation || '')}</textarea></label></div><label>Pinyin<textarea class="pinyin" rows="2">${escapeHtml(block.pinyin || '')}</textarea></label>${audioName ? `<audio class="audio" controls src="/api/stories/drafts/${story.id}/audio/${audioName}"></audio>` : '<p class="note">Audio has not been rendered for this block.</p>'}</article>`;
  }

  function readEditor() {
    story.title = $('#story-title').value.trim(); story.pinyinTitle = $('#story-pinyin-title').value.trim(); story.englishTitle = $('#story-english-title').value.trim(); story.topic = $('#story-topic').value.trim(); story.summary = $('#story-summary').value.trim();
    document.querySelectorAll('.block').forEach((element) => { const block = story.blocks[Number(element.dataset.index)]; const nextText = element.querySelector('.hanzi').value; block.kind = element.querySelector('.kind').value; block.speakerId = element.querySelector('.speaker').value; block.translation = element.querySelector('.translation').value.trim(); block.pinyin = element.querySelector('.pinyin').value.trim(); if (block.hanzi !== nextText) { block.hanzi = nextText; block.tokens = []; block.audio.durationMs = 0; } });
    return story;
  }

  async function save(showMessage = true) {
    story = (await api(`/api/stories/drafts/${story.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ story: readEditor() }) })).story;
    renderEditor(); if (showMessage) feedback('Draft saved locally.'); await loadDrafts(); return story;
  }

  async function annotate(blockId) {
    try { await save(false); const { block } = await api(`/api/stories/drafts/${story.id}/annotate/${blockId}`, { method: 'POST' }); story.blocks[story.blocks.findIndex((item) => item.id === blockId)] = block; renderEditor(); feedback(`${blockId} was re-annotated.`); }
    catch (error) { feedback(error.message, true); }
  }

  async function validate(requireAudio = false) {
    await save(false); const result = await api(`/api/stories/drafts/${story.id}/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requireAudio }) }); feedback(result.valid ? 'Validation passed.' : result.errors.join('\n'), !result.valid); return result.valid;
  }

  async function renderAudio() {
    try { if (!(await validate(false))) return; const { job } = await api(`/api/stories/drafts/${story.id}/audio/jobs`, { method: 'POST' }); $('#render-audio').disabled = true; pollJob(job.id); }
    catch (error) { feedback(error.message, true); }
  }

  async function pollJob(id) {
    try { const { job } = await api(`/api/jobs/${id}`); feedback(`Audio ${job.status}: ${job.completed}/${job.total}${job.currentBlock ? ` · ${job.currentBlock}` : ''}${job.error ? `\n${job.error}` : ''}`, job.status === 'failed'); if (job.status === 'complete') { $('#render-audio').disabled = false; await openDraft(story.id); return; } if (job.status === 'failed') { $('#render-audio').disabled = false; return; } setTimeout(() => pollJob(id), 1500); }
    catch (error) { $('#render-audio').disabled = false; feedback(error.message, true); }
  }

  async function publish() {
    try { if (!(await validate(true))) return; if (!confirm('Publish this reviewed story and audio into the tracked Flutter assets?')) return; const { entry } = await api(`/api/stories/drafts/${story.id}/publish`, { method: 'POST' }); feedback(`Published ${entry.englishTitle}. Rebuild Flutter Web to release it.`); }
    catch (error) { feedback(error.message, true); }
  }

  async function preview() {
    busy($('#preview'), true, 'Rendering…');
    try { const response = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'custom', text: $('#preview-text').value, speaker: $('#preview-speaker').value, instruction: '清晰自然地说，适合中文学习者。' }) }); if (!response.ok) throw new Error((await response.json()).error); const url = URL.createObjectURL(await response.blob()); $('#preview-audio').src = url; $('#preview-audio').play(); }
    catch (error) { feedback(error.message, true); }
    finally { busy($('#preview'), false, 'Preview'); }
  }

  async function clonePreview() {
    const file = $('#clone-file').files[0];
    if (!file) { feedback('Choose reference audio before cloning.', true); return; }
    const data = new FormData(); data.append('mode', 'base'); data.append('ref_audio', file); data.append('ref_text', $('#clone-reference-text').value); data.append('text', $('#clone-target').value);
    busy($('#clone'), true, 'Rendering…');
    try { const response = await fetch('/api/tts', { method: 'POST', body: data }); if (!response.ok) throw new Error((await response.json()).error); const url = URL.createObjectURL(await response.blob()); $('#clone-audio').src = url; $('#clone-audio').play(); }
    catch (error) { feedback(error.message, true); }
    finally { busy($('#clone'), false, 'Render clone preview'); }
  }

  function feedback(message, error = false) { const element = $('#feedback'); element.textContent = message; element.className = `feedback show${error ? ' error' : ''}`; }
  function busy(button, value, label) { button.disabled = value; button.textContent = label; }
  function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value == null ? '' : String(value); return div.innerHTML; }

  $('#generate').addEventListener('click', generate); $('#refresh').addEventListener('click', loadDrafts); $('#save').addEventListener('click', () => save()); $('#validate').addEventListener('click', () => validate(false)); $('#render-audio').addEventListener('click', renderAudio); $('#publish').addEventListener('click', publish); $('#preview').addEventListener('click', preview); $('#clone').addEventListener('click', clonePreview);
  $('#new-title').addEventListener('input', () => { delete $('#new-title').dataset.storyId; });
  boot();
})();
