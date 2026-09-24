# StoryTime story authoring

When creating or revising Mandarin stories:
- Read `STORY_AUTHORING.md` and `MANDAYRIN_YEAR_ONE.md` for the file format and complete first-year ManDayRin vocabulary. `mandayrin-year-one.json` contains the same vocabulary as structured data.
- Use the requested learner day, curriculum band, and story level. Do not equate the three first-year beginner curriculum bands with beginner/intermediate/advanced story levels.
- Write source stories in `stories/*.txt`, using `stories/_template.txt`; do not edit generated `stories.js` by hand.
- Unless a different length is requested, aim for 20–30 short beginner sentences, 18–24 intermediate sentences, or 16–22 richer advanced sentences, with a developed beginning, small problem, and ending. Keep beginner language simple as stories grow.
- Preserve simple, natural Chinese and aligned pinyin/English. Allow necessary grammar words missing from the vocabulary reference.
- Run `python3 StoryTime/build_stories.py` after story changes. To refresh vocabulary references after ManDayRin vocabulary changes, run `node StoryTime/export-vocabulary.cjs`.
