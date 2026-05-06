import { VOCAB, ROADMAP } from './data.js';
import { shuffle, pickDistractors, escapeHtml, formatType, hasSpeechRecognition, normalizePinyin, convertNumberedPinyin, toneNumberName } from './utils.js';
import { state, saveState, getLearnedVocab, getVocabForStageSub, getVocabForStage } from './state.js';
import { say, classifyTone, getRecordingState, setRecording, getRecog, setRecog, setRecogResult, startPitchTracking, stopPitchTracking, getMicStream, setupRecognition } from './audio.js';

let qContainer, progressFill, qCurrent, qTotal;

export function initQuizDOM() {
  qContainer = document.getElementById('question-container');
  progressFill = document.getElementById('progress-fill');
  qCurrent = document.getElementById('q-current');
  qTotal = document.getElementById('q-total');
}

export function generateQuestions() {
  const s = state.settings;
  const types = [];
  if (s.chars) types.push('mc-char');
  if (s.listen) types.push('mc-listen');
  types.push('write');
  if (s.speak && hasSpeechRecognition()) types.push('speak');
  if (types.length === 0) types.push('write');

  const learned = getLearnedVocab();
  const currentStage = state.roadmapProgress.currentStage;
  const recentVocab = learned.filter(v => v.stage === currentStage - 1 || v.stage === currentStage);
  const olderVocab = learned.filter(v => v.stage < currentStage - 1);

  let selectedWords = [];
  const totalQuestions = 15;

  if (recentVocab.length > 0 && olderVocab.length > 0) {
    const recentCount = Math.ceil(totalQuestions * 0.5);
    const reviewCount = Math.ceil(totalQuestions * 0.3);
    const generalCount = totalQuestions - recentCount - reviewCount;
    selectedWords = [
      ...shuffle(recentVocab).slice(0, recentCount),
      ...shuffle(olderVocab).slice(0, reviewCount),
      ...shuffle(learned).slice(0, generalCount)
    ];
  } else {
    selectedWords = shuffle(learned).slice(0, totalQuestions);
  }
  selectedWords = shuffle(selectedWords).slice(0, totalQuestions);

  return buildQuestions(selectedWords, types);
}

export function generateStageQuestions(stageId, subIndex) {
  const pool = subIndex !== null && subIndex !== undefined
    ? getVocabForStageSub(stageId, subIndex)
    : getVocabForStage(stageId);
  const count = subIndex !== null && subIndex !== undefined ? 8 : 20;
  const s = state.settings;
  const types = [];
  if (s.chars) types.push('mc-char');
  if (s.listen) types.push('mc-listen');
  types.push('write');
  if (s.speak && hasSpeechRecognition()) types.push('speak');
  if (types.length === 0) types.push('write');
  const words = shuffle(pool).slice(0, Math.min(count, pool.length));
  return buildQuestions(words, types, pool);
}

function buildQuestions(words, types, pool) {
  const questions = [];
  for (let i = 0; i < words.length; i++) {
    const type = types[i % types.length];
    const word = words[i];
    const q = { type, word, answered: false, correct: false };
    const distractorPool = pool || VOCAB;
    if (type === 'mc-char') {
      const d = pool ? shuffle(distractorPool.filter(v => v.id !== word.id)).slice(0, 3) : pickDistractors(word, 3);
      q.options = shuffle([word, ...d]);
      q.correctOption = word.id;
    }
    if (type === 'mc-listen') {
      const d = pool ? shuffle(distractorPool.filter(v => v.id !== word.id)).slice(0, 3) : pickDistractors(word, 3);
      q.options = shuffle([word, ...d]);
      q.correctOption = word.id;
    }
    if (type === 'write') { q.acceptPinyin = true; q.acceptChar = state.settings.chars; }
    if (type === 'speak') { q.checkWord = true; q.checkTone = word.tone > 0; }
    questions.push(q);
  }
  return shuffle(questions);
}

export function startQuiz() {
  state.settings = {
    pinyin: document.getElementById('setting-pinyin').checked,
    chars: document.getElementById('setting-chars').checked,
    listen: document.getElementById('setting-listen').checked,
    speak: document.getElementById('setting-speak').checked
  };
  saveState();
  const questions = generateQuestions();
  state.quizMode = 'daily';
  state.quiz = { questions, current: 0, answers: new Array(questions.length).fill(null), done: false };
  document.getElementById('daily-settings').classList.add('hidden');
  document.getElementById('daily-results').classList.add('hidden');
  document.getElementById('daily-quiz').classList.remove('hidden');
  qTotal.textContent = questions.length;
  renderQuestion();
}

function updateProgress() {
  const q = state.quiz;
  progressFill.style.width = ((q.current) / q.questions.length * 100) + '%';
  qCurrent.textContent = q.current + 1;
}

export function renderQuestion() {
  const q = state.quiz;
  const question = q.questions[q.current];
  updateProgress();
  renderInto(qContainer, question, updateProgress);
}

function getCurrentGrammarTip() {
  if (state.quizMode === 'daily') return null;
  const stage = ROADMAP.find(s => s.id === state.quizStageId);
  if (!stage) return null;
  const subIndex = state.quizSubIndex;
  if (subIndex !== null && subIndex !== undefined && stage.subTopics[subIndex]) {
    return stage.subTopics[subIndex].grammarTip;
  }
  const q = state.quiz;
  if (q && q.questions[q.current]) {
    const word = q.questions[q.current].word;
    if (word.stage && word.sub !== undefined && stage.subTopics[word.sub]) {
      return stage.subTopics[word.sub].grammarTip;
    }
  }
  return null;
}

export function renderInto(container, question, progressFn) {
  let html = `<div class="question-type-badge">${formatType(question.type)}</div>`;

  if (question.type === 'mc-char') {
    html += `
      <div class="char-display">${escapeHtml(question.word.char)}</div>
      ${state.settings.pinyin ? `<div class="pinyin-display">${escapeHtml(question.word.pinyin)}</div>` : ''}
      <div class="prompt-text">Select the correct meaning</div>
      <div class="options-grid">${question.options.map(opt => `<button class="btn-option" data-id="${opt.id}">${escapeHtml(opt.meaning)}</button>`).join('')}</div>
    `;
    container.innerHTML = html;
    container.querySelectorAll('.btn-option').forEach(btn => btn.addEventListener('click', () => handleMC(btn, question, container, progressFn)));
    say(question.word.char);
  }
  else if (question.type === 'mc-listen') {
    html += `
      <div class="char-display" style="font-size:2.5rem">\u{1F50A}</div>
      <div class="prompt-text">Listen and select what you hear</div>
      <button class="btn-audio" id="replay-audio" title="Play audio">\u25B6</button>
      <div class="options-grid" style="margin-top:0.5rem">${question.options.map(opt => `<button class="btn-option" data-id="${opt.id}">${escapeHtml(opt.meaning)}</button>`).join('')}</div>
    `;
    container.innerHTML = html;
    container.querySelectorAll('.btn-option').forEach(btn => btn.addEventListener('click', () => handleMC(btn, question, container, progressFn)));
    container.querySelector('#replay-audio').addEventListener('click', () => say(question.word.char));
    say(question.word.char);
  }
  else if (question.type === 'write') {
    const placeholder = state.settings.chars ? 'Type the character or pinyin' : 'Type pinyin (e.g. ni3 hao3)';
    html += `
      <div class="meaning-display">${escapeHtml(question.word.meaning)}</div>
      <input type="text" class="write-input" id="write-answer" placeholder="${placeholder}" autocomplete="off">
      <div class="submit-row">
        <button class="btn-audio" id="play-hint" title="Play audio">\u25B6</button>
        <button class="btn-primary" id="submit-write">Submit</button>
      </div>
      <div id="write-feedback"></div>
    `;
    container.innerHTML = html;
    const input = container.querySelector('#write-answer');
    input.focus();
    input.addEventListener('input', () => {
      const cursor = input.selectionStart;
      const converted = convertNumberedPinyin(input.value);
      if (converted !== input.value) { input.value = converted; input.setSelectionRange(cursor, cursor); }
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') checkWrite(question, container, progressFn); });
    container.querySelector('#submit-write').addEventListener('click', () => checkWrite(question, container, progressFn));
    container.querySelector('#play-hint').addEventListener('click', () => say(question.word.char));
  }
  else if (question.type === 'speak') {
    html += `
      <div class="meaning-display">${escapeHtml(question.word.meaning)}</div>
      ${state.settings.chars ? `<div class="char-display" style="font-size:3rem">${question.word.char}</div>` : ''}
      ${state.settings.pinyin ? `<div class="pinyin-display">${escapeHtml(question.word.pinyin)}</div>` : ''}
      <div class="pitch-container"><canvas id="pitch-canvas" width="360" height="120"></canvas></div>
      <button class="btn-record" id="record-btn">\u{1F3A4}</button>
      <div class="record-hint" id="record-hint">Tap to record</div>
      <div id="speak-feedback"></div>
    `;
    container.innerHTML = html;
    const btn = container.querySelector('#record-btn');
    btn.addEventListener('click', () => toggleRecord(btn, question, container, progressFn));
  }
}

function handleMC(btn, question, container, progressFn) {
  if (question.answered) return;
  question.answered = true;
  const selectedId = parseInt(btn.dataset.id);
  const isCorrect = selectedId === question.word.id;
  question.correct = isCorrect;
  container.querySelectorAll('.btn-option').forEach(b => {
    b.disabled = true;
    const bid = parseInt(b.dataset.id);
    if (bid === question.word.id) b.classList.add('correct');
    else if (bid === selectedId && !isCorrect) b.classList.add('wrong');
  });
  const grammarTip = getCurrentGrammarTip();
  showInlineFeedback(isCorrect, question.word, container, grammarTip);
  setTimeout(() => nextQuestion(progressFn), isCorrect ? 900 : 1400);
}

function checkWrite(question, container, progressFn) {
  if (question.answered) return;
  const input = container.querySelector('#write-answer');
  const val = input.value.trim();
  if (!val) return;
  question.answered = true;
  const normInput = normalizePinyin(val);
  const normExpected = normalizePinyin(question.word.pinyin);
  let isCorrect = val === question.word.char || normInput === normExpected;
  question.correct = isCorrect;
  input.disabled = true;
  const fb = container.querySelector('#write-feedback');
  const grammarTip = getCurrentGrammarTip();
  fb.className = 'feedback ' + (isCorrect ? 'correct' : 'wrong');
  fb.innerHTML = isCorrect ? '\u2713 Correct!' : `\u2717 The answer was <strong>${escapeHtml(question.word.char)}</strong> (${escapeHtml(question.word.pinyin)})`;
  if (grammarTip) fb.innerHTML += `<div class="grammar-tip">${escapeHtml(grammarTip)}</div>`;
  setTimeout(() => nextQuestion(progressFn), isCorrect ? 900 : 1800);
}

async function toggleRecord(btn, question, container, progressFn) {
  if (getRecordingState().isRecording) { stopRecording(question, container, progressFn); }
  else { await startRecording(btn, question, container, progressFn); }
}

async function startRecording(btn, question, container, progressFn) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { alert('Microphone not supported.'); return; }
  setRecogResult('');
  try {
    const stream = await getMicStream();
    setRecording(true);
    btn.classList.add('btn-recording');
    container.querySelector('#record-hint').textContent = 'Recording... tap to stop';
    startPitchTracking(stream);
    if (hasSpeechRecognition()) {
      const r = setupRecognition();
      if (r) { r.onend = () => {}; r.start(); setRecog(r); }
    }
  } catch (err) { alert('Could not access microphone: ' + err.message); }
}

function stopRecording(question, container, progressFn) {
  setRecording(false);
  stopPitchTracking();
  const r = getRecog();
  if (r) { try { r.stop(); } catch (e) {} setRecog(null); }
  const btn = container.querySelector('#record-btn');
  if (btn) btn.classList.remove('btn-recording');
  const hint = container.querySelector('#record-hint');
  if (hint) hint.textContent = 'Tap to record';
  evaluateSpeech(question, container, progressFn);
}

function evaluateSpeech(question, container, progressFn) {
  question.answered = true;
  const word = question.word;
  const fb = container.querySelector('#speak-feedback');
  const { recogResult, pitchSamples } = getRecordingState();
  let saidWord = recogResult.trim();
  let wordCorrect = saidWord && saidWord.includes(word.char);
  const detectedTone = classifyTone(pitchSamples);
  const toneCorrect = word.tone > 0 && detectedTone !== null && detectedTone === word.tone;
  const toneSkipped = word.tone === 0;
  if (wordCorrect && (toneCorrect || toneSkipped)) question.correct = true;
  else if (wordCorrect || toneCorrect) question.correct = 'partial';
  else question.correct = false;

  let html = '';
  html += wordCorrect ? '<div>Word: <strong>Correct \u2713</strong></div>' : `<div>Word: <strong>Incorrect</strong>${saidWord ? ` (heard: "${escapeHtml(saidWord)}")` : ' (no speech detected)'}</div>`;
  if (!toneSkipped) {
    if (detectedTone !== null) {
      html += toneCorrect ? `<div>Tone: <strong>${toneNumberName(detectedTone)} \u2713</strong></div>` : `<div>Tone: Detected ${toneNumberName(detectedTone)}, Expected ${toneNumberName(word.tone)}</div>`;
    } else { html += '<div>Tone: Could not analyze</div>'; }
  }
  const grammarTip = getCurrentGrammarTip();
  if (grammarTip) html += `<div class="grammar-tip">${escapeHtml(grammarTip)}</div>`;
  const cls = question.correct === true ? 'correct' : (question.correct === 'partial' ? 'partial' : 'wrong');
  fb.className = 'feedback ' + cls;
  fb.innerHTML = html;
  setTimeout(() => nextQuestion(progressFn), question.correct === true ? 1200 : 2000);
}

function showInlineFeedback(isCorrect, word, container, grammarTip) {
  let fb = container.querySelector('.feedback');
  if (!fb) { fb = document.createElement('div'); fb.className = 'feedback'; container.appendChild(fb); }
  fb.className = 'feedback ' + (isCorrect ? 'correct' : 'wrong');
  fb.innerHTML = isCorrect ? '\u2713 Correct!' : `\u2717 It was <strong>${escapeHtml(word.char)}</strong> \u2014 ${escapeHtml(word.meaning)}`;
  if (grammarTip && !isCorrect) fb.innerHTML += `<div class="grammar-tip">${escapeHtml(grammarTip)}</div>`;
}

let onStageNext = null;
let onStageComplete = null;

export function setStageQuizHandlers(nextFn, completeFn) {
  onStageNext = nextFn;
  onStageComplete = completeFn;
}

function nextQuestion(progressFn) {
  const q = state.quiz;
  q.current++;
  if (q.current >= q.questions.length) {
    if (state.quizMode === 'daily') { showDailyResults(); }
    else if (onStageComplete) { onStageComplete(); }
  } else {
    if (state.quizMode === 'daily') { renderQuestion(); }
    else if (onStageNext) { onStageNext(); }
  }
}

function showDailyResults() {
  document.getElementById('daily-quiz').classList.add('hidden');
  document.getElementById('daily-results').classList.remove('hidden');
  const q = state.quiz;
  const total = q.questions.length;
  let score = 0, partial = 0;
  q.questions.forEach(qs => { if (qs.correct === true) score++; else if (qs.correct === 'partial') partial++; });
  const pct = Math.round(((score + partial * 0.5) / total) * 100);
  document.getElementById('results-summary').innerHTML = `
    <div class="score-circle" style="--pct:${pct}"><div class="score-text">${score + partial}/${total}</div></div>
    <div class="results-stats">
      <div class="stat-box"><div class="stat-value">${pct}%</div><div class="stat-label">Accuracy</div></div>
      <div class="stat-box"><div class="stat-value">${score}</div><div class="stat-label">Correct</div></div>
      <div class="stat-box"><div class="stat-value">${total - score - partial}</div><div class="stat-label">Missed</div></div>
    </div>
  `;
  document.getElementById('results-breakdown').innerHTML = q.questions.map(qs => {
    const cls = qs.correct === true ? 'correct' : (qs.correct === 'partial' ? 'partial' : 'wrong');
    const icon = qs.correct === true ? '\u2713' : (qs.correct === 'partial' ? '~' : '\u2717');
    return `<div class="breakdown-item ${cls}"><div class="bq-icon">${icon}</div><div class="bq-info"><strong>${formatType(qs.type)}</strong><div class="bq-answer">${escapeHtml(qs.word.char)} \u2014 ${escapeHtml(qs.word.meaning)}</div></div></div>`;
  }).join('');
  state.history.push({ date: Date.now(), score, total, pct });
  saveState();
}
