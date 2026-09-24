(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const LEVELS = ['beginner', 'intermediate', 'advanced'];
  const KEY = 'storytime.v1';
  const synth = window.speechSynthesis;
  const capable = !!synth && typeof SpeechSynthesisUtterance !== 'undefined';
  const defaults = { progress: {}, speed: 0.65, support: 'guided', step: false, voice: '', level: 'beginner'};
  let state = {...defaults};
  let story, index = 0, playing = false, token = 0, utterance, voices = [], view = 'library', installPrompt;
  let noticeTimer;
  let recording;
  const hasRecordings = () => builtins.some(s => s.sentences.some(sentence => sentence.audio));
  const recordedSentence = () => story?.sentences[index]?.audio && !state.voice;
  function notice(message) {
    $('notice').textContent = message; $('notice').hidden = false;
    clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 6500);
  }
  // Copy only supported fields; story text is always rendered with textContent.
  function validate(raw) {
    if (!raw || typeof raw.title !== 'string' || !raw.title.trim() || raw.title.length > 120 || !LEVELS.includes(raw.level)) throw Error('Each story needs a title (up to 120 characters) and a valid level.');
    if (!Array.isArray(raw.sentences) || !raw.sentences.length || raw.sentences.length > 500) throw Error('Use between 1 and 500 sentences.');
    let length = 0;
    const sentences = raw.sentences.map((s) => {
      if (!s || typeof s.zh !== 'string' || !s.zh.trim() || s.zh.length > 1000) throw Error('Each sentence needs Chinese text, up to 1,000 characters. Split longer passages into sentences.');
      const clean = {zh: s.zh.trim()};
      if (typeof s.audio === 'string' && /^audio\/[a-f0-9]{24}\.wav$/.test(s.audio)) clean.audio = s.audio;
      for (const key of ['pinyin', 'en']) {
        if (s[key] != null && typeof s[key] !== 'string') throw Error('Pinyin and English must be text.');
        clean[key] = (s[key] || '').trim();
        if (clean[key].length > 2000) throw Error('A translation is too long.');
      }
      length += clean.zh.length + clean.pinyin.length + clean.en.length;
      return clean;
    });
    if (length > 90000) throw Error('This story is too large. Please split it into chapters.');
    const result = {title: raw.title.trim(), level: raw.level, sentences};
    for (const key of ['description', 'note', 'series', 'symbol']) if (typeof raw[key] === 'string') result[key] = raw[key].slice(0, 500);
    return result;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved === 'object') {
      state = {...defaults, ...saved};
      state.progress = saved.progress && typeof saved.progress === 'object' && !Array.isArray(saved.progress) ? saved.progress : {};
      if (![0.5, 0.65, 0.8, 1, 1.2].includes(state.speed)) state.speed = defaults.speed;
      if (!['guided', 'pinyin', 'hanzi'].includes(state.support)) state.support = defaults.support;
      if (![...LEVELS, 'all'].includes(state.level)) state.level = defaults.level;
    }
  } catch { /* Storage may be unavailable; reading still works. */ }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch { notice('Your reading progress could not be saved. Storage is unavailable or full.'); return false; }
  }
  const builtins = (window.STORYTIME_STORIES || []).map((s) => ({...validate(s), id:s.id}));
  const allStories = () => builtins;
  function node(tag, className, text) {
    const el = document.createElement(tag); if (className) el.className = className; if (text != null) el.textContent = text; return el;
  }
  function switchView(next) {
    stop(); view = next;
    for (const name of ['library', 'reader']) $(name).hidden = name !== next;
    window.scrollTo(0, 0);
  }
  function renderLibrary() {
    $('story-grid').replaceChildren();
    document.querySelectorAll('[data-level]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.level === state.level)));
    $('level-note').textContent = {beginner:'Short sentences, everyday words, and a gentle place to start.',intermediate:'Longer sentences and connected ideas, with support whenever you need it.',advanced:'Richer vocabulary, nuanced ideas, and more complex sentence structures.',all:'Every story, at every pace. Pick the level that feels right today.'}[state.level];
    const readCount = allStories().filter(s => state.progress[s.id]?.done).length;
    $('read-count').textContent = `${readCount} ${readCount === 1 ? 'story' : 'stories'} read`;
    for (const s of allStories().filter(s => state.level === 'all' || s.level === state.level)) {
      const card = node('button', 'story-card');
      const cover = node('span', 'cover', s.symbol || '文'); cover.setAttribute('aria-hidden','true');
      const body = node('span', 'card-body');
      body.append(node('span', 'card-meta', `${s.level} · ${s.sentences.length} sentences`), node('h3', '', s.title), node('p', '', s.description || 'Your own little Mandarin adventure.'));
      const foot = node('span', 'card-foot'); foot.append(node('span', '', state.progress[s.id]?.done ? '✓ Read · revisit anytime' : state.progress[s.id] ? 'Continue reading' : 'Read a little'), node('span', '', '→'));
      card.append(cover, body, foot); card.addEventListener('click', () => openStory(s)); $('story-grid').append(card);
    }
  }
  function remember(done = false) {
    state.progress[story.id] = {index, done: done || !!state.progress[story.id]?.done}; save();
  }
  function openStory(next) {
    switchView('reader'); story = next;
    const previous = state.progress[story.id]?.index;
    index = Number.isInteger(previous) ? Math.max(0, Math.min(previous, story.sentences.length - 1)) : 0;
    $('reader-title').textContent = story.title;
    $('reader-level').textContent = `${story.level} · ${story.sentences.length} small steps`;
    $('reader-description').textContent = story.note || story.description || 'Read a little. Listen a little. Take your time.';
    $('complete').textContent = state.progress[story.id]?.done ? '✓ Read — practice again anytime' : 'Mark as read ✓';
    $('reader-difficulty').replaceChildren();
    const related = story.series ? allStories().filter(s => s.series === story.series) : [story];
    related.sort((a,b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level)).forEach(s => {
      const option = node('option','',s.level[0].toUpperCase()+s.level.slice(1)); option.value = s.id; $('reader-difficulty').append(option);
    });
    $('reader-difficulty').value = story.id; $('reader-difficulty').disabled = related.length < 2;
    renderSentences(); updatePlayer(); $('reader-title').focus({preventScroll:true});
  }
  function renderSentences() {
    $('sentences').replaceChildren();
    story.sentences.forEach((s, i) => {
      const button = node('button', 'sentence'); button.setAttribute('aria-label', `Listen to sentence ${i+1}: ${s.zh}`);
      const zh = node('span', 'hanzi', s.zh); zh.lang = 'zh-CN'; button.append(zh);
      if (state.support !== 'hanzi' && s.pinyin) { const py = node('span','pinyin',s.pinyin); py.lang = 'zh-Latn'; button.append(py); }
      if (state.support === 'guided' && s.en) button.append(node('span', 'english', s.en));
      button.addEventListener('click', () => { stop(); index = i; remember(); updatePlayer(); speak(); });
      $('sentences').append(button);
    });
    highlight();
  }
  function highlight(scroll = false) {
    [...$('sentences').children].forEach((el, i) => { el.classList.toggle('active', i === index); if (i === index) el.setAttribute('aria-current','step'); else el.removeAttribute('aria-current'); });
    if (scroll) $('sentences').children[index]?.scrollIntoView({block:'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  }
  function updatePlayer() {
    $('play').textContent = playing ? 'Ⅱ Pause' : '▶ Listen'; $('play').disabled = !capable && !recordedSentence();
    $('position').textContent = `Sentence ${index+1} of ${story.sentences.length}`;
    $('progress').max = story.sentences.length; $('progress').value = index+1;
    $('previous').disabled = index === 0; $('next').disabled = index === story.sentences.length-1;
    highlight();
  }
  function stop() {
    token++; playing = false; utterance = null; synth?.cancel();
    if (recording) { recording.onplaying = recording.onended = recording.onerror = null; recording.pause(); recording.removeAttribute('src'); recording.load(); }
    if (story) { $('sentences').querySelectorAll('.hanzi').forEach((el,i) => { el.textContent = story.sentences[i]?.zh || ''; }); updatePlayer(); }
  }
  function speak() {
    if (!capable && !recordedSentence()) { $('speech-message').textContent = 'Speech is unavailable in this browser. You can still read every story.'; return; }
    stop(); playing = true; const run = token; updatePlayer();
    const sentence = story.sentences[index];
    const ended = () => {
      if (token !== run) return;
      if (index === story.sentences.length-1) {
        remember(true); stop(); $('complete').textContent = '✓ Read — practice again anytime';
        $('speech-message').textContent = 'Story finished. Listen again whenever you like.';
      } else { const step = state.step; stop(); index++; remember(); updatePlayer(); if (!step) speak(); }
    };
    if (recordedSentence()) {
      // Reuse the element unlocked by the user's first tap for mobile playback.
      const audio = recording || (recording = new Audio()); audio.src = sentence.audio;
      audio.playbackRate = state.speed; audio.preservesPitch = true;
      audio.onplaying = () => { if (token === run) { highlight(true); $('speech-message').textContent = ''; } };
      audio.onended = ended;
      const failed = () => {
        if (token !== run) return;
        stop(); $('speech-message').textContent = 'Recording could not play. Reopen online to download it, or choose a device voice.';
      };
      audio.onerror = failed;
      try {
        if (navigator.audioSession) navigator.audioSession.type = 'playback';
        audio.play().catch(failed);
      } catch { failed(); }
      return;
    }
    const u = new SpeechSynthesisUtterance(sentence.zh); utterance = u;
    u.voice = voices.find(v => v.voiceURI === state.voice) || voices.find(v => /^zh[-_]CN$/i.test(v.lang)) || voices[0] || null;
    u.lang = u.voice?.lang || 'zh-CN'; u.rate = state.speed;
    u.onstart = () => { if (token === run) { highlight(true); $('speech-message').textContent = ''; } };
    u.onboundary = (event) => {
      if (token !== run || event.charIndex < 0 || event.charIndex >= sentence.zh.length) return;
      const target = $('sentences').children[index].querySelector('.hanzi');
      const start = event.charIndex, end = start + (event.charLength || [...sentence.zh.slice(start)][0].length);
      target.replaceChildren(document.createTextNode(sentence.zh.slice(0,start)), node('mark','',sentence.zh.slice(start,end)), document.createTextNode(sentence.zh.slice(end)));
    };
    u.onend = ended;
    u.onerror = (event) => {
      if (token !== run) return;
      stop(); $('speech-message').textContent = ['voice-unavailable','language-unavailable'].includes(event.error) ? 'Add a Mandarin voice in your device’s speech settings, then reopen StoryTime.' : 'Speech could not play. Check your voice, sound, and connection, then tap Listen again.';
    };
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
      if (synth.paused) synth.resume(); synth.speak(u);
    } catch { stop(); $('speech-message').textContent = 'Speech could not start. Try another voice or browser.'; }
  }
  function loadVoices() {
    // Exclude Cantonese (zh-HK / yue); prefer mainland Mandarin, then Taiwan.
    voices = capable ? synth.getVoices().filter(v => /^(zh(?:[-_](?:CN|TW|SG|Hans|Hant))?|cmn)(?:[-_]|$)/i.test(v.lang) && !/[-_]HK/i.test(v.lang)) : [];
    $('voice').replaceChildren(); const auto = node('option','',hasRecordings() ? 'Kokoro · recorded Mandarin' : 'Automatic Mandarin'); auto.value = ''; $('voice').append(auto);
    voices.forEach(v => { const option = node('option','',`${v.name}${v.localService ? ' · on device' : ' · online'}`); option.value = v.voiceURI; $('voice').append(option); });
    if (!voices.some(v => v.voiceURI === state.voice)) state.voice = '';
    $('voice').value = state.voice;
    $('speech-message').textContent = hasRecordings() ? '' : !capable ? 'Speech is unavailable in this browser. Reading still works.' : !voices.length ? 'No Mandarin voice listed yet. Your browser will try its default; you may need to download a Mandarin voice in device settings.' : '';
    if (story) updatePlayer();
  }
  document.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => { state.level = b.dataset.level; save(); renderLibrary(); }));
  $('back').onclick = () => { switchView('library'); renderLibrary(); };
  $('play').onclick = () => playing ? stop() : speak();
  function move(delta) { const resume = playing; stop(); index = Math.max(0, Math.min(story.sentences.length-1,index+delta)); remember(); updatePlayer(); highlight(true); if (resume) speak(); }
  $('previous').onclick = () => move(-1); $('next').onclick = () => move(1);
  $('speed').value = state.speed; $('support').value = state.support; $('step-mode').checked = !!state.step;
  $('speed').onchange = () => { state.speed = Number($('speed').value); save(); if (playing) speak(); };
  $('voice').onchange = () => { state.voice = $('voice').value; save(); if (playing) speak(); };
  $('support').onchange = () => { state.support = $('support').value; save(); renderSentences(); };
  $('step-mode').onchange = () => { state.step = $('step-mode').checked; save(); };
  $('reader-difficulty').onchange = () => openStory(allStories().find(s => s.id === $('reader-difficulty').value));
  $('complete').onclick = () => { remember(true); $('complete').textContent = '✓ Read — practice again anytime'; notice('A little more Mandarin. Story marked as read.'); };
  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); installPrompt = event; $('install').hidden = false; });
  $('install').onclick = async () => { if (!installPrompt) return; await installPrompt.prompt(); installPrompt = null; $('install').hidden = true; };
  window.addEventListener('appinstalled', () => { $('install').hidden = true; });
  $('install-help').onclick = () => notice('On iPhone/iPad: Safari → Share → Add to Home Screen. On Android/desktop: browser menu → Install app. Open the hosted site first; installation needs HTTPS.');
  window.addEventListener('pagehide', stop);
  loadVoices(); if (capable) synth.addEventListener('voiceschanged', loadVoices);
  renderLibrary();
  if ('serviceWorker' in navigator && ['https:','http:'].includes(location.protocol)) navigator.serviceWorker.register('./sw.js').catch(() => notice('Offline setup failed. Reopen while connected to try again.'));
})();
