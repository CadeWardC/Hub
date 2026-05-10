import { hasSpeechRecognition } from './utils.js';
import { state, loadState, saveState, loadWordStats, getTroublesomeVocab } from './state.js';
import { releaseMic, unlockAudio } from './audio.js';
import { initQuizDOM, startQuiz, startTroublesomeDrill } from './quiz.js';
import { initStageQuizDOM, startStageQuiz, closeStageQuiz } from './stage-quiz.js';
import { renderRoadmap, renderVocabPreview, loadSentences, renderSentenceReveal, initSentenceNav, renderStatsDashboard, startSentenceQuiz } from './roadmap.js';

function switchTab(name) {
  state.currentTab = name;
  document.querySelectorAll('#tab-nav button').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === name + '-tab'));
}

function init() {
  loadState();
  loadWordStats();

  document.addEventListener('click', function unlock() {
    unlockAudio();
    document.removeEventListener('click', unlock);
  }, { once: true });

  initQuizDOM();
  initStageQuizDOM();
  initSentenceNav();
  loadSentences().then(() => renderSentenceReveal());
  renderVocabPreview();
  renderRoadmap();

  const stageFilter = document.getElementById('sentence-stage-filter');
  if (stageFilter) {
    stageFilter.addEventListener('change', () => {
      const val = stageFilter.value;
      renderSentenceReveal(val ? parseInt(val) : null, null);
    });
  }

  const sentenceQuizBtn = document.getElementById('sentence-quiz-btn');
  if (sentenceQuizBtn) {
    sentenceQuizBtn.addEventListener('click', () => {
      const filterVal = stageFilter ? stageFilter.value : '';
      const ok = startSentenceQuiz(filterVal ? parseInt(filterVal) : null);
      if (!ok) alert('Need at least 4 sentences to start a quiz.');
    });
  }

  document.querySelectorAll('#tab-nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
      if (btn.dataset.tab === 'roadmap') renderRoadmap();
      if (btn.dataset.tab === 'vocab') { renderVocabPreview(); renderSentenceReveal(); renderStatsDashboard(); }
    });
  });

  document.getElementById('start-quiz').addEventListener('click', startQuiz);
  document.getElementById('retake-quiz').addEventListener('click', startQuiz);

  const drillBtn = document.getElementById('start-drill');
  if (drillBtn) {
    drillBtn.addEventListener('click', () => {
      const ok = startTroublesomeDrill();
      if (!ok) alert('No troublesome words yet! Keep practicing.');
    });
    const troubleWords = getTroublesomeVocab();
    const drillCount = document.getElementById('drill-count');
    if (drillCount) {
      drillCount.textContent = troubleWords.length > 0
        ? `${troubleWords.length} word${troubleWords.length !== 1 ? 's' : ''} to review`
        : 'No troublesome words \u2014 you\u2019re doing great!';
    }
    if (troubleWords.length === 0) drillBtn.disabled = true;
  }

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
    backToRoadmapBtn.addEventListener('click', closeStageQuiz);
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

  const vocabSearch = document.getElementById('vocab-search');
  if (vocabSearch) {
    vocabSearch.addEventListener('input', () => renderVocabPreview());
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
