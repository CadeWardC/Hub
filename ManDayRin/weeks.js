// ManDayRin course: 52 themed weeks, one new list every Monday.
// Week entries:
//   words:     [hanzi, pinyin, English, kind, example zh, example pinyin, example English] × 15
//   patterns:  [frame zh, frame pinyin, frame English, example zh, example pinyin, example English]
//   scenarios: { title, zh, setting, cast: [[name, pinyin], ...], lines: [[castIndex, zh, pinyin, English], ...] }
// No word appears in two weeks' lists. Scenarios use this week's words plus earlier weeks'.
window.MANDAYRIN_COURSE = {
  levels: [
    { number: 1, name: "First steps", from: 1, to: 17 },
    { number: 2, name: "Everyday basics", from: 18, to: 34 },
    { number: 3, name: "Growing basics", from: 35, to: 52 }
  ],

  // Character names in scenarios; never split into vocabulary words.
  names: ["大卫", "王芳", "李明", "林美", "安娜", "小美"],

  themes: [
    ["Hello & goodbye", "你好", "Nǐ hǎo"],
    ["Who I am", "我是谁", "Wǒ shì shéi"],
    ["Numbers & age", "数字", "Shùzì"],
    ["My family", "我的家人", "Wǒ de jiārén"],
    ["Days & dates", "日期", "Rìqī"],
    ["Telling time", "几点了", "Jǐ diǎn le"],
    ["Food basics", "吃饭", "Chī fàn"],
    ["At the café", "在咖啡店", "Zài kāfēi diàn"],
    ["At the market", "买东西", "Mǎi dōngxi"],
    ["My home", "我的家", "Wǒ de jiā"],
    ["Daily routine", "每天", "Měi tiān"],
    ["Colors & clothes", "颜色和衣服", "Yánsè hé yīfu"],
    ["School & class", "学校", "Xuéxiào"],
    ["Where is it?", "在哪儿", "Zài nǎr"],
    ["Places in town", "城里", "Chéng lǐ"],
    ["Likes & hobbies", "爱好", "Àihào"],
    ["Volleyball & sports", "排球和运动", "Páiqiú hé yùndòng"],

    ["Subway & bus", "坐地铁", "Zuò dìtiě"],
    ["Taxis & directions", "打车", "Dǎ chē"],
    ["At a restaurant", "在饭馆", "Zài fànguǎn"],
    ["Tastes & cooking", "味道", "Wèidào"],
    ["The body", "身体", "Shēntǐ"],
    ["Seeing a doctor", "看病", "Kàn bìng"],
    ["Phones & messages", "手机", "Shǒujī"],
    ["Shopping for clothes", "买衣服", "Mǎi yīfu"],
    ["At work", "上班", "Shàng bān"],
    ["Making plans", "约朋友", "Yuē péngyou"],
    ["Game day", "比赛日", "Bǐsài rì"],
    ["Animals & pets", "动物", "Dòngwù"],
    ["At the hotel", "在酒店", "Zài jiǔdiàn"],
    ["Airport & flying", "坐飞机", "Zuò fēijī"],
    ["Bank & post office", "银行和邮局", "Yínháng hé yóujú"],
    ["Birthdays & parties", "生日", "Shēngrì"],
    ["Weather & seasons", "天气和季节", "Tiānqì hé jìjié"],

    ["Feelings", "心情", "Xīnqíng"],
    ["Describing people", "他长什么样", "Tā zhǎng shénme yàng"],
    ["Renting an apartment", "租房子", "Zū fángzi"],
    ["Housework & repairs", "做家务", "Zuò jiāwù"],
    ["Nature & outdoors", "大自然", "Dà zìrán"],
    ["Holidays & festivals", "节日", "Jiérì"],
    ["Movies, music & TV", "娱乐", "Yúlè"],
    ["Online shopping & apps", "上网", "Shàng wǎng"],
    ["Studying Chinese", "学中文", "Xué Zhōngwén"],
    ["Jobs & careers", "职业", "Zhíyè"],
    ["Something went wrong", "出问题了", "Chū wèntí le"],
    ["Asking for help", "帮忙", "Bāng máng"],
    ["A weekend trip", "周末旅行", "Zhōumò lǚxíng"],
    ["Chinese food culture", "中国菜", "Zhōngguó cài"],
    ["Giving opinions", "我觉得", "Wǒ juéde"],
    ["Past experiences", "我去过", "Wǒ qù guo"],
    ["Future plans", "将来的计划", "Jiānglái de jìhuà"],
    ["Looking back", "一年回顾", "Yì nián huígù"]
  ],

  weeks: {
    1: {
      words: [
        ["你好", "nǐ hǎo", "hello", "phrase", "你好！你好吗？", "Nǐ hǎo! Nǐ hǎo ma?", "Hello! How are you?"],
        ["再见", "zàijiàn", "goodbye", "phrase", "好，再见！", "Hǎo, zàijiàn!", "Okay, goodbye!"],
        ["谢谢", "xièxie", "thank you", "phrase", "谢谢你！", "Xièxie nǐ!", "Thank you!"],
        ["不客气", "bú kèqi", "you're welcome", "phrase", "谢谢！——不客气。", "Xièxie! — Bú kèqi.", "Thanks! — You're welcome."],
        ["对不起", "duìbuqǐ", "sorry", "phrase", "对不起！——没关系。", "Duìbuqǐ! — Méi guānxi.", "Sorry! — It's okay."],
        ["没关系", "méi guānxi", "it's okay; no problem", "phrase", "没关系，我很好。", "Méi guānxi, wǒ hěn hǎo.", "It's okay, I'm fine."],
        ["早上好", "zǎoshang hǎo", "good morning", "phrase", "早上好！你好吗？", "Zǎoshang hǎo! Nǐ hǎo ma?", "Good morning! How are you?"],
        ["晚安", "wǎn'ān", "good night", "phrase", "晚安，再见！", "Wǎn'ān, zàijiàn!", "Good night, bye!"],
        ["你", "nǐ", "you", "pronoun", "你很好！", "Nǐ hěn hǎo!", "You're very kind!"],
        ["我", "wǒ", "I; me", "pronoun", "我很好。", "Wǒ hěn hǎo.", "I'm well."],
        ["好", "hǎo", "good; well", "adjective", "很好！", "Hěn hǎo!", "Very good!"],
        ["很", "hěn", "very", "adverb", "我很好，谢谢。", "Wǒ hěn hǎo, xièxie.", "I'm very well, thanks."],
        ["也", "yě", "also; too", "adverb", "我也很好。", "Wǒ yě hěn hǎo.", "I'm well too."],
        ["吗", "ma", "(turns a statement into a yes/no question)", "particle", "你好吗？", "Nǐ hǎo ma?", "How are you?"],
        ["呢", "ne", "and you? (bounces a question back)", "particle", "我很好，你呢？", "Wǒ hěn hǎo, nǐ ne?", "I'm well, and you?"]
      ],
      patterns: [
        ["你好吗？", "Nǐ hǎo ma?", "How are you?", "你好吗？——我很好。", "Nǐ hǎo ma? — Wǒ hěn hǎo.", "How are you? — I'm well."],
        ["……，你呢？", "…, nǐ ne?", "…, and you?", "我很好，你呢？", "Wǒ hěn hǎo, nǐ ne?", "I'm well, and you?"]
      ],
      scenarios: [
        {
          title: "Good morning",
          zh: "早上好",
          setting: "Wang Fang and David pass each other on the stairs.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "早上好！", "Zǎoshang hǎo!", "Good morning!"],
            [1, "早上好！你好吗？", "Zǎoshang hǎo! Nǐ hǎo ma?", "Good morning! How are you?"],
            [0, "我很好，谢谢。你呢？", "Wǒ hěn hǎo, xièxie. Nǐ ne?", "I'm well, thanks. And you?"],
            [1, "我也很好。", "Wǒ yě hěn hǎo.", "I'm well too."],
            [0, "好，再见！", "Hǎo, zàijiàn!", "Okay, bye!"],
            [1, "再见！", "Zàijiàn!", "Bye!"]
          ]
        },
        {
          title: "Oops, sorry!",
          zh: "对不起",
          setting: "David bumps into Wang Fang in a doorway.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "对不起！", "Duìbuqǐ!", "Sorry!"],
            [1, "没关系。你好！", "Méi guānxi. Nǐ hǎo!", "No problem. Hi!"],
            [0, "你好！谢谢你。", "Nǐ hǎo! Xièxie nǐ.", "Hi! Thank you."],
            [1, "不客气。", "Bú kèqi.", "You're welcome."],
            [0, "再见！", "Zàijiàn!", "Bye!"],
            [1, "再见！", "Zàijiàn!", "Bye!"]
          ]
        },
        {
          title: "Good night",
          zh: "晚安",
          setting: "Roommates Wang Fang and David at the end of the day.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [1, "王芳，谢谢你！", "Wáng Fāng, xièxie nǐ!", "Wang Fang, thank you!"],
            [0, "不客气！", "Bú kèqi!", "You're welcome!"],
            [1, "你很好。", "Nǐ hěn hǎo.", "You're really kind."],
            [0, "你也很好！", "Nǐ yě hěn hǎo!", "So are you!"],
            [1, "晚安！", "Wǎn'ān!", "Good night!"],
            [0, "晚安！", "Wǎn'ān!", "Good night!"]
          ]
        }
      ]
    },

    2: {
      words: [
        ["是", "shì", "to be (am, is, are)", "verb", "我是美国人。", "Wǒ shì Měiguó rén.", "I'm American."],
        ["叫", "jiào", "to be called", "verb", "我叫大卫。", "Wǒ jiào Dàwèi.", "My name is David."],
        ["名字", "míngzi", "name", "noun", "你叫什么名字？", "Nǐ jiào shénme míngzi?", "What's your name?"],
        ["什么", "shénme", "what", "question", "他叫什么？", "Tā jiào shénme?", "What's his name?"],
        ["谁", "shéi", "who", "question", "她是谁？", "Tā shì shéi?", "Who is she?"],
        ["他", "tā", "he; him", "pronoun", "他是中国人。", "Tā shì Zhōngguó rén.", "He's Chinese."],
        ["她", "tā", "she; her", "pronoun", "她叫王芳。", "Tā jiào Wáng Fāng.", "Her name is Wang Fang."],
        ["我们", "wǒmen", "we; us", "pronoun", "我们是美国人。", "Wǒmen shì Měiguó rén.", "We're American."],
        ["人", "rén", "person; people", "noun", "他是哪国人？", "Tā shì nǎ guó rén?", "Which country is he from?"],
        ["中国", "Zhōngguó", "China", "noun", "王芳是中国人。", "Wáng Fāng shì Zhōngguó rén.", "Wang Fang is Chinese."],
        ["美国", "Měiguó", "the United States", "noun", "你是美国人吗？", "Nǐ shì Měiguó rén ma?", "Are you American?"],
        ["哪", "nǎ", "which", "question", "你是哪国人？", "Nǐ shì nǎ guó rén?", "Where are you from?"],
        ["不", "bù", "not; no", "adverb", "我不是中国人。", "Wǒ bú shì Zhōngguó rén.", "I'm not Chinese."],
        ["认识", "rènshi", "to know (a person); to meet", "verb", "认识你很高兴。", "Rènshi nǐ hěn gāoxìng.", "Nice to meet you."],
        ["高兴", "gāoxìng", "glad; happy", "adjective", "我很高兴。", "Wǒ hěn gāoxìng.", "I'm very happy."]
      ],
      patterns: [
        ["我叫……", "Wǒ jiào …", "My name is …", "我叫大卫。", "Wǒ jiào Dàwèi.", "My name is David."],
        ["你是哪国人？", "Nǐ shì nǎ guó rén?", "Where are you from?", "我是美国人。", "Wǒ shì Měiguó rén.", "I'm American."]
      ],
      scenarios: [
        {
          title: "What's your name?",
          zh: "你叫什么名字？",
          setting: "First day of a language exchange. David sits down next to Wang Fang.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "你好！我叫大卫。你叫什么名字？", "Nǐ hǎo! Wǒ jiào Dàwèi. Nǐ jiào shénme míngzi?", "Hi! I'm David. What's your name?"],
            [1, "你好！我叫王芳。", "Nǐ hǎo! Wǒ jiào Wáng Fāng.", "Hi! I'm Wang Fang."],
            [0, "认识你很高兴。", "Rènshi nǐ hěn gāoxìng.", "Nice to meet you."],
            [1, "我也很高兴认识你。你是美国人吗？", "Wǒ yě hěn gāoxìng rènshi nǐ. Nǐ shì Měiguó rén ma?", "Nice to meet you too. Are you American?"],
            [0, "是，我是美国人。你呢？", "Shì, wǒ shì Měiguó rén. Nǐ ne?", "Yes, I'm American. And you?"],
            [1, "我是中国人。", "Wǒ shì Zhōngguó rén.", "I'm Chinese."]
          ]
        },
        {
          title: "Who is she?",
          zh: "她是谁？",
          setting: "Someone waves at Wang Fang from across the room.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "她是谁？", "Tā shì shéi?", "Who is she?"],
            [1, "她叫林美。", "Tā jiào Lín Měi.", "Her name is Lin Mei."],
            [0, "她是美国人吗？", "Tā shì Měiguó rén ma?", "Is she American?"],
            [1, "不是，她是中国人。", "Bú shì, tā shì Zhōngguó rén.", "No, she's Chinese."],
            [0, "他呢？他叫什么名字？", "Tā ne? Tā jiào shénme míngzi?", "And him? What's his name?"],
            [1, "他叫李明。他也是中国人。", "Tā jiào Lǐ Míng. Tā yě shì Zhōngguó rén.", "His name is Li Ming. He's Chinese too."]
          ]
        },
        {
          title: "Where are you from?",
          zh: "你是哪国人？",
          setting: "Li Ming comes over to meet David.",
          cast: [["李明", "Lǐ Míng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "你好！你是哪国人？", "Nǐ hǎo! Nǐ shì nǎ guó rén?", "Hi! Where are you from?"],
            [1, "我是美国人。我叫大卫。", "Wǒ shì Měiguó rén. Wǒ jiào Dàwèi.", "I'm American. I'm David."],
            [0, "我叫李明。认识你很高兴！", "Wǒ jiào Lǐ Míng. Rènshi nǐ hěn gāoxìng!", "I'm Li Ming. Nice to meet you!"],
            [1, "我也很高兴。她是谁？", "Wǒ yě hěn gāoxìng. Tā shì shéi?", "Me too. Who's she?"],
            [0, "她叫安娜。她不是中国人。", "Tā jiào Ānnà. Tā bú shì Zhōngguó rén.", "That's Anna. She's not Chinese."],
            [1, "她也是美国人吗？", "Tā yě shì Měiguó rén ma?", "Is she American too?"],
            [0, "是，她也是美国人。", "Shì, tā yě shì Měiguó rén.", "Yes, she's American too."]
          ]
        }
      ]
    },

    3: {
      words: [
        ["一", "yī", "one", "number", "一，二，三！", "Yī, èr, sān!", "One, two, three!"],
        ["二", "èr", "two", "number", "我二十岁。", "Wǒ èrshí suì.", "I'm twenty."],
        ["三", "sān", "three", "number", "三个人", "sān ge rén", "three people"],
        ["四", "sì", "four", "number", "她四岁。", "Tā sì suì.", "She's four."],
        ["五", "wǔ", "five", "number", "我们五个人。", "Wǒmen wǔ ge rén.", "There are five of us."],
        ["六", "liù", "six", "number", "他六十六岁。", "Tā liùshíliù suì.", "He's sixty-six."],
        ["七", "qī", "seven", "number", "七个中国人", "qī ge Zhōngguó rén", "seven Chinese people"],
        ["八", "bā", "eight", "number", "她二十八岁。", "Tā èrshíbā suì.", "She's twenty-eight."],
        ["九", "jiǔ", "nine", "number", "九十九", "jiǔshíjiǔ", "ninety-nine"],
        ["十", "shí", "ten", "number", "十个人", "shí ge rén", "ten people"],
        ["两", "liǎng", "two (before a measure word)", "number", "两个美国人", "liǎng ge Měiguó rén", "two Americans"],
        ["个", "gè", "(general measure word)", "measure", "一个中国人", "yí ge Zhōngguó rén", "one Chinese person"],
        ["几", "jǐ", "how many (small numbers)", "question", "你几岁？", "Nǐ jǐ suì?", "How old are you? (to a child)"],
        ["岁", "suì", "years old", "measure", "我三十岁。", "Wǒ sānshí suì.", "I'm thirty."],
        ["多大", "duō dà", "how old", "question", "你多大？", "Nǐ duō dà?", "How old are you?"]
      ],
      patterns: [
        ["我……岁。", "Wǒ … suì.", "I'm … years old.", "我二十五岁。", "Wǒ èrshíwǔ suì.", "I'm twenty-five."],
        ["……个人", "… ge rén", "… people (number + 个 + noun)", "我们六个人。", "Wǒmen liù ge rén.", "There are six of us."]
      ],
      scenarios: [
        {
          title: "How old are you?",
          zh: "你多大？",
          setting: "Wang Fang and David chat after class.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，你多大？", "Dàwèi, nǐ duō dà?", "David, how old are you?"],
            [1, "我二十五岁。你呢？", "Wǒ èrshíwǔ suì. Nǐ ne?", "I'm twenty-five. And you?"],
            [0, "我也二十五岁！", "Wǒ yě èrshíwǔ suì!", "I'm twenty-five too!"],
            [1, "很好！", "Hěn hǎo!", "Nice!"],
            [0, "李明呢？他多大？", "Lǐ Míng ne? Tā duō dà?", "What about Li Ming? How old is he?"],
            [1, "他二十八岁。", "Tā èrshíbā suì.", "He's twenty-eight."]
          ]
        },
        {
          title: "A little neighbor",
          zh: "你几岁？",
          setting: "Wang Fang meets a little girl in the courtyard.",
          cast: [["王芳", "Wáng Fāng"], ["小美", "Xiǎoměi"]],
          lines: [
            [0, "你好！你叫什么名字？", "Nǐ hǎo! Nǐ jiào shénme míngzi?", "Hi! What's your name?"],
            [1, "我叫小美。", "Wǒ jiào Xiǎoměi.", "I'm Xiaomei."],
            [0, "小美，你几岁？", "Xiǎoměi, nǐ jǐ suì?", "Xiaomei, how old are you?"],
            [1, "我六岁！你几岁？", "Wǒ liù suì! Nǐ jǐ suì?", "I'm six! How old are you?"],
            [0, "我二十五岁。", "Wǒ èrshíwǔ suì.", "I'm twenty-five."],
            [1, "二十五！", "Èrshíwǔ!", "Twenty-five!"]
          ]
        },
        {
          title: "How many of us?",
          zh: "我们几个人？",
          setting: "Friends gather before dinner. David counts heads.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "我们几个人？", "Wǒmen jǐ ge rén?", "How many of us are there?"],
            [1, "一，二，三，四，五……五个人。", "Yī, èr, sān, sì, wǔ… wǔ ge rén.", "One, two, three, four, five… five people."],
            [0, "李明呢？", "Lǐ Míng ne?", "What about Li Ming?"],
            [1, "六个人！", "Liù ge rén!", "Six people!"],
            [0, "两个美国人，四个中国人。", "Liǎng ge Měiguó rén, sì ge Zhōngguó rén.", "Two Americans, four Chinese."],
            [1, "很好！", "Hěn hǎo!", "Great!"]
          ]
        }
      ]
    },

    4: {
      words: [
        ["的", "de", "(shows possession, like 's)", "particle", "她是我的妹妹。", "Tā shì wǒ de mèimei.", "She's my younger sister."],
        ["家", "jiā", "home; family", "noun", "我家很大。", "Wǒ jiā hěn dà.", "My family is big."],
        ["爸爸", "bàba", "dad", "noun", "我爸爸五十岁。", "Wǒ bàba wǔshí suì.", "My dad is fifty."],
        ["妈妈", "māma", "mom", "noun", "我妈妈是中国人。", "Wǒ māma shì Zhōngguó rén.", "My mom is Chinese."],
        ["哥哥", "gēge", "older brother", "noun", "我有一个哥哥。", "Wǒ yǒu yí ge gēge.", "I have an older brother."],
        ["姐姐", "jiějie", "older sister", "noun", "李明有两个姐姐。", "Lǐ Míng yǒu liǎng ge jiějie.", "Li Ming has two older sisters."],
        ["弟弟", "dìdi", "younger brother", "noun", "我弟弟八岁。", "Wǒ dìdi bā suì.", "My little brother is eight."],
        ["妹妹", "mèimei", "younger sister", "noun", "你有妹妹吗？", "Nǐ yǒu mèimei ma?", "Do you have a younger sister?"],
        ["有", "yǒu", "to have", "verb", "你有哥哥吗？", "Nǐ yǒu gēge ma?", "Do you have an older brother?"],
        ["没有", "méiyǒu", "to not have", "verb", "我没有姐姐。", "Wǒ méiyǒu jiějie.", "I don't have an older sister."],
        ["口", "kǒu", "(measure word for family members)", "measure", "我家有四口人。", "Wǒ jiā yǒu sì kǒu rén.", "There are four people in my family."],
        ["和", "hé", "and", "conjunction", "我爸爸和妈妈都是美国人。", "Wǒ bàba hé māma dōu shì Měiguó rén.", "My dad and mom are both American."],
        ["都", "dōu", "all; both", "adverb", "我们都很好。", "Wǒmen dōu hěn hǎo.", "We're all well."],
        ["大", "dà", "big; old (in age)", "adjective", "你家大吗？", "Nǐ jiā dà ma?", "Is your family big?"],
        ["小", "xiǎo", "small; young", "adjective", "我妹妹很小。", "Wǒ mèimei hěn xiǎo.", "My little sister is very young."]
      ],
      patterns: [
        ["你家有几口人？", "Nǐ jiā yǒu jǐ kǒu rén?", "How many people are in your family?", "我家有五口人。", "Wǒ jiā yǒu wǔ kǒu rén.", "There are five people in my family."],
        ["我有…… / 我没有……", "Wǒ yǒu … / Wǒ méiyǒu …", "I have … / I don't have …", "我有妹妹，没有哥哥。", "Wǒ yǒu mèimei, méiyǒu gēge.", "I have younger sisters but no older brother."]
      ],
      scenarios: [
        {
          title: "How many in your family?",
          zh: "你家有几口人？",
          setting: "Wang Fang asks David about his family.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，你家有几口人？", "Dàwèi, nǐ jiā yǒu jǐ kǒu rén?", "David, how many people are in your family?"],
            [1, "我家有五口人：爸爸、妈妈、两个妹妹和我。", "Wǒ jiā yǒu wǔ kǒu rén: bàba, māma, liǎng ge mèimei hé wǒ.", "Five: my dad, my mom, my two younger sisters and me."],
            [0, "你有哥哥吗？", "Nǐ yǒu gēge ma?", "Do you have an older brother?"],
            [1, "没有，我没有哥哥。你呢？", "Méiyǒu, wǒ méiyǒu gēge. Nǐ ne?", "No, I don't. And you?"],
            [0, "我家有四口人。我有一个弟弟。", "Wǒ jiā yǒu sì kǒu rén. Wǒ yǒu yí ge dìdi.", "There are four of us. I have a younger brother."],
            [1, "你弟弟多大？", "Nǐ dìdi duō dà?", "How old is your brother?"],
            [0, "他十九岁。", "Tā shíjiǔ suì.", "He's nineteen."]
          ]
        },
        {
          title: "Not my sister!",
          zh: "她是我妈妈",
          setting: "At a party, Li Ming meets the woman standing with Wang Fang.",
          cast: [["李明", "Lǐ Míng"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "她是你姐姐吗？", "Tā shì nǐ jiějie ma?", "Is she your older sister?"],
            [1, "不是，她是我妈妈！", "Bú shì, tā shì wǒ māma!", "No, she's my mom!"],
            [0, "你妈妈？她多大？", "Nǐ māma? Tā duō dà?", "Your mom? How old is she?"],
            [1, "她五十岁。", "Tā wǔshí suì.", "She's fifty."],
            [0, "五十岁？她不是你姐姐吗？", "Wǔshí suì? Tā bú shì nǐ jiějie ma?", "Fifty? She's really not your sister?"],
            [1, "不是！谢谢你，李明！", "Bú shì! Xièxie nǐ, Lǐ Míng!", "No! But thank you, Li Ming!"]
          ]
        },
        {
          title: "A big family",
          zh: "我家很大",
          setting: "David and Li Ming compare families.",
          cast: [["大卫", "Dàwèi"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，你有姐姐吗？", "Lǐ Míng, nǐ yǒu jiějie ma?", "Li Ming, do you have older sisters?"],
            [1, "有，我有两个姐姐、一个哥哥和一个弟弟。", "Yǒu, wǒ yǒu liǎng ge jiějie, yí ge gēge hé yí ge dìdi.", "Yes — two older sisters, an older brother and a younger brother."],
            [0, "你家很大！", "Nǐ jiā hěn dà!", "Your family is big!"],
            [1, "是，我家有七口人。你有弟弟妹妹吗？", "Shì, wǒ jiā yǒu qī kǒu rén. Nǐ yǒu dìdi mèimei ma?", "Yes, there are seven of us. Do you have younger siblings?"],
            [0, "我有两个妹妹，一个十八岁，一个二十岁。", "Wǒ yǒu liǎng ge mèimei, yí ge shíbā suì, yí ge èrshí suì.", "I have two younger sisters. One is eighteen and one is twenty."],
            [1, "你家也很大！", "Nǐ jiā yě hěn dà!", "Your family's big too!"]
          ]
        }
      ]
    }
  }
};
