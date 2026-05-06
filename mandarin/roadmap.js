import { ROADMAP, VOCAB } from './data.js';
import { escapeHtml } from './utils.js';
import { state, getVocabForStageSub } from './state.js';
import { say } from './audio.js';
import { startStageQuiz } from './stage-quiz.js';

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
  listEl.innerHTML = words.map(w => `
    <div class="vocab-list-item">
      <button class="vocab-play-btn" data-char="${escapeHtml(w.char)}" title="Play audio">\u25B6</button>
      <div class="vocab-list-char">${escapeHtml(w.char)}</div>
      <div class="vocab-list-details"><div class="vocab-list-pinyin">${escapeHtml(w.pinyin)}</div><div class="vocab-list-meaning">${escapeHtml(w.meaning)}</div></div>
    </div>
  `).join('');
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
