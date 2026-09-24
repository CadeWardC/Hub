(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  // Sentence numbers are one-based and refer to the original story recordings.
  // The first answer is correct in the source; choices are shuffled for each round.
  const exercises = {
    beginner: [
      ['tea-beginner', 2, 3, 'What is the speaker doing today?', ['Reading at home', 'Buying tea', 'Visiting a friend'], 'The speaker says they are reading at home today.'],
      ['tea-beginner', 11, 12, 'How many cups does the speaker have?', ['Two', 'One', 'Three'], 'The speaker goes to get cups and says they have two.'],
      ['tea-beginner', 15, 16, 'Why should she wait before drinking?', ['The tea is hot', 'The cup is empty', 'The tea is cold'], 'The speaker warns that the tea is hot and asks her to wait.'],
      ['cat-beginner', 1, 2, 'What pet does the speaker have?', ['A little cat', 'A little dog', 'A bird'], 'The speaker has a little cat named Xiaobai.'],
      ['cat-beginner', 10, 11, 'Where does the speaker go to look for the cat?', ['The kitchen', 'The garden', 'The bathroom'], 'The speaker goes to the kitchen and looks under the table.'],
      ['cat-beginner', 19, 20, 'Where is Xiaobai?', ['On the bed', 'Under the table', 'Behind the door'], 'After entering the room, the speaker finds Xiaobai on the bed.']
    ],
    intermediate: [
      ['tea-intermediate', 1, 4, '小月的伞为什么坏了？', ['因为风太大了。', '因为她把伞忘在家里了。', '因为小林把伞弄坏了。'], '小月说风太大，把她的伞弄坏了。'],
      ['tea-intermediate', 5, 7, '小林为什么准备给小月泡热茶？', ['因为她又冷又渴。', '因为她想洗杯子。', '因为她不喜欢喝水。'], '小月坐下后说自己又冷又渴，小林就去准备热茶。'],
      ['tea-intermediate', 8, 11, '小月上次为什么留下纸条？', ['她在开玩笑。', '她想让小林买新杯子。', '她不记得自己的名字了。'], '纸条是小月上次来喝茶时开玩笑留下的。'],
      ['cat-intermediate', 1, 4, '今天的情况和平时有什么不同？', ['小白没有到门口迎接我。', '小白一直跟着我走。', '小白变成了一只黑猫。'], '平时小白会到门口迎接我，今天我叫了几次，它也没出现。'],
      ['cat-intermediate', 5, 8, '桌子下面有什么？', ['一个小球。', '一只小猫。', '一个水碗。'], '桌子下面只有一个小球；水碗在桌子旁边。'],
      ['tea-intermediate', 17, 20, '小月说明天要来做什么？', ['还伞，也看看自己的杯子。', '送毛巾，再借一把坏伞。', '帮小林买面包。'], '小林借给她一把好伞，她说明天来还伞，也看看自己的杯子。']
    ]
  };
  let level = 'beginner', current = 0, score = 0, answered = false, heard = false;
  let audio, run = 0, playing = false, passage = [], choices = [];
  const make = (tag, text, className) => {
    const element = document.createElement(tag); element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  function stop() {
    run++; playing = false;
    if (audio) { audio.onended = audio.onerror = null; audio.pause(); audio.removeAttribute('src'); audio.load(); }
    $('listening-play').textContent = heard ? '↻ Listen again' : '▶ Listen';
  }
  function render() {
    stop(); answered = heard = false;
    const [storyId, first, last, question, options] = exercises[level][current];
    const story = window.STORYTIME_STORIES.find(s => s.id === storyId);
    passage = story?.sentences.slice(first - 1, last) || [];
    $('listening-note').textContent = level === 'beginner' ? '1–2 sentences · questions and answers in English' : '3–4 sentences · questions and answers in Chinese';
    $('listening-progress').textContent = `Question ${current + 1} of ${exercises[level].length} · ${score} correct`;
    $('listening-question').textContent = question;
    $('listening-question').lang = $('listening-choices').lang = level === 'beginner' ? 'en' : 'zh-CN';
    $('listening-feedback').textContent = '';
    $('listening-feedback').lang = level === 'beginner' ? 'en' : 'zh-CN';
    $('listening-review').hidden = true; $('listening-review').open = false;
    $('listening-transcript').replaceChildren(); $('listening-next').hidden = true;
    $('listening-play').textContent = '▶ Listen';
    $('listening-play').disabled = passage.length !== last - first + 1 || passage.some(s => !s.audio);
    $('listening-status').textContent = $('listening-play').disabled ? 'This recording is unavailable. Try another level.' : 'Listen to the whole passage to unlock the answers.';
    choices = options.map((text, i) => ({text, correct:i === 0}));
    for (let i = choices.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [choices[i], choices[j]] = [choices[j], choices[i]]; }
    $('listening-choices').replaceChildren(...choices.map(choice => {
      const button = make('button', choice.text); button.disabled = true;
      button.onclick = () => answer(choice, button); return button;
    }));
  }
  function answer(choice, selected) {
    if (answered || !heard) return;
    stop(); answered = true; if (choice.correct) score++;
    [...$('listening-choices').children].forEach((button, i) => {
      button.disabled = true;
      if (choices[i].correct) { button.classList.add('correct'); button.append(make('span', ' ✓')); }
    });
    if (!choice.correct) { selected.classList.add('incorrect'); selected.append(make('span', ' ✕')); }
    const explanation = exercises[level][current][5];
    $('listening-feedback').textContent = (level === 'beginner' ? (choice.correct ? 'Correct! ' : 'Not quite. ') : (choice.correct ? '答对了！' : '再接再厉！')) + explanation;
    $('listening-status').textContent = 'Replay the passage or review the words below.';
    for (const sentence of passage) {
      const zh = make('p', sentence.zh, 'hanzi'); zh.lang = 'zh-CN';
      const py = make('p', sentence.pinyin, 'pinyin'); py.lang = 'zh-Latn';
      $('listening-transcript').append(zh, py, make('p', sentence.en, 'english'));
    }
    $('listening-review').hidden = false;
    $('listening-progress').textContent = `Question ${current + 1} of ${exercises[level].length} · ${score} correct`;
    $('listening-next').textContent = current === exercises[level].length - 1 ? `Round complete: ${score}/${exercises[level].length} · Practice again` : 'Next question →';
    $('listening-next').hidden = false;
  }
  function play() {
    if (playing) { stop(); $('listening-status').textContent = 'Stopped. Tap Listen to start the passage again.'; return; }
    stop(); playing = true; const ticket = run; let position = 0;
    audio ||= new Audio();
    const fail = () => {
      if (ticket !== run) return;
      stop(); $('listening-status').textContent = 'Audio could not play. Check your connection and tap Listen to retry.';
    };
    const next = () => {
      if (ticket !== run) return;
      if (position === passage.length) {
        stop(); heard = true;
        $('listening-play').textContent = '↻ Listen again';
        $('listening-status').textContent = answered ? 'Replay the passage or review the words below.' : 'Choose your answer. You can listen again anytime.';
        if (!answered) [...$('listening-choices').children].forEach(button => { button.disabled = false; });
        return;
      }
      const sentence = passage[position++], speed = $('listening-speed').value;
      audio.src = sentence.audioSpeeds?.[speed] || sentence.audio;
      audio.playbackRate = sentence.audioSpeeds?.[speed] ? 1 : Number(speed); audio.preservesPitch = true;
      audio.onended = next; audio.onerror = fail;
      $('listening-play').textContent = '■ Stop';
      $('listening-status').textContent = `Listening · ${position} of ${passage.length} sentences`;
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; audio.play().catch(fail); } catch { fail(); }
    };
    next();
  }
  $('listening-play').onclick = play;
  $('listening-level').onchange = () => { level = $('listening-level').value; current = score = 0; render(); };
  $('listening-speed').onchange = () => { if (playing) { stop(); play(); } };
  $('listening-next').onclick = () => { current++; if (current === exercises[level].length) current = score = 0; render(); $('listening-question').focus({preventScroll:true}); };
  window.addEventListener('storytime:stop-listening', () => { const wasPlaying = playing; stop(); if (wasPlaying) $('listening-status').textContent = 'Stopped. Tap Listen to start the passage again.'; });
  window.addEventListener('pagehide', stop);
  render();
})();
