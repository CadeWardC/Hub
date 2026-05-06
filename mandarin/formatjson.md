# Sentence JSON Format

Format Mandarin sentences into the following JSON structure. Each entry is an object with four fields: the Chinese sentence, its pinyin romanization, the English translation, and a tag linking it to a roadmap subtopic.

## Schema

```json
[
  {
    "mandarin": "你好吗？",
    "pinyin": "nǐ hǎo ma?",
    "translation": "How are you?",
    "stage": 1,
    "sub": 0
  }
]
```

## Rules

- The output must be a valid JSON array of objects.
- Each object must have exactly five keys: `mandarin`, `pinyin`, `translation`, `stage`, `sub`.
- `mandarin` — the sentence in simplified Chinese characters, with punctuation.
- `pinyin` — the pinyin romanization with tone marks (not tone numbers). Include punctuation from the original sentence.
- `translation` — a natural English translation of the sentence.
- `stage` — the roadmap stage number (1–18). See stage list below.
- `sub` — the zero-based subtopic index within that stage. See subtopic list below.
- Sentences should use vocabulary and grammar from their tagged subtopic.
- Do not include any explanation or commentary. Output only the JSON array.

## Stages & Subtopics

### Phase 1: Foundations

**Stage 1 — Tones & Pinyin**
| Sub | Subtopic |
|-----|----------|
| 0 | The 4 tones + neutral tone |
| 1 | Tone pairs & sandhi rules |
| 2 | Pinyin initials |
| 3 | Pinyin finals & compound finals |
| 4 | Pinyin spelling rules (ü) |
| 5 | Pronunciation drills (numbers) |

**Stage 2 — Survival Phrases**
| Sub | Subtopic |
|-----|----------|
| 0 | Greetings |
| 1 | Politeness |
| 2 | Simple questions |
| 3 | Classroom language |
| 4 | Emergency phrases |
| 5 | Basic responses |

**Stage 3 — Numbers, Time & Dates**
| Sub | Subtopic |
|-----|----------|
| 0 | Numbers 0–100 |
| 1 | Ordinals & dates |
| 2 | Days of week |
| 3 | Telling time |
| 4 | Duration expressions |
| 5 | Age & birthday |

### Phase 2: Core Vocabulary

**Stage 4 — People & Pronouns**
| Sub | Subtopic |
|-----|----------|
| 0 | Personal pronouns |
| 1 | Family members |
| 2 | Relationship terms |
| 3 | Pronouns + 的 possession |
| 4 | Nationality & language |
| 5 | Describing people |

**Stage 5 — Food & Dining**
| Sub | Subtopic |
|-----|----------|
| 0 | Common dishes |
| 1 | Fruits & vegetables |
| 2 | Meat, seafood, tofu |
| 3 | Cooking methods |
| 4 | Restaurant phrases |
| 5 | Drinks |

**Stage 6 — Getting Around**
| Sub | Subtopic |
|-----|----------|
| 0 | Transportation modes |
| 1 | Direction words |
| 2 | Location prepositions |
| 3 | Landmarks |
| 4 | Buying tickets & asking directions |
| 5 | Traffic & road vocabulary |

### Phase 3: Daily Life

**Stage 7 — Shopping & Money**
| Sub | Subtopic |
|-----|----------|
| 0 | Clothing items & accessories |
| 1 | Colors & sizes |
| 2 | Prices & bargaining |
| 3 | Shopping locations |
| 4 | Digital payments |
| 5 | Returning items & complaints |

**Stage 8 — Home & Routine**
| Sub | Subtopic |
|-----|----------|
| 0 | Rooms & furniture |
| 1 | Household objects |
| 2 | Daily routine verbs |
| 3 | Frequency words |
| 4 | Renting an apartment |
| 5 | Chores |

**Stage 9 — Health & Body**
| Sub | Subtopic |
|-----|----------|
| 0 | Body parts |
| 1 | Common symptoms |
| 2 | Doctor visit phrases |
| 3 | Health habits |
| 4 | Pharmacy vocabulary |
| 5 | Emotional health |

### Phase 4: Social & Practical

**Stage 10 — Work & Study**
| Sub | Subtopic |
|-----|----------|
| 0 | Jobs & professions |
| 1 | Office vocabulary |
| 2 | Education terms |
| 3 | Writing emails |
| 4 | Skills & experience |
| 5 | Career goals |

**Stage 11 — Social Life**
| Sub | Subtopic |
|-----|----------|
| 0 | Making plans |
| 1 | Hobbies & interests |
| 2 | Emotions & feelings |
| 3 | Opinions & preferences |
| 4 | Giving advice |
| 5 | Weather |

**Stage 12 — Travel & Events**
| Sub | Subtopic |
|-----|----------|
| 0 | Booking hotels & flights |
| 1 | Passport & customs |
| 2 | Tourist attractions |
| 3 | Festivals & holidays |
| 4 | Travel emergencies |
| 5 | Describing experiences |

### Phase 5: Broader World

**Stage 13 — Technology & Modern Life**
| Sub | Subtopic |
|-----|----------|
| 0 | Internet & apps |
| 1 | Social media |
| 2 | AI & technology |
| 3 | Online shopping |
| 4 | Digital life |
| 5 | Modern inventions |

**Stage 14 — News & Society**
| Sub | Subtopic |
|-----|----------|
| 0 | News vocabulary |
| 1 | Environmental issues |
| 2 | Social topics |
| 3 | Government & services |
| 4 | Laws & rules |
| 5 | Discussing trends |

**Stage 15 — Culture & History**
| Sub | Subtopic |
|-----|----------|
| 0 | Dynasties & history |
| 1 | Traditional arts |
| 2 | Philosophy |
| 3 | Modern culture |
| 4 | Regional cultures |
| 5 | Cultural comparisons |

### Phase 6: Mastery

**Stage 16 — Advanced Grammar & Structure**
| Sub | Subtopic |
|-----|----------|
| 0 | 把 construction |
| 1 | 被 passive voice |
| 2 | Complex sentences |
| 3 | Conditionals |
| 4 | Resultative complements |
| 5 | Directional complements |

**Stage 17 — Idioms & Nuanced Speech**
| Sub | Subtopic |
|-----|----------|
| 0 | Common 成语 (4-char idioms) |
| 1 | Proverbs & sayings |
| 2 | Internet slang |
| 3 | Speech particles |
| 4 | Regional expressions |
| 5 | Register (formal vs informal) |

**Stage 18 — Professional & Academic Fluency**
| Sub | Subtopic |
|-----|----------|
| 0 | Business presentations |
| 1 | Formal writing |
| 2 | Negotiation |
| 3 | Academic vocabulary |
| 4 | Lectures & note-taking |
| 5 | Debate & argument |

## Example Input

今天天气怎么样？

## Example Output

```json
[
  {
    "mandarin": "今天天气怎么样？",
    "pinyin": "jīn tiān tiān qì zěn me yàng?",
    "translation": "How is the weather today?",
    "stage": 3,
    "sub": 1
  }
]
```

You may receive multiple sentences at once. In that case, return one object per sentence in the array.
