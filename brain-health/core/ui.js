/* ============================================================
   ui.js — shared helpers used by every game
   DOM building, timing, randomness, fixation, feedback, speech.
   ============================================================ */
(function () {
  'use strict';
  window.BRAIN = window.BRAIN || {};

  // ---- DOM ----------------------------------------------------
  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      for (const k in props) {
        if (k === 'class') node.className = props[k];
        else if (k === 'text') node.textContent = props[k];
        else if (k === 'html') node.innerHTML = props[k];
        else if (k === 'style' && typeof props[k] === 'object') {
          for (const sk in props[k]) {
            if (sk.indexOf('--') === 0) node.style.setProperty(sk, props[k][sk]);
            else node.style[sk] = props[k][sk];
          }
        }
        else if (k.startsWith('on') && typeof props[k] === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), props[k]);
        } else if (k === 'dataset') {
          Object.assign(node.dataset, props[k]);
        } else if (props[k] != null) {
          node.setAttribute(k, props[k]);
        }
      }
    }
    if (children != null) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

  // ---- Timing -------------------------------------------------
  function sleep(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

  // A cancelable deadline: resolves true on key/click, false on timeout.
  function awaitResponse(host, ms, validKeys) {
    return new Promise(function (resolve) {
      let done = false;
      const t0 = performance.now();
      let timer = null;

      function finish(via, key) {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        document.removeEventListener('keydown', onKey, true);
        host.removeEventListener('pointerdown', onPointer, true);
        resolve({ responded: via !== 'timeout', via: via, key: key, rt: performance.now() - t0 });
      }
      function onKey(e) {
        if (validKeys && validKeys.length && validKeys.indexOf(e.key) === -1 &&
            validKeys.indexOf(e.key.toLowerCase()) === -1) return;
        e.preventDefault();
        finish('key', e.key);
      }
      function onPointer(e) {
        const btn = e.target.closest('[data-resp]');
        finish('pointer', btn ? btn.dataset.resp : null);
      }
      document.addEventListener('keydown', onKey, true);
      host.addEventListener('pointerdown', onPointer, true);
      if (ms != null && ms !== Infinity) timer = setTimeout(function () { finish('timeout', null); }, ms);
    });
  }

  // ---- Randomness ---------------------------------------------
  function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function sample(arr, n) { return shuffle(arr).slice(0, n); }

  // ---- Game scaffolding --------------------------------------
  // Standard stage layout: a prompt strip on top, a play area, a status row.
  function stage(host, opts) {
    opts = opts || {};
    clear(host);
    const prompt = el('div', { class: 'g-prompt', text: opts.prompt || '' });
    const area = el('div', { class: 'g-area' });
    const status = el('div', { class: 'g-status' });
    const progress = el('div', { class: 'g-progress' }, [el('span', { class: 'g-progress-bar' })]);
    host.appendChild(prompt);
    host.appendChild(progress);
    host.appendChild(area);
    host.appendChild(status);
    return {
      prompt: prompt, area: area, status: status,
      setPrompt: function (t) { prompt.textContent = t; },
      setStatus: function (t) { status.textContent = t; },
      setProgress: function (frac) {
        progress.firstChild.style.width = Math.max(0, Math.min(1, frac)) * 100 + '%';
      }
    };
  }

  // Big centered 3-2-1 countdown before a game starts.
  async function countdown(host, opts) {
    opts = opts || {};
    clear(host);
    const wrap = el('div', { class: 'g-countdown' });
    const label = el('div', { class: 'g-count-label', text: opts.label || 'Get ready' });
    const num = el('div', { class: 'g-count-num' });
    wrap.appendChild(label);
    wrap.appendChild(num);
    host.appendChild(wrap);
    for (let i = (opts.from || 3); i >= 1; i--) {
      num.textContent = i;
      num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop');
      await sleep(700);
    }
    num.textContent = 'Go';
    await sleep(450);
  }

  // Brief green/red flash + optional reason. Resolves after `ms`.
  function feedback(host, correct, ms) {
    const flash = el('div', { class: 'g-flash ' + (correct ? 'good' : 'bad') });
    host.appendChild(flash);
    requestAnimationFrame(function () { flash.classList.add('show'); });
    return sleep(ms || 350).then(function () {
      flash.classList.remove('show');
      return sleep(120).then(function () { flash.remove(); });
    });
  }

  function fixation(area) {
    clear(area);
    area.appendChild(el('div', { class: 'g-fixation', text: '+' }));
  }

  // ---- Speech (for Dual N-Back audio stream) ------------------
  const speech = {
    supported: 'speechSynthesis' in window,
    say: function (text) {
      if (!this.supported || !BRAIN.store.settings.speech) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.05; u.pitch = 1; u.volume = 1; u.lang = 'en-US';
        window.speechSynthesis.speak(u);
      } catch (e) { /* ignore */ }
    },
    warmUp: function () {
      // Some browsers need a primed voice list after a user gesture.
      if (this.supported) { try { window.speechSynthesis.getVoices(); } catch (e) {} }
    }
  };

  // ---- Beep tones (lightweight WebAudio, no assets) -----------
  let audioCtx = null;
  function tone(freq, ms, type) {
    if (!BRAIN.store.settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + ms / 1000);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + ms / 1000);
    } catch (e) { /* ignore */ }
  }
  const sfx = {
    good: function () { tone(660, 120, 'sine'); },
    bad: function () { tone(180, 200, 'square'); },
    blip: function () { tone(440, 70, 'triangle'); }
  };

  BRAIN.ui = {
    el: el, clear: clear, sleep: sleep, awaitResponse: awaitResponse,
    randInt: randInt, pick: pick, shuffle: shuffle, sample: sample,
    stage: stage, countdown: countdown, feedback: feedback, fixation: fixation,
    speech: speech, sfx: sfx
  };
})();
