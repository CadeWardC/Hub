/* ============================================================
   flexibility.js — Flexibility & Reasoning domain games
   Task Switching, Mental Rotation, Mental Math (n-back-ish)
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

  /* ---------------------------------------------------------
     TASK SWITCHING — cognitive flexibility / set-shifting
     --------------------------------------------------------- */
  BRAIN.register({
    id: 'task-switch',
    name: 'Rule Shift',
    domain: 'flexibility',
    icon: '⇆',
    minLevel: 1, maxLevel: 10,
    scoreTarget: 175,
    blurb: 'The card changes the rule: odd or even, high or low. Read the context before the number.',
    science: {
      what: 'Each trial shows a colored number. A blue background means judge odd/even; an orange background means judge less/greater than 5. The rule switches unpredictably.',
      why: 'The cost of reconfiguring from one rule to another ("switch cost") is a direct measure of cognitive flexibility, a frontal-lobe executive function.',
      citation: 'Monsell (2003), Task switching, Trends in Cognitive Sciences 7(3).'
    },
    play: function (host, opts) {
      return new Promise(async function (resolve) {
        const level = opts.level;
        const trials = 28;
        const switchRate = Math.min(0.35 + level * 0.04, 0.7);
        const deadline = Math.max(2200 - level * 130, 900);

        await ui.countdown(host, { label: 'Task Switch' });
        const s = ui.stage(host, { prompt: '' });
        const panel = el('div', { class: 'ts-panel' });
        const num = el('div', { class: 'ts-num' });
        const rule = el('div', { class: 'ts-rule' });
        panel.appendChild(rule); panel.appendChild(num);
        const btns = el('div', { class: 'ts-btns' }, [
          el('button', { class: 'g-btn', 'data-resp': 'A', text: '' }),
          el('button', { class: 'g-btn', 'data-resp': 'B', text: '' })
        ]);
        s.area.appendChild(panel); s.area.appendChild(btns);
        const leftBtn = btns.children[0], rightBtn = btns.children[1];

        let task = Math.random() < 0.5 ? 'parity' : 'magnitude';
        let correct = 0; const rts = []; let switches = 0;
        for (let i = 0; i < trials; i++) {
          if (i > 0 && Math.random() < switchRate) { task = task === 'parity' ? 'magnitude' : 'parity'; switches++; }
          let n; do { n = ui.randInt(1, 9); } while (n === 5);
          panel.className = 'ts-panel ' + (task === 'parity' ? 'parity' : 'magnitude');
          rule.textContent = task === 'parity' ? 'ODD or EVEN?' : 'LESS or MORE than 5?';
          leftBtn.textContent = task === 'parity' ? 'Odd (←)' : 'Less (←)';
          rightBtn.textContent = task === 'parity' ? 'Even (→)' : 'More (→)';
          num.textContent = n;
          num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop');
          s.setProgress(i / trials); s.setStatus('Trial ' + (i + 1) + ' / ' + trials);

          const want = task === 'parity' ? (n % 2 === 0 ? 'B' : 'A') : (n > 5 ? 'B' : 'A');
          const r = await ui.awaitResponse(host, deadline, ['ArrowLeft', 'ArrowRight']);
          const choice = r.via === 'key' ? (r.key === 'ArrowRight' ? 'B' : 'A') : r.key;
          const ok = choice === want && r.responded;
          if (ok) { correct++; rts.push(r.rt); }
          await ui.feedback(s.area, ok, 180);
        }
        const accuracy = correct / trials, med = median(rts);
        const mult = med ? Math.max(0.4, Math.min(2, 1100 / med)) : 1;
        resolve({
          score: Math.round(accuracy * 100 * mult), accuracy: accuracy, level: level,
          metric: { label: 'Accuracy', value: Math.round(accuracy * 100) + '%' },
          detail: switches + ' rule switches · median RT ' + (med || '—') + ' ms'
        });
      });
    }
  });

  /* ---------------------------------------------------------
     MENTAL ROTATION — spatial reasoning
     --------------------------------------------------------- */
  BRAIN.register({
    id: 'mental-rotation',
    name: 'Mirror Mind',
    domain: 'flexibility',
    icon: '🧭',
    minLevel: 1, maxLevel: 10,
    scoreTarget: 185,
    blurb: 'Turn the shape in your mind and decide whether its partner is rotated or secretly mirrored.',
    science: {
      what: 'A reference shape and a probe rotated by some angle. You judge whether the probe is the same object rotated, or its mirror reflection.',
      why: 'Mental rotation is the benchmark task for spatial visualization; response time scales linearly with rotation angle, revealing an analog mental transformation.',
      citation: 'Shepard & Metzler (1971), Mental rotation of three-dimensional objects, Science 171.'
    },
    play: function (host, opts) {
      return new Promise(async function (resolve) {
        const level = opts.level;
        const trials = 16;
        const deadline = Math.max(7000 - level * 300, 3000);
        // An asymmetric polyomino-like glyph so mirroring is detectable.
        function glyph(mirror) {
          const cells = [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2], [0, 2]];
          const ns = 'http://www.w3.org/2000/svg';
          const svg = document.createElementNS(ns, 'svg');
          svg.setAttribute('viewBox', '-0.5 -0.5 4 4');
          svg.setAttribute('class', 'mr-shape');
          cells.forEach(function (c) {
            const x = mirror ? 3 - c[0] : c[0];
            const r = document.createElementNS(ns, 'rect');
            r.setAttribute('x', x); r.setAttribute('y', c[1]);
            r.setAttribute('width', 1); r.setAttribute('height', 1);
            r.setAttribute('rx', 0.12);
            svg.appendChild(r);
          });
          return svg;
        }

        await ui.countdown(host, { label: 'Mental Rotation' });
        const s = ui.stage(host, { prompt: 'Same shape or mirror image?' });
        const pair = el('div', { class: 'mr-pair' });
        const left = el('div', { class: 'mr-slot' });
        const right = el('div', { class: 'mr-slot' });
        pair.appendChild(left); pair.appendChild(el('div', { class: 'mr-vs', text: '?' })); pair.appendChild(right);
        const btns = el('div', { class: 'mr-btns' }, [
          el('button', { class: 'g-btn', 'data-resp': 'same', text: 'Same (←)' }),
          el('button', { class: 'g-btn', 'data-resp': 'mirror', text: 'Mirror (→)' })
        ]);
        s.area.appendChild(pair); s.area.appendChild(btns);

        let correct = 0; const rts = [];
        const angles = [45, 90, 135, 180];
        for (let i = 0; i < trials; i++) {
          ui.clear(left); ui.clear(right);
          const isMirror = Math.random() < 0.5;
          const angle = ui.pick(angles) * (Math.random() < 0.5 ? 1 : -1);
          const a = glyph(false);
          const b = glyph(isMirror);
          b.style.transform = 'rotate(' + angle + 'deg)';
          left.appendChild(a); right.appendChild(b);
          s.setProgress(i / trials); s.setStatus('Trial ' + (i + 1) + ' / ' + trials);

          const want = isMirror ? 'mirror' : 'same';
          const r = await ui.awaitResponse(host, deadline, ['ArrowLeft', 'ArrowRight']);
          const choice = r.via === 'key' ? (r.key === 'ArrowLeft' ? 'same' : 'mirror') : r.key;
          const ok = choice === want && r.responded;
          if (ok) { correct++; rts.push(r.rt); }
          await ui.feedback(s.area, ok, 220);
        }
        const accuracy = correct / trials, med = median(rts);
        const mult = med ? Math.max(0.4, Math.min(1.8, 2500 / med)) : 1;
        resolve({
          score: Math.round(accuracy * 100 * mult), accuracy: accuracy, level: level,
          metric: { label: 'Accuracy', value: Math.round(accuracy * 100) + '%' },
          detail: 'Median RT ' + (med || '—') + ' ms'
        });
      });
    }
  });

  /* ---------------------------------------------------------
     MENTAL MATH SPRINT — fluid reasoning under working load
     --------------------------------------------------------- */
  BRAIN.register({
    id: 'math-sprint',
    name: 'Equation Rush',
    domain: 'flexibility',
    icon: '∑',
    minLevel: 1, maxLevel: 10,
    scoreTarget: 200,
    blurb: 'Verify rapid-fire equations while operations and number size climb with your level.',
    science: {
      what: 'You verify arithmetic equations (e.g. 7 × 6 = 42) under time pressure. Operand size and operation complexity grow with level.',
      why: 'Arithmetic verification taxes quantitative reasoning and working memory simultaneously, and trains fluent retrieval and manipulation of number facts.',
      citation: 'Ashcraft (1992), Cognitive arithmetic; Geary (2011) cognitive predictors of math achievement.'
    },
    play: function (host, opts) {
      return new Promise(async function (resolve) {
        const level = opts.level;
        const trials = 20;
        const deadline = Math.max(6000 - level * 350, 2500);
        const maxN = 4 + level * 2;
        await ui.countdown(host, { label: 'Math Sprint' });
        const s = ui.stage(host, { prompt: 'Is the equation correct?  ✗ ←   → ✓' });
        const eqn = el('div', { class: 'ms-eqn' });
        const btns = el('div', { class: 'ms-btns' }, [
          el('button', { class: 'g-btn', 'data-resp': 'false', text: '✗ False (←)' }),
          el('button', { class: 'g-btn', 'data-resp': 'true', text: 'True (→) ✓' })
        ]);
        s.area.appendChild(eqn); s.area.appendChild(btns);

        let correct = 0; const rts = [];
        for (let i = 0; i < trials; i++) {
          const ops = level >= 4 ? ['+', '−', '×'] : level >= 2 ? ['+', '−'] : ['+'];
          const op = ui.pick(ops);
          let a = ui.randInt(2, maxN), b = ui.randInt(2, maxN), real;
          if (op === '+') real = a + b;
          else if (op === '−') { if (b > a) { const t = a; a = b; b = t; } real = a - b; }
          else real = a * b;
          const showTrue = Math.random() < 0.5;
          const shown = showTrue ? real : real + ui.pick([-2, -1, 1, 2, 3]);
          eqn.textContent = a + ' ' + op + ' ' + b + ' = ' + shown;
          eqn.classList.remove('pop'); void eqn.offsetWidth; eqn.classList.add('pop');
          s.setProgress(i / trials); s.setStatus('Trial ' + (i + 1) + ' / ' + trials);

          const want = (shown === real) ? 'true' : 'false';
          const r = await ui.awaitResponse(host, deadline, ['ArrowLeft', 'ArrowRight']);
          const choice = r.via === 'key' ? (r.key === 'ArrowRight' ? 'true' : 'false') : r.key;
          const ok = choice === want && r.responded;
          if (ok) { correct++; rts.push(r.rt); }
          await ui.feedback(s.area, ok, 180);
        }
        const accuracy = correct / trials, med = median(rts);
        const mult = med ? Math.max(0.5, Math.min(1.8, 2200 / med)) : 1;
        resolve({
          score: Math.round(accuracy * 100 * mult), accuracy: accuracy, level: level,
          metric: { label: 'Accuracy', value: Math.round(accuracy * 100) + '%' },
          detail: 'Median RT ' + (med || '—') + ' ms'
        });
      });
    }
  });
})();
