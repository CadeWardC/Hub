/* ============================================================
   processing-speed.js — Processing Speed domain games
   Reaction Time, Speed Match, Trail Making
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
     REACTION TIME — simple processing speed
     --------------------------------------------------------- */
  BRAIN.register({
    id: 'reaction-time',
    name: 'Flashpoint',
    domain: 'speed',
    icon: '⏱',
    minLevel: 1, maxLevel: 6,
    scoreTarget: 600,
    blurb: 'Hold steady through the wait, then tap at the exact instant the field flashes green.',
    science: {
      what: 'Simple reaction time: a single stimulus, a single response. Inter-stimulus intervals are randomized so you can’t anticipate the cue.',
      why: 'Processing speed is a foundational cognitive resource that declines earliest with age and underlies performance across most other tasks.',
      citation: 'Salthouse (1996), The processing-speed theory of adult age differences in cognition.'
    },
    play: function (host, opts) {
      return new Promise(async function (resolve) {
        const trials = 5;
        await ui.countdown(host, { label: 'Reaction Time' });
        const s = ui.stage(host, { prompt: 'Tap the moment the panel turns green' });
        const pad = el('div', { class: 'rt-pad wait', text: 'Wait…' });
        s.area.appendChild(pad);
        const rts = []; let falseStarts = 0;

        for (let i = 0; i < trials; i++) {
          s.setProgress(i / trials); s.setStatus('Trial ' + (i + 1) + ' / ' + trials);
          pad.className = 'rt-pad wait'; pad.textContent = 'Wait…';
          const ok = await new Promise(function (res) {
            let armed = false, t0 = 0, timer;
            function down() {
              if (!armed) { // jumped the gun
                clearTimeout(timer);
                pad.className = 'rt-pad early'; pad.textContent = 'Too early!';
                cleanup(); falseStarts++; setTimeout(function () { res(null); }, 700);
              } else {
                const rt = performance.now() - t0;
                pad.className = 'rt-pad hit'; pad.textContent = Math.round(rt) + ' ms';
                cleanup(); setTimeout(function () { res(rt); }, 600);
              }
            }
            function cleanup() { pad.removeEventListener('pointerdown', down); }
            pad.addEventListener('pointerdown', down);
            timer = setTimeout(function () {
              armed = true; t0 = performance.now();
              pad.className = 'rt-pad go'; pad.textContent = 'TAP!';
            }, 1000 + ui.randInt(0, 2500));
          });
          if (ok) rts.push(ok);
        }
        const med = median(rts);
        // Faster = higher score. 200ms -> ~600, 500ms -> ~240.
        const base = med ? Math.max(0, Math.round(120000 / med - falseStarts * 40)) : 0;
        const accuracy = rts.length / trials;
        resolve({
          score: base, accuracy: accuracy, level: opts.level,
          metric: { label: 'Median RT', value: (med || '—') + ' ms' },
          detail: falseStarts ? falseStarts + ' early taps' : 'Clean run'
        });
      });
    }
  });

  /* ---------------------------------------------------------
     SPEED MATCH — rapid same/different (1-back perceptual)
     --------------------------------------------------------- */
  BRAIN.register({
    id: 'speed-match',
    name: 'Echo Match',
    domain: 'speed',
    icon: '⧉',
    minLevel: 1, maxLevel: 10,
    scoreTarget: 230,
    blurb: 'Same symbol as the one before it—or different? Decide before the shrinking clock decides for you.',
    science: {
      what: 'A rapid perceptual matching task: each card is judged "same" or "different" relative to the previous one, under a tightening time limit.',
      why: 'Trains speed of information processing and decision-making — the rate at which simple comparisons can be made — a key target of the ACTIVE speed-of-processing intervention.',
      citation: 'Ball et al. (2002), ACTIVE trial: cognitive training in older adults, JAMA 288(18).'
    },
    play: function (host, opts) {
      return new Promise(async function (resolve) {
        const level = opts.level;
        const trials = 26;
        const deadline = Math.max(1500 - level * 110, 600);
        const SYMS = ['▲', '●', '■', '◆', '★', '✚'];
        await ui.countdown(host, { label: 'Speed Match' });
        const s = ui.stage(host, { prompt: 'Same as previous? ← No   Yes →' });
        const card = el('div', { class: 'sm-card' });
        const btns = el('div', { class: 'sm-btns' }, [
          el('button', { class: 'g-btn', 'data-resp': 'no', text: '✗ Different (←)' }),
          el('button', { class: 'g-btn', 'data-resp': 'yes', text: 'Same (→) ✓' })
        ]);
        s.area.appendChild(card); s.area.appendChild(btns);

        let prev = null, correct = 0, scored = 0; const rts = [];
        for (let i = 0; i < trials; i++) {
          let sym;
          if (prev && Math.random() < 0.45) sym = prev;
          else { do { sym = ui.pick(SYMS); } while (sym === prev && Math.random() < 0.7); }
          card.textContent = sym;
          card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
          s.setProgress(i / trials); s.setStatus('Trial ' + (i + 1) + ' / ' + trials);
          if (prev !== null) {
            const isSame = sym === prev;
            const r = await ui.awaitResponse(host, deadline, ['ArrowLeft', 'ArrowRight']);
            const choice = r.via === 'key' ? (r.key === 'ArrowRight' ? 'yes' : 'no') : r.key;
            const ok = (choice === 'yes') === isSame && r.responded;
            scored++; if (ok) { correct++; rts.push(r.rt); }
            await ui.feedback(s.area, ok, 160);
          } else {
            await ui.sleep(700);
          }
          prev = sym;
        }
        const accuracy = scored ? correct / scored : 0, med = median(rts);
        const mult = med ? Math.max(0.4, Math.min(2, 900 / med)) : 1;
        resolve({
          score: Math.round(accuracy * 100 * mult), accuracy: accuracy, level: level,
          metric: { label: 'Accuracy', value: Math.round(accuracy * 100) + '%' },
          detail: 'Median RT ' + (med || '—') + ' ms'
        });
      });
    }
  });

  /* ---------------------------------------------------------
     TRAIL MAKING — visual scanning + set-shifting (B)
     --------------------------------------------------------- */
  BRAIN.register({
    id: 'trails',
    name: 'Connect Shift',
    domain: 'speed',
    icon: '➿',
    minLevel: 1, maxLevel: 8,
    scoreTarget: 500,
    blurb: 'Connect scattered targets in order. Later rounds alternate numbers and letters without warning.',
    science: {
      what: 'Trails A connects 1-2-3…; Trails B alternates 1-A-2-B-3-C…, forcing you to switch between two sequences. Unlocks at level 3.',
      why: 'A staple neuropsychological test of visual attention, processing speed, and (in part B) cognitive flexibility / set-shifting.',
      citation: 'Reitan (1958), Trail Making Test; Bowie & Harvey (2006) administration & scoring.'
    },
    play: function (host, opts) {
      return new Promise(async function (resolve) {
        const level = opts.level;
        const partB = level >= 3;
        const count = Math.min(8 + level, 16);
        await ui.countdown(host, { label: partB ? 'Trails B' : 'Trails A' });
        const s = ui.stage(host, { prompt: partB ? 'Tap 1 → A → 2 → B → 3 …' : 'Tap the numbers in order' });
        const board = el('div', { class: 'trail-board' });
        s.area.appendChild(board);

        // Build target sequence labels.
        const labels = [];
        if (partB) {
          const letters = 'ABCDEFGH';
          for (let i = 0; i < count; i++) labels.push(i % 2 === 0 ? String(Math.floor(i / 2) + 1) : letters[Math.floor(i / 2)]);
        } else {
          for (let i = 0; i < count; i++) labels.push(String(i + 1));
        }
        // Place nodes without heavy overlap.
        const placed = [];
        labels.forEach(function (lab) {
          let x, y, tries = 0;
          do { x = ui.randInt(6, 90); y = ui.randInt(8, 86); tries++; }
          while (tries < 40 && placed.some(function (p) { return Math.abs(p.x - x) < 14 && Math.abs(p.y - y) < 14; }));
          placed.push({ x: x, y: y, lab: lab });
        });
        const nodes = placed.map(function (p, idx) {
          return el('button', {
            class: 'trail-node', 'data-idx': idx, text: p.lab,
            style: { left: p.x + '%', top: p.y + '%' }
          });
        });
        nodes.forEach(function (n) { board.appendChild(n); });

        const t0 = performance.now();
        let next = 0, errors = 0;
        await new Promise(function (res) {
          nodes.forEach(function (n, idx) {
            n.addEventListener('click', function () {
              if (idx === next) {
                n.classList.add('done'); next++;
                ui.sfx.blip(); s.setProgress(next / count);
                if (next === count) res();
              } else {
                errors++; n.classList.add('wrong'); ui.sfx.bad();
                setTimeout(function () { n.classList.remove('wrong'); }, 300);
              }
            });
          });
        });
        const secs = (performance.now() - t0) / 1000;
        const accuracy = count / (count + errors);
        // Faster + fewer errors = higher. Reference ~ 1.2s per node.
        const ref = count * 1.2;
        const score = Math.max(0, Math.round((ref / secs) * 100 - errors * 15) * (partB ? 1.4 : 1));
        resolve({
          score: score, accuracy: accuracy, level: level,
          metric: { label: 'Time', value: secs.toFixed(1) + ' s' },
          detail: errors + ' wrong taps' + (partB ? ' · Part B' : '')
        });
      });
    }
  });
})();
