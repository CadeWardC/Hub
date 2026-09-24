# Create a StoryTime story with a model

Give the model this file and **MANDAYRIN_YEAR_ONE.md**. For structured processing, the identical vocabulary is in **mandayrin-year-one.json**. The vocabulary reference includes the complete first year, source categories, pinyin, meanings, curriculum bands, and first scheduled days.

Copy this prompt and fill in the brackets:

> Write a Mandarin story for StoryTime.
>
> Topic: [e.g. buying fruit with a friend]
> Story level: [beginner / intermediate / advanced]
> Learner's ManDayRin day: [1–365, or specify a band / the full first year]
> Length: [default: beginner 20–30 short sentences; intermediate 18–24 sentences; advanced 16–22 richer sentences]
> Target words to practice: [optional]
>
> Use the attached MANDAYRIN_YEAR_ONE.md as the vocabulary reference. Prefer words introduced by the specified day (First day <= learner day), or from the selected band and earlier bands. Repeat a few useful words naturally. Do not try to use the entire vocabulary in one story. The daily schedule repeats words, so later days do not necessarily mean more unique vocabulary.
>
> Develop a complete scene with a beginning, a small problem or discovery, a few meaningful actions or exchanges, and a satisfying ending. Add story development rather than filler. A longer beginner story should recycle familiar words and keep individual sentences short; length and language difficulty are separate choices.
>
> For beginners, use short, concrete sentences, a clear little plot, simple grammar, and at most three new content words. Basic pronouns, particles, measure words, and necessary grammar words are allowed even when absent from the list. Explain new content words in the note header. Do not assume the learner knows every listed word. For intermediate or advanced stories, increase grammar and vocabulary complexity appropriately; the first-year list is a foundation, not a restriction.
>
> Include accurate tone-marked pinyin and natural English for every sentence. Verify character/pinyin/meaning alignment and context-sensitive pronunciation. Use simplified Chinese. Keep the story coherent and digestible.
>
> Return only the plain-text story file in the format below, without Markdown fences. One sentence per line after ---. Use beginner, intermediate, or advanced for level. Put new-word explanations in the single-line note header. Do not include literal | characters inside the text of any field.
>
> title: [English title]
> level: [level]
> series: [a-lowercase-story-name]
> description: [one-sentence description]
> note: [learning focus and any new content words with pinyin and meanings]
> ---
> [Chinese sentence] | [Pinyin] | [English]
> [Chinese sentence] | [Pinyin] | [English]

Save the output as a new lowercase, hyphenated `.txt` filename in `stories/`. For several levels of the same story, create separate files with the same series value, one per level. A level label does not change the difficulty by itself: write each version at the intended level.

Run `python3 StoryTime/build_stories.py` from the Hub folder to validate and preview. GitHub Pages builds stories automatically during deployment.

The vocabulary files are generated from `../ManDayRin/vocabulary.js`; refresh them with `node StoryTime/export-vocabulary.cjs` if that source changes. The exporter verifies the current 120-entry-per-category structure and preserves every source entry, including repeated spellings across categories. If ManDayRin's scheduling algorithm changes, update the exporter’s band and first-day calculations too.
