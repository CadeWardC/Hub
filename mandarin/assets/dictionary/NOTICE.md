# CC-CEDICT

`cedict.json` is generated from CC-CEDICT, a community-maintained free
Chinese-English dictionary published by MDBG.

* Source: https://www.mdbg.net/chinese/dictionary?page=cc-cedict
* Licence: Creative Commons Attribution-ShareAlike 4.0 International
  (https://creativecommons.org/licenses/by-sa/4.0/)
* Referenced work: CEDICT, Copyright (C) 1997, 1998 Paul Andrew Denisowski

The conversion (`tool/build_dictionary.py`) keeps the headwords, readings, and
up to six senses per reading, converts numbered pinyin to tone marks, and
rewrites CC-CEDICT's inline cross-reference and classifier notation into plain
text. No definitions are otherwise altered.

Because CC-CEDICT is ShareAlike, this derived file is distributed under the same
licence, and the attribution above is shown in the app wherever definitions
appear.
