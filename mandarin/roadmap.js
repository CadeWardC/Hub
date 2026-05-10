import { ROADMAP } from './data.js';
import { VOCAB } from './vocab.js';
import { SENTENCES } from './sentences.js';
import { escapeHtml, shuffle } from './utils.js';
import { state, saveState, getVocabForStageSub, getCompletedSubVocab, wordStats } from './state.js';
import { say } from './audio.js';
import { startStageQuiz } from './stage-quiz.js';

let allSentences = SENTENCES;
let sentences = SENTENCES;
let sentenceIndex = 0;

export function loadSentences() {
  allSentences = SENTENCES;
  sentences = SENTENCES;
  return Promise.resolve();
}

function filterSentences(stageId, subIndex) {
  if (stageId == null) {
    sentences = allSentences;
  } else if (subIndex == null) {
    sentences = allSentences.filter(s => s.stage === stageId);
  } else {
    sentences = allSentences.filter(s => s.stage === stageId && s.sub === subIndex);
  }
  sentenceIndex = 0;
}

function renderSentenceCard() {
  const container = document.getElementById('sentence-container');
  const counter = document.getElementById('sentence-counter');
  const prevBtn = document.getElementById('sentence-prev');
  const nextBtn = document.getElementById('sentence-next');
  if (!container) return;

  if (sentences.length === 0) {
    container.innerHTML = '<p class="sentence-empty">No sentences yet. Add some to <code>sentences.json</code>.</p>';
    if (counter) counter.textContent = '';
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    return;
  }

  const s = sentences[sentenceIndex];
  container.innerHTML = `
    <div class="sentence-card">
      <div class="sentence-layer sentence-mandarin" data-layer="mandarin">
        <span class="sentence-text">${escapeHtml(s.mandarin)}</span>
      </div>
      <div class="sentence-layer sentence-pinyin hidden" data-layer="pinyin">
        <span class="sentence-text">${escapeHtml(s.pinyin)}</span>
      </div>
      <div class="sentence-layer sentence-translation hidden" data-layer="translation">
        <span class="sentence-text">${escapeHtml(s.translation)}</span>
      </div>
      <button id="sentence-reveal-btn" class="btn-primary sentence-reveal-btn">Reveal Next</button>
    </div>
  `;

  if (counter) counter.textContent = (sentenceIndex + 1) + ' / ' + sentences.length;
  if (prevBtn) prevBtn.disabled = sentenceIndex === 0;
  if (nextBtn) nextBtn.disabled = sentenceIndex >= sentences.length - 1;

  const revealBtn = document.getElementById('sentence-reveal-btn');
  revealBtn.addEventListener('click', () => {
    const hidden = container.querySelector('.sentence-layer.hidden');
    if (hidden) {
      hidden.classList.remove('hidden');
      if (!container.querySelector('.sentence-layer.hidden')) {
        revealBtn.textContent = 'All Revealed';
        revealBtn.disabled = true;
      }
    }
  });
}

export function renderSentenceReveal(stageId, subIndex) {
  if (allSentences.length === 0) {
    loadSentences().then(() => {
      filterSentences(stageId, subIndex);
      renderSentenceCard();
    });
  } else {
    filterSentences(stageId, subIndex);
    renderSentenceCard();
  }
}

export function initSentenceNav() {
  const prevBtn = document.getElementById('sentence-prev');
  const nextBtn = document.getElementById('sentence-next');
  if (prevBtn) prevBtn.addEventListener('click', () => { if (sentenceIndex > 0) { sentenceIndex--; renderSentenceCard(); } });
  if (nextBtn) nextBtn.addEventListener('click', () => { if (sentenceIndex < sentences.length - 1) { sentenceIndex++; renderSentenceCard(); } });
}

export function getStageStatus(stageId) {
  const rp = state.roadmapProgress;
  if (rp.completedStages.includes(stageId)) return 'completed';
  if (rp.currentStage === stageId) return 'active';
  if (stageId < rp.currentStage) return 'completed';
  return 'locked';
}

export function computeRoadmapOverallPct() {
  let totalSub = 0, doneSub = 0;
  ROADMAP.forEach(stage => {
    totalSub += stage.subTopics.length;
    const completed = state.roadmapProgress.completedSubTopics[stage.id] || [];
    doneSub += completed.length;
  });
  return totalSub === 0 ? 0 : Math.round((doneSub / totalSub) * 100);
}

export function renderRoadmap() {
  const phasesEl = document.getElementById('roadmap-phases');
  const progressFill = document.getElementById('roadmap-progress-fill');
  const progressPct = document.getElementById('roadmap-progress-pct');
  const currentPill = document.getElementById('roadmap-current-pill');
  if (!phasesEl) return;

  const overallPct = computeRoadmapOverallPct();
  if (progressFill) progressFill.style.width = overallPct + '%';
  if (progressPct) progressPct.textContent = overallPct + '%';
  const currentStage = ROADMAP.find(s => s.id === state.roadmapProgress.currentStage);
  if (currentPill && currentStage) currentPill.textContent = 'Stage ' + currentStage.id + ': ' + currentStage.title;

  const phases = {};
  ROADMAP.forEach(stage => {
    if (!phases[stage.phase]) phases[stage.phase] = { title: stage.phaseTitle, stages: [] };
    phases[stage.phase].stages.push(stage);
  });

  phasesEl.innerHTML = Object.entries(phases).map(([phaseNum, phase]) => {
    const doneInPhase = phase.stages.filter(s => getStageStatus(s.id) === 'completed').length;
    const expanded = phase.stages.some(s => getStageStatus(s.id) === 'active') ? '' : 'collapsed';
    return `
      <div class="roadmap-phase phase-${phaseNum}">
        <div class="roadmap-phase-header ${expanded}" data-phase="${phaseNum}">
          <div><div class="phase-title">Phase ${phaseNum}: ${escapeHtml(phase.title)}</div><div class="phase-meta">${doneInPhase}/${phase.stages.length} stages complete</div></div>
          <div class="phase-chevron">\u25BC</div>
        </div>
        <div class="roadmap-phase-body ${expanded}">
          ${phase.stages.map(stage => {
            const status = getStageStatus(stage.id);
            const completedSubs = state.roadmapProgress.completedSubTopics[stage.id] || [];
            const subPct = stage.subTopics.length === 0 ? 0 : Math.round((completedSubs.length / stage.subTopics.length) * 100);
            const isExpanded = status === 'active' ? 'expanded' : '';
            const icon = status === 'completed' ? '\u2713' : stage.id;
            return `
              <div class="roadmap-stage ${status} ${isExpanded}" data-stage="${stage.id}">
                <div class="roadmap-stage-header">
                  <div class="stage-number">${icon}</div>
                  <div class="stage-info"><div class="stage-title">${escapeHtml(stage.title)}</div><div class="stage-milestone">${escapeHtml(stage.milestone)}</div></div>
                  <div class="stage-progress-bar"><div class="stage-progress-fill" style="width:${subPct}%"></div></div>
                  <button class="btn-stage-quiz" data-stage="${stage.id}" title="Take stage quiz">\u{1F3AF} Quiz</button>
                  <div class="stage-chevron">\u25BC</div>
                </div>
                <div class="roadmap-subtopics">
                  ${stage.subTopics.map((sub, i) => {
                    const quizDone = sub.quizPassed;
                    const scoreBadge = sub.bestScore !== null ? `<span class="subtopic-score ${quizDone ? 'passed' : ''}">${sub.bestScore}%</span>` : '';
                    return `
                      <div class="subtopic-item ${quizDone ? 'quiz-passed' : ''}">
                        <span class="subtopic-check ${quizDone ? 'quiz-check' : ''}">${quizDone ? '\u2713' : ''}</span>
                        <span class="subtopic-name">${escapeHtml(sub.name)}</span>
                        ${scoreBadge}
                        <button class="btn-subtopic-vocab" data-stage="${stage.id}" data-sub="${i}" title="View vocab list">\u{1F4D6}</button>
                        <button class="btn-subtopic-quiz" data-stage="${stage.id}" data-sub="${i}" title="Take quiz for this topic">\u{1F4DD}</button>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');

  phasesEl.querySelectorAll('.roadmap-phase-header').forEach(hdr => {
    hdr.addEventListener('click', () => { hdr.classList.toggle('collapsed'); const body = hdr.nextElementSibling; if (body) body.classList.toggle('collapsed'); });
  });
  phasesEl.querySelectorAll('.roadmap-stage-header').forEach(hdr => {
    hdr.addEventListener('click', e => { if (e.target.closest('.btn-stage-quiz')) return; const stageEl = hdr.closest('.roadmap-stage'); if (stageEl.classList.contains('locked')) return; stageEl.classList.toggle('expanded'); });
  });
  phasesEl.querySelectorAll('.btn-stage-quiz').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); startStageQuiz(parseInt(btn.dataset.stage), null); });
  });
  phasesEl.querySelectorAll('.btn-subtopic-quiz').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); startStageQuiz(parseInt(btn.dataset.stage), parseInt(btn.dataset.sub)); });
  });
  phasesEl.querySelectorAll('.btn-subtopic-vocab').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); showVocabList(parseInt(btn.dataset.stage), parseInt(btn.dataset.sub)); });
  });
}

export function showVocabList(stageId, subIndex) {
  const stage = ROADMAP.find(s => s.id === stageId);
  if (!stage) return;
  const words = getVocabForStageSub(stageId, subIndex);
  const subName = stage.subTopics[subIndex].name;
  const overlay = document.getElementById('vocab-overlay');
  const titleEl = document.getElementById('vocab-overlay-title');
  const listEl = document.getElementById('vocab-overlay-list');
  const closeBtn = document.getElementById('vocab-overlay-close');
  titleEl.textContent = subName + ' \u2014 Vocab';

  const matchingSentences = allSentences.filter(s => s.stage === stageId && s.sub === subIndex);

  listEl.innerHTML = words.map(w => `
    <div class="vocab-list-item">
      <button class="vocab-play-btn" data-char="${escapeHtml(w.char)}" title="Play audio">\u25B6</button>
      <div class="vocab-list-char">${escapeHtml(w.char)}</div>
      <div class="vocab-list-details"><div class="vocab-list-pinyin">${escapeHtml(w.pinyin)}</div><div class="vocab-list-meaning">${escapeHtml(w.meaning)}</div></div>
    </div>
  `).join('') + (matchingSentences.length > 0 ? `
    <div class="vocab-sentences-section">
      <h3 class="vocab-sentences-heading">Example Sentences</h3>
      ${matchingSentences.map(s => `
        <div class="vocab-sentence-item">
          <div class="vocab-sentence-mandarin">${escapeHtml(s.mandarin)}</div>
          <div class="vocab-sentence-pinyin">${escapeHtml(s.pinyin)}</div>
          <div class="vocab-sentence-translation">${escapeHtml(s.translation)}</div>
        </div>
      `).join('')}
    </div>
  ` : '');

  listEl.querySelectorAll('.vocab-play-btn').forEach(btn => btn.addEventListener('click', () => say(btn.dataset.char)));
  closeBtn.onclick = () => overlay.classList.add('hidden');
  overlay.classList.remove('hidden');
}

export function renderVocabPreview() {
  const el = document.getElementById('vocab-preview');
  if (!el) return;
  const pool = getCompletedSubVocab();
  const searchInput = document.getElementById('vocab-search');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

  let filtered = pool;
  if (query) {
    filtered = pool.filter(v =>
      v.char.includes(query) ||
      v.pinyin.toLowerCase().includes(query) ||
      v.meaning.toLowerCase().includes(query)
    );
  }

  const troublesome = [];
  const normal = [];
  filtered.forEach(v => {
    const stats = wordStats[v.id];
    if (stats && stats.wrong > 0 && stats.streak < 2) {
      troublesome.push(v);
    } else {
      normal.push(v);
    }
  });

  troublesome.sort((a, b) => {
    const sa = wordStats[a.id] || { wrong: 0 };
    const sb = wordStats[b.id] || { wrong: 0 };
    return sb.wrong - sa.wrong;
  });

  const all = query ? filtered : [...troublesome, ...normal];

  if (pool.length === 0) {
    el.innerHTML = '<p class="vocab-empty">Complete subtopics in the Roadmap to unlock vocabulary here.</p>';
    return;
  }

  if (all.length === 0) {
    el.innerHTML = '<p class="vocab-empty">No matches found.</p>';
    return;
  }

  if (query) {
    el.innerHTML = all.map(v => {
      const stats = wordStats[v.id];
      const isTroublesome = stats && stats.wrong > 0 && stats.streak < 2;
      return `<div class="vocab-chip${isTroublesome ? ' troublesome' : ''}">
        ${isTroublesome ? '<span class="trouble-dot"></span>' : ''}
        <div class="vc-char">${escapeHtml(v.char)}</div>
        <div class="vc-pinyin">${escapeHtml(v.pinyin)} \u2014 ${escapeHtml(v.meaning)}</div>
      </div>`;
    }).join('');
  } else {
    el.innerHTML =
      (troublesome.length > 0 ? `<h3 class="vocab-section-title">Troublesome Words</h3>` : '') +
      all.map(v => {
        const stats = wordStats[v.id];
        const isTroublesome = stats && stats.wrong > 0 && stats.streak < 2;
        return `<div class="vocab-chip${isTroublesome ? ' troublesome' : ''}">
          ${isTroublesome ? '<span class="trouble-dot"></span>' : ''}
          <div class="vc-char">${escapeHtml(v.char)}</div>
          <div class="vc-pinyin">${escapeHtml(v.pinyin)} \u2014 ${escapeHtml(v.meaning)}</div>
        </div>`;
      }).join('');
  }
}

function computeStreak() {
  if (!state.lastQuizDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = new Date(state.lastQuizDate + 'T00:00:00');
  const diffDays = Math.floor((today - last) / 86400000);
  if (diffDays > 1) return 0;
  let streak = diffDays === 0 ? 1 : 0;
  const dates = [...new Set(state.history.map(h => new Date(h.date).toISOString().slice(0, 10)))].sort().reverse();
  if (dates.length === 0) return 0;
  const base = new Date(dates[0] + 'T00:00:00');
  for (let i = streak === 1 ? 1 : 0; i < dates.length; i++) {
    const d = new Date(dates[i] + 'T00:00:00');
    const expected = new Date(base);
    expected.setDate(expected.getDate() - (i - (streak === 1 ? 1 : 0)));
    if (d.toISOString().slice(0, 10) === expected.toISOString().slice(0, 10)) {
      if (i === 0 && streak === 0) streak = 1;
      else streak++;
    } else break;
  }
  return streak;
}

function drawAccuracyChart(canvas, history) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);
  const cw = canvas.offsetWidth;
  const ch = canvas.offsetHeight;
  ctx.clearRect(0, 0, cw, ch);
  if (history.length < 2) {
    ctx.fillStyle = '#999';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Take more quizzes to see your trend', cw / 2, ch / 2);
    return;
  }
  const pad = { top: 20, right: 16, bottom: 30, left: 36 };
  const plotW = cw - pad.left - pad.right;
  const plotH = ch - pad.top - pad.bottom;
  ctx.strokeStyle = '#e0dcd6';
  ctx.lineWidth = 1;
  for (let pct = 0; pct <= 100; pct += 25) {
    const y = pad.top + plotH - (pct / 100) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    ctx.fillStyle = '#999';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(pct + '%', pad.left - 4, y + 4);
  }
  const data = history.slice(-20);
  const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
  gradient.addColorStop(0, 'rgba(198, 40, 40, 0.15)');
  gradient.addColorStop(1, 'rgba(198, 40, 40, 0)');
  const points = data.map((d, i) => ({
    x: pad.left + (i / Math.max(data.length - 1, 1)) * plotW,
    y: pad.top + plotH - (d.pct / 100) * plotH
  }));
  ctx.beginPath();
  ctx.moveTo(points[0].x, pad.top + plotH);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, pad.top + plotH);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.beginPath();
  ctx.strokeStyle = '#c62828';
  ctx.lineWidth = 2;
  points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
  ctx.stroke();
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#c62828';
    ctx.fill();
  });
  ctx.fillStyle = '#999';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  const firstDate = new Date(data[0].date);
  const lastDate = new Date(data[data.length - 1].date);
  ctx.fillText(firstDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), points[0].x, ch - 6);
  ctx.fillText(lastDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), points[points.length - 1].x, ch - 6);
}

export function renderStatsDashboard() {
  const el = document.getElementById('stats-dashboard');
  if (!el) return;
  const history = state.history;
  const totalQuizzes = history.length;
  const avgPct = totalQuizzes > 0 ? Math.round(history.reduce((s, h) => s + h.pct, 0) / totalQuizzes) : 0;
  const streak = computeStreak();
  const completedWords = getCompletedSubVocab().length;
  const totalWords = VOCAB.length;
  const troubleWords = Object.entries(wordStats)
    .filter(([_, s]) => s.wrong >= 2)
    .sort((a, b) => b[1].wrong - a[1].wrong)
    .slice(0, 10);

  let html = `<div class="stats-summary">
    <div class="stat-box"><div class="stat-value">${totalQuizzes}</div><div class="stat-label">Quizzes</div></div>
    <div class="stat-box"><div class="stat-value">${avgPct}%</div><div class="stat-label">Avg Accuracy</div></div>
    <div class="stat-box"><div class="stat-value">${streak}</div><div class="stat-label">Day Streak</div></div>
  </div>`;

  html += `<div class="stats-progress-row">
    <div class="stats-words-label">Words learned</div>
    <div class="stats-words-bar"><div class="stats-words-fill" style="width:${totalWords ? Math.round(completedWords / totalWords * 100) : 0}%"></div></div>
    <div class="stats-words-count">${completedWords} / ${totalWords}</div>
  </div>`;

  html += `<div class="stats-chart-container"><canvas id="stats-chart" class="stats-chart"></canvas></div>`;

  if (troubleWords.length > 0) {
    html += `<h3 class="stats-section-title">Weakest Words</h3>`;
    html += `<div class="stats-weak-list">`;
    troubleWords.forEach(([id, s]) => {
      const v = VOCAB.find(w => w.id === parseInt(id));
      if (!v) return;
      html += `<div class="stats-weak-item">
        <span class="stats-weak-char">${escapeHtml(v.char)}</span>
        <span class="stats-weak-pinyin">${escapeHtml(v.pinyin)}</span>
        <span class="stats-weak-meaning">${escapeHtml(v.meaning)}</span>
        <span class="stats-weak-wrong">\u00d7${s.wrong}</span>
      </div>`;
    });
    html += `</div>`;
  }

  if (totalQuizzes > 0) {
    html += `<h3 class="stats-section-title">Recent Quizzes</h3>`;
    html += `<div class="stats-history">`;
    history.slice().reverse().slice(0, 10).forEach(h => {
      const date = new Date(h.date);
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      const cls = h.pct >= 80 ? 'history-good' : h.pct >= 60 ? 'history-ok' : 'history-low';
      const label = h.mode === 'troublesome' ? ' \u{1F3AF}' : '';
      html += `<div class="history-item ${cls}">
        <div class="history-date">${dateStr} <span class="history-time">${timeStr}${label}</span></div>
        <div class="history-score">${h.score}/${h.total}</div>
        <div class="history-pct">${h.pct}%</div>
      </div>`;
    });
    html += `</div>`;
  }

  el.innerHTML = html;

  const chartCanvas = document.getElementById('stats-chart');
  if (chartCanvas) {
    drawAccuracyChart(chartCanvas, history);
  }
}

let sentenceQuiz = null;

function buildSentenceQuestions(pool) {
  const shuffled = shuffle(pool).slice(0, Math.min(10, pool.length));
  return shuffled.map(s => {
    const distractors = shuffle(pool.filter(x => x !== s)).slice(0, 3);
    const options = shuffle([s, ...distractors]);
    return { mandarin: s.mandarin, pinyin: s.pinyin, correctTranslation: s.translation, options, answered: false, correct: false };
  });
}

export function startSentenceQuiz(stageId) {
  const pool = stageId ? allSentences.filter(s => s.stage === stageId) : allSentences;
  if (pool.length < 4) return false;
  const questions = buildSentenceQuestions(pool);
  sentenceQuiz = { questions, current: 0, stageId };
  state.quizMode = 'sentence';
  state.quiz = { questions, current: 0, answers: new Array(questions.length).fill(null), done: false };
  const overlay = document.getElementById('stage-quiz-overlay');
  const titleEl = document.getElementById('stage-quiz-title');
  const totalEl = document.getElementById('stage-q-total');
  titleEl.textContent = stageId ? `Stage ${stageId} Sentences` : 'All Sentences';
  totalEl.textContent = questions.length;
  overlay.classList.remove('hidden');
  document.getElementById('stage-results').classList.add('hidden');
  renderSentenceQuestion();
  return true;
}

function updateSentenceProgress() {
  const q = sentenceQuiz;
  document.getElementById('stage-progress-fill').style.width = ((q.current) / q.questions.length * 100) + '%';
  document.getElementById('stage-q-current').textContent = q.current + 1;
}

function renderSentenceQuestion() {
  const q = sentenceQuiz;
  if (!q || q.current >= q.questions.length) return;
  const question = q.questions[q.current];
  updateSentenceProgress();
  const container = document.getElementById('stage-question-container');
  container.innerHTML = `
    <div class="question-type-badge">Sentence Translation</div>
    <div class="sentence-quiz-mandarin">${escapeHtml(question.mandarin)}</div>
    <div class="sentence-quiz-pinyin">${escapeHtml(question.pinyin)}</div>
    <div class="prompt-text">Select the correct translation</div>
    <div class="options-grid">${question.options.map((opt, i) => `<button class="btn-option" data-index="${i}">${escapeHtml(opt.translation)}</button>`).join('')}</div>
  `;
  container.querySelectorAll('.btn-option').forEach(btn => {
    btn.addEventListener('click', () => handleSentenceAnswer(btn, question, container));
  });
}

function handleSentenceAnswer(btn, question, container) {
  if (question.answered) return;
  question.answered = true;
  const selectedIdx = parseInt(btn.dataset.index);
  const selected = question.options[selectedIdx];
  question.correct = selected.translation === question.correctTranslation;
  container.querySelectorAll('.btn-option').forEach(b => {
    b.disabled = true;
    const idx = parseInt(b.dataset.index);
    if (question.options[idx].translation === question.correctTranslation) b.classList.add('correct');
    else if (idx === selectedIdx && !question.correct) b.classList.add('wrong');
  });
  let fb = container.querySelector('.feedback');
  if (!fb) { fb = document.createElement('div'); fb.className = 'feedback'; container.appendChild(fb); }
  fb.className = 'feedback ' + (question.correct ? 'correct' : 'wrong');
  fb.innerHTML = question.correct ? '\u2713 Correct!' : `\u2717 The answer was: <strong>${escapeHtml(question.correctTranslation)}</strong>`;
  setTimeout(() => {
    sentenceQuiz.current++;
    if (sentenceQuiz.current >= sentenceQuiz.questions.length) {
      showSentenceQuizResults();
    } else {
      renderSentenceQuestion();
    }
  }, question.correct ? 900 : 1600);
}

function showSentenceQuizResults() {
  document.getElementById('stage-quiz-overlay').classList.add('hidden');
  const resultsEl = document.getElementById('stage-results');
  resultsEl.classList.remove('hidden');
  const q = sentenceQuiz;
  const total = q.questions.length;
  let score = 0;
  q.questions.forEach(qs => { if (qs.correct) score++; });
  const pct = Math.round((score / total) * 100);
  const passed = pct >= 70;
  document.getElementById('stage-results-title').textContent = passed ? '\u2713 Sentences \u2014 Passed!' : 'Sentences \u2014 Keep Practicing';
  document.getElementById('stage-results-summary').innerHTML = `
    <div class="score-circle" style="--pct:${pct}"><div class="score-text">${score}/${total}</div></div>
    <div class="results-stats">
      <div class="stat-box"><div class="stat-value">${pct}%</div><div class="stat-label">Score</div></div>
      <div class="stat-box"><div class="stat-value">${score}</div><div class="stat-label">Correct</div></div>
      <div class="stat-box"><div class="stat-value">${passed ? '70%' : '< 70%'}</div><div class="stat-label">Pass Threshold</div></div>
    </div>
  `;
  document.getElementById('stage-results-breakdown').innerHTML = q.questions.map(qs => {
    const cls = qs.correct ? 'correct' : 'wrong';
    const icon = qs.correct ? '\u2713' : '\u2717';
    return `<div class="breakdown-item ${cls}"><div class="bq-icon">${icon}</div><div class="bq-info"><div class="bq-answer">${escapeHtml(qs.mandarin)} \u2014 ${escapeHtml(qs.correctTranslation)}</div></div></div>`;
  }).join('');
  state.history.push({ date: Date.now(), score, total, pct, mode: 'sentence' });
  state.quizMode = 'daily';
  saveState();
}
