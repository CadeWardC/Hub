/* ============================================================
   attention.js — Attention & Control domain games
   Stroop, Flanker, Go/No-Go, Visual Search
   ============================================================ */
(function () {
  'use strict';
  const ui = BRAIN.ui;
  const el = ui.el;

  function median(arr) {
    if (!arr.length) return 0;
    const a = arr.slice().sort(function (x, y) { return x - y; });
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2);
  }
  // Reward accuracy, scaled by speed relative to a baseline RT.
  function speedScore(accuracy, medRT, baseRT) {
    if (!medRT) return Math.round(accuracy * 100);
    const mult = Math.max(0.4, Math.min(2, baseRT / medRT));
    return Math.round(accuracy * 100 * mult);
  }

  /* ---------------------------------------------------------
     STROOP — inhibitory control / selective attention
     --------------------------------------------------------- */
  BRAIN.register({
    id: 'stroop',
    name: 'Stroop',
    domain: 'attention',
    icon: '🎨',
    minLevel: 1, maxLevel: 10,
    scoreTarget: 180,
    blurb: 'Name the INK color, not the word. Resist reading the text when the two conflict.',
    science: {
      what: 'You respond to the ink color of a color-word. On incongruent trials (the word "RED" in blue ink) the automatic reading response competes with the correct answer.',
      why: 'The Stroop interference effect is the canonical measure of inhibitory control — the executive ability to suppress a prepotent, automatic response.',
      citation: 'Stroop (1935), J. Exp. Psychol.; MacLeod (1991) half-century review of Stroop interference.'
    },
    play: function (host, opts) {
      return new Promise(async function (resolve) {
        const level = opts.level;
        const trials = 24;
        const COLORS = [
          { name: 'red', hex: '#ef4444' }, { name: 'green', hex: '#22c55e' },
          { name: 'blue', hex: '#60a5fa' }, { name: 'yellow', hex: '#eab308' }
        ];
        const keyMap = { '1': 'red', '2': 'green', '3': 'blue', '4': 'yellow' };
        const incongRate = Math.min(0.4 + level * 0.05, 0.85);
        const deadline = Math.max(1700 - level * 110, 750);

        await ui.countdown(host, { label: 'Stroop' });
        const s = ui.stage(host, { prompt: 'Tap the INK color (keys 1–4)' });
        const word = el('div', { class: 'stroop-word' });
        const btns = el('div', { class: 'stroop-btns' });
        COLORS.forEach(function (c, i) {
          btns.appendChild(el('button', {
            class: 'g-btn stroop-key', 'data-resp': c.name,
            style: { background: c.hex }, text: (i + 1) + ' ' + c.name
          }));
        });
        s.area.appendChild(word); s.area.appendChild(btns);

        let correct = 0; const rts = [];
        for (let i = 0; i < trials; i++) {
          word.textContent = '+'; word.style.color = '#52525b'; await ui.sleep(350);
          const textColor = ui.pick(COLORS);
          let ink = textColor;
          if (Math.random() < incongRate) { do { ink = ui.pick(COLORS); } while (ink.name === textColor.name); }
          word.textContent = textColor.name.toUpperCase();
          word.style.color = ink.hex;
          s.setProgress(i / trials); s.setStatus('Trial ' + (i + 1) + ' / ' + trials);

          const r = await ui.awaitResponse(host, deadline, ['1', '2', '3', '4']);
          const choice = r.via === 'key' ? keyMap[r.key] : r.key;
          const ok = choice === ink.name;
          if (ok) { correct++; rts.push(r.rt); }
          word.textContent = '';
          await ui.feedback(s.area, ok, 220);
        }
        const accuracy = correct / trials, med = median(rts);
        resolve({
          score: speedScore(accuracy, med, 1000), accuracy: accuracy, level: level,
          metric: { label: 'Accuracy', value: Math.round(accuracy * 100) + '%' },
          detail: 'Median RT ' + (med || '—') + ' ms'
        });
      });
    }
  });

  /* ---------------------------------------------------------
     FLANKER — selective attention / conflict resolution
     --------------------------------------------------------- */
  BRAIN.register({
    id: 'flanker',
    name: 'Flanker',
    domain: 'attention',
    icon: '⇄',
    minLevel: 1, maxLevel: 10,
    scoreTarget: 190,
    blurb: 'Report the direction of the CENTER arrow while flanking arrows try to pull you the other way.',
    science: {
      what: 'Five arrows appear; you respond to the middle one. Flankers are congruent (» » » » ») or incongruent (» » « » »), creating response conflict.',
      why: 'The Eriksen flanker task isolates selective attention and the ability to filter distracting information — a core component of executive attention networks.',
      citation: 'Eriksen & Eriksen (1974), Perception & Psychophysics; Fan et al. (2002) Attention Network Test.'
    },
    play: function (host, opts) {
      return new Promise(async function (resolve) {
        const level = opts.level;
        const trials = 28;
        const incongRate = Math.min(0.45 + level * 0.04, 0.8);
        const deadline = Math.max(1500 - level * 100, 650);

        await ui.countdown(host, { label: 'Flanker' });
        const s = ui.stage(host, { prompt: 'Center arrow direction — ← or → (or tap)' });
        const row = el('div', { class: 'flanker-row' });
        const btns = el('div', { class: 'flanker-btns' }, [
          el('button', { class: 'g-btn', 'data-resp': 'left', text: '← Left' }),
          el('button', { class: 'g-btn', 'data-resp': 'right', text: 'Right →' })
        ]);
        s.area.appendChild(row); s.area.appendChild(btns);

        let correct = 0; const rts = [];
        for (let i = 0; i < trials; i++) {
          row.textContent = ''; await ui.sleep(300);
          const dir = Math.random() < 0.5 ? 'left' : 'right';
          const incong = Math.random() < incongRate;
          const center = dir === 'left' ? '◄' : '►';
          const flank = incong ? (dir === 'left' ? '►' : '◄') : center;
          row.textContent = flank + ' ' + flank + ' ' + center + ' ' + flank + ' ' + flank;
          row.classList.toggle('conflict', incong);
          s.setProgress(i / trials); s.setStatus('Trial ' + (i + 1) + ' / ' + trials);

          const r = await ui.awaitResponse(host, deadline, ['ArrowLeft', 'ArrowRight']);
          const choice = r.via === 'key' ? (r.key === 'ArrowLeft' ? 'left' : 'right') : r.key;
          const ok = choice === dir;
          if (ok) { correct++; rts.push(r.rt); }
          row.textContent = '';
          await ui.feedback(s.area, ok, 200);
        }
        const accuracy = correct / trials, med = median(rts);
        resolve({
          score: speedScore(accuracy, med, 850), accuracy: accuracy, level: level,
          metric: { label: 'Accuracy', value: Math.round(accuracy * 100) + '%' },
          detail: 'Median RT ' + (med || '—') + ' ms'
        });
      });
    }
  });

  /* ---------------------------------------------------------
     GO / NO-GO — response inhibition + sustained attention
     --------------------------------------------------------- */
  BRAIN.register({
    id: 'go-no-go',
    name: 'Go / No-Go',
    domain: 'attention',
    icon: '🚦',
    minLevel: 1, maxLevel: 10,
    scoreTarget: 170,
    blurb: 'Tap fast on GO signals, but freeze on the rarer STOP signal. Don’t let momentum carry you.',
    science: {
      what: 'A frequent "go" stimulus builds a habit of responding; an occasional "no-go" requires you to cancel that response in flight.',
      why: 'Commission errors (responding on no-go trials) are the standard index of response inhibition, central to impulse control and sustained attention.',
      citation: 'Aron (2007), The Neuroscience of Response Inhibition; Bezdjian et al. (2009) Go/No-Go reliability.'
    },
    play: function (host, opts) {
      return new Promise(async function (resolve) {
        const level = opts.level;
        const trials = 32;
        const noGoRate = Math.min(0.18 + level * 0.02, 0.35);
        const showMs = Math.max(900 - level * 55, 450);

        await ui.countdown(host, { label: 'Go / No-Go' });
        const s = ui.stage(host, { prompt: 'Tap on GREEN. Do NOTHING on RED.' });
        const sig = el('button', { class: 'gng-signal', 'data-resp': 'go' });
        s.area.appendChild(sig);

        let goCorrect = 0, goTotal = 0, nogoCorrect = 0, nogoTotal = 0, commission = 0;
        const rts = [];
        for (let i = 0; i < trials; i++) {
          sig.className = 'gng-signal'; sig.textContent = '';
          await ui.sleep(350 + ui.randInt(0, 250));
          const noGo = Math.random() < noGoRate;
          sig.classList.add(noGo ? 'stop' : 'go');
          sig.textContent = noGo ? 'STOP' : 'GO';
          s.setProgress(i / trials); s.setStatus('Trial ' + (i + 1) + ' / ' + trials);
          const r = await ui.awaitResponse(host, showMs, []);
          if (noGo) {
            nogoTotal++;
            if (!r.responded) nogoCorrect++; else commission++;
          } else {
            goTotal++;
            if (r.responded) { goCorrect++; rts.push(r.rt); }
          }
          const ok = noGo ? !r.responded : r.responded;
          sig.className = 'gng-signal';
          await ui.feedback(s.area, ok, 180);
        }
        const accuracy = (goCorrect + nogoCorrect) / trials, med = median(rts);
        resolve({
          score: speedScore(accuracy, med, 650), accuracy: accuracy, level: level,
          metric: { label: 'Accuracy', value: Math.round(accuracy * 100) + '%' },
          detail: commission + ' false starts · median RT ' + (med || '—') + ' ms'
        });
      });
    }
  });

  /* ---------------------------------------------------------
     VISUAL SEARCH — feature integration / attention
     --------------------------------------------------------- */
  BRAIN.register({
    id: 'visual-search',
    name: 'Visual Search',
    domain: 'attention',
    icon: '🔍',
    minLevel: 1, maxLevel: 10,
    scoreTarget: 210,
    blurb: 'Find the single target hiding among look-alike distractors. The set grows and gets trickier.',
    science: {
      what: 'A conjunction search: the target (e.g. a tilted teal bar) shares features with the distractors, so it cannot "pop out" — you must scan and bind features.',
      why: 'Conjunction search recruits serial, attention-demanding processing. Search slope vs. set size is a classic index of attentional efficiency.',
      citation: 'Treisman & Gelade (1980), Feature-Integration Theory of attention.'
    },
    play: function (host, opts) {
      return new Promise(async function (resolve) {
        const level = opts.level;
        const trials = 10;
        const setSize = Math.min(8 + level * 4, 48);
        const deadline = 6000;

        await ui.countdown(host, { label: 'Visual Search' });
        const s = ui.stage(host, { prompt: 'Tap the ⟋ teal bar as fast as you can' });
        const field = el('div', { class: 'vs-field' });
        s.area.appendChild(field);

        let found = 0; const rts = [];
        for (let i = 0; i < trials; i++) {
          ui.clear(field);
          s.setProgress(i / trials); s.setStatus('Trial ' + (i + 1) + ' / ' + trials);
          const targetIdx = ui.randInt(0, setSize - 1);
          const t0 = performance.now();
          const result = await new Promise(function (res) {
            let timer = setTimeout(function () { res({ hit: false, rt: deadline }); }, deadline);
            for (let k = 0; k < setSize; k++) {
              const isTarget = k === targetIdx;
              // distractors: teal vertical OR orange tilted; target: teal tilted (conjunction)
              const teal = isTarget ? true : Math.random() < 0.5;
              const tilted = isTarget ? true : !teal; // ensures no accidental teal+tilted distractor
              const item = el('div', {
                class: 'vs-item' + (teal ? ' teal' : ' orange'),
                style: {
                  left: ui.randInt(2, 92) + '%', top: ui.randInt(2, 88) + '%',
                  transform: 'rotate(' + (tilted ? 45 : 0) + 'deg)'
                }
              });
              if (isTarget) item.addEventListener('click', function () {
                clearTimeout(timer); res({ hit: true, rt: performance.now() - t0 });
              });
              else item.addEventListener('click', function () { ui.sfx.bad(); });
              field.appendChild(item);
            }
          });
          if (result.hit) { found++; rts.push(result.rt); }
          await ui.feedback(s.area, result.hit, 220);
        }
        const accuracy = found / trials, med = median(rts);
        resolve({
          score: speedScore(accuracy, med, 2200), accuracy: accuracy, level: level,
          metric: { label: 'Found', value: found + '/' + trials },
          detail: 'Set size ' + setSize + ' · median RT ' + (med || '—') + ' ms'
        });
      });
    }
  });
})();
