/**
 * shared.js - Shared state, models, audio preview engine, and utilities
 * Shared across: index.html (Studio), character-tree.html, voice-library.html
 */
(() => {
  "use strict";

  // 微软语音全套分类角色树库 (Azure & Edge TTS)
  const MS_VOICE_CATALOG = [
    // 旁白演播
    {
      id: "zh-CN-YunxiNeural",
      name: "云希",
      fullName: "zh-CN-YunxiNeural",
      gender: "male",
      category: "narrator",
      categoryLabel: "旁白演播",
      archetype: "沉稳磁性 · 小说旁白主役",
      tags: ["经典旁白", "多情感", "沉稳男声"],
      styles: ["narration-relaxed", "cheerful", "angry", "sad", "serious", "fearful", "whispering", "depressed"],
      defaultRate: 0,
      defaultPitch: 0.96,
      sampleText: "天地不仁，以万物为刍狗；日月经天，江河行地。",
    },
    {
      id: "zh-CN-XiaoxiaoNeural",
      name: "晓晓",
      fullName: "zh-CN-XiaoxiaoNeural",
      gender: "female",
      category: "narrator",
      categoryLabel: "旁白演播",
      archetype: "温暖知性 · 柔和文学叙事",
      tags: ["温暖女声", "多情感", "知性细腻"],
      styles: ["narration-relaxed", "cheerful", "angry", "sad", "serious", "gentle", "affectionate"],
      defaultRate: -0.02,
      defaultPitch: 1.04,
      sampleText: "微风拂过窗棂，那些沉封已久的故事，悄然拉开序幕。",
    },
    {
      id: "zh-CN-YunjianNeural",
      name: "云健",
      fullName: "zh-CN-YunjianNeural",
      gender: "male",
      category: "narrator",
      categoryLabel: "旁白演播",
      archetype: "激情解说 · 评书史诗演播",
      tags: ["评书史诗", "解说", "高昂有力"],
      styles: ["sports-commentary", "narration-relaxed", "serious"],
      defaultRate: 0.02,
      defaultPitch: 0.98,
      sampleText: "话说天下大势，分久必合，合久必分！",
    },
    {
      id: "zh-CN-XiaoqiuNeural",
      name: "晓秋",
      fullName: "zh-CN-XiaoqiuNeural",
      gender: "female",
      category: "narrator",
      categoryLabel: "旁白演播",
      archetype: "典雅深情 · 纪实文学朗诵",
      tags: ["优雅从容", "文学朗读"],
      styles: ["narration-relaxed", "gentle"],
      defaultRate: -0.03,
      defaultPitch: 0.98,
      sampleText: "岁月如水流逝，唯有那座石桥依旧静默在烟雨之中。",
    },
    {
      id: "zh-CN-YunyangNeural",
      name: "云扬",
      fullName: "zh-CN-YunyangNeural",
      gender: "male",
      category: "narrator",
      categoryLabel: "旁白演播",
      archetype: "端正庄重 · 播音主持",
      tags: ["专业播音", "新闻端正"],
      styles: ["newscast", "customerservice"],
      defaultRate: 0,
      defaultPitch: 1.0,
      sampleText: "本台消息，今日江南一带细雨连绵，商道渐次畅通。",
    },

    // 青年男主
    {
      id: "zh-CN-YunjieNeural",
      name: "云杰",
      fullName: "zh-CN-YunjieNeural",
      gender: "male",
      category: "youngMale",
      categoryLabel: "青年男主",
      archetype: "热血少侠 · 少年意气男主",
      tags: ["热血洒脱", "少年意气", "正派男主"],
      styles: ["chat", "cheerful", "angry", "serious"],
      defaultRate: 0.02,
      defaultPitch: 1.0,
      sampleText: "我若成佛，天下无魔；我若成魔，佛奈我何！",
    },
    {
      id: "zh-CN-YunfengNeural",
      name: "云枫",
      fullName: "zh-CN-YunfengNeural",
      gender: "male",
      category: "youngMale",
      categoryLabel: "青年男主",
      archetype: "温润公子 · 儒雅深情书生",
      tags: ["温文尔雅", "深情内敛"],
      styles: ["chat", "sad", "gentle"],
      defaultRate: -0.02,
      defaultPitch: 1.02,
      sampleText: "浮生若梦，若能护得所爱之人周全，此生足矣。",
    },
    {
      id: "zh-CN-YunhaoNeural",
      name: "云皓",
      fullName: "zh-CN-YunhaoNeural",
      gender: "male",
      category: "youngMale",
      categoryLabel: "青年男主",
      archetype: "朝气蓬勃 · 阳光机敏男青年",
      tags: ["活力自信", "阳光幽默"],
      styles: ["chat", "cheerful", "excited"],
      defaultRate: 0.04,
      defaultPitch: 1.02,
      sampleText: "别担心，前面的路就算再凶险，有我陪你闯过去！",
    },

    // 青年女主
    {
      id: "zh-CN-XiaohanNeural",
      name: "晓涵",
      fullName: "zh-CN-XiaohanNeural",
      gender: "female",
      category: "youngFemale",
      categoryLabel: "青年女主",
      archetype: "清纯柔美 · 出尘仙子女主",
      tags: ["灵动清纯", "多情感", "女主首选"],
      styles: ["gentle", "sad", "cheerful", "fearful", "affectionate"],
      defaultRate: 0.02,
      defaultPitch: 1.1,
      sampleText: "哪怕踏遍天涯海角，我也一定要找到当年的真相。",
    },
    {
      id: "zh-CN-XiaoyiNeural",
      name: "晓伊",
      fullName: "zh-CN-XiaoyiNeural",
      gender: "female",
      category: "youngFemale",
      categoryLabel: "青年女主",
      archetype: "活泼灵动 · 傲娇机敏少女",
      tags: ["清脆悦耳", "娇俏灵动"],
      styles: ["chat", "cheerful", "angry"],
      defaultRate: 0.04,
      defaultPitch: 1.15,
      sampleText: "哼，本姑娘才不稀罕你的好意呢，不过既然你开口了……",
    },
    {
      id: "zh-CN-XiaoshuangNeural",
      name: "晓双",
      fullName: "zh-CN-XiaoshuangNeural",
      gender: "female",
      category: "youngFemale",
      categoryLabel: "青年女主",
      archetype: "娇俏软萌 · 天真灵动师妹",
      tags: ["娇憨软萌", "少女闺蜜"],
      styles: ["cheerful"],
      defaultRate: 0.04,
      defaultPitch: 1.18,
      sampleText: "哇！师兄你快看，那边的桃花开得好漂亮呀！",
    },

    // 成熟中生
    {
      id: "zh-CN-YunyeNeural",
      name: "云野",
      fullName: "zh-CN-YunyeNeural",
      gender: "male",
      category: "mature",
      categoryLabel: "成熟中生",
      archetype: "豪迈宗师 · 威严将领硬汉",
      tags: ["霸气威严", "厚重有力"],
      styles: ["serious", "angry", "cheerful"],
      defaultRate: -0.02,
      defaultPitch: 0.92,
      sampleText: "三尺青锋在此，犯我山门者，杀无赦！",
    },
    {
      id: "zh-CN-XiaoruiNeural",
      name: "晓睿",
      fullName: "zh-CN-XiaoruiNeural",
      gender: "female",
      category: "mature",
      categoryLabel: "成熟中生",
      archetype: "冷静睿智 · 女掌门御姐",
      tags: ["干练从容", "睿智女强人"],
      styles: ["serious", "calm"],
      defaultRate: -0.02,
      defaultPitch: 0.98,
      sampleText: "成大事者不恤小耻，局势已定，容不得半分优柔寡断。",
    },
    {
      id: "zh-CN-XiaozhenNeural",
      name: "晓甄",
      fullName: "zh-CN-XiaozhenNeural",
      gender: "female",
      category: "mature",
      categoryLabel: "成熟中生",
      archetype: "雍容华贵 · 端庄贵妇掌门",
      tags: ["优雅典雅", "母仪天下"],
      styles: ["narration-relaxed", "gentle"],
      defaultRate: -0.03,
      defaultPitch: 0.98,
      sampleText: "在这深宫之中，唯有沉静自持，方能走得长远。",
    },
    {
      id: "zh-CN-XiaoyanNeural",
      name: "晓颜",
      fullName: "zh-CN-XiaoyanNeural",
      gender: "female",
      category: "mature",
      categoryLabel: "成熟中生",
      archetype: "温良温厚 · 贤淑长辈慈母",
      tags: ["亲切慈爱", "温婉从容"],
      styles: ["customerservice", "gentle"],
      defaultRate: -0.01,
      defaultPitch: 1.02,
      sampleText: "快趁热喝了这碗参汤吧，身子骨要紧。",
    },

    // 长者反派
    {
      id: "zh-CN-YunzeNeural",
      name: "云泽",
      fullName: "zh-CN-YunzeNeural",
      gender: "male",
      category: "elderVillain",
      categoryLabel: "长者反派",
      archetype: "沧桑老者 · 阴冷魔头宿敌",
      tags: ["阴鸷深沉", "苍老威严", "经典反派"],
      styles: ["serious", "angry", "depressed"],
      defaultRate: -0.06,
      defaultPitch: 0.82,
      sampleText: "桀桀桀……年轻人，你以为凭你那点微末道行，能翻得了天吗？",
    },
    {
      id: "zh-CN-XiaomoNeural",
      name: "晓墨",
      fullName: "zh-CN-XiaomoNeural",
      gender: "female",
      category: "elderVillain",
      categoryLabel: "长者反派",
      archetype: "诡谲老妪 · 阴鸷狠绝魔女",
      tags: ["变声多面", "阴郁诡谲"],
      styles: ["chat", "serious", "angry", "depressed", "whispering"],
      defaultRate: -0.04,
      defaultPitch: 0.88,
      sampleText: "既然落入了老身的幽冥幻境，就休想活着走出去！",
    },

    // 少儿童声
    {
      id: "zh-CN-YunxiaNeural",
      name: "云夏",
      fullName: "zh-CN-YunxiaNeural",
      gender: "male",
      category: "child",
      categoryLabel: "少儿童声",
      archetype: "淘气正太 · 机敏道童灵兽",
      tags: ["机灵调皮", "天真童声"],
      styles: ["cheerful"],
      defaultRate: 0.04,
      defaultPitch: 1.25,
      sampleText: "主人主人！快醒醒，前面的山洞里好像藏着大宝贝！",
    },
    {
      id: "zh-CN-XiaoyouNeural",
      name: "晓悠",
      fullName: "zh-CN-XiaoyouNeural",
      gender: "female",
      category: "child",
      categoryLabel: "少儿童声",
      archetype: "软萌萝莉 · 纯真可爱女童",
      tags: ["天真软糯", "童话伴读"],
      styles: ["cheerful", "gentle"],
      defaultRate: 0.02,
      defaultPitch: 1.3,
      sampleText: "大哥哥，月亮升起来了，你答应给我讲的神仙故事呢？",
    },

    // 方言特色
    {
      id: "zh-CN-Shaanxi-XiaoniNeural",
      name: "陕西晓妮",
      fullName: "zh-CN-Shaanxi-XiaoniNeural",
      gender: "female",
      category: "dialect",
      categoryLabel: "方言特色",
      archetype: "关中风味 · 豪爽秦腔质朴",
      tags: ["陕西方言", "质朴嘹亮"],
      styles: ["general"],
      defaultRate: 0,
      defaultPitch: 1.0,
      sampleText: "额跟你说，这事情可马虎不得，咱得办得稳稳当当的！",
    },
    {
      id: "zh-CN-Liaoning-XiaobeiNeural",
      name: "辽宁晓北",
      fullName: "zh-CN-Liaoning-XiaobeiNeural",
      gender: "female",
      category: "dialect",
      categoryLabel: "方言特色",
      archetype: "东北老铁 · 幽默接地气",
      tags: ["东北方言", "风趣幽默"],
      styles: ["cheerful"],
      defaultRate: 0.02,
      defaultPitch: 1.02,
      sampleText: "哎呀妈呀，老铁这可老厉害了，妥妥的没毛病！",
    },
    {
      id: "zh-CN-Sichuan-YunxiNeural",
      name: "四川云希",
      fullName: "zh-CN-Sichuan-YunxiNeural",
      gender: "male",
      category: "dialect",
      categoryLabel: "方言特色",
      archetype: "巴适麻辣 · 川味灵动风情",
      tags: ["四川方言", "巴适灵动"],
      styles: ["chat"],
      defaultRate: 0,
      defaultPitch: 1.0,
      sampleText: "莫慌嘛，吃碗麻辣小面，摆摆龙门阵，巴适得板！",
    },
    {
      id: "zh-CN-Shandong-YunxiangNeural",
      name: "山东云翔",
      fullName: "zh-CN-Shandong-YunxiangNeural",
      gender: "male",
      category: "dialect",
      categoryLabel: "方言特色",
      archetype: "齐鲁淳朴 · 忠厚实诚好汉",
      tags: ["山东方言", "厚道淳朴"],
      styles: ["chat"],
      defaultRate: 0,
      defaultPitch: 0.96,
      sampleText: "俺们庄户人家讲究的就是一个实诚，答应你的事绝不反悔！",
    },
    {
      id: "zh-HK-WanLungNeural",
      name: "香港云龙",
      fullName: "zh-HK-WanLungNeural",
      gender: "male",
      category: "dialect",
      categoryLabel: "方言特色",
      archetype: "港风豪杰 · 粤语评书叙事",
      tags: ["粤语男声", "港风评书"],
      styles: ["general"],
      defaultRate: -0.01,
      defaultPitch: 0.98,
      sampleText: "江湖風雲變幻莫測，今日一別，不知何日再相逢。",
    },
    {
      id: "zh-TW-HsiaoChenNeural",
      name: "台湾晓臻",
      fullName: "zh-TW-HsiaoChenNeural",
      gender: "female",
      category: "dialect",
      categoryLabel: "方言特色",
      archetype: "台湾腔国语 · 甜美柔和细腻",
      tags: ["台湾腔女声", "细腻深情"],
      styles: ["general"],
      defaultRate: 0,
      defaultPitch: 1.04,
      sampleText: "其實只要大家平平安安的，心裡就覺得好溫暖喔。",
    },

    // --- 扩展 Azure 官方高拟真小说角色音色 ---
    {
      id: "zh-CN-XiaomengNeural",
      name: "晓梦",
      fullName: "zh-CN-XiaomengNeural",
      gender: "female",
      category: "youngFemale",
      categoryLabel: "青年女主",
      archetype: "清冷仙子 · 出尘飘逸玄幻神女",
      tags: ["玄幻修真", "清冷仙气", "多情感"],
      styles: ["gentle", "sad", "whispering", "serious"],
      defaultRate: -0.01,
      defaultPitch: 1.1,
      sampleText: "天道渺茫，红尘如梦。你我既入仙门，便当割舍这俗世羁绊。",
    },
    {
      id: "zh-CN-XiaoxuanNeural",
      name: "晓萱",
      fullName: "zh-CN-XiaoxuanNeural",
      gender: "female",
      category: "youngFemale",
      categoryLabel: "青年女主",
      archetype: "自信职场 · 现代都市干练女主",
      tags: ["现代言情", "独立自信", "清晰明快"],
      styles: ["chat", "cheerful", "serious"],
      defaultRate: 0.02,
      defaultPitch: 1.06,
      sampleText: "市场不相信眼泪，既然拿下了这个项目，我们就要做到业界第一。",
    },
    {
      id: "zh-CN-XiaorouNeural",
      name: "晓柔",
      fullName: "zh-CN-XiaorouNeural",
      gender: "female",
      category: "youngFemale",
      categoryLabel: "青年女主",
      archetype: "凄婉柔弱 · 虐恋深情千金佳人",
      tags: ["虐恋悲情", "柔弱惹怜", "古典言情"],
      styles: ["sad", "gentle", "fearful"],
      defaultRate: -0.03,
      defaultPitch: 1.08,
      sampleText: "若你的心中早已有了旁人，又何必许我这一世浮华誓言……",
    },
    {
      id: "zh-CN-YunhaiNeural",
      name: "云海",
      fullName: "zh-CN-YunhaiNeural",
      gender: "male",
      category: "mature",
      categoryLabel: "成熟中生",
      archetype: "仙门尊者 · 飘逸修真掌教仙尊",
      tags: ["修仙宗主", "仙风道骨", "威严飘逸"],
      styles: ["serious", "narration-relaxed", "calm"],
      defaultRate: -0.02,
      defaultPitch: 0.94,
      sampleText: "万法归一，大道无形。今日尔等入我山门，当以守护苍生为己任！",
    },
    {
      id: "zh-CN-XiaochenNeural",
      name: "晓辰",
      fullName: "zh-CN-XiaochenNeural",
      gender: "male",
      category: "youngMale",
      categoryLabel: "青年男主",
      archetype: "阳光元气 · 青春校园朝气少年",
      tags: ["青春校园", "朝气活力", "阳光幽默"],
      styles: ["chat", "cheerful"],
      defaultRate: 0.03,
      defaultPitch: 1.02,
      sampleText: "喂！别磨蹭了，操场上的篮球赛马上就要开始了，快跟我来！",
    },
    {
      id: "zh-CN-Henan-YundengNeural",
      name: "河南云登",
      fullName: "zh-CN-Henan-YundengNeural",
      gender: "male",
      category: "dialect",
      categoryLabel: "方言特色",
      archetype: "中原风韵 · 憨厚质朴豪爽豫调",
      tags: ["河南方言", "质朴忠厚", "接地气"],
      styles: ["chat"],
      defaultRate: 0,
      defaultPitch: 0.98,
      sampleText: "中！这事包在俺身上，咱中原汉子说话算话，妥妥滴！",
    },
    {
      id: "zh-HK-HiuMaanNeural",
      name: "香港晓曼",
      fullName: "zh-HK-HiuMaanNeural",
      gender: "female",
      category: "dialect",
      categoryLabel: "方言特色",
      archetype: "港岛佳人 · 典雅粤语知性女主",
      tags: ["粤语女声", "港风典雅", "知性温婉"],
      styles: ["general"],
      defaultRate: 0,
      defaultPitch: 1.05,
      sampleText: "人生就好似一齣戲，兜兜轉轉，最緊要係活出真我。",
    },
    {
      id: "zh-HK-HiuGaaiNeural",
      name: "香港晓佳",
      fullName: "zh-HK-HiuGaaiNeural",
      gender: "female",
      category: "dialect",
      categoryLabel: "方言特色",
      archetype: "活泼港妹 · 娇俏粤语千金少女",
      tags: ["粤语甜美", "灵动少女", "娇俏港味"],
      styles: ["cheerful"],
      defaultRate: 0.03,
      defaultPitch: 1.14,
      sampleText: "點解你成日都咁木獨架？今日去銅鑼灣飲下午茶好唔好啊？",
    },
    {
      id: "zh-TW-YunJheNeural",
      name: "台湾云哲",
      fullName: "zh-TW-YunJheNeural",
      gender: "male",
      category: "dialect",
      categoryLabel: "方言特色",
      archetype: "偶像男主 · 温润磁性台湾国语",
      tags: ["台湾男声", "偶像剧温润", "深情治愈"],
      styles: ["general"],
      defaultRate: -0.01,
      defaultPitch: 0.98,
      sampleText: "只要妳轉過身，我一直都會在這裡等妳，不管多久都一樣。",
    },
    {
      id: "zh-TW-HsiaoYuNeural",
      name: "台湾晓雨",
      fullName: "zh-TW-HsiaoYuNeural",
      gender: "female",
      category: "dialect",
      categoryLabel: "方言特色",
      archetype: "文艺清纯 · 软糯甜美腔调少女",
      tags: ["台湾女声", "文艺软糯", "甜美治愈"],
      styles: ["general"],
      defaultRate: 0.01,
      defaultPitch: 1.1,
      sampleText: "那個……今天的天空好乾淨喔，微風吹過來真的好舒服。",
    },
    {
      id: "zh-CN-liaoning-YunbiaoNeural",
      name: "辽宁云彪",
      fullName: "zh-CN-liaoning-YunbiaoNeural",
      gender: "male",
      category: "dialect",
      categoryLabel: "方言特色",
      archetype: "关东硬汉 · 豪爽铁血江湖大哥",
      tags: ["东北方言", "硬汉豪爽", "重情重义"],
      styles: ["chat"],
      defaultRate: 0.01,
      defaultPitch: 0.92,
      sampleText: "兄弟，啥也别说了！今天谁敢动你一根汗毛，老子跟他死磕到底！",
    },
    {
      id: "zh-CN-shaanxi-YunxiangNeural",
      name: "陕西云翔",
      fullName: "zh-CN-shaanxi-YunxiangNeural",
      gender: "male",
      category: "dialect",
      categoryLabel: "方言特色",
      archetype: "秦川汉子 · 厚重大气古韵秦风",
      tags: ["陕西方言", "厚重大气", "关中豪杰"],
      styles: ["chat"],
      defaultRate: -0.01,
      defaultPitch: 0.94,
      sampleText: "这八百里秦川自古多豪杰，好男儿志在四方，岂能困守一隅！",
    },
    {
      id: "zh-CN-sichuan-YunyangNeural",
      name: "四川云阳",
      fullName: "zh-CN-sichuan-YunyangNeural",
      gender: "male",
      category: "dialect",
      categoryLabel: "方言特色",
      archetype: "锦官豪客 · 洒脱川味机敏书生",
      tags: ["四川方言", "机智幽默", "巴蜀风流"],
      styles: ["chat"],
      defaultRate: 0.02,
      defaultPitch: 0.98,
      sampleText: "哎呀呀，莫着急莫上火，船到桥头自然直，喝口盖碗茶再说嘛！",
    },
    {
      id: "zh-CN-shandong-XiaoniNeural",
      name: "山东晓妮",
      fullName: "zh-CN-shandong-XiaoniNeural",
      gender: "female",
      category: "dialect",
      categoryLabel: "方言特色",
      archetype: "齐鲁大嫚 · 质朴坦诚直率姑娘",
      tags: ["山东方言", "坦诚爽快", "热情淳朴"],
      styles: ["chat"],
      defaultRate: 0.01,
      defaultPitch: 1.02,
      sampleText: "俺们山东人直肠子，有啥说啥，能帮上你的忙俺心里就亮堂！",
    },
  ];

  const MS_VOICE_MAP = {};
  MS_VOICE_CATALOG.forEach((v) => {
    MS_VOICE_MAP[v.id] = v;
  });

  /* -------------------------------------------------------------
     GitHub 开源 AI 语音库 (Open-Source Speech & Audiobook Models)
     汇聚 GitHub 热门开源大模型：Qwen3-TTS / Alexandria, CosyVoice, ChatTTS, F5-TTS, GPT-SoVITS, Fish-Speech
  ------------------------------------------------------------- */
  const GITHUB_AI_VOICE_CATALOG = [
    // 1. Alexandria Audiobook / Qwen3-TTS (Finrandojin/alexandria-audiobook)
    {
      id: "github-alexandria-storyteller",
      name: "千问·评书大宗师",
      fullName: "alexandria-qwen3-storyteller",
      gender: "male",
      category: "narrator",
      categoryLabel: "开源评书主役",
      repo: "Finrandojin/alexandria-audiobook",
      repoUrl: "https://github.com/Finrandojin/alexandria-audiobook",
      modelTech: "Qwen3-TTS 8B · Alexandria LoRA",
      archetype: "雄浑厚重 · 金戈铁马评书大宗师",
      tags: ["Alexandria", "Qwen3-TTS", "评书演播", "单田芳风骨"],
      styles: ["narration-relaxed", "serious", "sports-commentary"],
      defaultRate: -0.02,
      defaultPitch: 0.94,
      sampleText: "欲知后事如何，且听下回分解！话说那道凌厉剑气，直破九重云霄！",
    },
    {
      id: "github-alexandria-swordmaster",
      name: "千问·剑宗少侠",
      fullName: "alexandria-qwen3-swordmaster",
      gender: "male",
      category: "youngMale",
      categoryLabel: "青年男主",
      repo: "Finrandojin/alexandria-audiobook",
      repoUrl: "https://github.com/Finrandojin/alexandria-audiobook",
      modelTech: "Qwen3-TTS 8B · Alexandria LoRA",
      archetype: "鲜衣怒马 · 少年意气拔剑破空",
      tags: ["Alexandria", "Qwen3-TTS", "修仙少侠", "热血男主"],
      styles: ["chat", "cheerful", "angry"],
      defaultRate: 0.02,
      defaultPitch: 1.0,
      sampleText: "我辈修士何惜一战？纵是万劫不复，这柄青锋剑也绝不退缩半分！",
    },
    {
      id: "github-alexandria-fairywangshu",
      name: "千问·望舒仙子",
      fullName: "alexandria-qwen3-fairywangshu",
      gender: "female",
      category: "youngFemale",
      categoryLabel: "青年女主",
      repo: "Finrandojin/alexandria-audiobook",
      repoUrl: "https://github.com/Finrandojin/alexandria-audiobook",
      modelTech: "Qwen3-TTS 8B · Alexandria LoRA",
      archetype: "清冷出尘 · 太上忘情空灵仙子",
      tags: ["Alexandria", "Qwen3-TTS", "清冷仙女", "出尘脱俗"],
      styles: ["gentle", "sad", "whispering"],
      defaultRate: -0.02,
      defaultPitch: 1.12,
      sampleText: "红尘百转，皆如露如电。你所执着的恩怨，在天道面前不过沧海一粟。",
    },
    {
      id: "github-alexandria-demonlord",
      name: "千问·九幽魔皇",
      fullName: "alexandria-qwen3-demonlord",
      gender: "male",
      category: "elderVillain",
      categoryLabel: "长者反派",
      repo: "Finrandojin/alexandria-audiobook",
      repoUrl: "https://github.com/Finrandojin/alexandria-audiobook",
      modelTech: "Qwen3-TTS 8B · Alexandria LoRA",
      archetype: "阴郁森然 · 九幽至尊威压天下",
      tags: ["Alexandria", "Qwen3-TTS", "魔道至尊", "阴鸷反派"],
      styles: ["serious", "angry", "depressed"],
      defaultRate: -0.06,
      defaultPitch: 0.82,
      sampleText: "本座隐忍三千载，待封印破开之日，天地众生皆当臣服在九幽王座之下！",
    },
    {
      id: "github-alexandria-foxjunior",
      name: "千问·灵狐小师妹",
      fullName: "alexandria-qwen3-foxjunior",
      gender: "female",
      category: "child",
      categoryLabel: "少儿童声",
      repo: "Finrandojin/alexandria-audiobook",
      repoUrl: "https://github.com/Finrandojin/alexandria-audiobook",
      modelTech: "Qwen3-TTS 8B · Alexandria LoRA",
      archetype: "娇憨明媚 · 古灵精怪天真仙宠",
      tags: ["Alexandria", "Qwen3-TTS", "灵宠萌妹", "机敏活泼"],
      styles: ["cheerful", "chat"],
      defaultRate: 0.04,
      defaultPitch: 1.28,
      sampleText: "师兄师兄！快把藏在储物袋里的九叶灵芝拿出来尝尝嘛，我都闻到香味啦！",
    },

    // 2. CosyVoice (FunAudioLLM/CosyVoice)
    {
      id: "github-cosyvoice-narrator",
      name: "CosyVoice·自然演播",
      fullName: "funaudio-cosyvoice-narrator",
      gender: "male",
      category: "narrator",
      categoryLabel: "沉浸演播",
      repo: "FunAudioLLM/CosyVoice",
      repoUrl: "https://github.com/FunAudioLLM/CosyVoice",
      modelTech: "CosyVoice-300M · Multi-Emotion Flow",
      archetype: "电影质感 · 沉浸式小说文学叙事",
      tags: ["CosyVoice", "阿里开源", "电影质感", "多情感大模型"],
      styles: ["narration-relaxed", "gentle", "serious"],
      defaultRate: -0.01,
      defaultPitch: 0.96,
      sampleText: "夜雨洗净了石阶上的青苔，马蹄声由远及近，敲碎了古镇深巷里长久的寂静。",
    },
    {
      id: "github-cosyvoice-hotblood",
      name: "CosyVoice·热血少侠",
      fullName: "funaudio-cosyvoice-hotblood",
      gender: "male",
      category: "youngMale",
      categoryLabel: "青年男主",
      repo: "FunAudioLLM/CosyVoice",
      repoUrl: "https://github.com/FunAudioLLM/CosyVoice",
      modelTech: "CosyVoice-300M · Instruct Fine-Tuned",
      archetype: "高燃国漫 · 不屈呐喊逆天改命",
      tags: ["CosyVoice", "国漫主角", "热血激情"],
      styles: ["cheerful", "angry", "chat"],
      defaultRate: 0.03,
      defaultPitch: 1.02,
      sampleText: "天若压我，我便劈碎这苍穹；地若拘我，我便踏平这厚土！",
    },
    {
      id: "github-cosyvoice-foxempress",
      name: "CosyVoice·天狐御姐",
      fullName: "funaudio-cosyvoice-foxempress",
      gender: "female",
      category: "mature",
      categoryLabel: "成熟女主",
      repo: "FunAudioLLM/CosyVoice",
      repoUrl: "https://github.com/FunAudioLLM/CosyVoice",
      modelTech: "CosyVoice-300M · Emotional Prompting",
      archetype: "魅惑威严 · 算无遗策妖族女帝",
      tags: ["CosyVoice", "成熟御姐", "算无遗策", "妖皇女帝"],
      styles: ["serious", "whispering", "calm"],
      defaultRate: -0.02,
      defaultPitch: 0.96,
      sampleText: "世人皆道我心狠手辣，可若不先执掌棋局，你我不过是他人生死案上的鱼肉罢了。",
    },
    {
      id: "github-cosyvoice-zenmonk",
      name: "CosyVoice·扫地老僧",
      fullName: "funaudio-cosyvoice-zenmonk",
      gender: "male",
      category: "elderVillain",
      categoryLabel: "长者宗师",
      repo: "FunAudioLLM/CosyVoice",
      repoUrl: "https://github.com/FunAudioLLM/CosyVoice",
      modelTech: "CosyVoice-300M · Deep Timbre",
      archetype: "暮鼓晨钟 · 看破红尘少林神僧",
      tags: ["CosyVoice", "得道高僧", "慈悲苍老", "世外宗师"],
      styles: ["serious", "gentle"],
      defaultRate: -0.05,
      defaultPitch: 0.84,
      sampleText: "阿弥陀佛，执念如镜花水月，施主既然放不下，便在藏经阁中多参悟几年吧。",
    },

    // 3. ChatTTS (2noise/ChatTTS)
    {
      id: "github-chattts-teahouse",
      name: "ChatTTS·茶馆说书",
      fullName: "chattts-teahouse-storyteller",
      gender: "male",
      category: "narrator",
      categoryLabel: "市井说书",
      repo: "2noise/ChatTTS",
      repoUrl: "https://github.com/2noise/ChatTTS",
      modelTech: "ChatTTS · Conversational Diffusion",
      archetype: "笑叹自如 · 极富口语呼吸感与市井烟火",
      tags: ["ChatTTS", "拟真对话", "口语笑叹", "市井江湖"],
      styles: ["chat", "cheerful"],
      defaultRate: 0.0,
      defaultPitch: 0.98,
      sampleText: "哈哈，列位看官可听真切喽！那店家手里握着的不是酒壶，分明是半截淬了毒的柳叶飞刀啊！",
    },
    {
      id: "github-chattts-urbanmale",
      name: "ChatTTS·随性青年",
      fullName: "chattts-urban-male",
      gender: "male",
      category: "youngMale",
      categoryLabel: "青年男主",
      repo: "2noise/ChatTTS",
      repoUrl: "https://github.com/2noise/ChatTTS",
      modelTech: "ChatTTS · Natural Pause Engine",
      archetype: "慵懒松弛 · 都市生活对白男声",
      tags: ["ChatTTS", "现代日常", "松弛感", "真实呼吸"],
      styles: ["chat"],
      defaultRate: 0.02,
      defaultPitch: 1.0,
      sampleText: "呃……说实话，这事儿真没你想的那么复杂，反正兵来将挡，水来土掩嘛。",
    },
    {
      id: "github-chattts-livelygirl",
      name: "ChatTTS·灵动少女",
      fullName: "chattts-lively-female",
      gender: "female",
      category: "youngFemale",
      categoryLabel: "青年女主",
      repo: "2noise/ChatTTS",
      repoUrl: "https://github.com/2noise/ChatTTS",
      modelTech: "ChatTTS · Laugh Token Model",
      archetype: "活泼灵俏 · 带气口轻笑灵动对白",
      tags: ["ChatTTS", "灵动轻笑", "日常对白", "真实少女"],
      styles: ["cheerful", "chat"],
      defaultRate: 0.03,
      defaultPitch: 1.15,
      sampleText: "噗嗤……你这人怎么总是傻乎乎的，好啦好啦，本姑娘陪你一起去还不行嘛！",
    },

    // 4. F5-TTS (SWivid/F5-TTS)
    {
      id: "github-f5-cybercommando",
      name: "F5-TTS·赛博特勤",
      fullName: "f5tts-cyber-commando",
      gender: "male",
      category: "mature",
      categoryLabel: "冷冽特勤",
      repo: "SWivid/F5-TTS",
      repoUrl: "https://github.com/SWivid/F5-TTS",
      modelTech: "F5-TTS · Flow Matching DiT",
      archetype: "硬核冷峻 · 未来机甲无机质指令",
      tags: ["F5-TTS", "Flow Matching", "赛博科幻", "硬核机甲"],
      styles: ["serious", "calm"],
      defaultRate: 0.02,
      defaultPitch: 0.9,
      sampleText: "警告：核心聚变反应堆温度逼近临界值，战术外骨骼已切换为超载攻防模式。",
    },
    {
      id: "github-f5-epicchronicle",
      name: "F5-TTS·编年史叙事",
      fullName: "f5tts-epic-chronicle",
      gender: "male",
      category: "narrator",
      categoryLabel: "浩瀚叙事",
      repo: "SWivid/F5-TTS",
      repoUrl: "https://github.com/SWivid/F5-TTS",
      modelTech: "F5-TTS · Zero-Shot High-Fidelity",
      archetype: "全知浩瀚 · 跨越万年的星际史诗",
      tags: ["F5-TTS", "星际史诗", "全知视角", "宏大叙事"],
      styles: ["narration-relaxed", "serious"],
      defaultRate: -0.03,
      defaultPitch: 0.94,
      sampleText: "在群星熄灭的三百万年后，孤独的科考船终于捕获了来自母星的第一束微弱信标。",
    },
    {
      id: "github-f5-nightstalker",
      name: "F5-TTS·暗夜宿敌",
      fullName: "f5tts-night-stalker",
      gender: "male",
      category: "elderVillain",
      categoryLabel: "窒息反派",
      repo: "SWivid/F5-TTS",
      repoUrl: "https://github.com/SWivid/F5-TTS",
      modelTech: "F5-TTS · Deep Resonance",
      archetype: "极度压迫 · 窒息阴森黑暗主宰",
      tags: ["F5-TTS", "悬疑惊悚", "阴郁反派", "极度压迫"],
      styles: ["whispering", "serious"],
      defaultRate: -0.05,
      defaultPitch: 0.8,
      sampleText: "别白费力气了……当你凝视深渊的那一刻起，你的影子就已经属于我了。",
    },

    // 5. GPT-SoVITS (RVC-Boss/GPT-SoVITS)
    {
      id: "github-gptsovits-swordpoet",
      name: "GPT-SoVITS·青莲剑仙",
      fullName: "gptsovits-sword-poet",
      gender: "male",
      category: "youngMale",
      categoryLabel: "纵酒剑仙",
      repo: "RVC-Boss/GPT-SoVITS",
      repoUrl: "https://github.com/RVC-Boss/GPT-SoVITS",
      modelTech: "GPT-SoVITS · Few-Shot Clone",
      archetype: "纵酒长歌 · 豪迈洒脱青莲剑仙",
      tags: ["GPT-SoVITS", "声音克隆", "剑仙诗酒", "豪放不羁"],
      styles: ["cheerful", "chat"],
      defaultRate: 0.01,
      defaultPitch: 0.98,
      sampleText: "大鹏一日同风起，扶摇直上九万里！小友，且饮了这盏浊酒，看我一剑破千军！",
    },
    {
      id: "github-gptsovits-daoboy",
      name: "GPT-SoVITS·软萌小道童",
      fullName: "gptsovits-daoist-boy",
      gender: "male",
      category: "child",
      categoryLabel: "机敏道童",
      repo: "RVC-Boss/GPT-SoVITS",
      repoUrl: "https://github.com/RVC-Boss/GPT-SoVITS",
      modelTech: "GPT-SoVITS · Voice Design",
      archetype: "天真烂漫 · 仙山炼丹纯真道童",
      tags: ["GPT-SoVITS", "软萌仙童", "修仙道童", "少儿童音"],
      styles: ["cheerful"],
      defaultRate: 0.04,
      defaultPitch: 1.32,
      sampleText: "师傅闭关前交代过了，今日开炉炼造凝气丹，谁要是敢偷懒，就罚抄道德经一百遍！",
    },

    // 6. Fish-Speech (fishaudio/fish-speech)
    {
      id: "github-fish-broadcast",
      name: "Fish·电台超清演播",
      fullName: "fishaudio-speech-broadcast",
      gender: "male",
      category: "narrator",
      categoryLabel: "超清电台",
      repo: "fishaudio/fish-speech",
      repoUrl: "https://github.com/fishaudio/fish-speech",
      modelTech: "Fish-Speech · Autoregressive Dual-Token",
      archetype: "广播剧质感 · 磁性温润电影级旁白",
      tags: ["Fish-Speech", "自回归TTS", "广播剧", "高保真音频"],
      styles: ["narration-relaxed", "gentle"],
      defaultRate: -0.01,
      defaultPitch: 0.95,
      sampleText: "这里是夜航电台。在这个寂静的深夜，愿这段故事能够陪伴每一位尚未入眠的行者。",
    },
  ];

  const GITHUB_AI_VOICE_MAP = {};
  GITHUB_AI_VOICE_CATALOG.forEach((v) => {
    GITHUB_AI_VOICE_MAP[v.id] = v;
  });

  /* -------------------------------------------------------------
     AI 漫剧全年龄段爆款角色语音库 (AI Comic Drama Voice Universe)
     参考当前主流短剧/动态漫，系统覆盖：幼年萌宝、少年热血、青年仙尊/霸总、成熟掌门/御姐、沧桑魔尊/老者
  ------------------------------------------------------------- */
  const AI_MANGA_VOICE_CATALOG = [
    // 1. 漫剧全知/高燃解说旁白 (All-Ages Narrative)
    {
      id: "zh-CN-YunxiNeural",
      name: "云希 · 漫剧全知史诗旁白",
      fullName: "zh-CN-YunxiNeural",
      gender: "male",
      ageGroup: "adult",
      ageBand: "全知旁白",
      category: "narrator",
      categoryLabel: "漫剧主线旁白",
      series: "主线叙事",
      archetype: "电影质感 · 宏大沉浸短剧与漫剧解说",
      tags: ["AI漫剧热播", "霸榜男主讲", "男低音", "沉稳史诗"],
      styles: ["narration-relaxed", "serious"],
      defaultRate: -0.02,
      defaultPitch: 0.96,
      sampleText: "天道崩塌，诸神陨落。少年从深渊中爬出，手中那柄残破断剑，正发出嗜血的低鸣！",
    },
    {
      id: "zh-CN-YunjianNeural",
      name: "云健 · 漫剧高能卡点解说",
      fullName: "zh-CN-YunjianNeural",
      gender: "male",
      ageGroup: "adult",
      ageBand: "高能爆点",
      category: "narrator",
      categoryLabel: "高能打脸解说",
      series: "主线叙事",
      archetype: "高燃快节奏 · 短剧反转爆点演播",
      tags: ["爆款短剧", "逆袭打脸", "高能卡点", "节奏拉满"],
      styles: ["sports-commentary", "cheerful"],
      defaultRate: 0.04,
      defaultPitch: 0.98,
      sampleText: "注意看，这个男人叫龙傲天！三年前被家族逐出山门，三年后携万千战神强势归来！",
    },
    {
      id: "zh-CN-XiaoxiaoNeural",
      name: "晓晓 · 唯美言情漫剧旁白",
      fullName: "zh-CN-XiaoxiaoNeural",
      gender: "female",
      ageGroup: "adult",
      ageBand: "言情唯美",
      category: "narrator",
      categoryLabel: "甜宠言情旁白",
      series: "主线叙事",
      archetype: "温婉动人 · 穿越重生唯美叙事",
      tags: ["言情漫剧", "古风穿越", "娓娓道来", "情感治愈"],
      styles: ["gentle", "narration-relaxed"],
      defaultRate: 0.0,
      defaultPitch: 1.02,
      sampleText: "那一世桃花树下的回眸，成了她此后三百年万劫不复的执念。",
    },

    // 2. 幼年/童年/萌宝灵宠 (Child & Mascot, 3~12岁)
    {
      id: "zh-CN-XiaoyouNeural",
      name: "晓悠 · 软萌奶气小千金",
      fullName: "zh-CN-XiaoyouNeural",
      gender: "female",
      ageGroup: "child",
      ageBand: "3~8岁 幼童",
      category: "child",
      categoryLabel: "奶气萌宝 (3-8岁)",
      series: "萌宝团宠",
      archetype: "奶团子 · 萌翻全场的团宠小千金",
      tags: ["萌宝漫剧", "团宠小千金", "奶声奶气", "治愈萌系"],
      styles: ["cheerful", "gentle"],
      defaultRate: 0.02,
      defaultPitch: 1.25,
      sampleText: "爹爹抱抱！娘亲说了，今天要是爹爹不亲小宝一口，小宝就不吃糖葫芦啦！",
    },
    {
      id: "zh-CN-YunxiaNeural",
      name: "云夏 · 淘气机敏小正太",
      fullName: "zh-CN-YunxiaNeural",
      gender: "male",
      ageGroup: "child",
      ageBand: "6~12岁 正太",
      category: "child",
      categoryLabel: "机敏正太 (6-12岁)",
      series: "萌宝团宠",
      archetype: "机敏小道童 · 捉狭捣蛋天才少爷",
      tags: ["淘气小少爷", "天才神童", "童真活力"],
      styles: ["cheerful"],
      defaultRate: 0.04,
      defaultPitch: 1.2,
      sampleText: "略略略！大笨蛋坏叔叔，你以为布个烂阵法就能困住本少爷吗？看我的破天符！",
    },
    {
      id: "github-alexandria-foxjunior",
      name: "灵狐小师妹 · 傲娇撒娇仙宠",
      fullName: "alexandria-qwen3-foxjunior",
      gender: "female",
      ageGroup: "child",
      ageBand: "灵兽萌宠",
      category: "child",
      categoryLabel: "化形仙宠",
      series: "萌宝团宠",
      archetype: "娇憨灵狐 · 贪吃粘人的化形仙宠",
      tags: ["仙侠灵宠", "萌系化形", "娇憨软糯"],
      styles: ["cheerful", "chat"],
      defaultRate: 0.04,
      defaultPitch: 1.28,
      sampleText: "主人主人！储物袋里的九转灵丹被我当糖豆吃完了，呜呜，不要打尾巴嘛！",
    },

    // 3. 少年意气/宗门逆袭期 (Youth, 13~18岁)
    {
      id: "zh-CN-YunjieNeural",
      name: "云杰 · 热血少年漫逆袭男主",
      fullName: "zh-CN-YunjieNeural",
      gender: "male",
      ageGroup: "young",
      ageBand: "14~18岁 少年",
      category: "youngMale",
      categoryLabel: "热血少侠 (14-18岁)",
      series: "修真逆袭",
      archetype: "三十年河东 · 逆天不屈少年意气",
      tags: ["爆燃主角", "少年漫主役", "绝不认输", "废柴逆袭"],
      styles: ["chat", "angry", "cheerful"],
      defaultRate: 0.02,
      defaultPitch: 1.0,
      sampleText: "你们骂我是不能聚气的废柴？睁大眼睛看清楚，今天破开这天地神劫的，就是我！",
    },
    {
      id: "zh-CN-XiaochenNeural",
      name: "晓辰 · 阳光洒脱小师弟",
      fullName: "zh-CN-XiaochenNeural",
      gender: "male",
      ageGroup: "young",
      ageBand: "15~18岁 少年",
      category: "youngMale",
      categoryLabel: "阳光元气 (15-18岁)",
      series: "修真逆袭",
      archetype: "鲜衣怒马 · 仗剑走天涯元气少年",
      tags: ["阳光正直", "快意恩仇", "仗义热忱"],
      styles: ["chat", "cheerful"],
      defaultRate: 0.03,
      defaultPitch: 1.02,
      sampleText: "喂，师姐！下山捉妖这么好玩的事儿，你竟然想抛下我偷偷去？等等我！",
    },
    {
      id: "zh-CN-XiaoshuangNeural",
      name: "晓双 · 娇俏天真小师妹",
      fullName: "zh-CN-XiaoshuangNeural",
      gender: "female",
      ageGroup: "young",
      ageBand: "14~17岁 少女",
      category: "youngFemale",
      categoryLabel: "灵俏师妹 (14-17岁)",
      series: "甜宠言情",
      archetype: "甜度拉满 · 活泼灵动宗门小师妹",
      tags: ["娇憨甜妹", "宗门团宠", "天真浪漫"],
      styles: ["cheerful"],
      defaultRate: 0.04,
      defaultPitch: 1.18,
      sampleText: "师兄，你看后山的灵桃熟透啦，我们去偷摘几个烤着吃好不好？师傅发现了我顶着！",
    },
    {
      id: "zh-CN-XiaoyiNeural",
      name: "晓伊 · 傲娇毒舌千金青梅",
      fullName: "zh-CN-XiaoyiNeural",
      gender: "female",
      ageGroup: "young",
      ageBand: "15~18岁 少女",
      category: "youngFemale",
      categoryLabel: "傲娇青梅 (15-18岁)",
      series: "甜宠言情",
      archetype: "口是心非 · 刀子嘴豆腐心傲娇少女",
      tags: ["傲娇青梅", "口嫌体正直", "俏皮清脆"],
      styles: ["chat", "angry", "cheerful"],
      defaultRate: 0.04,
      defaultPitch: 1.15,
      sampleText: "谁、谁特意为你求的平安符了？这只是路边算命摊买一送一顺带拿的，不要就扔掉！",
    },

    // 4. 青年主役/仙尊/霸总/神女 (Young Adult, 19~28岁)
    {
      id: "zh-CN-YunyeNeural",
      name: "云野 · 孤傲冷酷霸总/魔皇仙尊",
      fullName: "zh-CN-YunyeNeural",
      gender: "male",
      ageGroup: "adult",
      ageBand: "22~28岁 青年",
      category: "mature",
      categoryLabel: "高冷霸总/仙尊 (22-28岁)",
      series: "战神霸总",
      archetype: "磁性低音炮 · 杀伐果断禁欲帝尊与总裁",
      tags: ["磁性低音炮", "帝尊霸总", "极度危险", "唯我独尊"],
      styles: ["serious", "angry"],
      defaultRate: -0.02,
      defaultPitch: 0.92,
      sampleText: "跪下。这世间敢直视本座双眼的人，除了你，其余都已经化作了黄土。",
    },
    {
      id: "zh-CN-YunfengNeural",
      name: "云枫 · 白月光儒雅公子",
      fullName: "zh-CN-YunfengNeural",
      gender: "male",
      ageGroup: "young",
      ageBand: "20~25岁 青年",
      category: "youngMale",
      categoryLabel: "温润白月光 (20-25岁)",
      series: "甜宠言情",
      archetype: "君子如玉 · 温柔深情守候者",
      tags: ["白月光男二", "温润如玉", "深情治愈"],
      styles: ["gentle", "chat"],
      defaultRate: -0.01,
      defaultPitch: 1.0,
      sampleText: "阿阮，若这天下容不下你，我便陪你弃了这仙道，浪迹山水，共度余生。",
    },
    {
      id: "github-gptsovits-swordpoet",
      name: "青莲剑仙 · 纵酒狂傲剑仙",
      fullName: "gptsovits-sword-poet",
      gender: "male",
      ageGroup: "young",
      ageBand: "20~26岁 青年",
      category: "youngMale",
      categoryLabel: "狂傲剑客 (20-26岁)",
      series: "修真逆袭",
      archetype: "不羁浪子 · 诗剑双绝天下无双",
      tags: ["狂傲男主", "剑仙诗酒", "大鹏同风"],
      styles: ["cheerful", "chat"],
      defaultRate: 0.01,
      defaultPitch: 0.98,
      sampleText: "天不生我李长歌，剑道万古如长夜！诸位贼子，可接得下我这一剑开天门？！",
    },
    {
      id: "zh-CN-XiaomengNeural",
      name: "晓梦 · 清冷出尘神女/冰山师尊",
      fullName: "zh-CN-XiaomengNeural",
      gender: "female",
      ageGroup: "young",
      ageBand: "20~25岁 青年",
      category: "youngFemale",
      categoryLabel: "清冷神女 (20-25岁)",
      series: "修真逆袭",
      archetype: "高岭之花 · 太上忘情绝色师尊",
      tags: ["冰山美人", "绝色神女", "清冷空灵"],
      styles: ["whispering", "gentle", "serious"],
      defaultRate: -0.01,
      defaultPitch: 1.1,
      sampleText: "修仙者当斩断凡尘情丝。你口中所谓的喜欢，不过是心魔作祟罢了。",
    },
    {
      id: "zh-CN-XiaorouNeural",
      name: "晓柔 · 凄美深情/虐恋千金女主",
      fullName: "zh-CN-XiaorouNeural",
      gender: "female",
      ageGroup: "young",
      ageBand: "18~24岁 青年",
      category: "youngFemale",
      categoryLabel: "凄美千金 (18-24岁)",
      series: "甜宠言情",
      archetype: "我见犹怜 · 虐恋情深惹人落泪",
      tags: ["虐恋悲情", "柔弱惹怜", "声线动情"],
      styles: ["sad", "gentle", "fearful"],
      defaultRate: -0.03,
      defaultPitch: 1.08,
      sampleText: "如果剜去这颗玲珑心能换你此生安宁，那这条命……你拿去便是。",
    },
    {
      id: "zh-CN-XiaoxuanNeural",
      name: "晓萱 · 飒爽独立/大女主反杀",
      fullName: "zh-CN-XiaoxuanNeural",
      gender: "female",
      ageGroup: "young",
      ageBand: "22~26岁 青年",
      category: "youngFemale",
      categoryLabel: "飒爽大女主 (22-26岁)",
      series: "战神霸总",
      archetype: "干练果决 · 智商在线绝地反杀",
      tags: ["大女主题材", "双商在线", "反杀打脸"],
      styles: ["serious", "chat", "cheerful"],
      defaultRate: 0.02,
      defaultPitch: 1.05,
      sampleText: "收起你那套恩赐的嘴脸！今日不是你们霍家休我，而是我陆昭华，休了你！",
    },
    {
      id: "zh-CN-XiaohanNeural",
      name: "晓涵 · 心机绿茶/两面三刀女配",
      fullName: "zh-CN-XiaohanNeural",
      gender: "female",
      ageGroup: "young",
      ageBand: "19~24岁 青年",
      category: "youngFemale",
      categoryLabel: "心机女配 (19-24岁)",
      series: "主线叙事",
      archetype: "两面三刀 · 娇滴滴陷害原女主",
      tags: ["茶艺大师", "漫剧反转", "心机做作"],
      styles: ["gentle", "fearful"],
      defaultRate: 0.02,
      defaultPitch: 1.12,
      sampleText: "王爷别怪姐姐……都是臣妾不好，不该惹姐姐生气，姐姐推我下水一定不是故意的，咳咳……",
    },

    // 5. 成熟中生/掌门/主母/将领 (Mature, 30~50岁)
    {
      id: "zh-CN-YunhaiNeural",
      name: "云海 · 威严掌门/仙宗巨擘",
      fullName: "zh-CN-YunhaiNeural",
      gender: "male",
      ageGroup: "adult",
      ageBand: "40~55岁 中年",
      category: "mature",
      categoryLabel: "仙门至尊 (40-55岁)",
      series: "修真逆袭",
      archetype: "定海神针 · 威震八荒不怒自威",
      tags: ["仙门宗主", "浩然正气", "沉稳威严"],
      styles: ["serious", "narration-relaxed"],
      defaultRate: -0.02,
      defaultPitch: 0.94,
      sampleText: "今日老夫在此，谁敢伤我玄天宗弟子一人，老夫便荡平他九族满门！",
    },
    {
      id: "github-cosyvoice-foxempress",
      name: "天狐御姐 · 妖皇女帝/霸气主母",
      fullName: "funaudio-cosyvoice-foxempress",
      gender: "female",
      ageGroup: "adult",
      ageBand: "30~40岁 中年",
      category: "mature",
      categoryLabel: "霸气御姐 (30-40岁)",
      series: "战神霸总",
      archetype: "绝世风华 · 算无遗策翻手为云",
      tags: ["妖族女帝", "气场两米八", "狂拽御姐"],
      styles: ["serious", "calm"],
      defaultRate: -0.02,
      defaultPitch: 0.96,
      sampleText: "普天之下莫非王土，本座看上的人，阎王来了也休想带走半步！",
    },
    {
      id: "zh-CN-XiaozhenNeural",
      name: "晓甄 · 豪门掌权主母/皇后",
      fullName: "zh-CN-XiaozhenNeural",
      gender: "female",
      ageGroup: "adult",
      ageBand: "38~50岁 中年",
      category: "mature",
      categoryLabel: "豪门主母 (38-50岁)",
      series: "战神霸总",
      archetype: "深沉老练 · 家族掌舵人",
      tags: ["豪门恩怨", "端庄心机", "母仪天下"],
      styles: ["narration-relaxed", "gentle"],
      defaultRate: -0.03,
      defaultPitch: 0.98,
      sampleText: "在这霍家大院里，没有规矩不成方圆。来人，掌嘴三十，让她长长记性！",
    },
    {
      id: "zh-CN-XiaoyanNeural",
      name: "晓颜 · 慈爱温厚师母/长辈",
      fullName: "zh-CN-XiaoyanNeural",
      gender: "female",
      ageGroup: "adult",
      ageBand: "40~55岁 中年",
      category: "mature",
      categoryLabel: "慈爱长辈 (40-55岁)",
      series: "甜宠言情",
      archetype: "温婉贤淑 · 默默守护的慈母师娘",
      tags: ["慈母长辈", "温情治愈", "亲切温厚"],
      styles: ["customerservice", "gentle"],
      defaultRate: -0.01,
      defaultPitch: 1.02,
      sampleText: "好孩子，受委屈了吧？快把这参汤喝了，万事有师娘替你做主。",
    },

    // 6. 沧桑长者/神僧/魔尊幕后 (Elder / Villain, 60~100+岁)
    {
      id: "github-cosyvoice-zenmonk",
      name: "扫地神僧 · 绝世隐世老仙翁",
      fullName: "funaudio-cosyvoice-zenmonk",
      gender: "male",
      ageGroup: "elder",
      ageBand: "70~90岁 长者",
      category: "elderVillain",
      categoryLabel: "隐世神僧 (70-90岁)",
      series: "修真逆袭",
      archetype: "暮鼓晨钟 · 看透红尘世外高人",
      tags: ["扫地僧", "深不可测", "世外高人"],
      styles: ["serious", "gentle"],
      defaultRate: -0.05,
      defaultPitch: 0.84,
      sampleText: "施主，执念已深，何苦执迷不悟？放下屠刀，方知天地之大。",
    },
    {
      id: "zh-CN-YunzeNeural",
      name: "云泽 · 枯骨魔尊/幕后大反派",
      fullName: "zh-CN-YunzeNeural",
      gender: "male",
      ageGroup: "elder",
      ageBand: "60~80岁 长者",
      category: "elderVillain",
      categoryLabel: "阴鸷魔尊 (60-80岁)",
      series: "修真逆袭",
      archetype: "桀骜阴森 · 漫剧终极黑手",
      tags: ["终极大Boss", "桀桀怪笑", "极度压迫"],
      styles: ["serious", "angry", "depressed"],
      defaultRate: -0.06,
      defaultPitch: 0.82,
      sampleText: "桀桀桀……小家伙，你以为你拼死找到的藏宝图，不是本尊三十年前故意留给你的饵吗？",
    },
    {
      id: "zh-CN-XiaomoNeural",
      name: "晓墨 · 恶毒刁钻老妪/鬼婆",
      fullName: "zh-CN-XiaomoNeural",
      gender: "female",
      ageGroup: "elder",
      ageBand: "60~75岁 长者",
      category: "elderVillain",
      categoryLabel: "恶毒老妪 (60-75岁)",
      series: "战神霸总",
      archetype: "尖酸刻薄 · 阴冷诡谲恶毒老妇",
      tags: ["恶毒嬷嬷", "阴鸷诡谲", "反派女巫"],
      styles: ["serious", "angry", "whispering"],
      defaultRate: -0.04,
      defaultPitch: 0.88,
      sampleText: "老身侍奉过三代先帝，什么样的硬骨头没见过？把十指拶子拿上来，老身亲自伺候姑娘！",
    },
  ];

  const AI_MANGA_VOICE_MAP = {};
  AI_MANGA_VOICE_CATALOG.forEach((v) => {
    AI_MANGA_VOICE_MAP[v.id] = v;
  });

  const MS_VOICE_TREE = {
    all: { key: "all", label: "🌟 全部音色", description: "微软全部 38+ 款小说精选音色" },
    narrator: { key: "narrator", label: "🎙️ 旁白演播", description: "沉稳磁性、温暖知性、激情评书解说" },
    youngMale: { key: "youngMale", label: "⚔️ 青年男主", description: "热血少侠、温润书生、阳光青年主角" },
    youngFemale: { key: "youngFemale", label: "🌸 青年女主", description: "清纯柔美、出尘仙子、灵动傲娇少女" },
    mature: { key: "mature", label: "🛡️ 成熟中生", description: "豪迈宗师、冷静御姐、威严将领、慈祥长辈" },
    elderVillain: { key: "elderVillain", label: "👹 长者反派", description: "沧桑老仙、阴冷魔皇、诡谲绝世宿敌" },
    child: { key: "child", label: "🎈 少儿童声", description: "机敏道童、软萌萝莉、可爱灵兽童音" },
    dialect: { key: "dialect", label: "🗺️ 方言特色", description: "陕西、东北、四川、山东、粤语、台湾风情" },
  };

  const ROLE_LABELS = {
    narrator: "旁白演播",
    youngMale: "青年男主",
    youngFemale: "青年女主",
    mature: "成熟中生",
    elderVillain: "长者/反派",
    child: "少儿童声",
    dialect: "方言特色",
  };

  const ROLE_DEFAULTS = {
    narrator: { pitch: 0.95, rateOffset: -0.02, defaultVoice: "zh-CN-YunxiNeural", keywords: ["Yunxi", "云希", "Kangkang", "Male", "男"] },
    youngMale: { pitch: 1.0, rateOffset: 0.02, defaultVoice: "zh-CN-YunjieNeural", keywords: ["Yunjie", "云杰", "Kangkang", "Male", "男"] },
    youngFemale: { pitch: 1.12, rateOffset: 0.03, defaultVoice: "zh-CN-XiaohanNeural", keywords: ["Xiaohan", "晓涵", "Xiaoyi", "晓伊", "Xiaoxiao", "Female", "女"] },
    mature: { pitch: 0.92, rateOffset: -0.02, defaultVoice: "zh-CN-YunyeNeural", keywords: ["Yunye", "云野", "Kangkang", "Male", "男"] },
    elderVillain: { pitch: 0.8, rateOffset: -0.06, defaultVoice: "zh-CN-YunzeNeural", keywords: ["Yunze", "云泽", "Kangkang", "Male", "男"] },
    child: { pitch: 1.25, rateOffset: 0.05, defaultVoice: "zh-CN-YunxiaNeural", keywords: ["Yunxia", "云夏", "Xiaoyou", "晓悠", "Female", "女"] },
    dialect: { pitch: 1.0, rateOffset: 0.0, defaultVoice: "zh-CN-Shaanxi-XiaoniNeural", keywords: ["Xiaoni", "Xiaobei", "Yunxiang", "Female", "女"] },
  };

  const STYLE_LABELS = {
    "chat": "自然对话 (chat)",
    "narration-relaxed": "轻松叙事 (relaxed)",
    "cheerful": "欢快喜悦 (cheerful)",
    "serious": "严肃庄重 (serious)",
    "angry": "怒气冲冲 (angry)",
    "sad": "悲伤哀戚 (sad)",
    "fearful": "恐惧颤抖 (fearful)",
    "gentle": "温柔亲切 (gentle)",
    "whispering": "低语耳语 (whispering)",
    "sports-commentary": "激情解说 (commentary)",
    "customerservice": "客气亲和 (service)",
    "newscast": "播音专业 (newscast)",
    "general": "通用标准 (general)",
  };

  // 内置经典小说角色配音树方案（包含 AI 漫剧全年龄全家桶、Azure 全景官方库与 GitHub 开源大模型库）
  const BUILTIN_SCHEMES = {
    "aimanga_universe": {
      id: "aimanga_universe",
      name: "🎬 AI 漫剧 · 全年龄高燃全家桶配音树",
      description: "当下爆款短剧/动态漫黄金配置：全知解说、奶气萌宝、少年逆袭、冷面霸总、清冷神女、仙门掌教与阴鸷魔尊",
      archetypes: {
        narrator: { voiceName: "zh-CN-YunxiNeural", pitch: 0.96, rateOffset: -0.02, baseStyle: "narration-relaxed" },
        youngMale: { voiceName: "zh-CN-YunjieNeural", pitch: 1.0, rateOffset: 0.02, baseStyle: "chat" },
        youngFemale: { voiceName: "zh-CN-XiaomengNeural", pitch: 1.1, rateOffset: 0.0, baseStyle: "gentle" },
        mature: { voiceName: "zh-CN-YunyeNeural", pitch: 0.92, rateOffset: -0.02, baseStyle: "serious" },
        elderVillain: { voiceName: "zh-CN-YunzeNeural", pitch: 0.82, rateOffset: -0.06, baseStyle: "serious" },
        child: { voiceName: "zh-CN-XiaoyouNeural", pitch: 1.25, rateOffset: 0.02, baseStyle: "cheerful" },
      },
    },
    "aimanga_cultivation": {
      id: "aimanga_cultivation",
      name: "⚡ AI 漫剧 · 修真逆袭与打脸高燃树",
      description: "热血废柴少侠、清冷师尊神女、豪迈宗师大能、阴鸷枯骨魔皇与灵兽萌宠",
      archetypes: {
        narrator: { voiceName: "zh-CN-YunxiNeural", pitch: 0.94, rateOffset: -0.02, baseStyle: "narration-relaxed" },
        youngMale: { voiceName: "zh-CN-YunjieNeural", pitch: 1.0, rateOffset: 0.03, baseStyle: "chat" },
        youngFemale: { voiceName: "zh-CN-XiaomengNeural", pitch: 1.1, rateOffset: -0.01, baseStyle: "whispering" },
        mature: { voiceName: "zh-CN-YunhaiNeural", pitch: 0.94, rateOffset: -0.02, baseStyle: "serious" },
        elderVillain: { voiceName: "zh-CN-YunzeNeural", pitch: 0.82, rateOffset: -0.06, baseStyle: "serious" },
        child: { voiceName: "zh-CN-YunxiaNeural", pitch: 1.2, rateOffset: 0.04, baseStyle: "cheerful" },
      },
    },
    "aimanga_urban_ceo": {
      id: "aimanga_urban_ceo",
      name: "💎 AI 漫剧 · 都市战神与豪门霸总树",
      description: "反转打脸快节奏解说、低音炮禁欲霸总、干练飒爽大女主、豪门掌权主母与绿茶千金",
      archetypes: {
        narrator: { voiceName: "zh-CN-YunjianNeural", pitch: 0.98, rateOffset: 0.04, baseStyle: "sports-commentary" },
        youngMale: { voiceName: "zh-CN-YunyeNeural", pitch: 0.92, rateOffset: -0.02, baseStyle: "serious" },
        youngFemale: { voiceName: "zh-CN-XiaoxuanNeural", pitch: 1.05, rateOffset: 0.02, baseStyle: "serious" },
        mature: { voiceName: "zh-CN-XiaozhenNeural", pitch: 0.98, rateOffset: -0.02, baseStyle: "gentle" },
        elderVillain: { voiceName: "zh-CN-XiaomoNeural", pitch: 0.88, rateOffset: -0.04, baseStyle: "serious" },
        child: { voiceName: "zh-CN-XiaoyouNeural", pitch: 1.25, rateOffset: 0.02, baseStyle: "cheerful" },
      },
    },
    "aimanga_rebirth_romance": {
      id: "aimanga_rebirth_romance",
      name: "🌸 AI 漫剧 · 重生复仇与古言甜宠树",
      description: "唯美古风叙事、白月光深情王爷、凄美娇软重生嫡女、娇俏贴身丫鬟与刁蛮老妪",
      archetypes: {
        narrator: { voiceName: "zh-CN-XiaoxiaoNeural", pitch: 1.02, rateOffset: 0.0, baseStyle: "gentle" },
        youngMale: { voiceName: "zh-CN-YunfengNeural", pitch: 1.0, rateOffset: -0.01, baseStyle: "gentle" },
        youngFemale: { voiceName: "zh-CN-XiaorouNeural", pitch: 1.08, rateOffset: -0.02, baseStyle: "sad" },
        mature: { voiceName: "zh-CN-XiaoyanNeural", pitch: 1.02, rateOffset: -0.01, baseStyle: "gentle" },
        elderVillain: { voiceName: "zh-CN-XiaomoNeural", pitch: 0.88, rateOffset: -0.04, baseStyle: "whispering" },
        child: { voiceName: "zh-CN-XiaoshuangNeural", pitch: 1.18, rateOffset: 0.04, baseStyle: "cheerful" },
      },
    },
    "azure_official_full": {
      id: "azure_official_full",
      name: "🌐 Azure 官方全景角色语音树",
      description: "微软全量 Neural 演播库精调，覆盖 22 位小说原型角色，无需试听全量即用",
      archetypes: {
        narrator: { voiceName: "zh-CN-YunxiNeural", pitch: 0.96, rateOffset: -0.02, baseStyle: "narration-relaxed" },
        youngMale: { voiceName: "zh-CN-YunjieNeural", pitch: 1.0, rateOffset: 0.02, baseStyle: "chat" },
        youngFemale: { voiceName: "zh-CN-XiaohanNeural", pitch: 1.1, rateOffset: 0.02, baseStyle: "gentle" },
        mature: { voiceName: "zh-CN-YunyeNeural", pitch: 0.92, rateOffset: -0.02, baseStyle: "serious" },
        elderVillain: { voiceName: "zh-CN-YunzeNeural", pitch: 0.82, rateOffset: -0.06, baseStyle: "serious" },
        child: { voiceName: "zh-CN-YunxiaNeural", pitch: 1.25, rateOffset: 0.04, baseStyle: "cheerful" },
      },
    },
    "alexandria_qwen3": {
      id: "alexandria_qwen3",
      name: "🎙️ Alexandria · Qwen3-TTS 评书演播树",
      description: "GitHub Finrandojin/alexandria-audiobook 评书大宗师、剑宗少侠、望舒仙子、九幽魔皇",
      archetypes: {
        narrator: { voiceName: "github-alexandria-storyteller", pitch: 0.94, rateOffset: -0.02, baseStyle: "narration-relaxed" },
        youngMale: { voiceName: "github-alexandria-swordmaster", pitch: 1.0, rateOffset: 0.02, baseStyle: "chat" },
        youngFemale: { voiceName: "github-alexandria-fairywangshu", pitch: 1.12, rateOffset: -0.02, baseStyle: "gentle" },
        mature: { voiceName: "github-alexandria-storyteller", pitch: 0.94, rateOffset: -0.02, baseStyle: "serious" },
        elderVillain: { voiceName: "github-alexandria-demonlord", pitch: 0.82, rateOffset: -0.06, baseStyle: "serious" },
        child: { voiceName: "github-alexandria-foxjunior", pitch: 1.28, rateOffset: 0.04, baseStyle: "cheerful" },
      },
    },
    "cosyvoice_universe": {
      id: "cosyvoice_universe",
      name: "⚡ CosyVoice · 国漫大世界配音树",
      description: "GitHub FunAudioLLM/CosyVoice 自然文学演播、热血国漫青年、九尾天狐、扫地神僧",
      archetypes: {
        narrator: { voiceName: "github-cosyvoice-narrator", pitch: 0.96, rateOffset: -0.01, baseStyle: "narration-relaxed" },
        youngMale: { voiceName: "github-cosyvoice-hotblood", pitch: 1.02, rateOffset: 0.03, baseStyle: "chat" },
        youngFemale: { voiceName: "github-cosyvoice-foxempress", pitch: 0.96, rateOffset: -0.02, baseStyle: "serious" },
        mature: { voiceName: "github-cosyvoice-foxempress", pitch: 0.96, rateOffset: -0.02, baseStyle: "serious" },
        elderVillain: { voiceName: "github-cosyvoice-zenmonk", pitch: 0.84, rateOffset: -0.05, baseStyle: "serious" },
        child: { voiceName: "github-cosyvoice-hotblood", pitch: 1.08, rateOffset: 0.02, baseStyle: "cheerful" },
      },
    },
    "chattts_dialogue": {
      id: "chattts_dialogue",
      name: "🍵 ChatTTS · 市井江湖对话对白树",
      description: "GitHub 2noise/ChatTTS 极富口语呼吸感与笑叹断句的拟真对白、茶馆说书人",
      archetypes: {
        narrator: { voiceName: "github-chattts-teahouse", pitch: 0.98, rateOffset: 0.0, baseStyle: "chat" },
        youngMale: { voiceName: "github-chattts-urbanmale", pitch: 1.0, rateOffset: 0.02, baseStyle: "chat" },
        youngFemale: { voiceName: "github-chattts-livelygirl", pitch: 1.15, rateOffset: 0.03, baseStyle: "cheerful" },
        mature: { voiceName: "github-chattts-teahouse", pitch: 0.98, rateOffset: 0.0, baseStyle: "chat" },
        elderVillain: { voiceName: "github-chattts-teahouse", pitch: 0.94, rateOffset: -0.02, baseStyle: "serious" },
        child: { voiceName: "github-chattts-livelygirl", pitch: 1.2, rateOffset: 0.04, baseStyle: "cheerful" },
      },
    },
    "f5_scifi": {
      id: "f5_scifi",
      name: "🚀 F5-TTS · 赛博科幻与未来史诗树",
      description: "GitHub SWivid/F5-TTS 星际编年史宏大叙事、赛博特勤冷冽音、暗夜宿敌",
      archetypes: {
        narrator: { voiceName: "github-f5-epicchronicle", pitch: 0.94, rateOffset: -0.03, baseStyle: "narration-relaxed" },
        youngMale: { voiceName: "github-f5-cybercommando", pitch: 0.9, rateOffset: 0.02, baseStyle: "serious" },
        youngFemale: { voiceName: "github-f5-cybercommando", pitch: 1.05, rateOffset: 0.02, baseStyle: "serious" },
        mature: { voiceName: "github-f5-cybercommando", pitch: 0.9, rateOffset: 0.02, baseStyle: "serious" },
        elderVillain: { voiceName: "github-f5-nightstalker", pitch: 0.8, rateOffset: -0.05, baseStyle: "whispering" },
        child: { voiceName: "github-f5-cybercommando", pitch: 1.15, rateOffset: 0.03, baseStyle: "cheerful" },
      },
    },
    "gpt_sovits_legends": {
      id: "gpt_sovits_legends",
      name: "🍶 GPT-SoVITS · 仙侠传世音色树",
      description: "GitHub RVC-Boss/GPT-SoVITS 李白青莲剑仙、软萌仙山道童、九幽冥帝",
      archetypes: {
        narrator: { voiceName: "github-gptsovits-swordpoet", pitch: 0.98, rateOffset: 0.01, baseStyle: "cheerful" },
        youngMale: { voiceName: "github-gptsovits-swordpoet", pitch: 0.98, rateOffset: 0.01, baseStyle: "chat" },
        youngFemale: { voiceName: "zh-CN-XiaomengNeural", pitch: 1.1, rateOffset: 0.0, baseStyle: "whispering" },
        mature: { voiceName: "github-gptsovits-swordpoet", pitch: 0.95, rateOffset: 0.0, baseStyle: "serious" },
        elderVillain: { voiceName: "zh-CN-YunzeNeural", pitch: 0.82, rateOffset: -0.06, baseStyle: "serious" },
        child: { voiceName: "github-gptsovits-daoboy", pitch: 1.32, rateOffset: 0.04, baseStyle: "cheerful" },
      },
    },
    "xianxia": {
      id: "xianxia",
      name: "🔮 玄幻修仙配音树",
      description: "修仙逆天少侠、清冷出尘仙子、沧桑仙翁宗师与九幽魔皇",
      archetypes: {
        narrator: { voiceName: "zh-CN-YunxiNeural", pitch: 0.94, rateOffset: -0.02, baseStyle: "narration-relaxed" },
        youngMale: { voiceName: "zh-CN-YunjieNeural", pitch: 1.0, rateOffset: 0.02, baseStyle: "chat" },
        youngFemale: { voiceName: "zh-CN-XiaohanNeural", pitch: 1.1, rateOffset: 0.02, baseStyle: "gentle" },
        mature: { voiceName: "zh-CN-YunyeNeural", pitch: 0.92, rateOffset: -0.02, baseStyle: "serious" },
        elderVillain: { voiceName: "zh-CN-YunzeNeural", pitch: 0.8, rateOffset: -0.06, baseStyle: "serious" },
        child: { voiceName: "zh-CN-YunxiaNeural", pitch: 1.25, rateOffset: 0.04, baseStyle: "cheerful" },
      },
    },
    "historical": {
      id: "historical",
      name: "⚔️ 三国历史演义配音树",
      description: "史诗评书旁白、昭烈帝仁德沉稳、武圣美髯公与翼德勇烈",
      archetypes: {
        narrator: { voiceName: "zh-CN-YunjianNeural", pitch: 0.96, rateOffset: -0.02, baseStyle: "sports-commentary" },
        youngMale: { voiceName: "zh-CN-YunfengNeural", pitch: 1.0, rateOffset: -0.01, baseStyle: "gentle" },
        youngFemale: { voiceName: "zh-CN-XiaohanNeural", pitch: 1.08, rateOffset: 0.0, baseStyle: "sad" },
        mature: { voiceName: "zh-CN-YunyeNeural", pitch: 0.92, rateOffset: 0.02, baseStyle: "serious" },
        elderVillain: { voiceName: "zh-CN-YunzeNeural", pitch: 0.8, rateOffset: -0.04, baseStyle: "serious" },
        child: { voiceName: "zh-CN-YunxiaNeural", pitch: 1.2, rateOffset: 0.02, baseStyle: "cheerful" },
      },
    },
    "romance": {
      id: "romance",
      name: "🌸 现代都市言情配音树",
      description: "温暖知性旁白、深情沉着男主、独立坚韧女主与活泼闺蜜",
      archetypes: {
        narrator: { voiceName: "zh-CN-XiaoxiaoNeural", pitch: 1.02, rateOffset: 0.0, baseStyle: "narration-relaxed" },
        youngMale: { voiceName: "zh-CN-YunxiNeural", pitch: 0.95, rateOffset: -0.02, baseStyle: "serious" },
        youngFemale: { voiceName: "zh-CN-XiaohanNeural", pitch: 1.08, rateOffset: 0.02, baseStyle: "chat" },
        mature: { voiceName: "zh-CN-XiaoruiNeural", pitch: 0.98, rateOffset: -0.02, baseStyle: "calm" },
        elderVillain: { voiceName: "zh-CN-XiaomoNeural", pitch: 0.88, rateOffset: -0.04, baseStyle: "whispering" },
        child: { voiceName: "zh-CN-XiaoyouNeural", pitch: 1.25, rateOffset: 0.02, baseStyle: "cheerful" },
      },
    },
    "mystery": {
      id: "mystery",
      name: "🕵️ 悬疑惊悚破案配音树",
      description: "压抑悬疑旁白、冷静刑警神探、惊恐当事人与阴郁幕后黑手",
      archetypes: {
        narrator: { voiceName: "zh-CN-YunxiNeural", pitch: 0.9, rateOffset: -0.04, baseStyle: "serious" },
        youngMale: { voiceName: "zh-CN-YunfengNeural", pitch: 0.98, rateOffset: -0.02, baseStyle: "serious" },
        youngFemale: { voiceName: "zh-CN-XiaohanNeural", pitch: 1.1, rateOffset: 0.02, baseStyle: "fearful" },
        mature: { voiceName: "zh-CN-YunyeNeural", pitch: 0.9, rateOffset: -0.02, baseStyle: "serious" },
        elderVillain: { voiceName: "zh-CN-XiaomoNeural", pitch: 0.85, rateOffset: -0.05, baseStyle: "whispering" },
        child: { voiceName: "zh-CN-XiaoyouNeural", pitch: 1.2, rateOffset: 0.0, baseStyle: "fearful" },
      },
    },
  };

  // 演播旁白专属精选音色预设（供随时自由切换与试听）
  const NARRATOR_PRESETS = [
    { id: "zh-CN-YunxiNeural", name: "云希", title: "沉稳内敛 · 小说演播大师", gender: "男声", tag: "大师推荐", sample: "天地不仁，以万物为刍狗；日月经天，江河行地。" },
    { id: "zh-CN-YunjianNeural", name: "云健", title: "豪迈评书 · 历史史诗演播", gender: "男声", tag: "评书演播", sample: "话说天下大势，分久必合，合久必分！" },
    { id: "zh-CN-XiaoxiaoNeural", name: "晓晓", title: "温暖知性 · 文学读物女声", gender: "女声", tag: "温暖知性", sample: "微风拂过窗棂，那些沉封已久的故事，悄然拉开序幕。" },
    { id: "zh-CN-XiaoqiuNeural", name: "晓秋", title: "沉静深情 · 纪实文学读物", gender: "女声", tag: "纪实文学", sample: "岁月长河缓缓流淌，唯有那些赤诚之心，历久弥新。" },
    { id: "zh-CN-YunyangNeural", name: "云扬", title: "端庄大气 · 权威纪录播报", gender: "男声", tag: "纪录播报", sample: "中央气象台消息：受强冷空气影响，各地区将迎来显著降温。" },
    { id: "zh-CN-XiaoruiNeural", name: "晓睿", title: "冷静睿智 · 干练从容御姐", gender: "女声", tag: "干练女声", sample: "成大事者不恤小耻，局势已定，容不得半分优柔寡断。" },
    { id: "zh-CN-YunyeNeural", name: "云野", title: "苍劲厚重 · 武侠将领硬汉", gender: "男声", tag: "厚重苍劲", sample: "大漠孤烟直，长河落日圆。三万铁骑奔赴边关。" },
  ];

  /* -------------------------------------------------------------
     角色语音树与旁白自由切换操作核心
  ------------------------------------------------------------- */
  function applySchemeToNovel(novel, schemeKeyOrData) {
    if (!novel) return "";
    if (!novel.characterTree) novel.characterTree = {};

    let archetypes = null;
    let schemeName = "";

    if (typeof schemeKeyOrData === "string") {
      if (BUILTIN_SCHEMES[schemeKeyOrData]) {
        archetypes = BUILTIN_SCHEMES[schemeKeyOrData].archetypes;
        schemeName = BUILTIN_SCHEMES[schemeKeyOrData].name;
      } else {
        // 查找自建角色树
        const customTrees = StorageManager.getCustomTrees();
        const found = customTrees.find((c) => c.id === schemeKeyOrData);
        if (found && (found.characterTree || found.characters)) {
          novel.characterTree = JSON.parse(JSON.stringify(found.characterTree || found.characters));
          StorageManager.saveCurrentNovel(novel);
          return found.name;
        }
        // 查找过往小说树
        const pastNovels = StorageManager.getPastNovels();
        const foundPast = pastNovels.find((p) => p.id === schemeKeyOrData);
        if (foundPast && (foundPast.characters || foundPast.characterTree)) {
          novel.characterTree = JSON.parse(JSON.stringify(foundPast.characters || foundPast.characterTree));
          StorageManager.saveCurrentNovel(novel);
          return `《${foundPast.title}》角色树`;
        }
      }
    } else if (schemeKeyOrData && schemeKeyOrData.archetypes) {
      archetypes = schemeKeyOrData.archetypes;
      schemeName = schemeKeyOrData.name;
    }

    if (!archetypes) return "";

    // 1. 映射旁白
    if (archetypes.narrator) {
      novel.characterTree["旁白"] = {
        character_name: "旁白",
        role: "narrator",
        voice_name: archetypes.narrator.voiceName,
        pitch: archetypes.narrator.pitch || 0.96,
        rate_offset: typeof archetypes.narrator.rateOffset === "string" ? archetypes.narrator.rateOffset : `${(archetypes.narrator.rateOffset || 0) > 0 ? "+" : ""}${Math.round((archetypes.narrator.rateOffset || 0) * 100)}%`,
        base_style: archetypes.narrator.baseStyle || "narration-relaxed",
      };
    }

    // 2. 映射小说内其余角色
    for (const [charName, conf] of Object.entries(novel.characterTree)) {
      if (charName === "旁白") continue;
      const roleArch = archetypes[conf.role] || archetypes.mature || archetypes.youngMale;
      if (roleArch) {
        conf.voice_name = roleArch.voiceName;
        conf.pitch = roleArch.pitch || 1.0;
        conf.rate_offset = typeof roleArch.rateOffset === "string" ? roleArch.rateOffset : `${(roleArch.rateOffset || 0) > 0 ? "+" : ""}${Math.round((roleArch.rateOffset || 0) * 100)}%`;
        conf.base_style = roleArch.baseStyle || "chat";
      }
    }

    StorageManager.saveCurrentNovel(novel);
    return schemeName;
  }

  function setNarratorVoice(novel, voiceId) {
    if (!novel) return null;
    if (!novel.characterTree) novel.characterTree = {};

    const msVoice = MS_VOICE_MAP[voiceId] || { name: voiceId };
    novel.characterTree["旁白"] = {
      character_name: "旁白",
      role: "narrator",
      voice_name: voiceId,
      pitch: msVoice.defaultPitch || 0.96,
      rate_offset: `${(msVoice.defaultRate || 0) > 0 ? "+" : ""}${Math.round((msVoice.defaultRate || 0) * 100)}%`,
      base_style: (msVoice.styles && msVoice.styles[0]) || "narration-relaxed",
    };

    StorageManager.saveCurrentNovel(novel);
    return msVoice;
  }

  function getAvailableSchemes() {
    const list = [];
    // 内置预设方案
    for (const [key, scheme] of Object.entries(BUILTIN_SCHEMES)) {
      list.push({
        id: key,
        type: "builtin",
        name: scheme.name,
        description: scheme.description,
        narratorVoice: scheme.archetypes?.narrator?.voiceName,
      });
    }
    // 自建角色树
    const customTrees = StorageManager.getCustomTrees();
    customTrees.forEach((c) => {
      list.push({
        id: c.id,
        type: "custom",
        name: `🛠️ ${c.name}`,
        description: c.description || "自建角色配音树方案",
        narratorVoice: c.characterTree?.["旁白"]?.voice_name || c.characters?.["旁白"]?.voice_name,
      });
    });
    // 过往小说音频树
    const pastNovels = StorageManager.getPastNovels();
    pastNovels.forEach((p) => {
      list.push({
        id: p.id,
        type: "past",
        name: `📚《${p.title}》角色树`,
        description: p.description || `从《${p.title}》提取生成的配音树`,
        narratorVoice: p.characters?.["旁白"]?.voice_name,
      });
    });
    return list;
  }

  /**
   * 一键全量复制微软 Azure 官方全景角色语音树至用户自建库
   * 包含 22 位高拟真代表角色，涵盖男女老少全小说人设原型，无需试听即刻开箱即用
   */
  function cloneAzureFullTreeToCustom() {
    const treeId = "custom_azure_official_full";
    const customTrees = StorageManager.getCustomTrees();
    const existing = customTrees.find((t) => t.id === treeId);
    if (existing) {
      return existing;
    }
    const fullTree = {
      id: treeId,
      name: "Azure 官方全景角色语音树",
      description: "微软全量 Neural 演播库精调，覆盖 22 位小说原型角色，无需试听全量即用",
      updatedAt: new Date().toISOString(),
      characters: {
        "旁白": { character_name: "旁白", role: "narrator", voice_name: "zh-CN-YunxiNeural", pitch: 0.96, rate_offset: "-2%", base_style: "narration-relaxed" },
        "热血少年男主": { character_name: "热血少年男主", role: "youngMale", voice_name: "zh-CN-YunjieNeural", pitch: 1.0, rate_offset: "+2%", base_style: "chat" },
        "阳光机敏男主": { character_name: "阳光机敏男主", role: "youngMale", voice_name: "zh-CN-YunhaoNeural", pitch: 1.02, rate_offset: "+3%", base_style: "cheerful" },
        "温润儒雅公子": { character_name: "温润儒雅公子", role: "youngMale", voice_name: "zh-CN-YunfengNeural", pitch: 1.0, rate_offset: "-1%", base_style: "gentle" },
        "清冷出尘仙子": { character_name: "清冷出尘仙子", role: "youngFemale", voice_name: "zh-CN-XiaomengNeural", pitch: 1.1, rate_offset: "+0%", base_style: "whispering" },
        "温婉清纯女主": { character_name: "温婉清纯女主", role: "youngFemale", voice_name: "zh-CN-XiaohanNeural", pitch: 1.1, rate_offset: "+2%", base_style: "gentle" },
        "娇俏机敏少女": { character_name: "娇俏机敏少女", role: "youngFemale", voice_name: "zh-CN-XiaoyiNeural", pitch: 1.15, rate_offset: "+4%", base_style: "cheerful" },
        "天真娇憨师妹": { character_name: "天真娇憨师妹", role: "youngFemale", voice_name: "zh-CN-XiaoshuangNeural", pitch: 1.18, rate_offset: "+4%", base_style: "cheerful" },
        "豪迈霸气宗师": { character_name: "豪迈霸气宗师", role: "mature", voice_name: "zh-CN-YunyeNeural", pitch: 0.92, rate_offset: "-2%", base_style: "serious" },
        "仙门飘逸掌门": { character_name: "仙门飘逸掌门", role: "mature", voice_name: "zh-CN-YunhaiNeural", pitch: 0.94, rate_offset: "-1%", base_style: "serious" },
        "冷静睿智御姐": { character_name: "冷静睿智御姐", role: "mature", voice_name: "zh-CN-XiaoruiNeural", pitch: 0.98, rate_offset: "-2%", base_style: "calm" },
        "雍容贵妇王妃": { character_name: "雍容贵妇王妃", role: "mature", voice_name: "zh-CN-XiaozhenNeural", pitch: 0.98, rate_offset: "-3%", base_style: "gentle" },
        "慈爱温厚长辈": { character_name: "慈爱温厚长辈", role: "mature", voice_name: "zh-CN-XiaoyanNeural", pitch: 1.02, rate_offset: "-1%", base_style: "gentle" },
        "阴冷深沉魔皇": { character_name: "阴冷深沉魔皇", role: "elderVillain", voice_name: "zh-CN-YunzeNeural", pitch: 0.82, rate_offset: "-6%", base_style: "serious" },
        "诡谲幽冥老妪": { character_name: "诡谲幽冥老妪", role: "elderVillain", voice_name: "zh-CN-XiaomoNeural", pitch: 0.88, rate_offset: "-4%", base_style: "whispering" },
        "淘气机敏道童": { character_name: "淘气机敏道童", role: "child", voice_name: "zh-CN-YunxiaNeural", pitch: 1.25, rate_offset: "+4%", base_style: "cheerful" },
        "软萌纯真萝莉": { character_name: "软萌纯真萝莉", role: "child", voice_name: "zh-CN-XiaoyouNeural", pitch: 1.3, rate_offset: "+2%", base_style: "gentle" },
        "关中秦风豪客": { character_name: "关中秦风豪客", role: "dialect", voice_name: "zh-CN-Shaanxi-XiaoniNeural", pitch: 1.0, rate_offset: "+0%", base_style: "general" },
        "东北风趣老铁": { character_name: "东北风趣老铁", role: "dialect", voice_name: "zh-CN-Liaoning-XiaobeiNeural", pitch: 1.02, rate_offset: "+2%", base_style: "cheerful" },
        "巴蜀麻辣风情": { character_name: "巴蜀麻辣风情", role: "dialect", voice_name: "zh-CN-Sichuan-YunxiNeural", pitch: 1.0, rate_offset: "+0%", base_style: "chat" },
        "港风评书豪杰": { character_name: "港风评书豪杰", role: "dialect", voice_name: "zh-HK-WanLungNeural", pitch: 0.98, rate_offset: "-1%", base_style: "general" },
        "台湾腔调文艺": { character_name: "台湾腔调文艺", role: "dialect", voice_name: "zh-TW-HsiaoChenNeural", pitch: 1.04, rate_offset: "+0%", base_style: "general" },
      },
    };
    fullTree.characterTree = fullTree.characters;
    StorageManager.saveCustomTree(treeId, fullTree);
    return fullTree;
  }

  /**
   * 一键全量导入 GitHub 开源 AI 语音大模型角色树至用户自建库
   */
  function cloneGitHubAiTreesToCustom() {
    const trees = [
      {
        id: "custom_alexandria_qwen3",
        name: "Alexandria · Qwen3-TTS 评书演播树",
        description: "GitHub Finrandojin/alexandria-audiobook 评书与修仙多角色开源配音树",
        characters: {
          "评书大宗师": { character_name: "评书大宗师", role: "narrator", voice_name: "github-alexandria-storyteller", pitch: 0.94, rate_offset: "-2%", base_style: "narration-relaxed" },
          "剑宗少侠": { character_name: "剑宗少侠", role: "youngMale", voice_name: "github-alexandria-swordmaster", pitch: 1.0, rate_offset: "+2%", base_style: "chat" },
          "望舒仙子": { character_name: "望舒仙子", role: "youngFemale", voice_name: "github-alexandria-fairywangshu", pitch: 1.12, rate_offset: "-2%", base_style: "gentle" },
          "九幽魔皇": { character_name: "九幽魔皇", role: "elderVillain", voice_name: "github-alexandria-demonlord", pitch: 0.82, rate_offset: "-6%", base_style: "serious" },
          "灵狐小师妹": { character_name: "灵狐小师妹", role: "child", voice_name: "github-alexandria-foxjunior", pitch: 1.28, rate_offset: "+4%", base_style: "cheerful" },
        },
      },
      {
        id: "custom_cosyvoice_universe",
        name: "CosyVoice · 国漫大世界配音树",
        description: "GitHub FunAudioLLM/CosyVoice 多情感大模型自然文学与国漫角色树",
        characters: {
          "自然文学演播": { character_name: "自然文学演播", role: "narrator", voice_name: "github-cosyvoice-narrator", pitch: 0.96, rate_offset: "-1%", base_style: "narration-relaxed" },
          "热血少侠": { character_name: "热血少侠", role: "youngMale", voice_name: "github-cosyvoice-hotblood", pitch: 1.02, rate_offset: "+3%", base_style: "chat" },
          "天狐御姐": { character_name: "天狐御姐", role: "mature", voice_name: "github-cosyvoice-foxempress", pitch: 0.96, rate_offset: "-2%", base_style: "serious" },
          "扫地老僧": { character_name: "扫地老僧", role: "elderVillain", voice_name: "github-cosyvoice-zenmonk", pitch: 0.84, rate_offset: "-5%", base_style: "serious" },
        },
      },
      {
        id: "custom_chattts_dialogue",
        name: "ChatTTS · 市井江湖对话对白树",
        description: "GitHub 2noise/ChatTTS 极富口语呼吸感与笑叹断句的拟真对白角色树",
        characters: {
          "茶馆说书人": { character_name: "茶馆说书人", role: "narrator", voice_name: "github-chattts-teahouse", pitch: 0.98, rate_offset: "0%", base_style: "chat" },
          "随性青年": { character_name: "随性青年", role: "youngMale", voice_name: "github-chattts-urbanmale", pitch: 1.0, rate_offset: "+2%", base_style: "chat" },
          "灵动少女": { character_name: "灵动少女", role: "youngFemale", voice_name: "github-chattts-livelygirl", pitch: 1.15, rate_offset: "+3%", base_style: "cheerful" },
        },
      },
      {
        id: "custom_f5_scifi",
        name: "F5-TTS · 赛博科幻与未来史诗树",
        description: "GitHub SWivid/F5-TTS 流匹配高保真语音、星际编年史宏大叙事与特勤指令",
        characters: {
          "编年史叙事": { character_name: "编年史叙事", role: "narrator", voice_name: "github-f5-epicchronicle", pitch: 0.94, rate_offset: "-3%", base_style: "narration-relaxed" },
          "赛博特勤": { character_name: "赛博特勤", role: "youngMale", voice_name: "github-f5-cybercommando", pitch: 0.9, rate_offset: "+2%", base_style: "serious" },
          "暗夜宿敌": { character_name: "暗夜宿敌", role: "elderVillain", voice_name: "github-f5-nightstalker", pitch: 0.8, rate_offset: "-5%", base_style: "whispering" },
        },
      },
    ];

    trees.forEach((t) => {
      t.characterTree = t.characters;
      t.updatedAt = new Date().toISOString();
      StorageManager.saveCustomTree(t.id, t);
    });
    return trees;
  }

  /**
   * 一键全量复制 AI 漫剧全年龄爆款角色语音树至用户自建库
   * 包含 24 位跨越幼年萌宝、少年热血、青年霸总/仙尊/神女、中年掌门/御姐、沧桑魔尊老者的全年龄漫剧人设，即开即用
   */
  function cloneAiMangaFullTreeToCustom() {
    const treeId = "custom_aimanga_universe_full";
    const characters = {};
    AI_MANGA_VOICE_CATALOG.forEach((item) => {
      const charName = item.name.split(" · ")[0];
      characters[charName] = {
        character_name: charName,
        display_name: item.name,
        role: item.category,
        voice_name: item.id,
        pitch: item.defaultPitch || 1.0,
        rate_offset: `${(item.defaultRate || 0) >= 0 ? "+" : ""}${Math.round((item.defaultRate || 0) * 100)}%`,
        base_style: (item.styles && item.styles[0]) || "chat",
        age_group: item.ageGroup,
        age_band: item.ageBand,
        series: item.series,
        archetype: item.archetype,
      };
    });

    const fullTree = {
      id: treeId,
      name: "🎬 AI 漫剧 · 全年龄爆款角色语音全家桶",
      description: "覆盖幼年萌宝、少年逆袭、冷面霸总、清冷神女、仙门掌教与阴鸷魔尊的 24 位漫剧角色库",
      updatedAt: new Date().toISOString(),
      characters: characters,
      characterTree: characters,
    };

    StorageManager.saveCustomTree(treeId, fullTree);
    return fullTree;
  }

  /**
   * 导出 AI 漫剧配音树为标准 JSON 格式并触发浏览器下载
   */
  function exportAiMangaTreeJson() {
    const tree = cloneAiMangaFullTreeToCustom();
    const blob = new Blob([JSON.stringify(tree, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AI漫剧全年龄爆款角色语音树_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof showToast === "function") showToast("💾 AI 漫剧角色语音树 JSON 配置已成功下载！");
  }

  /**
   * 导出 AI 漫剧配音树为 Markdown 配音档案并触发下载
   */
  function exportAiMangaTreeMarkdown() {
    let md = `# 🎬 AI 漫剧全年龄爆款角色配音树档案\n\n`;
    md += `> 生成时间：${new Date().toLocaleString()} | 收录角色：${AI_MANGA_VOICE_CATALOG.length} 位 | 涵盖年龄段：幼年萌宝、少年热血、青年主役、中年掌门、沧桑长者\n\n`;
    md += `| 角色原型 | 年龄段 | 性别 | 推荐音色 | 演播声学特点 | 经典台词示例 |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    AI_MANGA_VOICE_CATALOG.forEach((item) => {
      md += `| **${item.name}** | \`${item.ageBand}\` | ${item.gender === "male" ? "男" : "女"} | \`${item.id}\` | ${item.archetype} | *“${item.sampleText}”* |\n`;
    });
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AI漫剧全年龄角色配音树档案_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof showToast === "function") showToast("📄 AI 漫剧角色配音树 Markdown 档案已成功下载！");
  }

  /**
   * 智能小说题材与基调声学分析引擎 (Novel Genre & Audio Vibe Analyzer)
   */
  function analyzeNovelGenre(title = "", rawText = "", characterNames = []) {
    const textSample = (String(title || "") + " " + String(rawText || "").slice(0, 16000)).toLowerCase();
    const charStr = Array.isArray(characterNames) ? characterNames.join(" ") : "";
    const fullHaystack = textSample + " " + charStr;

    const genreProfiles = [
      {
        id: "ai_manga",
        label: "AI漫剧爆款 · 逆袭修真",
        schemeId: "custom_aimanga_universe_full",
        schemeName: "🎬 AI 漫剧 · 全年龄爆款角色全家桶",
        keywords: ["漫剧", "仙尊", "女帝", "师尊", "萌宝", "逆袭", "赘婿", "龙王", "战神", "契约", "退婚", "宗门", "霸总", "师妹", "师弟", "护短", "宿主", "系统", "团宠", "小千金", "少爷"],
        reason: "文本具备鲜明的短剧/漫剧人物标签与强冲突对白，推荐匹配涵盖幼童、热血少侠、冷面霸总、仙尊女帝的全年龄爆款漫剧库。",
      },
      {
        id: "xianxia",
        label: "东方仙侠 · 玄幻修真",
        schemeId: "xianxia",
        schemeName: "🔮 玄幻修仙配音树",
        keywords: ["修仙", "飞升", "灵气", "金丹", "元婴", "渡劫", "剑气", "斩妖", "苍穹", "洞府", "道友", "掌教", "丹药", "仙门", "魔修", "雷劫", "御剑", "真元", "符箓", "天道"],
        reason: "检测到密集的玄幻仙侠术语，推荐匹配清冷出尘仙子、凌霄少侠、沧桑仙翁与九幽魔尊等空灵宏大声线。",
      },
      {
        id: "wuxia",
        label: "热血传统 · 武侠江湖",
        schemeId: "wuxia",
        schemeName: "⚔️ 热血传统武侠配音树",
        keywords: ["江湖", "少侠", "镖局", "长剑", "掌法", "武林", "朝廷", "豪杰", "恩仇", "大侠", "剑客", "刀法", "丐帮", "盟主", "内力", "穴道", "镖头", "客栈", "义气"],
        reason: "检测到经典武侠门派与江湖侠义对白，推荐匹配豪迈宗师、意气少侠、温婉佳人与铁血将领声线。",
      },
      {
        id: "alexandria_qwen3",
        label: "史诗演播 · 评书评话",
        schemeId: "custom_alexandria_qwen3",
        schemeName: "🎙️ Alexandria · Qwen3 评书大宗师树",
        keywords: ["话说", "且说", "看官", "评书", "三国", "列位", "且听下回分解", "天下大势", "诸侯", "丞相", "主公", "交锋", "阵前", "鸣金", "收兵", "烽火"],
        reason: "检测到章回体评书与历史长卷叙事特色，推荐匹配千问开源评书大宗师与金戈铁马气魄声线。",
      },
      {
        id: "urban",
        label: "都市爽文 · 神豪异能",
        schemeId: "urban",
        schemeName: "🏙️ 都市异能爽文配音树",
        keywords: ["集团", "总裁", "豪门", "跑车", "拍卖会", "秘书", "保镖", "商业", "资产", "百亿", "首富", "董事长", "酒会", "投资", "助理", "签到", "神豪"],
        reason: "检测到现代都市、商战与爽文元素，推荐匹配冷峻霸总、干练女强人、热血青年与智囊管家声线。",
      },
      {
        id: "suspense",
        label: "悬疑惊悚 · 密室探案",
        schemeId: "mystery",
        schemeName: "🕵️ 悬疑惊悚破案配音树",
        keywords: ["凶手", "尸体", "警官", "现场", "指纹", "密室", "迷局", "诡异", "暗夜", "惨叫", "恐惧", "真相", "死因", "证物", "痕迹", "嫌疑人", "审讯"],
        reason: "检测到紧张压抑的悬疑推理氛围，推荐匹配低沉压迫旁白、冷静神探、颤抖当事人与阴郁幕后黑手声线。",
      },
      {
        id: "romance",
        label: "古言甜宠 · 深宫虐恋",
        schemeId: "romance",
        schemeName: "🌸 现代都市与古言甜宠树",
        keywords: ["王爷", "侧妃", "本宫", "陛下", "臣妾", "娘娘", "深宫", "青丝", "执念", "相公", "娇俏", "夫君", "嫡女", "庶女", "后宫", "宠妃", "赐婚"],
        reason: "检测到细腻深情的情感纠葛与深宫红颜对白，推荐匹配温柔深情男声、清丽甜宠女主与端庄母仪声线。",
      },
      {
        id: "scifi",
        label: "赛博科幻 · 星际未来",
        schemeId: "custom_f5_scifi",
        schemeName: "🚀 F5-TTS · 赛博科幻与星际史诗树",
        keywords: ["星际", "飞船", "智脑", "机甲", "战舰", "义体", "纳米", "仿生", "矩阵", "赛博", "跃迁", "聚变", "基地", "异星", "核心", "超载", "巡洋舰"],
        reason: "检测到未来科技与硬核机甲术语，推荐匹配无机质AI指令、赛博特勤少校与深邃全知编年史声线。",
      },
    ];

    const scores = genreProfiles.map((p) => {
      let hits = 0;
      const matched = [];
      p.keywords.forEach((kw) => {
        const reg = new RegExp(kw, "gi");
        const count = (fullHaystack.match(reg) || []).length;
        if (count > 0) {
          hits += Math.min(count, 6);
          matched.push(kw);
        }
      });
      return { profile: p, hits, matched };
    });

    scores.sort((a, b) => b.hits - a.hits);
    const top = scores[0];
    const baseScore = top.hits > 0 ? Math.min(99, Math.max(84, 76 + top.hits * 3)) : 88;

    const alternatives = scores.slice(1, 4).map((s, idx) => ({
      id: s.profile.schemeId,
      name: s.profile.schemeName,
      label: s.profile.label,
      confidence: Math.max(72, baseScore - 5 - idx * 6),
      matchedCount: s.matched.length,
    }));

    return {
      primaryGenre: top.profile.id,
      genreLabel: top.profile.label,
      confidence: baseScore,
      recommendedSchemeId: top.profile.schemeId,
      recommendedSchemeName: top.profile.schemeName,
      reason: top.profile.reason,
      matchedKeywords: top.matched.slice(0, 6),
      alternativeSchemes: alternatives,
    };
  }

  /**
   * 高度智能的小说人物背景、性别与人设声学特征推断引擎
   */
  // 中文常见百家姓氏库 (单姓 + 复姓)
  const CHINESE_SURNAMES = new Set([
    "李", "王", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴",
    "徐", "孙", "胡", "朱", "高", "林", "何", "郭", "马", "罗",
    "梁", "宋", "郑", "谢", "韩", "唐", "冯", "于", "董", "萧",
    "程", "曹", "袁", "邓", "许", "傅", "沈", "曾", "彭", "吕",
    "苏", "卢", "蒋", "蔡", "贾", "丁", "魏", "薛", "叶", "阎",
    "余", "潘", "杜", "戴", "夏", "钟", "汪", "田", "任", "姜",
    "范", "方", "石", "姚", "谭", "廖", "邹", "熊", "金", "陆",
    "郝", "孔", "白", "崔", "康", "毛", "邱", "秦", "江", "史",
    "顾", "侯", "邵", "孟", "龙", "万", "段", "雷", "钱", "汤",
    "尹", "黎", "易", "常", "武", "乔", "贺", "赖", "龚", "文",
    "关", "应", "绫", "凌", "严", "华", "陶", "云", "戚", "章",
    "葛", "鲁", "韦", "昌", "苗", "凤", "花", "俞", "柳", "费",
    "廉", "岑", "倪", "滕", "殷", "毕", "安", "乐", "齐", "伍",
    "元", "平", "和", "穆", "禹", "狄", "米", "贝", "明", "臧",
    "伏", "成", "茅", "庞", "纪", "舒", "屈", "项", "祝", "阮",
    "蓝", "闵", "席", "季", "童", "颜", "梅", "盛", "刁", "骆",
    "樊", "霍", "虞", "柯", "管", "莫", "房", "裘", "缪", "宗",
    "单", "杭", "洪", "包", "诸", "左", "吉", "邢", "裴", "荣",
    "翁", "荀", "惠", "甄", "曲", "家", "封", "储", "靳", "松",
    "井", "富", "巫", "乌", "焦", "巴", "弓", "牧", "山", "谷",
    "车", "全", "班", "秋", "仲", "伊", "宫", "宁", "仇", "栾",
    "甘", "厉", "戎", "祖", "符", "景", "詹", "束", "幸", "司",
    "韶", "薄", "印", "宿", "白", "怀", "蒲", "鄂", "索", "卓",
    "屠", "蒙", "池", "阴", "双", "闻", "莘", "党", "翟", "姬",
    "申", "冉", "桂", "牛", "寿", "通", "边", "燕", "温", "别",
    "庄", "晏", "柴", "瞿", "慕", "连", "艾", "向", "古", "慎",
    "衡", "步", "耿", "满", "弘", "匡", "国", "广", "东", "欧",
    "利", "越", "师", "聂", "敖", "冷", "辛", "简", "沙", "楚",
    "岳", "师", "墨", "佟", "言", "福", "聂"
  ]);

  const CHINESE_COMPOUND_SURNAMES = [
    "诸葛", "西门", "东方", "南宫", "欧阳", "独孤", "司马", "公孙",
    "上官", "令狐", "皇甫", "慕容", "端木", "百里", "拓跋", "宇文"
  ];

  const VALID_TITLE_CHARACTERS = new Set([
    "宗主", "掌门", "教主", "老祖", "师尊", "阁主", "庄主", "楼主",
    "掌柜", "太上长老", "道长", "大师", "住持", "仙尊", "神君", "圣女",
    "魔尊", "城主", "岛主", "府主", "总舵主", "太上皇"
  ]);

  const FORBIDDEN_CHARACTER_WORDS = new Set([
    "众人", "大家", "他们", "我们", "有人", "那人", "此人", "黑衣人", "神秘人",
    "蒙面人", "一人", "某人", "四周", "门外", "身旁", "身后", "台下", "远处",
    "突然", "这时", "片刻", "良久", "弟子", "属下", "小人", "在下", "奴才",
    "双方", "两人", "二人", "齐声", "此时", "正当", "只见", "忽见", "只听",
    "小厮", "丫鬟", "丫头", "下人", "家丁", "侍卫", "手下", "官兵", "侍从",
    "护卫", "刺客", "跑堂", "店小二", "路人", "行客", "大汉", "老汉", "老者",
    "少年", "少女", "青年", "中年人", "白衣女子", "黑衣青年", "为首之人", "为首者",
    "掌柜的", "伙计", "小二", "汉子", "老伯", "官差", "差役", "门房", "马夫",
    "车夫", "管家", "媒婆", "道童", "书童", "僧人", "和尚", "尼姑", "道士", "守卫"
  ]);

  /**
   * 严格角色人名与身份校验器 (彻底过滤非角色脏词、动作词与偶发噪点)
   */
  function isValidCharacterName(rawName) {
    if (!rawName || typeof rawName !== "string") return false;
    const name = rawName.trim().replace(/[^\u4e00-\u9fa5A-Za-z·]/g, "");

    // 1. 长度限制 (中文名通常 2~4 字，特殊带·的译名最多 6 字)
    if (name.length < 2 || name.length > 5) return false;

    // 2. 命中绝对黑名单
    if (FORBIDDEN_CHARACTER_WORDS.has(name)) return false;

    // 3. 泛称与龙套后缀过滤
    if (/.*(?:小厮|丫鬟|丫头|下人|家丁|侍卫|手下|侍从|护卫|弟子|门徒|门生|属下|刺客|官兵|将士|众将|众人|黑衣人|蒙面人|之辈|之人|之徒|道童|书童|老者|老汉|大汉|伙计|跑堂|小二|差役|官差|守卫)$/.test(name)) return false;

    // 4. 环境词、时间词与连词拦截
    if (/^(?:门外|窗外|堂前|堂下|阶下|殿前|殿下|身旁|身后|旁边|城头|楼上|楼下|此时|这时|只听|忽听|正当|得门|突然|随后|转眼|不知)/.test(name)) return false;
    if (/(?:寂静|大作|无声|狂风|屋内|屋外|突然|猛地|正当|这时|上写|记载|刻着|浮现|写道|心中|暗道|暗想|心想)/.test(name)) return false;

    // 5. 动词或动作短语拦截 (以动词开头或结尾)
    if (/^(?:走|跑|看|望|瞧|听|闻|叫|喊|叹|笑|怒|打|杀|拔|提|抚|按|立|回|转|进|出|来|去|带|拿|抓)/.test(name)) return false;
    if (/(?:而立|而行|而去|而来|而出|起来|过去|过来|一下|一声)$/.test(name)) return false;

    // 6. 属于法定宗门高阶尊称 (直接合法)
    if (VALID_TITLE_CHARACTERS.has(name)) return true;

    // 7. 复合姓氏开头 (如 诸葛孔明、南宫婉、司马懿、西门吹雪)
    for (const cSurname of CHINESE_COMPOUND_SURNAMES) {
      if (name.startsWith(cSurname) && name.length >= 3) return true;
    }

    // 8. 百家姓开头且长度为 2~3 (如 刘备、萧炎、林动、张飞、曹操、黄蓉、韩立)
    const firstChar = name[0];
    if (CHINESE_SURNAMES.has(firstChar)) return true;

    // 9. 亲昵称谓后缀 (如 蓉儿、婉儿、灵儿、宝玉、颦儿)
    if (name.length === 2 && (name.endsWith("儿") || name.endsWith("哥") || name.endsWith("妹") || name.endsWith("爷"))) {
      return true;
    }

    return false;
  }

  // 细粒度声学人设矩阵 (8大经典小说声学人设体系)
  const ARCHETYPE_VOICE_MATRIX = {
    youngMale_hotblood: {
      primaryVoice: "zh-CN-YunjieNeural",
      fallbackVoices: ["zh-CN-YunfengNeural", "zh-CN-YunhaoNeural"],
      defaultPitch: 1.00,
      defaultRate: "+2%",
      style: "chat",
      label: "少年意气 · 热血少侠男主",
    },
    youngMale_gentle: {
      primaryVoice: "zh-CN-YunfengNeural",
      fallbackVoices: ["zh-CN-XiaochenNeural", "zh-CN-YunzeNeural", "zh-CN-YunjieNeural"],
      defaultPitch: 1.02,
      defaultRate: "0%",
      style: "chat",
      label: "温润如玉 · 谦谦君子儒雅",
    },
    mature_domineering: {
      primaryVoice: "zh-CN-YunyeNeural",
      fallbackVoices: ["zh-CN-YunjianNeural"],
      defaultPitch: 0.94,
      defaultRate: "-2%",
      style: "serious",
      label: "孤傲冷峻 · 磁性低音将帅霸总",
    },
    elder_villain: {
      primaryVoice: "zh-CN-YunzeNeural",
      fallbackVoices: ["zh-CN-YunjianNeural"],
      defaultPitch: 0.86,
      defaultRate: "-4%",
      style: "serious",
      label: "深沉老成 · 老谋深算长者/反派",
    },
    female_coldFairy: {
      primaryVoice: "zh-CN-XiaohanNeural",
      fallbackVoices: ["zh-CN-XiaoruiNeural"],
      defaultPitch: 1.06,
      defaultRate: "-1%",
      style: "gentle",
      label: "清冷仙子 · 高岭出尘御姐",
    },
    female_cuteSister: {
      primaryVoice: "zh-CN-XiaoshuangNeural",
      fallbackVoices: ["zh-CN-XiaoyiNeural"],
      defaultPitch: 1.16,
      defaultRate: "+4%",
      style: "cheerful",
      label: "灵动师妹 · 娇俏天真少女",
    },
    female_matureMother: {
      primaryVoice: "zh-CN-XiaoruiNeural",
      fallbackVoices: ["zh-CN-XiaoxiaoNeural"],
      defaultPitch: 0.96,
      defaultRate: "-2%",
      style: "serious",
      label: "端庄母仪 · 威严长者主母",
    },
    female_gentleGirl: {
      primaryVoice: "zh-CN-XiaoyiNeural",
      fallbackVoices: ["zh-CN-XiaoxiaoNeural"],
      defaultPitch: 1.10,
      defaultRate: "+1%",
      style: "chat",
      label: "傲娇青梅 · 灵秀知性佳人",
    },
    child_boy: {
      primaryVoice: "zh-CN-YunxiaNeural",
      fallbackVoices: [],
      defaultPitch: 1.18,
      defaultRate: "+3%",
      style: "cheerful",
      label: "机敏正太 · 活力少儿童声",
    },
    child_girl: {
      primaryVoice: "zh-CN-XiaoyouNeural",
      fallbackVoices: [],
      defaultPitch: 1.25,
      defaultRate: "+3%",
      style: "cheerful",
      label: "软萌千金 · 奶气少儿童声",
    }
  };

  /**
   * 结合全书上下文代词 (他/她)、亲属称谓、江湖身份、官爵名号与姓名构词学，细粒度推断角色声学人设
   */
  function inferCharacterAttributes(charName, fullText = "") {
    const name = String(charName || "").trim();
    if (!name || name === "旁白") {
      return {
        gender: "male",
        ageGroup: "adult",
        role: "narrator",
        voice_name: "zh-CN-YunxiNeural",
        fallbackVoices: [],
        pitch: 0.96,
        rate_offset: "-2%",
        base_style: "narration-relaxed",
        archetype: "全知史诗旁白",
      };
    }

    // 1. 性别判定 (高精女性尊称/专属字库 + 强男性词库 + 全文代词统计)
    const famousFemalePattern = /(?:王熙凤|白浅|花千骨|薛宝钗|林黛玉|木婉清|李莫愁|宁中则|阿朱|阿紫|小昭|天山童姥|李秋水|秦可卿|赵敏|钟灵|黄蓉|周芷若|王语嫣|小龙女|东方不败)/;
    const strongFemalePattern = /(?:女|娘|姑|媳|妇|婆|妹|姐|妃|妻|妾|母|姨|妈|嬷|婢|丫鬟|丫头|仙子|夫人|姑娘|小姐|女帝|神女|魔女|圣女|妖女|师姐|师妹|师娘|师太|道姑|尼姑|公主|郡主|红颜|千金|贵妃|皇后|太后|老妪|嬷嬷|侍女|闺秀|老太君|太君|女侠|女官|才女|娇妻|美妇|少妇|娇娘|贵妇|侍妾|女将|女娃|丫环|童姥)/;
    const femaleDistinctiveCharPattern = /(?:姬|婉|婵|娟|娥|嫣|娇|婷|媚|珊|蓉|薰|琳|瑶|芷|萱|贞|蕊|蝶|萍|莲|莹|茜|倩|黛|钗|蛮|娜|妮|媛|妤|娴|姝|娆|馥|姿|蕾|绮|芙|薇|莉|莺|瑛|菲|芸|雯|姣|敏)/;
    const femaleRedupPattern = /(?:欢欢|依依|默默|盼盼|思思|念念|甜甜|糖糖|圆圆|晶晶|萌萌|盈盈|玲玲|婷婷|倩倩|璐璐|苗苗|薇薇|莉莉|茜茜|芳芳|青青|楚楚|怜怜|昭昭|双双|浅浅)/;
    
    const strongMalePattern = /(?:男|爷|侯|伯|叔|爹|父|兄|哥|弟|郎|僧|公|少爷|公子|少侠|大侠|剑客|刀客|书生|秀才|老汉|老头|管家|侍卫|太监|公公|道长|和尚|道士|道友|师兄|师弟|师叔|师伯|师傅|长老|掌教|教主|掌门|舵主|庄主|楼主|将军|元帅|校尉|都督|督邮|捕头|大人|王爷|殿下|皇上|陛下|宗主|尊者|天尊|魔皇|魔尊|大圣|阎王|尚书|宰相|丞相|主公|汉子|老衲|贫僧|真人|太傅|捕快|太守|巡抚|知县|提督|武将|剑圣|刀圣|狂生|男神|老祖|教头|堡主|门主|帮主|堂主|峰主|院长|府主|国师|侯爷|爵爷|督查|捕神|阎罗|法王|神僧|天王|霸王|霸主|豪杰|猛将|雄主|方丈|掌柜|店家|伙计|小二|小厮|差役|衙役|军士|兵卒|壮士|老朽|晚生|后生|西门吹雪|虚竹|李寻欢|陆小凤|徐凤年|张仪|后羿|陆竹|风清扬|令狐冲|段誉|张三丰|杨过|郭靖|乔峰|萧峰|楚留香|步惊云|聂风|秦霜|张无忌|韩立|林动|萧炎|牧尘|石昊|罗峰|孟浩|王林|苏铭|白小纯|陈平安|方源|周元|叶凡|曹操|刘备|关羽|张飞|赵云|诸葛亮|孙权|周瑜|司马懿|杜若|林若虚|沈炼|云中鹤)/;

    let isFemale = false;
    if (famousFemalePattern.test(name)) {
      isFemale = true;
    } else if (strongMalePattern.test(name)) {
      isFemale = false;
    } else if (strongFemalePattern.test(name) || femaleRedupPattern.test(name) || femaleDistinctiveCharPattern.test(name)) {
      isFemale = true;
    }

    // 全文代词上下文佐证统计 (以文中实际出现的“他”/“她”为终极依据)
    if (fullText && typeof fullText === "string" && fullText.length > 0) {
      let heCount = 0;
      let sheCount = 0;
      let pos = 0;
      let foundTimes = 0;
      while (pos < fullText.length && foundTimes < 20) {
        const idx = fullText.indexOf(name, pos);
        if (idx === -1) break;
        foundTimes++;
        const snippet = fullText.slice(Math.max(0, idx - 50), Math.min(fullText.length, idx + name.length + 80));
        heCount += (snippet.match(/他/g) || []).length;
        sheCount += (snippet.match(/她/g) || []).length;
        pos = idx + name.length;
      }
      if (sheCount >= 2 && sheCount > heCount) isFemale = true;
      else if (heCount >= 2 && heCount > sheCount) isFemale = false;
      else if (sheCount > 0 && heCount === 0) isFemale = true;
      else if (heCount > 0 && sheCount === 0) isFemale = false;
    }

    // 2. 年龄与身份人设分类
    let key = "youngMale_hotblood";

    if (isFemale) {
      if (/(童|幼|女童|萌|小丫头|糖糖|豆豆|妞妞|丫环|小妹)/.test(name)) {
        key = "child_girl";
      } else if (/(仙子|女帝|圣女|神女|冰|雪|冷|寒|白|月|宛|琪|清竹|高岭|太上)/.test(name)) {
        key = "female_coldFairy";
      } else if (/(儿|妹|灵|双|蓉|俏|丫头|欢欢|依依|萌|敏)/.test(name)) {
        key = "female_cuteSister";
      } else if (/(母|太后|夫人|老太|师娘|主母|婆|老妪|太君|老太君|童姥)/.test(name)) {
        key = "female_matureMother";
      } else {
        key = "female_gentleGirl";
      }
    } else {
      if (/(童|幼童|小宝|正太|豆豆|虎子)/.test(name)) {
        key = "child_boy";
      } else if (/(老|祖|翁|尊|药|怪|鬼|魔|煞|邪|毒|长老|反派|督邮|太师|方丈|老朽)/.test(name)) {
        key = "elder_villain";
      } else if (/(宗主|掌门|教主|帝|皇|王|霸|将|帅|侯|关羽|曹操|将军|捕头|大人|庄主|都督)/.test(name)) {
        key = "mature_domineering";
      } else if (/(生|秀才|书生|谋|孔明|诸葛|刘备|先生|文|公子|谦|君子|儒|风|竹|若)/.test(name)) {
        key = "youngMale_gentle";
      } else {
        key = "youngMale_hotblood";
      }
    }

    const cfg = ARCHETYPE_VOICE_MATRIX[key] || ARCHETYPE_VOICE_MATRIX.youngMale_hotblood;

    return {
      categoryKey: key,
      gender: isFemale ? "female" : "male",
      role: key.startsWith("child") ? "child" : (key.includes("elder") || key.includes("mature") ? "mature" : (isFemale ? "youngFemale" : "youngMale")),
      voice_name: cfg.primaryVoice,
      fallbackVoices: cfg.fallbackVoices,
      pitch: cfg.defaultPitch,
      rate_offset: cfg.defaultRate,
      base_style: cfg.style,
      archetype: cfg.label,
    };
  }

  /**
   * 细粒度保真人设音色分配 (即使多人共享也能通过同人设备选池与声学微调保证人设永不串味)
   */
  function assignRefinedVoice(charName, attrs, usedVoiceTracker) {
    let chosenVoice = attrs.voice_name;
    let finalPitch = attrs.pitch;
    let finalRate = attrs.rate_offset;

    if (usedVoiceTracker[chosenVoice]) {
      // 1. 优先尝试人设同类备选音色 (绝不跨越人设)
      let foundFallback = false;
      for (const fb of (attrs.fallbackVoices || [])) {
        if (!usedVoiceTracker[fb]) {
          chosenVoice = fb;
          foundFallback = true;
          break;
        }
      }

      // 2. 如果同类备选也用过了，在首选音色上进行人设保真声学微调 (Pitch ±0.03x, Rate ±2%)
      if (!foundFallback) {
        const reuseIndex = usedVoiceTracker[chosenVoice];
        const pitchDelta = (reuseIndex % 2 === 1 ? 1 : -1) * 0.03 * Math.ceil(reuseIndex / 2);
        finalPitch = Math.max(0.80, Math.min(1.25, parseFloat((attrs.pitch + pitchDelta).toFixed(2))));
        const currentRateVal = parseInt(attrs.rate_offset) || 0;
        const rateDelta = (reuseIndex % 2 === 1 ? 2 : -2);
        finalRate = `${currentRateVal + rateDelta > 0 ? "+" : ""}${currentRateVal + rateDelta}%`;
      }
    }

    usedVoiceTracker[chosenVoice] = (usedVoiceTracker[chosenVoice] || 0) + 1;

    return {
      voice_name: chosenVoice,
      pitch: finalPitch,
      rate_offset: finalRate,
      base_style: attrs.base_style,
      archetype: attrs.archetype,
      role: attrs.role,
      gender: attrs.gender,
    };
  }

  /**
   * 智能装配全书角色配音树（自动对齐性别、细粒度人设背景、音调与最佳音色，杜绝人设与性别错配）
   */
  function autoCastNovelCharacterTree(novel, recommendedSchemeId = "custom_aimanga_universe_full") {
    if (!novel || !novel.characterTree) return false;
    const tree = novel.characterTree;
    const rec = analyzeNovelGenre(novel.title, novel.rawText, Object.keys(tree));
    const targetSchemeId = recommendedSchemeId || rec.recommendedSchemeId;

    // 先应用选定方案模板的骨架配置
    applySchemeToNovel(novel, targetSchemeId);

    const usedVoiceTracker = {};
    if (tree["旁白"]?.voice_name) usedVoiceTracker[tree["旁白"].voice_name] = 1;

    // 针对每位角色进行性别与人设智能精准适配
    for (const [charName, conf] of Object.entries(tree)) {
      if (charName === "旁白") continue;

      const attrs = inferCharacterAttributes(charName, novel.rawText || "");
      const allocated = assignRefinedVoice(charName, attrs, usedVoiceTracker);

      conf.role = allocated.role;
      conf.gender = allocated.gender;
      conf.voice_name = allocated.voice_name;
      conf.pitch = allocated.pitch;
      conf.rate_offset = allocated.rate_offset;
      conf.base_style = allocated.base_style;
      conf.archetype = allocated.archetype;
    }

    StorageManager.saveCurrentNovel(novel);
    return true;
  }

  // 经典示例小说库 (预置供即时测试)
  const NOVEL_SAMPLES = {
    sanguo: {
      title: "三国演义",
      text: `第一回 宴桃园豪杰三结义

话说天下大势，分久必合，合久必分。周末七国分争，并入于秦。及秦灭之后，楚、汉分争，又并入于汉。

“天下将乱，英雄当起。”刘备望着市井烟尘，低声说道。

张飞大笑道：“大丈夫不与国家出力，何故长叹？”

关羽抚须道：“若二位有心扶危济困，某愿同往。”

第二回 张翼德怒鞭督邮

玄德领军回县，百姓夹道相迎。督邮到县，傲慢无礼，众人皆有怒色。

“此人欺我兄长太甚！”张飞怒喝道，“今日若不教训他，怎显英雄本色？”

刘备叹道：“三弟不可鲁莽，且看事势如何。”`,
    },
    xianxia: {
      title: "凡人修仙传 · 乱星海",
      text: `第十五回 猎妖之途

漫漫星海，烟波浩渺。韩立立于飞舟之上，神识缓缓散开。

“韩兄，前方便是风煞盘踞的赤鳞岛了。”宛儿轻声提醒道，眸中略带忧色。

韩立神色平静，袖袍一挥：“无妨，只要那头六级海妖现身，必叫它有来无回。”

乌蒙长老在舱内缓缓睁眼，沙哑笑道：“后生可畏啊，老朽这柄断魂剑，也多年未曾饮血了。”`,
    },
    qingyunian: {
      title: "庆余年 · 京都风云",
      text: `第三卷 苍山雪

范闲坐在马车前沿，手握缰绳，看着远处的皑皑雪山，嘴角噙着一抹若有若无的笑意。

“小范大人，鉴查院的密信到了。”王启年一路小跑赶来，喘息着递上油布包裹。

林婉儿掀开车帘，柔声唤道：“闲哥哥，外头天寒，快进车厢来饮杯热茶吧。”

范闲回头爽朗一笑：“放心，这点风雪还冻不着我。”`,
    },
  };

  /* -------------------------------------------------------------
     统一本地存储管理器 (Shared Storage Manager)
  ------------------------------------------------------------- */
  const STORAGE_KEYS = {
    CURRENT_NOVEL: "novelTts_currentNovel",
    PAST_NOVELS: "novelTts_pastNovels",
    CUSTOM_TREES: "novelTts_customTrees",
    THEME: "novelTtsTheme",
  };

  const StorageManager = {
    getCurrentNovel() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_NOVEL);
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.warn("Failed to load current novel", e);
      }
      // 默认初始小说
      return {
        id: "novel_sanguo_default",
        title: NOVEL_SAMPLES.sanguo.title,
        rawText: NOVEL_SAMPLES.sanguo.text,
        updatedAt: new Date().toISOString(),
        characterTree: {
          "旁白": { character_name: "旁白", role: "narrator", voice_name: "zh-CN-YunjianNeural", pitch: 0.96, rate_offset: "-2%", base_style: "sports-commentary" },
          "刘备": { character_name: "刘备", role: "mature", voice_name: "zh-CN-YunyeNeural", pitch: 0.92, rate_offset: "-2%", base_style: "serious" },
          "张飞": { character_name: "张飞", role: "mature", voice_name: "zh-CN-YunyeNeural", pitch: 0.94, rate_offset: "+4%", base_style: "angry" },
          "关羽": { character_name: "关羽", role: "mature", voice_name: "zh-CN-YunzeNeural", pitch: 0.88, rate_offset: "-3%", base_style: "serious" },
        },
      };
    },

    saveCurrentNovel(novel) {
      if (!novel) return;
      novel.updatedAt = new Date().toISOString();
      try {
        if (!novel.rawText || novel.rawText.length <= 30000) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_NOVEL, JSON.stringify(novel));
          return;
        }
        // 对于超长正文，做安全轻量化快照，防止触发浏览器 LocalStorage 5MB 配额溢出 (QuotaExceededError)
        const lightweightNovel = {
          ...novel,
          rawText: novel.rawText.slice(0, 30000) + "\n\n... [为保护本地浏览器存储配额，已持久化前 30,000 字与全部角色树/章节元数据] ...",
          _isTruncatedInStorage: true,
          _fullLength: novel.rawText.length,
        };
        localStorage.setItem(STORAGE_KEYS.CURRENT_NOVEL, JSON.stringify(lightweightNovel));
      } catch (e) {
        console.warn("LocalStorage saveCurrentNovel 达到配额上限，正在执行极限精简保护存储...", e);
        try {
          const minimalNovel = {
            id: novel.id,
            title: novel.title,
            updatedAt: novel.updatedAt,
            characterTree: novel.characterTree,
            chapters: (novel.chapters || []).map((ch) => ({
              id: ch.id,
              title: ch.title,
              dialogueCount: ch.dialogueCount,
              selected: ch.selected,
            })),
            _isTruncatedInStorage: true,
          };
          localStorage.setItem(STORAGE_KEYS.CURRENT_NOVEL, JSON.stringify(minimalNovel));
        } catch (innerErr) {
          console.error("Failed to persist novel to localStorage:", innerErr);
        }
      }
    },

    getPastNovels() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.PAST_NOVELS);
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.warn("Failed to load past novels", e);
      }
      // 预置默认过往小说库（供跨小说移植演示）
      const initial = [
        {
          id: "past_xianxia_01",
          title: "凡人修仙传",
          description: "经典仙侠修真，层次丰富，包含韩立、南宫婉、墨大夫等经典人物",
          updatedAt: "2026-10-10T12:00:00Z",
          characters: {
            "旁白": { character_name: "旁白", role: "narrator", voice_name: "zh-CN-YunxiNeural", pitch: 0.94, rate_offset: "-2%", base_style: "narration-relaxed" },
            "韩立": { character_name: "韩立", role: "youngMale", voice_name: "zh-CN-YunjieNeural", pitch: 1.0, rate_offset: "+2%", base_style: "chat" },
            "南宫婉": { character_name: "南宫婉", role: "youngFemale", voice_name: "zh-CN-XiaohanNeural", pitch: 1.1, rate_offset: "+2%", base_style: "gentle" },
            "墨大夫": { character_name: "墨大夫", role: "elderVillain", voice_name: "zh-CN-YunzeNeural", pitch: 0.8, rate_offset: "-6%", base_style: "serious" },
            "噬金虫道童": { character_name: "噬金虫道童", role: "child", voice_name: "zh-CN-YunxiaNeural", pitch: 1.24, rate_offset: "+4%", base_style: "cheerful" },
          },
        },
        {
          id: "past_qingyunian_02",
          title: "庆余年",
          description: "古代权谋传奇，包含范闲、林婉儿、陈萍萍、王启年等音色",
          updatedAt: "2026-10-11T14:30:00Z",
          characters: {
            "旁白": { character_name: "旁白", role: "narrator", voice_name: "zh-CN-YunyangNeural", pitch: 1.0, rate_offset: "+0%", base_style: "newscast" },
            "范闲": { character_name: "范闲", role: "youngMale", voice_name: "zh-CN-YunhaoNeural", pitch: 1.02, rate_offset: "+3%", base_style: "cheerful" },
            "林婉儿": { character_name: "林婉儿", role: "youngFemale", voice_name: "zh-CN-XiaohanNeural", pitch: 1.08, rate_offset: "+1%", base_style: "gentle" },
            "陈萍萍": { character_name: "陈萍萍", role: "elderVillain", voice_name: "zh-CN-YunzeNeural", pitch: 0.82, rate_offset: "-4%", base_style: "whispering" },
            "王启年": { character_name: "王启年", role: "mature", voice_name: "zh-CN-YunfengNeural", pitch: 1.04, rate_offset: "+5%", base_style: "chat" },
          },
        },
      ];
      this.savePastNovels(initial);
      return initial;
    },

    savePastNovels(list) {
      try {
        localStorage.setItem(STORAGE_KEYS.PAST_NOVELS, JSON.stringify(list));
      } catch (e) {
        console.warn("Failed to save past novels", e);
      }
    },

    addOrUpdatePastNovel(novelData) {
      const list = this.getPastNovels();
      const idx = list.findIndex((n) => n.id === novelData.id || n.title === novelData.title);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...novelData, updatedAt: new Date().toISOString() };
      } else {
        list.unshift({
          id: novelData.id || `novel_${Date.now()}`,
          title: novelData.title,
          description: novelData.description || `由小说《${novelData.title}》提取生成的角色音频树`,
          updatedAt: new Date().toISOString(),
          characters: novelData.characters || {},
        });
      }
      this.savePastNovels(list);
    },

    getCustomTrees() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_TREES);
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.warn("Failed to load custom trees", e);
      }
      // 预置默认自建音频树
      const initial = [
        {
          id: "custom_cyberpunk",
          name: "赛博科幻战队",
          description: "硬核未来科技声线，冷峻AI、热血黑客、铁血雇佣兵",
          updatedAt: "2026-10-12T08:00:00Z",
          characters: {
            "主脑AI": { character_name: "主脑AI", role: "narrator", voice_name: "zh-CN-XiaoruiNeural", pitch: 1.0, rate_offset: "+0%", base_style: "calm" },
            "黑客少年": { character_name: "黑客少年", role: "youngMale", voice_name: "zh-CN-YunhaoNeural", pitch: 1.05, rate_offset: "+5%", base_style: "excited" },
            "义体武士": { character_name: "义体武士", role: "mature", voice_name: "zh-CN-YunyeNeural", pitch: 0.9, rate_offset: "-3%", base_style: "serious" },
            "冷酷特工": { character_name: "冷酷特工", role: "youngFemale", voice_name: "zh-CN-XiaoyiNeural", pitch: 1.1, rate_offset: "+2%", base_style: "chat" },
          },
        },
        {
          id: "custom_fairytale",
          name: "亲子睡前童话组",
          description: "温馨轻柔，童趣天真，适合童话与睡前故事演播",
          updatedAt: "2026-10-12T09:30:00Z",
          characters: {
            "故事妈妈": { character_name: "故事妈妈", role: "narrator", voice_name: "zh-CN-XiaoxiaoNeural", pitch: 1.05, rate_offset: "-4%", base_style: "gentle" },
            "淘气小松鼠": { character_name: "淘气小松鼠", role: "child", voice_name: "zh-CN-YunxiaNeural", pitch: 1.25, rate_offset: "+4%", base_style: "cheerful" },
            "兔妹妹": { character_name: "兔妹妹", role: "child", voice_name: "zh-CN-XiaoyouNeural", pitch: 1.3, rate_offset: "+0%", base_style: "gentle" },
            "智慧老鹿爷爷": { character_name: "智慧老鹿爷爷", role: "elderVillain", voice_name: "zh-CN-YunzeNeural", pitch: 0.85, rate_offset: "-5%", base_style: "serious" },
          },
        },
      ];
      this.saveCustomTrees(initial);
      return initial;
    },

    saveCustomTrees(trees) {
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_TREES, JSON.stringify(trees));
      } catch (e) {
        console.warn("Failed to save custom trees", e);
      }
    },

    addCustomTree(tree) {
      const trees = this.getCustomTrees();
      trees.unshift(tree);
      this.saveCustomTrees(trees);
    },

    saveCustomTree(id, treeData) {
      const trees = this.getCustomTrees();
      const payload = {
        ...treeData,
        id: id || treeData.id || `custom_${Date.now()}`,
        name: treeData.name || "未命名配音树",
        characters: treeData.characterTree || treeData.characters || {},
        characterTree: treeData.characterTree || treeData.characters || {},
        updatedAt: new Date().toISOString(),
      };
      const idx = trees.findIndex((t) => t.id === payload.id);
      if (idx >= 0) {
        trees[idx] = payload;
      } else {
        trees.unshift(payload);
      }
      this.saveCustomTrees(trees);
      return payload;
    },

    deleteCustomTree(id) {
      let trees = this.getCustomTrees();
      trees = trees.filter((t) => t.id !== id);
      this.saveCustomTrees(trees);
    },
  };

  /* -------------------------------------------------------------
     共享音频试听与合成引擎 (Shared Audio Engine)
  ------------------------------------------------------------- */
  const AudioEngine = {
    voices: [],
    _isPlaying: false,
    _currentUtterance: null,
    _audioElement: null,
    _pulseInterval: null,
    ttsServerUrl: "http://127.0.0.1:8768",
    isServerOnline: null,
    _hasShownFallbackTip: false,

    init() {
      this.checkServerHealth();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        this.voices = window.speechSynthesis.getVoices();
        window.speechSynthesis.addEventListener("voiceschanged", () => {
          this.voices = window.speechSynthesis.getVoices();
        });
      }
    },

    async checkServerHealth() {
      if (typeof window === "undefined" || !window.fetch) return false;
      const candidatePorts = [8768, 8765];
      for (const p of candidatePorts) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 600);
          const res = await fetch(`http://127.0.0.1:${p}/api/health`, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "online") {
              this.ttsServerUrl = `http://127.0.0.1:${p}`;
              this.isServerOnline = true;
              return true;
            }
          }
        } catch (e) {}
      }
      this.isServerOnline = false;
      return false;
    },

    async analyzeUserAudio(audioBase64, filename = "user_audio.wav", characterHint = "") {
      await this.checkServerHealth();
      if (!this.isServerOnline) {
        throw new Error("TTS与声音学习后台服务未开启，请先双击运行根目录下的【启动TTS真实男声服务.bat】！");
      }
      const res = await fetch(`${this.ttsServerUrl}/api/voice/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio_base64: audioBase64, filename, character_hint: characterHint }),
      });
      const data = await res.json();
      if (!res.ok || data.status !== "ok") {
        throw new Error(data.message || "声学特征分析失败");
      }
      return data.analysis;
    },

    async trainCustomTree(treeId, treeName, learnedProfile, assignedRoleName = "主角男声", description = "") {
      await this.checkServerHealth();
      if (!this.isServerOnline) {
        throw new Error("TTS与声音学习后台服务未开启，请先双击运行根目录下的【启动TTS真实男声服务.bat】！");
      }
      const res = await fetch(`${this.ttsServerUrl}/api/voice/train-tree`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tree_id: treeId,
          tree_name: treeName,
          learned_profile: learnedProfile,
          assigned_role_name: assignedRoleName,
          description: description,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.status !== "ok") {
        throw new Error(data.message || "专属语音树生成失败");
      }
      return data.tree;
    },

    async loadServerCustomTrees() {
      try {
        await this.checkServerHealth();
        if (!this.isServerOnline) return {};
        const res = await fetch(`${this.ttsServerUrl}/api/voice/custom-trees`);
        if (res.ok) {
          const data = await res.json();
          return data.trees || {};
        }
      } catch (e) {}
      return {};
    },

    /**
     * 解析 EPUB 格式电子书文件，提取规范书籍章节与元数据
     */
    async parseEpub(fileOrBase64, filename = "novel.epub") {
      await this.checkServerHealth();
      if (!this.isServerOnline) {
        throw new Error("TTS与电子书解析后台服务未开启，请先双击运行根目录下的【启动TTS真实男声服务.bat】！");
      }
      let base64 = "";
      if (typeof fileOrBase64 === "string") {
        base64 = fileOrBase64;
      } else if (fileOrBase64 instanceof Blob || fileOrBase64 instanceof File) {
        base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(fileOrBase64);
        });
      }
      const res = await fetch(`${this.ttsServerUrl}/api/novel/parse-epub`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          epub_base64: base64,
          filename: filename || (fileOrBase64 && fileOrBase64.name) || "novel.epub",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.status !== "ok") {
        throw new Error(data.message || "EPUB 电子书解析失败");
      }
      return data;
    },

    isSupported() {
      return typeof window !== "undefined" && ("speechSynthesis" in window || true);
    },

    _audioPreloadMap: new Map(),

    getAudioServiceUrl(text, voiceName, rate = 1.0, pitch = 1.0, isTargetMale = false) {
      const cleanRate = `${(rate - 1.0) >= 0 ? "+" : ""}${Math.round((rate - 1.0) * 100)}%`;
      const cleanPitch = "+0Hz";
      const voiceId = voiceName || (isTargetMale ? "zh-CN-YunxiNeural" : "zh-CN-XiaoxiaoNeural");
      return `${this.ttsServerUrl}/api/tts?text=${encodeURIComponent(String(text || "").trim())}&voice=${encodeURIComponent(voiceId)}&rate=${encodeURIComponent(cleanRate)}&pitch=${encodeURIComponent(cleanPitch)}`;
    },

    preloadAudio(text, voiceName, rate = 1.0, pitch = 1.0, isTargetMale = false) {
      const textToSpeak = String(text || "").trim();
      if (!textToSpeak || this.isServerOnline === false) return;
      const url = this.getAudioServiceUrl(textToSpeak, voiceName, rate, pitch, isTargetMale);
      if (this._audioPreloadMap.has(url)) return;

      try {
        const audio = new Audio();
        audio.preload = "auto";
        audio.src = url;
        audio.load();
        this._audioPreloadMap.set(url, audio);

        if (this._audioPreloadMap.size > 24) {
          const firstKey = this._audioPreloadMap.keys().next().value;
          this._audioPreloadMap.delete(firstKey);
        }
      } catch (e) {}
    },

    isPlaying() {
      return this._isPlaying || Boolean(window.speechSynthesis && window.speechSynthesis.speaking) || Boolean(this._audioElement && !this._audioElement.paused);
    },

    /**
     * 核心演播发音方法：优先调用真实高清 Edge-TTS 原生流式服务 (解决单一女声与变调失真)，
     * 支持多句无感预加载 (Lookahead Queue)，彻底消除角色音色切换时的网络停顿与卡顿。
     */
    speak({
      text = "",
      voiceName = "",
      pitch = 1.0,
      rate = 1.0,
      volume = 1.0,
      style = "chat",
      gender = null,
      role = null,
      onStart = null,
      onEnd = null,
      onError = null,
    } = {}) {
      this.stop();

      const textToSpeak = String(text || "").trim();
      if (!textToSpeak) {
        onEnd?.();
        return null;
      }

      const voiceMeta = this.resolveVoiceMetadata(voiceName);
      const effectiveGender = gender || voiceMeta?.gender || (["youngMale", "mature", "elderVillain"].includes(role) ? "male" : (["youngFemale"].includes(role) ? "female" : null));
      const isTargetMale = effectiveGender === "male" || ["youngMale", "mature", "elderVillain"].includes(role) || (role === "narrator" && voiceMeta?.gender !== "female");

      // 1. 优先尝试本地真实高清 Neural TTS 服务 (100% 纯正男中音/少年音/长者音，绝无机械女声杂音)
      if (this.isServerOnline !== false) {
        const serviceUrl = this.getAudioServiceUrl(textToSpeak, voiceName, rate, pitch, isTargetMale);
        let audio = this._audioPreloadMap.get(serviceUrl);
        if (audio && audio.readyState >= 2) {
          // 预加载队列命中！即刻零延迟无缝播放
          audio.currentTime = 0;
          this._audioPreloadMap.delete(serviceUrl);
        } else {
          audio = new Audio();
          audio.src = serviceUrl;
        }
        audio.volume = Math.max(0, Math.min(1.0, volume));
        this._audioElement = audio;
        this._isPlaying = true;

        let playbackStarted = false;
        audio.onplay = () => {
          playbackStarted = true;
          this.isServerOnline = true;
          if (typeof KineticVFX !== "undefined") {
            KineticVFX.setSpeaking(true);
            KineticVFX.emitShockwave(window.innerWidth / 2, window.innerHeight * 0.38, 1.35);
          }
          onStart?.();
        };

        audio.onended = () => {
          this._isPlaying = false;
          if (typeof KineticVFX !== "undefined") KineticVFX.setSpeaking(false);
          this._audioElement = null;
          onEnd?.();
        };

        audio.onerror = () => {
          if (!playbackStarted) {
            // 本地服务未运行，自动平滑切回本地浏览器合成
            this.isServerOnline = false;
            this._audioElement = null;
            this._speakUtterance({ textToSpeak, voiceMeta, effectiveGender, isTargetMale, role, pitch, rate, volume, style, onStart, onEnd, onError });
          } else {
            this._isPlaying = false;
            if (typeof KineticVFX !== "undefined") KineticVFX.setSpeaking(false);
            this._audioElement = null;
            onError?.(new Error("Audio stream failed"));
          }
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            if (!playbackStarted) {
              this.isServerOnline = false;
              this._audioElement = null;
              this._speakUtterance({ textToSpeak, voiceMeta, effectiveGender, isTargetMale, role, pitch, rate, volume, style, onStart, onEnd, onError });
            }
          });
        }
        return audio;
      }

      // 2. 降级走客户端 Web Speech API
      return this._speakUtterance({ textToSpeak, voiceMeta, effectiveGender, isTargetMale, role, pitch, rate, volume, style, onStart, onEnd, onError });
    },

    _speakUtterance({ textToSpeak, voiceMeta, effectiveGender, isTargetMale, role, pitch, rate, volume, style, onStart, onEnd, onError }) {
      if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
        console.warn("speechSynthesis not supported in this browser environment");
        if (typeof showToast === "function") showToast("当前浏览器未开启内置语音朗读，请检查浏览器权限。");
        onError?.(new Error("speechSynthesis not supported"));
        return null;
      }

      try {
        window.speechSynthesis.cancel();
      } catch (e) {}

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const matchedVoice = this.resolveBrowserVoice(voiceMeta, effectiveGender);

      if (matchedVoice) {
        utterance.voice = matchedVoice;
        utterance.lang = matchedVoice.lang || "zh-CN";
      } else {
        utterance.lang = "zh-CN";
      }

      // 情感与基频微调
      const emotionAdj = this.emotionAdjustment(style);
      const basePitch = typeof pitch === "number" ? pitch : (parseFloat(pitch) || 1.0);
      const baseRate = typeof rate === "number" ? rate : (parseFloat(rate) || 1.0);

      // 智能声学变调校准：解决操作系统默认仅有单一女声(如 Microsoft Huihui)导致全部角色听起来都是女声的声学缺陷
      const isFemaleSynthesizer = this.isSynthesizerVoiceFemale(matchedVoice);
      const roleCategory = role || voiceMeta?.category || "narrator";

      let acousticPitch = basePitch;
      let acousticRate = baseRate;

      if (isFemaleSynthesizer && isTargetMale) {
        if (roleCategory === "elderVillain") {
          acousticPitch = Math.max(0.35, Math.min(0.48, basePitch * 0.44));
          acousticRate = baseRate * 0.92;
        } else if (roleCategory === "mature") {
          acousticPitch = Math.max(0.42, Math.min(0.53, basePitch * 0.50));
          acousticRate = baseRate * 0.96;
        } else if (roleCategory === "youngMale") {
          acousticPitch = Math.max(0.48, Math.min(0.60, basePitch * 0.56));
          acousticRate = baseRate * 1.02;
        } else {
          acousticPitch = Math.max(0.45, Math.min(0.55, basePitch * 0.50));
          acousticRate = baseRate * 0.98;
        }

        // 仅在首次遇到男声使用本地降级引擎时提示一次真实音色启动方案
        if (!this._hasShownFallbackTip) {
          this._hasShownFallbackTip = true;
          if (typeof showToast === "function") {
            showToast("💡 提示：双击运行『启动TTS真实男声服务.bat』，即可立即开启 100% 电影级原声男声音色！", 6000);
          }
        }
      } else if (roleCategory === "child") {
        acousticPitch = Math.max(1.35, Math.min(1.75, basePitch * 1.42));
        acousticRate = baseRate * 1.05;
      } else if (roleCategory === "youngFemale") {
        acousticPitch = Math.max(1.05, Math.min(1.22, basePitch * (isFemaleSynthesizer ? 1.08 : 1.55)));
      } else if (roleCategory === "elderVillain" && !isTargetMale) {
        acousticPitch = Math.max(0.72, Math.min(0.85, basePitch * 0.82));
      }

      utterance.pitch = Math.max(0.1, Math.min(2.0, acousticPitch + emotionAdj.pitch));
      utterance.rate = Math.max(0.5, Math.min(2.0, acousticRate + emotionAdj.rate));
      utterance.volume = Math.max(0, Math.min(1.0, volume));

      this._isPlaying = true;
      this._currentUtterance = utterance;

      let hasEnded = false;
      const cleanEnd = () => {
        if (hasEnded) return;
        hasEnded = true;
        this._isPlaying = false;
        this._currentUtterance = null;
        if (typeof KineticVFX !== "undefined") KineticVFX.setSpeaking(false);
        if (this._pulseInterval) {
          clearInterval(this._pulseInterval);
          this._pulseInterval = null;
        }
      };

      utterance.onstart = () => {
        this._isPlaying = true;
        if (typeof KineticVFX !== "undefined") {
          KineticVFX.setSpeaking(true);
          KineticVFX.emitShockwave(window.innerWidth / 2, window.innerHeight * 0.38, 1.35);
        }
        onStart?.();

        if (this._pulseInterval) clearInterval(this._pulseInterval);
        this._pulseInterval = setInterval(() => {
          if (window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 8000);
      };

      utterance.onend = () => {
        cleanEnd();
        onEnd?.();
      };

      utterance.onerror = (e) => {
        if (e.error === "canceled" || e.error === "interrupted") {
          cleanEnd();
          return;
        }
        cleanEnd();
        console.warn("Speech synthesis utterance error:", e);
        onError?.(e);
      };

      const approxDurationSec = Math.max(2, (textToSpeak.length / (3.2 * utterance.rate)) + 3.0);
      const watchdogTimer = setTimeout(() => {
        if (!hasEnded && this._currentUtterance === utterance) {
          if (!window.speechSynthesis.speaking) {
            cleanEnd();
            onEnd?.();
          }
        }
      }, approxDurationSec * 1000);

      const originalOnEnd = utterance.onend;
      utterance.onend = () => {
        clearTimeout(watchdogTimer);
        originalOnEnd?.();
      };

      try {
        window.speechSynthesis.speak(utterance);
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (err) {
        cleanEnd();
        console.warn("speechSynthesis.speak failed", err);
        onError?.(err);
      }

      return utterance;
    },

    playAudioUrl(url, { onStart, onEnd, onError } = {}) {
      this.stop();
      if (!url) return null;

      const audio = new Audio(url);
      this._audioElement = audio;
      this._isPlaying = true;

      audio.onplay = () => {
        this._isPlaying = true;
        if (typeof KineticVFX !== "undefined") {
          KineticVFX.setSpeaking(true);
          KineticVFX.emitShockwave(window.innerWidth / 2, window.innerHeight * 0.4, 1.35);
        }
        onStart?.();
      };

      audio.onended = () => {
        this._isPlaying = false;
        if (typeof KineticVFX !== "undefined") KineticVFX.setSpeaking(false);
        this._audioElement = null;
        onEnd?.();
      };

      audio.onerror = (e) => {
        this._isPlaying = false;
        if (typeof KineticVFX !== "undefined") KineticVFX.setSpeaking(false);
        this._audioElement = null;
        onError?.(e);
      };

      audio.play().catch((err) => {
        this._isPlaying = false;
        if (typeof KineticVFX !== "undefined") KineticVFX.setSpeaking(false);
        this._audioElement = null;
        onError?.(err);
      });

      return audio;
    },

    stop() {
      this._isPlaying = false;
      this._currentUtterance = null;
      if (typeof KineticVFX !== "undefined") KineticVFX.setSpeaking(false);
      if (this._pulseInterval) {
        clearInterval(this._pulseInterval);
        this._pulseInterval = null;
      }

      if (this._audioElement) {
        try {
          this._audioElement.pause();
          this._audioElement.currentTime = 0;
        } catch (e) {}
        this._audioElement = null;
      }

      if ("speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
    },

    pause() {
      if (this._audioElement) {
        this._audioElement.pause();
      } else if ("speechSynthesis" in window) {
        window.speechSynthesis.pause();
      }
      this._isPlaying = false;
    },

    resume() {
      if (this._audioElement) {
        this._audioElement.play();
        this._isPlaying = true;
      } else if ("speechSynthesis" in window) {
        window.speechSynthesis.resume();
        this._isPlaying = true;
      }
    },

    previewVoice(voiceId, text, pitch = 1.0, rateOffset = 0.0, style = "chat") {
      const voice = this.resolveVoiceMetadata(voiceId);
      const textToSpeak = text || (voice ? voice.sampleText : "试听音色配音效果。");
      return this.speak({
        text: textToSpeak,
        voiceName: voiceId,
        pitch: pitch,
        rate: 1.0 + (parseFloat(rateOffset) || 0),
        style: style,
        gender: voice?.gender,
        role: voice?.category,
      });
    },

    resolveVoiceMetadata(voiceId) {
      if (!voiceId) return null;
      if (AI_MANGA_VOICE_MAP[voiceId]) return AI_MANGA_VOICE_MAP[voiceId];
      if (MS_VOICE_MAP[voiceId]) return MS_VOICE_MAP[voiceId];
      if (GITHUB_AI_VOICE_MAP[voiceId]) return GITHUB_AI_VOICE_MAP[voiceId];
      const lower = String(voiceId).toLowerCase();
      const isMale = (lower.includes("male") || lower.includes("yun") || lower.includes("boy") || lower.includes("man") || lower.includes("long") || lower.includes("master") || lower.includes("lord") || lower.includes("monk") || lower.includes("jhe") || lower.includes("chen")) && !lower.includes("hsiaochen");
      return {
        id: voiceId,
        name: voiceId,
        gender: isMale ? "male" : "female",
        category: isMale ? "mature" : "youngFemale",
      };
    },

    isSynthesizerVoiceFemale(voice) {
      if (!voice) return true;
      const lower = (voice.name || "").toLowerCase();
      if (lower.includes("hsiaochen")) return true;
      const maleKeywords = [
        "kangkang", "danny", "yunxi", "yunyang", "yunjian", "yunjie",
        "yunfeng", "yunhao", "yunye", "yunze", "yunxia", "wanlung",
        "yunxiang", "yundeng", "yunjhe", "yunbiao", "xiaochen", "chen",
        "male", "男", "boy", "man"
      ];
      for (const kw of maleKeywords) {
        if (lower.includes(kw)) return false;
      }
      return true;
    },

    resolveBrowserVoice(targetVoiceMeta, targetGender) {
      if ("speechSynthesis" in window) {
        const currentVoices = window.speechSynthesis.getVoices();
        if (currentVoices && currentVoices.length) {
          this.voices = currentVoices;
        }
      }
      if (!this.voices.length) return null;

      const keywords = [];
      if (targetVoiceMeta) {
        if (targetVoiceMeta.name) keywords.push(targetVoiceMeta.name);
        if (targetVoiceMeta.fullName) {
          keywords.push(targetVoiceMeta.fullName.replace("zh-CN-", "").replace("zh-HK-", "").replace("zh-TW-", "").replace("Neural", ""));
        }
      }

      const chinese = this.voices.filter((v) => {
        const val = `${v.name} ${v.lang}`.toLowerCase();
        return val.includes("zh") || val.includes("chinese") || val.includes("中文") || val.includes("普通话") || (v.lang && v.lang.startsWith("zh"));
      });
      const pool = chinese.length ? chinese : this.voices;

      // 1. 精确名称 / 关键词匹配 (在 Edge 等浏览器优先精准匹配 Microsoft Yunxi Online 等官方自然音)
      for (const kw of keywords) {
        if (!kw) continue;
        const found = pool.find((v) => v.name.toLowerCase().includes(kw.toLowerCase()));
        if (found) return found;
      }

      // 2. 性别区分匹配（若目标为男声，且系统存在真正男声引擎如 Kangkang/Danny/Yunxi，优先匹配男声）
      const effectiveGender = targetGender || targetVoiceMeta?.gender;
      if (effectiveGender === "male") {
        const nativeMale = pool.find((v) => !this.isSynthesizerVoiceFemale(v));
        if (nativeMale) return nativeMale;
      } else if (effectiveGender === "female") {
        const nativeFemale = pool.find((v) => this.isSynthesizerVoiceFemale(v));
        if (nativeFemale) return nativeFemale;
      }

      // 3. 兜底返回中文池或首个语音
      return pool[0] || null;
    },

    emotionAdjustment(emotion) {
      const table = {
        angry: { rate: 0.08, pitch: 0.06 },
        cheerful: { rate: 0.06, pitch: 0.08 },
        sad: { rate: -0.09, pitch: -0.08 },
        fearful: { rate: 0.04, pitch: 0.1 },
        serious: { rate: -0.02, pitch: -0.02 },
        "narration-relaxed": { rate: -0.03, pitch: -0.03 },
        whispering: { rate: -0.05, pitch: -0.04 },
        "sports-commentary": { rate: 0.08, pitch: 0.04 },
      };
      return table[emotion] || { rate: 0, pitch: 0 };
    },
  };

  /* -------------------------------------------------------------
     Kinetic VFX & Acoustic Resonance Engine (Inspired by Arknights MV)
  ------------------------------------------------------------- */
  const KineticVFX = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    mouse: {
      x: 0,
      y: 0,
      rx: 0,
      ry: 0,
      nx: 0.5,
      ny: 0.5,
      down: false,
    },
    trailPoints: [],
    particles: [],
    shockwaves: [],
    rhythmEnergy: 0.0,
    isSpeaking: false,
    animId: null,

    init() {
      if (typeof window === "undefined" || typeof document === "undefined") return;

      // 1. 自动注入背景画布与拓扑/扫描线图层
      this.ensureOverlays();

      // 2. 初始化粒子阵列 (源石晶体与战术节点)
      this.initParticles();

      // 3. 绑定全局交互：鼠标移动、光丝轨迹与点击冲击波
      this.bindMouseEvents();

      // 4. 绑定工作台卡片 3D 视差透视与全息反光 (Holo-Glare)
      this.bindCardTilt();

      // 5. 启动 60FPS 动力学粒子与光影渲染循环
      this.startLoop();
    },

    ensureOverlays() {
      if (!document.getElementById("bg-canvas")) {
        const bgCanvas = document.createElement("canvas");
        bgCanvas.id = "bg-canvas";
        document.body.prepend(bgCanvas);
      }
      if (!document.querySelector(".topo-overlay")) {
        const topo = document.createElement("div");
        topo.className = "topo-overlay";
        topo.setAttribute("aria-hidden", "true");
        document.body.prepend(topo);
      }
      if (!document.querySelector(".scanline-overlay")) {
        const scan = document.createElement("div");
        scan.className = "scanline-overlay";
        scan.setAttribute("aria-hidden", "true");
        document.body.prepend(scan);
      }
      if (!document.querySelector(".kinetic-bg-marquee.top-marquee")) {
        const topMarquee = document.createElement("div");
        topMarquee.className = "kinetic-bg-marquee top-marquee";
        topMarquee.setAttribute("aria-hidden", "true");
        topMarquee.innerHTML = `<div class="marquee-track">PHONIC RESONANCE // MULTI-VOICE THEATER // ACOUSTIC SPECTRUM // RHODES SOUND LAB // NEURAL TTS ENGINE // PHONIC RESONANCE // MULTI-VOICE THEATER // ACOUSTIC SPECTRUM // RHODES SOUND LAB // NEURAL TTS ENGINE //</div>`;
        document.body.prepend(topMarquee);
      }
      if (!document.querySelector(".kinetic-bg-marquee.bottom-marquee")) {
        const bottomMarquee = document.createElement("div");
        bottomMarquee.className = "kinetic-bg-marquee bottom-marquee";
        bottomMarquee.setAttribute("aria-hidden", "true");
        bottomMarquee.innerHTML = `<div class="marquee-track">CROSS-NOVEL CHARACTER TRANSPLANTATION // ARBORIST HIERARCHY // SPECTRUM HARMONICS // 01001000 // CROSS-NOVEL CHARACTER TRANSPLANTATION // ARBORIST HIERARCHY // SPECTRUM HARMONICS // 01001000 //</div>`;
        document.body.prepend(bottomMarquee);
      }

      this.canvas = document.getElementById("bg-canvas");
      this.ctx = this.canvas.getContext("2d");
      this.resize();
      window.addEventListener("resize", () => this.resize());
    },

    resize() {
      if (!this.canvas) return;
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    },

    initParticles() {
      const count = Math.min(80, Math.max(45, Math.floor(window.innerWidth / 24)));
      this.particles = [];
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * (this.width || window.innerWidth),
          y: Math.random() * (this.height || window.innerHeight),
          vx: (Math.random() - 0.5) * 0.55,
          vy: (Math.random() - 0.5) * 0.55 - 0.1,
          size: Math.random() * 2.8 + 1.2,
          depth: Math.random() * 0.8 + 0.2,
          angle: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.02,
          isShard: Math.random() > 0.65,
        });
      }
    },

    bindMouseEvents() {
      window.addEventListener("mousemove", (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        this.mouse.nx = e.clientX / Math.max(1, window.innerWidth);
        this.mouse.ny = e.clientY / Math.max(1, window.innerHeight);

        document.documentElement.style.setProperty("--mouse-x", this.mouse.nx.toFixed(4));
        document.documentElement.style.setProperty("--mouse-y", this.mouse.ny.toFixed(4));

        // 光丝轨迹 (Mouse Light Ribbon)
        this.trailPoints.push({ x: e.clientX, y: e.clientY, life: 1.0 });
        if (this.trailPoints.length > 24) this.trailPoints.shift();
      });

      // 任何点击均发射物理声波共振冲击波
      window.addEventListener("mousedown", (e) => {
        this.mouse.down = true;
        this.emitShockwave(e.clientX, e.clientY, 1.1);
      });

      window.addEventListener("mouseup", () => {
        this.mouse.down = false;
      });
    },

    emitShockwave(x, y, power = 1.0) {
      this.shockwaves.push({
        x: x || window.innerWidth / 2,
        y: y || window.innerHeight / 2,
        radius: 4,
        maxRadius: 260 * power,
        alpha: 0.9,
        power,
      });
      this.rhythmEnergy = Math.min(1.4, this.rhythmEnergy + 0.5 * power);
    },

    setSpeaking(active) {
      this.isSpeaking = Boolean(active);
      if (active) {
        this.rhythmEnergy = Math.max(this.rhythmEnergy, 1.0);
      }
    },

    bindCardTilt() {
      // 保持所有操作台、母带控制舱与工作面板平稳静止，避免鼠标操作晃动
      const selector = "[data-tilt='true'], .workbench-card, .panel, .inspector-card, .tree-sidebar-card, .studio-master-deck, .chapter-item, .arborist-wrapper, .voice-library-monitor-deck";
      document.querySelectorAll(selector).forEach((card) => {
        card.style.transform = "none";
        card.removeAttribute("data-tilt");
        const existingGlare = card.querySelector(".holo-glare");
        if (existingGlare) existingGlare.remove();
      });
    },

    startLoop() {
      const render = (now) => {
        this.renderFrame(now);
        this.animId = requestAnimationFrame(render);
      };
      this.animId = requestAnimationFrame(render);
    },

    renderFrame(now) {
      if (!this.ctx || !this.width) return;
      const ctx = this.ctx;
      const width = this.width;
      const height = this.height;

      // 平滑跟随
      this.mouse.rx += (this.mouse.x - this.mouse.rx) * 0.18;
      this.mouse.ry += (this.mouse.y - this.mouse.ry) * 0.18;

      // 实时音频/脉冲能量衰减与语音起伏计算
      if (this.isSpeaking) {
        const speakMod = (Math.sin(now * 0.015) * Math.cos(now * 0.008) + 1) * 0.5;
        this.rhythmEnergy = 0.5 + speakMod * 0.7;
      } else {
        const ambientPulse = (Math.sin(now * 0.003) * 0.5 + 0.5) * 0.18;
        this.rhythmEnergy = Math.max(ambientPulse, this.rhythmEnergy * 0.94);
      }

      ctx.clearRect(0, 0, width, height);

      // 1. 绘制鼠标微光轨迹 (Mouse Light Ribbon)
      if (this.trailPoints.length > 1) {
        ctx.beginPath();
        for (let i = 0; i < this.trailPoints.length; i++) {
          const pt = this.trailPoints[i];
          pt.life -= 0.035;
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = "rgba(0, 229, 255, 0.22)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
        while (this.trailPoints.length && this.trailPoints[0].life <= 0) {
          this.trailPoints.shift();
        }
      }

      // 2. 粒子晶体运动与电磁网络连线
      const particles = this.particles;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * (1 + this.rhythmEnergy * 1.2);
        p.y += p.vy * (1 + this.rhythmEnergy * 1.2);
        p.angle += p.spin;

        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        // 鼠标斥力场与战术锁定光丝
        const dx = p.x - this.mouse.x;
        const dy = p.y - this.mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 160 && dist > 1) {
          const force = (160 - dist) / 160;
          p.x += (dx / dist) * force * 2.8;
          p.y += (dy / dist) * force * 2.8;

          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(this.mouse.x, this.mouse.y);
          ctx.strokeStyle = `rgba(0, 229, 255, ${force * 0.28})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        // 粒子间星轨连线
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const d2 = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (d2 < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 229, 255, ${(1 - d2 / 110) * 0.12})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }

        // 绘制晶体节点 / 钻石碎片
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        if (p.isShard) {
          ctx.strokeStyle = `rgba(245, 158, 11, ${0.35 + p.depth * 0.35})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 2);
          ctx.lineTo(p.size * 1.2, 0);
          ctx.lineTo(0, p.size * 2);
          ctx.lineTo(-p.size * 1.2, 0);
          ctx.closePath();
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(0, 229, 255, ${0.28 + p.depth * 0.4})`;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }
        ctx.restore();
      }

      // 3. 物理声学冲击波 (Acoustic Shockwaves)
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const sw = this.shockwaves[i];
        sw.radius += (sw.maxRadius - sw.radius) * 0.12 + 2.2;
        sw.alpha *= 0.92;

        ctx.save();
        ctx.translate(sw.x, sw.y);
        ctx.strokeStyle = `rgba(0, 229, 255, ${sw.alpha * 0.85})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, sw.radius, 0, Math.PI * 2);
        ctx.stroke();

        // 内部旋转菱形能量环
        ctx.rotate(sw.radius * 0.012);
        ctx.strokeStyle = `rgba(245, 158, 11, ${sw.alpha * 0.65})`;
        ctx.lineWidth = 1;
        const r2 = sw.radius * 0.72;
        ctx.strokeRect(-r2 / 2, -r2 / 2, r2, r2);
        ctx.restore();

        // 冲击波对周围粒子的物理推斥力
        particles.forEach((p) => {
          const d = Math.hypot(p.x - sw.x, p.y - sw.y);
          if (Math.abs(d - sw.radius) < 32) {
            const ang = Math.atan2(p.y - sw.y, p.x - sw.x);
            p.x += Math.cos(ang) * 4.2 * sw.alpha;
            p.y += Math.sin(ang) * 4.2 * sw.alpha;
          }
        });

        if (sw.alpha < 0.02) this.shockwaves.splice(i, 1);
      }

      // 4. 绘制底部 DAW 均衡器频谱波形 (#bottom-eq-canvas)
      const eqCanvas = document.getElementById("bottom-eq-canvas");
      if (eqCanvas) {
        if (eqCanvas.width !== width) {
          eqCanvas.width = width;
          eqCanvas.height = 24;
        }
        const eqCtx = eqCanvas.getContext("2d");
        eqCtx.clearRect(0, 0, width, 24);
        const eqCount = Math.floor(width / 11);
        const accentRGB = getComputedStyle(document.body).getPropertyValue("--accent-rgb").trim() || "0, 229, 255";
        for (let i = 0; i < eqCount; i++) {
          const n = Math.sin(i * 0.28 + now * 0.008) * Math.sin(i * 0.08 - now * 0.005);
          const bh = Math.max(2, Math.abs(n) * (14 + this.rhythmEnergy * 10));
          eqCtx.fillStyle = `rgba(${accentRGB}, ${this.isSpeaking ? 0.72 : 0.22})`;
          eqCtx.fillRect(i * 11, 24 - bh, 6, bh);
        }
      }
    },

    /**
     * 专业示波器与多层声频频谱渲染器 (Dual-Layer Master Oscilloscope)
     * 支持 studio.js 与 character-tree.js 即调即显
     */
    drawOscilloscope(canvas, { isActive = false, energy = null, label = "OSCILLOSCOPE // 44.1kHz" } = {}) {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      const width = canvas.width = Math.floor((rect.width || 380) * dpr);
      const height = canvas.height = Math.floor(58 * dpr);

      ctx.clearRect(0, 0, width, height);

      const e = energy !== null ? energy : this.rhythmEnergy;
      const now = Date.now() / 180;

      // 1. 战术标尺网格背景
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      const midY = height / 2;

      // 中心零电平线与上下标尺线
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.moveTo(0, midY - height * 0.32);
      ctx.lineTo(width, midY - height * 0.32);
      ctx.moveTo(0, midY + height * 0.32);
      ctx.lineTo(width, midY + height * 0.32);
      ctx.stroke();

      // 2. 频谱柱状体 (Spectrum Bars)
      const barCount = 48;
      const barWidth = Math.max(2 * dpr, (width / barCount) - 3 * dpr);
      for (let i = 0; i < barCount; i++) {
        let barHeight;
        if (isActive) {
          const wave1 = Math.sin(now * 1.2 + i * 0.32);
          const wave2 = Math.cos(now * 0.8 + i * 0.16);
          const env = Math.sin((i / barCount) * Math.PI);
          barHeight = Math.abs(wave1 * wave2) * (height * 0.72) * (0.35 + e * 0.65) * env + 4 * dpr;
        } else {
          barHeight = (Math.sin(i * 0.28 + now * 0.3) + 1.2) * 4 * dpr;
        }

        const x = i * (barWidth + 3 * dpr);
        const y = (height - barHeight) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (isActive) {
          grad.addColorStop(0, "#00e5ff");
          grad.addColorStop(0.5, "#f59e0b");
          grad.addColorStop(1, "#ff2a54");
        } else {
          grad.addColorStop(0, "rgba(56, 189, 248, 0.35)");
          grad.addColorStop(1, "rgba(30, 41, 59, 0.65)");
        }

        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barWidth, barHeight);

        // 柱顶浮动峰值指示灯
        if (isActive && barHeight > 10 * dpr) {
          ctx.fillStyle = "#00e5ff";
          ctx.fillRect(x, y - 2 * dpr, barWidth, 1.5 * dpr);
        }
      }

      // 3. 连续平滑发光音频波形曲线 (Harmonic Sine Wave)
      ctx.save();
      ctx.beginPath();
      const waveAmplitude = isActive ? (height * 0.38 * (0.4 + e * 0.6)) : (height * 0.12);
      const waveFreq = isActive ? 0.024 : 0.016;

      for (let x = 0; x < width; x += 4 * dpr) {
        const offset = Math.sin(x * waveFreq + now * 2.2) * Math.cos(x * 0.012 - now * 1.5) * waveAmplitude;
        const y = midY + offset;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.strokeStyle = isActive ? "#00e5ff" : "rgba(245, 158, 11, 0.4)";
      ctx.lineWidth = 2 * dpr;
      ctx.shadowColor = isActive ? "rgba(0, 229, 255, 0.85)" : "transparent";
      ctx.shadowBlur = isActive ? 10 * dpr : 0;
      ctx.stroke();
      ctx.restore();

      // 4. 右上角 HUD 战术读数
      ctx.font = `${Math.floor(9 * dpr)}px var(--font-mono, monospace)`;
      ctx.fillStyle = isActive ? "#00e5ff" : "rgba(255, 255, 255, 0.35)";
      ctx.textAlign = "right";
      const db = isActive ? `-${(18.2 - e * 11.4).toFixed(1)}dB` : "-inf dB";
      ctx.fillText(`${label} // ${db}`, width - 8 * dpr, 12 * dpr);
    },
  };

  /* -------------------------------------------------------------
     共享导航栏与 UI 渲染 (Shared Navigation & UI)
  ------------------------------------------------------------- */
  function renderSharedHeader(activePage = "studio") {
    const topbar = document.querySelector(".topbar");
    if (!topbar) return;

    const currentNovel = StorageManager.getCurrentNovel();
    const novelTitle = currentNovel ? currentNovel.title : "未命名小说";
    const charCount = currentNovel && currentNovel.characterTree ? Object.keys(currentNovel.characterTree).length : 0;

    topbar.innerHTML = `
      <div class="brand">
        <a href="index.html" class="brand-link" title="返回小说制作工坊">
          <div class="brand-mark" aria-hidden="true">声</div>
          <div class="brand-title-wrap">
            <h1>声影小说工坊</h1>
            <p>AI 小说多角色有声书演播制作与素材系统</p>
          </div>
        </a>
      </div>

      <!-- 核心多页面导航栏 -->
      <nav class="nav-tabs" aria-label="页面切换导航">
        <a href="index.html" class="nav-tab-item ${activePage === "studio" ? "is-active" : ""}">
          <span class="nav-tab-icon">🎧</span>
          <span class="nav-tab-label">小说制作工坊</span>
        </a>
        <a href="character-tree.html" class="nav-tab-item ${activePage === "characterTree" ? "is-active" : ""}">
          <span class="nav-tab-icon">🌲</span>
          <span class="nav-tab-label">当前角色音频树</span>
          <span class="nav-badge">${charCount}</span>
        </a>
        <a href="voice-library.html" class="nav-tab-item ${activePage === "voiceLibrary" ? "is-active" : ""}">
          <span class="nav-tab-icon">🗂️</span>
          <span class="nav-tab-label">全局语音素材库</span>
          <span class="nav-badge-hot">混搭</span>
        </a>
      </nav>

      <div class="topbar-actions">
        <div class="topbar-telemetry" title="DSP 动力学声频引擎与小说演播总线">
          <span class="telemetry-led"></span>
          <span class="telemetry-label">DSP KINETIC // 48kHz</span>
        </div>
        <div class="current-novel-pill" title="当前加载小说">
          <span class="dot-online"></span>
          <span class="novel-name-truncate">${escapeHtml(novelTitle)}</span>
        </div>
        <button id="themeToggle" class="icon-button" type="button" title="切换深浅主题" aria-label="切换深浅主题">◐</button>
      </div>
    `;

    bindThemeToggle();
  }

  function bindThemeToggle() {
    const btn = document.getElementById("themeToggle");
    if (!btn) return;
    const current = localStorage.getItem(STORAGE_KEYS.THEME) || "dark";
    applyTheme(current);

    btn.addEventListener("click", () => {
      const active = document.body.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(active);
    });
  }

  function applyTheme(theme) {
    document.body.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    const btn = document.getElementById("themeToggle");
    if (btn) btn.title = theme === "dark" ? "切换浅色主题" : "切换深色主题";
  }

  let toastTimer = null;
  function showToast(message) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove("is-visible");
    }, 3200);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  /* -------------------------------------------------------------
     统一模态弹窗管理器 (Unified Modal Manager)
  ------------------------------------------------------------- */
  const ModalManager = {
    _initialized: false,

    open(modalOrId) {
      const modal = typeof modalOrId === "string" ? document.getElementById(modalOrId) : modalOrId;
      if (!modal) return;
      modal.removeAttribute("hidden");
      modal.hidden = false;
      modal.style.display = "flex";
      modal.classList.add("is-open");
      document.body.classList.add("modal-open");
      const dialog = modal.querySelector(".modal-dialog");
      if (dialog) {
        dialog.setAttribute("tabindex", "-1");
        dialog.focus();
      }
    },

    close(modalOrId) {
      const modal = typeof modalOrId === "string" ? document.getElementById(modalOrId) : modalOrId;
      if (!modal) return;
      modal.setAttribute("hidden", "");
      modal.hidden = true;
      modal.style.display = "none";
      modal.classList.remove("is-open");
      if (!document.querySelector(".modal-backdrop.is-open, .modal-backdrop:not([hidden]):not([style*='display: none'])")) {
        document.body.classList.remove("modal-open");
      }
    },

    closeAll() {
      document.querySelectorAll(".modal-backdrop").forEach((m) => {
        m.setAttribute("hidden", "");
        m.hidden = true;
        m.style.display = "none";
        m.classList.remove("is-open");
      });
      document.body.classList.remove("modal-open");
    },

    init() {
      if (this._initialized) return;
      this._initialized = true;

      // 1. 关闭按钮捕获阶段事件委托（支持 data-modal-close 与 .modal-close）
      document.addEventListener("click", (e) => {
        const closeBtn = e.target.closest && e.target.closest("[data-modal-close], .modal-close");
        if (closeBtn) {
          e.preventDefault();
          e.stopPropagation();
          const targetModalId = closeBtn.getAttribute("data-modal-close");
          if (targetModalId) {
            ModalManager.close(targetModalId);
          } else {
            const parentModal = closeBtn.closest(".modal-backdrop");
            if (parentModal) ModalManager.close(parentModal);
          }
          return;
        }

        // 2. 点击 Backdrop 空白背景遮罩区直接关闭弹窗
        if (e.target.classList && e.target.classList.contains("modal-backdrop")) {
          e.preventDefault();
          e.stopPropagation();
          ModalManager.close(e.target);
        }
      }, true);

      // 3. 全局键盘 Escape 键一键退出关闭所有弹窗
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" || e.keyCode === 27) {
          ModalManager.closeAll();
        }
      }, true);
    },
  };

  /* -------------------------------------------------------------
     Arknights PRTS-style Tab Routing & Scramble Text Engine
  ------------------------------------------------------------- */
  function scrambleElement(el, finalText, duration = 360) {
    if (!el || !finalText) return;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_//-";
    const startTime = performance.now();
    const origText = finalText;

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const revealedLength = Math.floor(progress * origText.length);

      let result = origText.slice(0, revealedLength);
      for (let i = revealedLength; i < origText.length; i++) {
        if (origText[i] === " " || origText[i] === "/") {
          result += origText[i];
        } else {
          result += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      el.textContent = result;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = origText;
      }
    }
    requestAnimationFrame(step);
  }

  function initTabRouter() {
    const navButtons = document.querySelectorAll(".nav-btn[data-target]");
    const sections = document.querySelectorAll(".mv-section");
    if (!navButtons.length || !sections.length) return;

    function switchSection(targetId, updateHash = true) {
      if (!targetId) return;
      const cleanId = targetId.replace(/^#/, "");
      let found = false;

      sections.forEach((sec) => {
        const isMatch = (sec.id === cleanId || sec.id === `sec-${cleanId}` || `sec-${sec.id}` === cleanId);
        sec.classList.toggle("active", isMatch);
        if (isMatch) found = true;
      });

      if (!found) return;

      navButtons.forEach((btn) => {
        const btnTarget = (btn.getAttribute("data-target") || "").replace(/^#/, "");
        const isMatch = (btnTarget === cleanId || btnTarget === `sec-${cleanId}` || `sec-${btnTarget}` === cleanId);
        btn.classList.toggle("active", isMatch);
        if (isMatch) {
          const scrambleSpan = btn.querySelector("[data-scramble]");
          if (scrambleSpan) {
            scrambleElement(scrambleSpan, scrambleSpan.getAttribute("data-scramble"), 300);
          }
        }
      });

      if (updateHash && window.location.hash !== `#${cleanId}`) {
        history.replaceState(null, "", `#${cleanId}`);
      }

      window.scrollTo({ top: 0, behavior: "smooth" });

      // 触发跨模块响应式联动事件
      window.dispatchEvent(new CustomEvent("novelapp:tabchange", { detail: { targetId: cleanId } }));
    }

    // 暴露全局快速切换函数
    window.switchSection = switchSection;
    if (window.NovelApp) window.NovelApp.switchSection = switchSection;

    navButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const target = btn.getAttribute("data-target");
        switchSection(target);
      });
    });

    // 监听 URL hash 变化
    function handleHashChange() {
      const hash = window.location.hash.slice(1);
      if (hash) {
        if (hash === "character-tree" || hash === "tree") switchSection("sec-tree", false);
        else if (hash === "voice-library" || hash === "library") switchSection("sec-library", false);
        else if (hash === "studio") switchSection("sec-studio", false);
        else switchSection(hash, false);
      }
    }
    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
  }

  function initThemeSwitcher() {
    const dots = document.querySelectorAll(".theme-dot[data-theme-choice]");
    const savedTheme = localStorage.getItem("novel_tts_theme") || "cyan";
    document.body.setAttribute("data-theme", savedTheme);

    dots.forEach((dot) => {
      const choice = dot.getAttribute("data-theme-choice");
      dot.classList.toggle("active", choice === savedTheme);

      dot.addEventListener("click", () => {
        dots.forEach((d) => d.classList.remove("active"));
        dot.classList.add("active");
        document.body.setAttribute("data-theme", choice);
        localStorage.setItem("novel_tts_theme", choice);
        showToast(`已切换至【${choice.toUpperCase()}】战术主题界面`);
      });
    });
  }

  // 挂载至全局与命名空间
  window.AudioEngine = AudioEngine;
  window.TTSAudioService = AudioEngine;
  window.StorageManager = StorageManager;
  window.ModalManager = ModalManager;
  window.KineticVFX = KineticVFX;
  window.NovelApp = {
    MS_VOICE_CATALOG,
    MS_VOICE_MAP,
    MS_VOICE_TREE,
    GITHUB_AI_VOICE_CATALOG,
    GITHUB_AI_VOICE_MAP,
    AI_MANGA_VOICE_CATALOG,
    AI_MANGA_VOICE_MAP,
    ROLE_LABELS,
    ROLE_DEFAULTS,
    STYLE_LABELS,
    BUILTIN_SCHEMES,
    NARRATOR_PRESETS,
    NOVEL_SAMPLES,
    StorageManager,
    AudioEngine,
    ModalManager,
    KineticVFX,
    applySchemeToNovel,
    setNarratorVoice,
    getAvailableSchemes,
    cloneAzureFullTreeToCustom,
    cloneGitHubAiTreesToCustom,
    cloneAiMangaFullTreeToCustom,
    exportAiMangaTreeJson,
    exportAiMangaTreeMarkdown,
    analyzeNovelGenre,
    autoCastNovelCharacterTree,
    isValidCharacterName,
    inferCharacterAttributes,
    assignRefinedVoice,
    ARCHETYPE_VOICE_MATRIX,
    renderSharedHeader,
    scrambleElement,
    initTabRouter,
    initThemeSwitcher,
    showToast,
    escapeHtml,
    escapeAttr,
  };

  // 自动初始化音频引擎、弹窗管理器与动力学生成引擎
  AudioEngine.init();
  ModalManager.init();
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        ModalManager.init();
        KineticVFX.init();
        initTabRouter();
        initThemeSwitcher();
      });
    } else {
      KineticVFX.init();
      initTabRouter();
      initThemeSwitcher();
    }
  }
})();

