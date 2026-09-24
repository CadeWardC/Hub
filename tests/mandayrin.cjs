const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

process.env.TZ = 'America/Chicago';
const root = path.join(__dirname, '..', 'ManDayRin');
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8').replace(
  '  renderToday();',
  '  window.test = { state, day, renderHistory }; return;'
);

function load(saved, today = '2026-09-24T12:00:00') {
  const elements = {};
  let persisted;
  const context = vm.createContext({
    window: {},
    Date: class extends Date {
      constructor(...args) { super(...(args.length ? args : [today])); }
      static now() { return new Date(today).getTime(); }
    },
    localStorage: {
      getItem: () => JSON.stringify(saved),
      setItem: (_, value) => { persisted = JSON.parse(value); }
    },
    document: {
      querySelector: (selector) => elements[selector] ||= {},
      querySelectorAll: () => []
    }
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'vocabulary.js'), 'utf8'), context);
  vm.runInContext(source, context);
  context.window.test.renderHistory();
  return { ...context.window.test, persisted, elements, vocab: context.window.MANDAYRIN_VOCAB };
}

const initial = load({ startedOn: '2026-09-03', selections: {}, history: [] });
assert.equal(initial.day, 22);
assert.equal(initial.state.history.length, 66);
for (let day = 1; day <= 22; day++) {
  assert.equal(initial.state.history.filter(entry => entry.day === day).length, 3);
  assert.ok(initial.elements['#historyList'].innerHTML.includes(`Day ${day}</span>`));
}
assert.ok(initial.elements['#historyList'].innerHTML.indexOf('Day 22</span>') < initial.elements['#historyList'].innerHTML.indexOf('Day 1</span>'));

// Reproduce a returning learner whose history is missing days 13 and 16.
const saved = initial.persisted;
saved.history = saved.history.filter(entry => ![13, 16].includes(entry.day));
delete saved.selections['2026-09-15'];
delete saved.selections['2026-09-18'];
const word = initial.vocab.noun[30];
saved.selections['2026-09-14'].noun = 30;
const reroll = { fingerprint: `2026-09-14:noun:${word[0]}`, date: '2026-09-14', day: 12, kind: 'noun', word: [...word], rerolled: true, seenAt: 12345 };
saved.history.push(reroll);
const repaired = load(saved);
assert.equal(repaired.state.history.length, 67);
assert.equal(repaired.state.selections['2026-09-14'].noun, 30);
assert.deepEqual(JSON.parse(JSON.stringify(repaired.state.history.find(entry => entry.fingerprint === reroll.fingerprint))), reroll);
assert.deepEqual(load(repaired.persisted).persisted, repaired.persisted);
assert.equal(load({}, '2026-09-24T12:00:00').state.history.length, 3);

// Calendar days must stay consecutive across daylight saving time changes.
const spring = load({ startedOn: '2026-03-01' }, '2026-03-22T12:00:00');
assert.equal(spring.day, 22);
assert.equal(spring.state.history.length, 66);
assert.equal(spring.state.history.at(-1).date, '2026-03-22');
const finished = load({ startedOn: '2025-01-01' });
assert.equal(finished.day, 365);
assert.ok(finished.state.selections['2026-09-24']);
assert.equal(new Set(finished.state.history.map(entry => entry.day)).size, 365);
console.log('ManDayRin history checks passed: missing days, rendered archive, rerolls, reloads, DST, and course completion.');
