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
  names: ["大卫", "王芳", "李明", "林美", "安娜", "小美", "张老师"],

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
        ["们", "men", "(plural for people: 我们 we, 你们 you all, 他们 they)", "particle", "你们好！我们是美国人。", "Nǐmen hǎo! Wǒmen shì Měiguó rén.", "Hi, everyone! We're American."],
        ["人", "rén", "person; people", "noun", "我是美国人，他是中国人。", "Wǒ shì Měiguó rén, tā shì Zhōngguó rén.", "I'm American, and he's Chinese."],
        ["中国", "Zhōngguó", "China", "noun", "王芳是中国人。", "Wáng Fāng shì Zhōngguó rén.", "Wang Fang is Chinese."],
        ["美国", "Měiguó", "the United States", "noun", "你是美国人吗？", "Nǐ shì Měiguó rén ma?", "Are you American?"],
        ["哪", "nǎ", "which", "question", "你是哪国人？", "Nǐ shì nǎ guó rén?", "Where are you from?"],
        ["不", "bù", "not; no", "adverb", "我不是中国人。", "Wǒ bú shì Zhōngguó rén.", "I'm not Chinese."],
        ["认识", "rènshi", "to know (a person); to meet", "verb", "认识你很高兴。", "Rènshi nǐ hěn gāoxìng.", "Nice to meet you."],
        ["高兴", "gāoxìng", "glad; happy", "adjective", "我很高兴。", "Wǒ hěn gāoxìng.", "I'm very happy."]
      ],
      patterns: [
        ["我叫……", "Wǒ jiào …", "My name is …", "我叫大卫。", "Wǒ jiào Dàwèi.", "My name is David."],
        ["你是……人吗？", "Nǐ shì … rén ma?", "Are you …? (nationality)", "你是中国人吗？——不是，我是美国人。", "Nǐ shì Zhōngguó rén ma? — Bú shì, wǒ shì Měiguó rén.", "Are you Chinese? — No, I'm American."]
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
          title: "Are you Chinese?",
          zh: "你是中国人吗？",
          setting: "Li Ming comes over to meet David.",
          cast: [["李明", "Lǐ Míng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "你好！你是中国人吗？", "Nǐ hǎo! Nǐ shì Zhōngguó rén ma?", "Hi! Are you Chinese?"],
            [1, "不是，我是美国人。我叫大卫。", "Bú shì, wǒ shì Měiguó rén. Wǒ jiào Dàwèi.", "No, I'm American. I'm David."],
            [0, "我叫李明。认识你很高兴！", "Wǒ jiào Lǐ Míng. Rènshi nǐ hěn gāoxìng!", "I'm Li Ming. Nice to meet you!"],
            [1, "我也很高兴。她是谁？", "Wǒ yě hěn gāoxìng. Tā shì shéi?", "Me too. Who's she?"],
            [0, "她叫安娜。她不是中国人。", "Tā jiào Ānnà. Tā bú shì Zhōngguó rén.", "That's Anna. She's not Chinese."],
            [1, "她也是美国人吗？", "Tā yě shì Měiguó rén ma?", "Is she American too?"],
            [0, "是。你们是美国人，我们是中国人。", "Shì. Nǐmen shì Měiguó rén, wǒmen shì Zhōngguó rén.", "Yes. You two are American, and we're Chinese."]
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
        ["没", "méi", "not; didn't; don't have (没有 = don't have)", "adverb", "我没有姐姐，也没有妹妹。", "Wǒ méiyǒu jiějie, yě méiyǒu mèimei.", "I don't have an older sister or a younger sister."],
        ["口", "kǒu", "(measure word for family members)", "measure", "我家有四口人。", "Wǒ jiā yǒu sì kǒu rén.", "There are four people in my family."],
        ["和", "hé", "and", "conjunction", "我爸爸和妈妈都是美国人。", "Wǒ bàba hé māma dōu shì Měiguó rén.", "My dad and mom are both American."],
        ["都", "dōu", "all; both", "adverb", "我们都很好。", "Wǒmen dōu hěn hǎo.", "We're all well."],
        ["大", "dà", "big; old (in age)", "adjective", "你家大吗？", "Nǐ jiā dà ma?", "Is your family big?"],
        ["小", "xiǎo", "small; young", "adjective", "我妹妹很小。", "Wǒ mèimei hěn xiǎo.", "My little sister is very young."]
      ],
      patterns: [
        ["你家有几口人？", "Nǐ jiā yǒu jǐ kǒu rén?", "How many people are in your family?", "我家有五口人。", "Wǒ jiā yǒu wǔ kǒu rén.", "There are five people in my family."],
        ["我有…… / 我没有……", "Wǒ yǒu … / Wǒ méiyǒu …", "I have … / I don't have …", "我有妹妹，没有哥哥。", "Wǒ yǒu mèimei, méiyǒu gēge.", "I have a younger sister, but no older brother."]
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
            [1, "没有。你呢？", "Méiyǒu. Nǐ ne?", "No, I don't. What about you?"],
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
    },

    5: {
      words: [
        ["今天", "jīntiān", "today", "noun", "今天星期几？", "Jīntiān xīngqī jǐ?", "What day is it today?"],
        ["明天", "míngtiān", "tomorrow", "noun", "明天是星期六。", "Míngtiān shì xīngqīliù.", "Tomorrow is Saturday."],
        ["昨天", "zuótiān", "yesterday", "noun", "昨天是星期五。", "Zuótiān shì xīngqīwǔ.", "Yesterday was Friday."],
        ["星期", "xīngqī", "week (星期一 = Monday)", "noun", "今天星期一。", "Jīntiān xīngqīyī.", "Today is Monday."],
        ["天", "tiān", "day (星期天 = Sunday)", "noun", "星期天我不忙。", "Xīngqītiān wǒ bù máng.", "I'm not busy on Sunday."],
        ["月", "yuè", "month", "noun", "我十月去中国。", "Wǒ shí yuè qù Zhōngguó.", "I'm going to China in October."],
        ["号", "hào", "day of the month (date)", "measure", "今天几号？", "Jīntiān jǐ hào?", "What's the date today?"],
        ["年", "nián", "year", "noun", "一年有十二个月。", "Yì nián yǒu shí'èr ge yuè.", "A year has twelve months."],
        ["今年", "jīnnián", "this year", "noun", "我今年二十五岁。", "Wǒ jīnnián èrshíwǔ suì.", "I'm twenty-five this year."],
        ["周末", "zhōumò", "weekend", "noun", "周末你忙吗？", "Zhōumò nǐ máng ma?", "Are you busy this weekend?"],
        ["去", "qù", "to go", "verb", "周末你去吗？", "Zhōumò nǐ qù ma?", "Are you going this weekend?"],
        ["来", "lái", "to come", "verb", "明天你来吗？", "Míngtiān nǐ lái ma?", "Are you coming tomorrow?"],
        ["忙", "máng", "busy", "adjective", "我今天很忙。", "Wǒ jīntiān hěn máng.", "I'm very busy today."],
        ["上", "shàng", "last; previous (上个星期 = last week)", "time", "上个星期我很忙。", "Shàng ge xīngqī wǒ hěn máng.", "I was busy last week."],
        ["下", "xià", "next (下个月 = next month)", "time", "我妈妈下个月来。", "Wǒ māma xià ge yuè lái.", "My mom is coming next month."]
      ],
      patterns: [
        ["今天星期几？", "Jīntiān xīngqī jǐ?", "What day is it today?", "今天星期三。", "Jīntiān xīngqīsān.", "Today is Wednesday."],
        ["……月……号", "… yuè … hào", "month + day (dates)", "我爸爸五月九号来。", "Wǒ bàba wǔ yuè jiǔ hào lái.", "My dad is coming on May 9th."]
      ],
      scenarios: [
        {
          title: "What's the date?",
          zh: "今天几号？",
          setting: "David has lost track of the days.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，今天星期几？", "Wáng Fāng, jīntiān xīngqī jǐ?", "Wang Fang, what day is it today?"],
            [1, "今天星期五。", "Jīntiān xīngqīwǔ.", "It's Friday."],
            [0, "今天几号？", "Jīntiān jǐ hào?", "What's the date?"],
            [1, "今天十月九号。", "Jīntiān shí yuè jiǔ hào.", "It's October 9th."],
            [0, "十月九号？明天李明二十九岁！", "Shí yuè jiǔ hào? Míngtiān Lǐ Míng èrshíjiǔ suì!", "October 9th? Li Ming turns twenty-nine tomorrow!"],
            [1, "是！明天我们都去他家。", "Shì! Míngtiān wǒmen dōu qù tā jiā.", "That's right! We're all going to his place tomorrow."]
          ]
        },
        {
          title: "How old this year?",
          zh: "你今年多大？",
          setting: "Li Ming and Anna talk about their ages.",
          cast: [["李明", "Lǐ Míng"], ["安娜", "Ānnà"]],
          lines: [
            [0, "安娜，你今年多大？", "Ānnà, nǐ jīnnián duō dà?", "Anna, how old are you this year?"],
            [1, "我今年二十六岁。你呢？", "Wǒ jīnnián èrshíliù suì. Nǐ ne?", "I'm twenty-six this year. And you?"],
            [0, "今天二十八岁，明天二十九岁！", "Jīntiān èrshíbā suì, míngtiān èrshíjiǔ suì!", "Twenty-eight today, twenty-nine tomorrow!"],
            [1, "明天？明天几号？", "Míngtiān? Míngtiān jǐ hào?", "Tomorrow? What's the date tomorrow?"],
            [0, "明天十月十号。", "Míngtiān shí yuè shí hào.", "Tomorrow is October 10th."],
            [1, "明天我们都来！", "Míngtiān wǒmen dōu lái!", "We'll all come over tomorrow!"]
          ]
        },
        {
          title: "Busy this weekend?",
          zh: "周末你忙吗？",
          setting: "Wang Fang wants to invite David over.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，周末你忙吗？", "Dàwèi, zhōumò nǐ máng ma?", "David, are you busy this weekend?"],
            [1, "星期六我很忙。星期天不忙。", "Xīngqīliù wǒ hěn máng. Xīngqītiān bù máng.", "I'm busy Saturday, but not Sunday."],
            [0, "星期天你来我家吗？", "Xīngqītiān nǐ lái wǒ jiā ma?", "Do you want to come to my place on Sunday?"],
            [1, "好！你爸爸妈妈也来吗？", "Hǎo! Nǐ bàba māma yě lái ma?", "Sure! Are your parents coming too?"],
            [0, "不来。我爸爸妈妈下个月来。", "Bù lái. Wǒ bàba māma xià ge yuè lái.", "No. My parents are coming next month."],
            [1, "好，星期天我去你家！", "Hǎo, xīngqītiān wǒ qù nǐ jiā!", "Great, I'll come over on Sunday!"]
          ]
        }
      ]
    },

    6: {
      words: [
        ["点", "diǎn", "o'clock", "measure", "现在三点。", "Xiànzài sān diǎn.", "It's three o'clock."],
        ["分", "fēn", "minute", "measure", "现在八点十分。", "Xiànzài bā diǎn shí fēn.", "It's 8:10."],
        ["半", "bàn", "half (七点半 = 7:30)", "number", "我七点半起床。", "Wǒ qī diǎn bàn qǐchuáng.", "I get up at 7:30."],
        ["现在", "xiànzài", "now", "noun", "现在几点？", "Xiànzài jǐ diǎn?", "What time is it now?"],
        ["时候", "shíhou", "time (什么时候 = when)", "noun", "你什么时候来？", "Nǐ shénme shíhou lái?", "When are you coming?"],
        ["上午", "shàngwǔ", "morning (a.m.)", "noun", "我上午很忙。", "Wǒ shàngwǔ hěn máng.", "I'm busy in the morning."],
        ["中午", "zhōngwǔ", "noon", "noun", "中午你来吗？", "Zhōngwǔ nǐ lái ma?", "Are you coming at noon?"],
        ["下午", "xiàwǔ", "afternoon (p.m.)", "noun", "我下午两点去。", "Wǒ xiàwǔ liǎng diǎn qù.", "I'm going at 2 p.m."],
        ["晚上", "wǎnshang", "evening; night", "noun", "我晚上十一点睡觉。", "Wǒ wǎnshang shíyī diǎn shuìjiào.", "I go to bed at 11 at night."],
        ["起床", "qǐchuáng", "to get up", "verb", "你几点起床？", "Nǐ jǐ diǎn qǐchuáng?", "What time do you get up?"],
        ["睡觉", "shuìjiào", "to sleep; to go to bed", "verb", "你几点睡觉？", "Nǐ jǐ diǎn shuìjiào?", "What time do you go to bed?"],
        ["等", "děng", "to wait", "verb", "等我！", "Děng wǒ!", "Wait for me!"],
        ["早", "zǎo", "early", "adjective", "你很早！", "Nǐ hěn zǎo!", "You're early!"],
        ["晚", "wǎn", "late", "adjective", "对不起，我晚了。", "Duìbuqǐ, wǒ wǎn le.", "Sorry, I'm late."],
        ["了", "le", "(marks a change or something done)", "particle", "几点了？", "Jǐ diǎn le?", "What time is it?"]
      ],
      patterns: [
        ["现在几点？——现在……点。", "Xiànzài jǐ diǎn? — Xiànzài … diǎn.", "What time is it? — It's … o'clock.", "现在九点半。", "Xiànzài jiǔ diǎn bàn.", "It's 9:30."],
        ["你几点……？", "Nǐ jǐ diǎn …?", "What time do you …?", "你几点起床？——我六点起床。", "Nǐ jǐ diǎn qǐchuáng? — Wǒ liù diǎn qǐchuáng.", "What time do you get up? — At six."]
      ],
      scenarios: [
        {
          title: "What time is it?",
          zh: "几点了？",
          setting: "David wakes up in a panic and can't find his phone.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，几点了？", "Wáng Fāng, jǐ diǎn le?", "Wang Fang, what time is it?"],
            [1, "现在八点半。", "Xiànzài bā diǎn bàn.", "It's 8:30."],
            [0, "八点半？我晚了！", "Bā diǎn bàn? Wǒ wǎn le!", "8:30? I'm late!"],
            [1, "你什么时候去？", "Nǐ shénme shíhou qù?", "When do you have to go?"],
            [0, "九点！对不起，再见！", "Jiǔ diǎn! Duìbuqǐ, zàijiàn!", "At nine! Sorry, bye!"],
            [1, "等等！今天星期六！", "Děngdeng! Jīntiān xīngqīliù!", "Wait! It's Saturday!"]
          ]
        },
        {
          title: "Early bird, night owl",
          zh: "你几点起床？",
          setting: "Li Ming and David compare their sleep schedules.",
          cast: [["李明", "Lǐ Míng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，你几点起床？", "Dàwèi, nǐ jǐ diǎn qǐchuáng?", "David, what time do you get up?"],
            [1, "我上午十点起床。", "Wǒ shàngwǔ shí diǎn qǐchuáng.", "I get up at ten in the morning."],
            [0, "十点？很晚！我六点起床。", "Shí diǎn? Hěn wǎn! Wǒ liù diǎn qǐchuáng.", "Ten? That's late! I get up at six."],
            [1, "六点？很早！你几点睡觉？", "Liù diǎn? Hěn zǎo! Nǐ jǐ diǎn shuìjiào?", "Six? That's early! What time do you go to bed?"],
            [0, "晚上十点。你呢？", "Wǎnshang shí diǎn. Nǐ ne?", "Ten at night. You?"],
            [1, "我两点睡觉。", "Wǒ liǎng diǎn shuìjiào.", "I go to bed at two."]
          ]
        },
        {
          title: "Lunch at noon",
          zh: "中午你忙吗？",
          setting: "Wang Fang calls Anna to make plans.",
          cast: [["王芳", "Wáng Fāng"], ["安娜", "Ānnà"]],
          lines: [
            [0, "安娜，明天中午你忙吗？", "Ānnà, míngtiān zhōngwǔ nǐ máng ma?", "Anna, are you busy tomorrow at noon?"],
            [1, "中午不忙。下午很忙。", "Zhōngwǔ bù máng. Xiàwǔ hěn máng.", "Not at noon. I'm busy in the afternoon."],
            [0, "十二点你来我家，好吗？", "Shí'èr diǎn nǐ lái wǒ jiā, hǎo ma?", "Come to my place at twelve, okay?"],
            [1, "好！我十一点五十分来。", "Hǎo! Wǒ shíyī diǎn wǔshí fēn lái.", "Okay! I'll come at 11:50."],
            [0, "很早！好，我等你。", "Hěn zǎo! Hǎo, wǒ děng nǐ.", "Nice and early! Okay, I'll be waiting."]
          ]
        }
      ]
    },

    7: {
      words: [
        ["吃", "chī", "to eat", "verb", "你吃饭了吗？", "Nǐ chī fàn le ma?", "Have you eaten? (a friendly greeting)"],
        ["喝", "hē", "to drink", "verb", "你想喝什么？", "Nǐ xiǎng hē shénme?", "What would you like to drink?"],
        ["饭", "fàn", "meal; cooked rice", "noun", "我们去吃饭！", "Wǒmen qù chī fàn!", "Let's go eat!"],
        ["面条", "miàntiáo", "noodles", "noun", "我很喜欢吃面条。", "Wǒ hěn xǐhuan chī miàntiáo.", "I really like noodles."],
        ["菜", "cài", "dish; vegetables", "noun", "妈妈做的菜很好吃。", "Māma zuò de cài hěn hǎochī.", "Mom's cooking is delicious."],
        ["肉", "ròu", "meat", "noun", "我不吃肉。", "Wǒ bù chī ròu.", "I don't eat meat."],
        ["鸡蛋", "jīdàn", "egg", "noun", "早饭我吃两个鸡蛋。", "Zǎofàn wǒ chī liǎng ge jīdàn.", "I eat two eggs for breakfast."],
        ["水果", "shuǐguǒ", "fruit", "noun", "你喜欢吃水果吗？", "Nǐ xǐhuan chī shuǐguǒ ma?", "Do you like fruit?"],
        ["包子", "bāozi", "steamed bun", "noun", "我想吃包子。", "Wǒ xiǎng chī bāozi.", "I'd like some steamed buns."],
        ["真", "zhēn", "really; truly", "adverb", "妈妈做的包子真好吃！", "Māma zuò de bāozi zhēn hǎochī!", "Mom's steamed buns are really good!"],
        ["饿", "è", "hungry", "adjective", "我很饿！", "Wǒ hěn è!", "I'm so hungry!"],
        ["好吃", "hǎochī", "tasty; delicious", "adjective", "很好吃！", "Hěn hǎochī!", "Delicious!"],
        ["想", "xiǎng", "to want to; would like", "verb", "你想吃什么？", "Nǐ xiǎng chī shénme?", "What do you want to eat?"],
        ["做", "zuò", "to make; to do", "verb", "我做饭。", "Wǒ zuò fàn.", "I'll cook."],
        ["喜欢", "xǐhuan", "to like", "verb", "她不喜欢吃鸡蛋。", "Tā bù xǐhuan chī jīdàn.", "She doesn't like eggs."]
      ],
      patterns: [
        ["你想吃什么？——我想吃……", "Nǐ xiǎng chī shénme? — Wǒ xiǎng chī …", "What do you want to eat? — I'd like …", "我想吃面条。", "Wǒ xiǎng chī miàntiáo.", "I'd like noodles."],
        ["我（不）喜欢……", "Wǒ (bù) xǐhuan …", "I (don't) like …", "我喜欢水果，不喜欢肉。", "Wǒ xǐhuan shuǐguǒ, bù xǐhuan ròu.", "I like fruit, not meat."]
      ],
      scenarios: [
        {
          title: "Have you eaten?",
          zh: "你吃饭了吗？",
          setting: "David comes home in the evening.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，你吃饭了吗？", "Dàwèi, nǐ chī fàn le ma?", "David, have you eaten?"],
            [1, "没有。我很饿！", "Méiyǒu. Wǒ hěn è!", "No. I'm starving!"],
            [0, "你想吃什么？", "Nǐ xiǎng chī shénme?", "What do you want to eat?"],
            [1, "我想吃面条。你呢？", "Wǒ xiǎng chī miàntiáo. Nǐ ne?", "I'd like noodles. You?"],
            [0, "我也想吃面条。我来做！", "Wǒ yě xiǎng chī miàntiáo. Wǒ lái zuò!", "Noodles for me too. I'll make them!"],
            [1, "谢谢你！", "Xièxie nǐ!", "Thank you!"]
          ]
        },
        {
          title: "Breakfast",
          zh: "早饭",
          setting: "Morning at Li Ming's family home.",
          cast: [["李明", "Lǐ Míng"], ["李明的妈妈", "Lǐ Míng de māma"]],
          lines: [
            [1, "李明，起床了！吃早饭！", "Lǐ Míng, qǐchuáng le! Chī zǎofàn!", "Li Ming, time to get up! Breakfast!"],
            [0, "妈妈，早上好！早饭有什么？", "Māma, zǎoshang hǎo! Zǎofàn yǒu shénme?", "Morning, Mom! What's for breakfast?"],
            [1, "有包子和鸡蛋。", "Yǒu bāozi hé jīdàn.", "Steamed buns and eggs."],
            [0, "我喜欢吃包子！有肉包子吗？", "Wǒ xǐhuan chī bāozi! Yǒu ròu bāozi ma?", "I love buns! Are there meat ones?"],
            [1, "有。你也吃水果。", "Yǒu. Nǐ yě chī shuǐguǒ.", "Yes. Have some fruit too."],
            [0, "好。真好吃！谢谢妈妈！", "Hǎo. Zhēn hǎochī! Xièxie māma!", "Okay. So good! Thanks, Mom!"]
          ]
        },
        {
          title: "I don't eat meat",
          zh: "我不吃肉",
          setting: "Anna comes to Wang Fang's place for dinner.",
          cast: [["王芳", "Wáng Fāng"], ["安娜", "Ānnà"]],
          lines: [
            [0, "安娜，你喜欢吃肉吗？", "Ānnà, nǐ xǐhuan chī ròu ma?", "Anna, do you like meat?"],
            [1, "对不起，我不吃肉。", "Duìbuqǐ, wǒ bù chī ròu.", "Sorry, I don't eat meat."],
            [0, "没关系！你吃鸡蛋吗？", "Méi guānxi! Nǐ chī jīdàn ma?", "No problem! Do you eat eggs?"],
            [1, "吃。我也很喜欢菜和水果。", "Chī. Wǒ yě hěn xǐhuan cài hé shuǐguǒ.", "Yes. I love vegetables and fruit too."],
            [0, "好，我做鸡蛋面条。", "Hǎo, wǒ zuò jīdàn miàntiáo.", "Great, I'll make egg noodles."],
            [1, "很好吃！谢谢你！", "Hěn hǎochī! Xièxie nǐ!", "Delicious! Thank you!"]
          ]
        }
      ]
    },

    8: {
      words: [
        ["咖啡", "kāfēi", "coffee", "noun", "我要一杯咖啡。", "Wǒ yào yì bēi kāfēi.", "A coffee, please."],
        ["茶", "chá", "tea", "noun", "你喝茶还是咖啡？", "Nǐ hē chá háishi kāfēi?", "Tea or coffee?"],
        ["水", "shuǐ", "water", "noun", "给我一杯水，谢谢。", "Gěi wǒ yì bēi shuǐ, xièxie.", "A glass of water, please."],
        ["牛奶", "niúnǎi", "milk", "noun", "咖啡要牛奶吗？", "Kāfēi yào niúnǎi ma?", "Milk in your coffee?"],
        ["果汁", "guǒzhī", "juice", "noun", "小美喜欢喝果汁。", "Xiǎoměi xǐhuan hē guǒzhī.", "Xiaomei likes juice."],
        ["吧", "ba", "(makes a suggestion or softens a request: let's …)", "particle", "我们去喝咖啡吧！", "Wǒmen qù hē kāfēi ba!", "Let's go get a coffee!"],
        ["冰", "bīng", "ice (冰的 = iced)", "noun", "果汁要冰的吗？", "Guǒzhī yào bīng de ma?", "Do you want your juice iced?"],
        ["钱", "qián", "money", "noun", "一杯咖啡多少钱？", "Yì bēi kāfēi duōshao qián?", "How much is a coffee?"],
        ["要", "yào", "to want; would like", "verb", "你要什么？", "Nǐ yào shénme?", "What would you like?"],
        ["给", "gěi", "to give", "verb", "给你。", "Gěi nǐ.", "Here you go."],
        ["热", "rè", "hot", "adjective", "我要热咖啡。", "Wǒ yào rè kāfēi.", "I'd like a hot coffee."],
        ["杯", "bēi", "cup; glass (measure word)", "measure", "两杯茶", "liǎng bēi chá", "two cups of tea"],
        ["还是", "háishi", "or (in questions)", "conjunction", "热的还是冰的？", "Rè de háishi bīng de?", "Hot or iced?"],
        ["多少", "duōshao", "how much; how many", "question", "多少钱？", "Duōshao qián?", "How much is it?"],
        ["块", "kuài", "yuan (spoken)", "measure", "二十八块。", "Èrshíbā kuài.", "28 yuan."]
      ],
      patterns: [
        ["我要一杯……", "Wǒ yào yì bēi …", "I'd like a cup of …", "我要一杯热茶。", "Wǒ yào yì bēi rè chá.", "I'd like a hot tea."],
        ["……还是……？", "… háishi …?", "… or …? (choice question)", "你要茶还是咖啡？", "Nǐ yào chá háishi kāfēi?", "Would you like tea or coffee?"]
      ],
      scenarios: [
        {
          title: "Ordering a coffee",
          zh: "我要一杯咖啡",
          setting: "David orders at the counter of a small café.",
          cast: [["服务员", "fúwùyuán (server)"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "你好！你要什么？", "Nǐ hǎo! Nǐ yào shénme?", "Hi! What can I get you?"],
            [1, "我要一杯咖啡。", "Wǒ yào yì bēi kāfēi.", "A coffee, please."],
            [0, "热的还是冰的？", "Rè de háishi bīng de?", "Hot or iced?"],
            [1, "冰的吧，今天很热。", "Bīng de ba, jīntiān hěn rè.", "Iced, I think — it's hot today."],
            [0, "要牛奶吗？", "Yào niúnǎi ma?", "Any milk?"],
            [1, "要。多少钱？", "Yào. Duōshao qián?", "Yes, please. How much?"],
            [0, "二十八块。", "Èrshíbā kuài.", "28 yuan."],
            [1, "给你。", "Gěi nǐ.", "Here you go."]
          ]
        },
        {
          title: "Tea for two",
          zh: "两杯茶",
          setting: "Wang Fang orders for herself and her mom.",
          cast: [["王芳", "Wáng Fāng"], ["服务员", "fúwùyuán (server)"]],
          lines: [
            [0, "你好，我要两杯茶。", "Nǐ hǎo, wǒ yào liǎng bēi chá.", "Hi, two teas, please."],
            [1, "热茶还是冰茶？", "Rè chá háishi bīng chá?", "Hot tea or iced tea?"],
            [0, "一杯热茶，一杯冰茶。", "Yì bēi rè chá, yì bēi bīng chá.", "One hot, one iced."],
            [1, "好的。要包子吗？", "Hǎo de. Yào bāozi ma?", "Okay. Would you like some buns?"],
            [0, "不要，谢谢。多少钱？", "Bú yào, xièxie. Duōshao qián?", "No, thanks. How much?"],
            [1, "两杯茶，三十块。", "Liǎng bēi chá, sānshí kuài.", "Two teas, 30 yuan."],
            [0, "给你。", "Gěi nǐ.", "Here you are."]
          ]
        },
        {
          title: "Juice for Xiaomei",
          zh: "果汁",
          setting: "Wang Fang takes little Xiaomei to a café on a hot day.",
          cast: [["王芳", "Wáng Fāng"], ["小美", "Xiǎoměi"]],
          lines: [
            [0, "小美，你想喝什么？", "Xiǎoměi, nǐ xiǎng hē shénme?", "Xiaomei, what would you like to drink?"],
            [1, "我要咖啡！", "Wǒ yào kāfēi!", "I want coffee!"],
            [0, "咖啡？你六岁！", "Kāfēi? Nǐ liù suì!", "Coffee? You're six!"],
            [1, "好吧……我要果汁。", "Hǎo ba… wǒ yào guǒzhī.", "Fine… I'll have juice."],
            [0, "果汁要冰的吗？", "Guǒzhī yào bīng de ma?", "Do you want your juice iced?"],
            [1, "要！我也要水，今天真热！", "Yào! Wǒ yě yào shuǐ, jīntiān zhēn rè!", "Yes! And water too, it's so hot today!"],
            [0, "好，给你。", "Hǎo, gěi nǐ.", "Okay, here you go."]
          ]
        }
      ]
    },

    9: {
      words: [
        ["买", "mǎi", "to buy", "verb", "我想买水果。", "Wǒ xiǎng mǎi shuǐguǒ.", "I'd like to buy some fruit."],
        ["卖", "mài", "to sell", "verb", "你们卖鸡蛋吗？", "Nǐmen mài jīdàn ma?", "Do you sell eggs?"],
        ["东西", "dōngxi", "thing; stuff", "noun", "我去买东西。", "Wǒ qù mǎi dōngxi.", "I'm going shopping."],
        ["苹果", "píngguǒ", "apple", "noun", "我要三个苹果。", "Wǒ yào sān ge píngguǒ.", "Three apples, please."],
        ["百", "bǎi", "hundred", "number", "我有一百块，我们去买东西吧！", "Wǒ yǒu yìbǎi kuài, wǒmen qù mǎi dōngxi ba!", "I've got a hundred yuan — let's go shopping!"],
        ["只", "zhǐ", "only (also zhī: measure word for animals)", "adverb", "我只要一斤。", "Wǒ zhǐ yào yì jīn.", "I only want one jin."],
        ["鱼", "yú", "fish", "noun", "你喜欢吃鱼吗？", "Nǐ xǐhuan chī yú ma?", "Do you like fish?"],
        ["斤", "jīn", "jin (half a kilo)", "measure", "一斤苹果多少钱？", "Yì jīn píngguǒ duōshao qián?", "How much is a jin of apples?"],
        ["贵", "guì", "expensive", "adjective", "今天鱼很贵。", "Jīntiān yú hěn guì.", "Fish is expensive today."],
        ["便宜", "piányi", "cheap", "adjective", "今天苹果很便宜。", "Jīntiān píngguǒ hěn piányi.", "Apples are cheap today."],
        ["太", "tài", "too (太贵了 = too expensive)", "adverb", "太贵了！", "Tài guì le!", "That's too expensive!"],
        ["一点儿", "yìdiǎnr", "a little", "phrase", "便宜一点儿，好吗？", "Piányi yìdiǎnr, hǎo ma?", "Could you make it a bit cheaper?"],
        ["这", "zhè", "this", "pronoun", "这是什么？", "Zhè shì shénme?", "What's this?"],
        ["那", "nà", "that", "pronoun", "那是什么鱼？", "Nà shì shénme yú?", "What kind of fish is that?"],
        ["怎么", "zěnme", "how (怎么卖 = how much is it?)", "question", "这个怎么卖？", "Zhège zěnme mài?", "How much is this one?"]
      ],
      patterns: [
        ["……怎么卖？——……块一斤。", "… zěnme mài? — … kuài yì jīn.", "How much is …? — … yuan a jin.", "鱼怎么卖？——三十块一斤。", "Yú zěnme mài? — Sānshí kuài yì jīn.", "How much is the fish? — Thirty yuan a jin."],
        ["太……了！", "Tài … le!", "Too …! / So …!", "太贵了！便宜一点儿，好吗？", "Tài guì le! Piányi yìdiǎnr, hǎo ma?", "That's too expensive! Could you make it a bit cheaper?"]
      ],
      scenarios: [
        {
          title: "How much are the apples?",
          zh: "苹果怎么卖？",
          setting: "Wang Fang stops at a fruit stall in the morning market.",
          cast: [["王芳", "Wáng Fāng"], ["店员", "diànyuán (seller)"]],
          lines: [
            [1, "你好！你想买什么？", "Nǐ hǎo! Nǐ xiǎng mǎi shénme?", "Hi! What would you like?"],
            [0, "苹果怎么卖？", "Píngguǒ zěnme mài?", "How much are the apples?"],
            [1, "五块一斤。", "Wǔ kuài yì jīn.", "Five yuan a jin."],
            [0, "太贵了！便宜一点儿，好吗？", "Tài guì le! Piányi yìdiǎnr, hǎo ma?", "That's too much! Could you go a bit lower?"],
            [1, "好，四块一斤。", "Hǎo, sì kuài yì jīn.", "Okay, four yuan a jin."],
            [0, "好，我要两斤。", "Hǎo, wǒ yào liǎng jīn.", "Great, I'll take two jin."],
            [1, "八块。你只买苹果吗？", "Bā kuài. Nǐ zhǐ mǎi píngguǒ ma?", "That's eight yuan. Just the apples?"],
            [0, "只买苹果，谢谢。给你八块。", "Zhǐ mǎi píngguǒ, xièxie. Gěi nǐ bā kuài.", "Just the apples, thanks. Here's eight yuan."]
          ]
        },
        {
          title: "A big fish",
          zh: "大鱼",
          setting: "David stops at a fish stall in the market.",
          cast: [["大卫", "Dàwèi"], ["店员", "diànyuán (seller)"]],
          lines: [
            [1, "卖鱼！便宜的鱼！", "Mài yú! Piányi de yú!", "Fish for sale! Cheap fish!"],
            [0, "鱼怎么卖？", "Yú zěnme mài?", "How much is the fish?"],
            [1, "二十块一斤。这个大的五斤，一百块。", "Èrshí kuài yì jīn. Zhège dà de wǔ jīn, yìbǎi kuài.", "Twenty yuan a jin. This big one's five jin, so a hundred yuan."],
            [0, "太大了！我只想买一个小的。", "Tài dà le! Wǒ zhǐ xiǎng mǎi yí ge xiǎo de.", "That's way too big! I only want a small one."],
            [1, "那个小的两斤，四十块。", "Nàge xiǎo de liǎng jīn, sìshí kuài.", "That small one's two jin — forty yuan."],
            [0, "好，我买那个。", "Hǎo, wǒ mǎi nàge.", "Great, I'll take that one."],
            [1, "好，给你。", "Hǎo, gěi nǐ.", "Okay, here you go."]
          ]
        },
        {
          title: "Shopping with Mom",
          zh: "买东西",
          setting: "Li Ming goes to the market with his mom on Saturday morning.",
          cast: [["李明的妈妈", "Lǐ Míng de māma"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，我们去买东西。", "Lǐ Míng, wǒmen qù mǎi dōngxi.", "Li Ming, let's go shopping."],
            [1, "好！我们买什么？", "Hǎo! Wǒmen mǎi shénme?", "Okay! What are we getting?"],
            [0, "买鱼和菜。晚上我做鱼。", "Mǎi yú hé cài. Wǎnshang wǒ zuò yú.", "Fish and vegetables. I'm cooking fish tonight."],
            [1, "妈妈，那是什么？他卖什么？", "Māma, nà shì shénme? Tā mài shénme?", "Mom, what's that? What's he selling?"],
            [0, "他卖苹果。你想吃吗？", "Tā mài píngguǒ. Nǐ xiǎng chī ma?", "He's selling apples. Do you want some?"],
            [1, "想！苹果贵吗？", "Xiǎng! Píngguǒ guì ma?", "Yes! Are they expensive?"],
            [0, "不贵，三块一斤。", "Bú guì, sān kuài yì jīn.", "Not at all, three yuan a jin."]
          ]
        }
      ]
    },

    10: {
      words: [
        ["房子", "fángzi", "house", "noun", "我爸爸妈妈的房子很大。", "Wǒ bàba māma de fángzi hěn dà.", "My parents' house is big."],
        ["房间", "fángjiān", "room", "noun", "我的房间很小。", "Wǒ de fángjiān hěn xiǎo.", "My room is small."],
        ["厨房", "chúfáng", "kitchen", "noun", "妈妈在厨房做饭。", "Māma zài chúfáng zuò fàn.", "Mom is cooking in the kitchen."],
        ["客厅", "kètīng", "living room", "noun", "大卫在客厅睡觉。", "Dàwèi zài kètīng shuìjiào.", "David is sleeping in the living room."],
        ["洗手间", "xǐshǒujiān", "bathroom", "noun", "我家有两个洗手间。", "Wǒ jiā yǒu liǎng ge xǐshǒujiān.", "Our place has two bathrooms."],
        ["床", "chuáng", "bed", "noun", "我的床太小了。", "Wǒ de chuáng tài xiǎo le.", "My bed is way too small."],
        ["桌子", "zhuōzi", "table; desk", "noun", "桌子上有咖啡。", "Zhuōzi shàng yǒu kāfēi.", "There's coffee on the table."],
        ["张", "zhāng", "(measure word for flat things: beds, tables, tickets, photos)", "measure", "我的房间里有一张床和一张桌子。", "Wǒ de fángjiān lǐ yǒu yì zhāng chuáng hé yì zhāng zhuōzi.", "My room has a bed and a desk."],
        ["门", "mén", "door", "noun", "谁在门口？", "Shéi zài ménkǒu?", "Who's at the door?"],
        ["可以", "kěyǐ", "can; may", "verb", "我可以去洗手间吗？", "Wǒ kěyǐ qù xǐshǒujiān ma?", "May I use the bathroom?"],
        ["住", "zhù", "to live (somewhere)", "verb", "我爸爸妈妈住在美国。", "Wǒ bàba māma zhù zài Měiguó.", "My parents live in the US."],
        ["在", "zài", "to be at; in", "verb", "王芳在家吗？", "Wáng Fāng zài jiā ma?", "Is Wang Fang home?"],
        ["里", "lǐ", "inside", "position", "厨房里有什么？", "Chúfáng lǐ yǒu shénme?", "What's in the kitchen?"],
        ["新", "xīn", "new", "adjective", "这是新桌子吗？", "Zhè shì xīn zhuōzi ma?", "Is this a new table?"],
        ["漂亮", "piàoliang", "pretty; beautiful", "adjective", "你的房间很漂亮！", "Nǐ de fángjiān hěn piàoliang!", "Your room is lovely!"]
      ],
      patterns: [
        ["……在……（里）", "… zài … (lǐ)", "… is in …", "王芳在厨房里。", "Wáng Fāng zài chúfáng lǐ.", "Wang Fang is in the kitchen."],
        ["……里有……", "… lǐ yǒu …", "There is/are … in …", "客厅里有一张新桌子。", "Kètīng lǐ yǒu yì zhāng xīn zhuōzi.", "There's a new table in the living room."]
      ],
      scenarios: [
        {
          title: "Our place",
          zh: "我们的家",
          setting: "Wang Fang shows Anna around the apartment she shares with David.",
          cast: [["王芳", "Wáng Fāng"], ["安娜", "Ānnà"]],
          lines: [
            [1, "你们的家真漂亮！", "Nǐmen de jiā zhēn piàoliang!", "Your place is beautiful!"],
            [0, "谢谢！这是客厅。这张桌子是新的。", "Xièxie! Zhè shì kètīng. Zhè zhāng zhuōzi shì xīn de.", "Thanks! This is the living room. This table is new."],
            [1, "那是厨房吗？很大！", "Nà shì chúfáng ma? Hěn dà!", "Is that the kitchen? It's big!"],
            [0, "是。这是我的房间。", "Shì. Zhè shì wǒ de fángjiān.", "Yes. And this is my room."],
            [1, "你的房间很漂亮！大卫的房间呢？", "Nǐ de fángjiān hěn piàoliang! Dàwèi de fángjiān ne?", "Your room is lovely! And David's room?"],
            [0, "大卫在房间里睡觉。我们不去吧！", "Dàwèi zài fángjiān lǐ shuìjiào. Wǒmen bú qù ba!", "David's in there asleep. Let's not go in!"]
          ]
        },
        {
          title: "Who's at the door?",
          zh: "谁在门口？",
          setting: "Saturday morning: someone knocks while David is in the bathroom.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"], ["小美", "Xiǎoměi"]],
          lines: [
            [0, "大卫，门口有人！", "Dàwèi, ménkǒu yǒu rén!", "David, someone's at the door!"],
            [1, "我在洗手间里！你去吧！", "Wǒ zài xǐshǒujiān lǐ! Nǐ qù ba!", "I'm in the bathroom! You get it!"],
            [0, "谁在门口？", "Shéi zài ménkǒu?", "Who is it?"],
            [2, "是我，小美！大卫在家吗？", "Shì wǒ, Xiǎoměi! Dàwèi zài jiā ma?", "It's me, Xiaomei! Is David home?"],
            [0, "在。来，我们在客厅等他。", "Zài. Lái, wǒmen zài kètīng děng tā.", "He is. Come on in, we'll wait for him in the living room."],
            [2, "你们的客厅很漂亮！这张桌子是新的吗？", "Nǐmen de kètīng hěn piàoliang! Zhè zhāng zhuōzi shì xīn de ma?", "Your living room is so pretty! Is this table new?"],
            [0, "是，是新的。", "Shì, shì xīn de.", "Yes, it's new."]
          ]
        },
        {
          title: "Do you live at home?",
          zh: "你住在家里吗？",
          setting: "David and Li Ming talk about where they live.",
          cast: [["大卫", "Dàwèi"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，你住在家里吗？", "Lǐ Míng, nǐ zhù zài jiā lǐ ma?", "Li Ming, do you live at home?"],
            [1, "是，我和爸爸妈妈住。我家的房子很大。", "Shì, wǒ hé bàba māma zhù. Wǒ jiā de fángzi hěn dà.", "Yes, I live with my parents. Our house is big."],
            [0, "有几个房间？", "Yǒu jǐ ge fángjiān?", "How many rooms?"],
            [1, "五个房间，两个洗手间。你的房间大吗？", "Wǔ ge fángjiān, liǎng ge xǐshǒujiān. Nǐ de fángjiān dà ma?", "Five rooms and two bathrooms. Is your room big?"],
            [0, "不大。我的床太小了！", "Bú dà. Wǒ de chuáng tài xiǎo le!", "Not really. My bed is way too small!"],
            [1, "星期六你可以来我家吃饭吗？", "Xīngqīliù nǐ kěyǐ lái wǒ jiā chī fàn ma?", "Can you come to my place for dinner on Saturday?"],
            [0, "可以！谢谢！", "Kěyǐ! Xièxie!", "Sure! Thanks!"]
          ]
        }
      ]
    },

    11: {
      words: [
        ["每", "měi", "every", "pronoun", "我每天六点起床。", "Wǒ měi tiān liù diǎn qǐchuáng.", "I get up at six every day."],
        ["洗澡", "xǐzǎo", "to shower; to bathe", "verb", "我晚上洗澡。", "Wǒ wǎnshang xǐzǎo.", "I shower in the evening."],
        ["刷牙", "shuāyá", "to brush your teeth", "verb", "你刷牙了吗？", "Nǐ shuāyá le ma?", "Have you brushed your teeth?"],
        ["可是", "kěshì", "but", "conjunction", "我想去，可是我太累了。", "Wǒ xiǎng qù, kěshì wǒ tài lèi le.", "I'd like to go, but I'm too tired."],
        ["穿", "chuān", "to wear; to put on", "verb", "今天你穿什么？", "Jīntiān nǐ chuān shénme?", "What are you wearing today?"],
        ["回家", "huíjiā", "to go home", "verb", "你几点回家？", "Nǐ jǐ diǎn huíjiā?", "What time are you coming home?"],
        ["出门", "chūmén", "to go out", "verb", "我八点出门。", "Wǒ bā diǎn chūmén.", "I leave the house at eight."],
        ["午饭", "wǔfàn", "lunch", "noun", "你午饭吃什么？", "Nǐ wǔfàn chī shénme?", "What are you having for lunch?"],
        ["晚饭", "wǎnfàn", "dinner", "noun", "今天我做晚饭。", "Jīntiān wǒ zuò wǎnfàn.", "I'm making dinner today."],
        ["然后", "ránhòu", "then; after that", "conjunction", "我先吃早饭，然后出门。", "Wǒ xiān chī zǎofàn, ránhòu chūmén.", "I have breakfast first, then head out."],
        ["先", "xiān", "first", "adverb", "我先洗澡！", "Wǒ xiān xǐzǎo!", "I'm showering first!"],
        ["常常", "chángcháng", "often", "adverb", "我常常喝咖啡。", "Wǒ chángcháng hē kāfēi.", "I often drink coffee."],
        ["累", "lèi", "tired", "adjective", "我今天很累。", "Wǒ jīntiān hěn lèi.", "I'm really tired today."],
        ["休息", "xiūxi", "to rest", "verb", "周末我在家休息。", "Zhōumò wǒ zài jiā xiūxi.", "I rest at home on weekends."],
        ["看", "kàn", "to look; to watch; to read", "verb", "你看，那是小美！", "Nǐ kàn, nà shì Xiǎoměi!", "Look, that's Xiaomei!"]
      ],
      patterns: [
        ["先……，然后……", "Xiān …, ránhòu …", "First …, then …", "我先刷牙，然后吃早饭。", "Wǒ xiān shuāyá, ránhòu chī zǎofàn.", "I brush my teeth first, then have breakfast."],
        ["我每天……", "Wǒ měi tiān …", "Every day I …", "我每天七点出门。", "Wǒ měi tiān qī diǎn chūmén.", "I leave the house at seven every day."]
      ],
      scenarios: [
        {
          title: "The early riser",
          zh: "你每天几点起床？",
          setting: "David asks Li Ming about his morning routine.",
          cast: [["大卫", "Dàwèi"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，你每天几点起床？", "Lǐ Míng, nǐ měi tiān jǐ diǎn qǐchuáng?", "Li Ming, what time do you get up every day?"],
            [1, "五点半。我先洗澡，然后吃早饭。", "Wǔ diǎn bàn. Wǒ xiān xǐzǎo, ránhòu chī zǎofàn.", "Five thirty. I shower first, then have breakfast."],
            [0, "你几点出门？", "Nǐ jǐ diǎn chūmén?", "What time do you leave the house?"],
            [1, "七点。你呢？", "Qī diǎn. Nǐ ne?", "Seven. What about you?"],
            [0, "我常常八点五十起床，九点出门！", "Wǒ chángcháng bā diǎn wǔshí qǐchuáng, jiǔ diǎn chūmén!", "I usually get up at 8:50 and leave at nine!"],
            [1, "你不吃早饭吗？", "Nǐ bù chī zǎofàn ma?", "You don't eat breakfast?"],
            [0, "不吃。我只喝一杯咖啡。", "Bù chī. Wǒ zhǐ hē yì bēi kāfēi.", "Nope. I just have a cup of coffee."]
          ]
        },
        {
          title: "Who showers first?",
          zh: "我先洗澡",
          setting: "A weekday morning in Wang Fang and David's apartment.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，我先洗澡，好吗？", "Dàwèi, wǒ xiān xǐzǎo, hǎo ma?", "David, can I shower first?"],
            [1, "好吧。我先吃早饭。", "Hǎo ba. Wǒ xiān chī zǎofàn.", "Fine. I'll have breakfast first."],
            [0, "今天你几点回家？", "Jīntiān nǐ jǐ diǎn huíjiā?", "What time are you coming home today?"],
            [1, "六点。今天我做晚饭！", "Liù diǎn. Jīntiān wǒ zuò wǎnfàn!", "Six. I'm making dinner tonight!"],
            [0, "太好了！你做什么？", "Tài hǎo le! Nǐ zuò shénme?", "Great! What are you making?"],
            [1, "鱼和菜。", "Yú hé cài.", "Fish and vegetables."]
          ]
        },
        {
          title: "A long day",
          zh: "我很累",
          setting: "David gets home late after a busy day.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [1, "我回家了！", "Wǒ huíjiā le!", "I'm home!"],
            [0, "你好！累了吧？", "Nǐ hǎo! Lèi le ba?", "Hi! You must be tired."],
            [1, "真累。今天太忙了，午饭也没吃。", "Zhēn lèi. Jīntiān tài máng le, wǔfàn yě méi chī.", "Really tired. It was so busy I didn't even have lunch."],
            [0, "你先休息。晚饭七点。", "Nǐ xiān xiūxi. Wǎnfàn qī diǎn.", "Rest first. Dinner's at seven."],
            [1, "我很饿，可是我想先洗澡。", "Wǒ hěn è, kěshì wǒ xiǎng xiān xǐzǎo.", "I'm hungry, but I want to shower first."],
            [0, "你看，桌子上有水果。你先吃一点儿吧。", "Nǐ kàn, zhuōzi shàng yǒu shuǐguǒ. Nǐ xiān chī yìdiǎnr ba.", "Look, there's fruit on the table. Have a little first."],
            [1, "谢谢你！", "Xièxie nǐ!", "Thank you!"]
          ]
        }
      ]
    },

    12: {
      words: [
        ["颜色", "yánsè", "color", "noun", "你喜欢什么颜色？", "Nǐ xǐhuan shénme yánsè?", "What color do you like?"],
        ["红", "hóng", "red", "adjective", "小美喜欢红的。", "Xiǎoměi xǐhuan hóng de.", "Xiaomei likes red ones."],
        ["白", "bái", "white", "adjective", "我的鞋是白的。", "Wǒ de xié shì bái de.", "My shoes are white."],
        ["黑", "hēi", "black", "adjective", "我喜欢穿黑裤子。", "Wǒ xǐhuan chuān hēi kùzi.", "I like wearing black pants."],
        ["蓝", "lán", "blue", "adjective", "这件蓝衣服很漂亮。", "Zhè jiàn lán yīfu hěn piàoliang.", "This blue top is pretty."],
        ["绿", "lǜ", "green", "adjective", "我喜欢喝绿茶。", "Wǒ xǐhuan hē lǜchá.", "I like green tea."],
        ["黄", "huáng", "yellow", "adjective", "小美的帽子是黄的。", "Xiǎoměi de màozi shì huáng de.", "Xiaomei's hat is yellow."],
        ["衣服", "yīfu", "clothes", "noun", "我想去买衣服。", "Wǒ xiǎng qù mǎi yīfu.", "I want to go clothes shopping."],
        ["裤子", "kùzi", "pants", "noun", "裤子太大了！", "Kùzi tài dà le!", "These pants are too big!"],
        ["裙子", "qúnzi", "skirt; dress", "noun", "你的裙子很漂亮！", "Nǐ de qúnzi hěn piàoliang!", "Your dress is lovely!"],
        ["鞋", "xié", "shoes", "noun", "我的鞋在门口。", "Wǒ de xié zài ménkǒu.", "My shoes are by the door."],
        ["帽子", "màozi", "hat", "noun", "我想买一个帽子。", "Wǒ xiǎng mǎi yí ge màozi.", "I want to buy a hat."],
        ["件", "jiàn", "(measure word for clothes)", "measure", "这件衣服怎么卖？", "Zhè jiàn yīfu zěnme mài?", "How much is this top?"],
        ["双", "shuāng", "pair", "measure", "我想买一双新鞋。", "Wǒ xiǎng mǎi yì shuāng xīn xié.", "I want to buy a new pair of shoes."],
        ["好看", "hǎokàn", "good-looking", "adjective", "你穿这件很好看！", "Nǐ chuān zhè jiàn hěn hǎokàn!", "That looks great on you!"]
      ],
      patterns: [
        ["……是什么颜色的？", "… shì shénme yánsè de?", "What color is …?", "你的新鞋是什么颜色的？——是红的。", "Nǐ de xīn xié shì shénme yánsè de? — Shì hóng de.", "What color are your new shoes? — Red."],
        ["一件衣服 / 一双鞋", "yí jiàn yīfu / yì shuāng xié", "a top (件) / a pair of shoes (双)", "我买了一件衣服和一双鞋。", "Wǒ mǎi le yí jiàn yīfu hé yì shuāng xié.", "I bought a top and a pair of shoes."]
      ],
      scenarios: [
        {
          title: "Which color?",
          zh: "什么颜色？",
          setting: "Wang Fang is shopping for a new top.",
          cast: [["店员", "diànyuán (shop assistant)"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "你好！你想看什么？", "Nǐ hǎo! Nǐ xiǎng kàn shénme?", "Hi! What are you looking for?"],
            [1, "我想买一件衣服。这件有什么颜色？", "Wǒ xiǎng mǎi yí jiàn yīfu. Zhè jiàn yǒu shénme yánsè?", "I'd like a top. What colors does this one come in?"],
            [0, "有白的、黑的和蓝的。", "Yǒu bái de, hēi de hé lán de.", "White, black and blue."],
            [1, "有红的吗？", "Yǒu hóng de ma?", "Do you have red?"],
            [0, "没有红的。可是蓝的也很好看！", "Méiyǒu hóng de. Kěshì lán de yě hěn hǎokàn!", "No red, sorry. But the blue one looks great too!"],
            [1, "好，我要蓝的。多少钱？", "Hǎo, wǒ yào lán de. Duōshao qián?", "Okay, I'll take the blue one. How much?"],
            [0, "九十块。", "Jiǔshí kuài.", "Ninety yuan."]
          ]
        },
        {
          title: "New shoes",
          zh: "新鞋",
          setting: "David comes home with a shopping bag.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，你看！我的新鞋！", "Wáng Fāng, nǐ kàn! Wǒ de xīn xié!", "Wang Fang, look! My new shoes!"],
            [1, "真好看！是绿的和黄的！", "Zhēn hǎokàn! Shì lǜ de hé huáng de!", "They look great! Green and yellow!"],
            [0, "你喜欢这个颜色吗？", "Nǐ xǐhuan zhège yánsè ma?", "Do you like the colors?"],
            [1, "喜欢。多少钱？", "Xǐhuan. Duōshao qián?", "I do. How much were they?"],
            [0, "两双鞋，九十块！", "Liǎng shuāng xié, jiǔshí kuài!", "Two pairs for ninety yuan!"],
            [1, "太便宜了！我也想买一双。", "Tài piányi le! Wǒ yě xiǎng mǎi yì shuāng.", "That's so cheap! I want a pair too."]
          ]
        },
        {
          title: "A red dress",
          zh: "红裙子",
          setting: "Xiaomei runs over to show Wang Fang her new outfit.",
          cast: [["小美", "Xiǎoměi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，你看我的新裙子！", "Wáng Fāng, nǐ kàn wǒ de xīn qúnzi!", "Wang Fang, look at my new dress!"],
            [1, "很漂亮！是红的，我很喜欢。", "Hěn piàoliang! Shì hóng de, wǒ hěn xǐhuan.", "So pretty! It's red — I love it."],
            [0, "我也有新帽子，是黄的！", "Wǒ yě yǒu xīn màozi, shì huáng de!", "I've got a new hat too — a yellow one!"],
            [1, "红裙子，黄帽子，很好看！", "Hóng qúnzi, huáng màozi, hěn hǎokàn!", "Red dress, yellow hat — you look great!"],
            [0, "你喜欢穿裙子吗？", "Nǐ xǐhuan chuān qúnzi ma?", "Do you like wearing dresses?"],
            [1, "喜欢，可是我常常穿裤子。今天我穿黑裤子和白鞋。", "Xǐhuan, kěshì wǒ chángcháng chuān kùzi. Jīntiān wǒ chuān hēi kùzi hé bái xié.", "I do, but I usually wear pants. Today it's black pants and white shoes."]
          ]
        }
      ]
    },

    13: {
      words: [
        ["学校", "xuéxiào", "school", "noun", "我们学校很大。", "Wǒmen xuéxiào hěn dà.", "Our school is big."],
        ["老师", "lǎoshī", "teacher", "noun", "老师，我有一个问题。", "Lǎoshī, wǒ yǒu yí ge wèntí.", "Teacher, I have a question."],
        ["学生", "xuésheng", "student", "noun", "我是学生，不是老师。", "Wǒ shì xuésheng, bú shì lǎoshī.", "I'm a student, not a teacher."],
        ["同学", "tóngxué", "classmate", "noun", "李明是我的同学。", "Lǐ Míng shì wǒ de tóngxué.", "Li Ming is my classmate."],
        ["书", "shū", "book", "noun", "这是谁的书？", "Zhè shì shéi de shū?", "Whose book is this?"],
        ["本", "běn", "(measure word for books)", "measure", "我买了三本书。", "Wǒ mǎi le sān běn shū.", "I bought three books."],
        ["用", "yòng", "to use", "verb", "我可以用你的书吗？", "Wǒ kěyǐ yòng nǐ de shū ma?", "Can I use your book?"],
        ["上课", "shàngkè", "to have class", "verb", "我们几点上课？", "Wǒmen jǐ diǎn shàngkè?", "What time does class start?"],
        ["学习", "xuéxí", "to study", "verb", "你喜欢学习吗？", "Nǐ xǐhuan xuéxí ma?", "Do you like studying?"],
        ["写", "xiě", "to write", "verb", "他写了一本书。", "Tā xiě le yì běn shū.", "He wrote a book."],
        ["学", "xué", "to learn", "verb", "我想学做中国菜。", "Wǒ xiǎng xué zuò Zhōngguó cài.", "I want to learn to cook Chinese food."],
        ["问题", "wèntí", "question; problem", "noun", "你有问题吗？", "Nǐ yǒu wèntí ma?", "Do you have any questions?"],
        ["懂", "dǒng", "to understand", "verb", "你懂吗？——我懂了。", "Nǐ dǒng ma? — Wǒ dǒng le.", "Do you get it? — Got it."],
        ["难", "nán", "difficult", "adjective", "这个问题很难。", "Zhège wèntí hěn nán.", "This question is hard."],
        ["容易", "róngyì", "easy", "adjective", "这本书很容易。", "Zhè běn shū hěn róngyì.", "This book is easy."]
      ],
      patterns: [
        ["……懂吗？——懂了。/ 不懂。", "… dǒng ma? — Dǒng le. / Bù dǒng.", "Do you understand? — Got it. / I don't understand.", "你懂吗？——对不起，我不懂。", "Nǐ dǒng ma? — Duìbuqǐ, wǒ bù dǒng.", "Do you understand? — Sorry, I don't."],
        ["……很难 / ……很容易", "… hěn nán / … hěn róngyì", "… is hard / … is easy", "这个问题不难，很容易。", "Zhège wèntí bù nán, hěn róngyì.", "This question isn't hard — it's easy."]
      ],
      scenarios: [
        {
          title: "First day of class",
          zh: "新学生",
          setting: "David arrives early for his first Chinese class.",
          cast: [["张老师", "Zhāng lǎoshī (teacher)"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "你好！你是新学生吗？", "Nǐ hǎo! Nǐ shì xīn xuésheng ma?", "Hello! Are you a new student?"],
            [1, "是，我叫大卫。我是美国人。", "Shì, wǒ jiào Dàwèi. Wǒ shì Měiguó rén.", "Yes, I'm David. I'm American."],
            [0, "我是张老师。我们九点上课。", "Wǒ shì Zhāng lǎoshī. Wǒmen jiǔ diǎn shàngkè.", "I'm Teacher Zhang. Class starts at nine."],
            [1, "老师，我没有书。", "Lǎoshī, wǒ méiyǒu shū.", "Teacher, I don't have the book."],
            [0, "没关系。给你一本，你先用吧。", "Méi guānxi. Gěi nǐ yì běn, nǐ xiān yòng ba.", "No problem. Here's one — use it for now."],
            [1, "太好了！谢谢老师！", "Tài hǎo le! Xièxie lǎoshī!", "Great! Thank you!"]
          ]
        },
        {
          title: "A hard one",
          zh: "很难！",
          setting: "Teacher Zhang writes a sentence and asks David to write it too.",
          cast: [["张老师", "Zhāng lǎoshī (teacher)"], ["大卫", "Dàwèi"], ["安娜", "Ānnà"]],
          lines: [
            [0, "大卫，你看我写，然后你也写。", "Dàwèi, nǐ kàn wǒ xiě, ránhòu nǐ yě xiě.", "David, watch me write it, then you write it too."],
            [1, "好。", "Hǎo.", "Okay."],
            [0, "你懂吗？", "Nǐ dǒng ma?", "Do you understand it?"],
            [1, "对不起，老师，我不懂。这个很难！", "Duìbuqǐ, lǎoshī, wǒ bù dǒng. Zhège hěn nán!", "Sorry, I don't get it. This one's hard!"],
            [2, "不难！很容易。我写给你看。", "Bù nán! Hěn róngyì. Wǒ xiě gěi nǐ kàn.", "It's not hard! It's easy. I'll write it out for you."],
            [1, "我懂了！谢谢你，安娜！", "Wǒ dǒng le! Xièxie nǐ, Ānnà!", "Oh, I get it now! Thanks, Anna!"],
            [0, "很好！有问题吗？", "Hěn hǎo! Yǒu wèntí ma?", "Very good! Any questions?"],
            [2, "没有！", "Méiyǒu!", "Nope!"]
          ]
        },
        {
          title: "How's school?",
          zh: "你的学校",
          setting: "Back home, Wang Fang asks David about his Chinese class.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，你的学校大吗？", "Dàwèi, nǐ de xuéxiào dà ma?", "David, is your school big?"],
            [1, "很大。我每天上午上课。", "Hěn dà. Wǒ měi tiān shàngwǔ shàngkè.", "Pretty big. I have class every morning."],
            [0, "你的同学是谁？", "Nǐ de tóngxué shì shéi?", "Who are your classmates?"],
            [1, "安娜是我的同学。她也是美国人。", "Ānnà shì wǒ de tóngxué. Tā yě shì Měiguó rén.", "Anna's in my class. She's American too."],
            [0, "学习难吗？", "Xuéxí nán ma?", "Is it hard?"],
            [1, "看不难，可是写很难！", "Kàn bù nán, kěshì xiě hěn nán!", "Reading's okay, but writing is tough!"],
            [0, "周末我做你的老师！你想学什么？", "Zhōumò wǒ zuò nǐ de lǎoshī! Nǐ xiǎng xué shénme?", "I'll be your teacher this weekend! What do you want to learn?"],
            [1, "太好了！我想学写。谢谢你！", "Tài hǎo le! Wǒ xiǎng xué xiě. Xièxie nǐ!", "Awesome! I want to learn to write. Thanks!"]
          ]
        }
      ]
    },

    14: {
      words: [
        ["哪儿", "nǎr", "where", "question", "洗手间在哪儿？", "Xǐshǒujiān zài nǎr?", "Where's the bathroom?"],
        ["这儿", "zhèr", "here", "pronoun", "我在这儿！", "Wǒ zài zhèr!", "I'm over here!"],
        ["那儿", "nàr", "there", "pronoun", "你的书在那儿。", "Nǐ de shū zài nàr.", "Your book is over there."],
        ["前面", "qiánmiàn", "in front", "position", "学校在前面。", "Xuéxiào zài qiánmiàn.", "The school is up ahead."],
        ["后面", "hòumiàn", "behind", "position", "厨房在客厅后面。", "Chúfáng zài kètīng hòumiàn.", "The kitchen is behind the living room."],
        ["左边", "zuǒbian", "left side", "position", "左边的门是我的房间。", "Zuǒbian de mén shì wǒ de fángjiān.", "The door on the left is my room."],
        ["右边", "yòubian", "right side", "position", "大卫在王芳右边。", "Dàwèi zài Wáng Fāng yòubian.", "David is on Wang Fang's right."],
        ["旁边", "pángbiān", "next to", "position", "我家旁边有一个学校。", "Wǒ jiā pángbiān yǒu yí ge xuéxiào.", "There's a school next to my home."],
        ["上面", "shàngmiàn", "on top", "position", "茶在桌子上面。", "Chá zài zhuōzi shàngmiàn.", "The tea is on the table."],
        ["下面", "xiàmiàn", "underneath", "position", "鞋在床下面。", "Xié zài chuáng xiàmiàn.", "The shoes are under the bed."],
        ["中间", "zhōngjiān", "in the middle", "position", "小美在爸爸妈妈中间。", "Xiǎoměi zài bàba māma zhōngjiān.", "Xiaomei is between her mom and dad."],
        ["对面", "duìmiàn", "across from", "position", "我住在学校对面。", "Wǒ zhù zài xuéxiào duìmiàn.", "I live across from the school."],
        ["找", "zhǎo", "to look for", "verb", "你找什么？", "Nǐ zhǎo shénme?", "What are you looking for?"],
        ["离", "lí", "from (distance)", "preposition", "你家离学校近吗？", "Nǐ jiā lí xuéxiào jìn ma?", "Is your home close to school?"],
        ["近", "jìn", "near; close", "adjective", "我家离这儿很近。", "Wǒ jiā lí zhèr hěn jìn.", "My place is really close to here."]
      ],
      patterns: [
        ["……在哪儿？", "… zài nǎr?", "Where is …?", "你的帽子在哪儿？", "Nǐ de màozi zài nǎr?", "Where's your hat?"],
        ["A在B（的）上面／下面／旁边……", "A zài B (de) shàngmiàn / xiàmiàn / pángbiān …", "A is on / under / next to … B", "我的书在桌子下面。", "Wǒ de shū zài zhuōzi xiàmiàn.", "My book is under the table."]
      ],
      scenarios: [
        {
          title: "Where are my shoes?",
          zh: "我的鞋在哪儿？",
          setting: "David is about to go out and can't find his shoes.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，我的鞋在哪儿？", "Wáng Fāng, wǒ de xié zài nǎr?", "Wang Fang, where are my shoes?"],
            [1, "你找哪双鞋？", "Nǐ zhǎo nǎ shuāng xié?", "Which pair are you looking for?"],
            [0, "白的。不在床下面。", "Bái de. Bú zài chuáng xiàmiàn.", "The white ones. They're not under the bed."],
            [1, "在门旁边吗？", "Zài mén pángbiān ma?", "Are they by the door?"],
            [0, "门旁边也没有。", "Mén pángbiān yě méiyǒu.", "Not by the door either."],
            [1, "你看，在那儿！在桌子下面！", "Nǐ kàn, zài nàr! Zài zhuōzi xiàmiàn!", "Look, there! Under the table!"],
            [0, "桌子下面？谢谢！", "Zhuōzi xiàmiàn? Xièxie!", "Under the table? Thanks!"],
            [1, "你的帽子也在这儿，在桌子上面。", "Nǐ de màozi yě zài zhèr, zài zhuōzi shàngmiàn.", "Your hat is here too — on the table."]
          ]
        },
        {
          title: "Where's the bathroom?",
          zh: "洗手间在哪儿？",
          setting: "On his first day at the language school, David asks Lin Mei for directions.",
          cast: [["大卫", "Dàwèi"], ["林美", "Lín Měi"]],
          lines: [
            [0, "林美，洗手间在哪儿？", "Lín Měi, xǐshǒujiān zài nǎr?", "Lin Mei, where's the bathroom?"],
            [1, "在前面，左边。", "Zài qiánmiàn, zuǒbian.", "Up ahead, on the left."],
            [0, "左边有两个门。", "Zuǒbian yǒu liǎng ge mén.", "There are two doors on the left."],
            [1, "两个门中间有一个小门，那是洗手间。", "Liǎng ge mén zhōngjiān yǒu yí ge xiǎo mén, nà shì xǐshǒujiān.", "There's a little door between them. That's the bathroom."],
            [0, "我们在哪儿上课？", "Wǒmen zài nǎr shàngkè?", "And where do we have class?"],
            [1, "洗手间对面，右边的房间。", "Xǐshǒujiān duìmiàn, yòubian de fángjiān.", "Across from the bathroom — the room on the right."],
            [0, "谢谢！", "Xièxie!", "Thanks!"]
          ]
        },
        {
          title: "Neighbors!",
          zh: "离你家很近",
          setting: "Anna and Li Ming find out where each other lives.",
          cast: [["安娜", "Ānnà"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，你住在哪儿？", "Lǐ Míng, nǐ zhù zài nǎr?", "Li Ming, where do you live?"],
            [1, "我住在学校后面。", "Wǒ zhù zài xuéxiào hòumiàn.", "I live behind the school."],
            [0, "学校后面？我也住在那儿！", "Xuéxiào hòumiàn? Wǒ yě zhù zài nàr!", "Behind the school? I live there too!"],
            [1, "那我家离你家很近！", "Nà wǒ jiā lí nǐ jiā hěn jìn!", "Then my place is really close to yours!"],
            [0, "你家前面有一个红门吗？", "Nǐ jiā qiánmiàn yǒu yí ge hóng mén ma?", "Is there a red gate in front of your place?"],
            [1, "有！", "Yǒu!", "Yes!"],
            [0, "我家在红门右边！", "Wǒ jiā zài hóng mén yòubian!", "My place is just to the right of the red gate!"],
            [1, "太好了！明天上午来我家喝茶！", "Tài hǎo le! Míngtiān shàngwǔ lái wǒ jiā hē chá!", "Great! Come over for tea tomorrow morning!"]
          ]
        }
      ]
    },

    15: {
      words: [
        ["城市", "chéngshì", "city", "noun", "这个城市很漂亮。", "Zhège chéngshì hěn piàoliang.", "This city is beautiful."],
        ["商店", "shāngdiàn", "shop; store", "noun", "我家旁边有一个小商店。", "Wǒ jiā pángbiān yǒu yí ge xiǎo shāngdiàn.", "There's a little shop next to my place."],
        ["超市", "chāoshì", "supermarket", "noun", "我去超市买水果。", "Wǒ qù chāoshì mǎi shuǐguǒ.", "I'm going to the supermarket for some fruit."],
        ["饭馆", "fànguǎn", "restaurant", "noun", "这个饭馆的面条很好吃。", "Zhège fànguǎn de miàntiáo hěn hǎochī.", "The noodles at this restaurant are great."],
        ["医院", "yīyuàn", "hospital", "noun", "医院在学校对面。", "Yīyuàn zài xuéxiào duìmiàn.", "The hospital is across from the school."],
        ["公园", "gōngyuán", "park", "noun", "李明每天早上六点去公园。", "Lǐ Míng měi tiān zǎoshang liù diǎn qù gōngyuán.", "Li Ming goes to the park at six every morning."],
        ["图书馆", "túshūguǎn", "library", "noun", "我常常去图书馆看书。", "Wǒ chángcháng qù túshūguǎn kàn shū.", "I often go to the library to read."],
        ["电影院", "diànyǐngyuàn", "movie theater", "noun", "电影院在超市旁边。", "Diànyǐngyuàn zài chāoshì pángbiān.", "The movie theater is next to the supermarket."],
        ["书店", "shūdiàn", "bookstore", "noun", "我想去书店买一本书。", "Wǒ xiǎng qù shūdiàn mǎi yì běn shū.", "I want to go to the bookstore and buy a book."],
        ["街", "jiē", "street", "noun", "街对面有一个饭馆。", "Jiē duìmiàn yǒu yí ge fànguǎn.", "There's a restaurant across the street."],
        ["楼", "lóu", "building; floor", "noun", "我住在五楼。", "Wǒ zhù zài wǔ lóu.", "I live on the fifth floor."],
        ["地方", "dìfang", "place", "noun", "这是什么地方？", "Zhè shì shénme dìfang?", "What is this place?"],
        ["开", "kāi", "to open", "verb", "超市几点开门？", "Chāoshì jǐ diǎn kāi mén?", "What time does the supermarket open?"],
        ["关", "guān", "to close", "verb", "图书馆晚上九点关门。", "Túshūguǎn wǎnshang jiǔ diǎn guān mén.", "The library closes at 9 p.m."],
        ["多", "duō", "many; a lot", "adjective", "这个城市有很多公园。", "Zhège chéngshì yǒu hěn duō gōngyuán.", "This city has lots of parks."]
      ],
      patterns: [
        ["去……＋做什么", "qù … + (what you do there)", "go to … to do …", "我们去图书馆学习。", "Wǒmen qù túshūguǎn xuéxí.", "We're going to the library to study."],
        ["……几点开门／关门？", "… jǐ diǎn kāi mén / guān mén?", "What time does … open / close?", "公园几点关门？", "Gōngyuán jǐ diǎn guān mén?", "What time does the park close?"]
      ],
      scenarios: [
        {
          title: "Out of milk",
          zh: "超市关门了吗？",
          setting: "Late in the evening, David finds there's no milk at home.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，家里没牛奶了。", "Wáng Fāng, jiā lǐ méi niúnǎi le.", "Wang Fang, we're out of milk."],
            [1, "现在几点？", "Xiànzài jǐ diǎn?", "What time is it?"],
            [0, "十点半。超市关门了吗？", "Shí diǎn bàn. Chāoshì guān mén le ma?", "10:30. Is the supermarket closed?"],
            [1, "超市十点关门。", "Chāoshì shí diǎn guān mén.", "It closes at ten."],
            [0, "十点？", "Shí diǎn?", "Ten?"],
            [1, "街对面有一个小商店，晚上不关门。", "Jiē duìmiàn yǒu yí ge xiǎo shāngdiàn, wǎnshang bù guān mén.", "There's a little shop across the street that stays open at night."],
            [0, "太好了！我去买。", "Tài hǎo le! Wǒ qù mǎi.", "Great! I'll go get some."],
            [1, "也给我买一点儿水果吧！", "Yě gěi wǒ mǎi yìdiǎnr shuǐguǒ ba!", "Get me some fruit too!"]
          ]
        },
        {
          title: "A new city",
          zh: "这个城市",
          setting: "Lin Mei asks Anna how she likes the city she has just moved to.",
          cast: [["林美", "Lín Měi"], ["安娜", "Ānnà"]],
          lines: [
            [0, "安娜，你喜欢这个城市吗？", "Ānnà, nǐ xǐhuan zhège chéngshì ma?", "Anna, do you like this city?"],
            [1, "很喜欢！这儿的公园很多，也很漂亮。", "Hěn xǐhuan! Zhèr de gōngyuán hěn duō, yě hěn piàoliang.", "I love it! There are lots of parks, and they're beautiful."],
            [0, "你家旁边有什么？", "Nǐ jiā pángbiān yǒu shénme?", "What's near your place?"],
            [1, "有一个图书馆和一个书店。我常常去看书。", "Yǒu yí ge túshūguǎn hé yí ge shūdiàn. Wǒ chángcháng qù kàn shū.", "A library and a bookstore. I often go there to read."],
            [0, "有饭馆吗？", "Yǒu fànguǎn ma?", "Any restaurants?"],
            [1, "有，楼下有一个饭馆，菜很好吃。", "Yǒu, lóu xià yǒu yí ge fànguǎn, cài hěn hǎochī.", "Yes, there's one downstairs. The vegetable dishes are great."],
            [0, "这个地方真好！周末我们去电影院吧！", "Zhège dìfang zhēn hǎo! Zhōumò wǒmen qù diànyǐngyuàn ba!", "Sounds like a great spot! Let's go to the movies this weekend!"],
            [1, "好！", "Hǎo!", "Sure!"]
          ]
        },
        {
          title: "Is the library open?",
          zh: "图书馆在哪儿？",
          setting: "David asks a police officer the way to the library.",
          cast: [["大卫", "Dàwèi"], ["警察", "jǐngchá (police officer)"]],
          lines: [
            [0, "你好！图书馆在哪儿？", "Nǐ hǎo! Túshūguǎn zài nǎr?", "Hi! Where's the library?"],
            [1, "图书馆？在医院后面。", "Túshūguǎn? Zài yīyuàn hòumiàn.", "The library? It's behind the hospital."],
            [0, "医院在哪儿？", "Yīyuàn zài nǎr?", "Where's the hospital?"],
            [1, "前面那个白楼是医院。", "Qiánmiàn nàge bái lóu shì yīyuàn.", "That white building up ahead is the hospital."],
            [0, "好，谢谢！", "Hǎo, xièxie!", "Okay, thanks!"],
            [1, "今天星期一，图书馆不开门。", "Jīntiān xīngqīyī, túshūguǎn bù kāi mén.", "It's Monday — the library's closed today."],
            [0, "不开门？那书店呢？", "Bù kāi mén? Nà shūdiàn ne?", "Closed? What about the bookstore?"],
            [1, "书店开门，在电影院旁边。", "Shūdiàn kāi mén, zài diànyǐngyuàn pángbiān.", "The bookstore's open. It's next to the movie theater."]
          ]
        }
      ]
    },

    16: {
      words: [
        ["爱好", "àihào", "hobby", "noun", "你有什么爱好？", "Nǐ yǒu shénme àihào?", "What are your hobbies?"],
        ["爱", "ài", "to love", "verb", "小美爱吃水果。", "Xiǎoměi ài chī shuǐguǒ.", "Xiaomei loves fruit."],
        ["听", "tīng", "to listen", "verb", "我听不懂。", "Wǒ tīng bu dǒng.", "I can't understand what I'm hearing."],
        ["音乐", "yīnyuè", "music", "noun", "你喜欢听什么音乐？", "Nǐ xǐhuan tīng shénme yīnyuè?", "What kind of music do you like?"],
        ["唱歌", "chànggē", "to sing", "verb", "王芳很喜欢唱歌。", "Wáng Fāng hěn xǐhuan chànggē.", "Wang Fang really likes to sing."],
        ["跳舞", "tiàowǔ", "to dance", "verb", "安娜周末常常去跳舞。", "Ānnà zhōumò chángcháng qù tiàowǔ.", "Anna often goes dancing on weekends."],
        ["大家", "dàjiā", "everyone", "pronoun", "大家好！我叫大卫。", "Dàjiā hǎo! Wǒ jiào Dàwèi.", "Hi, everyone! I'm David."],
        ["游泳", "yóuyǒng", "to swim", "verb", "我星期六去游泳。", "Wǒ xīngqīliù qù yóuyǒng.", "I'm going swimming on Saturday."],
        ["旅游", "lǚyóu", "to travel; tourism", "verb", "我想去中国旅游。", "Wǒ xiǎng qù Zhōngguó lǚyóu.", "I'd like to travel to China."],
        ["照片", "zhàopiàn", "photo", "noun", "这是我妈妈的照片。", "Zhè shì wǒ māma de zhàopiàn.", "This is a photo of my mom."],
        ["拍", "pāi", "to take (a photo)", "verb", "你拍的照片很漂亮！", "Nǐ pāi de zhàopiàn hěn piàoliang!", "The photos you take are beautiful!"],
        ["玩", "wán", "to play; to have fun", "verb", "周末你想去哪儿玩？", "Zhōumò nǐ xiǎng qù nǎr wán?", "Where do you want to go this weekend?"],
        ["有意思", "yǒu yìsi", "interesting; fun", "adjective", "这本书很有意思。", "Zhè běn shū hěn yǒu yìsi.", "This book is really interesting."],
        ["最", "zuì", "most", "adverb", "你最喜欢什么颜色？", "Nǐ zuì xǐhuan shénme yánsè?", "What's your favorite color?"],
        ["一起", "yìqǐ", "together", "adverb", "明天我们一起去公园，好吗？", "Míngtiān wǒmen yìqǐ qù gōngyuán, hǎo ma?", "Shall we go to the park together tomorrow?"]
      ],
      patterns: [
        ["我最喜欢……", "Wǒ zuì xǐhuan …", "My favorite … is …; I like … most", "我最喜欢唱歌。", "Wǒ zuì xǐhuan chànggē.", "Singing is my favorite thing."],
        ["我们一起……，好吗？", "Wǒmen yìqǐ …, hǎo ma?", "Shall we … together?", "我们一起去游泳，好吗？", "Wǒmen yìqǐ qù yóuyǒng, hǎo ma?", "Shall we go swimming together?"]
      ],
      scenarios: [
        {
          title: "What are your hobbies?",
          zh: "你有什么爱好？",
          setting: "Lin Mei and David chat at the language exchange.",
          cast: [["林美", "Lín Měi"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，你有什么爱好？", "Dàwèi, nǐ yǒu shénme àihào?", "David, what are your hobbies?"],
            [1, "我喜欢游泳，也爱听音乐。你呢？", "Wǒ xǐhuan yóuyǒng, yě ài tīng yīnyuè. Nǐ ne?", "I like swimming, and I love listening to music. You?"],
            [0, "我喜欢唱歌和跳舞。", "Wǒ xǐhuan chànggē hé tiàowǔ.", "I like singing and dancing."],
            [1, "你喜欢什么音乐？", "Nǐ xǐhuan shénme yīnyuè?", "What kind of music do you like?"],
            [0, "我最喜欢中国音乐。你听中国音乐吗？", "Wǒ zuì xǐhuan Zhōngguó yīnyuè. Nǐ tīng Zhōngguó yīnyuè ma?", "Chinese music is my favorite. Do you listen to Chinese music?"],
            [1, "常常听！不懂也喜欢。", "Chángcháng tīng! Bù dǒng yě xǐhuan.", "All the time! I don't understand it, but I still like it."],
            [0, "星期六大家一起去唱歌，你也来吧！", "Xīngqīliù dàjiā yìqǐ qù chànggē, nǐ yě lái ba!", "A bunch of us are going to karaoke on Saturday — come along!"],
            [1, "好！", "Hǎo!", "Sure!"]
          ]
        },
        {
          title: "Holiday photos",
          zh: "旅游的照片",
          setting: "Wang Fang shows Anna photos from a trip.",
          cast: [["王芳", "Wáng Fāng"], ["安娜", "Ānnà"]],
          lines: [
            [0, "安娜，你看，这是我的照片。", "Ānnà, nǐ kàn, zhè shì wǒ de zhàopiàn.", "Anna, look — these are my photos."],
            [1, "很漂亮！你去哪儿旅游了？", "Hěn piàoliang! Nǐ qù nǎr lǚyóu le?", "They're beautiful! Where did you travel to?"],
            [0, "我去了一个小城市，很好玩。", "Wǒ qù le yí ge xiǎo chéngshì, hěn hǎowán.", "I went to a small city. It was so much fun."],
            [1, "这是谁拍的？", "Zhè shì shéi pāi de?", "Who took this one?"],
            [0, "我弟弟拍的。他最爱拍照片。", "Wǒ dìdi pāi de. Tā zuì ài pāi zhàopiàn.", "My younger brother. He loves taking photos more than anything."],
            [1, "你们去游泳了吗？", "Nǐmen qù yóuyǒng le ma?", "Did you two go swimming?"],
            [0, "去了！我们每天都去。", "Qù le! Wǒmen měi tiān dōu qù.", "Yes! We went every day."],
            [1, "很有意思！我也想去！", "Hěn yǒu yìsi! Wǒ yě xiǎng qù!", "Sounds like fun! I want to go too!"]
          ]
        },
        {
          title: "Dance with me!",
          zh: "我们一起跳舞！",
          setting: "Little Xiaomei shows David everything she likes to do.",
          cast: [["小美", "Xiǎoměi"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，你听我唱歌！", "Dàwèi, nǐ tīng wǒ chànggē!", "David, listen to me sing!"],
            [1, "真好听！你爱唱歌吗？", "Zhēn hǎotīng! Nǐ ài chànggē ma?", "That's lovely! Do you love singing?"],
            [0, "爱！我也爱跳舞。", "Ài! Wǒ yě ài tiàowǔ.", "Yes! I love dancing too."],
            [1, "你的爱好真多！", "Nǐ de àihào zhēn duō!", "You've got so many hobbies!"],
            [0, "你跳舞吗？", "Nǐ tiàowǔ ma?", "Do you dance?"],
            [1, "我不跳舞。", "Wǒ bú tiàowǔ.", "I don't dance."],
            [0, "我们一起跳舞吧！很好玩！", "Wǒmen yìqǐ tiàowǔ ba! Hěn hǎowán!", "Let's dance together! It's fun!"],
            [1, "好好好！", "Hǎo hǎo hǎo!", "Okay, okay!"]
          ]
        }
      ]
    },

    17: {
      words: [
        ["运动", "yùndòng", "sports; exercise", "noun", "你喜欢什么运动？", "Nǐ xǐhuan shénme yùndòng?", "What sports do you like?"],
        ["排球", "páiqiú", "volleyball", "noun", "大卫最喜欢打排球。", "Dàwèi zuì xǐhuan dǎ páiqiú.", "David's favorite thing is playing volleyball."],
        ["打", "dǎ", "to play (ball games)", "verb", "我们星期六下午打球。", "Wǒmen xīngqīliù xiàwǔ dǎ qiú.", "We play on Saturday afternoons."],
        ["球", "qiú", "ball", "noun", "这个球是谁的？", "Zhège qiú shì shéi de?", "Whose ball is this?"],
        ["队", "duì", "team", "noun", "你想来我们队吗？", "Nǐ xiǎng lái wǒmen duì ma?", "Do you want to join our team?"],
        ["发球", "fāqiú", "to serve", "verb", "你先发球。", "Nǐ xiān fāqiú.", "You serve first."],
        ["网", "wǎng", "net", "noun", "我在网前面，你在后面。", "Wǒ zài wǎng qiánmiàn, nǐ zài hòumiàn.", "I'll be at the net, you take the back."],
        ["跳", "tiào", "to jump", "verb", "跳的时候看球。", "Tiào de shíhou kàn qiú.", "Watch the ball when you jump."],
        ["跑", "pǎo", "to run", "verb", "快跑！球来了！", "Kuài pǎo! Qiú lái le!", "Run! Here comes the ball!"],
        ["得", "de", "(links a verb to how well it's done: 跑得很快 = runs fast)", "particle", "大卫排球打得很好。", "Dàwèi páiqiú dǎ de hěn hǎo.", "David plays volleyball really well."],
        ["足球", "zúqiú", "soccer", "noun", "你喜欢足球还是篮球？", "Nǐ xǐhuan zúqiú háishi lánqiú?", "Do you like soccer or basketball?"],
        ["篮球", "lánqiú", "basketball", "noun", "王芳的弟弟每天打篮球。", "Wáng Fāng de dìdi měi tiān dǎ lánqiú.", "Wang Fang's brother plays basketball every day."],
        ["会", "huì", "can; know how to", "verb", "你会打排球吗？", "Nǐ huì dǎ páiqiú ma?", "Can you play volleyball?"],
        ["高", "gāo", "tall; high", "adjective", "这个网太高了！", "Zhège wǎng tài gāo le!", "This net is way too high!"],
        ["快", "kuài", "fast", "adjective", "你太快了！", "Nǐ tài kuài le!", "You're too fast!"]
      ],
      patterns: [
        ["你会……吗？", "Nǐ huì … ma?", "Can you …? (a skill you've learned)", "你会游泳吗？", "Nǐ huì yóuyǒng ma?", "Can you swim?"],
        ["……得很好／很快", "… de hěn hǎo / hěn kuài", "does … well / fast (verb + 得 + how it's done)", "李明跑得很快。", "Lǐ Míng pǎo de hěn kuài.", "Li Ming runs really fast."]
      ],
      scenarios: [
        {
          title: "Can I play?",
          zh: "我也想打",
          setting: "In the park, David spots a pickup volleyball game and asks to join.",
          cast: [["大卫", "Dàwèi"], ["林美", "Lín Měi"]],
          lines: [
            [0, "你好！你们打排球吗？我也想打！", "Nǐ hǎo! Nǐmen dǎ páiqiú ma? Wǒ yě xiǎng dǎ!", "Hi! Are you playing volleyball? I want to play too!"],
            [1, "好！你会打吗？", "Hǎo! Nǐ huì dǎ ma?", "Sure! Do you know how to play?"],
            [0, "会！我在美国常常打。", "Huì! Wǒ zài Měiguó chángcháng dǎ.", "Yes! I played all the time in America."],
            [1, "太好了！我们队有五个人，你来我们队吧。", "Tài hǎo le! Wǒmen duì yǒu wǔ ge rén, nǐ lái wǒmen duì ba.", "Great! Our team has five, so join us."],
            [0, "好！谁发球？", "Hǎo! Shéi fāqiú?", "Okay! Who's serving?"],
            [1, "你先发球！", "Nǐ xiān fāqiú!", "You serve first!"],
            [0, "好，我来！", "Hǎo, wǒ lái!", "Okay, here goes!"]
          ]
        },
        {
          title: "Learning to serve",
          zh: "我不会发球",
          setting: "Before the game, David helps Anna with her serve.",
          cast: [["安娜", "Ānnà"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，我不会发球。", "Dàwèi, wǒ bú huì fāqiú.", "David, I don't know how to serve."],
            [1, "不难！你看我。", "Bù nán! Nǐ kàn wǒ.", "It's not hard! Watch me."],
            [0, "网太高了！", "Wǎng tài gāo le!", "The net's too high!"],
            [1, "不高。打高一点儿。", "Bù gāo. Dǎ gāo yìdiǎnr.", "It's not that high. Hit it a little higher."],
            [0, "球打在网上了！", "Qiú dǎ zài wǎng shang le!", "It hit the net!"],
            [1, "没关系！不要看网，看球！", "Méi guānxi! Bú yào kàn wǎng, kàn qiú!", "No problem! Don't look at the net — watch the ball!"],
            [0, "好球！我会发球了！", "Hǎo qiú! Wǒ huì fāqiú le!", "Nice one! I can serve now!"],
            [1, "你学得真快！明天我们一起打吧！", "Nǐ xué de zhēn kuài! Míngtiān wǒmen yìqǐ dǎ ba!", "You learn fast! Let's play together tomorrow!"]
          ]
        },
        {
          title: "After practice",
          zh: "很累！",
          setting: "David gets home from volleyball practice, worn out.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，累吗？", "Dàwèi, lèi ma?", "Tired, David?"],
            [1, "很累！今天跑了很多，也跳了很多。", "Hěn lèi! Jīntiān pǎo le hěn duō, yě tiào le hěn duō.", "Very! We ran a lot and jumped a lot today."],
            [0, "你们队里有谁？", "Nǐmen duì lǐ yǒu shéi?", "Who's on your team?"],
            [1, "有李明和林美。李明很高，跑得也很快。", "Yǒu Lǐ Míng hé Lín Měi. Lǐ Míng hěn gāo, pǎo de yě hěn kuài.", "Li Ming and Lin Mei. Li Ming is tall, and he's fast, too."],
            [0, "李明也打排球？他不是喜欢足球吗？", "Lǐ Míng yě dǎ páiqiú? Tā bú shì xǐhuan zúqiú ma?", "Li Ming plays volleyball too? Isn't he a soccer guy?"],
            [1, "他足球、篮球、排球都会！", "Tā zúqiú, lánqiú, páiqiú dōu huì!", "Soccer, basketball, volleyball — he can play them all!"],
            [0, "你呢？你最喜欢什么运动？", "Nǐ ne? Nǐ zuì xǐhuan shénme yùndòng?", "And you? What's your favorite sport?"],
            [1, "排球！我每天都想打。", "Páiqiú! Wǒ měi tiān dōu xiǎng dǎ.", "Volleyball! I'd play every day if I could."]
          ]
        }
      ]
    },

    18: {
      words: [
        ["坐", "zuò", "to sit; to take (transport)", "verb", "你坐这儿！", "Nǐ zuò zhèr!", "Sit here!"],
        ["地铁", "dìtiě", "subway", "noun", "我每天坐地铁去学校。", "Wǒ měi tiān zuò dìtiě qù xuéxiào.", "I take the subway to school every day."],
        ["公交车", "gōngjiāochē", "bus", "noun", "公交车来了！", "Gōngjiāochē lái le!", "The bus is here!"],
        ["站", "zhàn", "station; stop", "noun", "地铁站在哪儿？", "Dìtiě zhàn zài nǎr?", "Where's the subway station?"],
        ["车", "chē", "car; vehicle", "noun", "你的车是什么颜色的？", "Nǐ de chē shì shénme yánsè de?", "What color is your car?"],
        ["票", "piào", "ticket", "noun", "票多少钱？", "Piào duōshao qián?", "How much is a ticket?"],
        ["卡", "kǎ", "card", "noun", "我有地铁卡。", "Wǒ yǒu dìtiě kǎ.", "I have a subway card."],
        ["换", "huàn", "to change; to transfer", "verb", "我们在下一站换车。", "Wǒmen zài xià yí zhàn huàn chē.", "We change trains at the next stop."],
        ["到", "dào", "to arrive; to", "verb", "我们到了！", "Wǒmen dào le!", "We're here!"],
        ["上车", "shàngchē", "to get on", "verb", "快上车！", "Kuài shàngchē!", "Quick, get on!"],
        ["下车", "xiàchē", "to get off", "verb", "我在学校站下车。", "Wǒ zài xuéxiào zhàn xiàchē.", "I get off at the school stop."],
        ["线", "xiàn", "line (subway line)", "noun", "你坐几号线？", "Nǐ zuò jǐ hào xiàn?", "Which line do you take?"],
        ["从", "cóng", "from", "preposition", "从这儿到图书馆很近。", "Cóng zhèr dào túshūguǎn hěn jìn.", "It's not far from here to the library."],
        ["慢", "màn", "slow", "adjective", "公交车太慢了！", "Gōngjiāochē tài màn le!", "The bus is so slow!"],
        ["挤", "jǐ", "crowded", "adjective", "早上地铁很挤。", "Zǎoshang dìtiě hěn jǐ.", "The subway is packed in the morning."]
      ],
      patterns: [
        ["坐……去……", "zuò … qù …", "take (a bus, the subway …) to …", "我坐公交车去超市。", "Wǒ zuò gōngjiāochē qù chāoshì.", "I take the bus to the supermarket."],
        ["从……到……", "cóng … dào …", "from … to …", "从这儿到公园坐几站？", "Cóng zhèr dào gōngyuán zuò jǐ zhàn?", "How many stops is it from here to the park?"]
      ],
      scenarios: [
        {
          title: "Which line?",
          zh: "坐几号线？",
          setting: "David and Wang Fang take the subway to the park.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，我们去公园坐几号线？", "Wáng Fāng, wǒmen qù gōngyuán zuò jǐ hào xiàn?", "Wang Fang, which line do we take to the park?"],
            [1, "先坐二号线，然后换五号线。", "Xiān zuò èr hào xiàn, ránhòu huàn wǔ hào xiàn.", "First Line 2, then we change to Line 5."],
            [0, "在哪儿换？", "Zài nǎr huàn?", "Where do we change?"],
            [1, "在图书馆站换。", "Zài túshūguǎn zhàn huàn.", "At the Library stop."],
            [0, "车来了！人太多了！", "Chē lái le! Rén tài duō le!", "The train's here! There are so many people!"],
            [1, "挤也没关系，快上车！", "Jǐ yě méi guānxi, kuài shàngchē!", "Crowded or not — quick, get on!"]
          ]
        },
        {
          title: "On the bus",
          zh: "这个车到医院吗？",
          setting: "Anna gets on a bus and checks with the driver.",
          cast: [["安娜", "Ānnà"], ["司机", "sījī (driver)"]],
          lines: [
            [0, "你好，这个车到医院吗？", "Nǐ hǎo, zhège chē dào yīyuàn ma?", "Hi, does this bus go to the hospital?"],
            [1, "到。你有卡吗？", "Dào. Nǐ yǒu kǎ ma?", "It does. Do you have a card?"],
            [0, "没有。买票多少钱？", "Méiyǒu. Mǎi piào duōshao qián?", "No. How much is a ticket?"],
            [1, "两块。", "Liǎng kuài.", "Two yuan."],
            [0, "给你。我在哪儿下车？", "Gěi nǐ. Wǒ zài nǎr xiàchē?", "Here you go. Where do I get off?"],
            [1, "医院站。从这儿到医院五站。", "Yīyuàn zhàn. Cóng zhèr dào yīyuàn wǔ zhàn.", "The Hospital stop. It's five stops from here."],
            [0, "五站？好，谢谢！", "Wǔ zhàn? Hǎo, xièxie!", "Five stops? Okay, thanks!"],
            [1, "医院站到了！", "Yīyuàn zhàn dào le!", "Hospital stop!"]
          ]
        },
        {
          title: "Bus or subway?",
          zh: "地铁还是公交车？",
          setting: "David and Li Ming compare how they get around.",
          cast: [["大卫", "Dàwèi"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，你每天坐地铁还是坐公交车？", "Lǐ Míng, nǐ měi tiān zuò dìtiě háishi zuò gōngjiāochē?", "Li Ming, do you take the subway or the bus every day?"],
            [1, "公交车。六点公交车不挤。", "Gōngjiāochē. Liù diǎn gōngjiāochē bù jǐ.", "The bus. At six it isn't crowded."],
            [0, "公交车太慢了！地铁快多了。", "Gōngjiāochē tài màn le! Dìtiě kuài duō le.", "The bus is so slow! The subway's way faster."],
            [1, "地铁八点太挤了！", "Dìtiě bā diǎn tài jǐ le!", "The subway at eight is way too packed!"],
            [0, "是……我每天八点坐地铁。", "Shì… wǒ měi tiān bā diǎn zuò dìtiě.", "Yeah… I take the subway at eight every day."],
            [1, "那你也六点起床，坐公交车吧！", "Nà nǐ yě liù diǎn qǐchuáng, zuò gōngjiāochē ba!", "Then get up at six too, and take the bus!"],
            [0, "六点？不要！我还是坐地铁吧！", "Liù diǎn? Bú yào! Wǒ háishi zuò dìtiě ba!", "Six? No way! I'll stick with the subway!"]
          ]
        }
      ]
    },

    19: {
      words: [
        ["出租车", "chūzūchē", "taxi", "noun", "很晚了，我们坐出租车回家吧。", "Hěn wǎn le, wǒmen zuò chūzūchē huíjiā ba.", "It's late. Let's take a taxi home."],
        ["司机", "sījī", "driver", "noun", "司机，我们到了吗？", "Sījī, wǒmen dào le ma?", "Driver, are we there yet?"],
        ["路", "lù", "road", "noun", "今天路上车很多。", "Jīntiān lù shang chē hěn duō.", "There's a lot of traffic on the roads today."],
        ["路口", "lùkǒu", "intersection", "noun", "我在路口等你。", "Wǒ zài lùkǒu děng nǐ.", "I'll wait for you at the intersection."],
        ["走", "zǒu", "to walk; to go", "verb", "不远，我们走路去吧。", "Bù yuǎn, wǒmen zǒulù qù ba.", "It's not far. Let's walk."],
        ["往", "wǎng", "toward", "preposition", "往这儿走。", "Wǎng zhèr zǒu.", "This way."],
        ["拐", "guǎi", "to turn", "verb", "到路口往右边拐。", "Dào lùkǒu wǎng yòubian guǎi.", "Turn right at the intersection."],
        ["一直", "yìzhí", "straight ahead; all the way", "adverb", "一直往前面走，五分钟。", "Yìzhí wǎng qiánmiàn zǒu, wǔ fēnzhōng.", "Go straight ahead for five minutes."],
        ["停", "tíng", "to stop", "verb", "司机，在前面停，谢谢。", "Sījī, zài qiánmiàn tíng, xièxie.", "Driver, stop up ahead, please."],
        ["远", "yuǎn", "far", "adjective", "你家离这儿远吗？", "Nǐ jiā lí zhèr yuǎn ma?", "Is your place far from here?"],
        ["地址", "dìzhǐ", "address", "noun", "你家的地址是什么？", "Nǐ jiā de dìzhǐ shì shénme?", "What's your home address?"],
        ["知道", "zhīdào", "to know", "verb", "我不知道他家在哪儿。", "Wǒ bù zhīdào tā jiā zài nǎr.", "I don't know where he lives."],
        ["告诉", "gàosu", "to tell", "verb", "你告诉司机我们的地址。", "Nǐ gàosu sījī wǒmen de dìzhǐ.", "Tell the driver our address."],
        ["送", "sòng", "to take (someone); to give", "verb", "我送你回家。", "Wǒ sòng nǐ huíjiā.", "I'll take you home."],
        ["分钟", "fēnzhōng", "minute (length of time)", "noun", "走路十五分钟。", "Zǒulù shíwǔ fēnzhōng.", "It's a fifteen-minute walk."]
      ],
      patterns: [
        ["往……走 / 往……拐", "Wǎng … zǒu / Wǎng … guǎi", "Go toward … / Turn toward …", "到路口往左边拐。", "Dào lùkǒu wǎng zuǒbian guǎi.", "Turn left at the intersection."],
        ["到……要几分钟？", "Dào … yào jǐ fēnzhōng?", "How many minutes does it take to get to …?", "坐出租车到医院要几分钟？——十分钟。", "Zuò chūzūchē dào yīyuàn yào jǐ fēnzhōng? — Shí fēnzhōng.", "How long to the hospital by taxi? — Ten minutes."]
      ],
      scenarios: [
        {
          title: "Taking a taxi",
          zh: "打车",
          setting: "Wang Fang gets into a taxi and shows the driver an address.",
          cast: [["司机", "sījī (driver)"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "你好，去哪儿？", "Nǐ hǎo, qù nǎr?", "Hi, where to?"],
            [1, "去这个地址。你知道吗？", "Qù zhège dìzhǐ. Nǐ zhīdào ma?", "This address. Do you know it?"],
            [0, "知道，在公园旁边。", "Zhīdào, zài gōngyuán pángbiān.", "Sure, it's next to the park."],
            [1, "远吗？", "Yuǎn ma?", "Is it far?"],
            [0, "不远，二十分钟。", "Bù yuǎn, èrshí fēnzhōng.", "Not far. Twenty minutes."],
            [0, "到了。在这儿停吗？", "Dào le. Zài zhèr tíng ma?", "Here we are. Stop here?"],
            [1, "往前面走一点儿，在路口停。", "Wǎng qiánmiàn zǒu yìdiǎnr, zài lùkǒu tíng.", "A little further, please. Stop at the intersection."],
            [0, "好的。三十二块。", "Hǎo de. Sānshí'èr kuài.", "Okay. That's 32 yuan."]
          ]
        },
        {
          title: "Asking the way",
          zh: "图书馆在哪儿？",
          setting: "David stops a police officer on the street to ask for directions.",
          cast: [["大卫", "Dàwèi"], ["警察", "jǐngchá (police officer)"]],
          lines: [
            [0, "对不起，你知道图书馆在哪儿吗？", "Duìbuqǐ, nǐ zhīdào túshūguǎn zài nǎr ma?", "Excuse me, do you know where the library is?"],
            [1, "图书馆？离这儿不远。", "Túshūguǎn? Lí zhèr bù yuǎn.", "The library? It's not far from here."],
            [1, "你一直往前面走，到路口往右边拐。", "Nǐ yìzhí wǎng qiánmiàn zǒu, dào lùkǒu wǎng yòubian guǎi.", "Go straight ahead, and turn right at the intersection."],
            [0, "到路口往右边拐？", "Dào lùkǒu wǎng yòubian guǎi?", "Turn right at the intersection?"],
            [1, "是。然后走五分钟，图书馆在左边。", "Shì. Ránhòu zǒu wǔ fēnzhōng, túshūguǎn zài zuǒbian.", "Yes. Then walk five minutes, and the library is on the left."],
            [0, "好，谢谢！", "Hǎo, xièxie!", "Great, thanks!"],
            [1, "不客气。", "Bú kèqi.", "You're welcome."]
          ]
        },
        {
          title: "Getting home safe",
          zh: "我送你回家",
          setting: "After dinner, Li Ming helps Lin Mei get a taxi home.",
          cast: [["李明", "Lǐ Míng"], ["林美", "Lín Měi"], ["司机", "sījī (driver)"]],
          lines: [
            [0, "很晚了。我送你回家。", "Hěn wǎn le. Wǒ sòng nǐ huíjiā.", "It's late. I'll take you home."],
            [1, "没关系，我家很远。我坐出租车。", "Méi guānxi, wǒ jiā hěn yuǎn. Wǒ zuò chūzūchē.", "It's fine, I live far away. I'll take a taxi."],
            [0, "好。出租车来了。", "Hǎo. Chūzūchē lái le.", "Okay. Here comes a taxi."],
            [2, "你们去哪儿？", "Nǐmen qù nǎr?", "Where are you headed?"],
            [0, "她去这个地址。", "Tā qù zhège dìzhǐ.", "She's going to this address."],
            [2, "知道。现在路上车不多，三十分钟。", "Zhīdào. Xiànzài lù shang chē bù duō, sānshí fēnzhōng.", "I know it. There's not much traffic now, so thirty minutes."],
            [1, "谢谢你，李明！再见！", "Xièxie nǐ, Lǐ Míng! Zàijiàn!", "Thanks, Li Ming! Bye!"],
            [0, "再见！到家了告诉我。", "Zàijiàn! Dào jiā le gàosu wǒ.", "Bye! Let me know when you get home."]
          ]
        }
      ]
    },

    20: {
      words: [
        ["服务员", "fúwùyuán", "server; waiter", "noun", "我妹妹是饭馆的服务员。", "Wǒ mèimei shì fànguǎn de fúwùyuán.", "My younger sister is a server at a restaurant."],
        ["菜单", "càidān", "menu", "noun", "请给我看看菜单。", "Qǐng gěi wǒ kànkan càidān.", "Could I see the menu, please?"],
        ["点菜", "diǎncài", "to order food", "verb", "现在点菜吗？", "Xiànzài diǎncài ma?", "Are you ready to order?"],
        ["米饭", "mǐfàn", "cooked rice", "noun", "我们要两碗米饭。", "Wǒmen yào liǎng wǎn mǐfàn.", "Two bowls of rice, please."],
        ["汤", "tāng", "soup", "noun", "这个汤太热了。", "Zhège tāng tài rè le.", "This soup is too hot."],
        ["碗", "wǎn", "bowl", "measure", "一碗面条多少钱？", "Yì wǎn miàntiáo duōshao qián?", "How much is a bowl of noodles?"],
        ["筷子", "kuàizi", "chopsticks", "noun", "服务员，再给我一双筷子。", "Fúwùyuán, zài gěi wǒ yì shuāng kuàizi.", "Excuse me, could I have another pair of chopsticks?"],
        ["盘", "pán", "plate (of)", "measure", "我们要一盘包子。", "Wǒmen yào yì pán bāozi.", "We'll have a plate of steamed buns."],
        ["位", "wèi", "(polite measure word for people)", "measure", "几位？——两位。", "Jǐ wèi? — Liǎng wèi.", "How many in your party? — Two."],
        ["买单", "mǎidān", "to pay the bill", "verb", "服务员，买单！", "Fúwùyuán, mǎidān!", "Check, please!"],
        ["请", "qǐng", "please; to treat (someone)", "verb", "今天我请你。", "Jīntiān wǒ qǐng nǐ.", "It's my treat today."],
        ["饱", "bǎo", "full (after eating)", "adjective", "我吃饱了。", "Wǒ chī bǎo le.", "I'm full."],
        ["渴", "kě", "thirsty", "adjective", "我很渴，想喝水。", "Wǒ hěn kě, xiǎng hē shuǐ.", "I'm thirsty. I'd like some water."],
        ["再", "zài", "again; more", "adverb", "我们再要一个菜。", "Wǒmen zài yào yí ge cài.", "Let's order one more dish."],
        ["别的", "biéde", "other; else", "pronoun", "你们要别的吗？", "Nǐmen yào biéde ma?", "Anything else?"]
      ],
      patterns: [
        ["再来一……", "Zài lái yì …", "One more …, please", "再来一碗米饭。", "Zài lái yì wǎn mǐfàn.", "Another bowl of rice, please."],
        ["我请你吃/喝……", "Wǒ qǐng nǐ chī / hē …", "Let me treat you to …", "明天我请你喝咖啡。", "Míngtiān wǒ qǐng nǐ hē kāfēi.", "Tomorrow, coffee's on me."]
      ],
      scenarios: [
        {
          title: "A table for two",
          zh: "几位？",
          setting: "Wang Fang and David walk into a busy restaurant.",
          cast: [["服务员", "fúwùyuán (server)"], ["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "你好！几位？", "Nǐ hǎo! Jǐ wèi?", "Hi! How many?"],
            [1, "两位。", "Liǎng wèi.", "Two."],
            [0, "请坐。这是菜单。", "Qǐng zuò. Zhè shì càidān.", "Have a seat. Here's the menu."],
            [2, "谢谢。我很渴，先要两杯水。", "Xièxie. Wǒ hěn kě, xiān yào liǎng bēi shuǐ.", "Thanks. I'm thirsty, so two glasses of water first, please."],
            [0, "好的。你们现在点菜吗？", "Hǎo de. Nǐmen xiànzài diǎncài ma?", "Sure. Ready to order?"],
            [1, "我们要一盘鱼，一个菜，两碗米饭。", "Wǒmen yào yì pán yú, yí ge cài, liǎng wǎn mǐfàn.", "We'll have a plate of fish, a vegetable dish and two bowls of rice."],
            [0, "要汤吗？", "Yào tāng ma?", "Any soup?"],
            [2, "要一个鸡蛋汤。", "Yào yí ge jīdàn tāng.", "One egg drop soup, please."]
          ]
        },
        {
          title: "One more bowl",
          zh: "再来一碗",
          setting: "Li Ming and David are halfway through a big lunch.",
          cast: [["大卫", "Dàwèi"], ["李明", "Lǐ Míng"], ["服务员", "fúwùyuán (server)"]],
          lines: [
            [0, "这个汤太好喝了！", "Zhège tāng tài hǎohē le!", "This soup is amazing!"],
            [1, "服务员，再来一碗米饭！", "Fúwùyuán, zài lái yì wǎn mǐfàn!", "Excuse me, another bowl of rice!"],
            [2, "好的。要别的吗？", "Hǎo de. Yào biéde ma?", "Sure. Anything else?"],
            [0, "再给我一双筷子，谢谢。", "Zài gěi wǒ yì shuāng kuàizi, xièxie.", "Another pair of chopsticks for me, please."],
            [1, "大卫，你吃饱了吗？", "Dàwèi, nǐ chī bǎo le ma?", "David, are you full?"],
            [0, "吃饱了！你呢？", "Chī bǎo le! Nǐ ne?", "Stuffed! You?"],
            [1, "没有！我再吃一碗。", "Méiyǒu! Wǒ zài chī yì wǎn.", "Nope! I'm having another bowl."]
          ]
        },
        {
          title: "My treat",
          zh: "我请你",
          setting: "Anna and Lin Mei finish dinner and both reach for the bill.",
          cast: [["林美", "Lín Měi"], ["安娜", "Ānnà"], ["服务员", "fúwùyuán (server)"]],
          lines: [
            [0, "服务员，买单！", "Fúwùyuán, mǎidān!", "Check, please!"],
            [1, "今天我请你。", "Jīntiān wǒ qǐng nǐ.", "It's my treat today."],
            [0, "不不不，上个星期你请我了。今天我请。", "Bù bù bù, shàng ge xīngqī nǐ qǐng wǒ le. Jīntiān wǒ qǐng.", "No, no, no. You treated me last week. Today's on me."],
            [2, "九十八块。", "Jiǔshíbā kuài.", "That's 98 yuan."],
            [0, "给你。", "Gěi nǐ.", "Here you go."],
            [1, "谢谢你，林美！下个星期我请！", "Xièxie nǐ, Lín Měi! Xià ge xīngqī wǒ qǐng!", "Thank you, Lin Mei! Next week's on me!"]
          ]
        }
      ]
    },

    21: {
      words: [
        ["味道", "wèidào", "taste; flavor", "noun", "这个菜味道真好。", "Zhège cài wèidào zhēn hǎo.", "This dish tastes really good."],
        ["辣", "là", "spicy", "adjective", "你吃辣的吗？", "Nǐ chī là de ma?", "Do you eat spicy food?"],
        ["甜", "tián", "sweet", "adjective", "这个水果真甜！", "Zhège shuǐguǒ zhēn tián!", "This fruit is so sweet!"],
        ["酸", "suān", "sour", "adjective", "这个苹果有一点儿酸。", "Zhège píngguǒ yǒu yìdiǎnr suān.", "This apple is a bit sour."],
        ["咸", "xián", "salty", "adjective", "汤太咸了。", "Tāng tài xián le.", "The soup is too salty."],
        ["这样", "zhèyàng", "like this; this way", "pronoun", "你看，这样切。", "Nǐ kàn, zhèyàng qiē.", "Look, cut it like this."],
        ["油", "yóu", "oil", "noun", "这个菜油太多了。", "Zhège cài yóu tài duō le.", "This dish is way too oily."],
        ["盐", "yán", "salt", "noun", "汤里要放一点儿盐。", "Tāng li yào fàng yìdiǎnr yán.", "The soup needs a little salt."],
        ["炒", "chǎo", "to stir-fry", "verb", "我会炒鸡蛋。", "Wǒ huì chǎo jīdàn.", "I can make stir-fried eggs."],
        ["煮", "zhǔ", "to boil", "verb", "我早饭吃一个煮鸡蛋。", "Wǒ zǎofàn chī yí ge zhǔ jīdàn.", "I have a boiled egg for breakfast."],
        ["切", "qiē", "to cut", "verb", "我切菜，你炒菜。", "Wǒ qiē cài, nǐ chǎo cài.", "I'll chop the vegetables, you stir-fry them."],
        ["放", "fàng", "to put", "verb", "你咖啡里放牛奶吗？", "Nǐ kāfēi li fàng niúnǎi ma?", "Do you take milk in your coffee?"],
        ["尝", "cháng", "to taste; to try", "verb", "你尝尝这个。", "Nǐ chángchang zhège.", "Try this."],
        ["鸡", "jī", "chicken", "noun", "我喜欢吃鸡，不喜欢吃鱼。", "Wǒ xǐhuan chī jī, bù xǐhuan chī yú.", "I like chicken, but not fish."],
        ["牛肉", "niúròu", "beef", "noun", "安娜不吃牛肉。", "Ānnà bù chī niúròu.", "Anna doesn't eat beef."]
      ],
      patterns: [
        ["……有一点儿……", "… yǒu yìdiǎnr …", "… is a bit … (usually a complaint)", "这个菜有一点儿咸。", "Zhège cài yǒu yìdiǎnr xián.", "This dish is a little salty."],
        ["你尝尝……", "Nǐ chángchang …", "Have a taste of …", "你尝尝我做的汤。", "Nǐ chángchang wǒ zuò de tāng.", "Try the soup I made."]
      ],
      scenarios: [
        {
          title: "Cooking together",
          zh: "一起做饭",
          setting: "Wang Fang teaches David to make a beef stir-fry in their kitchen.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "今天我们一起做饭。你切牛肉，我炒。", "Jīntiān wǒmen yìqǐ zuò fàn. Nǐ qiē niúròu, wǒ chǎo.", "Let's cook together today. You cut the beef, I'll stir-fry."],
            [1, "好。牛肉怎么切？", "Hǎo. Niúròu zěnme qiē?", "Okay. How do I cut the beef?"],
            [0, "你看，这样切。然后放一点儿油，放牛肉。", "Nǐ kàn, zhèyàng qiē. Ránhòu fàng yìdiǎnr yóu, fàng niúròu.", "Look, like this. Then add a little oil and put in the beef."],
            [1, "要放盐吗？", "Yào fàng yán ma?", "Does it need salt?"],
            [0, "要。好了，你尝尝，味道好吗？", "Yào. Hǎo le, nǐ chángchang, wèidào hǎo ma?", "Yes. Okay, done. Have a taste. How is it?"],
            [1, "有一点儿咸……", "Yǒu yìdiǎnr xián…", "It's a little salty…"],
            [0, "没关系，我们有米饭！", "Méi guānxi, wǒmen yǒu mǐfàn!", "No problem, we've got rice!"]
          ]
        },
        {
          title: "Too spicy!",
          zh: "太辣了！",
          setting: "David has dinner at Li Ming's family home, and Li Ming's mom has cooked.",
          cast: [["李明的妈妈", "Lǐ Míng de māma"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，你尝尝这个鸡。", "Dàwèi, nǐ chángchang zhège jī.", "David, try this chicken."],
            [1, "很好吃！……太辣了！", "Hěn hǎochī! … Tài là le!", "Delicious! …Whoa, that's spicy!"],
            [0, "你不吃辣的吗？喝一点儿汤吧。", "Nǐ bù chī là de ma? Hē yìdiǎnr tāng ba.", "You don't eat spicy food? Have some soup."],
            [1, "这个汤有一点儿酸，很好喝。", "Zhège tāng yǒu yìdiǎnr suān, hěn hǎohē.", "This soup is a little sour. It's really good."],
            [0, "这是酸辣汤。", "Zhè shì suānlà tāng.", "It's hot and sour soup."],
            [1, "酸辣汤？那也是辣的！", "Suānlà tāng? Nà yě shì là de!", "Hot and sour? So it's spicy too!"],
            [0, "那你多吃米饭吧！", "Nà nǐ duō chī mǐfàn ba!", "Then have lots of rice!"]
          ]
        },
        {
          title: "Noodles for Xiaomei",
          zh: "我煮面条",
          setting: "Wang Fang makes a quick lunch for Xiaomei from next door.",
          cast: [["王芳", "Wáng Fāng"], ["小美", "Xiǎoměi"]],
          lines: [
            [0, "小美，你饿不饿？我给你煮面条吧。", "Xiǎoměi, nǐ è bu è? Wǒ gěi nǐ zhǔ miàntiáo ba.", "Xiaomei, are you hungry? I'll make you some noodles."],
            [1, "饿！我要放鸡蛋！", "È! Wǒ yào fàng jīdàn!", "Yes! I want egg in mine!"],
            [0, "好。你喝什么？咖啡？", "Hǎo. Nǐ hē shénme? Kāfēi?", "Okay. What do you want to drink? Coffee?"],
            [1, "不要！咖啡不好喝。我要果汁，甜的！", "Bú yào! Kāfēi bù hǎohē. Wǒ yào guǒzhī, tián de!", "No way! Coffee's yucky. I want juice, a sweet one!"],
            [0, "好了。你尝尝，味道好吗？", "Hǎo le. Nǐ chángchang, wèidào hǎo ma?", "Ready. Try it. How does it taste?"],
            [1, "好吃！我要再吃一碗！", "Hǎochī! Wǒ yào zài chī yì wǎn!", "Yummy! I want another bowl!"]
          ]
        }
      ]
    },

    22: {
      words: [
        ["身体", "shēntǐ", "body; health", "noun", "我爸爸身体很好。", "Wǒ bàba shēntǐ hěn hǎo.", "My dad is in great health."],
        ["头", "tóu", "head", "noun", "我今天头疼，想休息。", "Wǒ jīntiān tóu téng, xiǎng xiūxi.", "I have a headache today. I want to rest."],
        ["眼睛", "yǎnjing", "eye", "noun", "小美的眼睛很大。", "Xiǎoměi de yǎnjing hěn dà.", "Xiaomei has big eyes."],
        ["耳朵", "ěrduo", "ear", "noun", "你的耳朵很红！", "Nǐ de ěrduo hěn hóng!", "Your ears are all red!"],
        ["鼻子", "bízi", "nose", "noun", "大卫的鼻子很高。", "Dàwèi de bízi hěn gāo.", "David has a high nose bridge."],
        ["嘴", "zuǐ", "mouth", "noun", "小美的嘴很甜。", "Xiǎoměi de zuǐ hěn tián.", "Xiaomei is such a sweet talker."],
        ["手", "shǒu", "hand", "noun", "他手里有一杯咖啡。", "Tā shǒu li yǒu yì bēi kāfēi.", "He has a coffee in his hand."],
        ["脚", "jiǎo", "foot", "noun", "我的脚很大，鞋很难买。", "Wǒ de jiǎo hěn dà, xié hěn nán mǎi.", "My feet are big, so shoes are hard to find."],
        ["腿", "tuǐ", "leg", "noun", "昨天打排球，今天腿很疼。", "Zuótiān dǎ páiqiú, jīntiān tuǐ hěn téng.", "I played volleyball yesterday, and today my legs are sore."],
        ["肚子", "dùzi", "belly", "noun", "我肚子饿了。", "Wǒ dùzi è le.", "My stomach's growling."],
        ["牙", "yá", "tooth", "noun", "小美的牙很白。", "Xiǎoměi de yá hěn bái.", "Xiaomei's teeth are very white."],
        ["头发", "tóufa", "hair", "noun", "王芳的头发很黑，很漂亮。", "Wáng Fāng de tóufa hěn hēi, hěn piàoliang.", "Wang Fang's hair is dark and beautiful."],
        ["长", "cháng", "long", "adjective", "大卫很高，腿很长。", "Dàwèi hěn gāo, tuǐ hěn cháng.", "David is tall, with long legs."],
        ["短", "duǎn", "short (length)", "adjective", "我喜欢短头发。", "Wǒ xǐhuan duǎn tóufa.", "I like short hair."],
        ["疼", "téng", "to hurt; sore", "adjective", "你哪儿疼？", "Nǐ nǎr téng?", "Where does it hurt?"]
      ],
      patterns: [
        ["我……疼。", "Wǒ … téng.", "My … hurts.", "我肚子疼。", "Wǒ dùzi téng.", "My stomach hurts."],
        ["他/她……很……", "Tā … hěn …", "He/She has … (describing someone)", "她眼睛很大，头发很长。", "Tā yǎnjing hěn dà, tóufa hěn cháng.", "She has big eyes and long hair."]
      ],
      scenarios: [
        {
          title: "Sore after volleyball",
          zh: "你哪儿疼？",
          setting: "David limps home after a long volleyball game.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，你怎么了？很累吗？", "Dàwèi, nǐ zěnme le? Hěn lèi ma?", "David, what's wrong? Are you tired?"],
            [1, "今天打排球，腿真疼。", "Jīntiān dǎ páiqiú, tuǐ zhēn téng.", "I played volleyball today. My legs are so sore."],
            [0, "哪儿疼？是脚吗？", "Nǎr téng? Shì jiǎo ma?", "Where does it hurt? Your feet?"],
            [1, "脚不疼，腿疼。手也有一点儿疼。", "Jiǎo bù téng, tuǐ téng. Shǒu yě yǒu yìdiǎnr téng.", "Not my feet, my legs. My hands hurt a bit too."],
            [0, "你先休息吧，我给你一杯水。", "Nǐ xiān xiūxi ba, wǒ gěi nǐ yì bēi shuǐ.", "Rest first. I'll get you some water."],
            [1, "谢谢。没关系，我身体很好！", "Xièxie. Méi guānxi, wǒ shēntǐ hěn hǎo!", "Thanks. Don't worry, I'm tough!"],
            [1, "可是我肚子饿了！", "Kěshì wǒ dùzi è le!", "But I'm starving!"],
            [0, "好，我们吃饭吧！", "Hǎo, wǒmen chī fàn ba!", "Okay, let's eat!"]
          ]
        },
        {
          title: "Xiaomei takes Anna's photo",
          zh: "我给你拍照片",
          setting: "Xiaomei takes a photo of Anna and shows it to her.",
          cast: [["小美", "Xiǎoměi"], ["安娜", "Ānnà"]],
          lines: [
            [0, "安娜姐姐，我给你拍照片！", "Ānnà jiějie, wǒ gěi nǐ pāi zhàopiàn!", "Anna, I'm going to take your picture!"],
            [1, "好！我坐这儿。", "Hǎo! Wǒ zuò zhèr.", "Okay! I'll sit here."],
            [0, "你看，这是你的头，这是你的眼睛。", "Nǐ kàn, zhè shì nǐ de tóu, zhè shì nǐ de yǎnjing.", "Look, this is your head, and these are your eyes."],
            [1, "我的眼睛很大！", "Wǒ de yǎnjing hěn dà!", "My eyes are huge!"],
            [0, "你的鼻子很高。这是嘴，这是牙，真白！", "Nǐ de bízi hěn gāo. Zhè shì zuǐ, zhè shì yá, zhēn bái!", "Your nose is tall. Here's your mouth and your teeth, so white!"],
            [1, "耳朵呢？", "Ěrduo ne?", "What about my ears?"],
            [0, "你的头发很长，耳朵在里头！", "Nǐ de tóufa hěn cháng, ěrduo zài lǐtou!", "Your hair's long, your ears are hiding in there!"],
            [1, "很好看！谢谢小美。", "Hěn hǎokàn! Xièxie Xiǎoměi.", "It's lovely! Thank you, Xiaomei."]
          ]
        },
        {
          title: "A new haircut",
          zh: "短头发",
          setting: "Lin Mei sees Wang Fang's new haircut.",
          cast: [["林美", "Lín Měi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，你的头发真短！", "Wáng Fāng, nǐ de tóufa zhēn duǎn!", "Wang Fang, your hair is so short!"],
            [1, "是，我喜欢短头发。好看吗？", "Shì, wǒ xǐhuan duǎn tóufa. Hǎokàn ma?", "Yep, I like short hair. Does it look good?"],
            [0, "很好看！我的头发太长了。", "Hěn hǎokàn! Wǒ de tóufa tài cháng le.", "It looks great! My hair's way too long."],
            [1, "长头发也很漂亮。", "Cháng tóufa yě hěn piàoliang.", "Long hair is pretty too."],
            [0, "天很热，我也想要短头发。", "Tiān hěn rè, wǒ yě xiǎng yào duǎn tóufa.", "It's so hot, I want short hair too."],
            [1, "那我们一起去！", "Nà wǒmen yìqǐ qù!", "Then let's go together!"]
          ]
        }
      ]
    },

    23: {
      words: [
        ["医生", "yīshēng", "doctor", "noun", "我不舒服，想去看医生。", "Wǒ bù shūfu, xiǎng qù kàn yīshēng.", "I don't feel well. I want to see a doctor."],
        ["病", "bìng", "illness", "noun", "我的病好了。", "Wǒ de bìng hǎo le.", "I'm over my illness."],
        ["生病", "shēngbìng", "to get sick", "verb", "大卫生病了，今天在家休息。", "Dàwèi shēngbìng le, jīntiān zài jiā xiūxi.", "David is sick, so he's resting at home today."],
        ["药", "yào", "medicine", "noun", "吃了药，我舒服一点儿了。", "Chī le yào, wǒ shūfu yìdiǎnr le.", "I took the medicine, and I feel a bit better."],
        ["发烧", "fāshāo", "to have a fever", "verb", "我昨天晚上发烧了。", "Wǒ zuótiān wǎnshang fāshāo le.", "I had a fever last night."],
        ["感冒", "gǎnmào", "a cold; to catch a cold", "verb", "感冒了要多喝水。", "Gǎnmào le yào duō hē shuǐ.", "When you have a cold, drink lots of water."],
        ["咳嗽", "késou", "to cough", "verb", "他咳嗽了三天。", "Tā késou le sān tiān.", "He's been coughing for three days."],
        ["舒服", "shūfu", "comfortable; well", "adjective", "你今天舒服吗？", "Nǐ jīntiān shūfu ma?", "Are you feeling okay today?"],
        ["检查", "jiǎnchá", "to examine; to check", "verb", "明天我去医院检查。", "Míngtiān wǒ qù yīyuàn jiǎnchá.", "Tomorrow I'm going to the hospital for a checkup."],
        ["次", "cì", "time (occurrence)", "measure", "这个药一天吃三次。", "Zhège yào yì tiān chī sān cì.", "Take this medicine three times a day."],
        ["小时", "xiǎoshí", "hour", "noun", "我在医院等了两个小时。", "Wǒ zài yīyuàn děng le liǎng ge xiǎoshí.", "I waited two hours at the hospital."],
        ["打针", "dǎzhēn", "to get a shot", "verb", "我不想打针！", "Wǒ bù xiǎng dǎzhēn!", "I don't want a shot!"],
        ["应该", "yīnggāi", "should", "verb", "你应该多休息。", "Nǐ yīnggāi duō xiūxi.", "You should get more rest."],
        ["别", "bié", "don't", "adverb", "别喝冰水。", "Bié hē bīng shuǐ.", "Don't drink ice water."],
        ["一下", "yíxià", "a bit; briefly", "phrase", "你等一下。", "Nǐ děng yíxià.", "Wait a moment."]
      ],
      patterns: [
        ["你应该……", "Nǐ yīnggāi …", "You should …", "你应该去看医生。", "Nǐ yīnggāi qù kàn yīshēng.", "You should go see a doctor."],
        ["一天……次", "yì tiān … cì", "… times a day", "这个药一天吃两次。", "Zhège yào yì tiān chī liǎng cì.", "Take this medicine twice a day."]
      ],
      scenarios: [
        {
          title: "At the doctor's",
          zh: "看病",
          setting: "David sees a doctor at the hospital.",
          cast: [["医生", "yīshēng (doctor)"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "你好，哪儿不舒服？", "Nǐ hǎo, nǎr bù shūfu?", "Hello, what seems to be the problem?"],
            [1, "我头疼，也咳嗽。", "Wǒ tóu téng, yě késou.", "I have a headache, and a cough."],
            [0, "发烧吗？", "Fāshāo ma?", "Any fever?"],
            [1, "昨天晚上发烧了。", "Zuótiān wǎnshang fāshāo le.", "I had a fever last night."],
            [0, "我检查一下……你感冒了。", "Wǒ jiǎnchá yíxià… nǐ gǎnmào le.", "Let me take a look… You've got a cold."],
            [1, "要打针吗？", "Yào dǎzhēn ma?", "Do I need a shot?"],
            [0, "不打针。吃这个药，一天三次。多喝水，多休息。", "Bù dǎzhēn. Chī zhège yào, yì tiān sān cì. Duō hē shuǐ, duō xiūxi.", "No shot. Take this medicine three times a day. Drink plenty of water and get lots of rest."],
            [1, "好，谢谢医生！", "Hǎo, xièxie yīshēng!", "Okay, thank you, doctor!"]
          ]
        },
        {
          title: "Xiaomei's shot",
          zh: "我不想打针！",
          setting: "Wang Fang takes feverish Xiaomei to the clinic.",
          cast: [["小美", "Xiǎoměi"], ["王芳", "Wáng Fāng"], ["护士", "hùshi (nurse)"]],
          lines: [
            [0, "我不想打针！", "Wǒ bù xiǎng dǎzhēn!", "I don't want a shot!"],
            [1, "小美，你发烧了，应该打针。", "Xiǎoměi, nǐ fāshāo le, yīnggāi dǎzhēn.", "Xiaomei, you have a fever. You need a shot."],
            [0, "打针很疼！", "Dǎzhēn hěn téng!", "Shots hurt!"],
            [2, "别看，很快。一，二，三……好了！", "Bié kàn, hěn kuài. Yī, èr, sān… hǎo le!", "Don't look, it's quick. One, two, three… done!"],
            [0, "……不疼！", "… Bù téng!", "…It didn't hurt!"],
            [1, "小美真好！我们回家休息吧。", "Xiǎoměi zhēn hǎo! Wǒmen huíjiā xiūxi ba.", "Good girl, Xiaomei! Let's go home and rest."]
          ]
        },
        {
          title: "Just a little cold",
          zh: "小病",
          setting: "Lin Mei finds Li Ming coughing on the way to work.",
          cast: [["林美", "Lín Měi"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，你不舒服吗？", "Lǐ Míng, nǐ bù shūfu ma?", "Li Ming, are you not feeling well?"],
            [1, "我感冒了，有一点儿咳嗽。", "Wǒ gǎnmào le, yǒu yìdiǎnr késou.", "I've got a cold and a bit of a cough."],
            [0, "你生病了，应该去看医生。", "Nǐ shēngbìng le, yīnggāi qù kàn yīshēng.", "You're sick. You should see a doctor."],
            [1, "我昨天去医院了，等了两个小时！", "Wǒ zuótiān qù yīyuàn le, děng le liǎng ge xiǎoshí!", "I went to the hospital yesterday and waited two hours!"],
            [0, "你吃药了吗？", "Nǐ chī yào le ma?", "Have you taken your medicine?"],
            [1, "吃了，一天两次。没关系，小病。", "Chī le, yì tiān liǎng cì. Méi guānxi, xiǎo bìng.", "Yes, twice a day. Don't worry, it's nothing serious."],
            [0, "别喝冰咖啡了，多休息吧！", "Bié hē bīng kāfēi le, duō xiūxi ba!", "No more iced coffee, and get some rest!"]
          ]
        }
      ]
    },

    24: {
      words: [
        ["手机", "shǒujī", "cell phone", "noun", "我的手机呢？", "Wǒ de shǒujī ne?", "Where's my phone?"],
        ["电话", "diànhuà", "phone call; telephone", "noun", "我给妈妈打电话。", "Wǒ gěi māma dǎ diànhuà.", "I'm calling my mom."],
        ["号码", "hàomǎ", "number", "noun", "你的手机号码是多少？", "Nǐ de shǒujī hàomǎ shì duōshao?", "What's your phone number?"],
        ["发", "fā", "to send", "verb", "我给你发照片。", "Wǒ gěi nǐ fā zhàopiàn.", "I'll send you the photos."],
        ["短信", "duǎnxìn", "text message", "noun", "你看我的短信了吗？", "Nǐ kàn wǒ de duǎnxìn le ma?", "Did you read my text?"],
        ["微信", "Wēixìn", "WeChat", "noun", "你有微信吗？", "Nǐ yǒu Wēixìn ma?", "Are you on WeChat?"],
        ["喂", "wéi", "hello (on the phone)", "phrase", "喂，你好！", "Wéi, nǐ hǎo!", "Hello?"],
        ["接", "jiē", "to answer; to pick up", "verb", "他没接电话。", "Tā méi jiē diànhuà.", "He didn't pick up."],
        ["回", "huí", "to reply; to return", "verb", "我晚上回你。", "Wǒ wǎnshang huí nǐ.", "I'll get back to you tonight."],
        ["说", "shuō", "to say; to speak", "verb", "你说什么？", "Nǐ shuō shénme?", "What did you say?"],
        ["声音", "shēngyīn", "sound; voice", "noun", "声音太小了。", "Shēngyīn tài xiǎo le.", "The sound is too low."],
        ["没电", "méi diàn", "out of battery", "phrase", "我的手机没电了。", "Wǒ de shǒujī méi diàn le.", "My phone's dead."],
        ["充电", "chōngdiàn", "to charge", "verb", "手机在充电。", "Shǒujī zài chōngdiàn.", "The phone is charging."],
        ["视频", "shìpín", "video", "noun", "我常常和妈妈视频。", "Wǒ chángcháng hé māma shìpín.", "I often video-chat with my mom."],
        ["马上", "mǎshàng", "right away", "adverb", "我马上来！", "Wǒ mǎshàng lái!", "I'll be right there!"]
      ],
      patterns: [
        ["给……打电话", "gěi … dǎ diànhuà", "to call …", "晚上我给你打电话。", "Wǎnshang wǒ gěi nǐ dǎ diànhuà.", "I'll call you tonight."],
        ["我马上……", "Wǒ mǎshàng …", "I'll … right away", "我马上回家。", "Wǒ mǎshàng huíjiā.", "I'm heading home right now."]
      ],
      scenarios: [
        {
          title: "My phone died",
          zh: "手机没电了",
          setting: "David finally gets back to Wang Fang in the late afternoon.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，你看我的微信了吗？", "Dàwèi, nǐ kàn wǒ de Wēixìn le ma?", "David, did you see my WeChat message?"],
            [1, "没有。对不起，我的手机没电了。", "Méiyǒu. Duìbuqǐ, wǒ de shǒujī méi diàn le.", "No. Sorry, my phone died."],
            [0, "我给你打了电话，你也没接！", "Wǒ gěi nǐ dǎ le diànhuà, nǐ yě méi jiē!", "I called you and you didn't pick up either!"],
            [1, "我在充电呢。你发什么了？", "Wǒ zài chōngdiàn ne. Nǐ fā shénme le?", "I'm charging it now. What did you send?"],
            [0, "今天晚上李明来我们家吃饭。", "Jīntiān wǎnshang Lǐ Míng lái wǒmen jiā chī fàn.", "Li Ming is coming over for dinner tonight."],
            [1, "几点？", "Jǐ diǎn?", "What time?"],
            [0, "七点。你马上回来，好吗？", "Qī diǎn. Nǐ mǎshàng huílai, hǎo ma?", "Seven. Can you come home now?"],
            [1, "好，我马上回家！", "Hǎo, wǒ mǎshàng huíjiā!", "Okay, I'm on my way!"]
          ]
        },
        {
          title: "Can you hear me?",
          zh: "喂？",
          setting: "Anna calls David from the park.",
          cast: [["安娜", "Ānnà"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "喂？大卫，你好！", "Wéi? Dàwèi, nǐ hǎo!", "Hello? Hi, David!"],
            [1, "安娜，你好！你的声音很小。", "Ānnà, nǐ hǎo! Nǐ de shēngyīn hěn xiǎo.", "Hi, Anna! I can barely hear you."],
            [0, "现在呢？", "Xiànzài ne?", "How about now?"],
            [1, "现在好。你在哪儿？", "Xiànzài hǎo. Nǐ zài nǎr?", "That's better. Where are you?"],
            [0, "我在公园。我们视频，好吗？", "Wǒ zài gōngyuán. Wǒmen shìpín, hǎo ma?", "I'm at the park. Want to video-chat?"],
            [1, "好！……我看不到你。", "Hǎo! … Wǒ kàn bu dào nǐ.", "Sure! … I can't see you."],
            [0, "等一下，我再给你打。", "Děng yíxià, wǒ zài gěi nǐ dǎ.", "Hang on, I'll call you back."]
          ]
        },
        {
          title: "No reply",
          zh: "他不回我",
          setting: "Lin Mei is waiting to hear back from Li Ming.",
          cast: [["林美", "Lín Měi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，他没回我的短信。", "Wáng Fāng, tā méi huí wǒ de duǎnxìn.", "Wang Fang, he hasn't answered my texts."],
            [1, "谁？李明吗？", "Shéi? Lǐ Míng ma?", "Who? Li Ming?"],
            [0, "是。我昨天给他发了三个短信。", "Shì. Wǒ zuótiān gěi tā fā le sān ge duǎnxìn.", "Yes. I sent him three texts yesterday."],
            [1, "你给他打电话了吗？", "Nǐ gěi tā dǎ diànhuà le ma?", "Did you call him?"],
            [0, "打了，他没接。", "Dǎ le, tā méi jiē.", "I did. He didn't pick up."],
            [1, "他说他今天很忙。", "Tā shuō tā jīntiān hěn máng.", "He said he's busy today."],
            [0, "……是他！喂，李明！", "… Shì tā! Wéi, Lǐ Míng!", "… It's him! Hello, Li Ming!"]
          ]
        }
      ]
    },

    25: {
      words: [
        ["试", "shì", "to try (on)", "verb", "我试一下。", "Wǒ shì yíxià.", "Let me try it on."],
        ["合适", "héshì", "suitable; fits well", "adjective", "这件衣服你穿很合适。", "Zhè jiàn yīfu nǐ chuān hěn héshì.", "That really suits you."],
        ["大小", "dàxiǎo", "size", "noun", "大小合适吗？", "Dàxiǎo héshì ma?", "Is it the right size?"],
        ["毛衣", "máoyī", "sweater", "noun", "我想买一件红毛衣。", "Wǒ xiǎng mǎi yí jiàn hóng máoyī.", "I want to buy a red sweater."],
        ["外套", "wàitào", "coat; jacket", "noun", "你的外套在哪儿？", "Nǐ de wàitào zài nǎr?", "Where's your coat?"],
        ["衬衫", "chènshān", "shirt", "noun", "他穿白衬衫。", "Tā chuān bái chènshān.", "He's wearing a white shirt."],
        ["条", "tiáo", "(measure word for pants, skirts)", "measure", "这条裙子多少钱？", "Zhè tiáo qúnzi duōshao qián?", "How much is this skirt?"],
        ["一样", "yíyàng", "the same", "adjective", "我们的鞋一样！", "Wǒmen de xié yíyàng!", "We have the same shoes!"],
        ["比", "bǐ", "compared to", "preposition", "这件比那件贵。", "Zhè jiàn bǐ nà jiàn guì.", "This one is more expensive than that one."],
        ["更", "gèng", "even more", "adverb", "蓝的更好看。", "Lán de gèng hǎokàn.", "The blue one looks even better."],
        ["打折", "dǎzhé", "to give a discount", "verb", "今天打折吗？", "Jīntiān dǎzhé ma?", "Is there a sale on today?"],
        ["付", "fù", "to pay", "verb", "我来付。", "Wǒ lái fù.", "I'll pay."],
        ["现金", "xiànjīn", "cash", "noun", "我没有现金。", "Wǒ méiyǒu xiànjīn.", "I don't have any cash."],
        ["刷卡", "shuākǎ", "to pay by card", "verb", "刷卡还是现金？", "Shuākǎ háishi xiànjīn?", "Card or cash?"],
        ["这么", "zhème", "so; this (这么贵 = so expensive)", "adverb", "这件外套怎么这么贵？", "Zhè jiàn wàitào zěnme zhème guì?", "Why is this coat so expensive?"]
      ],
      patterns: [
        ["A 比 B ……", "A bǐ B …", "A is more … than B", "这条裙子比那条便宜。", "Zhè tiáo qúnzi bǐ nà tiáo piányi.", "This skirt is cheaper than that one."],
        ["我想试一下……", "Wǒ xiǎng shì yíxià …", "I'd like to try on …", "我想试一下这件外套。", "Wǒ xiǎng shì yíxià zhè jiàn wàitào.", "I'd like to try on this jacket."]
      ],
      scenarios: [
        {
          title: "Trying on a sweater",
          zh: "试毛衣",
          setting: "Wang Fang spots a sweater she likes in a clothing shop.",
          cast: [["王芳", "Wáng Fāng"], ["店员", "diànyuán (shop assistant)"]],
          lines: [
            [0, "你好，我想试一下这件毛衣。", "Nǐ hǎo, wǒ xiǎng shì yíxià zhè jiàn máoyī.", "Hi, I'd like to try on this sweater."],
            [1, "好的。你要大的还是小的？", "Hǎo de. Nǐ yào dà de háishi xiǎo de?", "Sure. Large or small?"],
            [0, "小的。", "Xiǎo de.", "Small."],
            [1, "大小合适吗？", "Dàxiǎo héshì ma?", "How's the size?"],
            [0, "很合适。有黑的吗？", "Hěn héshì. Yǒu hēi de ma?", "It fits well. Do you have it in black?"],
            [1, "有。黑的比红的更好看！", "Yǒu. Hēi de bǐ hóng de gèng hǎokàn!", "We do. The black one looks even better than the red!"],
            [0, "好，我要黑的。多少钱？", "Hǎo, wǒ yào hēi de. Duōshao qián?", "Okay, I'll take the black one. How much?"],
            [1, "今天打折，九十块。", "Jīntiān dǎzhé, jiǔshí kuài.", "It's on sale today: 90 yuan."],
            [0, "这么便宜？太好了！", "Zhème piányi? Tài hǎo le!", "That cheap? Great!"]
          ]
        },
        {
          title: "Card or cash?",
          zh: "刷卡还是现金？",
          setting: "David pays for a shirt and a pair of pants.",
          cast: [["店员", "diànyuán (shop assistant)"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "一件衬衫，一条裤子，九十块。刷卡还是现金？", "Yí jiàn chènshān, yì tiáo kùzi, jiǔshí kuài. Shuākǎ háishi xiànjīn?", "One shirt and one pair of pants, 90 yuan. Card or cash?"],
            [1, "刷卡。", "Shuākǎ.", "Card."],
            [0, "对不起，今天刷卡有问题。", "Duìbuqǐ, jīntiān shuākǎ yǒu wèntí.", "Sorry, the card machine isn't working today."],
            [1, "好，我付现金。给你。", "Hǎo, wǒ fù xiànjīn. Gěi nǐ.", "Okay, I'll pay cash. Here you go."],
            [0, "谢谢！不合适可以再来换。", "Xièxie! Bù héshì kěyǐ zài lái huàn.", "Thanks! If they don't fit, you can come back and exchange them."],
            [1, "好的，谢谢！", "Hǎo de, xièxie!", "Great, thanks!"]
          ]
        },
        {
          title: "The same coat",
          zh: "一样的外套",
          setting: "Lin Mei admires Anna's new coat.",
          cast: [["林美", "Lín Měi"], ["安娜", "Ānnà"]],
          lines: [
            [0, "安娜，你的外套很好看！", "Ānnà, nǐ de wàitào hěn hǎokàn!", "Anna, your coat looks great!"],
            [1, "谢谢！是新的，打折的时候买的。", "Xièxie! Shì xīn de, dǎzhé de shíhou mǎi de.", "Thanks! It's new. I got it on sale."],
            [0, "我也有一件，和你的一样！", "Wǒ yě yǒu yí jiàn, hé nǐ de yíyàng!", "I have one just like it!"],
            [1, "一样？什么颜色？", "Yíyàng? Shénme yánsè?", "The same one? What color?"],
            [0, "也是蓝的。我的比你的长一点儿。", "Yě shì lán de. Wǒ de bǐ nǐ de cháng yìdiǎnr.", "Blue too. Mine's a little longer than yours."],
            [1, "明天我们都穿吧！", "Míngtiān wǒmen dōu chuān ba!", "Let's both wear them tomorrow!"],
            [0, "好！", "Hǎo!", "Deal!"]
          ]
        }
      ]
    },

    26: {
      words: [
        ["上班", "shàngbān", "to go to work", "verb", "我每天八点上班。", "Wǒ měi tiān bā diǎn shàngbān.", "I start work at eight every day."],
        ["下班", "xiàbān", "to get off work", "verb", "你几点下班？", "Nǐ jǐ diǎn xiàbān?", "What time do you finish work?"],
        ["工作", "gōngzuò", "work; job; to work", "noun", "你做什么工作？", "Nǐ zuò shénme gōngzuò?", "What do you do for work?"],
        ["公司", "gōngsī", "company", "noun", "我们公司离我家很近。", "Wǒmen gōngsī lí wǒ jiā hěn jìn.", "Our company is close to my home."],
        ["办公室", "bàngōngshì", "office", "noun", "我的办公室在五楼。", "Wǒ de bàngōngshì zài wǔ lóu.", "My office is on the fifth floor."],
        ["同事", "tóngshì", "coworker", "noun", "她是我的同事。", "Tā shì wǒ de tóngshì.", "She's my coworker."],
        ["老板", "lǎobǎn", "boss", "noun", "老板今天不在。", "Lǎobǎn jīntiān bú zài.", "The boss isn't in today."],
        ["开会", "kāihuì", "to have a meeting", "verb", "下午两点开会。", "Xiàwǔ liǎng diǎn kāihuì.", "There's a meeting at two this afternoon."],
        ["电脑", "diànnǎo", "computer", "noun", "我的电脑太慢了。", "Wǒ de diànnǎo tài màn le.", "My computer is way too slow."],
        ["事", "shì", "thing to do; matter", "noun", "你有什么事？", "Nǐ yǒu shénme shì?", "What do you need?"],
        ["完", "wán", "to finish", "verb", "我吃完了。", "Wǒ chī wán le.", "I'm done eating."],
        ["加班", "jiābān", "to work overtime", "verb", "今天我要加班。", "Jīntiān wǒ yào jiābān.", "I have to work late today."],
        ["已经", "yǐjīng", "already", "adverb", "已经十点了！", "Yǐjīng shí diǎn le!", "It's already ten!"],
        ["还", "hái", "still; also", "adverb", "他还在公司。", "Tā hái zài gōngsī.", "He's still at the office."],
        ["能", "néng", "can; be able to", "verb", "你明天能来吗？", "Nǐ míngtiān néng lái ma?", "Can you come tomorrow?"]
      ],
      patterns: [
        ["……完了", "… wán le", "finished …ing", "工作做完了吗？", "Gōngzuò zuò wán le ma?", "Is the work done?"],
        ["已经……了", "yǐjīng … le", "already …", "他已经下班了。", "Tā yǐjīng xiàbān le.", "He's already gone home for the day."]
      ],
      scenarios: [
        {
          title: "Working late",
          zh: "加班",
          setting: "David calls Wang Fang in the evening.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，你下班了吗？", "Wáng Fāng, nǐ xiàbān le ma?", "Wang Fang, are you off work yet?"],
            [1, "还没有。我还在办公室。", "Hái méiyǒu. Wǒ hái zài bàngōngshì.", "Not yet. I'm still at the office."],
            [0, "已经八点了！你今天加班吗？", "Yǐjīng bā diǎn le! Nǐ jīntiān jiābān ma?", "It's already eight! Are you working late today?"],
            [1, "是，工作太多了，今天要做完。", "Shì, gōngzuò tài duō le, jīntiān yào zuò wán.", "Yes, there is too much work, and it has to be done today."],
            [0, "你吃晚饭了吗？", "Nǐ chī wǎnfàn le ma?", "Have you had dinner?"],
            [1, "还没呢。我很饿……", "Hái méi ne. Wǒ hěn è…", "Not yet. I'm starving…"],
            [0, "我给你做面条。你几点能回家？", "Wǒ gěi nǐ zuò miàntiáo. Nǐ jǐ diǎn néng huíjiā?", "I'll make you noodles. What time can you get home?"],
            [1, "九点。谢谢你！", "Jiǔ diǎn. Xièxie nǐ!", "Nine. Thank you!"]
          ]
        },
        {
          title: "A slow computer",
          zh: "电脑太慢了",
          setting: "Li Ming is at his desk long before anyone else.",
          cast: [["经理", "jīnglǐ (manager)"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，早上好！你几点来上班？", "Lǐ Míng, zǎoshang hǎo! Nǐ jǐ diǎn lái shàngbān?", "Morning, Li Ming! What time did you get in?"],
            [1, "七点。", "Qī diǎn.", "Seven."],
            [0, "这么早！今天十点开会，你知道吗？", "Zhème zǎo! Jīntiān shí diǎn kāihuì, nǐ zhīdào ma?", "That early! There's a meeting at ten today, did you know?"],
            [1, "知道。我的电脑有问题……", "Zhīdào. Wǒ de diànnǎo yǒu wèntí…", "I know. My computer has a problem…"],
            [0, "什么问题？", "Shénme wèntí?", "What kind of problem?"],
            [1, "太慢了！", "Tài màn le!", "It's way too slow!"],
            [0, "下午给你换一个新的。", "Xiàwǔ gěi nǐ huàn yí ge xīn de.", "We'll get you a new one this afternoon."],
            [1, "太好了，谢谢！", "Tài hǎo le, xièxie!", "Great, thanks!"]
          ]
        },
        {
          title: "A new coworker",
          zh: "新同事",
          setting: "Lin Mei welcomes Anna on her first day at the company.",
          cast: [["林美", "Lín Měi"], ["安娜", "Ānnà"]],
          lines: [
            [0, "你好！你是新同事吗？", "Nǐ hǎo! Nǐ shì xīn tóngshì ma?", "Hi! Are you our new coworker?"],
            [1, "是，我叫安娜。", "Shì, wǒ jiào Ānnà.", "Yes, I'm Anna."],
            [0, "我叫林美。有什么事，你来找我。", "Wǒ jiào Lín Měi. Yǒu shénme shì, nǐ lái zhǎo wǒ.", "I'm Lin Mei. If you need anything, come find me."],
            [1, "谢谢！老板的办公室在哪儿？", "Xièxie! Lǎobǎn de bàngōngshì zài nǎr?", "Thanks! Where's the boss's office?"],
            [0, "在那儿，左边。他现在开会。", "Zài nàr, zuǒbian. Tā xiànzài kāihuì.", "Over there, on the left. He's in a meeting right now."],
            [1, "我们公司几点下班？", "Wǒmen gōngsī jǐ diǎn xiàbān?", "What time do we finish here?"],
            [0, "六点。可是我们常常加班。", "Liù diǎn. Kěshì wǒmen chángcháng jiābān.", "Six. But we often work late."]
          ]
        }
      ]
    },

    27: {
      words: [
        ["朋友", "péngyou", "friend", "noun", "他是我的好朋友。", "Tā shì wǒ de hǎo péngyou.", "He's a good friend of mine."],
        ["约", "yuē", "to make plans with", "verb", "今天晚上我约了林美。", "Jīntiān wǎnshang wǒ yuē le Lín Měi.", "I've got plans with Lin Mei tonight."],
        ["见面", "jiànmiàn", "to meet up", "verb", "我们几点见面？", "Wǒmen jǐ diǎn jiànmiàn?", "What time are we meeting?"],
        ["有空", "yǒukòng", "to be free", "phrase", "你周末有空吗？", "Nǐ zhōumò yǒukòng ma?", "Are you free this weekend?"],
        ["时间", "shíjiān", "time", "noun", "我今天没有时间。", "Wǒ jīntiān méiyǒu shíjiān.", "I don't have time today."],
        ["打算", "dǎsuan", "to plan to", "verb", "你明天打算做什么？", "Nǐ míngtiān dǎsuan zuò shénme?", "What are you planning to do tomorrow?"],
        ["安排", "ānpái", "to arrange; plans", "verb", "你周末有什么安排？", "Nǐ zhōumò yǒu shénme ānpái?", "Do you have any plans this weekend?"],
        ["一会儿", "yíhuìr", "a little while", "phrase", "我一会儿给你打电话。", "Wǒ yíhuìr gěi nǐ dǎ diànhuà.", "I'll call you in a little while."],
        ["怎么样", "zěnmeyàng", "how about it?; how is it?", "question", "星期六怎么样？", "Xīngqīliù zěnmeyàng?", "How about Saturday?"],
        ["行", "xíng", "okay; that works", "adjective", "三点？行！", "Sān diǎn? Xíng!", "Three o'clock? Works for me!"],
        ["门口", "ménkǒu", "entrance; doorway", "noun", "我在门口等你。", "Wǒ zài ménkǒu děng nǐ.", "I'll wait for you at the entrance."],
        ["迟到", "chídào", "to be late", "verb", "对不起，我迟到了！", "Duìbuqǐ, wǒ chídào le!", "Sorry I'm late!"],
        ["见", "jiàn", "to see; to meet", "verb", "明天见！", "Míngtiān jiàn!", "See you tomorrow!"],
        ["决定", "juédìng", "to decide", "verb", "你决定了吗？", "Nǐ juédìng le ma?", "Have you decided?"],
        ["明年", "míngnián", "next year", "noun", "明年我打算去中国旅游。", "Míngnián wǒ dǎsuan qù Zhōngguó lǚyóu.", "Next year I'm planning to travel to China."]
      ],
      patterns: [
        ["……怎么样？", "… zěnmeyàng?", "How about …?", "我们去公园，怎么样？", "Wǒmen qù gōngyuán, zěnmeyàng?", "How about we go to the park?"],
        ["我们……吧", "Wǒmen … ba", "Let's …", "我们一起去游泳吧！", "Wǒmen yìqǐ qù yóuyǒng ba!", "Let's go swimming together!"]
      ],
      scenarios: [
        {
          title: "Free this weekend?",
          zh: "你周末有空吗？",
          setting: "David wants a volleyball partner for Sunday.",
          cast: [["大卫", "Dàwèi"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，你周末有空吗？", "Lǐ Míng, nǐ zhōumò yǒukòng ma?", "Li Ming, are you free this weekend?"],
            [1, "星期六不行，星期天有空。", "Xīngqīliù bù xíng, xīngqītiān yǒukòng.", "Saturday's no good, but I'm free Sunday."],
            [0, "星期天我们去打排球吧！", "Xīngqītiān wǒmen qù dǎ páiqiú ba!", "Let's play volleyball on Sunday!"],
            [1, "好！几点？", "Hǎo! Jǐ diǎn?", "Sure! What time?"],
            [0, "上午十点怎么样？", "Shàngwǔ shí diǎn zěnmeyàng?", "How about ten in the morning?"],
            [1, "十点？太晚了！八点怎么样？", "Shí diǎn? Tài wǎn le! Bā diǎn zěnmeyàng?", "Ten? That's too late! How about eight?"],
            [0, "八点？……行，八点吧。我们在哪儿见面？", "Bā diǎn? … Xíng, bā diǎn ba. Wǒmen zài nǎr jiànmiàn?", "Eight? … Fine, eight it is. Where should we meet?"],
            [1, "公园门口见！", "Gōngyuán ménkǒu jiàn!", "See you at the park entrance!"]
          ]
        },
        {
          title: "Running late",
          zh: "我要迟到了",
          setting: "Lin Mei is waiting at the café when Anna calls.",
          cast: [["林美", "Lín Měi"], ["安娜", "Ānnà"]],
          lines: [
            [0, "喂，安娜，你在哪儿？", "Wéi, Ānnà, nǐ zài nǎr?", "Hello, Anna? Where are you?"],
            [1, "对不起，我要迟到了！地铁太挤了。", "Duìbuqǐ, wǒ yào chídào le! Dìtiě tài jǐ le.", "Sorry, I'm going to be late! The subway is packed."],
            [0, "没关系。你几点能到？", "Méi guānxi. Nǐ jǐ diǎn néng dào?", "No problem. When can you get here?"],
            [1, "再等一会儿，十分钟。你先喝杯咖啡吧。", "Zài děng yíhuìr, shí fēnzhōng. Nǐ xiān hē bēi kāfēi ba.", "Give me a little while, ten minutes. Grab a coffee first."],
            [0, "行，我等你。", "Xíng, wǒ děng nǐ.", "Okay, I'll wait for you."],
            [1, "谢谢！我马上到！", "Xièxie! Wǒ mǎshàng dào!", "Thanks! I'll be right there!"]
          ]
        },
        {
          title: "Plans tonight",
          zh: "今天晚上的安排",
          setting: "Wang Fang tries to get David to come out tonight.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，你今天晚上打算做什么？", "Dàwèi, nǐ jīntiān wǎnshang dǎsuan zuò shénme?", "David, what are you up to tonight?"],
            [1, "我约了朋友吃饭。你呢？", "Wǒ yuē le péngyou chī fàn. Nǐ ne?", "I'm having dinner with a friend. You?"],
            [0, "我和林美去电影院。你也来吧！", "Wǒ hé Lín Měi qù diànyǐngyuàn. Nǐ yě lái ba!", "Lin Mei and I are going to the movies. Come along!"],
            [1, "今天不行，我已经有安排了。下次吧！", "Jīntiān bù xíng, wǒ yǐjīng yǒu ānpái le. Xià cì ba!", "Not today, I already have plans. Next time!"],
            [0, "好吧。那星期五怎么样？", "Hǎo ba. Nà xīngqīwǔ zěnmeyàng?", "Okay. How about Friday, then?"],
            [1, "星期五可以！", "Xīngqīwǔ kěyǐ!", "Friday works!"],
            [0, "好，决定了！星期五见！", "Hǎo, juédìng le! Xīngqīwǔ jiàn!", "Great, it's settled! See you Friday!"]
          ]
        }
      ]
    },

    28: {
      words: [
        ["比赛", "bǐsài", "match; game", "noun", "我喜欢看排球比赛。", "Wǒ xǐhuan kàn páiqiú bǐsài.", "I love watching volleyball matches."],
        ["赢", "yíng", "to win", "verb", "我们赢了！", "Wǒmen yíng le!", "We won!"],
        ["输", "shū", "to lose", "verb", "红队输了。", "Hóng duì shū le.", "The red team lost."],
        ["比分", "bǐfēn", "score", "noun", "现在比分是多少？", "Xiànzài bǐfēn shì duōshao?", "What's the score now?"],
        ["加油", "jiāyóu", "come on! (cheering)", "phrase", "大卫，加油！", "Dàwèi, jiāyóu!", "Come on, David!"],
        ["场", "chǎng", "(measure word for games)", "measure", "今天有两场比赛。", "Jīntiān yǒu liǎng chǎng bǐsài.", "There are two matches today."],
        ["球员", "qiúyuán", "player", "noun", "他是我们队最高的球员。", "Tā shì wǒmen duì zuì gāo de qiúyuán.", "He's the tallest player on our team."],
        ["教练", "jiàoliàn", "coach", "noun", "我们的教练是中国人。", "Wǒmen de jiàoliàn shì Zhōngguó rén.", "Our coach is Chinese."],
        ["练习", "liànxí", "to practice", "verb", "我们每个星期练习三次。", "Wǒmen měi ge xīngqī liànxí sān cì.", "We practice three times a week."],
        ["开始", "kāishǐ", "to start", "verb", "比赛几点开始？", "Bǐsài jǐ diǎn kāishǐ?", "What time does the match start?"],
        ["结束", "jiéshù", "to end", "verb", "比赛结束了。", "Bǐsài jiéshù le.", "The match is over."],
        ["第", "dì", "(makes ordinal numbers: 第一 = first)", "number", "我们队是第一！", "Wǒmen duì shì dì yī!", "Our team came first!"],
        ["平", "píng", "tied (score)", "adjective", "现在三比三，平了。", "Xiànzài sān bǐ sān, píng le.", "It's three all. Tied."],
        ["厉害", "lìhai", "amazing; impressive", "adjective", "你太厉害了！", "Nǐ tài lìhai le!", "You're amazing!"],
        ["可惜", "kěxī", "what a pity", "adjective", "太可惜了！", "Tài kěxī le!", "What a shame!"]
      ],
      patterns: [
        ["……比……", "… bǐ …", "… to … (score)", "现在二十比十八。", "Xiànzài èrshí bǐ shíbā.", "It's 20 to 18."],
        ["第……场", "dì … chǎng", "the …th game", "第二场比赛我们赢了。", "Dì èr chǎng bǐsài wǒmen yíng le.", "We won the second game."]
      ],
      scenarios: [
        {
          title: "Before the match",
          zh: "比赛十点开始",
          setting: "David arrives at the gym on match day and finds his coach.",
          cast: [["教练", "jiàoliàn (coach)"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，你来了！比赛十点开始。", "Dàwèi, nǐ lái le! Bǐsài shí diǎn kāishǐ.", "David, you're here! The match starts at ten."],
            [1, "教练，今天我们打几场？", "Jiàoliàn, jīntiān wǒmen dǎ jǐ chǎng?", "Coach, how many games are we playing today?"],
            [0, "两场。第二场下午两点。", "Liǎng chǎng. Dì èr chǎng xiàwǔ liǎng diǎn.", "Two. The second one is at two this afternoon."],
            [1, "那个队的球员都很高！", "Nà ge duì de qiúyuán dōu hěn gāo!", "That team's players are all so tall!"],
            [0, "没关系，我们也很厉害！", "Méi guānxi, wǒmen yě hěn lìhai!", "Don't worry, we're good too!"],
            [1, "好！我先发球吗？", "Hǎo! Wǒ xiān fāqiú ma?", "Okay! Am I serving first?"],
            [0, "是，你先发球。加油！", "Shì, nǐ xiān fāqiú. Jiāyóu!", "Yes, you serve first. Go get them!"]
          ]
        },
        {
          title: "Cheering in the stands",
          zh: "加油！",
          setting: "Wang Fang brings Xiaomei to watch David's match.",
          cast: [["小美", "Xiǎoměi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，大卫在哪儿？", "Wáng Fāng, Dàwèi zài nǎr?", "Wang Fang, where's David?"],
            [1, "那儿！他是七号球员。", "Nàr! Tā shì qī hào qiúyuán.", "Over there! He's number seven."],
            [0, "比分是多少？", "Bǐfēn shì duōshao?", "What's the score?"],
            [1, "二十比二十，平了！", "Èrshí bǐ èrshí, píng le!", "Twenty all. It's tied!"],
            [0, "大卫，加油！加油！", "Dàwèi, jiāyóu! Jiāyóu!", "Go, David! Go!"],
            [1, "大卫发球……好球！", "Dàwèi fāqiú… Hǎo qiú!", "David's serving… Great serve!"],
            [0, "大卫打得真好！太厉害了！", "Dàwèi dǎ de zhēn hǎo! Tài lìhai le!", "David plays so well! He's amazing!"]
          ]
        },
        {
          title: "After the game",
          zh: "比赛结束了",
          setting: "Li Ming calls David that evening to hear how it went.",
          cast: [["李明", "Lǐ Míng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，比赛结束了吗？你的队赢了吗？", "Dàwèi, bǐsài jiéshù le ma? Nǐ de duì yíng le ma?", "David, is the match over? Did your team win?"],
            [1, "第一场我们赢了，第二场输了。", "Dì yī chǎng wǒmen yíng le, dì èr chǎng shū le.", "We won the first game and lost the second."],
            [0, "太可惜了！比分是多少？", "Tài kěxī le! Bǐfēn shì duōshao?", "What a shame! What was the score?"],
            [1, "二十三比二十五。", "Èrshísān bǐ èrshíwǔ.", "Twenty-three to twenty-five."],
            [0, "没关系！下次加油！", "Méi guānxi! Xià cì jiāyóu!", "Never mind! You'll get them next time!"],
            [1, "教练说我们要多练习。", "Jiàoliàn shuō wǒmen yào duō liànxí.", "The coach says we need to practice more."],
            [0, "我也想打排球。我可以去吗？", "Wǒ yě xiǎng dǎ páiqiú. Wǒ kěyǐ qù ma?", "I'd like to play volleyball too. Can I come?"],
            [1, "可以！星期六我们一起练习吧！", "Kěyǐ! Xīngqīliù wǒmen yìqǐ liànxí ba!", "Sure! Let's practice together on Saturday!"]
          ]
        }
      ]
    },

    29: {
      words: [
        ["动物", "dòngwù", "animal", "noun", "你喜欢什么动物？", "Nǐ xǐhuan shénme dòngwù?", "What animals do you like?"],
        ["狗", "gǒu", "dog", "noun", "我家有一只狗。", "Wǒ jiā yǒu yì zhī gǒu.", "We have a dog at home."],
        ["猫", "māo", "cat", "noun", "我的猫喜欢睡觉。", "Wǒ de māo xǐhuan shuìjiào.", "My cat loves to sleep."],
        ["鸟", "niǎo", "bird", "noun", "那只鸟是蓝的。", "Nà zhī niǎo shì lán de.", "That bird is blue."],
        ["它", "tā", "it", "pronoun", "我有一只猫，它叫小白。", "Wǒ yǒu yì zhī māo, tā jiào Xiǎobái.", "I have a cat. Her name is Xiaobai."],
        ["熊猫", "xióngmāo", "panda", "noun", "我想去中国看熊猫。", "Wǒ xiǎng qù Zhōngguó kàn xióngmāo.", "I want to go to China to see pandas."],
        ["老虎", "lǎohǔ", "tiger", "noun", "老虎吃肉。", "Lǎohǔ chī ròu.", "Tigers eat meat."],
        ["兔子", "tùzi", "rabbit", "noun", "我妹妹养了两只兔子。", "Wǒ mèimei yǎng le liǎng zhī tùzi.", "My little sister has two rabbits."],
        ["养", "yǎng", "to keep (a pet); to raise", "verb", "你养狗吗？", "Nǐ yǎng gǒu ma?", "Do you have a dog?"],
        ["宠物", "chǒngwù", "pet", "noun", "我的宠物是一只鸟。", "Wǒ de chǒngwù shì yì zhī niǎo.", "My pet is a bird."],
        ["动物园", "dòngwùyuán", "zoo", "noun", "周末我们去动物园吧！", "Zhōumò wǒmen qù dòngwùyuán ba!", "Let's go to the zoo this weekend!"],
        ["散步", "sànbù", "to take a walk", "verb", "我每天晚上去公园散步。", "Wǒ měi tiān wǎnshang qù gōngyuán sànbù.", "I go for a walk in the park every evening."],
        ["怕", "pà", "to be afraid of", "verb", "你怕狗吗？", "Nǐ pà gǒu ma?", "Are you afraid of dogs?"],
        ["可爱", "kě'ài", "cute", "adjective", "这只小猫太可爱了！", "Zhè zhī xiǎo māo tài kě'ài le!", "This kitten is so cute!"],
        ["聪明", "cōngming", "smart", "adjective", "我的狗很聪明。", "Wǒ de gǒu hěn cōngming.", "My dog is really smart."]
      ],
      patterns: [
        ["……有一只……", "… yǒu yì zhī …", "… has a (pet / animal)", "李明家有一只狗。", "Lǐ Míng jiā yǒu yì zhī gǒu.", "Li Ming's family has a dog."],
        ["你养……吗？", "Nǐ yǎng … ma?", "Do you keep a …? (pets)", "你养猫吗？——不养，我养狗。", "Nǐ yǎng māo ma? — Bù yǎng, wǒ yǎng gǒu.", "Do you have a cat? — No, I have a dog."]
      ],
      scenarios: [
        {
          title: "Pandas at the zoo",
          zh: "动物园",
          setting: "David and Wang Fang spend a Saturday at the zoo.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "动物园好大！熊猫在哪儿？", "Dòngwùyuán hǎo dà! Xióngmāo zài nǎr?", "The zoo is huge! Where are the pandas?"],
            [1, "在那儿！你看，两只熊猫！", "Zài nàr! Nǐ kàn, liǎng zhī xióngmāo!", "Over there! Look, two pandas!"],
            [0, "太可爱了！我想拍照片。", "Tài kě'ài le! Wǒ xiǎng pāi zhàopiàn.", "So cute! I want to take a photo."],
            [1, "好！然后我们去看老虎吧。", "Hǎo! Ránhòu wǒmen qù kàn lǎohǔ ba.", "Sure! Then let's go see the tigers."],
            [0, "老虎？我有一点儿怕。", "Lǎohǔ? Wǒ yǒu yìdiǎnr pà.", "Tigers? I'm a little scared."],
            [1, "别怕！你看，它在睡觉。", "Bié pà! Nǐ kàn, tā zài shuìjiào.", "Don't be scared! Look, it's asleep."],
            [0, "睡觉的老虎，我不怕！", "Shuìjiào de lǎohǔ, wǒ bú pà!", "A sleeping tiger I'm not afraid of!"]
          ]
        },
        {
          title: "Li Ming's dog",
          zh: "小黑",
          setting: "Anna meets Li Ming and his dog in the park early one morning.",
          cast: [["安娜", "Ānnà"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，这是你的狗吗？", "Lǐ Míng, zhè shì nǐ de gǒu ma?", "Li Ming, is this your dog?"],
            [1, "是的，它叫小黑。", "Shì de, tā jiào Xiǎohēi.", "Yes, his name is Xiaohei."],
            [0, "小黑好可爱！几岁了？", "Xiǎohēi hǎo kě'ài! Jǐ suì le?", "Xiaohei is so cute! How old is he?"],
            [1, "三岁了。它很聪明，会跳，也会玩球！", "Sān suì le. Tā hěn cōngming, huì tiào, yě huì wán qiú!", "Three. He's really smart. He can jump, and he can even play ball!"],
            [0, "太厉害了！你每天和小黑散步吗？", "Tài lìhai le! Nǐ měi tiān hé Xiǎohēi sànbù ma?", "Amazing! Do you walk him every day?"],
            [1, "是，每天早上六点。你养宠物吗？", "Shì, měi tiān zǎoshang liù diǎn. Nǐ yǎng chǒngwù ma?", "Yes, every morning at six. Do you have a pet?"],
            [0, "我养一只猫。我的猫喜欢睡觉，不散步！", "Wǒ yǎng yì zhī māo. Wǒ de māo xǐhuan shuìjiào, bú sànbù!", "I have a cat. My cat likes sleeping, not walks!"]
          ]
        },
        {
          title: "A pet for Xiaomei",
          zh: "我想养鸟",
          setting: "Xiaomei tells Wang Fang which pet she wants.",
          cast: [["小美", "Xiǎoměi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳姐姐，你喜欢什么动物？", "Wáng Fāng jiějie, nǐ xǐhuan shénme dòngwù?", "Wang Fang, what animals do you like?"],
            [1, "我喜欢猫。你呢？", "Wǒ xǐhuan māo. Nǐ ne?", "I like cats. What about you?"],
            [0, "我最喜欢兔子！兔子很可爱，也跑得很快！", "Wǒ zuì xǐhuan tùzi! Tùzi hěn kě'ài, yě pǎo de hěn kuài!", "I love rabbits most! They're cute, and they run really fast!"],
            [1, "你家能养兔子吗？", "Nǐ jiā néng yǎng tùzi ma?", "Could your family keep a rabbit?"],
            [0, "不能……妈妈怕兔子。", "Bù néng… māma pà tùzi.", "No… Mom is scared of rabbits."],
            [1, "养一只鸟吧！鸟很小，也很聪明。", "Yǎng yì zhī niǎo ba! Niǎo hěn xiǎo, yě hěn cōngming.", "Get a bird! Birds are small, and smart too."],
            [0, "鸟会说“你好”吗？", "Niǎo huì shuō “nǐ hǎo” ma?", "Can birds say “hello”?"],
            [1, "有的鸟会！", "Yǒu de niǎo huì!", "Some can!"],
            [0, "我要一只会说“你好”的鸟！", "Wǒ yào yì zhī huì shuō “nǐ hǎo” de niǎo!", "I want a bird that says “hello”!"]
          ]
        }
      ]
    },

    30: {
      words: [
        ["酒店", "jiǔdiàn", "hotel", "noun", "这个酒店离地铁站很近。", "Zhège jiǔdiàn lí dìtiě zhàn hěn jìn.", "This hotel is close to the subway station."],
        ["预订", "yùdìng", "to book; to reserve", "verb", "你好，我预订了一个房间。", "Nǐ hǎo, wǒ yùdìng le yí ge fángjiān.", "Hi, I have a room booked."],
        ["入住", "rùzhù", "to check in", "verb", "几点可以入住？", "Jǐ diǎn kěyǐ rùzhù?", "What time can I check in?"],
        ["退房", "tuìfáng", "to check out", "verb", "明天中午十二点退房。", "Míngtiān zhōngwǔ shí'èr diǎn tuìfáng.", "Checkout is at noon tomorrow."],
        ["前台", "qiántái", "front desk", "noun", "有问题，你可以打电话给前台。", "Yǒu wèntí, nǐ kěyǐ dǎ diànhuà gěi qiántái.", "If there's a problem, you can call the front desk."],
        ["护照", "hùzhào", "passport", "noun", "请给我看一下你的护照。", "Qǐng gěi wǒ kàn yíxià nǐ de hùzhào.", "May I see your passport, please?"],
        ["房卡", "fángkǎ", "room key card", "noun", "这是你的房卡。", "Zhè shì nǐ de fángkǎ.", "Here's your key card."],
        ["钥匙", "yàoshi", "key", "noun", "我找不到我的钥匙了。", "Wǒ zhǎo bu dào wǒ de yàoshi le.", "I can't find my keys."],
        ["电梯", "diàntī", "elevator", "noun", "电梯在左边。", "Diàntī zài zuǒbian.", "The elevator is on the left."],
        ["层", "céng", "floor; story", "measure", "你的房间在八层。", "Nǐ de fángjiān zài bā céng.", "Your room is on the eighth floor."],
        ["行李", "xíngli", "luggage", "noun", "你的行李多吗？", "Nǐ de xíngli duō ma?", "Do you have much luggage?"],
        ["空调", "kōngtiáo", "air conditioning", "noun", "房间里太热了，开空调吧。", "Fángjiān lǐ tài rè le, kāi kōngtiáo ba.", "It's too hot in the room. Let's turn on the AC."],
        ["毛巾", "máojīn", "towel", "noun", "洗手间里没有毛巾。", "Xǐshǒujiān lǐ méiyǒu máojīn.", "There are no towels in the bathroom."],
        ["干净", "gānjìng", "clean", "adjective", "这个房间很干净。", "Zhège fángjiān hěn gānjìng.", "This room is very clean."],
        ["安静", "ānjìng", "quiet", "adjective", "我想要一个安静的房间。", "Wǒ xiǎng yào yí ge ānjìng de fángjiān.", "I'd like a quiet room."]
      ],
      patterns: [
        ["我预订了……", "Wǒ yùdìng le …", "I booked … / I have a reservation for …", "我预订了一个房间，两个晚上。", "Wǒ yùdìng le yí ge fángjiān, liǎng ge wǎnshang.", "I booked a room for two nights."],
        ["……在几层？", "… zài jǐ céng?", "What floor is … on?", "我的房间在几层？——在十层。", "Wǒ de fángjiān zài jǐ céng? — Zài shí céng.", "What floor is my room on? — The tenth."]
      ],
      scenarios: [
        {
          title: "Checking in",
          zh: "入住",
          setting: "David arrives at a hotel with his bags.",
          cast: [["前台", "qiántái (front desk)"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "你好！你要入住吗？", "Nǐ hǎo! Nǐ yào rùzhù ma?", "Hello! Checking in?"],
            [1, "是的。我叫大卫，我预订了一个房间。", "Shì de. Wǒ jiào Dàwèi, wǒ yùdìng le yí ge fángjiān.", "Yes. My name is David, I have a room booked."],
            [0, "好的。请给我看一下你的护照。", "Hǎo de. Qǐng gěi wǒ kàn yíxià nǐ de hùzhào.", "Okay. May I see your passport, please?"],
            [1, "给你。", "Gěi nǐ.", "Here you go."],
            [0, "谢谢。这是你的房卡，你的房间在十二层。", "Xièxie. Zhè shì nǐ de fángkǎ, nǐ de fángjiān zài shí'èr céng.", "Thanks. Here's your key card. Your room is on the twelfth floor."],
            [1, "电梯在哪儿？", "Diàntī zài nǎr?", "Where's the elevator?"],
            [0, "在右边。明天中午十二点退房。", "Zài yòubian. Míngtiān zhōngwǔ shí'èr diǎn tuìfáng.", "On the right. Checkout is at noon tomorrow."],
            [1, "好，谢谢！", "Hǎo, xièxie!", "Great, thanks!"]
          ]
        },
        {
          title: "No towels",
          zh: "空调开不了",
          setting: "Anna calls down to the front desk from her room.",
          cast: [["前台", "qiántái (front desk)"], ["安娜", "Ānnà"]],
          lines: [
            [0, "喂，你好，这儿是前台。", "Wéi, nǐ hǎo, zhèr shì qiántái.", "Hello, front desk."],
            [1, "你好，我房间的空调开不了。", "Nǐ hǎo, wǒ fángjiān de kōngtiáo kāi bu liǎo.", "Hi, the air conditioning in my room won't turn on."],
            [0, "对不起！你的房间号码是多少？", "Duìbuqǐ! Nǐ de fángjiān hàomǎ shì duōshao?", "I'm sorry! What's your room number?"],
            [1, "八一八。", "Bā yāo bā.", "818."],
            [0, "好，我们马上来看一下。", "Hǎo, wǒmen mǎshàng lái kàn yíxià.", "Okay, we'll come and take a look right away."],
            [1, "谢谢。还有，洗手间里没有毛巾。", "Xièxie. Hái yǒu, xǐshǒujiān lǐ méiyǒu máojīn.", "Thanks. Also, there are no towels in the bathroom."],
            [0, "对不起，我们马上给你送毛巾。", "Duìbuqǐ, wǒmen mǎshàng gěi nǐ sòng máojīn.", "Sorry about that, we'll bring you some towels right away."],
            [1, "好的，谢谢！", "Hǎo de, xièxie!", "Okay, thank you!"]
          ]
        },
        {
          title: "Checking out",
          zh: "退房",
          setting: "Wang Fang checks out on the last morning of a trip.",
          cast: [["王芳", "Wáng Fāng"], ["前台", "qiántái (front desk)"]],
          lines: [
            [0, "你好，我要退房。", "Nǐ hǎo, wǒ yào tuìfáng.", "Hi, I'd like to check out."],
            [1, "好的。房间怎么样？", "Hǎo de. Fángjiān zěnmeyàng?", "Sure. How was the room?"],
            [0, "很干净，也很安静。我很喜欢这个酒店。", "Hěn gānjìng, yě hěn ānjìng. Wǒ hěn xǐhuan zhège jiǔdiàn.", "Very clean and quiet. I really like this hotel."],
            [1, "谢谢！你的行李多吗？要叫出租车吗？", "Xièxie! Nǐ de xíngli duō ma? Yào jiào chūzūchē ma?", "Thank you! Do you have much luggage? Shall I call you a taxi?"],
            [0, "要，谢谢。这是我的房卡。", "Yào, xièxie. Zhè shì wǒ de fángkǎ.", "Yes, please. Here's my key card."],
            [1, "好，车五分钟到。", "Hǎo, chē wǔ fēnzhōng dào.", "Okay, the car will be here in five minutes."],
            [0, "等一下……我的钥匙呢？", "Děng yíxià… wǒ de yàoshi ne?", "Wait… where are my keys?"],
            [1, "在这儿，在桌子上。", "Zài zhèr, zài zhuōzi shang.", "Right here, on the counter."],
            [0, "太好了，谢谢你！", "Tài hǎo le, xièxie nǐ!", "Oh good, thank you!"]
          ]
        }
      ]
    },

    31: {
      words: [
        ["飞机", "fēijī", "airplane", "noun", "我第一次坐飞机。", "Wǒ dì yī cì zuò fēijī.", "It's my first time on a plane."],
        ["机场", "jīchǎng", "airport", "noun", "我们几点去机场？", "Wǒmen jǐ diǎn qù jīchǎng?", "What time are we going to the airport?"],
        ["机票", "jīpiào", "plane ticket", "noun", "机票太贵了！", "Jīpiào tài guì le!", "Plane tickets are so expensive!"],
        ["航班", "hángbān", "flight", "noun", "你坐哪个航班？", "Nǐ zuò nǎge hángbān?", "Which flight are you on?"],
        ["起飞", "qǐfēi", "to take off", "verb", "飞机十点起飞。", "Fēijī shí diǎn qǐfēi.", "The plane takes off at ten."],
        ["登机", "dēngjī", "to board", "verb", "我们九点半登机。", "Wǒmen jiǔ diǎn bàn dēngjī.", "We board at 9:30."],
        ["座位", "zuòwèi", "seat", "noun", "对不起，这是我的座位。", "Duìbuqǐ, zhè shì wǒ de zuòwèi.", "Excuse me, this is my seat."],
        ["靠窗", "kàochuāng", "by the window", "phrase", "我想要靠窗的座位。", "Wǒ xiǎng yào kàochuāng de zuòwèi.", "I'd like a window seat."],
        ["安检", "ānjiǎn", "security check", "noun", "安检的人很多。", "Ānjiǎn de rén hěn duō.", "The security line is really long."],
        ["箱子", "xiāngzi", "suitcase; box", "noun", "你的箱子太大了。", "Nǐ de xiāngzi tài dà le.", "Your suitcase is too big."],
        ["带", "dài", "to bring; to take along", "verb", "你带护照了吗？", "Nǐ dài hùzhào le ma?", "Did you bring your passport?"],
        ["出发", "chūfā", "to set off", "verb", "我们明天早上六点出发。", "Wǒmen míngtiān zǎoshang liù diǎn chūfā.", "We're setting off at six tomorrow morning."],
        ["延误", "yánwù", "to be delayed", "verb", "航班延误了两个小时。", "Hángbān yánwù le liǎng ge xiǎoshí.", "The flight was delayed by two hours."],
        ["国外", "guówài", "abroad", "noun", "我姐姐在国外工作。", "Wǒ jiějie zài guówài gōngzuò.", "My older sister works abroad."],
        ["准时", "zhǔnshí", "on time", "adjective", "我们的航班准时吗？", "Wǒmen de hángbān zhǔnshí ma?", "Is our flight on time?"]
      ],
      patterns: [
        ["……几点起飞？", "… jǐ diǎn qǐfēi?", "What time does … take off?", "我们的飞机几点起飞？——十一点。", "Wǒmen de fēijī jǐ diǎn qǐfēi? — Shíyī diǎn.", "What time does our plane take off? — Eleven."],
        ["你带……了吗？", "Nǐ dài … le ma?", "Did you bring …?", "你带机票了吗？——带了。", "Nǐ dài jīpiào le ma? — Dài le.", "Did you bring the ticket? — Yes, I did."]
      ],
      scenarios: [
        {
          title: "Off to the airport",
          zh: "去机场",
          setting: "Early in the morning, Wang Fang checks that David is ready to fly home to the US.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，你几点去机场？", "Dàwèi, nǐ jǐ diǎn qù jīchǎng?", "David, what time are you going to the airport?"],
            [1, "七点出发。航班十点起飞。", "Qī diǎn chūfā. Hángbān shí diǎn qǐfēi.", "I'm leaving at seven. The flight takes off at ten."],
            [0, "你带护照了吗？", "Nǐ dài hùzhào le ma?", "Did you bring your passport?"],
            [1, "带了。护照、机票，都在这儿。", "Dài le. Hùzhào, jīpiào, dōu zài zhèr.", "Yes. Passport, ticket, it's all here."],
            [0, "你的箱子好大！", "Nǐ de xiāngzi hǎo dà!", "Your suitcase is huge!"],
            [1, "箱子里都是给家人的东西。", "Xiāngzi lǐ dōu shì gěi jiārén de dōngxi.", "It's full of things for my family."],
            [0, "机场人多，安检很慢。快走吧，别迟到！", "Jīchǎng rén duō, ānjiǎn hěn màn. Kuài zǒu ba, bié chídào!", "The airport's crowded and security is slow. Off you go, don't be late!"]
          ]
        },
        {
          title: "Delayed again",
          zh: "航班延误了",
          setting: "Anna and Li Ming are waiting at the gate for a work trip.",
          cast: [["安娜", "Ānnà"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，我们的航班延误了！", "Lǐ Míng, wǒmen de hángbān yánwù le!", "Li Ming, our flight's been delayed!"],
            [1, "什么？延误多长时间？", "Shénme? Yánwù duō cháng shíjiān?", "What? For how long?"],
            [0, "两个小时。十二点起飞。", "Liǎng ge xiǎoshí. Shí'èr diǎn qǐfēi.", "Two hours. It takes off at twelve now."],
            [1, "好吧。我们先去吃一点儿东西吧。", "Hǎo ba. Wǒmen xiān qù chī yìdiǎnr dōngxi ba.", "Oh well. Let's go get something to eat first."],
            [0, "好。几点登机？", "Hǎo. Jǐ diǎn dēngjī?", "Okay. What time do we board?"],
            [1, "十一点半登机。我们还有时间。", "Shíyī diǎn bàn dēngjī. Wǒmen hái yǒu shíjiān.", "We board at 11:30. We still have time."],
            [0, "我不喜欢坐飞机，飞机常常不准时！", "Wǒ bù xǐhuan zuò fēijī, fēijī chángcháng bù zhǔnshí!", "I don't like flying. Planes are never on time!"]
          ]
        },
        {
          title: "Someone's in my seat",
          zh: "我的座位",
          setting: "David finds Lin Mei sitting in his seat on the plane.",
          cast: [["大卫", "Dàwèi"], ["林美", "Lín Měi"]],
          lines: [
            [0, "对不起，这是我的座位。", "Duìbuqǐ, zhè shì wǒ de zuòwèi.", "Excuse me, this is my seat."],
            [1, "是吗？你的座位是几号？", "Shì ma? Nǐ de zuòwèi shì jǐ hào?", "Is it? What's your seat number?"],
            [0, "三十二号，靠窗。", "Sānshí'èr hào, kàochuāng.", "Thirty-two, by the window."],
            [1, "对不起！我是三十三号。", "Duìbuqǐ! Wǒ shì sānshísān hào.", "Sorry! I'm thirty-three."],
            [0, "没关系。你也去美国吗？", "Méi guānxi. Nǐ yě qù Měiguó ma?", "No problem. Are you going to the US too?"],
            [1, "是的。这是我第一次去国外！", "Shì de. Zhè shì wǒ dì yī cì qù guówài!", "Yes. It's my first time going abroad!"],
            [0, "太好了！你怕坐飞机吗？", "Tài hǎo le! Nǐ pà zuò fēijī ma?", "That's great! Are you scared of flying?"],
            [1, "有一点儿怕。", "Yǒu yìdiǎnr pà.", "A little."],
            [0, "别怕！我坐了很多次飞机。", "Bié pà! Wǒ zuò le hěn duō cì fēijī.", "Don't worry! I've flown lots of times."]
          ]
        }
      ]
    },

    32: {
      words: [
        ["银行", "yínháng", "bank", "noun", "银行几点开门？", "Yínháng jǐ diǎn kāi mén?", "What time does the bank open?"],
        ["邮局", "yóujú", "post office", "noun", "邮局在银行旁边。", "Yóujú zài yínháng pángbiān.", "The post office is next to the bank."],
        ["取钱", "qǔqián", "to withdraw money", "verb", "我要去银行取钱。", "Wǒ yào qù yínháng qǔqián.", "I need to go to the bank to get some cash."],
        ["存钱", "cúnqián", "to deposit money; to save", "verb", "我想存钱买车。", "Wǒ xiǎng cúnqián mǎi chē.", "I want to save up to buy a car."],
        ["账户", "zhànghù", "account", "noun", "我想开一个账户。", "Wǒ xiǎng kāi yí ge zhànghù.", "I'd like to open an account."],
        ["美元", "měiyuán", "US dollar", "noun", "一美元是多少人民币？", "Yì měiyuán shì duōshao rénmínbì?", "How many yuan is one dollar?"],
        ["人民币", "rénmínbì", "RMB (Chinese yuan)", "noun", "我想换人民币。", "Wǒ xiǎng huàn rénmínbì.", "I'd like to change some money into yuan."],
        ["寄", "jì", "to mail", "verb", "你寄到哪儿？", "Nǐ jì dào nǎr?", "Where are you sending it?"],
        ["千", "qiān", "thousand", "number", "我的账户里有两千块钱。", "Wǒ de zhànghù lǐ yǒu liǎng qiān kuài qián.", "I have two thousand yuan in my account."],
        ["包裹", "bāoguǒ", "package", "noun", "你的包裹到了。", "Nǐ de bāoguǒ dào le.", "Your package has arrived."],
        ["快递", "kuàidì", "courier delivery", "noun", "今天有你的快递。", "Jīntiān yǒu nǐ de kuàidì.", "There's a delivery for you today."],
        ["填", "tián", "to fill in", "verb", "请先填一下这个表。", "Qǐng xiān tián yíxià zhège biǎo.", "Please fill in this form first."],
        ["表", "biǎo", "form", "noun", "我看不懂这个表。", "Wǒ kàn bu dǒng zhège biǎo.", "I can't make sense of this form."],
        ["签名", "qiānmíng", "to sign", "verb", "我要签名吗？", "Wǒ yào qiānmíng ma?", "Do I need to sign?"],
        ["排队", "páiduì", "to wait in line", "verb", "银行里人很多，我们要排队。", "Yínháng lǐ rén hěn duō, wǒmen yào páiduì.", "The bank is busy, so we'll have to wait in line."]
      ],
      patterns: [
        ["我想寄……", "Wǒ xiǎng jì …", "I'd like to mail …", "我想寄一个包裹到美国。", "Wǒ xiǎng jì yí ge bāoguǒ dào Měiguó.", "I'd like to send a package to the US."],
        ["请在这儿……", "Qǐng zài zhèr …", "Please … here", "请在这儿排队。", "Qǐng zài zhèr páiduì.", "Please line up here."]
      ],
      scenarios: [
        {
          title: "Opening an account",
          zh: "开账户",
          setting: "David goes to a bank to open his first Chinese bank account.",
          cast: [["经理", "jīnglǐ (bank manager)"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "你好，你要取钱还是存钱？", "Nǐ hǎo, nǐ yào qǔqián háishi cúnqián?", "Hello, are you withdrawing or depositing?"],
            [1, "都不是。我想开一个账户。", "Dōu bú shì. Wǒ xiǎng kāi yí ge zhànghù.", "Neither. I'd like to open an account."],
            [0, "好的。请给我看一下你的护照，然后填这个表。", "Hǎo de. Qǐng gěi wǒ kàn yíxià nǐ de hùzhào, ránhòu tián zhège biǎo.", "Okay. May I see your passport? Then please fill in this form."],
            [1, "我看不懂……这儿写什么？", "Wǒ kàn bu dǒng… zhèr xiě shénme?", "I can't read this… what goes here?"],
            [0, "写你的名字和电话号码，然后在这儿签名。", "Xiě nǐ de míngzi hé diànhuà hàomǎ, ránhòu zài zhèr qiānmíng.", "Your name and phone number, then sign here."],
            [1, "好了！我还想换一点儿人民币。", "Hǎo le! Wǒ hái xiǎng huàn yìdiǎnr rénmínbì.", "Done! I'd also like to change some money into yuan."],
            [0, "你要换多少美元？", "Nǐ yào huàn duōshao měiyuán?", "How many dollars would you like to change?"],
            [1, "一千美元。", "Yìqiān měiyuán.", "A thousand dollars."]
          ]
        },
        {
          title: "In line at the post office",
          zh: "在邮局",
          setting: "Anna and Wang Fang run into each other at a busy post office.",
          cast: [["安娜", "Ānnà"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "邮局人好多！", "Yóujú rén hǎo duō!", "The post office is so busy!"],
            [1, "是，我们要排队。你寄什么？", "Shì, wǒmen yào páiduì. Nǐ jì shénme?", "Yeah, we'll have to wait. What are you sending?"],
            [0, "一个包裹，寄到美国。是给我妈妈的茶。", "Yí ge bāoguǒ, jì dào Měiguó. Shì gěi wǒ māma de chá.", "A package to the US. It's tea for my mom."],
            [1, "寄到美国很贵吧？", "Jì dào Měiguó hěn guì ba?", "Sending it to the US must be expensive."],
            [0, "有一点儿贵，可是我妈妈很喜欢中国茶。你呢？", "Yǒu yìdiǎnr guì, kěshì wǒ māma hěn xǐhuan Zhōngguó chá. Nǐ ne?", "A bit, but my mom loves Chinese tea. What about you?"],
            [1, "我的包裹到了。我弟弟给我寄了一个大包裹！", "Wǒ de bāoguǒ dào le. Wǒ dìdi gěi wǒ jì le yí ge dà bāoguǒ!", "I have a package to pick up. My younger brother sent me a big one!"],
            [0, "你弟弟真好！", "Nǐ dìdi zhēn hǎo!", "Your brother's so sweet!"]
          ]
        },
        {
          title: "Another delivery",
          zh: "你的快递",
          setting: "Wang Fang finds yet another delivery for David at their front door.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，今天有你的快递。", "Dàwèi, jīntiān yǒu nǐ de kuàidì.", "David, there's a delivery for you today."],
            [1, "太好了！在哪儿？", "Tài hǎo le! Zài nǎr?", "Great! Where is it?"],
            [0, "在门口。很大！你买了什么？", "Zài ménkǒu. Hěn dà! Nǐ mǎi le shénme?", "By the door. It's big! What did you buy?"],
            [1, "新排球和新鞋！", "Xīn páiqiú hé xīn xié!", "A new volleyball and new shoes!"],
            [0, "你上个星期也买了鞋！", "Nǐ shàng ge xīngqī yě mǎi le xié!", "You bought shoes last week too!"],
            [1, "是……我要存钱了。", "Shì… wǒ yào cúnqián le.", "I know… I need to start saving."],
            [0, "你的账户里还有多少钱？", "Nǐ de zhànghù lǐ hái yǒu duōshao qián?", "How much is left in your account?"],
            [1, "我不想知道……", "Wǒ bù xiǎng zhīdào…", "I don't want to know…"],
            [0, "明天我和你去银行看一下吧！", "Míngtiān wǒ hé nǐ qù yínháng kàn yíxià ba!", "Tomorrow I'll go to the bank with you and we'll have a look!"]
          ]
        }
      ]
    },

    33: {
      words: [
        ["聚会", "jùhuì", "party; get-together", "noun", "周末我家有一个聚会。", "Zhōumò wǒ jiā yǒu yí ge jùhuì.", "We're having a party at my place this weekend."],
        ["礼物", "lǐwù", "gift", "noun", "这是给你的礼物。", "Zhè shì gěi nǐ de lǐwù.", "This present is for you."],
        ["蛋糕", "dàngāo", "cake", "noun", "我们买一个大蛋糕吧！", "Wǒmen mǎi yí ge dà dàngāo ba!", "Let's buy a big cake!"],
        ["生日", "shēngrì", "birthday", "noun", "你的生日是几月几号？", "Nǐ de shēngrì shì jǐ yuè jǐ hào?", "When's your birthday?"],
        ["快乐", "kuàilè", "happy (生日快乐 = happy birthday)", "adjective", "生日快乐，小美！", "Shēngrì kuàilè, Xiǎoměi!", "Happy birthday, Xiaomei!"],
        ["祝", "zhù", "to wish", "verb", "祝你周末快乐！", "Zhù nǐ zhōumò kuàilè!", "Have a great weekend!"],
        ["邀请", "yāoqǐng", "to invite", "verb", "李明邀请我们去他家吃饭。", "Lǐ Míng yāoqǐng wǒmen qù tā jiā chī fàn.", "Li Ming invited us to his place for dinner."],
        ["参加", "cānjiā", "to attend; to join", "verb", "你明天参加聚会吗？", "Nǐ míngtiān cānjiā jùhuì ma?", "Are you coming to the party tomorrow?"],
        ["庆祝", "qìngzhù", "to celebrate", "verb", "我们去饭馆庆祝吧！", "Wǒmen qù fànguǎn qìngzhù ba!", "Let's go to a restaurant to celebrate!"],
        ["准备", "zhǔnbèi", "to prepare", "verb", "聚会的东西你准备好了吗？", "Jùhuì de dōngxi nǐ zhǔnbèi hǎo le ma?", "Have you got everything ready for the party?"],
        ["打开", "dǎkāi", "to open", "verb", "快打开礼物！", "Kuài dǎkāi lǐwù!", "Open your present, quick!"],
        ["惊喜", "jīngxǐ", "surprise", "noun", "这是一个惊喜！", "Zhè shì yí ge jīngxǐ!", "It's a surprise!"],
        ["歌", "gē", "song", "noun", "你最喜欢什么歌？", "Nǐ zuì xǐhuan shénme gē?", "What's your favorite song?"],
        ["客人", "kèrén", "guest", "noun", "今天家里有很多客人。", "Jīntiān jiā lǐ yǒu hěn duō kèrén.", "We have lots of guests at home today."],
        ["热闹", "rènao", "lively; bustling", "adjective", "你家今天好热闹！", "Nǐ jiā jīntiān hǎo rènao!", "Your place is so lively today!"]
      ],
      patterns: [
        ["祝你……快乐！", "Zhù nǐ … kuàilè!", "Wishing you a happy …!", "祝你生日快乐！", "Zhù nǐ shēngrì kuàilè!", "Happy birthday to you!"],
        ["我想邀请你参加……", "Wǒ xiǎng yāoqǐng nǐ cānjiā …", "I'd like to invite you to …", "我想邀请你参加我的生日聚会。", "Wǒ xiǎng yāoqǐng nǐ cānjiā wǒ de shēngrì jùhuì.", "I'd like to invite you to my birthday party."]
      ],
      scenarios: [
        {
          title: "Planning a surprise",
          zh: "准备惊喜",
          setting: "David and Li Ming secretly plan Wang Fang's birthday.",
          cast: [["大卫", "Dàwèi"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，下个星期六是王芳的生日。", "Lǐ Míng, xià ge xīngqīliù shì Wáng Fāng de shēngrì.", "Li Ming, next Saturday is Wang Fang's birthday."],
            [1, "我们给她准备一个惊喜吧！", "Wǒmen gěi tā zhǔnbèi yí ge jīngxǐ ba!", "Let's plan a surprise for her!"],
            [0, "好！我邀请她的朋友来参加聚会。", "Hǎo! Wǒ yāoqǐng tā de péngyou lái cānjiā jùhuì.", "Yes! I'll invite her friends to a party."],
            [1, "我去买一个大蛋糕。", "Wǒ qù mǎi yí ge dà dàngāo.", "I'll get a big cake."],
            [0, "我们送她什么礼物？", "Wǒmen sòng tā shénme lǐwù?", "What present should we give her?"],
            [1, "她喜欢看书，送她一本书吧。", "Tā xǐhuan kàn shū, sòng tā yì běn shū ba.", "She loves reading. Let's give her a book."],
            [0, "好。别告诉王芳！", "Hǎo. Bié gàosu Wáng Fāng!", "Okay. Don't tell Wang Fang!"],
            [1, "我知道！", "Wǒ zhīdào!", "I know!"]
          ]
        },
        {
          title: "Surprise!",
          zh: "生日快乐",
          setting: "Wang Fang comes home to a flat full of friends.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "惊喜！生日快乐！", "Jīngxǐ! Shēngrì kuàilè!", "Surprise! Happy birthday!"],
            [1, "什么？家里有好多客人！太热闹了！", "Shénme? Jiā lǐ yǒu hǎo duō kèrén! Tài rènao le!", "What? The place is full of people! It's so lively!"],
            [0, "我们来庆祝你的生日！", "Wǒmen lái qìngzhù nǐ de shēngrì!", "We're here to celebrate your birthday!"],
            [1, "谢谢大家！", "Xièxie dàjiā!", "Thank you, everyone!"],
            [0, "祝你生日快乐！来，打开礼物吧！", "Zhù nǐ shēngrì kuàilè! Lái, dǎkāi lǐwù ba!", "Happy birthday! Come on, open your present!"],
            [1, "一本书！我很喜欢！", "Yì běn shū! Wǒ hěn xǐhuan!", "A book! I love it!"],
            [0, "现在吃蛋糕！我们先唱歌：祝你生日快乐……", "Xiànzài chī dàngāo! Wǒmen xiān chànggē: zhù nǐ shēngrì kuàilè…", "Cake time! But first, a song: happy birthday to you…"]
          ]
        },
        {
          title: "Xiaomei's invitation",
          zh: "小美的聚会",
          setting: "Xiaomei knocks on Anna's door with big news.",
          cast: [["小美", "Xiǎoměi"], ["安娜", "Ānnà"]],
          lines: [
            [0, "安娜姐姐，我想邀请你参加我的生日聚会！", "Ānnà jiějie, wǒ xiǎng yāoqǐng nǐ cānjiā wǒ de shēngrì jùhuì!", "Anna, I want to invite you to my birthday party!"],
            [1, "太好了！什么时候？", "Tài hǎo le! Shénme shíhou?", "How lovely! When is it?"],
            [0, "星期天下午。有蛋糕，有歌，有很多小朋友！", "Xīngqītiān xiàwǔ. Yǒu dàngāo, yǒu gē, yǒu hěn duō xiǎopéngyou!", "Sunday afternoon. There'll be cake, songs and lots of kids!"],
            [1, "会很热闹！我要准备什么？", "Huì hěn rènao! Wǒ yào zhǔnbèi shénme?", "That'll be fun and lively! What should I bring?"],
            [0, "礼物！", "Lǐwù!", "A present!"],
            [1, "好，我给你准备一个礼物。你喜欢什么？", "Hǎo, wǒ gěi nǐ zhǔnbèi yí ge lǐwù. Nǐ xǐhuan shénme?", "Okay, I'll get you a present. What do you like?"],
            [0, "我喜欢熊猫！", "Wǒ xǐhuan xióngmāo!", "I like pandas!"],
            [1, "好，那星期天见！", "Hǎo, nà xīngqītiān jiàn!", "Okay, see you Sunday then!"]
          ]
        }
      ]
    },

    34: {
      words: [
        ["天气", "tiānqì", "weather", "noun", "今天天气怎么样？", "Jīntiān tiānqì zěnmeyàng?", "What's the weather like today?"],
        ["季节", "jìjié", "season", "noun", "你最喜欢哪个季节？", "Nǐ zuì xǐhuan nǎ ge jìjié?", "Which season do you like best?"],
        ["春天", "chūntiān", "spring", "noun", "春天很暖和，公园里很漂亮。", "Chūntiān hěn nuǎnhuo, gōngyuán lǐ hěn piàoliang.", "Spring is warm, and the parks are beautiful."],
        ["夏天", "xiàtiān", "summer", "noun", "夏天我常常去游泳。", "Xiàtiān wǒ chángcháng qù yóuyǒng.", "I often go swimming in the summer."],
        ["秋天", "qiūtiān", "autumn", "noun", "秋天不冷也不热。", "Qiūtiān bù lěng yě bú rè.", "Autumn is neither cold nor hot."],
        ["冬天", "dōngtiān", "winter", "noun", "冬天你要穿毛衣和外套。", "Dōngtiān nǐ yào chuān máoyī hé wàitào.", "In winter you need a sweater and a coat."],
        ["下雨", "xiàyǔ", "to rain", "verb", "明天会下雨吗？", "Míngtiān huì xiàyǔ ma?", "Will it rain tomorrow?"],
        ["下雪", "xiàxuě", "to snow", "verb", "下雪了！我们去公园玩吧！", "Xiàxuě le! Wǒmen qù gōngyuán wán ba!", "It's snowing! Let's go play in the park!"],
        ["刮风", "guāfēng", "to be windy", "verb", "今天刮风，你多穿一件衣服。", "Jīntiān guāfēng, nǐ duō chuān yí jiàn yīfu.", "It's windy today, so put on an extra layer."],
        ["晴", "qíng", "sunny", "adjective", "今天是晴天，我们去散步吧。", "Jīntiān shì qíngtiān, wǒmen qù sànbù ba.", "It's a sunny day. Let's go for a walk."],
        ["阴", "yīn", "cloudy; overcast", "adjective", "今天阴天，你带伞吧。", "Jīntiān yīntiān, nǐ dài sǎn ba.", "It's overcast today. Take an umbrella."],
        ["冷", "lěng", "cold", "adjective", "今天太冷了！", "Jīntiān tài lěng le!", "It's way too cold today!"],
        ["暖和", "nuǎnhuo", "warm", "adjective", "房间里很暖和。", "Fángjiān lǐ hěn nuǎnhuo.", "It's nice and warm in the room."],
        ["度", "dù", "degree", "measure", "今天多少度？——二十五度。", "Jīntiān duōshao dù? — Èrshíwǔ dù.", "How warm is it today? — 25 degrees."],
        ["伞", "sǎn", "umbrella", "noun", "我没有带伞。", "Wǒ méiyǒu dài sǎn.", "I didn't bring an umbrella."]
      ],
      patterns: [
        ["今天天气怎么样？——今天……", "Jīntiān tiānqì zěnmeyàng? — Jīntiān …", "What's the weather like today? — Today it's …", "今天天气怎么样？——今天很暖和，二十度。", "Jīntiān tiānqì zěnmeyàng? — Jīntiān hěn nuǎnhuo, èrshí dù.", "How's the weather today? — It's warm, 20 degrees."],
        ["你最喜欢哪个季节？——我最喜欢……", "Nǐ zuì xǐhuan nǎ ge jìjié? — Wǒ zuì xǐhuan …", "Which season do you like best? — I like … best", "你最喜欢哪个季节？——我最喜欢冬天，我喜欢下雪。", "Nǐ zuì xǐhuan nǎ ge jìjié? — Wǒ zuì xǐhuan dōngtiān, wǒ xǐhuan xiàxuě.", "Which season do you like best? — Winter. I love the snow."]
      ],
      scenarios: [
        {
          title: "Take an umbrella",
          zh: "带伞",
          setting: "David is about to head out on a grey morning.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，你今天出门吗？", "Dàwèi, nǐ jīntiān chūmén ma?", "David, are you going out today?"],
            [1, "出门，我九点去上课。今天天气怎么样？", "Chūmén, wǒ jiǔ diǎn qù shàngkè. Jīntiān tiānqì zěnmeyàng?", "Yes, I have class at nine. What's the weather like?"],
            [0, "现在是阴天，下午会下雨。", "Xiànzài shì yīntiān, xiàwǔ huì xiàyǔ.", "It's overcast now, and it's going to rain this afternoon."],
            [1, "冷吗？", "Lěng ma?", "Is it cold?"],
            [0, "很冷，十度！你穿外套吧。", "Hěn lěng, shí dù! Nǐ chuān wàitào ba.", "Very. Ten degrees! Wear a coat."],
            [1, "好。我没有伞……", "Hǎo. Wǒ méiyǒu sǎn…", "Okay. I don't have an umbrella, though…"],
            [0, "给你，这是我的伞。", "Gěi nǐ, zhè shì wǒ de sǎn.", "Here, take my umbrella."],
            [1, "谢谢！我晚上回家的时候给你。", "Xièxie! Wǒ wǎnshang huí jiā de shíhou gěi nǐ.", "Thanks! I'll give it back when I get home tonight."]
          ]
        },
        {
          title: "Which season?",
          zh: "你最喜欢哪个季节？",
          setting: "David and Li Ming chat about the seasons over lunch.",
          cast: [["大卫", "Dàwèi"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，你最喜欢哪个季节？", "Lǐ Míng, nǐ zuì xǐhuan nǎ ge jìjié?", "Li Ming, which season do you like best?"],
            [1, "我最喜欢秋天。秋天天气很好，常常是晴天。", "Wǒ zuì xǐhuan qiūtiān. Qiūtiān tiānqì hěn hǎo, chángcháng shì qíngtiān.", "Autumn. The weather's great and it's often sunny."],
            [0, "我喜欢夏天！夏天可以游泳，也可以打排球。", "Wǒ xǐhuan xiàtiān! Xiàtiān kěyǐ yóuyǒng, yě kěyǐ dǎ páiqiú.", "I like summer! You can swim and play volleyball."],
            [1, "这儿的夏天太热了，有时候三十八度！", "Zhèr de xiàtiān tài rè le, yǒu shíhou sānshíbā dù!", "Summers here are way too hot — sometimes 38 degrees!"],
            [0, "冬天呢？冬天下雪吗？", "Dōngtiān ne? Dōngtiān xiàxuě ma?", "What about winter? Does it snow?"],
            [1, "下雪，也常常刮风，很冷。", "Xiàxuě, yě chángcháng guāfēng, hěn lěng.", "It snows, and it's often windy. It's cold."],
            [0, "春天怎么样？", "Chūntiān zěnmeyàng?", "And spring?"],
            [1, "春天很暖和。你可以去公园拍照片，很漂亮！", "Chūntiān hěn nuǎnhuo. Nǐ kěyǐ qù gōngyuán pāi zhàopiàn, hěn piàoliang!", "Spring is warm. Go take photos in the park — it's beautiful!"]
          ]
        },
        {
          title: "It's snowing!",
          zh: "下雪了！",
          setting: "Xiaomei knocks on Wang Fang's door on a winter morning.",
          cast: [["小美", "Xiǎoměi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳姐姐，下雪了！", "Wáng Fāng jiějie, xiàxuě le!", "Wang Fang, it's snowing!"],
            [1, "是吗？太好了！", "Shì ma? Tài hǎo le!", "Really? That's great!"],
            [0, "我们去玩吧！", "Wǒmen qù wán ba!", "Let's go play!"],
            [1, "好。今天很冷，你先穿毛衣和外套。", "Hǎo. Jīntiān hěn lěng, nǐ xiān chuān máoyī hé wàitào.", "Okay. It's cold today, so put on your sweater and coat first."],
            [0, "我还要帽子！", "Wǒ hái yào màozi!", "And my hat!"],
            [0, "王芳姐姐，我好冷……", "Wáng Fāng jiějie, wǒ hǎo lěng…", "Wang Fang, I'm so cold…"],
            [1, "我们回家吧。家里很暖和，我给你一杯热牛奶。", "Wǒmen huí jiā ba. Jiā lǐ hěn nuǎnhuo, wǒ gěi nǐ yì bēi rè niúnǎi.", "Let's go home. It's warm inside, and I'll make you a hot milk."],
            [0, "明天还会下雪吗？", "Míngtiān hái huì xiàxuě ma?", "Will it snow again tomorrow?"],
            [1, "会。明天我们再来玩！", "Huì. Míngtiān wǒmen zài lái wán!", "It will. We can come play again tomorrow!"]
          ]
        }
      ]
    },

    35: {
      words: [
        ["心情", "xīnqíng", "mood", "noun", "今天天气很好，我的心情也很好。", "Jīntiān tiānqì hěn hǎo, wǒ de xīnqíng yě hěn hǎo.", "The weather's lovely today, and I'm in a good mood too."],
        ["开心", "kāixīn", "happy", "adjective", "朋友来看我，我很开心。", "Péngyou lái kàn wǒ, wǒ hěn kāixīn.", "My friends came to see me, and I'm so happy."],
        ["难过", "nánguò", "sad", "adjective", "我们队输了，我很难过。", "Wǒmen duì shū le, wǒ hěn nánguò.", "Our team lost, and I'm really down."],
        ["生气", "shēngqì", "angry", "adjective", "别生气了！", "Bié shēngqì le!", "Don't be angry!"],
        ["担心", "dānxīn", "to worry", "verb", "妈妈很担心你。", "Māma hěn dānxīn nǐ.", "Mom is really worried about you."],
        ["紧张", "jǐnzhāng", "nervous", "adjective", "明天有比赛，我很紧张。", "Míngtiān yǒu bǐsài, wǒ hěn jǐnzhāng.", "I have a match tomorrow, and I'm nervous."],
        ["害怕", "hàipà", "scared", "adjective", "小美很害怕，她不想一个人睡觉。", "Xiǎoměi hěn hàipà, tā bù xiǎng yí ge rén shuìjiào.", "Xiaomei is scared and doesn't want to sleep alone."],
        ["着急", "zháojí", "anxious; in a hurry", "adjective", "别着急，慢慢说。", "Bié zháojí, mànmàn shuō.", "Don't panic. Say it slowly."],
        ["放心", "fàngxīn", "to be at ease; don't worry", "verb", "放心吧，我会准时到。", "Fàngxīn ba, wǒ huì zhǔnshí dào.", "Don't worry, I'll be there on time."],
        ["觉得", "juéde", "to feel; to think", "verb", "你觉得这件衣服怎么样？", "Nǐ juéde zhè jiàn yīfu zěnmeyàng?", "What do you think of this top?"],
        ["为什么", "wèishénme", "why", "question", "你为什么不高兴？", "Nǐ wèishénme bù gāoxìng?", "Why are you unhappy?"],
        ["因为", "yīnwèi", "because", "conjunction", "我今天不去上班，因为我生病了。", "Wǒ jīntiān bú qù shàngbān, yīnwèi wǒ shēngbìng le.", "I'm not going to work today because I'm sick."],
        ["所以", "suǒyǐ", "so; therefore", "conjunction", "今天下雨，所以我们不去公园了。", "Jīntiān xiàyǔ, suǒyǐ wǒmen bú qù gōngyuán le.", "It's raining today, so we're not going to the park."],
        ["哭", "kū", "to cry", "verb", "别哭了，没关系。", "Bié kū le, méi guānxi.", "Don't cry. It's okay."],
        ["笑", "xiào", "to laugh; to smile", "verb", "你笑什么？", "Nǐ xiào shénme?", "What are you laughing at?"]
      ],
      patterns: [
        ["……为什么……？——因为……", "… wèishénme …? — Yīnwèi …", "Why …? — Because …", "你为什么迟到？——因为地铁很挤。", "Nǐ wèishénme chídào? — Yīnwèi dìtiě hěn jǐ.", "Why are you late? — Because the subway was packed."],
        ["因为……，所以……", "Yīnwèi …, suǒyǐ …", "Because …, (so) …", "因为我很累，所以我想早一点儿睡觉。", "Yīnwèi wǒ hěn lèi, suǒyǐ wǒ xiǎng zǎo yìdiǎnr shuìjiào.", "I'm tired, so I want to go to bed a bit early."]
      ],
      scenarios: [
        {
          title: "Why so down?",
          zh: "你为什么难过？",
          setting: "David comes home quietly after a volleyball match.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，你心情不好吗？", "Dàwèi, nǐ xīnqíng bù hǎo ma?", "David, are you in a bad mood?"],
            [1, "我很难过。", "Wǒ hěn nánguò.", "I'm pretty down."],
            [0, "为什么？", "Wèishénme?", "Why?"],
            [1, "因为我们队输了，一比三。", "Yīnwèi wǒmen duì shū le, yī bǐ sān.", "Because our team lost, one to three."],
            [0, "别难过了，你们已经很厉害了。", "Bié nánguò le, nǐmen yǐjīng hěn lìhai le.", "Don't be sad. You guys are already really good."],
            [1, "我觉得是我的问题，我应该多练习。", "Wǒ juéde shì wǒ de wèntí, wǒ yīnggāi duō liànxí.", "I think it was my fault. I should practice more."],
            [0, "别生气了！下次你们会赢的。我请你吃饭吧！", "Bié shēngqì le! Xià cì nǐmen huì yíng de. Wǒ qǐng nǐ chī fàn ba!", "Don't be so hard on yourself! You'll win next time. Let me buy you dinner!"],
            [1, "好！谢谢你，我现在开心多了。", "Hǎo! Xièxie nǐ, wǒ xiànzài kāixīn duō le.", "Okay! Thanks, I feel much happier now."]
          ]
        },
        {
          title: "Before the big meeting",
          zh: "别紧张",
          setting: "Li Ming calls Lin Mei before an important meeting with his boss.",
          cast: [["林美", "Lín Měi"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，你很紧张吗？", "Lǐ Míng, nǐ hěn jǐnzhāng ma?", "Li Ming, are you nervous?"],
            [1, "很紧张。下午我要和老板开会。", "Hěn jǐnzhāng. Xiàwǔ wǒ yào hé lǎobǎn kāihuì.", "Very. I have a meeting with my boss this afternoon."],
            [1, "因为这是我第一次和老板开会，所以我很担心。", "Yīnwèi zhè shì wǒ dì-yī cì hé lǎobǎn kāihuì, suǒyǐ wǒ hěn dānxīn.", "It's my first meeting with him, so I'm worried."],
            [0, "你准备得很好，放心吧。", "Nǐ zhǔnbèi de hěn hǎo, fàngxīn ba.", "You're really well prepared. Relax."],
            [1, "我们老板很厉害，我有一点儿害怕他。", "Wǒmen lǎobǎn hěn lìhai, wǒ yǒu yìdiǎnr hàipà tā.", "My boss is really sharp. I'm a little scared of him."],
            [0, "别着急，慢慢说。你的工作很好，老板会喜欢的。", "Bié zháojí, mànmàn shuō. Nǐ de gōngzuò hěn hǎo, lǎobǎn huì xǐhuan de.", "Take your time and speak slowly. Your work is good — he'll like it."],
            [1, "你觉得我可以吗？", "Nǐ juéde wǒ kěyǐ ma?", "You think I can do it?"],
            [0, "可以！开完会给我打电话。", "Kěyǐ! Kāi wán huì gěi wǒ dǎ diànhuà.", "Of course! Call me after the meeting."]
          ]
        },
        {
          title: "Where's my cat?",
          zh: "别哭了",
          setting: "Anna finds Xiaomei crying in the hallway.",
          cast: [["安娜", "Ānnà"], ["小美", "Xiǎoměi"]],
          lines: [
            [0, "小美，你为什么哭？", "Xiǎoměi, nǐ wèishénme kū?", "Xiaomei, why are you crying?"],
            [1, "我的猫不见了！", "Wǒ de māo bú jiàn le!", "My cat is gone!"],
            [0, "别着急，别哭。我们一起找。", "Bié zháojí, bié kū. Wǒmen yìqǐ zhǎo.", "Don't panic, don't cry. Let's look together."],
            [1, "我很担心我的猫。猫很小，会害怕的。", "Wǒ hěn dānxīn wǒ de māo. Māo hěn xiǎo, huì hàipà de.", "I'm so worried about my cat. She's little, she'll be scared."],
            [0, "放心吧。你看，桌子下面是什么？", "Fàngxīn ba. Nǐ kàn, zhuōzi xiàmiàn shì shénme?", "Don't worry. Look, what's under the table?"],
            [1, "是我的猫！在睡觉呢！", "Shì wǒ de māo! Zài shuìjiào ne!", "It's my cat! She's asleep!"],
            [0, "你看，你笑了！", "Nǐ kàn, nǐ xiào le!", "See, you're smiling!"],
            [1, "我现在很开心！谢谢安娜姐姐！", "Wǒ xiànzài hěn kāixīn! Xièxie Ānnà jiějie!", "I'm so happy now! Thank you, Anna!"]
          ]
        }
      ]
    },

    36: {
      words: [
        ["长得", "zhǎngde", "to look (appearance)", "verb", "他长得很高。", "Tā zhǎngde hěn gāo.", "He's tall."],
        ["样子", "yàngzi", "appearance; look", "noun", "他长什么样子？", "Tā zhǎng shénme yàngzi?", "What does he look like?"],
        ["胖", "pàng", "fat; chubby", "adjective", "我的猫太胖了！", "Wǒ de māo tài pàng le!", "My cat is way too fat!"],
        ["瘦", "shòu", "thin", "adjective", "你瘦了！", "Nǐ shòu le!", "You've lost weight!"],
        ["矮", "ǎi", "short (height)", "adjective", "我弟弟比我矮。", "Wǒ dìdi bǐ wǒ ǎi.", "My younger brother is shorter than me."],
        ["帅", "shuài", "handsome", "adjective", "照片里的人是谁？很帅！", "Zhàopiàn lǐ de rén shì shéi? Hěn shuài!", "Who's the guy in the photo? He's handsome!"],
        ["年轻", "niánqīng", "young", "adjective", "我们的老板很年轻，三十岁。", "Wǒmen de lǎobǎn hěn niánqīng, sānshí suì.", "Our boss is young — thirty."],
        ["老", "lǎo", "old", "adjective", "我爸爸老了，头发都白了。", "Wǒ bàba lǎo le, tóufa dōu bái le.", "My dad's getting old; his hair has gone white."],
        ["眼镜", "yǎnjìng", "glasses", "noun", "我的眼镜在哪儿？", "Wǒ de yǎnjìng zài nǎr?", "Where are my glasses?"],
        ["戴", "dài", "to wear (glasses, hats)", "verb", "他戴眼镜，穿一件蓝衬衫。", "Tā dài yǎnjìng, chuān yí jiàn lán chènshān.", "He wears glasses and a blue shirt."],
        ["性格", "xìnggé", "personality", "noun", "她的性格很好。", "Tā de xìnggé hěn hǎo.", "She has a lovely personality."],
        ["认真", "rènzhēn", "serious; hardworking", "adjective", "李明工作很认真。", "Lǐ Míng gōngzuò hěn rènzhēn.", "Li Ming works really hard."],
        ["热情", "rèqíng", "warm; friendly", "adjective", "她的家人都很热情。", "Tā de jiārén dōu hěn rèqíng.", "Her whole family is really welcoming."],
        ["害羞", "hàixiū", "shy", "adjective", "小美有一点儿害羞。", "Xiǎoměi yǒu yìdiǎnr hàixiū.", "Xiaomei is a little shy."],
        ["像", "xiàng", "to look like; to resemble", "verb", "你很像你爸爸。", "Nǐ hěn xiàng nǐ bàba.", "You look a lot like your dad."]
      ],
      patterns: [
        ["他长什么样子？——他长得……", "Tā zhǎng shénme yàngzi? — Tā zhǎngde …", "What does he look like? — He's …", "他长什么样子？——他长得很高，戴眼镜。", "Tā zhǎng shénme yàngzi? — Tā zhǎngde hěn gāo, dài yǎnjìng.", "What does he look like? — He's tall and wears glasses."],
        ["……（长得）很像……", "… (zhǎngde) hěn xiàng …", "… looks a lot like …", "你长得很像你妈妈。", "Nǐ zhǎngde hěn xiàng nǐ māma.", "You look a lot like your mom."]
      ],
      scenarios: [
        {
          title: "Picking up a friend",
          zh: "他长什么样子？",
          setting: "David asks Wang Fang to meet his friend at the airport.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，明天我朋友来中国。你可以去机场接他吗？", "Wáng Fāng, míngtiān wǒ péngyou lái Zhōngguó. Nǐ kěyǐ qù jīchǎng jiē tā ma?", "Wang Fang, my friend arrives in China tomorrow. Could you pick him up at the airport?"],
            [1, "可以。他长什么样子？", "Kěyǐ. Tā zhǎng shénme yàngzi?", "Sure. What does he look like?"],
            [0, "他很高，很瘦，头发很短。", "Tā hěn gāo, hěn shòu, tóufa hěn duǎn.", "He's tall and thin, with short hair."],
            [1, "他戴眼镜吗？", "Tā dài yǎnjìng ma?", "Does he wear glasses?"],
            [0, "戴。他长得很帅！", "Dài. Tā zhǎngde hěn shuài!", "Yes. And he's very handsome!"],
            [1, "他的性格怎么样？", "Tā de xìnggé zěnmeyàng?", "What's he like as a person?"],
            [0, "他很热情，你会喜欢他的。", "Tā hěn rèqíng, nǐ huì xǐhuan tā de.", "He's really friendly. You'll like him."],
            [1, "好。你给我发他的照片吧。", "Hǎo. Nǐ gěi wǒ fā tā de zhàopiàn ba.", "Okay. Send me a photo of him."]
          ]
        },
        {
          title: "The family photo",
          zh: "你很像你妈妈",
          setting: "Anna looks at a photo of Li Ming's big family.",
          cast: [["安娜", "Ānnà"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，这是你家的照片吗？", "Lǐ Míng, zhè shì nǐ jiā de zhàopiàn ma?", "Li Ming, is this a photo of your family?"],
            [1, "是，我家七口人都在这儿。", "Shì, wǒ jiā qī kǒu rén dōu zài zhèr.", "Yes, all seven of us are in it."],
            [0, "你妈妈很年轻！你长得很像她。", "Nǐ māma hěn niánqīng! Nǐ zhǎngde hěn xiàng tā.", "Your mom looks so young! You look just like her."],
            [1, "是吗？我觉得我更像我爸爸。你看，他老了，头发都白了。", "Shì ma? Wǒ juéde wǒ gèng xiàng wǒ bàba. Nǐ kàn, tā lǎo le, tóufa dōu bái le.", "Really? I think I look more like my dad. See, he's older now — his hair's all white."],
            [0, "这个有一点儿胖的人是谁？", "Zhè ge yǒu yìdiǎnr pàng de rén shì shéi?", "Who's this slightly chubby guy?"],
            [1, "是我弟弟。他很害羞，不喜欢拍照片。", "Shì wǒ dìdi. Tā hěn hàixiū, bù xǐhuan pāi zhàopiàn.", "My younger brother. He's shy and hates having his photo taken."],
            [0, "那这个人呢？他比你矮。", "Nà zhè ge rén ne? Tā bǐ nǐ ǎi.", "And this one? He's shorter than you."],
            [1, "是我哥哥。他是老师，工作很认真。", "Shì wǒ gēge. Tā shì lǎoshī, gōngzuò hěn rènzhēn.", "That's my older brother. He's a teacher and works really hard."]
          ]
        },
        {
          title: "My new teacher",
          zh: "我的新老师",
          setting: "Wang Fang asks Xiaomei about her new teacher.",
          cast: [["王芳", "Wáng Fāng"], ["小美", "Xiǎoměi"]],
          lines: [
            [0, "小美，你的新老师长什么样子？", "Xiǎoměi, nǐ de xīn lǎoshī zhǎng shénme yàngzi?", "Xiaomei, what does your new teacher look like?"],
            [1, "她很年轻，很漂亮，头发很长。", "Tā hěn niánqīng, hěn piàoliang, tóufa hěn cháng.", "She's young and pretty, with long hair."],
            [0, "她的性格怎么样？", "Tā de xìnggé zěnmeyàng?", "What's she like?"],
            [1, "她很热情，常常笑。", "Tā hěn rèqíng, chángcháng xiào.", "She's really nice and smiles a lot."],
            [0, "你喜欢她吗？", "Nǐ xǐhuan tā ma?", "Do you like her?"],
            [1, "喜欢！我很害羞，可是她常常和我一起玩。", "Xǐhuan! Wǒ hěn hàixiū, kěshì tā chángcháng hé wǒ yìqǐ wán.", "Yes! I'm shy, but she often plays with me."],
            [0, "她很像你的大姐姐！", "Tā hěn xiàng nǐ de dà jiějie!", "She sounds like a big sister to you!"],
            [1, "是！她是我最喜欢的老师！", "Shì! Tā shì wǒ zuì xǐhuan de lǎoshī!", "Yes! She's my favorite teacher!"]
          ]
        }
      ]
    },

    37: {
      words: [
        ["租", "zū", "to rent", "verb", "你的房子是租的吗？", "Nǐ de fángzi shì zū de ma?", "Is your place rented?"],
        ["房租", "fángzū", "rent", "noun", "房租一个月多少钱？", "Fángzū yí ge yuè duōshao qián?", "How much is the rent a month?"],
        ["房东", "fángdōng", "landlord", "noun", "房东住在楼上。", "Fángdōng zhù zài lóu shàng.", "The landlord lives upstairs."],
        ["公寓", "gōngyù", "apartment", "noun", "我住的公寓在十八层。", "Wǒ zhù de gōngyù zài shíbā céng.", "My apartment is on the 18th floor."],
        ["卧室", "wòshì", "bedroom", "noun", "这个公寓有两个卧室。", "Zhè ge gōngyù yǒu liǎng ge wòshì.", "This apartment has two bedrooms."],
        ["阳台", "yángtái", "balcony", "noun", "我喜欢在阳台上喝咖啡。", "Wǒ xǐhuan zài yángtái shang hē kāfēi.", "I like having coffee on the balcony."],
        ["家具", "jiājù", "furniture", "noun", "房子里有家具吗？", "Fángzi lǐ yǒu jiājù ma?", "Does the place come with furniture?"],
        ["押金", "yājīn", "deposit", "noun", "押金是一个月的房租。", "Yājīn shì yí ge yuè de fángzū.", "The deposit is one month's rent."],
        ["合同", "hétong", "contract", "noun", "请你在合同上签名。", "Qǐng nǐ zài hétong shang qiānmíng.", "Please sign the contract."],
        ["搬家", "bānjiā", "to move (house)", "verb", "我们下个星期搬家。", "Wǒmen xià ge xīngqī bānjiā.", "We're moving next week."],
        ["包括", "bāokuò", "to include", "verb", "房租包括家具和空调。", "Fángzū bāokuò jiājù hé kōngtiáo.", "The rent includes furniture and air conditioning."],
        ["附近", "fùjìn", "nearby", "noun", "附近有超市吗？", "Fùjìn yǒu chāoshì ma?", "Is there a supermarket nearby?"],
        ["交通", "jiāotōng", "transportation; traffic", "noun", "这儿交通很方便，附近有地铁站。", "Zhèr jiāotōng hěn fāngbiàn, fùjìn yǒu dìtiě zhàn.", "Getting around is easy here — there's a subway station nearby."],
        ["环境", "huánjìng", "surroundings; environment", "noun", "这儿的环境很好，很安静。", "Zhèr de huánjìng hěn hǎo, hěn ānjìng.", "It's a nice area here, and very quiet."],
        ["方便", "fāngbiàn", "convenient", "adjective", "住在这儿很方便，去哪儿都很近。", "Zhù zài zhèr hěn fāngbiàn, qù nǎr dōu hěn jìn.", "Living here is convenient; everything is close."]
      ],
      patterns: [
        ["附近有……吗？", "Fùjìn yǒu … ma?", "Is there a … nearby?", "附近有地铁站吗？", "Fùjìn yǒu dìtiě zhàn ma?", "Is there a subway station nearby?"],
        ["我想租一个……的公寓。", "Wǒ xiǎng zū yí ge … de gōngyù.", "I'd like to rent an apartment that …", "我想租一个有阳台的公寓。", "Wǒ xiǎng zū yí ge yǒu yángtái de gōngyù.", "I'd like to rent an apartment with a balcony."]
      ],
      scenarios: [
        {
          title: "Viewing an apartment",
          zh: "看房子",
          setting: "Anna looks around a one-bedroom apartment with the landlord.",
          cast: [["房东", "fángdōng (landlord)"], ["安娜", "Ānnà"]],
          lines: [
            [0, "你好，这是客厅。家具都是新的。", "Nǐ hǎo, zhè shì kètīng. Jiājù dōu shì xīn de.", "Hello, this is the living room. All the furniture is new."],
            [1, "很漂亮！有几个卧室？", "Hěn piàoliang! Yǒu jǐ ge wòshì?", "It's lovely! How many bedrooms are there?"],
            [0, "一个卧室，还有一个阳台。", "Yí ge wòshì, hái yǒu yí ge yángtái.", "One bedroom, and there's a balcony too."],
            [1, "阳台很大！房租贵吗？", "Yángtái hěn dà! Fángzū guì ma?", "The balcony's big! Is the rent expensive?"],
            [0, "不贵，附近的房子都比这儿贵。", "Bú guì, fùjìn de fángzi dōu bǐ zhèr guì.", "No — places around here all cost more than this one."],
            [1, "房租包括什么？", "Fángzū bāokuò shénme?", "What does the rent include?"],
            [0, "包括家具和空调。押金是一个月的房租。", "Bāokuò jiājù hé kōngtiáo. Yājīn shì yí ge yuè de fángzū.", "Furniture and air conditioning. The deposit is one month's rent."],
            [1, "好。我可以下个星期搬家吗？", "Hǎo. Wǒ kěyǐ xià ge xīngqī bānjiā ma?", "Great. Could I move in next week?"],
            [0, "可以。请你先在合同上签名。", "Kěyǐ. Qǐng nǐ xiān zài hétong shang qiānmíng.", "Sure. Please sign the contract first."]
          ]
        },
        {
          title: "Location, location",
          zh: "环境怎么样？",
          setting: "Lin Mei is looking for a place and asks Wang Fang about her neighborhood.",
          cast: [["林美", "Lín Měi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，我想租房子。你住的地方怎么样？", "Wáng Fāng, wǒ xiǎng zū fángzi. Nǐ zhù de dìfang zěnmeyàng?", "Wang Fang, I want to rent a place. What's your area like?"],
            [1, "我很喜欢。附近有超市和饭馆，很方便。", "Wǒ hěn xǐhuan. Fùjìn yǒu chāoshì hé fànguǎn, hěn fāngbiàn.", "I love it. There's a supermarket and restaurants nearby — really convenient."],
            [0, "交通呢？", "Jiāotōng ne?", "What about getting around?"],
            [1, "交通也很方便。地铁站离我家很近，走路五分钟。", "Jiāotōng yě hěn fāngbiàn. Dìtiě zhàn lí wǒ jiā hěn jìn, zǒu lù wǔ fēnzhōng.", "Also easy. The subway station is close — a five-minute walk."],
            [0, "环境好吗？我不喜欢太热闹的地方。", "Huánjìng hǎo ma? Wǒ bù xǐhuan tài rènao de dìfang.", "Is it a nice area? I don't like places that are too busy."],
            [1, "环境很好，很安静，旁边有一个公园。", "Huánjìng hěn hǎo, hěn ānjìng, pángbiān yǒu yí ge gōngyuán.", "It's lovely — quiet, with a park right next to it."],
            [0, "你们楼里还有公寓租吗？你可以给房东打个电话吗？", "Nǐmen lóu lǐ hái yǒu gōngyù zū ma? Nǐ kěyǐ gěi fángdōng dǎ ge diànhuà ma?", "Are there any apartments for rent in your building? Could you call your landlord?"],
            [1, "可以，我今天晚上给他打电话。", "Kěyǐ, wǒ jīntiān wǎnshang gěi tā dǎ diànhuà.", "Sure, I'll call him this evening."]
          ]
        },
        {
          title: "Moving day",
          zh: "搬家",
          setting: "Li Ming asks David to help him move on the weekend.",
          cast: [["李明", "Lǐ Míng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，星期六我搬家，你有空吗？", "Dàwèi, xīngqīliù wǒ bānjiā, nǐ yǒu kòng ma?", "David, I'm moving on Saturday. Are you free?"],
            [1, "有空！你的新公寓在哪儿？", "Yǒu kòng! Nǐ de xīn gōngyù zài nǎr?", "Yes! Where's your new apartment?"],
            [0, "在公司附近，坐地铁两站。", "Zài gōngsī fùjìn, zuò dìtiě liǎng zhàn.", "Near my office, two subway stops away."],
            [1, "你有很多家具吗？", "Nǐ yǒu hěn duō jiājù ma?", "Do you have a lot of furniture?"],
            [0, "不多。新公寓里有家具，我带衣服和书。", "Bù duō. Xīn gōngyù lǐ yǒu jiājù, wǒ dài yīfu hé shū.", "Not much. The new place is furnished, so I'm just taking clothes and books."],
            [1, "卧室大吗？有阳台吗？", "Wòshì dà ma? Yǒu yángtái ma?", "Is the bedroom big? Is there a balcony?"],
            [0, "卧室不大，可是阳台很大！", "Wòshì bú dà, kěshì yángtái hěn dà!", "The bedroom is small, but the balcony is big!"],
            [1, "太好了！我早上几点来？", "Tài hǎo le! Wǒ zǎoshang jǐ diǎn lái?", "Great! What time should I come in the morning?"],
            [0, "八点吧。星期六晚上我请你吃饭！", "Bā diǎn ba. Xīngqīliù wǎnshang wǒ qǐng nǐ chī fàn!", "Eight. And dinner's on me Saturday night!"]
          ]
        }
      ]
    },

    38: {
      words: [
        ["家务", "jiāwù", "housework", "noun", "周末我们一起做家务吧。", "Zhōumò wǒmen yìqǐ zuò jiāwù ba.", "Let's do the housework together this weekend."],
        ["打扫", "dǎsǎo", "to clean", "verb", "我每个星期打扫一次房间。", "Wǒ měi ge xīngqī dǎsǎo yí cì fángjiān.", "I clean my room once a week."],
        ["洗", "xǐ", "to wash", "verb", "你洗碗，我做饭。", "Nǐ xǐ wǎn, wǒ zuò fàn.", "You wash the dishes, I'll cook."],
        ["洗衣机", "xǐyījī", "washing machine", "noun", "洗衣机在洗手间里。", "Xǐyījī zài xǐshǒujiān lǐ.", "The washing machine is in the bathroom."],
        ["垃圾", "lājī", "trash", "noun", "垃圾太多了！", "Lājī tài duō le!", "There's way too much trash!"],
        ["扔", "rēng", "to throw (away)", "verb", "你可以去扔垃圾吗？", "Nǐ kěyǐ qù rēng lājī ma?", "Could you take out the trash?"],
        ["擦", "cā", "to wipe", "verb", "我来擦桌子。", "Wǒ lái cā zhuōzi.", "I'll wipe the table."],
        ["整理", "zhěnglǐ", "to tidy up", "verb", "你应该整理一下你的房间。", "Nǐ yīnggāi zhěnglǐ yíxià nǐ de fángjiān.", "You should tidy up your room."],
        ["帮", "bāng", "to help", "verb", "你可以帮我一下吗？", "Nǐ kěyǐ bāng wǒ yíxià ma?", "Can you give me a hand?"],
        ["修", "xiū", "to fix", "verb", "房东明天来修空调。", "Fángdōng míngtiān lái xiū kōngtiáo.", "The landlord is coming to fix the air conditioning tomorrow."],
        ["坏", "huài", "broken; bad", "adjective", "我的手机坏了。", "Wǒ de shǒujī huài le.", "My phone is broken."],
        ["灯", "dēng", "light; lamp", "noun", "睡觉的时候请你关灯。", "Shuìjiào de shíhou qǐng nǐ guān dēng.", "Please turn off the light when you go to bed."],
        ["脏", "zāng", "dirty", "adjective", "你的鞋太脏了！", "Nǐ de xié tài zāng le!", "Your shoes are filthy!"],
        ["乱", "luàn", "messy", "adjective", "我的房间很乱。", "Wǒ de fángjiān hěn luàn.", "My room is a mess."],
        ["自己", "zìjǐ", "oneself", "pronoun", "小美会自己穿衣服。", "Xiǎoměi huì zìjǐ chuān yīfu.", "Xiaomei can get dressed by herself."]
      ],
      patterns: [
        ["你可以帮我……吗？", "Nǐ kěyǐ bāng wǒ … ma?", "Could you help me …?", "你可以帮我扔垃圾吗？", "Nǐ kěyǐ bāng wǒ rēng lājī ma?", "Could you take the trash out for me?"],
        ["……坏了。", "… huài le.", "… is broken.", "厨房的灯坏了。", "Chúfáng de dēng huài le.", "The kitchen light is broken."]
      ],
      scenarios: [
        {
          title: "Cleaning day",
          zh: "打扫房间",
          setting: "Saturday morning: Wang Fang and David split the chores.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，今天星期六，我们打扫房间吧！", "Dàwèi, jīntiān xīngqīliù, wǒmen dǎsǎo fángjiān ba!", "David, it's Saturday. Let's clean the place!"],
            [1, "好。客厅太乱了。", "Hǎo. Kètīng tài luàn le.", "Okay. The living room is a mess."],
            [0, "我整理客厅，擦桌子。你打扫厨房，好吗？", "Wǒ zhěnglǐ kètīng, cā zhuōzi. Nǐ dǎsǎo chúfáng, hǎo ma?", "I'll tidy the living room and wipe the table. You do the kitchen, okay?"],
            [1, "行。厨房的垃圾也很多，我去扔。", "Xíng. Chúfáng de lājī yě hěn duō, wǒ qù rēng.", "Sure. There's a lot of trash in the kitchen too — I'll take it out."],
            [0, "谢谢！你的衣服也要洗了。", "Xièxie! Nǐ de yīfu yě yào xǐ le.", "Thanks! Your clothes need washing too."],
            [1, "我知道。我先洗衣服，然后打扫厨房。", "Wǒ zhīdào. Wǒ xiān xǐ yīfu, ránhòu dǎsǎo chúfáng.", "I know. I'll do my laundry first, then clean the kitchen."],
            [0, "好。做完家务，我们去喝咖啡吧！", "Hǎo. Zuò wán jiāwù, wǒmen qù hē kāfēi ba!", "Great. When we're done with the chores, let's go get coffee!"]
          ]
        },
        {
          title: "Calling the landlord",
          zh: "洗衣机坏了",
          setting: "David phones the landlord about some problems in the apartment.",
          cast: [["大卫", "Dàwèi"], ["房东", "fángdōng (landlord)"]],
          lines: [
            [0, "喂，你好！我是大卫。", "Wèi, nǐ hǎo! Wǒ shì Dàwèi.", "Hello! This is David."],
            [1, "你好，大卫。有什么事？", "Nǐ hǎo, Dàwèi. Yǒu shénme shì?", "Hi, David. What's up?"],
            [0, "我们的洗衣机坏了。", "Wǒmen de xǐyījī huài le.", "Our washing machine is broken."],
            [1, "什么时候坏的？", "Shénme shíhou huài de?", "When did it break?"],
            [0, "昨天晚上。还有，洗手间的灯也坏了。", "Zuótiān wǎnshang. Hái yǒu, xǐshǒujiān de dēng yě huài le.", "Last night. Also, the bathroom light is out."],
            [1, "好，我明天上午来修。", "Hǎo, wǒ míngtiān shàngwǔ lái xiū.", "Okay, I'll come fix them tomorrow morning."],
            [0, "灯我自己可以换。你来修洗衣机吧。", "Dēng wǒ zìjǐ kěyǐ huàn. Nǐ lái xiū xǐyījī ba.", "I can change the bulb myself. You just come fix the washing machine."],
            [1, "好，那明天上午见。", "Hǎo, nà míngtiān shàngwǔ jiàn.", "Okay, see you tomorrow morning then."]
          ]
        },
        {
          title: "A little helper",
          zh: "我帮你",
          setting: "Xiaomei visits while Wang Fang is cleaning the windows.",
          cast: [["小美", "Xiǎoměi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳姐姐，我可以帮你吗？", "Wáng Fāng jiějie, wǒ kěyǐ bāng nǐ ma?", "Wang Fang, can I help you?"],
            [1, "好！你帮我擦桌子吧。", "Hǎo! Nǐ bāng wǒ cā zhuōzi ba.", "Sure! Help me wipe the table."],
            [0, "桌子好脏！", "Zhuōzi hǎo zāng!", "The table's so dirty!"],
            [1, "是，真脏。你看，现在干净了！", "Shì, zhēn zāng. Nǐ kàn, xiànzài gānjìng le!", "It really is. Look, now it's clean!"],
            [0, "我在家也做家务！我自己整理房间。", "Wǒ zài jiā yě zuò jiāwù! Wǒ zìjǐ zhěnglǐ fángjiān.", "I do housework at home too! I tidy my room all by myself."],
            [1, "是吗？你妈妈说你的房间很乱！", "Shì ma? Nǐ māma shuō nǐ de fángjiān hěn luàn!", "Oh really? Your mom says your room is messy!"],
            [0, "……明天我整理！", "…Míngtiān wǒ zhěnglǐ!", "…I'll tidy it tomorrow!"]
          ]
        }
      ]
    },

    39: {
      words: [
        ["自然", "zìrán", "nature", "noun", "我很喜欢大自然。", "Wǒ hěn xǐhuan dà zìrán.", "I love nature."],
        ["山", "shān", "mountain", "noun", "周末我们去山上玩吧。", "Zhōumò wǒmen qù shān shang wán ba.", "Let's go up to the mountains this weekend."],
        ["河", "hé", "river", "noun", "河里有很多鱼。", "Hé li yǒu hěn duō yú.", "There are lots of fish in the river."],
        ["海", "hǎi", "sea; ocean", "noun", "夏天我想去海里游泳。", "Xiàtiān wǒ xiǎng qù hǎi li yóuyǒng.", "I want to swim in the sea this summer."],
        ["湖", "hú", "lake", "noun", "公园里有一个小湖。", "Gōngyuán li yǒu yí ge xiǎo hú.", "There's a little lake in the park."],
        ["树", "shù", "tree", "noun", "我们楼下有很多树。", "Wǒmen lóu xià yǒu hěn duō shù.", "There are lots of trees outside our building."],
        ["花", "huā", "flower", "noun", "春天公园里的花都开了。", "Chūntiān gōngyuán li de huā dōu kāi le.", "In spring all the flowers in the park are out."],
        ["草", "cǎo", "grass", "noun", "请不要在草上走。", "Qǐng bú yào zài cǎo shang zǒu.", "Please keep off the grass."],
        ["天空", "tiānkōng", "sky", "noun", "今天天空很蓝。", "Jīntiān tiānkōng hěn lán.", "The sky is so blue today."],
        ["太阳", "tàiyáng", "sun", "noun", "今天太阳很大，带上帽子吧。", "Jīntiān tàiyáng hěn dà, dài shang màozi ba.", "The sun's strong today. Take a hat."],
        ["月亮", "yuèliang", "moon", "noun", "今天晚上的月亮很漂亮。", "Jīntiān wǎnshang de yuèliang hěn piàoliang.", "The moon is lovely tonight."],
        ["星星", "xīngxing", "star", "noun", "在城市里看不到星星。", "Zài chéngshì li kàn bu dào xīngxing.", "You can't see the stars in the city."],
        ["空气", "kōngqì", "air", "noun", "山上的空气很好。", "Shān shang de kōngqì hěn hǎo.", "The air up in the mountains is great."],
        ["爬山", "páshān", "to hike; to climb a mountain", "verb", "李明每个周末都去爬山。", "Lǐ Míng měi ge zhōumò dōu qù páshān.", "Li Ming goes hiking every weekend."],
        ["美", "měi", "beautiful", "adjective", "这儿太美了！", "Zhèr tài měi le!", "It's so beautiful here!"]
      ],
      patterns: [
        ["……上／里有……", "… shang / li yǒu …", "On / in … there is …", "山上有很多树。", "Shān shang yǒu hěn duō shù.", "There are lots of trees on the mountain."],
        ["……太美了！", "… tài měi le!", "… is so beautiful!", "这儿的花太美了！", "Zhèr de huā tài měi le!", "The flowers here are so beautiful!"]
      ],
      scenarios: [
        {
          title: "Hiking with Li Ming",
          zh: "去爬山",
          setting: "Li Ming, an early riser, invites David on a weekend hike.",
          cast: [["李明", "Lǐ Míng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，周末想去爬山吗？", "Dàwèi, zhōumò xiǎng qù páshān ma?", "David, want to go hiking this weekend?"],
            [1, "好！几点出发？", "Hǎo! Jǐ diǎn chūfā?", "Sure! What time do we leave?"],
            [0, "早上五点出发。山上的早上太美了！", "Zǎoshang wǔ diǎn chūfā. Shān shang de zǎoshang tài měi le!", "We leave at five. Mornings on the mountain are gorgeous!"],
            [1, "五点？太早了吧！", "Wǔ diǎn? Tài zǎo le ba!", "Five? Isn't that way too early?"],
            [0, "不早！山上的空气很好，人也不多。", "Bù zǎo! Shān shang de kōngqì hěn hǎo, rén yě bù duō.", "Not at all! The air up there is great, and it's not crowded."],
            [1, "山上有湖吗？", "Shān shang yǒu hú ma?", "Is there a lake up there?"],
            [0, "有。湖旁边都是花和草，还有很多树。", "Yǒu. Hú pángbiān dōu shì huā hé cǎo, hái yǒu hěn duō shù.", "Yes. Around the lake it's all flowers and grass, and lots of trees."],
            [1, "好，我去！晚上我们能在山上看星星吗？", "Hǎo, wǒ qù! Wǎnshang wǒmen néng zài shān shang kàn xīngxing ma?", "Okay, I'm in! Can we watch the stars on the mountain at night?"]
          ]
        },
        {
          title: "A day by the sea",
          zh: "看海",
          setting: "Anna and Wang Fang spend a sunny day at the beach.",
          cast: [["安娜", "Ānnà"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，你看，天空和海都是蓝的！", "Wáng Fāng, nǐ kàn, tiānkōng hé hǎi dōu shì lán de!", "Wang Fang, look, the sky and the sea are both blue!"],
            [1, "太美了！今天太阳也很好。", "Tài měi le! Jīntiān tàiyáng yě hěn hǎo.", "Gorgeous! And it's sunny today too."],
            [0, "我们去海里游泳吧！", "Wǒmen qù hǎi li yóuyǒng ba!", "Let's go for a swim in the sea!"],
            [1, "现在太阳太大了。我们先坐一下，下午再去。", "Xiànzài tàiyáng tài dà le. Wǒmen xiān zuò yíxià, xiàwǔ zài qù.", "The sun's too strong right now. Let's sit for a while and go in the afternoon."],
            [0, "好。这儿的空气比城市里的好多了。", "Hǎo. Zhèr de kōngqì bǐ chéngshì li de hǎo duō le.", "Okay. The air here is so much better than in the city."],
            [1, "是的。晚上我们还可以在这儿看月亮。", "Shì de. Wǎnshang wǒmen hái kěyǐ zài zhèr kàn yuèliang.", "It is. And tonight we can watch the moon from here."],
            [0, "太好了！我最喜欢晚上的海。", "Tài hǎo le! Wǒ zuì xǐhuan wǎnshang de hǎi.", "Great! I love the sea at night most of all."]
          ]
        },
        {
          title: "Fish in the river",
          zh: "河里有鱼",
          setting: "David takes little Xiaomei for a walk by the river in the park.",
          cast: [["大卫", "Dàwèi"], ["小美", "Xiǎoměi"]],
          lines: [
            [0, "小美，你看，河里有鱼！", "Xiǎoměi, nǐ kàn, hé li yǒu yú!", "Xiaomei, look, there are fish in the river!"],
            [1, "好多鱼！我能带回家养吗？", "Hǎo duō yú! Wǒ néng dài huí jiā yǎng ma?", "So many fish! Can I take one home as a pet?"],
            [0, "不行，鱼应该住在河里。我们要爱大自然。", "Bù xíng, yú yīnggāi zhù zài hé li. Wǒmen yào ài dà zìrán.", "No, fish belong in the river. We have to love nature."],
            [1, "那我能拍花的照片吗？", "Nà wǒ néng pāi huā de zhàopiàn ma?", "Then can I take pictures of the flowers?"],
            [0, "可以。请别在草上跑。", "Kěyǐ. Qǐng bié zài cǎo shang pǎo.", "Sure. Just don't run on the grass, please."],
            [1, "大卫，树上有一只鸟！", "Dàwèi, shù shang yǒu yì zhī niǎo!", "David, there's a bird in the tree!"],
            [0, "它在唱歌呢。", "Tā zài chàng gē ne.", "It's singing."],
            [1, "我最喜欢大自然了！", "Wǒ zuì xǐhuan dà zìrán le!", "I love nature the most!"]
          ]
        }
      ]
    },

    40: {
      words: [
        ["节日", "jiérì", "holiday; festival", "noun", "你最喜欢什么节日？", "Nǐ zuì xǐhuan shénme jiérì?", "What's your favorite holiday?"],
        ["春节", "Chūnjié", "Spring Festival (Chinese New Year)", "noun", "春节是中国最大的节日。", "Chūnjié shì Zhōngguó zuì dà de jiérì.", "Spring Festival is China's biggest holiday."],
        ["中秋节", "Zhōngqiūjié", "Mid-Autumn Festival", "noun", "中秋节晚上大家一起看月亮。", "Zhōngqiūjié wǎnshang dàjiā yìqǐ kàn yuèliang.", "On Mid-Autumn night everyone watches the moon together."],
        ["新年", "xīnnián", "New Year", "noun", "新年快乐！", "Xīnnián kuàilè!", "Happy New Year!"],
        ["圣诞节", "Shèngdànjié", "Christmas", "noun", "圣诞节大卫想回美国。", "Shèngdànjié Dàwèi xiǎng huí Měiguó.", "David wants to go back to the US for Christmas."],
        ["过年", "guònián", "to celebrate the New Year", "verb", "过年的时候，我们都回家。", "Guònián de shíhou, wǒmen dōu huí jiā.", "We all go home for the New Year."],
        ["放假", "fàngjià", "to have a day off", "verb", "公司从明天开始放假。", "Gōngsī cóng míngtiān kāishǐ fàngjià.", "The company's off from tomorrow."],
        ["假期", "jiàqī", "vacation; holiday", "noun", "假期你打算做什么？", "Jiàqī nǐ dǎsuan zuò shénme?", "What are you planning to do over the holiday?"],
        ["红包", "hóngbāo", "red envelope (gift money)", "noun", "李明的妈妈给了小美一个红包。", "Lǐ Míng de māma gěi le Xiǎoměi yí ge hóngbāo.", "Li Ming's mom gave Xiaomei a red envelope."],
        ["饺子", "jiǎozi", "dumplings", "noun", "你会做饺子吗？", "Nǐ huì zuò jiǎozi ma?", "Can you make dumplings?"],
        ["月饼", "yuèbing", "mooncake", "noun", "这个月饼太甜了。", "Zhège yuèbing tài tián le.", "This mooncake is too sweet."],
        ["鞭炮", "biānpào", "firecrackers", "noun", "小美怕鞭炮。", "Xiǎoměi pà biānpào.", "Xiaomei is scared of firecrackers."],
        ["团圆", "tuányuán", "to be reunited", "verb", "中秋节是家人团圆的节日。", "Zhōngqiūjié shì jiārén tuányuán de jiérì.", "Mid-Autumn is a festival for families to get together."],
        ["传统", "chuántǒng", "tradition; traditional", "noun", "吃月饼是中秋节的传统。", "Chī yuèbing shì Zhōngqiūjié de chuántǒng.", "Eating mooncakes is a Mid-Autumn tradition."],
        ["习惯", "xíguàn", "custom; to be used to", "noun", "我还不习惯这儿的冬天。", "Wǒ hái bù xíguàn zhèr de dōngtiān.", "I'm still not used to the winters here."]
      ],
      patterns: [
        ["……的时候，……", "… de shíhou, …", "At / during …, …", "中秋节的时候，我们一起吃月饼。", "Zhōngqiūjié de shíhou, wǒmen yìqǐ chī yuèbing.", "At Mid-Autumn we eat mooncakes together."],
        ["……是……的传统。", "… shì … de chuántǒng.", "… is a … tradition.", "过年给红包是中国的传统。", "Guònián gěi hóngbāo shì Zhōngguó de chuántǒng.", "Giving red envelopes at New Year is a Chinese tradition."]
      ],
      scenarios: [
        {
          title: "Home for Spring Festival",
          zh: "回家过年",
          setting: "David asks Li Ming about his Spring Festival plans.",
          cast: [["大卫", "Dàwèi"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，春节你回家吗？", "Lǐ Míng, Chūnjié nǐ huí jiā ma?", "Li Ming, are you going home for Spring Festival?"],
            [1, "回。公司放假七天，我们家每年都一起过年。", "Huí. Gōngsī fàngjià qī tiān, wǒmen jiā měi nián dōu yìqǐ guònián.", "Yes. The company gives us seven days off, and my family spends New Year together every year."],
            [0, "你家人很多吧？", "Nǐ jiārén hěn duō ba?", "You've got a big family, right?"],
            [1, "很多！十几个人一起吃饺子，很热闹。", "Hěn duō! Shí jǐ ge rén yìqǐ chī jiǎozi, hěn rènao.", "Huge! A dozen or more of us eating dumplings together. It's really lively."],
            [0, "我也想看看中国的春节。", "Wǒ yě xiǎng kànkan Zhōngguó de Chūnjié.", "I'd love to see a Chinese Spring Festival too."],
            [1, "那你和我一起回家过年吧！", "Nà nǐ hé wǒ yìqǐ huí jiā guònián ba!", "Then come home with me for New Year!"],
            [0, "可以吗？我要给红包吗？", "Kěyǐ ma? Wǒ yào gěi hóngbāo ma?", "Really? Do I have to give red envelopes?"],
            [1, "不用，你是客人。我妈妈还会给你一个红包！", "Bú yòng, nǐ shì kèrén. Wǒ māma hái huì gěi nǐ yí ge hóngbāo!", "No need, you're a guest. My mom will probably give you one!"]
          ]
        },
        {
          title: "Mooncakes at the Lis'",
          zh: "中秋节快乐",
          setting: "Li Ming's mother welcomes Anna on Mid-Autumn night.",
          cast: [["李明的妈妈", "Lǐ Míng de māma"], ["安娜", "Ānnà"]],
          lines: [
            [0, "安娜，中秋节快乐！来，吃月饼。", "Ānnà, Zhōngqiūjié kuàilè! Lái, chī yuèbing.", "Happy Mid-Autumn Festival, Anna! Come, have a mooncake."],
            [1, "谢谢！这个月饼里有肉吗？我不吃肉。", "Xièxie! Zhège yuèbing li yǒu ròu ma? Wǒ bù chī ròu.", "Thank you! Is there meat in this one? I don't eat meat."],
            [0, "这个没有，是甜的。吃月饼是中秋节的传统。", "Zhège méiyǒu, shì tián de. Chī yuèbing shì Zhōngqiūjié de chuántǒng.", "Not this one, it's a sweet one. Eating mooncakes is a Mid-Autumn tradition."],
            [1, "很好吃！中秋节还有什么传统？", "Hěn hǎochī! Zhōngqiūjié hái yǒu shénme chuántǒng?", "Delicious! What other Mid-Autumn traditions are there?"],
            [0, "中秋节是团圆的节日。晚上一家人坐在一起看月亮。", "Zhōngqiūjié shì tuányuán de jiérì. Wǎnshang yì jiā rén zuò zài yìqǐ kàn yuèliang.", "It's a festival for families to be together. At night the whole family sits and watches the moon."],
            [1, "今天晚上的月亮很大！在美国我们没有这个节日。", "Jīntiān wǎnshang de yuèliang hěn dà! Zài Měiguó wǒmen méiyǒu zhège jiérì.", "The moon's so big tonight! We don't have this festival in America."],
            [0, "你习惯中国的节日了吗？", "Nǐ xíguàn Zhōngguó de jiérì le ma?", "Are you used to Chinese holidays now?"],
            [1, "已经习惯了。我最喜欢中秋节！", "Yǐjīng xíguàn le. Wǒ zuì xǐhuan Zhōngqiūjié!", "I am now. Mid-Autumn is my favorite!"]
          ]
        },
        {
          title: "Christmas plans",
          zh: "圣诞节",
          setting: "David tells his roommate Wang Fang about his holiday plans.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，下个月是圣诞节，我想回美国。", "Wáng Fāng, xià ge yuè shì Shèngdànjié, wǒ xiǎng huí Měiguó.", "Wang Fang, it's Christmas next month. I want to go back to the US."],
            [1, "圣诞节你有假期吗？", "Shèngdànjié nǐ yǒu jiàqī ma?", "Do you get time off for Christmas?"],
            [0, "有五天。我想和家人一起庆祝圣诞节和新年。", "Yǒu wǔ tiān. Wǒ xiǎng hé jiārén yìqǐ qìngzhù Shèngdànjié hé xīnnián.", "Five days. I want to celebrate Christmas and New Year with my family."],
            [1, "你们美国人新年的时候放鞭炮吗？", "Nǐmen Měiguó rén xīnnián de shíhou fàng biānpào ma?", "Do Americans set off firecrackers at New Year?"],
            [0, "我们不放鞭炮。新年晚上，大家一起等十二点。", "Wǒmen bú fàng biānpào. Xīnnián wǎnshang, dàjiā yìqǐ děng shí'èr diǎn.", "We don't do firecrackers. On New Year's Eve, everyone waits for midnight together."],
            [1, "中国人过年喜欢放鞭炮，很热闹。", "Zhōngguó rén guònián xǐhuan fàng biānpào, hěn rènao.", "Chinese people love firecrackers at New Year. It's really noisy and fun."],
            [0, "我知道！我在中国的第一个春节，一晚上都没睡觉！", "Wǒ zhīdao! Wǒ zài Zhōngguó de dì-yī ge Chūnjié, yì wǎnshang dōu méi shuìjiào!", "I know! My first Spring Festival in China, I didn't sleep all night!"],
            [1, "那圣诞节快乐，新年快乐！", "Nà Shèngdànjié kuàilè, xīnnián kuàilè!", "Well then, merry Christmas and happy New Year!"]
          ]
        }
      ]
    },

    41: {
      words: [
        ["电影", "diànyǐng", "movie", "noun", "周末我们去看电影吧。", "Zhōumò wǒmen qù kàn diànyǐng ba.", "Let's go to a movie this weekend."],
        ["电视", "diànshì", "TV", "noun", "我爸爸每天晚上看电视。", "Wǒ bàba měi tiān wǎnshang kàn diànshì.", "My dad watches TV every evening."],
        ["节目", "jiémù", "show; program", "noun", "这个节目很有意思。", "Zhège jiémù hěn yǒu yìsi.", "This show is really interesting."],
        ["演员", "yǎnyuán", "actor", "noun", "这个演员很帅。", "Zhège yǎnyuán hěn shuài.", "This actor is really handsome."],
        ["明星", "míngxīng", "celebrity; star", "noun", "王芳在超市看见了一个明星！", "Wáng Fāng zài chāoshì kànjiàn le yí ge míngxīng!", "Wang Fang saw a celebrity at the supermarket!"],
        ["歌手", "gēshǒu", "singer", "noun", "我最喜欢的歌手是中国人。", "Wǒ zuì xǐhuan de gēshǒu shì Zhōngguó rén.", "My favorite singer is Chinese."],
        ["演唱会", "yǎnchànghuì", "concert", "noun", "下个月我要去听演唱会。", "Xià ge yuè wǒ yào qù tīng yǎnchànghuì.", "I'm going to a concert next month."],
        ["故事", "gùshi", "story", "noun", "小美每天晚上都要听妈妈说故事。", "Xiǎoměi měi tiān wǎnshang dōu yào tīng māma shuō gùshi.", "Xiaomei wants Mom to tell her a story every night."],
        ["字幕", "zìmù", "subtitles", "noun", "我看中国电影要看字幕。", "Wǒ kàn Zhōngguó diànyǐng yào kàn zìmù.", "I need subtitles when I watch Chinese films."],
        ["部", "bù", "(measure word for movies)", "measure", "我昨天看了两部电影。", "Wǒ zuótiān kàn le liǎng bù diànyǐng.", "I watched two movies yesterday."],
        ["首", "shǒu", "(measure word for songs)", "measure", "这首歌很好听。", "Zhè shǒu gē hěn hǎotīng.", "This song is lovely."],
        ["推荐", "tuījiàn", "to recommend", "verb", "你能给我推荐一部电影吗？", "Nǐ néng gěi wǒ tuījiàn yí bù diànyǐng ma?", "Can you recommend me a movie?"],
        ["有名", "yǒumíng", "famous", "adjective", "她在中国很有名。", "Tā zài Zhōngguó hěn yǒumíng.", "She's very famous in China."],
        ["好听", "hǎotīng", "nice to listen to", "adjective", "你的声音很好听。", "Nǐ de shēngyīn hěn hǎotīng.", "You have a lovely voice."],
        ["无聊", "wúliáo", "boring", "adjective", "下雨天在家很无聊。", "Xià yǔ tiān zài jiā hěn wúliáo.", "Staying home on a rainy day is boring."]
      ],
      patterns: [
        ["你能给我推荐……吗？", "Nǐ néng gěi wǒ tuījiàn … ma?", "Can you recommend me …?", "你能给我推荐一首好听的歌吗？", "Nǐ néng gěi wǒ tuījiàn yì shǒu hǎotīng de gē ma?", "Can you recommend me a good song?"],
        ["我最喜欢的……是……", "Wǒ zuì xǐhuan de … shì …", "My favorite … is …", "我最喜欢的电影是一部老电影。", "Wǒ zuì xǐhuan de diànyǐng shì yí bù lǎo diànyǐng.", "My favorite movie is an old one."]
      ],
      scenarios: [
        {
          title: "Movie night",
          zh: "看电影",
          setting: "David and Wang Fang pick a film to watch at home.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，晚上我们一起看电影吧！", "Wáng Fāng, wǎnshang wǒmen yìqǐ kàn diànyǐng ba!", "Wang Fang, let's watch a movie tonight!"],
            [1, "好！你想看什么？", "Hǎo! Nǐ xiǎng kàn shénme?", "Sure! What do you want to watch?"],
            [0, "你给我推荐一部中国电影吧。", "Nǐ gěi wǒ tuījiàn yí bù Zhōngguó diànyǐng ba.", "Recommend me a Chinese movie."],
            [1, "这部很有名。故事很有意思，演员也很好。", "Zhè bù hěn yǒumíng. Gùshi hěn yǒu yìsi, yǎnyuán yě hěn hǎo.", "This one's really famous. The story's interesting and the actors are great."],
            [0, "有字幕吗？没有字幕我看不懂。", "Yǒu zìmù ma? Méiyǒu zìmù wǒ kàn bu dǒng.", "Does it have subtitles? I can't follow it without them."],
            [1, "有。电影里还有很多好听的歌。", "Yǒu. Diànyǐng li hái yǒu hěn duō hǎotīng de gē.", "It does. And there are lots of lovely songs in it."],
            [0, "太好了！我去买水果，你开电视。", "Tài hǎo le! Wǒ qù mǎi shuǐguǒ, nǐ kāi diànshì.", "Great! I'll grab some fruit, you turn on the TV."]
          ]
        },
        {
          title: "Concert tickets",
          zh: "演唱会",
          setting: "Lin Mei asks Anna to a concert.",
          cast: [["林美", "Lín Měi"], ["安娜", "Ānnà"]],
          lines: [
            [0, "安娜，下个星期六有一个演唱会，你想去吗？", "Ānnà, xià ge xīngqīliù yǒu yí ge yǎnchànghuì, nǐ xiǎng qù ma?", "Anna, there's a concert next Saturday. Want to go?"],
            [1, "谁的演唱会？", "Shéi de yǎnchànghuì?", "Whose concert?"],
            [0, "一个很有名的歌手，现在是大明星。", "Yí ge hěn yǒumíng de gēshǒu, xiànzài shì dà míngxīng.", "A really famous singer. She's a big star now."],
            [1, "她的歌好听吗？", "Tā de gē hǎotīng ma?", "Are her songs any good?"],
            [0, "很好听！你听听这首，这是我最喜欢的。", "Hěn hǎotīng! Nǐ tīngting zhè shǒu, zhè shì wǒ zuì xǐhuan de.", "They're great! Listen to this one, it's my favorite."],
            [1, "很好听！票贵不贵？", "Hěn hǎotīng! Piào guì bu guì?", "It's lovely! Are the tickets expensive?"],
            [0, "有一点儿贵，可是我很想去！", "Yǒu yìdiǎnr guì, kěshì wǒ hěn xiǎng qù!", "A bit. But I really want to go!"],
            [1, "没关系，我去！我们一起去买票吧。", "Méi guānxi, wǒ qù! Wǒmen yìqǐ qù mǎi piào ba.", "That's fine, I'm going! Let's go buy tickets together."]
          ]
        },
        {
          title: "Nothing on TV",
          zh: "电视节目",
          setting: "Xiaomei is bored at Wang Fang's place.",
          cast: [["小美", "Xiǎoměi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，电视上的节目都太无聊了！", "Wáng Fāng, diànshì shang de jiémù dōu tài wúliáo le!", "Wang Fang, everything on TV is so boring!"],
            [1, "那你想看什么？", "Nà nǐ xiǎng kàn shénme?", "So what do you want to watch?"],
            [0, "我想看动物的节目！", "Wǒ xiǎng kàn dòngwù de jiémù!", "I want to watch an animal show!"],
            [1, "现在没有。我给你说一个故事吧。", "Xiànzài méiyǒu. Wǒ gěi nǐ shuō yí ge gùshi ba.", "There isn't one on right now. How about I tell you a story?"],
            [0, "好！我要听熊猫的故事！", "Hǎo! Wǒ yào tīng xióngmāo de gùshi!", "Okay! I want a story about pandas!"],
            [1, "好，你坐在这儿，我们一起看这本书。", "Hǎo, nǐ zuò zài zhèr, wǒmen yìqǐ kàn zhè běn shū.", "Okay, sit here and we'll look at this book together."],
            [0, "这个故事比电视有意思多了！", "Zhège gùshi bǐ diànshì yǒu yìsi duō le!", "This story is way more fun than TV!"]
          ]
        }
      ]
    },

    42: {
      words: [
        ["上网", "shàngwǎng", "to go online", "verb", "这儿能上网吗？", "Zhèr néng shàngwǎng ma?", "Can I get online here?"],
        ["网上", "wǎngshang", "online", "noun", "我常常在网上买东西。", "Wǒ chángcháng zài wǎngshang mǎi dōngxi.", "I often shop online."],
        ["网站", "wǎngzhàn", "website", "noun", "这个网站的东西很便宜。", "Zhège wǎngzhàn de dōngxi hěn piányi.", "Things on this website are cheap."],
        ["软件", "ruǎnjiàn", "app; software", "noun", "这个软件很好，你也试试。", "Zhège ruǎnjiàn hěn hǎo, nǐ yě shìshi.", "This app is great. You should try it too."],
        ["下载", "xiàzài", "to download", "verb", "先下载这个软件。", "Xiān xiàzài zhège ruǎnjiàn.", "Download this app first."],
        ["登录", "dēnglù", "to log in", "verb", "我登录不了微信。", "Wǒ dēnglù bu liǎo Wēixìn.", "I can't log in to WeChat."],
        ["密码", "mìmǎ", "password", "noun", "别告诉别人你的密码。", "Bié gàosu biérén nǐ de mìmǎ.", "Don't tell anyone your password."],
        ["搜索", "sōusuǒ", "to search", "verb", "你在网上搜索一下。", "Nǐ zài wǎngshang sōusuǒ yíxià.", "Just search for it online."],
        ["外卖", "wàimài", "food delivery; takeout", "noun", "今天太累了，我们叫外卖吧。", "Jīntiān tài lèi le, wǒmen jiào wàimài ba.", "I'm too tired today. Let's order takeout."],
        ["订单", "dìngdān", "order", "noun", "你的订单在路上了。", "Nǐ de dìngdān zài lù shang le.", "Your order is on its way."],
        ["支付", "zhīfù", "to pay (online)", "verb", "在手机上支付很方便。", "Zài shǒujī shang zhīfù hěn fāngbiàn.", "Paying on your phone is really convenient."],
        ["收到", "shōudào", "to receive", "verb", "我收到你的短信了。", "Wǒ shōudào nǐ de duǎnxìn le.", "I got your text."],
        ["退货", "tuìhuò", "to return goods", "verb", "这件衣服太小了，我要退货。", "Zhè jiàn yīfu tài xiǎo le, wǒ yào tuìhuò.", "This top is too small. I want to return it."],
        ["评价", "píngjià", "review; rating", "noun", "这家饭馆的评价很好。", "Zhè jiā fànguǎn de píngjià hěn hǎo.", "This restaurant has great reviews."],
        ["免费", "miǎnfèi", "free (of charge)", "adjective", "这个软件是免费的。", "Zhège ruǎnjiàn shì miǎnfèi de.", "This app is free."]
      ],
      patterns: [
        ["在网上……", "zài wǎngshang …", "… online", "我在网上买了一双鞋。", "Wǒ zài wǎngshang mǎi le yì shuāng xié.", "I bought a pair of shoes online."],
        ["你收到……了吗？", "Nǐ shōudào … le ma?", "Did you get …?", "你收到我的包裹了吗？", "Nǐ shōudào wǒ de bāoguǒ le ma?", "Did you get my package?"]
      ],
      scenarios: [
        {
          title: "Ordering takeout",
          zh: "叫外卖",
          setting: "David and Wang Fang order dinner on a delivery app.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，我饿了，也不想做饭。我们叫外卖吧！", "Wáng Fāng, wǒ è le, yě bù xiǎng zuò fàn. Wǒmen jiào wàimài ba!", "Wang Fang, I'm hungry and I don't feel like cooking. Let's order takeout!"],
            [1, "好。你下载那个外卖软件了吗？", "Hǎo. Nǐ xiàzài nàge wàimài ruǎnjiàn le ma?", "Sure. Did you download that delivery app?"],
            [0, "下载了，可是我不知道密码，登录不了。", "Xiàzài le, kěshì wǒ bù zhīdao mìmǎ, dēnglù bù liǎo.", "I did, but I don't know the password, so I can't log in."],
            [1, "那在我的手机上点吧。你想吃什么？", "Nà zài wǒ de shǒujī shang diǎn ba. Nǐ xiǎng chī shénme?", "Then order on my phone. What do you want?"],
            [0, "我搜索一下饺子……这家的评价很好！", "Wǒ sōusuǒ yíxià jiǎozi… zhè jiā de píngjià hěn hǎo!", "Let me search for dumplings… this place has great reviews!"],
            [1, "好，我来支付。", "Hǎo, wǒ lái zhīfù.", "Okay, I'll pay."],
            [0, "订单好了！半个小时到。", "Dìngdān hǎo le! Bàn ge xiǎoshí dào.", "Order's in! It'll be here in half an hour."]
          ]
        },
        {
          title: "Sending it back",
          zh: "退货",
          setting: "Anna's online order didn't fit, and Lin Mei explains how to return it.",
          cast: [["林美", "Lín Měi"], ["安娜", "Ānnà"]],
          lines: [
            [0, "安娜，你收到你的毛衣了吗？", "Ānnà, nǐ shōudào nǐ de máoyī le ma?", "Anna, did you get your sweater?"],
            [1, "收到了，太大了。我想退货。", "Shōudào le, tài dà le. Wǒ xiǎng tuìhuò.", "I did. It's too big. I want to return it."],
            [0, "那个网站可以免费退货。", "Nàge wǎngzhàn kěyǐ miǎnfèi tuìhuò.", "That website lets you return things for free."],
            [1, "太好了！在网上可以退货吗？", "Tài hǎo le! Zài wǎngshang kěyǐ tuìhuò ma?", "Great! Can I do the return online?"],
            [0, "能。你上网找到你的订单，点“退货”。", "Néng. Nǐ shàngwǎng zhǎodào nǐ de dìngdān, diǎn “tuìhuò”.", "Yes. Go online, find your order and tap 'Return'."],
            [1, "然后呢？", "Ránhòu ne?", "And then?"],
            [0, "然后等快递来你家。", "Ránhòu děng kuàidì lái nǐ jiā.", "Then just wait for the courier to come to your place."],
            [1, "谢谢！在网上买衣服太难了。", "Xièxie! Zài wǎngshang mǎi yīfu tài nán le.", "Thanks! Buying clothes online is so hard."]
          ]
        },
        {
          title: "Free Wi-Fi",
          zh: "能上网吗",
          setting: "David asks about Wi-Fi at a café.",
          cast: [["大卫", "Dàwèi"], ["服务员", "fúwùyuán (server)"]],
          lines: [
            [0, "你好，这儿能上网吗？", "Nǐ hǎo, zhèr néng shàngwǎng ma?", "Hi, can I get online here?"],
            [1, "能，是免费的。", "Néng, shì miǎnfèi de.", "Yes, it's free."],
            [0, "密码是多少？", "Mìmǎ shì duōshao?", "What's the password?"],
            [1, "密码在桌子上，八个八。", "Mìmǎ zài zhuōzi shang, bā ge bā.", "It's on the table. Eight eights."],
            [0, "谢谢。我还要一杯咖啡，可以在手机上支付吗？", "Xièxie. Wǒ hái yào yì bēi kāfēi, kěyǐ zài shǒujī shang zhīfù ma?", "Thanks. I'd also like a coffee. Can I pay on my phone?"],
            [1, "可以。你也可以在网上给我们写个评价！", "Kěyǐ. Nǐ yě kěyǐ zài wǎngshang gěi wǒmen xiě ge píngjià!", "Sure. And you're welcome to leave us a review online!"],
            [0, "好！你们的咖啡很好喝。", "Hǎo! Nǐmen de kāfēi hěn hǎohē.", "Will do! The coffee here is great."]
          ]
        }
      ]
    },

    43: {
      words: [
        ["中文", "Zhōngwén", "Chinese (language)", "noun", "大卫每天学习中文。", "Dàwèi měi tiān xuéxí Zhōngwén.", "David studies Chinese every day."],
        ["汉语", "Hànyǔ", "Mandarin Chinese", "noun", "你的汉语很好！", "Nǐ de Hànyǔ hěn hǎo!", "Your Chinese is really good!"],
        ["汉字", "Hànzì", "Chinese characters", "noun", "汉字很难写。", "Hànzì hěn nán xiě.", "Chinese characters are hard to write."],
        ["词", "cí", "word", "noun", "这个词我不认识。", "Zhège cí wǒ bú rènshi.", "I don't know this word."],
        ["句子", "jùzi", "sentence", "noun", "这个句子太长了。", "Zhège jùzi tài cháng le.", "This sentence is too long."],
        ["意思", "yìsi", "meaning", "noun", "这个词是什么意思？", "Zhège cí shì shénme yìsi?", "What does this word mean?"],
        ["发音", "fāyīn", "pronunciation", "noun", "张老师说我的发音很好。", "Zhāng lǎoshī shuō wǒ de fāyīn hěn hǎo.", "Teacher Zhang says my pronunciation is good."],
        ["声调", "shēngdiào", "tone", "noun", "中文有四个声调。", "Zhōngwén yǒu sì ge shēngdiào.", "Chinese has four tones."],
        ["复习", "fùxí", "to review", "verb", "我每天晚上复习汉字。", "Wǒ měi tiān wǎnshang fùxí Hànzì.", "I review characters every evening."],
        ["考试", "kǎoshì", "exam", "noun", "明天有考试，我很紧张。", "Míngtiān yǒu kǎoshì, wǒ hěn jǐnzhāng.", "I've got an exam tomorrow and I'm nervous."],
        ["记", "jì", "to remember; to note down", "verb", "我记不住这个汉字。", "Wǒ jì bu zhù zhège Hànzì.", "I can't remember this character."],
        ["忘", "wàng", "to forget", "verb", "我忘了他的名字。", "Wǒ wàng le tā de míngzi.", "I forgot his name."],
        ["错", "cuò", "wrong; mistake", "adjective", "对不起，我说错了。", "Duìbuqǐ, wǒ shuō cuò le.", "Sorry, I said it wrong."],
        ["对", "duì", "right; correct", "adjective", "这个句子对吗？", "Zhège jùzi duì ma?", "Is this sentence right?"],
        ["进步", "jìnbù", "progress; to improve", "noun", "你的中文进步很大！", "Nǐ de Zhōngwén jìnbù hěn dà!", "Your Chinese has really improved!"]
      ],
      patterns: [
        ["……是什么意思？", "… shì shénme yìsi?", "What does … mean?", "“团圆”是什么意思？", "“Tuányuán” shì shénme yìsi?", "What does tuányuán mean?"],
        ["（动词）+ 错了", "(verb) + cuò le", "to … wrong (make a mistake doing …)", "我看错了，是十号，不是十一号。", "Wǒ kàn cuò le, shì shí hào, bú shì shíyī hào.", "I misread it. It's the 10th, not the 11th."]
      ],
      scenarios: [
        {
          title: "The night before the exam",
          zh: "复习",
          setting: "David asks his roommate Wang Fang to quiz him before a test.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，明天我有汉语考试，你能帮我复习一下吗？", "Wáng Fāng, míngtiān wǒ yǒu Hànyǔ kǎoshì, nǐ néng bāng wǒ fùxí yíxià ma?", "Wang Fang, I have a Chinese exam tomorrow. Can you help me review?"],
            [1, "可以。这个汉字你认识吗？", "Kěyǐ. Zhège Hànzì nǐ rènshi ma?", "Sure. Do you know this character?"],
            [0, "认识，是“湖”。", "Rènshi, shì “hú”.", "Yes, it's hú, 'lake'."],
            [1, "对！那这个呢？", "Duì! Nà zhège ne?", "Right! What about this one?"],
            [0, "这个……我忘了。", "Zhège… wǒ wàng le.", "This one… I forgot."],
            [1, "是“声调”的第二个汉字。你再记一下吧。", "Shì “shēngdiào” de dì èr ge Hànzì. Nǐ zài jì yíxià ba.", "It's the second character of shēngdiào. Go over it again."],
            [0, "汉字太难记了！", "Hànzì tài nán jì le!", "Characters are so hard to remember!"],
            [1, "别着急，你进步很大！", "Bié zháojí, nǐ jìnbù hěn dà!", "Don't stress, you've improved a lot!"]
          ]
        },
        {
          title: "Buying or selling?",
          zh: "买还是卖",
          setting: "Teacher Zhang corrects David's tones in class.",
          cast: [["张老师", "Zhāng lǎoshī"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，你来说一下这个句子。", "Dàwèi, nǐ lái shuō yíxià zhège jùzi.", "David, can you say this sentence for us?"],
            [1, "“我要卖书。”", "“Wǒ yào mài shū.”", "'I want to sell books.'"],
            [0, "声调错了。句子是“我要买书”，不是“卖书”。", "Shēngdiào cuò le. Jùzi shì “wǒ yào mǎi shū”, bú shì “mài shū”.", "Wrong tone. The sentence is 'I want to buy books' (mǎi), not 'sell books' (mài)."],
            [1, "对不起，我说错了。“买”和“卖”的发音不一样吧？", "Duìbuqǐ, wǒ shuō cuò le. “Mǎi” hé “mài” de fāyīn bù yíyàng ba?", "Sorry, I said it wrong. Mǎi and mài sound different, right?"],
            [0, "对。声调不一样，意思也不一样。", "Duì. Shēngdiào bù yíyàng, yìsi yě bù yíyàng.", "Right. Different tone, different meaning."],
            [1, "中文的声调太难了！", "Zhōngwén de shēngdiào tài nán le!", "Chinese tones are so hard!"],
            [0, "别担心。多听，多说，你的发音会更好。", "Bié dānxīn. Duō tīng, duō shuō, nǐ de fāyīn huì gèng hǎo.", "Don't worry. Listen a lot, speak a lot, and your pronunciation will get better."]
          ]
        },
        {
          title: "What does it mean?",
          zh: "是什么意思",
          setting: "Anna asks Lin Mei about a word she heard.",
          cast: [["安娜", "Ānnà"], ["林美", "Lín Měi"]],
          lines: [
            [0, "林美，“热闹”这个词是什么意思？", "Lín Měi, “rènao” zhège cí shì shénme yìsi?", "Lin Mei, what does the word rènao mean?"],
            [1, "春节的时候，街上人很多，大家都很开心，很热闹。", "Chūnjié de shíhou, jiē shang rén hěn duō, dàjiā dōu hěn kāixīn, hěn rènao.", "At Spring Festival the streets are full of people, everyone's happy. It's rènao: lively."],
            [0, "我懂了！我记下来。", "Wǒ dǒng le! Wǒ jì xiàlai.", "Got it! I'll write that down."],
            [1, "你每天记几个词？", "Nǐ měi tiān jì jǐ ge cí?", "How many words do you learn a day?"],
            [0, "十个。我常常忘，所以每天晚上复习。", "Shí ge. Wǒ chángcháng wàng, suǒyǐ měi tiān wǎnshang fùxí.", "Ten. I forget a lot, so I review every evening."],
            [1, "很好！你的中文进步很大。", "Hěn hǎo! Nǐ de Zhōngwén jìnbù hěn dà.", "Great! Your Chinese has come a long way."],
            [0, "谢谢！我还想学写汉字。", "Xièxie! Wǒ hái xiǎng xué xiě Hànzì.", "Thanks! I'd like to learn to write characters too."]
          ]
        }
      ]
    },

    44: {
      words: [
        ["大学", "dàxué", "university; college", "noun", "我弟弟明年上大学。", "Wǒ dìdi míngnián shàng dàxué.", "My little brother starts university next year."],
        ["律师", "lǜshī", "lawyer", "noun", "她姐姐是律师，工作很忙。", "Tā jiějie shì lǜshī, gōngzuò hěn máng.", "Her older sister is a lawyer and is always busy."],
        ["工程师", "gōngchéngshī", "engineer", "noun", "这个工程师每天加班。", "Zhège gōngchéngshī měi tiān jiā bān.", "This engineer works overtime every day."],
        ["护士", "hùshi", "nurse", "noun", "医院里的护士都很热情。", "Yīyuàn lǐ de hùshi dōu hěn rèqíng.", "The nurses at the hospital are all really warm."],
        ["警察", "jǐngchá", "police officer", "noun", "路口有一个警察。", "Lùkǒu yǒu yí ge jǐngchá.", "There's a police officer at the intersection."],
        ["记者", "jìzhě", "journalist", "noun", "她是记者，常常去国外工作。", "Tā shì jìzhě, chángcháng qù guówài gōngzuò.", "She's a journalist and often works abroad."],
        ["厨师", "chúshī", "chef", "noun", "这家饭馆的厨师很厉害。", "Zhè jiā fànguǎn de chúshī hěn lìhai.", "The chef at this restaurant is amazing."],
        ["经理", "jīnglǐ", "manager", "noun", "经理今天下午要开会。", "Jīnglǐ jīntiān xiàwǔ yào kāi huì.", "The manager has a meeting this afternoon."],
        ["面试", "miànshì", "job interview", "noun", "我明天上午十点有一个面试。", "Wǒ míngtiān shàngwǔ shí diǎn yǒu yí ge miànshì.", "I have a job interview at ten tomorrow morning."],
        ["简历", "jiǎnlì", "résumé", "noun", "你的简历发给我吧。", "Nǐ de jiǎnlì fā gěi wǒ ba.", "Send me your résumé."],
        ["经验", "jīngyàn", "experience", "noun", "你有工作经验吗？", "Nǐ yǒu gōngzuò jīngyàn ma?", "Do you have any work experience?"],
        ["专业", "zhuānyè", "major (field of study)", "noun", "你的专业难不难？", "Nǐ de zhuānyè nán bu nán?", "Is your major hard?"],
        ["毕业", "bìyè", "to graduate", "verb", "我毕业已经三年了。", "Wǒ bìyè yǐjīng sān nián le.", "It's been three years since I graduated."],
        ["工资", "gōngzī", "salary", "noun", "这个工作工资高吗？", "Zhège gōngzuò gōngzī gāo ma?", "Does this job pay well?"],
        ["成为", "chéngwéi", "to become", "verb", "小美想成为医生。", "Xiǎoměi xiǎng chéngwéi yīshēng.", "Xiaomei wants to become a doctor."]
      ],
      patterns: [
        ["你是做什么工作的？", "Nǐ shì zuò shénme gōngzuò de?", "What do you do (for work)?", "你是做什么工作的？——我是工程师。", "Nǐ shì zuò shénme gōngzuò de? — Wǒ shì gōngchéngshī.", "What do you do? — I'm an engineer."],
        ["我想成为……", "Wǒ xiǎng chéngwéi …", "I want to become …", "我想成为一个好律师。", "Wǒ xiǎng chéngwéi yí ge hǎo lǜshī.", "I want to become a good lawyer."]
      ],
      scenarios: [
        {
          title: "What do you do?",
          zh: "你是做什么工作的",
          setting: "Lin Mei chats with Li Ming at a friend's party.",
          cast: [["林美", "Lín Měi"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，你是做什么工作的？", "Lǐ Míng, nǐ shì zuò shénme gōngzuò de?", "Li Ming, what do you do?"],
            [1, "我是工程师。你呢？", "Wǒ shì gōngchéngshī. Nǐ ne?", "I'm an engineer. And you?"],
            [0, "我是记者。你家里人也都是工程师吗？", "Wǒ shì jìzhě. Nǐ jiā lǐ rén yě dōu shì gōngchéngshī ma?", "I'm a journalist. Is everyone in your family an engineer too?"],
            [1, "不是。我们家每个人的工作都不一样。", "Bú shì. Wǒmen jiā měi ge rén de gōngzuò dōu bù yíyàng.", "No. Everyone in my family does something different."],
            [0, "是吗？你爸爸是做什么的？", "Shì ma? Nǐ bàba shì zuò shénme de?", "Really? What does your dad do?"],
            [1, "他是警察。我姐姐是护士，哥哥是律师。", "Tā shì jǐngchá. Wǒ jiějie shì hùshi, gēge shì lǜshī.", "He's a police officer. My older sister's a nurse and my older brother's a lawyer."],
            [1, "我弟弟还在上大学，他想成为厨师。", "Wǒ dìdi hái zài shàng dàxué, tā xiǎng chéngwéi chúshī.", "My little brother's still at university. He wants to be a chef."],
            [0, "你们家的人都好厉害！我想常常去你弟弟那儿吃饭！", "Nǐmen jiā de rén dōu hǎo lìhai! Wǒ xiǎng chángcháng qù nǐ dìdi nàr chī fàn!", "Your family's amazing! I'd love to eat at your brother's place all the time!"]
          ]
        },
        {
          title: "The job interview",
          zh: "面试",
          setting: "Anna has a job interview with a manager at a Chinese company.",
          cast: [["安娜", "Ānnà"], ["经理", "jīnglǐ (manager)"]],
          lines: [
            [0, "经理，你好！我是安娜，我来面试。", "Jīnglǐ, nǐ hǎo! Wǒ shì Ānnà, wǒ lái miànshì.", "Hello! I'm Anna. I'm here for the interview."],
            [1, "你好，请坐。我看了你的简历。你是什么时候毕业的？", "Nǐ hǎo, qǐng zuò. Wǒ kàn le nǐ de jiǎnlì. Nǐ shì shénme shíhou bìyè de?", "Hello, have a seat. I've read your résumé. When did you graduate?"],
            [0, "我大学毕业两年了。我的专业是中文。", "Wǒ dàxué bìyè liǎng nián le. Wǒ de zhuānyè shì Zhōngwén.", "I graduated from university two years ago. I majored in Chinese."],
            [1, "你有工作经验吗？", "Nǐ yǒu gōngzuò jīngyàn ma?", "Do you have any work experience?"],
            [0, "有，我在一家美国公司工作了两年。", "Yǒu, wǒ zài yì jiā Měiguó gōngsī gōngzuò le liǎng nián.", "Yes, I worked at an American company for two years."],
            [1, "很好。这个工作常常要加班，可是工资不错。你下星期能来上班吗？", "Hěn hǎo. Zhège gōngzuò chángcháng yào jiā bān, kěshì gōngzī bú cuò. Nǐ xià xīngqī néng lái shàng bān ma?", "Very good. This job often means overtime, but the pay is good. Can you start next week?"],
            [0, "能！太好了，谢谢！", "Néng! Tài hǎo le, xièxie!", "Yes! That's great, thank you!"]
          ]
        },
        {
          title: "When I grow up",
          zh: "我想成为警察",
          setting: "Wang Fang asks little Xiaomei what she wants to be.",
          cast: [["王芳", "Wáng Fāng"], ["小美", "Xiǎoměi"]],
          lines: [
            [0, "小美，你长大了想做什么工作？", "Xiǎoměi, nǐ zhǎngdà le xiǎng zuò shénme gōngzuò?", "Xiaomei, what job do you want when you grow up?"],
            [1, "我想成为警察！", "Wǒ xiǎng chéngwéi jǐngchá!", "I want to be a police officer!"],
            [0, "为什么？", "Wèishénme?", "Why?"],
            [1, "因为警察很厉害，可以帮很多人。你呢，你喜欢你的工作吗？", "Yīnwèi jǐngchá hěn lìhai, kěyǐ bāng hěn duō rén. Nǐ ne, nǐ xǐhuan nǐ de gōngzuò ma?", "Because police officers are awesome and help lots of people. What about you, do you like your job?"],
            [0, "喜欢。工作很有意思，工资也不错。", "Xǐhuan. Gōngzuò hěn yǒu yìsi, gōngzī yě bú cuò.", "I do. The work is interesting and the pay's not bad."],
            [1, "工资是什么？", "Gōngzī shì shénme?", "What's pay?"],
            [0, "工资是公司每个月给你的钱。", "Gōngzī shì gōngsī měi ge yuè gěi nǐ de qián.", "It's the money your company gives you every month."],
            [1, "那我要很多很多工资，买很多蛋糕！", "Nà wǒ yào hěn duō hěn duō gōngzī, mǎi hěn duō dàngāo!", "Then I want lots and lots of pay, to buy lots of cake!"]
          ]
        }
      ]
    },

    45: {
      words: [
        ["丢", "diū", "to lose (something)", "verb", "我的手机丢了！", "Wǒ de shǒujī diū le!", "I've lost my phone!"],
        ["钱包", "qiánbāo", "wallet", "noun", "你的钱包在桌子上。", "Nǐ de qiánbāo zài zhuōzi shang.", "Your wallet's on the table."],
        ["迷路", "mílù", "to get lost", "verb", "这个城市太大，我常常迷路。", "Zhège chéngshì tài dà, wǒ chángcháng mílù.", "This city's so big, I get lost all the time."],
        ["错过", "cuòguò", "to miss (a bus, a chance)", "verb", "我们走吧，别错过电影。", "Wǒmen zǒu ba, bié cuòguò diànyǐng.", "Let's go, or we'll miss the movie."],
        ["麻烦", "máfan", "trouble; troublesome", "adjective", "这件事很麻烦。", "Zhè jiàn shì hěn máfan.", "This is a real hassle."],
        ["糟糕", "zāogāo", "oh no!; terrible", "adjective", "糟糕，我忘了带钥匙！", "Zāogāo, wǒ wàng le dài yàoshi!", "Oh no, I forgot my keys!"],
        ["摔", "shuāi", "to fall; to drop", "verb", "我的手机摔坏了。", "Wǒ de shǒujī shuāi huài le.", "I dropped my phone and broke it."],
        ["撞", "zhuàng", "to bump into", "verb", "对不起，我撞到你了！", "Duìbuqǐ, wǒ zhuàng dào nǐ le!", "Sorry, I bumped into you!"],
        ["破", "pò", "broken; torn", "adjective", "我的裤子破了。", "Wǒ de kùzi pò le.", "My trousers have torn."],
        ["发现", "fāxiàn", "to discover; to notice", "verb", "我发现我的伞不见了。", "Wǒ fāxiàn wǒ de sǎn bú jiàn le.", "I noticed my umbrella was gone."],
        ["突然", "tūrán", "suddenly", "adverb", "突然下雨了。", "Tūrán xià yǔ le.", "Suddenly it started to rain."],
        ["小心", "xiǎoxīn", "careful; watch out", "adjective", "小心！路上有很多车。", "Xiǎoxīn! Lù shang yǒu hěn duō chē.", "Careful! There are lots of cars on the road."],
        ["办法", "bànfǎ", "way; solution", "noun", "别着急，我有办法。", "Bié zháojí, wǒ yǒu bànfǎ.", "Don't worry, I've got an idea."],
        ["解决", "jiějué", "to solve", "verb", "这个问题我们马上解决。", "Zhège wèntí wǒmen mǎshàng jiějué.", "We'll sort this problem out right away."],
        ["怎么办", "zěnme bàn", "what should I do?", "phrase", "下雨了，我没带伞，怎么办？", "Xià yǔ le, wǒ méi dài sǎn, zěnme bàn?", "It's raining and I didn't bring an umbrella. What do I do?"]
      ],
      patterns: [
        ["……了，怎么办？", "… le, zěnme bàn?", "… has happened — what do I do?", "我的钱包丢了，怎么办？", "Wǒ de qiánbāo diū le, zěnme bàn?", "I've lost my wallet. What do I do?"],
        ["小心，别……", "Xiǎoxīn, bié …", "Careful, don't …", "小心，别撞到头！", "Xiǎoxīn, bié zhuàng dào tóu!", "Careful, don't hit your head!"]
      ],
      scenarios: [
        {
          title: "The lost wallet",
          zh: "钱包丢了",
          setting: "David gets home from shopping and can't find his wallet.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"], ["店员", "diànyuán (shop assistant)"]],
          lines: [
            [0, "糟糕！我的钱包丢了！怎么办？", "Zāogāo! Wǒ de qiánbāo diū le! Zěnme bàn?", "Oh no! I've lost my wallet! What do I do?"],
            [1, "别着急。你今天去哪儿了？", "Bié zháojí. Nǐ jīntiān qù nǎr le?", "Don't panic. Where did you go today?"],
            [0, "我上午去了超市，然后坐公交车回家。", "Wǒ shàngwǔ qù le chāoshì, ránhòu zuò gōngjiāochē huí jiā.", "I went to the supermarket this morning, then took the bus home."],
            [1, "你给超市打个电话吧。", "Nǐ gěi chāoshì dǎ ge diànhuà ba.", "Give the supermarket a call."],
            [0, "喂，你好！我今天上午去你们超市买东西，丢了一个黑的钱包。", "Wéi, nǐ hǎo! Wǒ jīntiān shàngwǔ qù nǐmen chāoshì mǎi dōngxi, diū le yí ge hēi de qiánbāo.", "Hello! I was shopping at your store this morning and lost a black wallet."],
            [2, "我们在水果那儿发现了一个黑的钱包。你叫什么名字？", "Wǒmen zài shuǐguǒ nàr fāxiàn le yí ge hēi de qiánbāo. Nǐ jiào shénme míngzi?", "We found a black wallet over by the fruit. What's your name?"],
            [0, "我叫大卫！太好了，我马上去！", "Wǒ jiào Dàwèi! Tài hǎo le, wǒ mǎshàng qù!", "I'm David! That's great, I'll come right now!"],
            [1, "下次小心一点儿！", "Xià cì xiǎoxīn yìdiǎnr!", "Be more careful next time!"]
          ]
        },
        {
          title: "Lost on the way",
          zh: "我迷路了",
          setting: "Anna is late to meet Lin Mei at the cinema.",
          cast: [["林美", "Lín Měi"], ["安娜", "Ānnà"]],
          lines: [
            [0, "喂，安娜，你在哪儿？电影七点开始！", "Wéi, Ānnà, nǐ zài nǎr? Diànyǐng qī diǎn kāishǐ!", "Hello, Anna, where are you? The movie starts at seven!"],
            [1, "对不起，我迷路了！下了地铁，我突然不知道往哪儿走。", "Duìbuqǐ, wǒ mílù le! Xià le dìtiě, wǒ tūrán bù zhīdào wǎng nǎr zǒu.", "Sorry, I'm lost! When I got off the subway I suddenly had no idea which way to go."],
            [0, "你旁边有什么？", "Nǐ pángbiān yǒu shénme?", "What's near you?"],
            [1, "有一个书店和一个大公园。", "Yǒu yí ge shūdiàn hé yí ge dà gōngyuán.", "There's a bookshop and a big park."],
            [0, "我知道了！在路口往右边拐，然后一直走，十分钟能到。", "Wǒ zhīdào le! Zài lùkǒu wǎng yòubian guǎi, ránhòu yìzhí zǒu, shí fēnzhōng néng dào.", "I know where you are! Turn right at the intersection, then go straight. You'll be here in ten minutes."],
            [1, "好。现在已经七点十分了，我们错过电影了！", "Hǎo. Xiànzài yǐjīng qī diǎn shí fēn le, wǒmen cuòguò diànyǐng le!", "Okay. It's already 7:10 though, we've missed the movie!"],
            [0, "没关系，我有办法。我们看九点的那场吧。", "Méi guānxi, wǒ yǒu bànfǎ. Wǒmen kàn jiǔ diǎn de nà chǎng ba.", "Don't worry, I've got a plan. Let's see the nine o'clock showing."],
            [1, "好办法！谢谢你，林美。", "Hǎo bànfǎ! Xièxie nǐ, Lín Měi.", "Good idea! Thanks, Lin Mei."]
          ]
        },
        {
          title: "A tumble",
          zh: "我摔了",
          setting: "Xiaomei comes running to Wang Fang after a fall in the stairwell.",
          cast: [["小美", "Xiǎoměi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳！我摔了！", "Wáng Fāng! Wǒ shuāi le!", "Wang Fang! I fell over!"],
            [1, "小美！哪儿疼？", "Xiǎoměi! Nǎr téng?", "Xiaomei! Where does it hurt?"],
            [0, "腿有一点儿疼。我的裤子也破了！", "Tuǐ yǒu yìdiǎnr téng. Wǒ de kùzi yě pò le!", "My leg hurts a little. And my trousers are torn!"],
            [1, "你是不是在楼里跑了？", "Nǐ shì bu shì zài lóu lǐ pǎo le?", "Were you running in the building?"],
            [0, "对……我撞到了门，然后摔了。", "Duì… wǒ zhuàng dào le mén, ránhòu shuāi le.", "Yes… I ran into the door and then fell."],
            [1, "小心！别在楼里跑。", "Xiǎoxīn! Bié zài lóu lǐ pǎo.", "Be careful! No running in the building."],
            [0, "妈妈看见裤子会生气的！怎么办？", "Māma kànjiàn kùzi huì shēngqì de! Zěnme bàn?", "Mom will be angry when she sees my trousers! What do I do?"],
            [1, "别担心，这件事不麻烦，我帮你解决。", "Bié dānxīn, zhè jiàn shì bù máfan, wǒ bāng nǐ jiějué.", "Don't worry, it's no big deal. I'll help you sort it out."]
          ]
        }
      ]
    },

    46: {
      words: [
        ["帮忙", "bāngmáng", "to help (out)", "verb", "我明天搬家，你能来帮忙吗？", "Wǒ míngtiān bān jiā, nǐ néng lái bāngmáng ma?", "I'm moving tomorrow. Can you come and help?"],
        ["帮助", "bāngzhù", "help; to help", "noun", "这本书对我的帮助很大。", "Zhè běn shū duì wǒ de bāngzhù hěn dà.", "This book has helped me a lot."],
        ["请问", "qǐngwèn", "excuse me, may I ask …", "phrase", "请问，洗手间在哪儿？", "Qǐngwèn, xǐshǒujiān zài nǎr?", "Excuse me, where's the restroom?"],
        ["不好意思", "bù hǎo yìsi", "excuse me; sorry (to bother you)", "phrase", "不好意思，我迟到了。", "Bù hǎo yìsi, wǒ chídào le.", "Sorry I'm late."],
        ["需要", "xūyào", "to need", "verb", "我需要一点儿时间。", "Wǒ xūyào yìdiǎnr shíjiān.", "I need a little time."],
        ["借", "jiè", "to borrow; to lend", "verb", "我可以借一下你的伞吗？", "Wǒ kěyǐ jiè yíxià nǐ de sǎn ma?", "Could I borrow your umbrella?"],
        ["问", "wèn", "to ask", "verb", "我想问你一个问题。", "Wǒ xiǎng wèn nǐ yí ge wèntí.", "I'd like to ask you a question."],
        ["急", "jí", "urgent", "adjective", "别急，慢慢来。", "Bié jí, mànmàn lái.", "No rush, take your time."],
        ["危险", "wēixiǎn", "dangerous", "adjective", "晚上一个人去那儿很危险。", "Wǎnshang yí ge rén qù nàr hěn wēixiǎn.", "It's dangerous to go there alone at night."],
        ["安全", "ānquán", "safe", "adjective", "这儿很安全，别担心。", "Zhèr hěn ānquán, bié dānxīn.", "It's safe here, don't worry."],
        ["受伤", "shòushāng", "to get hurt", "verb", "他打篮球的时候受伤了。", "Tā dǎ lánqiú de shíhou shòushāng le.", "He got hurt playing basketball."],
        ["救命", "jiùmìng", "help! (emergency)", "phrase", "救命！有人吗？", "Jiùmìng! Yǒu rén ma?", "Help! Is anyone there?"],
        ["报警", "bàojǐng", "to call the police", "verb", "钱包丢了，我们去报警吧。", "Qiánbāo diū le, wǒmen qù bàojǐng ba.", "The wallet's gone. Let's report it to the police."],
        ["救护车", "jiùhùchē", "ambulance", "noun", "快叫救护车！", "Kuài jiào jiùhùchē!", "Call an ambulance, quick!"],
        ["感谢", "gǎnxiè", "to thank", "verb", "我们都很感谢你。", "Wǒmen dōu hěn gǎnxiè nǐ.", "We're all really grateful to you."]
      ],
      patterns: [
        ["请问，……？", "Qǐngwèn, …?", "Excuse me, may I ask …?", "请问，地铁站在哪儿？", "Qǐngwèn, dìtiě zhàn zài nǎr?", "Excuse me, where's the subway station?"],
        ["你能帮我……吗？", "Nǐ néng bāng wǒ … ma?", "Could you help me …?", "你能帮我找一下钥匙吗？", "Nǐ néng bāng wǒ zhǎo yíxià yàoshi ma?", "Could you help me look for my keys?"]
      ],
      scenarios: [
        {
          title: "Asking a police officer",
          zh: "请问",
          setting: "David stops a police officer on a street he doesn't know.",
          cast: [["大卫", "Dàwèi"], ["警察", "jǐngchá (police officer)"]],
          lines: [
            [0, "不好意思，请问，附近有银行吗？", "Bù hǎo yìsi, qǐngwèn, fùjìn yǒu yínháng ma?", "Excuse me, is there a bank near here?"],
            [1, "有。一直走，在第二个路口往左边拐。", "Yǒu. Yìzhí zǒu, zài dì èr ge lùkǒu wǎng zuǒbian guǎi.", "Yes. Go straight and turn left at the second intersection."],
            [0, "谢谢！我还想问一下，这儿晚上安全吗？", "Xièxie! Wǒ hái xiǎng wèn yíxià, zhèr wǎnshang ānquán ma?", "Thanks! Can I also ask, is it safe around here at night?"],
            [1, "很安全。别走那条小路，晚上有一点儿危险。", "Hěn ānquán. Bié zǒu nà tiáo xiǎolù, wǎnshang yǒu yìdiǎnr wēixiǎn.", "It's very safe. Just avoid that little lane — it's a bit dangerous at night."],
            [0, "好，我知道了。感谢你的帮助！", "Hǎo, wǒ zhīdào le. Gǎnxiè nǐ de bāngzhù!", "Okay, got it. Thank you for your help!"],
            [1, "不客气。要是需要帮忙，再来找我。", "Bú kèqi. Yàoshi xūyào bāngmáng, zài lái zhǎo wǒ.", "You're welcome. If you need help, come find me again."]
          ]
        },
        {
          title: "Call an ambulance!",
          zh: "快叫救护车",
          setting: "Lin Mei hears someone shouting on a quiet park path.",
          cast: [["李明", "Lǐ Míng"], ["林美", "Lín Měi"], ["护士", "hùshi (nurse)"]],
          lines: [
            [0, "救命！有人吗？", "Jiùmìng! Yǒu rén ma?", "Help! Is anyone there?"],
            [1, "李明！你受伤了吗？", "Lǐ Míng! Nǐ shòushāng le ma?", "Li Ming! Are you hurt?"],
            [0, "我在这儿摔了，腿很疼，不能走。", "Wǒ zài zhèr shuāi le, tuǐ hěn téng, bù néng zǒu.", "I fell here. My leg really hurts, I can't walk."],
            [1, "别急，我马上叫救护车！", "Bié jí, wǒ mǎshàng jiào jiùhùchē!", "Hang on, I'll call an ambulance right now!"],
            [2, "你好，我是护士。哪儿疼？", "Nǐ hǎo, wǒ shì hùshi. Nǎr téng?", "Hello, I'm a nurse. Where does it hurt?"],
            [0, "腿很疼，头也有一点儿疼。", "Tuǐ hěn téng, tóu yě yǒu yìdiǎnr téng.", "My leg really hurts, and my head a little too."],
            [2, "我们需要去医院检查一下。别担心。", "Wǒmen xūyào qù yīyuàn jiǎnchá yíxià. Bié dānxīn.", "We need to get it checked at the hospital. Don't worry."],
            [1, "李明，我和你一起去。", "Lǐ Míng, wǒ hé nǐ yìqǐ qù.", "Li Ming, I'll come with you."]
          ]
        },
        {
          title: "Someone on the balcony",
          zh: "我要报警",
          setting: "Late at night, Wang Fang hears a noise out on the apartment balcony.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"], ["警察", "jǐngchá (police officer)"]],
          lines: [
            [0, "大卫，你听！阳台上有人！", "Dàwèi, nǐ tīng! Yángtái shang yǒu rén!", "David, listen! There's someone on the balcony!"],
            [1, "晚上十二点？太危险了，我们报警吧！", "Wǎnshang shí'èr diǎn? Tài wēixiǎn le, wǒmen bàojǐng ba!", "At midnight? That's dangerous — let's call the police!"],
            [0, "我的手机没电了！我能借一下你的手机吗？", "Wǒ de shǒujī méi diàn le! Wǒ néng jiè yíxià nǐ de shǒujī ma?", "My phone's dead! Can I borrow yours?"],
            [1, "给你，快！", "Gěi nǐ, kuài!", "Here, quick!"],
            [0, "喂，你好！我要报警，我家阳台上有一个人！", "Wéi, nǐ hǎo! Wǒ yào bàojǐng, wǒ jiā yángtái shang yǒu yí ge rén!", "Hello! I need the police — there's someone on my balcony!"],
            [1, "等一下……王芳，那是一只猫！", "Děng yíxià… Wáng Fāng, nà shì yì zhī māo!", "Wait… Wang Fang, it's a cat!"],
            [0, "一只猫？对不起，不好意思！", "Yì zhī māo? Duìbuqǐ, bù hǎo yìsi!", "A cat? Sorry, how embarrassing!"],
            [2, "没关系！晚上小心一点儿是对的。", "Méi guānxi! Wǎnshang xiǎoxīn yìdiǎnr shì duì de.", "No problem! It's right to be careful at night."]
          ]
        }
      ]
    },

    47: {
      words: [
        ["旅行", "lǚxíng", "trip; to travel", "noun", "这个周末我们去旅行吧！", "Zhège zhōumò wǒmen qù lǚxíng ba!", "Let's go on a trip this weekend!"],
        ["计划", "jìhuà", "plan", "noun", "你周末有什么计划？", "Nǐ zhōumò yǒu shénme jìhuà?", "What are your plans for the weekend?"],
        ["风景", "fēngjǐng", "scenery", "noun", "山上的风景很美。", "Shān shang de fēngjǐng hěn měi.", "The view from the mountain is beautiful."],
        ["景点", "jǐngdiǎn", "sight; tourist attraction", "noun", "这个城市有很多有名的景点。", "Zhège chéngshì yǒu hěn duō yǒumíng de jǐngdiǎn.", "This city has lots of famous sights."],
        ["门票", "ménpiào", "entry ticket", "noun", "一个人的门票多少钱？", "Yí ge rén de ménpiào duōshao qián?", "How much is a ticket per person?"],
        ["导游", "dǎoyóu", "tour guide", "noun", "我们的导游很热情。", "Wǒmen de dǎoyóu hěn rèqíng.", "Our tour guide is really friendly."],
        ["游客", "yóukè", "tourist", "noun", "这儿游客太多了！", "Zhèr yóukè tài duō le!", "There are way too many tourists here!"],
        ["地图", "dìtú", "map", "noun", "我手机上有地图。", "Wǒ shǒujī shang yǒu dìtú.", "I've got a map on my phone."],
        ["火车", "huǒchē", "train", "noun", "坐火车去要五个小时。", "Zuò huǒchē qù yào wǔ ge xiǎoshí.", "It takes five hours by train."],
        ["高铁", "gāotiě", "high-speed train", "noun", "坐高铁比坐火车快多了。", "Zuò gāotiě bǐ zuò huǒchē kuài duō le.", "The high-speed train is much faster than a regular train."],
        ["背包", "bēibāo", "backpack", "noun", "我的背包里有水和水果。", "Wǒ de bēibāo lǐ yǒu shuǐ hé shuǐguǒ.", "I've got water and fruit in my backpack."],
        ["当地", "dāngdì", "local", "noun", "我想吃当地的菜。", "Wǒ xiǎng chī dāngdì de cài.", "I want to try the local food."],
        ["特别", "tèbié", "especially; special", "adverb", "这儿的秋天特别漂亮。", "Zhèr de qiūtiān tèbié piàoliang.", "Autumn here is especially beautiful."],
        ["值得", "zhíde", "to be worth it", "verb", "这个地方很值得去。", "Zhège dìfang hěn zhíde qù.", "This place is well worth a visit."],
        ["古老", "gǔlǎo", "ancient", "adjective", "这条街很古老，有很多老房子。", "Zhè tiáo jiē hěn gǔlǎo, yǒu hěn duō lǎo fángzi.", "This street is very old, with lots of old houses."]
      ],
      patterns: [
        ["……很值得……", "… hěn zhíde …", "… is well worth (doing)", "那个景点很值得看。", "Nà ge jǐngdiǎn hěn zhíde kàn.", "That sight is well worth seeing."],
        ["坐……去", "zuò … qù", "go by … (train, bus, plane)", "我们坐高铁去吧，比火车快。", "Wǒmen zuò gāotiě qù ba, bǐ huǒchē kuài.", "Let's take the high-speed train — it's faster than the regular one."]
      ],
      scenarios: [
        {
          title: "Weekend plans",
          zh: "周末计划",
          setting: "David has an idea for the weekend and tells Wang Fang.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，这个周末你有什么计划？", "Wáng Fāng, zhège zhōumò nǐ yǒu shénme jìhuà?", "Wang Fang, what are your plans this weekend?"],
            [1, "我还没有计划。你呢？", "Wǒ hái méiyǒu jìhuà. Nǐ ne?", "I don't have any yet. You?"],
            [0, "我想去旅行！林美说山里有一个古老的城市，风景特别美。", "Wǒ xiǎng qù lǚxíng! Lín Měi shuō shān lǐ yǒu yí ge gǔlǎo de chéngshì, fēngjǐng tèbié měi.", "I want to take a trip! Lin Mei says there's an ancient town in the mountains with amazing scenery."],
            [1, "我知道那个地方，很值得去！我们坐火车去还是坐高铁去？", "Wǒ zhīdào nà ge dìfang, hěn zhíde qù! Wǒmen zuò huǒchē qù háishi zuò gāotiě qù?", "I know that place, it's well worth going! Should we take the regular train or the high-speed one?"],
            [0, "坐高铁吧，比火车快多了。", "Zuò gāotiě ba, bǐ huǒchē kuài duō le.", "The high-speed train — it's way faster."],
            [1, "好！我在网上买票，你准备一下背包吧。", "Hǎo! Wǒ zài wǎng shang mǎi piào, nǐ zhǔnbèi yíxià bēibāo ba.", "Great! I'll buy the tickets online, you get the backpacks ready."],
            [0, "好，我们星期六早上出发！", "Hǎo, wǒmen xīngqīliù zǎoshang chūfā!", "Okay, we leave Saturday morning!"]
          ]
        },
        {
          title: "At the ticket office",
          zh: "买门票",
          setting: "Wang Fang and David reach the old town and buy tickets from a guide.",
          cast: [["王芳", "Wáng Fāng"], ["导游", "dǎoyóu (tour guide)"]],
          lines: [
            [0, "你好，门票多少钱？", "Nǐ hǎo, ménpiào duōshao qián?", "Hi, how much are tickets?"],
            [1, "一个人八十块。", "Yí ge rén bāshí kuài.", "Eighty yuan per person."],
            [0, "我们两个人。", "Wǒmen liǎng ge rén.", "There are two of us."],
            [1, "好的。你们要导游吗？我是当地人，知道很多这儿的故事。", "Hǎo de. Nǐmen yào dǎoyóu ma? Wǒ shì dāngdì rén, zhīdào hěn duō zhèr de gùshi.", "Okay. Do you want a guide? I'm a local and know lots of stories about this place."],
            [0, "好！这儿最有名的景点是什么？", "Hǎo! Zhèr zuì yǒumíng de jǐngdiǎn shì shénme?", "Sure! What's the most famous sight here?"],
            [1, "山上的老房子，很古老。从那儿看，风景也很美。", "Shān shang de lǎo fángzi, hěn gǔlǎo. Cóng nàr kàn, fēngjǐng yě hěn měi.", "The old houses up on the hill — they're ancient. And the view from up there is lovely."],
            [0, "今天游客多吗？", "Jīntiān yóukè duō ma?", "Are there many tourists today?"],
            [1, "周末游客很多，我们早一点儿去吧。", "Zhōumò yóukè hěn duō, wǒmen zǎo yìdiǎnr qù ba.", "Weekends are busy, so let's head up early."]
          ]
        },
        {
          title: "Tired and hungry",
          zh: "当地的菜",
          setting: "After a long day of sightseeing, David can't make sense of the map.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，我们在哪儿？我看不懂这个地图。", "Wáng Fāng, wǒmen zài nǎr? Wǒ kàn bu dǒng zhège dìtú.", "Wang Fang, where are we? I can't read this map."],
            [1, "给我看一下。我们在这儿，老街的左边。", "Gěi wǒ kàn yíxià. Wǒmen zài zhèr, lǎo jiē de zuǒbian.", "Let me see. We're here, just left of the old street."],
            [0, "我饿了，也累了。", "Wǒ è le, yě lèi le.", "I'm hungry, and tired too."],
            [1, "那我们去吃一点儿当地的菜吧。", "Nà wǒmen qù chī yìdiǎnr dāngdì de cài ba.", "Then let's go get some local food."],
            [0, "好！这次旅行特别有意思，很值得。", "Hǎo! Zhè cì lǚxíng tèbié yǒu yìsi, hěn zhíde.", "Great! This trip has been so much fun — totally worth it."],
            [1, "对！下次我们再来。", "Duì! Xià cì wǒmen zài lái.", "Yes! Let's come back again sometime."]
          ]
        }
      ]
    },

    48: {
      words: [
        ["中国菜", "Zhōngguó cài", "Chinese food", "noun", "在美国也能吃到中国菜。", "Zài Měiguó yě néng chī dào Zhōngguó cài.", "You can get Chinese food in America too."],
        ["北京烤鸭", "Běijīng kǎoyā", "Peking duck", "noun", "我们晚上去吃北京烤鸭吧！", "Wǒmen wǎnshang qù chī Běijīng kǎoyā ba!", "Let's go for Peking duck tonight!"],
        ["火锅", "huǒguō", "hot pot", "noun", "冬天吃火锅最舒服。", "Dōngtiān chī huǒguō zuì shūfu.", "Nothing beats hot pot in winter."],
        ["豆腐", "dòufu", "tofu", "noun", "安娜不吃肉，她常常吃豆腐。", "Ānnà bù chī ròu, tā chángcháng chī dòufu.", "Anna doesn't eat meat, so she often has tofu."],
        ["小吃", "xiǎochī", "snack; street food", "noun", "这条街上有很多小吃。", "Zhè tiáo jiē shang yǒu hěn duō xiǎochī.", "This street is full of street food."],
        ["酱油", "jiàngyóu", "soy sauce", "noun", "再放一点儿酱油。", "Zài fàng yìdiǎnr jiàngyóu.", "Add a little more soy sauce."],
        ["醋", "cù", "vinegar", "noun", "饺子要醋吗？", "Jiǎozi yào cù ma?", "Want vinegar with your dumplings?"],
        ["口味", "kǒuwèi", "taste (what you like to eat)", "noun", "每个人的口味都不一样。", "Měi ge rén de kǒuwèi dōu bù yíyàng.", "Everyone's taste is different."],
        ["南方", "nánfāng", "the south", "noun", "南方夏天很热，常常下雨。", "Nánfāng xiàtiān hěn rè, chángcháng xià yǔ.", "Summers in the south are hot and rainy."],
        ["北方", "běifāng", "the north", "noun", "北方的冬天常常下雪。", "Běifāng de dōngtiān chángcháng xià xuě.", "It often snows in the north in winter."],
        ["地道", "dìdao", "authentic", "adjective", "这家饭馆的菜很地道。", "Zhè jiā fànguǎn de cài hěn dìdao.", "The food at this restaurant is really authentic."],
        ["清淡", "qīngdàn", "light (not oily or salty)", "adjective", "我生病了，想吃一点儿清淡的。", "Wǒ shēngbìng le, xiǎng chī yìdiǎnr qīngdàn de.", "I'm sick, so I want something light."],
        ["油腻", "yóunì", "greasy", "adjective", "这个菜太油腻了。", "Zhège cài tài yóunì le.", "This dish is too greasy."],
        ["尤其", "yóuqí", "especially", "adverb", "我喜欢吃面条，尤其是牛肉面条。", "Wǒ xǐhuan chī miàntiáo, yóuqí shì niúròu miàntiáo.", "I love noodles, especially beef noodles."],
        ["种", "zhǒng", "kind; type", "measure", "这种茶很好喝。", "Zhè zhǒng chá hěn hǎo hē.", "This kind of tea is really nice."]
      ],
      patterns: [
        ["我喜欢……，尤其是……", "Wǒ xǐhuan …, yóuqí shì …", "I like …, especially …", "我喜欢吃辣的，尤其是火锅。", "Wǒ xǐhuan chī là de, yóuqí shì huǒguō.", "I love spicy food, especially hot pot."],
        ["……有很多种……", "… yǒu hěn duō zhǒng …", "There are many kinds of …", "中国菜有很多种口味。", "Zhōngguó cài yǒu hěn duō zhǒng kǒuwèi.", "Chinese food comes in lots of different flavors."]
      ],
      scenarios: [
        {
          title: "Hot pot night",
          zh: "吃火锅",
          setting: "Wang Fang takes Anna, who is vegetarian, out for hot pot.",
          cast: [["服务员", "fúwùyuán (server)"], ["王芳", "Wáng Fāng"], ["安娜", "Ānnà"]],
          lines: [
            [0, "你好！几位？", "Nǐ hǎo! Jǐ wèi?", "Hello! How many?"],
            [1, "两位。我们想吃火锅。", "Liǎng wèi. Wǒmen xiǎng chī huǒguō.", "Two. We'd like hot pot."],
            [0, "你们要辣的还是清淡的？", "Nǐmen yào là de háishi qīngdàn de?", "Would you like spicy or mild?"],
            [2, "我不吃肉，也不太能吃辣。我们要一个清淡的吧。", "Wǒ bù chī ròu, yě bú tài néng chī là. Wǒmen yào yí ge qīngdàn de ba.", "I don't eat meat, and I can't really handle spice. Let's get a mild one."],
            [1, "好，要清淡的。再来一点儿豆腐和菜。", "Hǎo, yào qīngdàn de. Zài lái yìdiǎnr dòufu hé cài.", "Okay, mild please. And some tofu and vegetables too."],
            [2, "火锅里的豆腐最好吃了！", "Huǒguō lǐ de dòufu zuì hǎochī le!", "Tofu in hot pot is the best!"],
            [0, "要不要酱油和醋？", "Yào bu yào jiàngyóu hé cù?", "Would you like soy sauce and vinegar?"],
            [1, "要，谢谢！", "Yào, xièxie!", "Yes, please!"]
          ]
        },
        {
          title: "North and south",
          zh: "南方和北方",
          setting: "David asks Li Ming how food differs across China.",
          cast: [["大卫", "Dàwèi"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，中国南方和北方的菜一样吗？", "Lǐ Míng, Zhōngguó nánfāng hé běifāng de cài yíyàng ma?", "Li Ming, is food in southern and northern China the same?"],
            [1, "不一样！北方人喜欢吃面条和饺子，南方人喜欢吃米饭。", "Bù yíyàng! Běifāng rén xǐhuan chī miàntiáo hé jiǎozi, nánfāng rén xǐhuan chī mǐfàn.", "Not at all! Northerners love noodles and dumplings, southerners love rice."],
            [0, "口味呢？", "Kǒuwèi ne?", "What about flavors?"],
            [1, "南方的菜有一点儿甜，北方的菜咸一点儿。", "Nánfāng de cài yǒu yìdiǎnr tián, běifāng de cài xián yìdiǎnr.", "Southern food is a bit sweet, northern food a bit saltier."],
            [0, "你是北方人吧？", "Nǐ shì běifāng rén ba?", "You're a northerner, right?"],
            [1, "对！我最喜欢北京烤鸭。周末我带你去吃，那家饭馆特别地道。", "Duì! Wǒ zuì xǐhuan Běijīng kǎoyā. Zhōumò wǒ dài nǐ qù chī, nà jiā fànguǎn tèbié dìdao.", "Yes! Peking duck is my favorite. I'll take you this weekend — that restaurant is really authentic."],
            [0, "太好了！北京烤鸭油腻吗？", "Tài hǎo le! Běijīng kǎoyā yóunì ma?", "Great! Is Peking duck greasy?"],
            [1, "有一点儿，所以我们再点一个清淡的菜。", "Yǒu yìdiǎnr, suǒyǐ wǒmen zài diǎn yí ge qīngdàn de cài.", "A little, so we'll order a light dish too."]
          ]
        },
        {
          title: "Street food",
          zh: "小吃",
          setting: "Lin Mei shows Anna around a busy food street at night.",
          cast: [["林美", "Lín Měi"], ["安娜", "Ānnà"]],
          lines: [
            [0, "安娜，这条街上都是小吃！", "Ānnà, zhè tiáo jiē shang dōu shì xiǎochī!", "Anna, this whole street is street food!"],
            [1, "有很多种！哪种没有肉？", "Yǒu hěn duō zhǒng! Nǎ zhǒng méiyǒu ròu?", "There are so many kinds! Which ones have no meat?"],
            [0, "这种没有肉，是豆腐做的。你尝一下。", "Zhè zhǒng méiyǒu ròu, shì dòufu zuò de. Nǐ cháng yíxià.", "This one has no meat — it's made of tofu. Try some."],
            [1, "很好吃！有一点儿酸。", "Hěn hǎochī! Yǒu yìdiǎnr suān.", "Delicious! It's a little sour."],
            [0, "因为放了醋。你喜欢中国菜吗？", "Yīnwèi fàng le cù. Nǐ xǐhuan Zhōngguó cài ma?", "That's the vinegar. Do you like Chinese food?"],
            [1, "很喜欢，尤其是小吃！", "Hěn xǐhuan, yóuqí shì xiǎochī!", "I love it, especially street food!"],
            [0, "那我们每种都尝一下吧！", "Nà wǒmen měi zhǒng dōu cháng yíxià ba!", "Then let's try a bit of every kind!"]
          ]
        }
      ]
    },

    49: {
      words: [
        ["认为", "rènwéi", "to think; to believe", "verb", "我认为学习中文很有意思。", "Wǒ rènwéi xuéxí Zhōngwén hěn yǒu yìsi.", "I think learning Chinese is really interesting."],
        ["同意", "tóngyì", "to agree", "verb", "王芳同意了，你呢？", "Wáng Fāng tóngyì le, nǐ ne?", "Wang Fang agreed. What about you?"],
        ["意见", "yìjiàn", "opinion", "noun", "你有什么意见？", "Nǐ yǒu shénme yìjiàn?", "What's your opinion?"],
        ["想法", "xiǎngfǎ", "idea", "noun", "这个想法很好！", "Zhège xiǎngfǎ hěn hǎo!", "That's a great idea!"],
        ["建议", "jiànyì", "to suggest; suggestion", "verb", "我建议你先休息一下。", "Wǒ jiànyì nǐ xiān xiūxi yíxià.", "I suggest you rest for a bit first."],
        ["当然", "dāngrán", "of course", "adverb", "当然可以！", "Dāngrán kěyǐ!", "Of course you can!"],
        ["可能", "kěnéng", "maybe; possible", "adverb", "明天可能会下雨。", "Míngtiān kěnéng huì xià yǔ.", "It might rain tomorrow."],
        ["真的", "zhēnde", "really", "adverb", "这个火锅真的很好吃。", "Zhège huǒguō zhēnde hěn hǎochī.", "This hotpot is really good."],
        ["其实", "qíshí", "actually", "adverb", "其实我不喜欢喝咖啡。", "Qíshí wǒ bù xǐhuan hē kāfēi.", "Actually, I don't like coffee."],
        ["但是", "dànshì", "but", "conjunction", "这件衣服很漂亮，但是太贵了。", "Zhè jiàn yīfu hěn piàoliang, dànshì tài guì le.", "This top is lovely, but it's too expensive."],
        ["如果", "rúguǒ", "if", "conjunction", "如果明天下雨，我们就不去了。", "Rúguǒ míngtiān xià yǔ, wǒmen jiù bú qù le.", "If it rains tomorrow, we won't go."],
        ["就", "jiù", "then; just", "adverb", "等一下，我马上就来！", "Děng yíxià, wǒ mǎshàng jiù lái!", "Hang on, I'll be right there!"],
        ["比较", "bǐjiào", "fairly; rather", "adverb", "我觉得这家饭馆比较便宜。", "Wǒ juéde zhè jiā fànguǎn bǐjiào piányi.", "I think this restaurant is fairly cheap."],
        ["重要", "zhòngyào", "important", "adjective", "身体最重要。", "Shēntǐ zuì zhòngyào.", "Your health comes first."],
        ["好处", "hǎochu", "benefit; advantage", "noun", "运动有很多好处。", "Yùndòng yǒu hěn duō hǎochu.", "Exercise has lots of benefits."]
      ],
      patterns: [
        ["我认为……，你觉得呢？", "Wǒ rènwéi …, nǐ juéde ne?", "I think …, what do you think?", "我认为坐地铁比较方便，你觉得呢？", "Wǒ rènwéi zuò dìtiě bǐjiào fāngbiàn, nǐ juéde ne?", "I think the subway is more convenient. What do you think?"],
        ["如果……，就……", "Rúguǒ …, jiù …", "If …, then …", "如果你有空，我们就一起去吧。", "Rúguǒ nǐ yǒu kòng, wǒmen jiù yìqǐ qù ba.", "If you're free, let's go together."]
      ],
      scenarios: [
        {
          title: "Where should we eat?",
          zh: "去哪儿吃饭？",
          setting: "Wang Fang, David and Anna try to agree on dinner.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"], ["安娜", "Ānnà"]],
          lines: [
            [0, "今天晚上我们去哪儿吃饭？你们有什么想法？", "Jīntiān wǎnshang wǒmen qù nǎr chī fàn? Nǐmen yǒu shénme xiǎngfǎ?", "Where shall we eat tonight? Any ideas?"],
            [1, "我建议去吃火锅。", "Wǒ jiànyì qù chī huǒguō.", "I vote for hotpot."],
            [2, "火锅？但是我不吃肉。", "Huǒguō? Dànshì wǒ bù chī ròu.", "Hotpot? But I don't eat meat."],
            [1, "没关系，火锅里也有很多菜和豆腐。", "Méi guānxi, huǒguō lǐ yě yǒu hěn duō cài hé dòufu.", "That's fine, hotpot has lots of vegetables and tofu too."],
            [2, "真的吗？那我同意！", "Zhēnde ma? Nà wǒ tóngyì!", "Really? Then I'm in!"],
            [0, "我认为那家火锅比较辣，你们可以吗？", "Wǒ rènwéi nà jiā huǒguō bǐjiào là, nǐmen kěyǐ ma?", "I think that hotpot place is pretty spicy. Are you two okay with that?"],
            [1, "当然可以！我最喜欢辣的。", "Dāngrán kěyǐ! Wǒ zuì xǐhuan là de.", "Of course! I love spicy food."],
            [2, "如果太辣，我就多喝水！", "Rúguǒ tài là, wǒ jiù duō hē shuǐ!", "If it's too spicy, I'll just drink lots of water!"]
          ]
        },
        {
          title: "A plan at work",
          zh: "你有什么意见？",
          setting: "Li Ming's manager asks for his opinion on a new plan.",
          cast: [["经理", "jīnglǐ (manager)"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，这个计划，你有什么意见？", "Lǐ Míng, zhège jìhuà, nǐ yǒu shénme yìjiàn?", "Li Ming, what's your opinion on this plan?"],
            [1, "我认为计划很好，但是时间比较紧张。", "Wǒ rènwéi jìhuà hěn hǎo, dànshì shíjiān bǐjiào jǐnzhāng.", "I think the plan is good, but the timing is rather tight."],
            [0, "那你有什么建议？", "Nà nǐ yǒu shénme jiànyì?", "So what do you suggest?"],
            [1, "如果我们下个月开始，就不需要加班了。", "Rúguǒ wǒmen xià ge yuè kāishǐ, jiù bù xūyào jiābān le.", "If we start next month, we won't need to work overtime."],
            [0, "其实我也有这个想法。", "Qíshí wǒ yě yǒu zhège xiǎngfǎ.", "Actually, I had the same idea."],
            [0, "好，那就下个月开始吧！", "Hǎo, nà jiù xià ge yuè kāishǐ ba!", "Okay, then we'll start next month!"],
            [1, "太好了，谢谢经理！", "Tài hǎo le, xièxie jīnglǐ!", "Great, thank you!"]
          ]
        },
        {
          title: "Too early!",
          zh: "早上运动",
          setting: "Li Ming, an early riser, tries to get David running at dawn.",
          cast: [["李明", "Lǐ Míng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，明天早上六点和我一起去跑吧！", "Dàwèi, míngtiān zǎoshang liù diǎn hé wǒ yìqǐ qù pǎo ba!", "David, come running with me tomorrow at six!"],
            [1, "六点？真的吗？太早了！", "Liù diǎn? Zhēnde ma? Tài zǎo le!", "Six? Seriously? That's way too early!"],
            [0, "早上运动有很多好处。身体好，心情也好。", "Zǎoshang yùndòng yǒu hěn duō hǎochu. Shēntǐ hǎo, xīnqíng yě hǎo.", "Morning exercise has lots of benefits. It's good for your body and your mood."],
            [1, "我同意，但是睡觉也很重要！", "Wǒ tóngyì, dànshì shuìjiào yě hěn zhòngyào!", "I agree, but sleep is important too!"],
            [0, "如果你晚上早一点儿睡觉，早上就不累了。", "Rúguǒ nǐ wǎnshang zǎo yìdiǎnr shuìjiào, zǎoshang jiù bú lèi le.", "If you go to bed a bit earlier, you won't be tired in the morning."],
            [1, "其实我认为晚上打排球也是运动。", "Qíshí wǒ rènwéi wǎnshang dǎ páiqiú yě shì yùndòng.", "Actually, I think playing volleyball in the evening counts as exercise too."],
            [0, "好吧，你可能是对的。", "Hǎo ba, nǐ kěnéng shì duì de.", "Fine, you might be right."],
            [1, "当然！那明天晚上我们一起打排球吧！", "Dāngrán! Nà míngtiān wǎnshang wǒmen yìqǐ dǎ páiqiú ba!", "Of course! So let's play volleyball tomorrow evening!"]
          ]
        }
      ]
    },

    50: {
      words: [
        ["过", "guo", "(have done before)", "particle", "你去过中国吗？", "Nǐ qù guo Zhōngguó ma?", "Have you ever been to China?"],
        ["以前", "yǐqián", "before; in the past", "noun", "我以前不喜欢吃辣的。", "Wǒ yǐqián bù xǐhuan chī là de.", "I didn't use to like spicy food."],
        ["曾经", "céngjīng", "once (in the past)", "adverb", "我曾经在饭馆工作过。", "Wǒ céngjīng zài fànguǎn gōngzuò guo.", "I once worked in a restaurant."],
        ["从来", "cónglái", "ever (从来没 = never)", "adverb", "我从来没有吃过北京烤鸭。", "Wǒ cónglái méiyǒu chī guo Běijīng kǎoyā.", "I've never had Peking duck."],
        ["经历", "jīnglì", "experience (something you lived through)", "noun", "这是一个很特别的经历。", "Zhè shì yí ge hěn tèbié de jīnglì.", "It was a really special experience."],
        ["记得", "jìde", "to remember", "verb", "你还记得他的名字吗？", "Nǐ hái jìde tā de míngzi ma?", "Do you still remember his name?"],
        ["小时候", "xiǎoshíhou", "as a child", "noun", "我小时候很怕狗。", "Wǒ xiǎoshíhou hěn pà gǒu.", "I was scared of dogs as a kid."],
        ["当时", "dāngshí", "at that time", "noun", "当时我很紧张。", "Dāngshí wǒ hěn jǐnzhāng.", "I was really nervous at the time."],
        ["后来", "hòulái", "later; afterwards", "noun", "后来我们成为了好朋友。", "Hòulái wǒmen chéngwéi le hǎo péngyou.", "Later we became good friends."],
        ["难忘", "nánwàng", "unforgettable", "adjective", "那天真的很难忘。", "Nà tiān zhēnde hěn nánwàng.", "That day was truly unforgettable."],
        ["长城", "Chángchéng", "the Great Wall", "noun", "你爬过长城吗？", "Nǐ pá guo Chángchéng ma?", "Have you ever climbed the Great Wall?"],
        ["爬", "pá", "to climb", "verb", "小美很喜欢爬树。", "Xiǎoměi hěn xǐhuan pá shù.", "Xiaomei loves climbing trees."],
        ["留学", "liúxué", "to study abroad", "verb", "她想去美国留学。", "Tā xiǎng qù Měiguó liúxué.", "She wants to study in America."],
        ["变", "biàn", "to change", "verb", "这个城市变了很多。", "Zhège chéngshì biàn le hěn duō.", "This city has changed a lot."],
        ["老家", "lǎojiā", "hometown", "noun", "我老家在南方。", "Wǒ lǎojiā zài nánfāng.", "My hometown is in the south."]
      ],
      patterns: [
        ["你……过……吗？", "Nǐ … guo … ma?", "Have you ever …?", "你吃过火锅吗？", "Nǐ chī guo huǒguō ma?", "Have you ever had hotpot?"],
        ["我从来没有……过……", "Wǒ cónglái méiyǒu … guo …", "I've never …", "我从来没有坐过高铁。", "Wǒ cónglái méiyǒu zuò guo gāotiě.", "I've never been on a high-speed train."]
      ],
      scenarios: [
        {
          title: "The Great Wall",
          zh: "你爬过长城吗？",
          setting: "Li Ming tells David about climbing the Great Wall as a boy.",
          cast: [["李明", "Lǐ Míng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，你去过长城吗？", "Dàwèi, nǐ qù guo Chángchéng ma?", "David, have you been to the Great Wall?"],
            [1, "还没有。我从来没有爬过长城。你呢？", "Hái méiyǒu. Wǒ cónglái méiyǒu pá guo Chángchéng. Nǐ ne?", "Not yet. I've never climbed it. Have you?"],
            [0, "我爬过两次。第一次是小时候，和爸爸一起去的。", "Wǒ pá guo liǎng cì. Dì yī cì shì xiǎoshíhou, hé bàba yìqǐ qù de.", "Twice. The first time I was a kid — I went with my dad."],
            [1, "你还记得吗？", "Nǐ hái jìde ma?", "Do you still remember it?"],
            [0, "当然记得！当时我很累，但是风景特别美。", "Dāngrán jìde! Dāngshí wǒ hěn lèi, dànshì fēngjǐng tèbié měi.", "Of course! I was exhausted, but the view was amazing."],
            [1, "后来呢？", "Hòulái ne?", "And after that?"],
            [0, "后来我每年都想再去。你也应该去，真的很难忘。", "Hòulái wǒ měi nián dōu xiǎng zài qù. Nǐ yě yīnggāi qù, zhēnde hěn nánwàng.", "Ever since, I've wanted to go back every year. You should go too — it's unforgettable."],
            [1, "好，下个月我们一起去爬吧！", "Hǎo, xià ge yuè wǒmen yìqǐ qù pá ba!", "Okay, let's go climb it together next month!"]
          ]
        },
        {
          title: "A year in America",
          zh: "我曾经留学过",
          setting: "David finds out Lin Mei once studied in the United States.",
          cast: [["大卫", "Dàwèi"], ["林美", "Lín Měi"]],
          lines: [
            [0, "林美，你去过美国吗？", "Lín Měi, nǐ qù guo Měiguó ma?", "Lin Mei, have you ever been to America?"],
            [1, "去过。我曾经在美国留学，在那儿住过一年。", "Qù guo. Wǒ céngjīng zài Měiguó liúxué, zài nàr zhù guo yì nián.", "I have. I studied abroad there and lived there for a year."],
            [0, "真的吗？那是什么时候？", "Zhēnde ma? Nà shì shénme shíhou?", "Really? When was that?"],
            [1, "五年以前。当时我很年轻，什么都不懂。", "Wǔ nián yǐqián. Dāngshí wǒ hěn niánqīng, shénme dōu bù dǒng.", "Five years ago. I was young and didn't know anything."],
            [0, "你觉得那是一个好经历吗？", "Nǐ juéde nà shì yí ge hǎo jīnglì ma?", "Was it a good experience?"],
            [1, "当然！那是我最难忘的经历。后来我回中国工作了。", "Dāngrán! Nà shì wǒ zuì nánwàng de jīnglì. Hòulái wǒ huí Zhōngguó gōngzuò le.", "Of course! It's my most unforgettable experience. Afterwards I came back to China to work."],
            [0, "我和你一样！我第一次来中国的时候什么都不懂，现在会说一点儿中文了。", "Wǒ hé nǐ yíyàng! Wǒ dì yī cì lái Zhōngguó de shíhou shénme dōu bù dǒng, xiànzài huì shuō yìdiǎnr Zhōngwén le.", "Same as me! When I first came to China I didn't understand a thing, and now I can speak a bit of Chinese."]
          ]
        },
        {
          title: "Back to my hometown",
          zh: "老家变了",
          setting: "Wang Fang comes home from a weekend in her hometown.",
          cast: [["大卫", "Dàwèi"], ["王芳", "Wáng Fāng"]],
          lines: [
            [0, "王芳，你周末回老家了吗？", "Wáng Fāng, nǐ zhōumò huí lǎojiā le ma?", "Wang Fang, did you go back to your hometown this weekend?"],
            [1, "回了。我的老家变了很多！", "Huí le. Wǒ de lǎojiā biàn le hěn duō!", "I did. My hometown has changed so much!"],
            [0, "真的吗？哪儿变了？", "Zhēnde ma? Nǎr biàn le?", "Really? What's different?"],
            [1, "以前那儿没有地铁，现在有了。还有很多新的楼。", "Yǐqián nàr méiyǒu dìtiě, xiànzài yǒu le. Hái yǒu hěn duō xīn de lóu.", "There used to be no subway, and now there is. There are lots of new buildings too."],
            [0, "你小时候住在哪儿？", "Nǐ xiǎoshíhou zhù zài nǎr?", "Where did you live as a kid?"],
            [1, "住在一条小街上，家旁边有一条河。我常常和弟弟在那儿玩。", "Zhù zài yì tiáo xiǎo jiē shang, jiā pángbiān yǒu yì tiáo hé. Wǒ chángcháng hé dìdi zài nàr wán.", "On a little street with a river next to our house. My brother and I used to play there all the time."],
            [0, "那条河还在吗？", "Nà tiáo hé hái zài ma?", "Is the river still there?"],
            [1, "河还在，但是我们以前的房子现在是一个超市！", "Hé hái zài, dànshì wǒmen yǐqián de fángzi xiànzài shì yí ge chāoshì!", "The river's still there, but our old house is a supermarket now!"]
          ]
        }
      ]
    },

    51: {
      words: [
        ["将来", "jiānglái", "the future", "noun", "你将来想做什么工作？", "Nǐ jiānglái xiǎng zuò shénme gōngzuò?", "What kind of work do you want to do in the future?"],
        ["以后", "yǐhòu", "later; in the future", "noun", "下班以后，我们去吃饭吧。", "Xiàbān yǐhòu, wǒmen qù chī fàn ba.", "Let's go eat after work."],
        ["希望", "xīwàng", "to hope", "verb", "我希望明天是晴天。", "Wǒ xīwàng míngtiān shì qíngtiān.", "I hope it's sunny tomorrow."],
        ["梦想", "mèngxiǎng", "dream", "noun", "我的梦想是成为一个歌手。", "Wǒ de mèngxiǎng shì chéngwéi yí ge gēshǒu.", "My dream is to become a singer."],
        ["目标", "mùbiāo", "goal", "noun", "我的目标是每天记十个汉字。", "Wǒ de mùbiāo shì měi tiān jì shí ge Hànzì.", "My goal is to learn ten characters a day."],
        ["机会", "jīhuì", "opportunity", "noun", "这是一个很好的机会。", "Zhè shì yí ge hěn hǎo de jīhuì.", "This is a great opportunity."],
        ["世界", "shìjiè", "world", "noun", "我想去世界上很多地方旅游。", "Wǒ xiǎng qù shìjiè shang hěn duō dìfang lǚyóu.", "I want to travel to lots of places around the world."],
        ["孩子", "háizi", "child", "noun", "你将来想要几个孩子？", "Nǐ jiānglái xiǎng yào jǐ ge háizi?", "How many kids do you want someday?"],
        ["结婚", "jiéhūn", "to get married", "verb", "我姐姐下个月结婚。", "Wǒ jiějie xià ge yuè jiéhūn.", "My sister is getting married next month."],
        ["退休", "tuìxiū", "to retire", "verb", "我爸爸已经退休了。", "Wǒ bàba yǐjīng tuìxiū le.", "My dad has already retired."],
        ["愿意", "yuànyì", "to be willing", "verb", "你愿意和我一起去吗？", "Nǐ yuànyì hé wǒ yìqǐ qù ma?", "Would you be willing to come with me?"],
        ["努力", "nǔlì", "to work hard", "verb", "他工作很努力。", "Tā gōngzuò hěn nǔlì.", "He works really hard."],
        ["实现", "shíxiàn", "to make (a dream) come true", "verb", "我希望你的梦想能实现。", "Wǒ xīwàng nǐ de mèngxiǎng néng shíxiàn.", "I hope your dream comes true."],
        ["继续", "jìxù", "to continue", "verb", "休息一下，然后继续工作。", "Xiūxi yíxià, ránhòu jìxù gōngzuò.", "Take a break, then keep working."],
        ["一定", "yídìng", "definitely", "adverb", "我一定会来的！", "Wǒ yídìng huì lái de!", "I'll definitely be there!"]
      ],
      patterns: [
        ["我希望将来能……", "Wǒ xīwàng jiānglái néng …", "I hope that one day I can …", "我希望将来能在中国工作。", "Wǒ xīwàng jiānglái néng zài Zhōngguó gōngzuò.", "I hope I can work in China one day."],
        ["……以后，我打算……", "… yǐhòu, wǒ dǎsuàn …", "After …, I plan to …", "毕业以后，我打算先去旅行。", "Bìyè yǐhòu, wǒ dǎsuàn xiān qù lǚxíng.", "After I graduate, I plan to travel first."]
      ],
      scenarios: [
        {
          title: "What's your dream?",
          zh: "你的梦想是什么？",
          setting: "David and Wang Fang talk about the future over tea at home.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，你将来想做什么？", "Dàwèi, nǐ jiānglái xiǎng zuò shénme?", "David, what do you want to do in the future?"],
            [1, "我希望将来能在中国工作。", "Wǒ xīwàng jiānglái néng zài Zhōngguó gōngzuò.", "I hope I can work in China someday."],
            [0, "真的吗？你愿意一直住在中国吗？", "Zhēnde ma? Nǐ yuànyì yìzhí zhù zài Zhōngguó ma?", "Really? Would you be happy to live in China for good?"],
            [1, "愿意！我很喜欢这儿。你呢？你的梦想是什么？", "Yuànyì! Wǒ hěn xǐhuan zhèr. Nǐ ne? Nǐ de mèngxiǎng shì shénme?", "Sure! I love it here. What about you? What's your dream?"],
            [0, "我的梦想是去世界上很多地方旅行，拍很多照片。", "Wǒ de mèngxiǎng shì qù shìjiè shang hěn duō dìfang lǚxíng, pāi hěn duō zhàopiàn.", "My dream is to travel all over the world and take lots of photos."],
            [1, "那你一定要努力存钱！", "Nà nǐ yídìng yào nǔlì cún qián!", "Then you'd better save hard!"],
            [0, "对！我的目标是先去五个地方——不，先去三个！", "Duì! Wǒ de mùbiāo shì xiān qù wǔ ge dìfang — bù, xiān qù sān ge!", "Right! My goal is five places first — no, make that three!"],
            [1, "加油！我希望你的梦想能实现！", "Jiāyóu! Wǒ xīwàng nǐ de mèngxiǎng néng shíxiàn!", "Go for it! I hope your dream comes true!"]
          ]
        },
        {
          title: "When will you marry?",
          zh: "你什么时候结婚？",
          setting: "Li Ming's mom brings up her favorite topic at dinner.",
          cast: [["李明的妈妈", "Lǐ Míng de māma"], ["李明", "Lǐ Míng"]],
          lines: [
            [0, "李明，你已经二十九岁了。你什么时候结婚？", "Lǐ Míng, nǐ yǐjīng èrshíjiǔ suì le. Nǐ shénme shíhou jiéhūn?", "Li Ming, you're already twenty-nine. When are you getting married?"],
            [1, "妈妈，我现在工作很忙。", "Māma, wǒ xiànzài gōngzuò hěn máng.", "Mom, I'm really busy with work right now."],
            [0, "工作再忙，也要结婚！你哥哥姐姐都有孩子了。", "Gōngzuò zài máng, yě yào jiéhūn! Nǐ gēge jiějie dōu yǒu háizi le.", "However busy you are, you still need to get married! Your brother and sisters all have kids."],
            [1, "我知道。我的目标是先努力工作，以后一定会结婚的。", "Wǒ zhīdào. Wǒ de mùbiāo shì xiān nǔlì gōngzuò, yǐhòu yídìng huì jiéhūn de.", "I know. My goal is to work hard first. I'll definitely get married later."],
            [0, "好吧。我和你爸爸快退休了，以后可以帮你看孩子！", "Hǎo ba. Wǒ hé nǐ bàba kuài tuìxiū le, yǐhòu kěyǐ bāng nǐ kān háizi!", "All right. Your dad and I are about to retire, so we can look after your kids!"],
            [1, "妈妈，我还不知道和谁结婚呢！", "Māma, wǒ hái bù zhīdào hé shéi jiéhūn ne!", "Mom, I don't even know who I'd marry yet!"]
          ]
        },
        {
          title: "A chance to go abroad",
          zh: "一个好机会",
          setting: "Lin Mei's manager offers her a job in the company's new overseas office.",
          cast: [["经理", "jīnglǐ (manager)"], ["林美", "Lín Měi"]],
          lines: [
            [0, "林美，公司在国外有一个新的办公室。你愿意去那儿工作吗？", "Lín Měi, gōngsī zài guówài yǒu yí ge xīn de bàngōngshì. Nǐ yuànyì qù nàr gōngzuò ma?", "Lin Mei, the company has a new office abroad. Would you be willing to work there?"],
            [1, "国外？这是一个很好的机会！要去多长时间？", "Guówài? Zhè shì yí ge hěn hǎo de jīhuì! Yào qù duō cháng shíjiān?", "Abroad? That's a great opportunity! For how long?"],
            [0, "两年。两年以后可以回来。", "Liǎng nián. Liǎng nián yǐhòu kěyǐ huílai.", "Two years. After that you can come back."],
            [1, "我需要想一下。我可以明天告诉你吗？", "Wǒ xūyào xiǎng yíxià. Wǒ kěyǐ míngtiān gàosu nǐ ma?", "I need to think about it. Can I tell you tomorrow?"],
            [0, "当然可以。你工作很努力，我认为你一定能做好。", "Dāngrán kěyǐ. Nǐ gōngzuò hěn nǔlì, wǒ rènwéi nǐ yídìng néng zuò hǎo.", "Of course. You work hard — I'm sure you'll do a great job."],
            [1, "谢谢经理！我会继续努力的。", "Xièxie jīnglǐ! Wǒ huì jìxù nǔlì de.", "Thank you! I'll keep working hard."]
          ]
        }
      ]
    },

    52: {
      words: [
        ["回顾", "huígù", "to look back", "verb", "我们来回顾一下这一年吧。", "Wǒmen lái huígù yíxià zhè yì nián ba.", "Let's look back on this year."],
        ["总结", "zǒngjié", "to sum up", "verb", "请你总结一下你的想法。", "Qǐng nǐ zǒngjié yíxià nǐ de xiǎngfǎ.", "Please sum up your thoughts."],
        ["收获", "shōuhuò", "gains; what you got out of it", "noun", "这一年你最大的收获是什么？", "Zhè yì nián nǐ zuì dà de shōuhuò shì shénme?", "What was the best thing you got out of this year?"],
        ["变化", "biànhuà", "change", "noun", "这个城市的变化很大。", "Zhège chéngshì de biànhuà hěn dà.", "This city has changed a lot."],
        ["完成", "wánchéng", "to complete", "verb", "工作完成了吗？", "Gōngzuò wánchéng le ma?", "Is the work finished?"],
        ["坚持", "jiānchí", "to keep at it", "verb", "每天坚持运动很难。", "Měi tiān jiānchí yùndòng hěn nán.", "It's hard to keep exercising every day."],
        ["骄傲", "jiāo'ào", "proud", "adjective", "你的爸爸妈妈一定很骄傲！", "Nǐ de bàba māma yídìng hěn jiāo'ào!", "Your parents must be so proud!"],
        ["感觉", "gǎnjué", "feeling; to feel", "noun", "你现在感觉怎么样？", "Nǐ xiànzài gǎnjué zěnmeyàng?", "How are you feeling now?"],
        ["流利", "liúlì", "fluent", "adjective", "她的中文很流利。", "Tā de Zhōngwén hěn liúlì.", "Her Chinese is very fluent."],
        ["水平", "shuǐpíng", "level", "noun", "我的中文水平还不太高。", "Wǒ de Zhōngwén shuǐpíng hái bú tài gāo.", "My Chinese still isn't very advanced."],
        ["提高", "tígāo", "to improve", "verb", "多听多说，就能提高。", "Duō tīng duō shuō, jiù néng tígāo.", "Listen more and speak more, and you'll improve."],
        ["终于", "zhōngyú", "finally", "adverb", "我终于到家了！", "Wǒ zhōngyú dào jiā le!", "I'm finally home!"],
        ["过去", "guòqù", "the past", "noun", "过去的事，别想了。", "Guòqù de shì, bié xiǎng le.", "That's in the past — let it go."],
        ["未来", "wèilái", "the future", "noun", "未来会更好！", "Wèilái huì gèng hǎo!", "The future will be even better!"],
        ["祝贺", "zhùhè", "to congratulate", "verb", "祝贺你毕业！", "Zhùhè nǐ bìyè!", "Congratulations on graduating!"]
      ],
      patterns: [
        ["过去的一年，我……", "Guòqù de yì nián, wǒ …", "Over the past year, I …", "过去的一年，我的中文提高了很多。", "Guòqù de yì nián, wǒ de Zhōngwén tígāo le hěn duō.", "Over the past year, my Chinese has improved a lot."],
        ["祝贺你……！", "Zhùhè nǐ …!", "Congratulations on …!", "祝贺你完成了一年的学习！", "Zhùhè nǐ wánchéng le yì nián de xuéxí!", "Congratulations on finishing a whole year of study!"]
      ],
      scenarios: [
        {
          title: "The last class of the year",
          zh: "一年的学习",
          setting: "Teacher Zhang looks back on the year with David and Anna.",
          cast: [["张老师", "Zhāng lǎoshī"], ["大卫", "Dàwèi"], ["安娜", "Ānnà"]],
          lines: [
            [0, "今天我们来回顾一下过去的一年。大卫，你还记得第一天上课吗？", "Jīntiān wǒmen lái huígù yíxià guòqù de yì nián. Dàwèi, nǐ hái jìde dì yī tiān shàngkè ma?", "Today let's look back on the past year. David, do you remember your first class?"],
            [1, "记得！当时我只会说“你好”和“谢谢”。", "Jìde! Dāngshí wǒ zhǐ huì shuō “nǐ hǎo” hé “xièxie”.", "I do! Back then all I could say was “hello” and “thank you”."],
            [0, "现在呢？你觉得你的水平怎么样？", "Xiànzài ne? Nǐ juéde nǐ de shuǐpíng zěnmeyàng?", "And now? How do you think your level is?"],
            [1, "我觉得我的发音提高了很多，但是还不太流利。", "Wǒ juéde wǒ de fāyīn tígāo le hěn duō, dànshì hái bú tài liúlì.", "I think my pronunciation has improved a lot, but I'm still not very fluent."],
            [0, "你每天都坚持学习，进步很大。", "Nǐ měi tiān dōu jiānchí xuéxí, jìnbù hěn dà.", "You kept studying every single day, and you've made huge progress."],
            [2, "张老师，我们终于完成了五十二个星期的学习！", "Zhāng lǎoshī, wǒmen zhōngyú wánchéng le wǔshí'èr ge xīngqī de xuéxí!", "Teacher Zhang, we've finally finished fifty-two weeks of study!"],
            [0, "祝贺你们！我真的很骄傲。", "Zhùhè nǐmen! Wǒ zhēnde hěn jiāo'ào.", "Congratulations, both of you! I'm so proud."],
            [1, "谢谢张老师！没有你，就没有我们的进步。", "Xièxie Zhāng lǎoshī! Méiyǒu nǐ, jiù méiyǒu wǒmen de jìnbù.", "Thank you, Teacher Zhang! We couldn't have done it without you."]
          ]
        },
        {
          title: "What did you get out of it?",
          zh: "最大的收获",
          setting: "At home, Wang Fang asks David what this year has meant to him.",
          cast: [["王芳", "Wáng Fāng"], ["大卫", "Dàwèi"]],
          lines: [
            [0, "大卫，这一年你最大的收获是什么？", "Dàwèi, zhè yì nián nǐ zuì dà de shōuhuò shì shénme?", "David, what's the best thing you got out of this year?"],
            [1, "我最大的收获是可以和中国朋友说中文了。", "Wǒ zuì dà de shōuhuò shì kěyǐ hé Zhōngguó péngyou shuō Zhōngwén le.", "The best thing is that I can speak Chinese with my Chinese friends now."],
            [0, "对！以前你点菜的时候很紧张，现在说得这么好！", "Duì! Yǐqián nǐ diǎn cài de shíhou hěn jǐnzhāng, xiànzài shuō de zhème hǎo!", "Right! You used to get nervous ordering food, and now you speak so well!"],
            [1, "我感觉自己变了很多。其实我也有一点儿骄傲。", "Wǒ gǎnjué zìjǐ biàn le hěn duō. Qíshí wǒ yě yǒu yìdiǎnr jiāo'ào.", "I feel like I've changed a lot. Honestly, I'm a little proud of myself."],
            [0, "你应该骄傲！你的变化真的很大。不是每个人都能坚持一年。", "Nǐ yīnggāi jiāo'ào! Nǐ de biànhuà zhēnde hěn dà. Bú shì měi ge rén dōu néng jiānchí yì nián.", "You should be! You've really changed. Not everyone can stick with it for a whole year."],
            [1, "谢谢你一直帮我。你是我最好的老师！", "Xièxie nǐ yìzhí bāng wǒ. Nǐ shì wǒ zuì hǎo de lǎoshī!", "Thanks for always helping me. You're my best teacher!"],
            [0, "不客气！走，我们去吃火锅庆祝一下！", "Bú kèqi! Zǒu, wǒmen qù chī huǒguō qìngzhù yíxià!", "You're welcome! Come on, let's go celebrate with hotpot!"]
          ]
        },
        {
          title: "To the future!",
          zh: "未来的一年",
          setting: "Friends gather for a dinner to celebrate David's year of Chinese.",
          cast: [["李明", "Lǐ Míng"], ["林美", "Lín Měi"], ["大卫", "Dàwèi"], ["安娜", "Ānnà"]],
          lines: [
            [0, "来，大家一起祝贺大卫完成了一年的中文学习！", "Lái, dàjiā yìqǐ zhùhè Dàwèi wánchéng le yì nián de Zhōngwén xuéxí!", "Come on, everyone, let's congratulate David on finishing a year of Chinese!"],
            [1, "大卫，请你总结一下过去的这一年！", "Dàwèi, qǐng nǐ zǒngjié yíxià guòqù de zhè yì nián!", "David, sum up your year for us!"],
            [2, "好！过去的一年很难，但是也很有意思。我认识了你们，也吃了很多好吃的中国菜！", "Hǎo! Guòqù de yì nián hěn nán, dànshì yě hěn yǒu yìsi. Wǒ rènshi le nǐmen, yě chī le hěn duō hǎochī de Zhōngguó cài!", "Okay! This past year was hard, but it was so much fun. I met all of you, and I ate lots of delicious Chinese food!"],
            [3, "你现在中文说得真流利！", "Nǐ xiànzài Zhōngwén shuō de zhēn liúlì!", "Your Chinese is so fluent now!"],
            [2, "还不太流利，但是我会继续努力。", "Hái bú tài liúlì, dànshì wǒ huì jìxù nǔlì.", "Not quite fluent yet, but I'll keep working at it."],
            [0, "未来你有什么打算？", "Wèilái nǐ yǒu shénme dǎsuàn?", "What are your plans for the future?"],
            [2, "我希望明年我的中文水平能更高，说得更流利！", "Wǒ xīwàng míngnián wǒ de Zhōngwén shuǐpíng néng gèng gāo, shuō de gèng liúlì!", "I hope next year my Chinese gets even better, and I speak even more fluently!"],
            [1, "你一定可以！我们都会帮你。", "Nǐ yídìng kěyǐ! Wǒmen dōu huì bāng nǐ.", "You definitely can! We'll all help you."],
            [2, "谢谢你们！这是我最难忘的一年。", "Xièxie nǐmen! Zhè shì wǒ zuì nánwàng de yì nián.", "Thank you, all of you! This has been my most unforgettable year."]
          ]
        }
      ]
    }
  }
};
