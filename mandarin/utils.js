import { VOCAB } from './vocab.js';

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickDistractors(word, count) {
  const others = VOCAB.filter(v => v.id !== word.id);
  return shuffle(others).slice(0, count);
}

export function pickDistractorsFromPool(word, count, pool) {
  const others = pool.filter(v => v.id !== word.id);
  return shuffle(others).slice(0, count);
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function formatType(type) {
  const map = { 'mc-char': 'Recognize Character', 'mc-listen': 'Listen', 'write': 'Writing', 'speak': 'Speaking' };
  return map[type] || type;
}

export function toneNumberName(n) {
  const names = ['Neutral', '1st (High)', '2nd (Rising)', '3rd (Dipping)', '4th (Falling)'];
  return names[n] || 'Unknown';
}

export function hasSpeechRecognition() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

const TONE_MAP = {
  '\u0101':'a1','\u00E1':'a2','\u01CE':'a3','\u00E0':'a4',
  '\u0113':'e1','\u00E9':'e2','\u011B':'e3','\u00E8':'e4',
  '\u012B':'i1','\u00ED':'i2','\u01D0':'i3','\u00EC':'i4',
  '\u014D':'o1','\u00F3':'o2','\u01D2':'o3','\u00F2':'o4',
  '\u016B':'u1','\u00FA':'u2','\u01D4':'u3','\u00F9':'u4',
  '\u01D6':'v1','\u01D8':'v2','\u01DA':'v3','\u01DC':'v4',
  '\u00FC':'v'
};

const TONED_VOWELS = {
  'a': '\u0101\u00E1\u01CE\u00E0', 'e': '\u0113\u00E9\u011B\u00E8', 'i': '\u012B\u00ED\u01D0\u00EC',
  'o': '\u014D\u00F3\u01D2\u00F2', 'u': '\u016B\u00FA\u01D4\u00F9', '\u00FC': '\u01D6\u01D8\u01DA\u01DC'
};

export function convertNumberedPinyin(str) {
  return str.replace(/([aeiouv]+)(ng?|r)?(\d)/gi, (match, vowels, ending, tone) => {
    const t = parseInt(tone);
    if (t < 1 || t > 4) return match;
    let v = vowels.toLowerCase().replace(/v/g, '\u00FC');
    let target;
    if (v.includes('a')) target = 'a';
    else if (v.includes('o') || v.includes('e')) target = v.includes('o') ? 'o' : 'e';
    else target = v.length > 1 ? v[v.length - 1] : v[0];
    const toned = TONED_VOWELS[target];
    if (!toned) return match;
    return v.split(target).join(toned[t - 1]) + (ending || '');
  });
}

export function normalizePinyin(str) {
  let out = str.toLowerCase().trim();
  for (const [k, v] of Object.entries(TONE_MAP)) {
    out = out.split(k).join(v);
  }
  out = out.replace(/\u00FC/g, 'v');
  out = out.replace(/[^a-z0-9]/g, '');
  return out;
}
