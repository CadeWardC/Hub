import { ROADMAP, VOCAB } from './data.js';

export const state = {
  currentTab: 'daily',
  quiz: null,
  quizMode: 'daily',
  quizStageId: null,
  quizSubIndex: null,
  settings: { pinyin: true, chars: true, listen: true, speak: true },
  history: [],
  roadmapProgress: {
    currentStage: 1,
    completedStages: [],
    completedSubTopics: {},
    quizScores: {}
  }
};

export function loadState() {
  try {
    const raw = localStorage.getItem('mandarinState');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.settings) state.settings = { ...state.settings, ...parsed.settings };
      if (parsed.history) state.history = parsed.history;
      if (parsed.roadmapProgress) {
        state.roadmapProgress = {
          ...state.roadmapProgress,
          ...parsed.roadmapProgress,
          completedSubTopics: parsed.roadmapProgress.completedSubTopics || {},
          quizScores: parsed.roadmapProgress.quizScores || {}
        };
        state.roadmapProgress.completedStages.forEach(stageId => {
          const stage = ROADMAP.find(s => s.id === stageId);
          if (stage) stage.subTopics.forEach(st => { st.quizPassed = true; st.bestScore = 100; });
        });
        Object.entries(state.roadmapProgress.quizScores).forEach(([key, score]) => {
          const [stageId, subIndex] = key.split(':').map(Number);
          const stage = ROADMAP.find(s => s.id === stageId);
          if (stage && stage.subTopics[subIndex]) {
            stage.subTopics[subIndex].bestScore = score;
            if (score >= 70) stage.subTopics[subIndex].quizPassed = true;
          }
        });
      }
    }
  } catch (e) {}
}

export function saveState() {
  localStorage.setItem('mandarinState', JSON.stringify({
    settings: state.settings,
    history: state.history.slice(-20),
    roadmapProgress: state.roadmapProgress
  }));
}

export function getLearnedVocab() {
  const maxStage = state.roadmapProgress.currentStage;
  return VOCAB.filter(v => v.stage <= maxStage);
}

export function getVocabForStageSub(stageId, subIndex) {
  return VOCAB.filter(v => v.stage === stageId && v.sub === subIndex);
}

export function getVocabForStage(stageId) {
  return VOCAB.filter(v => v.stage === stageId);
}
