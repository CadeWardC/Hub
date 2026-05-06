import { ROADMAP, VOCAB } from './data.js';
import { SENTENCES } from './sentences.js';
import { escapeHtml } from './utils.js';
import { state, getVocabForStageSub } from './state.js';
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
  const learned = VOCAB.filter(v => v.stage <= state.roadmapProgress.currentStage);
  el.innerHTML = learned.slice(0, 12).map(v => `
    <div class="vocab-chip"><div class="vc-char">${escapeHtml(v.char)}</div><div class="vc-pinyin">${escapeHtml(v.pinyin)} \u2014 ${escapeHtml(v.meaning)}</div></div>
  `).join('');
}
