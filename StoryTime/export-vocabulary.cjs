#!/usr/bin/env node
// Regenerate model-facing references from the actual ManDayRin curriculum.
// Uses Node's standard library only; never edit the generated references by hand.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const sourcePath = path.join(__dirname, '../ManDayRin/vocabulary.js');
const context = {window: {}};
vm.runInNewContext(fs.readFileSync(sourcePath, 'utf8'), context, {timeout:1000, filename:sourcePath});
const vocabulary = context.window.MANDAYRIN_VOCAB;
const bands = [
  {name:'First steps', start:1, end:120},
  {name:'Everyday basics', start:121, end:240},
  {name:'Growing basics', start:241, end:365}
];
const words = [];
for (const partOfSpeech of ['noun','verb','adjective']) {
  assert.equal(vocabulary[partOfSpeech].length,120,`Recheck curriculum bands: expected 120 ${partOfSpeech} entries.`);
  vocabulary[partOfSpeech].forEach((entry,index) => {
    assert(entry.length === 3 && entry.every(value=>typeof value === 'string' && value.length), 'Expected Chinese, pinyin, and meaning.');
    const band = bands[Math.floor(index/40)];
    words.push({partOfSpeech,sourceIndex:index,hanzi:entry[0],pinyin:entry[1],meaning:entry[2],band:band.name,bandStartDay:band.start,bandEndDay:band.end,firstScheduledDay:band.start+index%40});
  });
}
const unique = new Set(words.map(word=>word.hanzi)).size;
const reference = {
  source:'ManDayRin/vocabulary.js',
  scheduleSource:'ManDayRin/app.js: scheduledIndex / bandForDay',
  courseDays:365,
  entryCount:words.length,
  uniqueHanziCount:unique,
  note:'The app schedules one noun, one verb and one adjective per day. Each band cycles through 40 entries per part of speech. Rerolls may expose any word in the current band. firstScheduledDay describes the default schedule, not a learner’s actual history. These are curriculum categories, not an exhaustive dictionary or certified HSK levels.',
  words
};
const lines = [
  '# ManDayRin — full first-year vocabulary', '',
  '> Generated from `ManDayRin/vocabulary.js`. Regenerate with `node StoryTime/export-vocabulary.cjs` from the Hub folder. Do not edit this reference by hand.', '',
  `All **${words.length} curriculum entries**: 120 nouns, 120 verbs, and 120 adjectives (**${unique} distinct Chinese spellings**). Entries shared across categories are preserved with their original meanings. Chinese, pinyin, and English meanings are copied exactly from ManDayRin.`, '',
  '## How to use this for stories', '',
  '- Choose a learner day (1–365) or a curriculum band. For a day-specific story, prefer words whose First day is on or before the learner day. For a band-level story, use that band plus earlier bands.',
  '- First day is the first appearance in the default schedule, not proof the learner knows the word. Rerolls, missed days, and review change individual exposure.',
  '- Days 1–120: First steps. Days 121–240: Everyday basics. Days 241–365: Growing basics. Each band has 40 nouns, 40 verbs, and 40 adjectives; the daily schedule repeats them every 40 days within the band. This is not 1,095 different words.',
  '- These three curriculum bands are all part of the beginner year. They do not map directly to StoryTime’s beginner / intermediate / advanced levels.',
  '- Prefer familiar vocabulary and reuse it naturally. This list omits many essential pronouns, particles, measure words, and other grammar words. Use necessary beginner grammar; do not force unnatural sentences to stay strictly inside the list.',
  '- For beginner stories, introduce only a few new content words and explain them. Intermediate and advanced stories may expand beyond this vocabulary.',
  '- Use the supplied pinyin and meanings as a reference, but check pronunciation in context (including polyphonic characters and tone changes). Preserve source categories for lookup; they are not exhaustive grammatical classifications.',
  '- See `STORY_AUTHORING.md` for a reusable prompt and `stories/_template.txt` for the output format.', '',
  '## Complete vocabulary', ''
];
const escapeCell = text=>String(text).replace(/\|/g,'\\|');
for (const band of bands) {
  lines.push(`### ${band.name} — days ${band.start}–${band.end}`, '');
  for (const kind of ['noun','verb','adjective']) {
    lines.push(`#### ${kind[0].toUpperCase()+kind.slice(1)}s`, '', '| First day | Chinese | Pinyin | Meaning |', '| --- | --- | --- | --- |');
    for (const word of words.filter(word=>word.band === band.name && word.partOfSpeech === kind)) {
      lines.push(`| ${word.firstScheduledDay} | ${escapeCell(word.hanzi)} | ${escapeCell(word.pinyin)} | ${escapeCell(word.meaning)} |`);
    }
    lines.push('');
  }
}
fs.writeFileSync(path.join(__dirname,'MANDAYRIN_YEAR_ONE.md'),lines.join('\n'));
fs.writeFileSync(path.join(__dirname,'mandayrin-year-one.json'),JSON.stringify(reference,null,2)+'\n');
console.log(`Exported ${words.length} entries (${unique} distinct Chinese spellings) across all three first-year bands.`);
