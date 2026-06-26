/* ============================================================
   working-memory.js — Working Memory domain games
   Dual N-Back, Single N-Back, Digit Span, Corsi Block-Tapping
   ============================================================ */
(function () {
  'use strict';
  const ui = BRAIN.ui;
  const el = ui.el;

  /* ---------------------------------------------------------
     DUAL N-BACK  (flagship)
     Jaeggi, Buschkuehl, Jonides & Perrig (2008), PNAS 105(19):
     training on dual n-back transferred to fluid intelligence.
     --------------------------------------------------------- */
  BRAIN.register({
    id: 'dual-n-back',
    name: 'Dual N-Back',
    domain: 'memory',
    icon: '◳',
    minLevel: 1, maxLevel: 9,
    scoreTarget: 320,
    blurb: 'Track a moving square and a stream of spoken letters at once. Flag when either repeats N steps back.',
    science: {
      what: 'The most heavily studied working-memory training task. You hold two independent streams (spatial + verbal) in mind and compare each to what occurred N steps earlier.',
      why: 'Continuously updating and monitoring two streams loads the central executive — the capacity most associated with fluid reasoning. Difficulty scales by increasing N.',
      citation: 'Jaeggi, Buschkuehl, Jonides & Perrig (2008). Improving fluid intelligence with training on working memory. PNAS, 105(19), 6829–6833.'
    },
    play: function (host, opts) {
      return new Promise(async function (resolve) {
        const N = opts.level;
        const trials = 20 + N * 2;
        const matchRate = 0.28;
        const SOA = 2900, STIM = 600;
        const LETTERS = ['C', 'H', 'K', 'L', 'Q', 'R', 'S', 'T'];

        const positions = [], letters = [];
        for (let i = 0; i < trials; i++) {
          const can = i >= N;
          if (can && Math.random() < matchRate) positions[i] = positions[i - N];
          else { let p; do { p = ui.randInt(0, 8); } while (can && p === positions[i - N]); positions[i] = p; }
          if (can && Math.random() < matchRate) letters[i] = letters[i - N];
          else { let l; do { l = ui.pick(LETTERS); } while (can && l === letters[i - N]); letters[i] = l; }
        }

        const s = ui.stage(host, { prompt: 'Position match: A  ·  Audio match: L' });
        const grid = el('div', { class: 'nb-grid' });
        const cells = [];
        for (let i = 0; i < 9; i++) { const c = el('div', { class: 'nb-cell' }); cells.push(c); grid.appendChild(c); }
        const letterCue = el('div', { class: 'nb-letter' });
        const controls = el('div', { class: 'nb-controls' }, [
          el('button', { class: 'g-btn nb-btn', 'data-resp': 'pos', text: 'Position (A)' }),
          el('button', { class: 'g-btn nb-btn', 'data-resp': 'aud', text: 'Audio (L)' })
        ]);
        s.area.appendChild(grid);
        s.area.appendChild(letterCue);
        s.area.appendChild(controls);

        const resp = { pos: false, aud: false };
        let cur = -1, scored = 0, posCorrect = 0, audCorrect = 0, hits = 0, totalMatches = 0;
        function flag(kind) {
          if (cur < N) return;
          resp[kind] = true;
          const b = controls.querySelector('[data-resp="' + kind + '"]');
          if (b) b.classList.add('armed');
        }
        function onKey(e) {
          const k = e.key.toLowerCase();
          if (k === 'a') { e.preventDefault(); flag('pos'); }
          else if (k === 'l') { e.preventDefault(); flag('aud'); }
        }
        function onPointer(e) {
          const b = e.target.closest('[data-resp]');
          if (b) flag(b.dataset.resp);
        }
        document.addEventListener('keydown', onKey, true);
        controls.addEventListener('pointerdown', onPointer, true);

        await ui.countdown(host, { label: N + '-Back' });
        // countdown cleared host; rebuild stage
        const s2 = ui.stage(host, { prompt: 'Position match: A  ·  Audio match: L' });
        s2.area.appendChild(grid); s2.area.appendChild(letterCue); s2.area.appendChild(controls);

        ui.speech.warmUp();

        for (let i = 0; i < trials; i++) {
          cur = i; resp.pos = false; resp.aud = false;
          controls.querySelectorAll('.nb-btn').forEach(function (b) { b.classList.remove('armed'); });
          cells[positions[i]].classList.add('active');
          letterCue.textContent = ui.speech.supported && BRAIN.store.settings.speech ? '♪' : letters[i];
          ui.speech.say(letters[i]);
          s2.setProgress(i / trials);
          s2.setStatus('Trial ' + (i + 1) + ' / ' + trials);
          await ui.sleep(STIM);
          cells[positions[i]].classList.remove('active');
          letterCue.textContent = '';
          await ui.sleep(SOA - STIM);

          if (i >= N) {
            const pm = positions[i] === positions[i - N];
            const lm = letters[i] === letters[i - N];
            scored += 2;
            if (pm === resp.pos) posCorrect++;
            if (lm === resp.aud) audCorrect++;
            if (pm) { totalMatches++; if (resp.pos) hits++; }
            if (lm) { totalMatches++; if (resp.aud) hits++; }
          }
        }

        document.removeEventListener('keydown', onKey, true);
        controls.removeEventListener('pointerdown', onPointer, true);
        const accuracy = scored ? (posCorrect + audCorrect) / scored : 0;
        const score = Math.round(accuracy * 100 * (1 + (N - 1) * 0.6));
        resolve({
          score: score, accuracy: accuracy, level: N,
          metric: { label: N + '-back accuracy', value: Math.round(accuracy * 100) + '%' },
          detail: 'Matches caught: ' + hits + '/' + totalMatches
        });
      });
    }
  });

  /* ---------------------------------------------------------
     SINGLE N-BACK (visual position only) — gentler on-ramp
     --------------------------------------------------------- */
  BRAIN.register({
    id: 'n-back',
    name: 'Position N-Back',
    domain: 'memory',
    icon: '⊞',
    minLevel: 1, maxLevel: 8,
    scoreTarget: 220,
    blurb: 'A square jumps around a grid. Hit Match when its position repeats from N steps ago.',
    science: {
      what: 'A single-stream n-back. You continuously update a memory of recent locations and compare the current one to N positions back.',
      why: 'Isolates the updating component of working memory without the dual load — a clean training target and a common neuroimaging probe of the fronto-parietal network.',
      citation: 'Kane & Engle (2002); Owen et al. (2005) meta-analysis of the n-back working-memory paradigm.'
    },
    play: function (host, opts) {
      return new Promise(async function (resolve) {
        const N = opts.level;
        const trials = 18 + N * 2;
        const SOA = 2400, STIM = 600, matchRate = 0.3;
        const positions = [];
        for (let i = 0; i < trials; i++) {
          const can = i >= N;
          if (can && Math.random() < matchRate) positions[i] = positions[i - N];
          else { let p; do { p = ui.randInt(0, 8); } while (can && p === positions[i - N]); positions[i] = p; }
        }
        await ui.countdown(host, { label: N + '-Back' });
        const s = ui.stage(host, { prompt: 'Press Match (or Space) when the square repeats from ' + N + ' back' });
        const grid = el('div', { class: 'nb-grid' });
        const cells = [];
        for (let i = 0; i < 9; i++) { const c = el('div', { class: 'nb-cell' }); cells.push(c); grid.appendChild(c); }
        const btn = el('button', { class: 'g-btn nb-btn wide', 'data-resp': 'm', text: 'Match (Space)' });
        s.area.appendChild(grid);
        s.area.appendChild(el('div', { class: 'nb-controls' }, [btn]));

        let cur = -1, pressed = false, scored = 0, correct = 0, hits = 0, totalM = 0;
        function flag() { if (cur < N) return; pressed = true; btn.classList.add('armed'); }
        function onKey(e) { if (e.key === ' ' || e.key.toLowerCase() === 'm') { e.preventDefault(); flag(); } }
        document.addEventListener('keydown', onKey, true);
        btn.addEventListener('pointerdown', function (e) { e.preventDefault(); flag(); }, true);

        for (let i = 0; i < trials; i++) {
          cur = i; pressed = false; btn.classList.remove('armed');
          cells[positions[i]].classList.add('active');
          s.setProgress(i / trials); s.setStatus('Trial ' + (i + 1) + ' / ' + trials);
          await ui.sleep(STIM);
          cells[positions[i]].classList.remove('active');
          await ui.sleep(SOA - STIM);
          if (i >= N) {
            const m = positions[i] === positions[i - N];
            scored++; if (m === pressed) correct++;
            if (m) { totalM++; if (pressed) hits++; }
          }
        }
        document.removeEventListener('keydown', onKey, true);
        const accuracy = scored ? correct / scored : 0;
        resolve({
          score: Math.round(accuracy * 100 * (1 + (N - 1) * 0.5)), accuracy: accuracy, level: N,
          metric: { label: 'Accuracy', value: Math.round(accuracy * 100) + '%' },
          detail: 'Matches caught: ' + hits + '/' + totalM
        });
      });
    }
  });

  /* ---------------------------------------------------------
     DIGIT SPAN (forward, then backward at higher levels)
     --------------------------------------------------------- */
  BRAIN.register({
    id: 'digit-span',
    name: 'Digit Span',
    domain: 'memory',
    icon: '🔢',
    minLevel: 1, maxLevel: 10,
    scoreTarget: 260,
    blurb: 'Memorize a string of digits shown one at a time, then type it back. Reverse order at higher levels.',
    science: {
      what: 'A classic span task from the Wechsler scales. Span length grows with level; from level 5 you must reproduce the sequence in reverse.',
      why: 'Forward span indexes short-term storage capacity; backward span adds an executive manipulation load. Both are core clinical measures of verbal working memory.',
      citation: 'Wechsler Adult Intelligence Scale; Baddeley (1992) working-memory model.'
    },
    play: function (host, opts) {
      return new Promise(async function (resolve) {
        const level = opts.level;
        const span = level + 2;
        const backward = level >= 5;
        const trialsN = 3;
        let totalDigits = 0, correctDigits = 0, perfectTrials = 0;

        await ui.countdown(host, { label: backward ? 'Reverse Span' : 'Digit Span' });

        for (let t = 0; t < trialsN; t++) {
          const seq = [];
          for (let i = 0; i < span; i++) seq.push(ui.randInt(0, 9));
          const s = ui.stage(host, { prompt: (backward ? 'Reverse order · ' : '') + 'Watch ' + span + ' digits' });
          const display = el('div', { class: 'ds-display' });
          s.area.appendChild(display);
          for (let i = 0; i < seq.length; i++) {
            s.setProgress(i / seq.length); s.setStatus('Trial ' + (t + 1) + ' / ' + trialsN);
            display.textContent = seq[i];
            display.classList.remove('pop'); void display.offsetWidth; display.classList.add('pop');
            ui.sfx.blip();
            await ui.sleep(750);
            display.textContent = '';
            await ui.sleep(250);
          }
          // recall
          const answer = await collectDigits(host, span, backward);
          const target = backward ? seq.slice().reverse() : seq.slice();
          for (let i = 0; i < target.length; i++) {
            totalDigits++;
            if (answer[i] === target[i]) correctDigits++;
          }
          const perfect = answer.length === target.length && target.every(function (d, i) { return d === answer[i]; });
          if (perfect) perfectTrials++;
          await ui.feedback(host, perfect, 450);
        }

        const accuracy = totalDigits ? correctDigits / totalDigits : 0;
        resolve({
          score: Math.round(accuracy * 100 * (span / 3)), accuracy: accuracy, level: level,
          metric: { label: 'Span', value: span + (backward ? ' (reverse)' : '') },
          detail: perfectTrials + '/' + trialsN + ' sequences perfect'
        });
      });
    }
  });

  function collectDigits(host, span, backward) {
    return new Promise(function (resolve) {
      const s = ui.stage(host, { prompt: backward ? 'Type the digits in REVERSE order' : 'Type the digits in order' });
      const entry = el('div', { class: 'ds-entry' });
      const pad = el('div', { class: 'ds-pad' });
      const buf = [];
      function render() { entry.textContent = buf.join(' ') || '—'; }
      render();
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].forEach(function (label) {
        const b = el('button', { class: 'g-btn ds-key', text: label });
        b.addEventListener('click', function () {
          if (label === '⌫') buf.pop();
          else if (label === '✓') { finish(); return; }
          else if (buf.length < span) buf.push(parseInt(label, 10));
          render();
          if (buf.length === span) finish();
        });
        pad.appendChild(b);
      });
      function onKey(e) {
        if (e.key >= '0' && e.key <= '9' && buf.length < span) { buf.push(parseInt(e.key, 10)); render(); if (buf.length === span) finish(); }
        else if (e.key === 'Backspace') { buf.pop(); render(); }
        else if (e.key === 'Enter') finish();
      }
      function finish() {
        document.removeEventListener('keydown', onKey, true);
        resolve(buf);
      }
      document.addEventListener('keydown', onKey, true);
      s.area.appendChild(entry);
      s.area.appendChild(pad);
    });
  }

  /* ---------------------------------------------------------
     CORSI BLOCK-TAPPING — visuospatial span
     --------------------------------------------------------- */
  BRAIN.register({
    id: 'corsi',
    name: 'Corsi Blocks',
    domain: 'memory',
    icon: '⬚',
    minLevel: 1, maxLevel: 9,
    scoreTarget: 240,
    blurb: 'Blocks light up in a sequence. Reproduce the path by tapping them in the same order.',
    science: {
      what: 'The visuospatial analogue of digit span. A set of blocks flashes in sequence and you tap them back in order; sequence length scales with level.',
      why: 'Measures the capacity of the visuospatial sketchpad — spatial working memory that is partly dissociable from verbal span and sensitive to aging and injury.',
      citation: 'Corsi (1972); Kessels, van Zandvoort, Postma et al. (2000), validation of the Corsi Block-Tapping Task.'
    },
    play: function (host, opts) {
      return new Promise(async function (resolve) {
        const level = opts.level;
        const seqLen = level + 1;
        const trialsN = 3;
        // Scatter 9 blocks in a loose grid with jitter for the classic look.
        const blocks = [];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
          blocks.push({ x: c * 33 + 8 + ui.randInt(-3, 3), y: r * 33 + 8 + ui.randInt(-3, 3) });
        }
        let totalSteps = 0, correctSteps = 0, perfect = 0;

        await ui.countdown(host, { label: 'Corsi' });

        for (let t = 0; t < trialsN; t++) {
          const seq = ui.sample(blocks.map(function (_, i) { return i; }), seqLen);
          const s = ui.stage(host, { prompt: 'Watch the sequence' });
          const board = el('div', { class: 'corsi-board' });
          const nodes = blocks.map(function (b) {
            return el('div', { class: 'corsi-block', style: { left: b.x + '%', top: b.y + '%' } });
          });
          nodes.forEach(function (n) { board.appendChild(n); });
          s.area.appendChild(board);
          s.setStatus('Trial ' + (t + 1) + ' / ' + trialsN);

          // playback
          for (let i = 0; i < seq.length; i++) {
            s.setProgress(i / seq.length);
            nodes[seq[i]].classList.add('lit'); ui.sfx.blip();
            await ui.sleep(600);
            nodes[seq[i]].classList.remove('lit');
            await ui.sleep(250);
          }
          // input
          s.setPrompt('Tap the blocks in order'); s.setProgress(0);
          const answer = await new Promise(function (res) {
            const taps = [];
            nodes.forEach(function (n, idx) {
              n.classList.add('clickable');
              n.addEventListener('click', function () {
                if (taps.length >= seq.length) return;
                taps.push(idx);
                n.classList.add('lit'); ui.sfx.blip();
                setTimeout(function () { n.classList.remove('lit'); }, 200);
                s.setProgress(taps.length / seq.length);
                if (taps.length === seq.length) res(taps);
              });
            });
          });

          let allRight = true;
          for (let i = 0; i < seq.length; i++) {
            totalSteps++;
            if (answer[i] === seq[i]) correctSteps++; else allRight = false;
          }
          if (allRight) perfect++;
          await ui.feedback(host, allRight, 450);
        }

        const accuracy = totalSteps ? correctSteps / totalSteps : 0;
        resolve({
          score: Math.round(accuracy * 100 * (seqLen / 2)), accuracy: accuracy, level: level,
          metric: { label: 'Span', value: String(seqLen) },
          detail: perfect + '/' + trialsN + ' sequences perfect'
        });
      });
    }
  });
})();
