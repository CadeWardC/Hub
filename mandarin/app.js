// ========================================
// MANDARIN APP — ROADMAP TO FLUENCY
// ========================================
(function(){
'use strict';

// ===================== DATA =====================

const TONES = [
    {id:'tone1', char:'mā', num:'1st', name:'High & Level', desc:'Sing a high steady note.', example:'妈 (mother)', color:'#c41e3a'},
    {id:'tone2', char:'má', num:'2nd', name:'Rising', desc:'Start mid, rise up. Like "What?"', example:'麻 (hemp)', color:'#e6a817'},
    {id:'tone3', char:'mǎ', num:'3rd', name:'Dipping', desc:'Dip down then up. Valley shape.', example:'马 (horse)', color:'#2d8a6e'},
    {id:'tone4', char:'mà', num:'4th', name:'Falling', desc:'Start high, drop sharply. "No!"', example:'骂 (scold)', color:'#5b4de6'},
    {id:'tone5', char:'ma', num:'Neutral', name:'Light & Short', desc:'Short, light, no stress.', example:'吗 (question)', color:'#9e9488'}
];

const TOPICS = [
    {
        id:'foundation', name:'Foundation', emoji:'🏗️', desc:'Tones + pinyin + mic practice',
        locked:false,
        vocab:[
            {char:'妈', pinyin:'mā', meaning:'mother', sentences:[{cn:'这是我妈妈。',en:'This is my mother.'},{cn:'妈妈很好。',en:'Mom is very well.'}]},
            {char:'麻', pinyin:'má', meaning:'hemp/numb', sentences:[{cn:'手麻了。',en:'My hand is numb.'},{cn:'这是麻布。',en:'This is hemp cloth.'}]},
            {char:'马', pinyin:'mǎ', meaning:'horse', sentences:[{cn:'一匹马。',en:'One horse.'},{cn:'马跑得很快。',en:'The horse runs very fast.'}]},
            {char:'骂', pinyin:'mà', meaning:'scold', sentences:[{cn:'不要骂人。',en:'Don\'t scold people.'},{cn:'爸爸骂我了。',en:'Dad scolded me.'}]},
            {char:'吗', pinyin:'ma', meaning:'question particle', sentences:[{cn:'你好吗？',en:'How are you?'},{cn:'这是你的吗？',en:'Is this yours?'}]},
            {char:'你', pinyin:'nǐ', meaning:'you', sentences:[{cn:'你好！',en:'Hello!'},{cn:'你叫什么名字？',en:'What is your name?'}]},
            {char:'好', pinyin:'hǎo', meaning:'good', sentences:[{cn:'很好！',en:'Very good!'},{cn:'你好不好？',en:'Are you well?'}]},
            {char:'我', pinyin:'wǒ', meaning:'I / me', sentences:[{cn:'我是学生。',en:'I am a student.'},{cn:'我喜欢中国。',en:'I like China.'}]},
            {char:'是', pinyin:'shì', meaning:'am / is / are', sentences:[{cn:'我是美国人。',en:'I am American.'},{cn:'这是水。',en:'This is water.'}]},
            {char:'一', pinyin:'yī', meaning:'one', sentences:[{cn:'一个苹果。',en:'One apple.'},{cn:'星期一。',en:'Monday.'}]}
        ],
        builder:[
            {prompt:'Build: "How are you?"', target:'你好吗？', words:['你','好','吗','我','是','不'], answer:['你','好','吗']},
            {prompt:'Build: "I am a student."', target:'我是学生。', words:['我','是','学生','老师','你','不'], answer:['我','是','学生']},
            {prompt:'Build: "Mom is very good."', target:'妈妈很好。', words:['妈妈','很','好','不','吗','我'], answer:['妈妈','很','好']}
        ]
    },
    {
        id:'greetings', name:'Greetings', emoji:'👋', desc:'Hello, goodbye, thanks, sorry',
        locked:true,
        vocab:[
            {char:'你好', pinyin:'nǐ hǎo', meaning:'hello', sentences:[{cn:'你好！',en:'Hello!'},{cn:'你好吗？',en:'How are you?'}]},
            {char:'再见', pinyin:'zàijiàn', meaning:'goodbye', sentences:[{cn:'再见！',en:'Goodbye!'},{cn:'明天再见。',en:'See you tomorrow.'}]},
            {char:'谢谢', pinyin:'xièxie', meaning:'thank you', sentences:[{cn:'谢谢你！',en:'Thank you!'},{cn:'非常感谢。',en:'Thanks so much.'}]},
            {char:'对不起', pinyin:'duìbùqǐ', meaning:'sorry', sentences:[{cn:'对不起。',en:'Sorry.'},{cn:'对不起，我迟到了。',en:'Sorry, I\'m late.'}]},
            {char:'没关系', pinyin:'méi guānxi', meaning:'it\'s okay', sentences:[{cn:'没关系。',en:'It\'s okay.'},{cn:'没关系，不用谢。',en:'It\'s okay, no need to thank.'}]},
            {char:'请问', pinyin:'qǐngwèn', meaning:'excuse me / may I ask', sentences:[{cn:'请问，厕所在哪里？',en:'Excuse me, where is the bathroom?'},{cn:'请问你叫什么名字？',en:'May I ask your name?'}]},
            {char:'早上好', pinyin:'zǎoshang hǎo', meaning:'good morning', sentences:[{cn:'早上好！',en:'Good morning!'},{cn:'你早上好吗？',en:'Good morning to you?'}]},
            {char:'晚安', pinyin:'wǎn\'ān', meaning:'good night', sentences:[{cn:'晚安！',en:'Good night!'},{cn:'祝你晚安。',en:'Wish you a good night.'}]}
        ],
        builder:[
            {prompt:'Build: "Thank you very much."', target:'非常感谢。', words:['非常','感谢','谢谢','你','不','我'], answer:['非常','感谢']},
            {prompt:'Build: "Excuse me, where is the bathroom?"', target:'请问，厕所在哪里？', words:['请问','厕所','在','哪里','哪里','谢谢'], answer:['请问','厕所','在','哪里']},
            {prompt:'Build: "Goodbye! See you tomorrow."', target:'再见！明天见。', words:['再见','明天','见','你','好','谢谢'], answer:['再见','明天','见']}
        ]
    },
    {
        id:'numbers', name:'Numbers', emoji:'🔢', desc:'Counting, prices, quantities',
        locked:true,
        vocab:[
            {char:'一', pinyin:'yī', meaning:'one', sentences:[{cn:'一个。',en:'One.'},{cn:'星期一。',en:'Monday.'}]},
            {char:'二', pinyin:'èr', meaning:'two', sentences:[{cn:'两个苹果。',en:'Two apples.'},{cn:'二月。',en:'February.'}]},
            {char:'三', pinyin:'sān', meaning:'three', sentences:[{cn:'三个人。',en:'Three people.'},{cn:'星期三。',en:'Wednesday.'}]},
            {char:'四', pinyin:'sì', meaning:'four', sentences:[{cn:'四本书。',en:'Four books.'},{cn:'四月。',en:'April.'}]},
            {char:'五', pinyin:'wǔ', meaning:'five', sentences:[{cn:'五个人。',en:'Five people.'},{cn:'星期五。',en:'Friday.'}]},
            {char:'六', pinyin:'liù', meaning:'six', sentences:[{cn:'六点了。',en:'It\'s six o\'clock.'},{cn:'六月。',en:'June.'}]},
            {char:'七', pinyin:'qī', meaning:'seven', sentences:[{cn:'七月很热。',en:'July is very hot.'},{cn:'七个人。',en:'Seven people.'}]},
            {char:'八', pinyin:'bā', meaning:'eight', sentences:[{cn:'八月。',en:'August.'},{cn:'八点了。',en:'It\'s eight o\'clock.'}]},
            {char:'九', pinyin:'jiǔ', meaning:'nine', sentences:[{cn:'九月开学了。',en:'School starts in September.'},{cn:'九个。',en:'Nine.'}]},
            {char:'十', pinyin:'shí', meaning:'ten', sentences:[{cn:'十月。',en:'October.'},{cn:'十个人。',en:'Ten people.'}]},
            {char:'百', pinyin:'bǎi', meaning:'hundred', sentences:[{cn:'一百块。',en:'One hundred dollars.'},{cn:'两百元。',en:'Two hundred yuan.'}]},
            {char:'多少钱', pinyin:'duōshao qián', meaning:'how much', sentences:[{cn:'这个多少钱？',en:'How much is this?'},{cn:'一共多少钱？',en:'How much in total?'}]}
        ],
        builder:[
            {prompt:'Build: "How much is this?"', target:'这个多少钱？', words:['这个','多少','钱','那个','是','不'], answer:['这个','多少','钱']},
            {prompt:'Build: "One hundred yuan."', target:'一百元。', words:['一','百','元','十','块','两'], answer:['一','百','元']},
            {prompt:'Build: "Three people, four books."', target:'三个人，四本书。', words:['三个','人','四','本','书','五'], answer:['三个','人','四','本','书']}
        ]
    },
    {
        id:'family', name:'Family', emoji:'👨‍👩‍👧', desc:'Family members and relationships',
        locked:true,
        vocab:[
            {char:'爸爸', pinyin:'bàba', meaning:'father', sentences:[{cn:'我爸爸很高。',en:'My father is very tall.'},{cn:'爸爸工作了。',en:'Dad is working.'}]},
            {char:'妈妈', pinyin:'māma', meaning:'mother', sentences:[{cn:'妈妈做饭很好吃。',en:'Mom cooks very well.'},{cn:'我爱妈妈。',en:'I love mom.'}]},
            {char:'哥哥', pinyin:'gēge', meaning:'older brother', sentences:[{cn:'我哥哥二十岁。',en:'My older brother is 20.'},{cn:'哥哥上学了。',en:'Older brother went to school.'}]},
            {char:'姐姐', pinyin:'jiějie', meaning:'older sister', sentences:[{cn:'姐姐很漂亮。',en:'Older sister is very pretty.'},{cn:'我姐姐工作了。',en:'My older sister is working.'}]},
            {char:'弟弟', pinyin:'dìdi', meaning:'younger brother', sentences:[{cn:'我弟弟很小。',en:'My younger brother is very small.'},{cn:'弟弟在睡觉。',en:'Younger brother is sleeping.'}]},
            {char:'妹妹', pinyin:'mèimei', meaning:'younger sister', sentences:[{cn:'我妹妹上学了。',en:'My younger sister started school.'},{cn:'妹妹很可爱。',en:'Younger sister is very cute.'}]},
            {char:'家', pinyin:'jiā', meaning:'family / home', sentences:[{cn:'我家有五个人。',en:'There are five people in my family.'},{cn:'我想回家。',en:'I want to go home.'}]},
            {char:'孩子', pinyin:'háizi', meaning:'child', sentences:[{cn:'两个孩子。',en:'Two children.'},{cn:'这个孩子很聪明。',en:'This child is very smart.'}]}
        ],
        builder:[
            {prompt:'Build: "There are five people in my family."', target:'我家有五个人。', words:['我家','有','五','个','人','爸爸'], answer:['我家','有','五','个','人']},
            {prompt:'Build: "My mom cooks very well."', target:'我妈妈做饭很好吃。', words:['我妈妈','做饭','很','好吃','爸爸','不'], answer:['我妈妈','做饭','很','好吃']},
            {prompt:'Build: "I love my family."', target:'我爱我家。', words:['我','爱','我','家','爸爸','妈妈'], answer:['我','爱','我','家']}
        ]
    },
    {
        id:'food', name:'Food & Dining', emoji:'🍜', desc:'Eating, drinking, ordering',
        locked:true,
        vocab:[
            {char:'饭', pinyin:'fàn', meaning:'food / rice / meal', sentences:[{cn:'吃饭了！',en:'Time to eat!'},{cn:'米饭很好吃。',en:'Rice is very tasty.'}]},
            {char:'水', pinyin:'shuǐ', meaning:'water', sentences:[{cn:'我要喝水。',en:'I want to drink water.'},{cn:'一杯水。',en:'A glass of water.'}]},
            {char:'茶', pinyin:'chá', meaning:'tea', sentences:[{cn:'一杯茶。',en:'A cup of tea.'},{cn:'我喜欢喝茶。',en:'I like drinking tea.'}]},
            {char:'咖啡', pinyin:'kāfēi', meaning:'coffee', sentences:[{cn:'一杯咖啡。',en:'A cup of coffee.'},{cn:'早上喝咖啡。',en:'Drink coffee in the morning.'}]},
            {char:'吃', pinyin:'chī', meaning:'eat', sentences:[{cn:'你吃了吗？',en:'Have you eaten?'},{cn:'我想吃面。',en:'I want to eat noodles.'}]},
            {char:'喝', pinyin:'hē', meaning:'drink', sentences:[{cn:'喝水。',en:'Drink water.'},{cn:'我不喝咖啡。',en:'I don\'t drink coffee.'}]},
            {char:'好吃', pinyin:'hǎo chī', meaning:'delicious', sentences:[{cn:'这个很好吃！',en:'This is very delicious!'},{cn:'妈妈做的饭很好吃。',en:'Mom\'s cooking is delicious.'}]},
            {char:'饿', pinyin:'è', meaning:'hungry', sentences:[{cn:'我饿了。',en:'I\'m hungry.'},{cn:'你很饿吗？',en:'Are you very hungry?'}]},
            {char:'面', pinyin:'miàn', meaning:'noodles', sentences:[{cn:'一碗面。',en:'A bowl of noodles.'},{cn:'我想吃面。',en:'I want to eat noodles.'}]},
            {char:'肉', pinyin:'ròu', meaning:'meat', sentences:[{cn:'鸡肉还是牛肉？',en:'Chicken or beef?'},{cn:'我不吃肉。',en:'I don\'t eat meat.'}]}
        ],
        builder:[
            {prompt:'Build: "I want to eat noodles."', target:'我想吃面。', words:['我','想','吃','面','喝','水'], answer:['我','想','吃','面']},
            {prompt:'Build: "Have you eaten?"', target:'你吃了吗？', words:['你','吃','了','吗','喝','饭'], answer:['你','吃','了','吗']},
            {prompt:'Build: "A cup of tea, please."', target:'请给我一杯茶。', words:['请','给我','一杯','茶','咖啡','水'], answer:['请','给我','一杯','茶']}
        ]
    },
    {
        id:'daily', name:'Daily Life', emoji:'🏠', desc:'Common verbs and expressions',
        locked:true,
        vocab:[
            {char:'喜欢', pinyin:'xǐhuan', meaning:'like', sentences:[{cn:'我喜欢中国。',en:'I like China.'},{cn:'你喜欢吗？',en:'Do you like it?'}]},
            {char:'要', pinyin:'yào', meaning:'want / need', sentences:[{cn:'我要水。',en:'I want water.'},{cn:'你要什么？',en:'What do you want?'}]},
            {char:'有', pinyin:'yǒu', meaning:'have', sentences:[{cn:'我有一本书。',en:'I have a book.'},{cn:'你有没有？',en:'Do you have it?'}]},
            {char:'在', pinyin:'zài', meaning:'at / in', sentences:[{cn:'我在家。',en:'I\'m at home.'},{cn:'你在哪里？',en:'Where are you?'}]},
            {char:'去', pinyin:'qù', meaning:'go', sentences:[{cn:'我去学校。',en:'I\'m going to school.'},{cn:'你想去哪里？',en:'Where do you want to go?'}]},
            {char:'来', pinyin:'lái', meaning:'come', sentences:[{cn:'快来！',en:'Come quickly!'},{cn:'你来我家吧。',en:'Come to my home.'}]},
            {char:'看', pinyin:'kàn', meaning:'look / see / watch', sentences:[{cn:'看电影。',en:'Watch a movie.'},{cn:'我看一下。',en:'Let me take a look.'}]},
            {char:'做', pinyin:'zuò', meaning:'do / make', sentences:[{cn:'做什么？',en:'What are you doing?'},{cn:'做作业。',en:'Doing homework.'}]},
            {char:'睡觉', pinyin:'shuì jiào', meaning:'sleep', sentences:[{cn:'我要睡觉。',en:'I want to sleep.'},{cn:'你睡了吗？',en:'Are you asleep?'}]},
            {char:'起床', pinyin:'qǐ chuáng', meaning:'get up', sentences:[{cn:'早上六点起床。',en:'Get up at 6 in the morning.'},{cn:'你几点起床？',en:'What time do you get up?'}]}
        ],
        builder:[
            {prompt:'Build: "Where are you? I\'m at home."', target:'你在哪里？我在家。', words:['你','在','哪里','我','在','家'], answer:['你','在','哪里','我','在','家']},
            {prompt:'Build: "What do you want to do?"', target:'你想做什么？', words:['你','想','做','什么','去','看'], answer:['你','想','做','什么']},
            {prompt:'Build: "I want to sleep."', target:'我要睡觉。', words:['我','要','睡觉','去','了','不'], answer:['我','要','睡觉']}
        ]
    },
    {
        id:'shopping', name:'Shopping', emoji:'🛒', desc:'Buying, prices, sizes',
        locked:true,
        vocab:[
            {char:'买', pinyin:'mǎi', meaning:'buy', sentences:[{cn:'我想买这个。',en:'I want to buy this.'},{cn:'你买了什么？',en:'What did you buy?'}]},
            {char:'卖', pinyin:'mài', meaning:'sell', sentences:[{cn:'这里不卖咖啡。',en:'They don\'t sell coffee here.'},{cn:'多少钱卖？',en:'How much to sell?'}]},
            {char:'这个', pinyin:'zhège', meaning:'this one', sentences:[{cn:'这个多少钱？',en:'How much is this one?'},{cn:'我要这个。',en:'I want this one.'}]},
            {char:'那个', pinyin:'nàge', meaning:'that one', sentences:[{cn:'那个太贵了。',en:'That one is too expensive.'},{cn:'你喜欢那个吗？',en:'Do you like that one?'}]},
            {char:'太贵了', pinyin:'tài guì le', meaning:'too expensive', sentences:[{cn:'这个太贵了！',en:'This is too expensive!'},{cn:'不贵，很便宜。',en:'Not expensive, very cheap.'}]},
            {char:'便宜', pinyin:'piányi', meaning:'cheap', sentences:[{cn:'很便宜！',en:'Very cheap!'},{cn:'有没有更便宜的？',en:'Do you have anything cheaper?'}]},
            {char:'大小', pinyin:'dàxiǎo', meaning:'size', sentences:[{cn:'什么大小？',en:'What size?'},{cn:'有大一点的吗？',en:'Do you have a bigger one?'}]},
            {char:'可以', pinyin:'kěyǐ', meaning:'can / may', sentences:[{cn:'可以吗？',en:'Is that okay?'},{cn:'我可以看看吗？',en:'May I take a look?'}]},
            {char:'给', pinyin:'gěi', meaning:'give', sentences:[{cn:'给我这个。',en:'Give me this one.'},{cn:'请给我一杯水。',en:'Please give me a glass of water.'}]}
        ],
        builder:[
            {prompt:'Build: "How much is this one? Too expensive!"', target:'这个多少钱？太贵了！', words:['这个','多少','钱','太贵','了','那个'], answer:['这个','多少','钱','太贵','了']},
            {prompt:'Build: "May I take a look?"', target:'我可以看看吗？', words:['我','可以','看看','吗','你','给'], answer:['我','可以','看看','吗']},
            {prompt:'Build: "Give me a cheaper one."', target:'给我一个便宜一点的。', words:['给','我','一个','便宜','一点','的'], answer:['给','我','一个','便宜','一点','的']}
        ]
    },
    {
        id:'directions', name:'Directions', emoji:'🧭', desc:'Where things are, how to get there',
        locked:true,
        vocab:[
            {char:'这里', pinyin:'zhèlǐ', meaning:'here', sentences:[{cn:'我在这里。',en:'I\'m here.'},{cn:'这里是学校。',en:'This is the school.'}]},
            {char:'那里', pinyin:'nàlǐ', meaning:'there', sentences:[{cn:'他在那里。',en:'He is there.'},{cn:'那里有很多人。',en:'There are many people there.'}]},
            {char:'左', pinyin:'zuǒ', meaning:'left', sentences:[{cn:'向左走。',en:'Go left.'},{cn:'左边是什么？',en:'What is on the left?'}]},
            {char:'右', pinyin:'yòu', meaning:'right', sentences:[{cn:'向右走。',en:'Go right.'},{cn:'在右边。',en:'On the right.'}]},
            {char:'前面', pinyin:'qiánmiàn', meaning:'in front', sentences:[{cn:'在前面。',en:'In front.'},{cn:'前面是银行。',en:'The bank is ahead.'}]},
            {char:'后面', pinyin:'hòumiàn', meaning:'behind', sentences:[{cn:'在后面。',en:'Behind.'},{cn:'房子后面有树。',en:'There are trees behind the house.'}]},
            {char:'旁边', pinyin:'pángbiān', meaning:'next to', sentences:[{cn:'在旁边。',en:'Next to.'},{cn:'学校旁边有商店。',en:'There is a shop next to the school.'}]},
            {char:'怎么走', pinyin:'zěnme zǒu', meaning:'how to get there', sentences:[{cn:'请问，医院怎么走？',en:'Excuse me, how do I get to the hospital?'},{cn:'从这里怎么走？',en:'How do I go from here?'}]}
        ],
        builder:[
            {prompt:'Build: "Excuse me, how do I get to the hospital?"', target:'请问，医院怎么走？', words:['请问','医院','怎么','走','去','哪里'], answer:['请问','医院','怎么','走']},
            {prompt:'Build: "Go left, it\'s right there."', target:'向左走，就在那里。', words:['向','左','走','就','在','那里'], answer:['向','左','走','就','在','那里']},
            {prompt:'Build: "The shop is next to the school."', target:'商店在学校旁边。', words:['商店','在','学校','旁边','前面','后面'], answer:['商店','在','学校','旁边']}
        ]
    },
    {
        id:'time', name:'Time & Dates', emoji:'📅', desc:'Days, months, telling time',
        locked:true,
        vocab:[
            {char:'今天', pinyin:'jīntiān', meaning:'today', sentences:[{cn:'今天很热。',en:'Today is very hot.'},{cn:'你今天好吗？',en:'How are you today?'}]},
            {char:'明天', pinyin:'míngtiān', meaning:'tomorrow', sentences:[{cn:'明天见！',en:'See you tomorrow!'},{cn:'明天是星期一。',en:'Tomorrow is Monday.'}]},
            {char:'昨天', pinyin:'zuótiān', meaning:'yesterday', sentences:[{cn:'昨天我很忙。',en:'I was very busy yesterday.'},{cn:'昨天你去了哪里？',en:'Where did you go yesterday?'}]},
            {char:'现在', pinyin:'xiànzài', meaning:'now', sentences:[{cn:'现在几点？',en:'What time is it now?'},{cn:'我现在很忙。',en:'I am very busy now.'}]},
            {char:'几点', pinyin:'jǐ diǎn', meaning:'what time', sentences:[{cn:'现在几点了？',en:'What time is it now?'},{cn:'你几点起床？',en:'What time do you get up?'}]},
            {char:'星期', pinyin:'xīngqī', meaning:'week', sentences:[{cn:'星期一。',en:'Monday.'},{cn:'这个星期很忙。',en:'This week is very busy.'}]},
            {char:'月', pinyin:'yuè', meaning:'month', sentences:[{cn:'十月。',en:'October.'},{cn:'下个月去北京。',en:'Going to Beijing next month.'}]},
            {char:'年', pinyin:'nián', meaning:'year', sentences:[{cn:'今年。',en:'This year.'},{cn:'你今年多大了？',en:'How old are you this year?'}]},
            {char:'几点了', pinyin:'jǐ diǎn le', meaning:'what time is it', sentences:[{cn:'现在几点了？',en:'What time is it now?'},{cn:'八点了。',en:'It\'s eight o\'clock.'}]}
        ],
        builder:[
            {prompt:'Build: "What time is it now?"', target:'现在几点了？', words:['现在','几点','了','今天','明天','你'], answer:['现在','几点','了']},
            {prompt:'Build: "See you tomorrow!"', target:'明天见！', words:['明天','见','今天','再见','你','好'], answer:['明天','见']},
            {prompt:'Build: "What time do you get up?"', target:'你几点起床？', words:['你','几点','起床','睡觉','今天','现在'], answer:['你','几点','起床']}
        ]
    },
    {
        id:'weather', name:'Weather', emoji:'🌤️', desc:'Talking about the weather',
        locked:true,
        vocab:[
            {char:'天气', pinyin:'tiānqì', meaning:'weather', sentences:[{cn:'今天天气很好。',en:'The weather is very good today.'},{cn:'天气怎么样？',en:'How is the weather?'}]},
            {char:'热', pinyin:'rè', meaning:'hot', sentences:[{cn:'很热！',en:'Very hot!'},{cn:'夏天很热。',en:'Summer is very hot.'}]},
            {char:'冷', pinyin:'lěng', meaning:'cold', sentences:[{cn:'很冷！',en:'Very cold!'},{cn:'冬天很冷。',en:'Winter is very cold.'}]},
            {char:'下雨', pinyin:'xià yǔ', meaning:'rain', sentences:[{cn:'下雨了。',en:'It\'s raining.'},{cn:'明天会下雨吗？',en:'Will it rain tomorrow?'}]},
            {char:'太阳', pinyin:'tàiyáng', meaning:'sun', sentences:[{cn:'太阳很大。',en:'The sun is very strong.'},{cn:'今天有太阳。',en:'The sun is out today.'}]},
            {char:'风', pinyin:'fēng', meaning:'wind', sentences:[{cn:'风很大。',en:'The wind is very strong.'},{cn:'刮风了。',en:'The wind has picked up.'}]},
            {char:'雪', pinyin:'xuě', meaning:'snow', sentences:[{cn:'下雪了！',en:'It\'s snowing!'},{cn:'我喜欢雪。',en:'I like snow.'}]},
            {char:'温度', pinyin:'wēndù', meaning:'temperature', sentences:[{cn:'温度很高。',en:'The temperature is very high.'},{cn:'今天温度多少？',en:'What\'s the temperature today?'}]}
        ],
        builder:[
            {prompt:'Build: "The weather is very good today."', target:'今天天气很好。', words:['今天','天气','很','好','热','冷'], answer:['今天','天气','很','好']},
            {prompt:'Build: "It\'s raining, bring an umbrella."', target:'下雨了，带伞。', words:['下雨','了','带','伞','太阳','风'], answer:['下雨','了','带','伞']},
            {prompt:'Build: "How is the weather tomorrow?"', target:'明天天气怎么样？', words:['明天','天气','怎么','样','今天','热'], answer:['明天','天气','怎么','样']}
        ]
    },
    {
        id:'travel', name:'Travel', emoji:'✈️', desc:'Airports, tickets, hotels, passports',
        locked:true,
        vocab:[
            {char:'飞机', pinyin:'fēijī', meaning:'airplane', sentences:[{cn:'坐飞机。',en:'Take a plane.'},{cn:'飞机几点起飞？',en:'What time does the plane take off?'}]},
            {char:'火车', pinyin:'huǒchē', meaning:'train', sentences:[{cn:'坐火车。',en:'Take a train.'},{cn:'火车站在这里。',en:'The train station is here.'}]},
            {char:'票', pinyin:'piào', meaning:'ticket', sentences:[{cn:'一张票。',en:'One ticket.'},{cn:'买票。',en:'Buy a ticket.'}]},
            {char:'酒店', pinyin:'jiǔdiàn', meaning:'hotel', sentences:[{cn:'住酒店。',en:'Stay at a hotel.'},{cn:'酒店在哪里？',en:'Where is the hotel?'}]},
            {char:'护照', pinyin:'hùzhào', meaning:'passport', sentences:[{cn:'我的护照。',en:'My passport.'},{cn:'护照在哪里？',en:'Where is the passport?'}]},
            {char:'机场', pinyin:'jīchǎng', meaning:'airport', sentences:[{cn:'去机场。',en:'Go to the airport.'},{cn:'机场很大。',en:'The airport is very big.'}]},
            {char:'去哪儿', pinyin:'qù nǎr', meaning:'where to go', sentences:[{cn:'你想去哪儿？',en:'Where do you want to go?'},{cn:'我去北京。',en:'I\'m going to Beijing.'}]},
            {char:'国家', pinyin:'guójiā', meaning:'country', sentences:[{cn:'很多国家。',en:'Many countries.'},{cn:'你来自哪个国家？',en:'Which country are you from?'}]}
        ],
        builder:[
            {prompt:'Build: "Where do you want to go?"', target:'你想去哪儿？', words:['你','想','去','哪儿','我','北京'], answer:['你','想','去','哪儿']},
            {prompt:'Build: "Buy a ticket to Beijing."', target:'买一张去北京的票。', words:['买','一张','去','北京','的','票'], answer:['买','一张','去','北京','的','票']},
            {prompt:'Build: "Where is the hotel?"', target:'酒店在哪里？', words:['酒店','在','哪里','机场','哪儿','火车'], answer:['酒店','在','哪里']}
        ]
    },
    {
        id:'conversation', name:'Conversation Master', emoji:'🗣️', desc:'Putting it all together',
        locked:true,
        vocab:[
            {char:'但是', pinyin:'dànshì', meaning:'but', sentences:[{cn:'很好，但是太贵了。',en:'Very good, but too expensive.'},{cn:'我喜欢，但是我不买。',en:'I like it, but I won\'t buy it.'}]},
            {char:'因为', pinyin:'yīnwèi', meaning:'because', sentences:[{cn:'因为下雨了。',en:'Because it\'s raining.'},{cn:'因为我饿了。',en:'Because I\'m hungry.'}]},
            {char:'所以', pinyin:'suǒyǐ', meaning:'so / therefore', sentences:[{cn:'所以我不去了。',en:'So I\'m not going.'},{cn:'很忙，所以明天见。',en:'Very busy, so see you tomorrow.'}]},
            {char:'虽然', pinyin:'suīrán', meaning:'although', sentences:[{cn:'虽然下雨，但是我出去。',en:'Although it\'s raining, I\'m still going out.'},{cn:'虽然很难，但是我喜欢。',en:'Although it\'s hard, I like it.'}]},
            {char:'觉得', pinyin:'juéde', meaning:'feel / think', sentences:[{cn:'我觉得很好。',en:'I think it\'s very good.'},{cn:'你觉得怎么样？',en:'What do you think?'}]},
            {char:'知道', pinyin:'zhīdào', meaning:'know', sentences:[{cn:'我不知道。',en:'I don\'t know.'},{cn:'你知道吗？',en:'Do you know?'}]},
            {char:'明白', pinyin:'míngbai', meaning:'understand', sentences:[{cn:'我明白了。',en:'I understand.'},{cn:'你明白吗？',en:'Do you understand?'}]},
            {char:'有问题', pinyin:'yǒu wèntí', meaning:'have a problem / question', sentences:[{cn:'有问题吗？',en:'Any questions?'},{cn:'我没有问题。',en:'I have no questions.'}]}
        ],
        builder:[
            {prompt:'Build: "I think it\'s very good."', target:'我觉得很好。', words:['我','觉得','很','好','你','不'], answer:['我','觉得','很','好']},
            {prompt:'Build: "Because I\'m hungry, so I want to eat."', target:'因为我饿了，所以我想吃。', words:['因为','我','饿了','所以','我','想','吃'], answer:['因为','我','饿了','所以','我','想','吃']},
            {prompt:'Build: "Do you understand? I understand."', target:'你明白吗？我明白。', words:['你','明白','吗','我','明白','不'], answer:['你','明白','吗','我','明白']}
        ]
    }
];

// ===================== STATE =====================
let state = {
    xp:0, level:1, streak:0, lastPractice:null,
    completedTopics:[], completedWords:{}, topicProgress:{},
    dailyQuest:{target:5, current:0, reward:50}
};
try{
    const saved = localStorage.getItem('mandarinState');
    if(saved) state = {...state, ...JSON.parse(saved)};
}catch(e){}
function saveState(){
    try{localStorage.setItem('mandarinState', JSON.stringify(state));}catch(e){}
}

// ===================== AUDIO =====================
let audioCtx=null, analyser=null, micStream=null, micSource=null, isRecording=false;
let pitchHistory=[], animationId=null, cachedChineseVoice=null;

function initAudio(){
    if(!audioCtx) audioCtx = new(window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended') audioCtx.resume();
}
function findChineseVoice(){
    if(!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if(!voices||!voices.length) return null;
    return voices.find(v=>v.lang==='zh-CN')||
           voices.find(v=>v.lang==='zh-TW')||
           voices.find(v=>v.lang==='zh-HK')||
           voices.find(v=>v.lang&&v.lang.startsWith('zh'))||
           voices.find(v=>/chinese|mandarin|中文|汉语/i.test(v.name));
}
function ensureVoice(){
    if(cachedChineseVoice) return cachedChineseVoice;
    cachedChineseVoice = findChineseVoice();
    return cachedChineseVoice;
}
if(window.speechSynthesis){
    cachedChineseVoice = findChineseVoice();
    window.speechSynthesis.onvoiceschanged = ()=>{ cachedChineseVoice = findChineseVoice(); };
    setTimeout(()=>cachedChineseVoice = findChineseVoice(), 500);
}

function speakChinese(text, rate=0.78, pitch=1.05){
    if(!text) return;
    if(window.speechSynthesis){
        const voice = ensureVoice();
        if(voice){
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.voice = voice; u.lang = voice.lang || 'zh-CN'; u.rate = rate; u.pitch = pitch; u.volume = 1;
            window.speechSynthesis.speak(u);
            return;
        }
    }
    // Fallback formant synth for pure pinyin
    const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const isPinyin = /^[a-zA-Z\s]+$/.test(normalized.trim());
    if(isPinyin){
        // Simple fallback
        const osc = new OscillatorNode(audioCtx||new(window.AudioContext||window.webkitAudioContext)(), {type:'sine', frequency:220});
        const g = new GainNode(audioCtx||new(window.AudioContext||window.webkitAudioContext)(), {gain:0.1});
        osc.connect(g); g.connect((audioCtx||new(window.AudioContext||window.webkitAudioContext)()).destination);
        osc.start(); g.gain.exponentialRampToValueAtTime(0.001, (audioCtx||new(window.AudioContext||window.webkitAudioContext)()).currentTime+0.5);
        osc.stop((audioCtx||new(window.AudioContext||window.webkitAudioContext)()).currentTime+0.5);
    }
}

// ===================== PITCH DETECTION =====================
function autoCorrelate(buf, sampleRate){
    const SIZE = buf.length;
    let rms = 0;
    for(let i=0;i<SIZE;i++){const v=buf[i];rms+=v*v;}
    rms = Math.sqrt(rms/SIZE);
    if(rms<0.01) return -1;
    let r1=0, r2=SIZE-1;
    for(let i=0;i<SIZE/2;i++) if(Math.abs(buf[i])<0.2){r1=i;break;}
    for(let i=1;i<SIZE/2;i++) if(Math.abs(buf[SIZE-i])<0.2){r2=SIZE-i;break;}
    const buf2 = buf.slice(r1,r2);
    const SIZE2 = buf2.length;
    const c = new Array(SIZE2).fill(0);
    for(let i=0;i<SIZE2;i++) for(let j=0;j<SIZE2-i;j++) c[i]+=buf2[j]*buf2[j+i];
    let d=0; while(c[d]>c[d+1]) d++;
    let maxval=-1, maxpos=-1;
    for(let i=d;i<SIZE2;i++) if(c[i]>maxval){maxval=c[i];maxpos=i;}
    let T0=maxpos;
    if(maxpos>0 && maxpos<SIZE2-1){
        const x1=maxpos-1, x2=maxpos, x3=maxpos+1;
        const y1=c[x1], y2=c[x2], y3=c[x3];
        const a=(y1-2*y2+y3)/2;
        if(a!==0) T0 = x2 - (y3-y1)/(4*a);
    }
    return sampleRate/T0;
}
async function startMic(){
    initAudio();
    try{
        micStream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,autoGainControl:false,noiseSuppression:false}});
        micSource = audioCtx.createMediaStreamSource(micStream);
        analyser = audioCtx.createAnalyser(); analyser.fftSize=2048;
        micSource.connect(analyser);
        isRecording=true; pitchHistory=[];
        drawPitchLoop(); return true;
    }catch(e){
        alert('Microphone access required. Please allow mic access.');
        return false;
    }
}
function stopMic(){
    isRecording=false;
    if(animationId) cancelAnimationFrame(animationId);
    if(micStream){micStream.getTracks().forEach(t=>t.stop());micStream=null;}
    micSource=null; analyser=null;
}
function drawPitchLoop(){
    if(!isRecording||!analyser) return;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    const pitch = autoCorrelate(buf, audioCtx.sampleRate);
    if(pitch>50 && pitch<800) pitchHistory.push(pitch);
    if(pitchHistory.length>300) pitchHistory.shift();
    drawPitchCanvas();
    animationId = requestAnimationFrame(drawPitchLoop);
}
function drawPitchCanvas(){
    const canvas = document.getElementById('pitchCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle='#1a1a2e'; ctx.fillRect(0,0,w,h);
    if(pitchHistory.length<2) return;
    const minP=80, maxP=400;
    const target = document.querySelector('.tone-pick.active')?.dataset.tone || '1';
    // Target contour
    ctx.strokeStyle='rgba(196,30,58,0.3)'; ctx.lineWidth=3;
    ctx.setLineDash([5,5]); ctx.beginPath();
    const yH=h*0.2, yM=h*0.5, yL=h*0.8;
    const xs=20, xe=w-20;
    if(target==='1'){ctx.moveTo(xs,yH);ctx.lineTo(xe,yH);}
    else if(target==='2'){ctx.moveTo(xs,yM);ctx.lineTo(xe,yH);}
    else if(target==='3'){ctx.moveTo(xs,yM);ctx.lineTo((xs+xe)/2,yL);ctx.lineTo(xe,yM);}
    else if(target==='4'){ctx.moveTo(xs,yH);ctx.lineTo(xe,yL);}
    else{ctx.moveTo(xs,yM);ctx.lineTo(xe,yM);}
    ctx.stroke(); ctx.setLineDash([]);
    // Detected pitch
    ctx.strokeStyle='#2d8a6e'; ctx.lineWidth=2; ctx.beginPath();
    for(let i=0;i<pitchHistory.length;i++){
        const x=(i/300)*w, y=h-((pitchHistory[i]-minP)/(maxP-minP))*h;
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
}

// ===================== GAMIFICATION =====================
function addXP(amount){
    state.xp += amount;
    state.dailyQuest.current++;
    const newLevel = Math.floor(state.xp/200)+1;
    if(newLevel>state.level) state.level = newLevel;
    saveState();
    updateTopStats();
    showXpPop(amount);
}
function showXpPop(amount){
    const pop = document.getElementById('xpPop');
    document.getElementById('xpAmount').textContent = `+${amount} XP`;
    pop.classList.remove('hidden');
    setTimeout(()=>pop.classList.add('hidden'), 1200);
}
function updateTopStats(){
    document.getElementById('topXp').textContent = `${state.xp} XP`;
}

// ===================== ROADMAP =====================
let activeTopic = null;
let activeLessonTab = 'learn';
let activeBuilder = null;

function renderRoadmap(){
    const container = document.getElementById('roadmapPath');
    container.innerHTML = '';
    
    let prevDone = true;
    TOPICS.forEach((topic, i) => {
        const isFirst = i===0;
        const isDone = state.completedTopics.includes(topic.id);
        const isCurrent = prevDone && !isDone;
        const isLocked = !prevDone && !isDone;
        
        const progress = state.topicProgress[topic.id] || 0;
        const totalWords = topic.vocab.length;
        const pct = Math.round((progress/totalWords)*100);
        
        const node = document.createElement('div');
        node.className = `roadmap-node ${isLocked?'locked':''}`;
        
        let dotClass = 'node-dot';
        let dotContent = topic.emoji;
        if(isDone){ dotClass += ' done'; dotContent = '✓'; }
        else if(isCurrent){ dotClass += ' current'; }
        
        node.innerHTML = `
            <div class="${dotClass}">${dotContent}</div>
            <div class="node-card" data-topic="${topic.id}">
                <div class="node-name">${topic.name}</div>
                <div class="node-desc">${topic.desc}</div>
                <div class="node-stats">
                    <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
                    <span>${progress}/${totalWords} words</span>
                    ${isLocked?'<span class="node-lock">🔒</span>':''}
                </div>
            </div>
        `;
        
        const card = node.querySelector('.node-card');
        if(!isLocked){
            card.addEventListener('click', ()=> openTopic(topic));
        }
        container.appendChild(node);
        prevDone = isDone;
    });
    
    updateTopStats();
}

// ===================== TOPIC LESSON =====================
function openTopic(topic){
    activeTopic = topic;
    activeLessonTab = 'learn';
    document.getElementById('lessonTitle').textContent = topic.name;
    document.getElementById('lessonProgress').textContent = `${state.topicProgress[topic.id]||0}/${topic.vocab.length}`;
    
    // Show/hide tone practice button for Foundation topic
    const tpWrap = document.getElementById('tonePracticeWrap');
    if(tpWrap) tpWrap.style.display = topic.id === 'foundation' ? 'block' : 'none';
    
    // Update tab visibility
    const tabs = document.querySelectorAll('.l-tab');
    tabs.forEach(t => t.classList.toggle('active', t.dataset.ltab === 'learn'));
    
    switchView('lessonView');
    renderLessonTab('learn');
}

function renderLessonTab(tab){
    activeLessonTab = tab;
    const body = document.getElementById('lessonBody');
    const topic = activeTopic;
    
    document.querySelectorAll('.l-tab').forEach(t => t.classList.toggle('active', t.dataset.ltab === tab));
    
    if(tab === 'learn'){
        const completedCount = state.topicProgress[topic.id] || 0;
        const learnedWords = state.completedWords[topic.id] || [];
        
        body.innerHTML = `
            <div class="vocab-section">
                <div class="vocab-section-title">Learn these ${topic.vocab.length} words</div>
                ${topic.vocab.map((word, idx) => {
                    const isLearned = learnedWords.includes(word.char);
                    return `
                    <div class="vocab-card ${isLearned?'completed':''}" data-word-idx="${idx}">
                        <div class="vocab-left">
                            <span class="vocab-char">${word.char}</span>
                            <span class="vocab-pinyin">${word.pinyin}</span>
                        </div>
                        <div class="vocab-center">
                            <div class="vocab-meaning">${word.meaning}</div>
                            <div class="vocab-sentences">
                                ${word.sentences.map(s => `<div><span class="sent-cn">${s.cn}</span> <span class="sent-en">— ${s.en}</span></div>`).join('')}
                            </div>
                        </div>
                        <div class="vocab-right">
                            <button class="vocab-play" data-play="${word.char}">🔊</button>
                            <span class="vocab-check">✓</span>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
            ${completedCount >= topic.vocab.length ? `
            <div style="text-align:center; margin-top:1rem;">
                <p style="color:var(--jade); font-weight:700; font-size:1.1rem;">✓ All words learned!</p>
                <button class="start-btn" id="goToSentencesBtn" style="max-width:300px; margin:1rem auto;">Practice Sentences (+50 XP)</button>
            </div>
            ` : ''}
        `;
        
        // Word click to mark learned
        body.querySelectorAll('.vocab-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if(e.target.closest('.vocab-play')) return;
                const idx = parseInt(card.dataset.wordIdx);
                const word = topic.vocab[idx];
                
                if(!state.completedWords[topic.id]) state.completedWords[topic.id] = [];
                if(!state.completedWords[topic.id].includes(word.char)){
                    state.completedWords[topic.id].push(word.char);
                    state.topicProgress[topic.id] = (state.topicProgress[topic.id]||0)+1;
                    saveState();
                    addXP(10);
                    card.classList.add('completed');
                    document.getElementById('lessonProgress').textContent = `${state.topicProgress[topic.id]}/${topic.vocab.length}`;
                    
                    // Check if all done
                    if(state.topicProgress[topic.id] >= topic.vocab.length){
                        if(!state.completedTopics.includes(topic.id)){
                            state.completedTopics.push(topic.id);
                            saveState();
                        }
                        renderLessonTab('learn');
                    }
                }
            });
        });
        
        // Audio buttons
        body.querySelectorAll('.vocab-play').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const char = btn.dataset.play;
                const word = topic.vocab.find(w => w.char === char);
                if(word){
                    speakChinese(word.char, 0.72, 1.05);
                }
            });
        });
        
        document.getElementById('goToSentencesBtn')?.addEventListener('click', ()=> renderLessonTab('sentences'));
        
        // Tone practice button (static in HTML, shown/hidden via CSS)
        document.getElementById('tonePracticeBtn')?.addEventListener('click', ()=>{
            switchView('tonePracticeView');
            renderTonePractice();
        });
        
    } else if(tab === 'sentences'){
        renderSentenceBuilder(body, topic);
    } else if(tab === 'quiz'){
        startQuiz(topic);
    }
}

// ===================== SENTENCE BUILDER =====================
let builderState = { current:0, answers:[] };

function renderSentenceBuilder(body, topic){
    const builders = topic.builder || [];
    if(builders.length === 0){
        body.innerHTML = `
            <div style="text-align:center; padding:3rem 1rem;">
                <div style="font-size:3rem; margin-bottom:1rem;">📝</div>
                <h3 style="font-size:1.2rem; font-weight:800; margin-bottom:0.5rem;">No sentence exercises yet</h3>
                <p style="color:var(--text-secondary);">Complete the Learn tab first!</p>
            </div>
        `;
        return;
    }
    
    builderState.current = 0;
    builderState.answers = [];
    showBuilderQuestion(body, topic, builders, 0);
}

function showBuilderQuestion(body, topic, builders, idx){
    const b = builders[idx];
    
    body.innerHTML = `
        <div class="builder-card">
            <div class="builder-prompt">${b.prompt}</div>
            <div class="builder-target" style="color:var(--text-muted); font-size:0.85rem;">Target: ${b.target}</div>
            <div class="builder-slots" id="builderSlots">
                ${b.answer.map(() => `<div class="builder-slot">?</div>`).join('')}
            </div>
            <div class="builder-words" id="builderWords">
                ${b.words.map(w => `<span class="builder-word" data-word="${w}">${w}</span>`).join('')}
            </div>
            <div class="builder-actions">
                <button class="builder-btn check" id="builderCheck">Check</button>
                <button class="builder-btn reset" id="builderReset">Reset</button>
            </div>
            <div class="builder-feedback" id="builderFeedback"></div>
            <div style="text-align:center; margin-top:1rem; color:var(--text-muted); font-size:0.8rem; font-weight:600;">
                Sentence ${idx+1} of ${builders.length}
            </div>
        </div>
    `;
    
    let currentAnswer = [];
    const slots = document.getElementById('builderSlots');
    const wordsEl = document.getElementById('builderWords');
    const feedback = document.getElementById('builderFeedback');
    
    // Word click
    wordsEl.querySelectorAll('.builder-word').forEach(w => {
        w.addEventListener('click', () => {
            if(w.classList.contains('used')) return;
            if(currentAnswer.length >= b.answer.length) return;
            
            const word = w.dataset.word;
            currentAnswer.push(word);
            w.classList.add('used');
            
            // Fill slot
            const slotEls = slots.querySelectorAll('.builder-slot');
            slotEls[currentAnswer.length-1].textContent = word;
            slotEls[currentAnswer.length-1].classList.add('filled');
        });
    });
    
    // Slot click to remove
    slots.querySelectorAll('.builder-slot').forEach((slot, i) => {
        slot.addEventListener('click', () => {
            if(i >= currentAnswer.length || !slot.classList.contains('filled')) return;
            const removed = currentAnswer[i];
            currentAnswer.splice(i, 1);
            
            // Reset slot
            slot.textContent = '?';
            slot.classList.remove('filled', 'correct', 'wrong');
            
            // Shift remaining
            const slotEls = slots.querySelectorAll('.builder-slot');
            for(let j=0; j<b.answer.length; j++){
                if(j < currentAnswer.length){
                    slotEls[j].textContent = currentAnswer[j];
                    slotEls[j].classList.add('filled');
                } else {
                    slotEls[j].textContent = '?';
                    slotEls[j].classList.remove('filled', 'correct', 'wrong');
                }
            }
            
            // Un-mark word
            wordsEl.querySelectorAll('.builder-word').forEach(w => {
                if(w.dataset.word === removed) w.classList.remove('used');
            });
        });
    });
    
    // Check
    document.getElementById('builderCheck')?.addEventListener('click', () => {
        if(currentAnswer.length !== b.answer.length){
            feedback.textContent = 'Fill all slots first!';
            feedback.className = 'builder-feedback wrong';
            return;
        }
        
        const isCorrect = currentAnswer.every((w,i) => w === b.answer[i]);
        const slotEls = slots.querySelectorAll('.builder-slot');
        
        if(isCorrect){
            feedback.textContent = '✓ Correct! +15 XP';
            feedback.className = 'builder-feedback correct';
            slotEls.forEach(s => s.classList.add('correct'));
            addXP(15);
            
            setTimeout(() => {
                if(idx+1 < builders.length){
                    showBuilderQuestion(body, topic, builders, idx+1);
                } else {
                    body.innerHTML = `
                        <div style="text-align:center; padding:2rem;">
                            <div style="font-size:3rem; margin-bottom:1rem;">🎉</div>
                            <h3 style="font-size:1.3rem; font-weight:800;">All sentences complete!</h3>
                            <p style="color:var(--text-secondary); margin-bottom:1.5rem;">Great job building sentences.</p>
                            <button class="start-btn" id="goToQuizBtn" style="max-width:200px;">Take Quiz (+50 XP)</button>
                        </div>
                    `;
                    document.getElementById('goToQuizBtn')?.addEventListener('click', ()=> renderLessonTab('quiz'));
                }
            }, 1500);
        } else {
            feedback.textContent = '✗ Try again. Check the word order.';
            feedback.className = 'builder-feedback wrong';
            slotEls.forEach((s,i) => {
                if(currentAnswer[i] !== b.answer[i]) s.classList.add('wrong');
            });
        }
    });
    
    // Reset
    document.getElementById('builderReset')?.addEventListener('click', () => {
        currentAnswer = [];
        slots.querySelectorAll('.builder-slot').forEach(s => {
            s.textContent = '?'; s.classList.remove('filled','correct','wrong');
        });
        wordsEl.querySelectorAll('.builder-word').forEach(w => w.classList.remove('used'));
        feedback.textContent = '';
    });
}

// ===================== QUIZ =====================
let quizData=[], quizIndex=0;

function startQuiz(topic){
    quizIndex=0;
    quizData = generateQuiz(topic);
    if(quizData.length===0){
        document.getElementById('lessonBody').innerHTML = `
            <div style="text-align:center; padding:3rem;">
                <p style="color:var(--text-secondary);">Learn more words to unlock the quiz!</p>
            </div>
        `;
        return;
    }
    showQuizQuestion();
    document.getElementById('quizOverlay').classList.remove('hidden');
}

function generateQuiz(topic){
    const questions = [];
    const learned = state.completedWords[topic.id] || [];
    
    // Only quiz on learned words
    const learnedVocab = topic.vocab.filter(w => learned.includes(w.char));
    if(learnedVocab.length < 3) return [];
    
    // Question type 1: Show character, ask meaning
    const sample1 = learnedVocab.sort(()=>Math.random()-0.5).slice(0, 3);
    sample1.forEach(word => {
        const wrong = topic.vocab.filter(w=>w.char!==word.char).sort(()=>Math.random()-0.5).slice(0,3);
        const opts = [word, ...wrong].sort(()=>Math.random()-0.5);
        questions.push({
            type:'meaning',
            question:`What does "${word.char}" mean?`,
            options: opts.map(o=>({text:o.meaning, correct:o.char===word.char})),
            correct: word.meaning
        });
    });
    
    // Question type 2: Show pinyin, ask character
    const sample2 = learnedVocab.sort(()=>Math.random()-0.5).slice(0, 2);
    sample2.forEach(word => {
        const wrong = topic.vocab.filter(w=>w.char!==word.char).sort(()=>Math.random()-0.5).slice(0,3);
        const opts = [word, ...wrong].sort(()=>Math.random()-0.5);
        questions.push({
            type:'pinyin',
            question:`Which character is "${word.pinyin}"?`,
            options: opts.map(o=>({text:o.char, correct:o.char===word.char})),
            correct: word.char
        });
    });
    
    return questions;
}

function showQuizQuestion(){
    const q = quizData[quizIndex];
    const body = document.getElementById('quizBody');
    document.getElementById('quizCounter').textContent = `${quizIndex+1} / ${quizData.length}`;
    
    body.innerHTML = `
        <div class="quiz-question">
            <div class="quiz-prompt">${q.question}</div>
        </div>
        <div class="quiz-options">
            ${q.options.map((opt,i)=>`<button class="quiz-opt" data-opt="${i}">${opt.text}</button>`).join('')}
        </div>
        <div class="quiz-feedback" id="quizFeedback"></div>
    `;
    
    body.querySelectorAll('.quiz-opt').forEach(btn=>{
        btn.addEventListener('click', ()=>{
            const idx = parseInt(btn.dataset.opt);
            const opt = q.options[idx];
            const allBtns = body.querySelectorAll('.quiz-opt');
            allBtns.forEach((b,i)=>{
                b.classList.add('disabled');
                if(q.options[i].correct) b.classList.add('correct');
            });
            if(!opt.correct) btn.classList.add('wrong');
            
            const fb = document.getElementById('quizFeedback');
            fb.textContent = opt.correct ? '✓ Correct! +10 XP' : `✗ Answer: ${q.correct}`;
            fb.className = `quiz-feedback ${opt.correct?'correct':'wrong'}`;
            if(opt.correct) addXP(10);
            
            setTimeout(()=>{
                quizIndex++;
                if(quizIndex < quizData.length){
                    showQuizQuestion();
                } else {
                    body.innerHTML = `
                        <div style="text-align:center; padding:2rem;">
                            <div style="font-size:3rem; margin-bottom:1rem;">🎉</div>
                            <h3 style="font-size:1.3rem; font-weight:800;">Quiz Complete!</h3>
                            <p style="color:var(--text-secondary);">Amazing work.</p>
                            <button class="start-btn" id="closeQuizDone" style="margin-top:1.5rem; max-width:200px;">Done</button>
                        </div>
                    `;
                    document.getElementById('closeQuizDone')?.addEventListener('click', ()=>{
                        document.getElementById('quizOverlay').classList.add('hidden');
                        renderRoadmap();
                    });
                }
            }, 1500);
        });
    });
}

document.getElementById('quizClose')?.addEventListener('click', ()=>{
    document.getElementById('quizOverlay').classList.add('hidden');
});

// ===================== TONE PRACTICE =====================
let activeToneIdx = 0;

function renderTonePractice(){
    const body = document.getElementById('tonePracticeContent');
    const tone = TONES[activeToneIdx];
    
    body.innerHTML = `
        <div class="tone-instruction">
            <h3>Practice Tone ${tone.num}</h3>
            <p>Listen, then hold the mic and speak "${tone.char}". Match the pitch contour.</p>
        </div>
        <div class="tone-target-display">
            <span class="tone-target-char">${tone.char}</span>
            <span class="tone-target-info">${tone.num} — ${tone.name}</span>
        </div>
        <div class="tone-audio-row" style="text-align:center;">
            <button class="vocab-play" id="playRefBtn" style="display:inline-flex; width:auto; padding:0.7rem 1.5rem; font-size:0.9rem; font-weight:700;">▶ Play Reference</button>
        </div>
        <div class="tone-canvas-wrap">
            <canvas id="pitchCanvas" width="600" height="200"></canvas>
            <div class="tone-canvas-labels"><span>High</span><span>Mid</span><span>Low</span></div>
        </div>
        <div class="tone-mic-section">
            <button class="mic-btn" id="micBtn">🎤 Hold to Speak</button>
            <div class="tone-result" id="toneResult"></div>
        </div>
        <div class="tone-selector">
            ${TONES.map((t,i)=>`<button class="tone-pick ${i===activeToneIdx?'active':''}" data-tone="${i+1}">${t.num}</button>`).join('')}
        </div>
        <div class="tone-next-row">
            ${activeToneIdx < TONES.length-1 ? `<button class="tone-next-btn" id="toneNextBtn">Next Tone →</button>` : '<button class="tone-next-btn" id="toneDoneBtn">✓ Complete Foundation</button>'}
        </div>
    `;
    
    // Play reference
    document.getElementById('playRefBtn')?.addEventListener('click', ()=>{
        speakChinese(tone.char, 0.72, 1.05);
    });
    
    // Mic
    const micBtn = document.getElementById('micBtn');
    micBtn?.addEventListener('mousedown', async ()=>{
        micBtn.classList.add('recording');
        micBtn.textContent = '🎤 Recording...';
        await startMic();
    });
    micBtn?.addEventListener('mouseup', ()=>{
        micBtn.classList.remove('recording');
        micBtn.textContent = '🎤 Hold to Speak';
        stopMic();
        analyzeTone(tone);
    });
    micBtn?.addEventListener('touchstart', async (e)=>{e.preventDefault(); micBtn.classList.add('recording'); micBtn.textContent='🎤 Recording...'; await startMic();});
    micBtn?.addEventListener('touchend', (e)=>{e.preventDefault(); micBtn.classList.remove('recording'); micBtn.textContent='🎤 Hold to Speak'; stopMic(); analyzeTone(tone);});
    
    // Tone picker
    body.querySelectorAll('.tone-pick').forEach(btn=>{
        btn.addEventListener('click', ()=>{
            activeToneIdx = parseInt(btn.dataset.tone)-1;
            renderTonePractice();
        });
    });
    
    // Next / Done
    document.getElementById('toneNextBtn')?.addEventListener('click', ()=>{
        activeToneIdx++;
        renderTonePractice();
    });
    document.getElementById('toneDoneBtn')?.addEventListener('click', ()=>{
        addXP(50);
        if(!state.completedTopics.includes('foundation')){
            state.completedTopics.push('foundation');
            saveState();
        }
        switchView('roadmapView');
        renderRoadmap();
    });
}

function analyzeTone(tone){
    const result = document.getElementById('toneResult');
    if(!result) return;
    if(pitchHistory.length < 10){
        result.textContent = '✗ Speak longer into the mic.';
        result.className = 'tone-result wrong';
        return;
    }
    
    const avg = pitchHistory.reduce((a,b)=>a+b,0)/pitchHistory.length;
    const start = pitchHistory.slice(0, Math.floor(pitchHistory.length/3));
    const end = pitchHistory.slice(Math.floor(pitchHistory.length*2/3));
    const startAvg = start.reduce((a,b)=>a+b,0)/start.length;
    const endAvg = end.reduce((a,b)=>a+b,0)/end.length;
    const trend = endAvg - startAvg;
    const hasDip = pitchHistory.some(p => p < startAvg - 30);
    
    let correct = false;
    switch(tone.id){
        case 'tone1': correct = Math.abs(trend) < 25; break;
        case 'tone2': correct = trend > 20; break;
        case 'tone3': correct = hasDip && trend > -10 && trend < 35; break;
        case 'tone4': correct = trend < -20; break;
        case 'tone5': correct = pitchHistory.length < 60; break;
    }
    
    if(correct){
        result.textContent = '✓ Good tone shape!';
        result.className = 'tone-result correct';
        addXP(20);
    } else {
        result.textContent = '✗ Try again. Listen to the reference first.';
        result.className = 'tone-result wrong';
    }
}

// ===================== NAVIGATION =====================
function switchView(viewId){
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    if(viewId==='roadmapView') renderRoadmap();
    else if(viewId==='tonePracticeView') renderTonePractice();
}

// Welcome
const startBtn = document.getElementById('startLearningBtn');
startBtn?.addEventListener('click', ()=>{
    const welcome = document.getElementById('welcomeScreen');
    const main = document.getElementById('mainApp');
    if(welcome) welcome.style.display = 'none';
    if(main) {
        main.classList.remove('hidden');
        main.style.display = 'flex';
    }
    state.lastPractice = new Date().toISOString().split('T')[0];
    saveState();
    renderRoadmap();
});

// Audio test
document.getElementById('testAudioBtn')?.addEventListener('click', ()=>{
    const voice = ensureVoice();
    const btn = document.getElementById('testAudioBtn');
    if(voice){
        speakChinese('你好，我是你的中文老师。');
        btn.textContent = '🔊 Voice OK!';
        btn.style.borderColor = 'var(--jade)';
        btn.style.color = 'var(--jade)';
    } else {
        btn.textContent = '🔊 No Chinese voice found';
        btn.style.borderColor = 'var(--accent)';
        btn.style.color = 'var(--accent)';
        speakChinese('你好');
    }
    setTimeout(()=>{ if(btn){btn.textContent='🔊 Test Audio';btn.style.borderColor='';btn.style.color='';} }, 3000);
});

// Back buttons
document.getElementById('backToRoadmap')?.addEventListener('click', ()=> switchView('roadmapView'));
document.getElementById('backFromTone')?.addEventListener('click', ()=> switchView('roadmapView'));

// Lesson tabs
document.querySelectorAll('.l-tab').forEach(tab=>{
    tab.addEventListener('click', ()=>{
        if(!activeTopic) return;
        renderLessonTab(tab.dataset.ltab);
    });
});

// Hero CTA for Foundation tone practice
document.addEventListener('click', (e)=>{
    if(e.target.id === 'heroCta' || e.target.closest('[data-goto="tones"]')){
        switchView('tonePracticeView');
    }
});

// ===================== INIT =====================
updateTopStats();

// Check streak
if(state.lastPractice){
    const last = new Date(state.lastPractice);
    const today = new Date();
    const diff = Math.floor((today-last)/(1000*60*60*24));
    if(diff===1){ state.streak++; saveState(); }
    else if(diff>1){ state.streak=0; saveState(); }
}

// Always render roadmap content (will be visible when mainApp is shown)
renderRoadmap();

// Skip welcome for returning users
if(state.xp>0 || state.completedTopics.length>0 || state.lastPractice){
    const welcome = document.getElementById('welcomeScreen');
    const main = document.getElementById('mainApp');
    if(welcome) welcome.style.display = 'none';
    if(main) {
        main.classList.remove('hidden');
        main.style.display = 'flex';
    }
}

// Expose to global scope for inline HTML access
window.renderRoadmap = renderRoadmap;
window.switchView = switchView;
window.openTopic = openTopic;
window.renderLessonTab = renderLessonTab;
window.renderTonePractice = renderTonePractice;
window.renderSentenceBuilder = renderSentenceBuilder;
window.startQuiz = startQuiz;
window.showQuizQuestion = showQuizQuestion;
window.speakChinese = speakChinese;
window.TONES = TONES;
window.TOPICS = TOPICS;

})();