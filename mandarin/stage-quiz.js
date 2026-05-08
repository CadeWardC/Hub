import { ROADMAP } from './data.js';
import { escapeHtml, formatType } from './utils.js';
import { state, saveState } from './state.js';
import { releaseMic } from './audio.js';
import { renderInto, generateStageQuestions, setStageQuizHandlers } from './quiz.js';
import { renderRoadmap } from './roadmap.js';

let stageQuizOverlay, stageResultsView, stageQContainer, stageProgressFill, stageQCurrent, stageQTotal, stageQuizTitle;

export function closeStageQuiz() {
  releaseMic();
  stageQuizOverlay.classList.add('hidden');
  stageResultsView.classList.add('hidden');
  renderRoadmap();
}

export function initStageQuizDOM() {
  stageQuizOverlay = document.getElementById('stage-quiz-overlay');
  stageResultsView = document.getElementById('stage-results');
  stageQContainer = document.getElementById('stage-question-container');
  stageProgressFill = document.getElementById('stage-progress-fill');
  stageQCurrent = document.getElementById('stage-q-current');
  stageQTotal = document.getElementById('stage-q-total');
  stageQuizTitle = document.getElementById('stage-quiz-title');

  const closeBtn = document.getElementById('stage-quiz-close');
  if (closeBtn) closeBtn.addEventListener('click', closeStageQuiz);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !stageQuizOverlay.classList.contains('hidden')) {
      closeStageQuiz();
    }
  });
}

export function startStageQuiz(stageId, subIndex) {
  state.quizMode = subIndex !== null && subIndex !== undefined ? 'subtopic' : 'stage';
  state.quizStageId = stageId;
  state.quizSubIndex = subIndex;
  const questions = generateStageQuestions(stageId, subIndex);
  state.quiz = { questions, current: 0, answers: new Array(questions.length).fill(null), done: false };
  const stage = ROADMAP.find(s => s.id === stageId);
  const subName = (subIndex !== null && subIndex !== undefined && stage) ? stage.subTopics[subIndex].name : stage ? stage.title : '';
  stageQuizTitle.textContent = subName;
  stageQuizOverlay.classList.remove('hidden');
  stageResultsView.classList.add('hidden');
  stageQTotal.textContent = questions.length;
  setStageQuizHandlers(renderStageQuestion, showStageResults);
  renderStageQuestion();
}

function updateStageProgress() {
  const q = state.quiz;
  stageProgressFill.style.width = ((q.current) / q.questions.length * 100) + '%';
  stageQCurrent.textContent = q.current + 1;
}

export function renderStageQuestion() {
  const q = state.quiz;
  const question = q.questions[q.current];
  updateStageProgress();
  renderInto(stageQContainer, question, updateStageProgress);
}

export function showStageResults() {
  stageQuizOverlay.classList.add('hidden');
  stageResultsView.classList.remove('hidden');
  const q = state.quiz;
  const total = q.questions.length;
  let score = 0, partial = 0;
  q.questions.forEach(qs => { if (qs.correct === true) score++; else if (qs.correct === 'partial') partial++; });
  const pct = Math.round(((score + partial * 0.5) / total) * 100);
  const stage = ROADMAP.find(s => s.id === state.quizStageId);
  const passed = pct >= 70;

  document.getElementById('stage-results-title').textContent = passed ? `\u2713 ${stage ? stage.title : 'Stage'} \u2014 Passed!` : `${stage ? stage.title : 'Stage'} \u2014 Keep Practicing`;
  document.getElementById('stage-results-summary').innerHTML = `
    <div class="score-circle" style="--pct:${pct}"><div class="score-text">${score + partial}/${total}</div></div>
    <div class="results-stats">
      <div class="stat-box"><div class="stat-value">${pct}%</div><div class="stat-label">Score</div></div>
      <div class="stat-box"><div class="stat-value">${score}</div><div class="stat-label">Correct</div></div>
      <div class="stat-box"><div class="stat-value">${passed ? '70%' : '< 70%'}</div><div class="stat-label">Pass Threshold</div></div>
    </div>
  `;
  document.getElementById('stage-results-breakdown').innerHTML = q.questions.map(qs => {
    const cls = qs.correct === true ? 'correct' : (qs.correct === 'partial' ? 'partial' : 'wrong');
    const icon = qs.correct === true ? '\u2713' : (qs.correct === 'partial' ? '~' : '\u2717');
    return `<div class="breakdown-item ${cls}"><div class="bq-icon">${icon}</div><div class="bq-info"><strong>${formatType(qs.type)}</strong><div class="bq-answer">${escapeHtml(qs.word.char)} \u2014 ${escapeHtml(qs.word.meaning)}</div></div></div>`;
  }).join('');

  if (stage) {
    const key = state.quizSubIndex !== null && state.quizSubIndex !== undefined ? `${state.quizStageId}:${state.quizSubIndex}` : `${state.quizStageId}:full`;
    const currentBest = state.roadmapProgress.quizScores[key] || 0;
    if (pct > currentBest) state.roadmapProgress.quizScores[key] = pct;

    if (state.quizMode === 'subtopic' && passed) {
      stage.subTopics[state.quizSubIndex].quizPassed = true;
      stage.subTopics[state.quizSubIndex].bestScore = Math.max(pct, stage.subTopics[state.quizSubIndex].bestScore || 0);
      if (!state.roadmapProgress.completedSubTopics[state.quizStageId]) state.roadmapProgress.completedSubTopics[state.quizStageId] = [];
      if (!state.roadmapProgress.completedSubTopics[state.quizStageId].includes(state.quizSubIndex)) state.roadmapProgress.completedSubTopics[state.quizStageId].push(state.quizSubIndex);
      const allPassed = stage.subTopics.every(st => st.quizPassed);
      if (allPassed) {
        if (!state.roadmapProgress.completedStages.includes(state.quizStageId)) state.roadmapProgress.completedStages.push(state.quizStageId);
        if (state.quizStageId === state.roadmapProgress.currentStage && state.quizStageId < ROADMAP.length) state.roadmapProgress.currentStage = state.quizStageId + 1;
      }
    } else if (state.quizMode === 'stage' && passed) {
      stage.subTopics.forEach((st, i) => {
        st.quizPassed = true; st.bestScore = Math.max(pct, st.bestScore || 0);
        if (!state.roadmapProgress.completedSubTopics[state.quizStageId]) state.roadmapProgress.completedSubTopics[state.quizStageId] = [];
        if (!state.roadmapProgress.completedSubTopics[state.quizStageId].includes(i)) state.roadmapProgress.completedSubTopics[state.quizStageId].push(i);
      });
      if (!state.roadmapProgress.completedStages.includes(state.quizStageId)) state.roadmapProgress.completedStages.push(state.quizStageId);
      if (state.quizStageId === state.roadmapProgress.currentStage && state.quizStageId < ROADMAP.length) state.roadmapProgress.currentStage = state.quizStageId + 1;
    }
    saveState();
  }
}
