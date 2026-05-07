import { hasSpeechRecognition } from './utils.js';
import { state, loadState, saveState, loadWordStats } from './state.js';
import { releaseMic } from './audio.js';
import { initQuizDOM, startQuiz } from './quiz.js';
import { initStageQuizDOM, startStageQuiz } from './stage-quiz.js';
import { renderRoadmap, renderVocabPreview, loadSentences, renderSentenceReveal, initSentenceNav } from './roadmap.js';

function switchTab(name) {
  state.currentTab = name;
  document.querySelectorAll('#tab-nav button').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === name + '-tab'));
}

function init() {
  loadState();
  loadWordStats();
  initQuizDOM();
  initStageQuizDOM();
  initSentenceNav();
  loadSentences().then(() => renderSentenceReveal());
  renderVocabPreview();
  renderRoadmap();

  document.querySelectorAll('#tab-nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
      if (btn.dataset.tab === 'roadmap') renderRoadmap();
      if (btn.dataset.tab === 'vocab') { renderVocabPreview(); renderSentenceReveal(); }
    });
  });

  document.getElementById('start-quiz').addEventListener('click', startQuiz);
  document.getElementById('retake-quiz').addEventListener('click', startQuiz);
  document.getElementById('back-settings').addEventListener('click', () => {
    releaseMic();
    document.getElementById('daily-results').classList.add('hidden');
    document.getElementById('daily-quiz').classList.add('hidden');
    document.getElementById('daily-settings').classList.remove('hidden');
  });

  const retakeStageQuizBtn = document.getElementById('retake-stage-quiz');
  const backToRoadmapBtn = document.getElementById('back-to-roadmap');
  if (retakeStageQuizBtn) {
    retakeStageQuizBtn.addEventListener('click', () => {
      document.getElementById('stage-results').classList.add('hidden');
      startStageQuiz(state.quizStageId, state.quizSubIndex);
    });
  }
  if (backToRoadmapBtn) {
    backToRoadmapBtn.addEventListener('click', () => {
      releaseMic();
      document.getElementById('stage-results').classList.add('hidden');
      document.getElementById('stage-quiz-overlay').classList.add('hidden');
      renderRoadmap();
    });
  }

  ['setting-listen', 'setting-speak'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('change', () => {
      state.settings = {
        ...state.settings,
        listen: document.getElementById('setting-listen').checked,
        speak: document.getElementById('setting-speak').checked
      };
      saveState();
    });
  });

  if (!hasSpeechRecognition()) {
    const speakEl = document.getElementById('setting-speak');
    speakEl.disabled = true;
    speakEl.checked = false;
    speakEl.closest('.toggle-row').querySelector('small').textContent += ' (not supported in this browser)';
  }

  document.getElementById('setting-listen').checked = state.settings.listen;
  document.getElementById('setting-speak').checked = state.settings.speak;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
