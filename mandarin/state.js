import { ROADMAP } from './data.js';
import { VOCAB } from './vocab.js';

export let wordStats = {};

export function loadWordStats() {
  try {
    const raw = localStorage.getItem('mandarinWordStats');
    if (raw) wordStats = JSON.parse(raw);
  } catch (e) {}
}

export function saveWordStats() {
  localStorage.setItem('mandarinWordStats', JSON.stringify(wordStats));
}

export function recordWordResult(wordId, isCorrect) {
  if (!wordStats[wordId]) wordStats[wordId] = { wrong: 0, right: 0, streak: 0 };
  const s = wordStats[wordId];
  if (isCorrect) {
    s.right++;
    s.streak++;
  } else {
    s.wrong++;
    s.streak = 0;
  }
}

export function getCompletedSubVocab() {
  const completed = state.roadmapProgress.completedSubTopics;
  const keys = Object.keys(completed);
  if (keys.length === 0) {
    return VOCAB.filter(v => v.stage === 1 && v.sub === 0);
  }
  const words = [];
  keys.forEach(stageId => {
    const subs = completed[stageId];
    subs.forEach(subIndex => {
      words.push(...VOCAB.filter(v => v.stage === parseInt(stageId) && v.sub === subIndex));
    });
  });
  return words;
}

export function getTroublesomeVocab() {
  return VOCAB.filter(v => {
    const s = wordStats[v.id];
    if (!s) return false;
    return s.wrong >= 2 || (s.wrong > 0 && s.streak <= 1);
  });
}

export const state = {
  currentTab: 'daily',
  quiz: null,
  quizMode: 'daily',
  quizStageId: null,
  quizSubIndex: null,
  settings: { pinyin: false, chars: true, listen: true, speak: true },
  history: [],
  lastQuizDate: null,
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
      if (parsed.lastQuizDate) state.lastQuizDate = parsed.lastQuizDate;
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
    history: state.history.slice(-100),
    roadmapProgress: state.roadmapProgress,
    lastQuizDate: state.lastQuizDate
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
