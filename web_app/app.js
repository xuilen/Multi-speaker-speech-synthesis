(() => {
  "use strict";

  const SAMPLE_TEXT = `第一回 宴桃园豪杰三结义

话说天下大势，分久必合，合久必分。周末七国分争，并入于秦。及秦灭之后，楚、汉分争，又并入于汉。

“天下将乱，英雄当起。”刘备望着市井烟尘，低声说道。

张飞大笑道：“大丈夫不与国家出力，何故长叹？”

关羽抚须道：“若二位有心扶危济困，某愿同往。”

第二回 张翼德怒鞭督邮

玄德领军回县，百姓夹道相迎。督邮到县，傲慢无礼，众人皆有怒色。

“此人欺我兄长太甚！”张飞怒喝道，“今日若不教训他，怎显英雄本色？”

刘备叹道：“三弟不可鲁莽，且看事势如何。”`;

  const STATUS_LABELS = {
    idle: "待生成",
    previewing: "试听中",
    generating: "生成中",
    paused: "已暂停",
    completed: "已完成",
    failed: "失败",
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
      archetype: "激情解说 · 评书演播",
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
  ];

  const MS_VOICE_MAP = {};
  MS_VOICE_CATALOG.forEach((v) => {
    MS_VOICE_MAP[v.id] = v;
  });

  const MS_VOICE_TREE = {
    all: { key: "all", label: "🌟 全部音色", description: "微软全部 24+ 款小说精选音色" },
    narrator: { key: "narrator", label: "🎙️ 旁白演播", description: "沉稳磁性、温暖知性、激情评书解说" },
    youngMale: { key: "youngMale", label: "⚔️ 青年男主", description: "热血少侠、温润书生、阳光青年主角" },
    youngFemale: { key: "youngFemale", label: "🌸 青年女主", description: "清纯柔美、出尘仙子、灵动傲娇少女" },
    mature: { key: "mature", label: "🛡️ 成熟中生", description: "豪迈宗师、冷静御姐、威严将领、慈祥长辈" },
    elderVillain: { key: "elderVillain", label: "👹 长者反派", description: "沧桑老仙、阴冷魔皇、诡谲绝世宿敌" },
    child: { key: "child", label: "🎈 少儿童声", description: "机敏道童、软萌萝莉、可爱灵兽童音" },
    dialect: { key: "dialect", label: "🗺️ 方言特色", description: "陕西、东北、四川、山东、粤语、台湾风情" },
  };

  // 内置经典小说配音树方案
  const BUILTIN_SCHEMES = {
    "xianxia": {
      id: "xianxia",
      name: "🔮 玄幻修仙配音树",
      description: "适合修仙、玄幻、洪荒小说，仙侠意境浓郁，神魔宗师分明",
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
      description: "适合历史、三国、战国、楚汉等波澜壮阔的史诗小说",
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
      description: "适合都市甜宠、职场成长、现代情感轻喜剧",
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
      description: "适合悬疑探案、密室解谜、惊悚民俗小说",
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

  const els = {};
  const state = {
    chapters: [],
    voices: [],
    speakerSettings: new Map(),
    theme: localStorage.getItem("novelTtsTheme") || "dark",
    busy: false,
    paused: false,
    stopRequested: false,
    activeSpeech: null,
    onlineAbort: null,
    refreshTimer: null,
    toastTimer: null,
    // 角色配音树与方案扩展状态
    catalogFilter: { category: "all", gender: "all", query: "" },
    catalogTargetSpeaker: null,
    userSchemes: loadUserSchemes(),
    pendingImportScheme: null,
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    applyTheme(state.theme);
    bindEvents();
    refreshVoices();
    updateSupportStatus();
    updateModeNotice();
    renderSchemeOptions();
    renderAll();

    if ("speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", () => {
        refreshVoices();
        renderVoiceTree();
      });
    }
  }

  function cacheElements() {
    [
      "themeToggle",
      "importStatus",
      "bookTitle",
      "fileInput",
      "rawText",
      "parseButton",
      "sampleButton",
      "clearButton",
      "chapterSummary",
      "chapterList",
      "selectAllButton",
      "invertSelectionButton",
      "previewFirstButton",
      "ttsMode",
      "modeNotice",
      "onlinePanel",
      "endpointUrl",
      "endpointToken",
      "onlineFormat",
      "maxBatchChars",
      "rateSlider",
      "rateValue",
      "speakerModeToggle",
      "openVoiceCatalogButton",
      "openSwapModalButton",
      "voiceSchemeSelect",
      "userSchemesOptgroup",
      "applySchemeButton",
      "saveSchemeButton",
      "exportSchemeButton",
      "importSchemeButton",
      "schemeFileInput",
      "refreshVoicesButton",
      "characterVoiceTree",
      "progressText",
      "activeStatus",
      "overallProgress",
      "generateSelectedButton",
      "pauseButton",
      "resumeButton",
      "stopButton",
      "zipButton",
      "supportStatus",
      "toast",
      // 模态弹窗
      "msVoiceModal",
      "catalogCategoryList",
      "catalogSearchInput",
      "catalogGenderFilter",
      "catalogTargetNotice",
      "catalogTargetCharName",
      "catalogVoiceGrid",
      "swapTransferModal",
      "tabSwapBtn",
      "tabTransferBtn",
      "tabSwapContent",
      "tabTransferContent",
      "swapSelectA",
      "swapSelectB",
      "swapPreviewArea",
      "confirmSwapBtn",
      "transferSourceSelect",
      "transferTargetSelect",
      "confirmTransferBtn",
      "schemeImportModal",
      "importSchemeMeta",
      "schemeMappingBody",
      "confirmImportSchemeBtn",
      "saveSchemeModal",
      "saveSchemeNameInput",
      "saveSchemeDescInput",
      "confirmSaveSchemeBtn",
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    els.themeToggle.addEventListener("click", () => {
      applyTheme(state.theme === "dark" ? "light" : "dark");
    });

    els.fileInput.addEventListener("change", handleFileImport);
    els.parseButton.addEventListener("click", handleParse);
    els.sampleButton.addEventListener("click", loadSampleText);
    els.clearButton.addEventListener("click", clearInput);
    els.selectAllButton.addEventListener("click", () => selectChapters(true));
    els.invertSelectionButton.addEventListener("click", invertSelection);
    els.previewFirstButton.addEventListener("click", previewFirstChapter);
    els.ttsMode.addEventListener("change", updateModeNotice);
    els.rateSlider.addEventListener("input", () => {
      els.rateValue.textContent = `${Number(els.rateSlider.value).toFixed(1)}x`;
    });
    els.speakerModeToggle.addEventListener("change", () => {
      rebuildSpeakerSettings();
      renderVoiceTree();
    });

    // 配音方案工具栏
    els.applySchemeButton.addEventListener("click", handleApplySchemeFromSelect);
    els.saveSchemeButton.addEventListener("click", openSaveSchemeModal);
    els.exportSchemeButton.addEventListener("click", exportCurrentScheme);
    els.importSchemeButton.addEventListener("click", () => els.schemeFileInput.click());
    els.schemeFileInput.addEventListener("change", handleSchemeFileChange);
    els.refreshVoicesButton.addEventListener("click", () => {
      refreshVoices();
      toast("已刷新浏览器语音引擎列表。");
      renderVoiceTree();
    });

    // 微软音色树库与互换弹窗入口
    els.openVoiceCatalogButton.addEventListener("click", () => openVoiceCatalog(null));
    els.openSwapModalButton.addEventListener("click", () => openSwapTransferModal("swap"));

    // 章节生成与导出
    els.generateSelectedButton.addEventListener("click", generateSelectedChapters);
    els.pauseButton.addEventListener("click", pauseWork);
    els.resumeButton.addEventListener("click", resumeWork);
    els.stopButton.addEventListener("click", stopWork);
    els.zipButton.addEventListener("click", downloadGeneratedZip);

    // 列表事件代理
    els.chapterList.addEventListener("click", handleChapterClick);
    els.chapterList.addEventListener("change", handleChapterChange);
    els.chapterList.addEventListener("input", handleChapterInput);

    // 角色搭配树卡片事件代理
    els.characterVoiceTree.addEventListener("click", handleVoiceTreeClick);
    els.characterVoiceTree.addEventListener("change", handleVoiceTreeChange);
    els.characterVoiceTree.addEventListener("input", handleVoiceTreeInput);

    // 模态弹窗全局关闭按钮
    document.querySelectorAll("[data-modal-close]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const modalId = btn.dataset.modalClose;
        closeModal(modalId);
      });
    });

    // 微软音色库弹窗内部事件
    els.catalogSearchInput.addEventListener("input", () => {
      state.catalogFilter.query = els.catalogSearchInput.value.trim().toLowerCase();
      renderCatalogVoices();
    });
    els.catalogGenderFilter.addEventListener("change", () => {
      state.catalogFilter.gender = els.catalogGenderFilter.value;
      renderCatalogVoices();
    });
    els.catalogVoiceGrid.addEventListener("click", handleCatalogVoiceClick);

    // 互换/移植弹窗选项卡与操作
    els.tabSwapBtn.addEventListener("click", () => switchSwapTab("swap"));
    els.tabTransferBtn.addEventListener("click", () => switchSwapTab("transfer"));
    els.swapSelectA.addEventListener("change", updateSwapPreview);
    els.swapSelectB.addEventListener("change", updateSwapPreview);
    els.confirmSwapBtn.addEventListener("click", handleConfirmSwap);
    els.confirmTransferBtn.addEventListener("click", handleConfirmTransfer);

    // 方案保存与导入弹窗
    els.confirmSaveSchemeBtn.addEventListener("click", handleConfirmSaveScheme);
    els.confirmImportSchemeBtn.addEventListener("click", handleConfirmImportScheme);
  }

  function applyTheme(theme) {
    state.theme = theme;
    document.body.dataset.theme = theme;
    localStorage.setItem("novelTtsTheme", theme);
    els.themeToggle.title = theme === "dark" ? "切换浅色" : "切换深色";
  }

  /* -------------------------------------------------------------
     方案与持久化数据管理 (User Schemes & Storage)
  ------------------------------------------------------------- */
  function loadUserSchemes() {
    try {
      const raw = localStorage.getItem("novelTtsUserSchemes");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveUserSchemes(schemes) {
    state.userSchemes = schemes;
    try {
      localStorage.setItem("novelTtsUserSchemes", JSON.stringify(schemes));
    } catch {
      // ignore
    }
    renderSchemeOptions();
  }

  function renderSchemeOptions() {
    if (!els.userSchemesOptgroup) return;
    const keys = Object.keys(state.userSchemes);
    if (!keys.length) {
      els.userSchemesOptgroup.innerHTML = '<option disabled>暂无自定义方案</option>';
      return;
    }
    els.userSchemesOptgroup.innerHTML = keys
      .map((k) => `<option value="user:${escapeAttr(k)}">📁 ${escapeHtml(state.userSchemes[k].name || k)}</option>`)
      .join("");
  }

  function handleApplySchemeFromSelect() {
    const val = els.voiceSchemeSelect.value;
    if (!val) return;
    if (val.startsWith("builtin:")) {
      const key = val.replace("builtin:", "");
      applyBuiltinScheme(key);
    } else if (val.startsWith("user:")) {
      const key = val.replace("user:", "");
      applyUserScheme(key);
    }
  }

  function applyBuiltinScheme(key) {
    const preset = BUILTIN_SCHEMES[key];
    if (!preset) return;
    const speakers = currentSpeakers();
    speakers.forEach((speaker) => {
      const setting = state.speakerSettings.get(speaker);
      if (!setting) return;
      const archetype = preset.archetypes[setting.role] || preset.archetypes.youngMale;
      if (archetype) {
        setting.voiceName = archetype.voiceName;
        setting.pitch = archetype.pitch;
        setting.rateOffset = archetype.rateOffset;
        setting.baseStyle = archetype.baseStyle;
      }
    });
    renderVoiceTree();
    toast(`已应用内置【${preset.name}】配音树方案！`);
  }

  function applyUserScheme(key) {
    const scheme = state.userSchemes[key];
    if (!scheme) return;
    applySchemePayload(scheme);
    toast(`已应用自定义方案【${scheme.name}】！`);
  }

  function applySchemePayload(scheme, mapping = null) {
    const charsDict = scheme.characters || {};
    const map = mapping || {};
    const currentList = currentSpeakers();

    currentList.forEach((speaker) => {
      // Find matching entry from scheme (either by mapping or exact name match)
      let matchedData = null;
      for (const [schemeChar, val] of Object.entries(charsDict)) {
        if (map[schemeChar] === speaker || schemeChar === speaker) {
          matchedData = val;
          break;
        }
      }

      if (matchedData) {
        const setting = state.speakerSettings.get(speaker);
        if (setting) {
          if (matchedData.voice_name || matchedData.voiceName) {
            setting.voiceName = matchedData.voice_name || matchedData.voiceName;
          }
          if (matchedData.base_style || matchedData.baseStyle) {
            setting.baseStyle = matchedData.base_style || matchedData.baseStyle;
          }
          if (typeof matchedData.pitch === "number") setting.pitch = matchedData.pitch;
          if (typeof matchedData.rateOffset === "number") setting.rateOffset = matchedData.rateOffset;
          if (matchedData.role) setting.role = matchedData.role;
        }
      }
    });

    renderVoiceTree();
  }

  function openSaveSchemeModal() {
    const book = bookTitle();
    els.saveSchemeNameInput.value = `${book} 配音树方案`;
    els.saveSchemeDescInput.value = `由小说《${book}》当前角色配音搭配导出生成`;
    openModal("saveSchemeModal");
  }

  function handleConfirmSaveScheme() {
    const name = els.saveSchemeNameInput.value.trim();
    if (!name) {
      toast("请输入方案名称。");
      return;
    }
    const desc = els.saveSchemeDescInput.value.trim();
    const characters = {};
    state.speakerSettings.forEach((setting, speaker) => {
      characters[speaker] = {
        character_name: speaker,
        voice_name: setting.voiceName,
        role: setting.role,
        gender: inferGender(speaker),
        base_style: setting.baseStyle,
        pitch: setting.pitch,
        rate_offset: `${setting.rateOffset >= 0 ? "+" : ""}${Math.round(setting.rateOffset * 100)}%`,
        rateOffset: setting.rateOffset,
      };
    });

    const id = `scheme_${Date.now()}`;
    state.userSchemes[id] = {
      id,
      name,
      description: desc,
      characters,
      savedAt: new Date().toISOString(),
    };
    saveUserSchemes(state.userSchemes);
    closeModal("saveSchemeModal");
    toast(`方案【${name}】已保存到本地方案库！`);
  }

  function exportCurrentScheme() {
    const characters = {};
    state.speakerSettings.forEach((setting, speaker) => {
      const msVoice = MS_VOICE_MAP[setting.voiceName];
      characters[speaker] = {
        character_name: speaker,
        voice_name: setting.voiceName,
        voice_display: msVoice?.name || setting.voiceName,
        role: setting.role,
        gender: inferGender(speaker),
        base_style: setting.baseStyle,
        pitch: setting.pitch,
        rateOffset: setting.rateOffset,
        rate_offset: `${setting.rateOffset >= 0 ? "+" : ""}${Math.round(setting.rateOffset * 100)}%`,
      };
    });

    const payload = {
      version: 2,
      scheme_name: `${bookTitle()} 角色配音树`,
      book_title: bookTitle(),
      exported_at: new Date().toISOString(),
      character_count: Object.keys(characters).length,
      characters,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    downloadBlob(blob, `${sanitizeFileName(bookTitle())}_角色配音树.json`);
    toast("已成功导出当前小说的角色配音树 JSON 文件！可直接移植到其他小说。");
  }

  async function handleSchemeFileChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      event.target.value = "";
      state.pendingImportScheme = data;
      openSchemeImportModal(data);
    } catch (err) {
      toast(`导入失败：无法解析 JSON 文件 (${friendlyError(err)})`);
    }
  }

  function openSchemeImportModal(scheme) {
    const chars = scheme.characters || {};
    const count = Object.keys(chars).length;
    els.importSchemeMeta.innerHTML = `
      <strong>方案名称：</strong>${escapeHtml(scheme.scheme_name || "未命名方案")} &nbsp;·&nbsp; 
      <strong>角色数量：</strong>${count} 个 &nbsp;·&nbsp;
      <strong>说明：</strong>${escapeHtml(scheme.description || "外来小说配音树文件")}
    `;

    const currentSpeakersList = currentSpeakers();
    const rows = [];

    for (const [schemeChar, charData] of Object.entries(chars)) {
      const voiceId = charData.voice_name || charData.voiceName || "";
      const msVoice = MS_VOICE_MAP[voiceId];
      const voiceLabel = msVoice ? `${msVoice.name} (${voiceId})` : voiceId;
      const role = charData.role || inferRole(schemeChar);
      const roleLabel = ROLE_LABELS[role] || role;

      // Smart auto-matching candidate: exact name or role match
      let bestMatch = "";
      if (currentSpeakersList.includes(schemeChar)) {
        bestMatch = schemeChar;
      } else {
        const candidate = currentSpeakersList.find((s) => inferRole(s) === role);
        if (candidate) bestMatch = candidate;
      }

      rows.push(`
        <tr data-scheme-char="${escapeAttr(schemeChar)}">
          <td>
            <strong>${escapeHtml(schemeChar)}</strong>
            <div style="font-size:11px;color:var(--muted);">${escapeHtml(voiceLabel)}</div>
          </td>
          <td>
            <span class="char-badge char-badge-role">${escapeHtml(roleLabel)}</span>
          </td>
          <td>
            <select class="text-input text-input-sm scheme-target-select">
              <option value="">-- 不导入此角色 --</option>
              ${currentSpeakersList
                .map(
                  (cur) =>
                    `<option value="${escapeAttr(cur)}" ${cur === bestMatch ? "selected" : ""}>👉 映射为当前小说：${escapeHtml(cur)}</option>`,
                )
                .join("")}
            </select>
          </td>
        </tr>
      `);
    }

    els.schemeMappingBody.innerHTML = rows.join("");
    openModal("schemeImportModal");
  }

  function handleConfirmImportScheme() {
    if (!state.pendingImportScheme) return;
    const mapping = {};
    const rows = els.schemeMappingBody.querySelectorAll("tr[data-scheme-char]");
    rows.forEach((row) => {
      const schemeChar = row.dataset.schemeChar;
      const select = row.querySelector(".scheme-target-select");
      if (select && select.value) {
        mapping[schemeChar] = select.value;
      }
    });

    applySchemePayload(state.pendingImportScheme, mapping);
    closeModal("schemeImportModal");
    toast(`已成功将配音树导入并应用到当前小说中！`);
  }

  /* -------------------------------------------------------------
     微软语音分类角色树库 (Microsoft Voice Tree Catalog)
  ------------------------------------------------------------- */
  function openVoiceCatalog(targetSpeaker = null) {
    state.catalogTargetSpeaker = targetSpeaker;
    if (targetSpeaker) {
      els.catalogTargetNotice.hidden = false;
      els.catalogTargetCharName.textContent = targetSpeaker;
    } else {
      els.catalogTargetNotice.hidden = true;
    }

    renderCatalogCategories();
    renderCatalogVoices();
    openModal("msVoiceModal");
  }

  function renderCatalogCategories() {
    const current = state.catalogFilter.category;
    els.catalogCategoryList.innerHTML = Object.entries(MS_VOICE_TREE)
      .map(([key, item]) => {
        const count = key === "all" ? MS_VOICE_CATALOG.length : MS_VOICE_CATALOG.filter((v) => v.category === key).length;
        const activeClass = current === key ? "is-active" : "";
        return `
          <li class="catalog-category-item ${activeClass}" data-category="${escapeAttr(key)}">
            <span>${escapeHtml(item.label)}</span>
            <span class="cat-count">(${count})</span>
          </li>
        `;
      })
      .join("");

    els.catalogCategoryList.querySelectorAll(".catalog-category-item").forEach((item) => {
      item.addEventListener("click", () => {
        state.catalogFilter.category = item.dataset.category;
        renderCatalogCategories();
        renderCatalogVoices();
      });
    });
  }

  function renderCatalogVoices() {
    const { category, gender, query } = state.catalogFilter;
    let list = MS_VOICE_CATALOG;

    if (category && category !== "all") {
      list = list.filter((v) => v.category === category);
    }
    if (gender && gender !== "all") {
      list = list.filter((v) => v.gender === gender);
    }
    if (query) {
      list = list.filter((v) => {
        const full = `${v.name} ${v.fullName} ${v.archetype} ${v.tags.join(" ")} ${v.categoryLabel}`.toLowerCase();
        return full.includes(query);
      });
    }

    if (!list.length) {
      els.catalogVoiceGrid.innerHTML = '<div class="empty-state">未找到匹配的微软音色。</div>';
      return;
    }

    const currentSetting = state.catalogTargetSpeaker ? state.speakerSettings.get(state.catalogTargetSpeaker) : null;
    const currentVoiceId = currentSetting?.voiceName || "";

    els.catalogVoiceGrid.innerHTML = list
      .map((voice) => {
        const isCurrent = voice.id === currentVoiceId;
        const genderClass = voice.gender === "male" ? "char-badge-gender-male" : "char-badge-gender-female";
        const genderIcon = voice.gender === "male" ? "♂ 男" : "♀ 女";

        return `
          <div class="voice-card ${isCurrent ? "is-current" : ""}" data-voice-id="${escapeAttr(voice.id)}">
            <div class="voice-card-head">
              <div class="voice-card-name-group">
                <span class="voice-card-name">${escapeHtml(voice.name)}</span>
                <span class="char-badge ${genderClass}">${genderIcon}</span>
                <span class="char-badge char-badge-role">${escapeHtml(voice.categoryLabel)}</span>
              </div>
            </div>
            <div class="voice-card-archetype">${escapeHtml(voice.archetype)}</div>
            <div class="voice-card-sample">“${escapeHtml(voice.sampleText)}”</div>
            <div class="voice-card-styles">
              ${voice.styles.slice(0, 4).map((s) => `<span class="voice-style-pill">${escapeHtml(STYLE_LABELS[s] || s)}</span>`).join("")}
              ${voice.styles.length > 4 ? `<span class="voice-style-pill">+${voice.styles.length - 4}种情感</span>` : ""}
            </div>
            <div class="voice-card-footer">
              <button class="secondary-button btn-sm" type="button" data-action="audition-catalog" data-voice-id="${escapeAttr(voice.id)}">🔊 试听</button>
              <button class="primary-button btn-sm" type="button" data-action="select-catalog" data-voice-id="${escapeAttr(voice.id)}">
                ${state.catalogTargetSpeaker ? `应用给【${state.catalogTargetSpeaker}】` : "选择此音色"}
              </button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function handleCatalogVoiceClick(event) {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const voiceId = btn.dataset.voiceId;
    const voice = MS_VOICE_MAP[voiceId];
    if (!voice) return;

    if (action === "audition-catalog") {
      auditionVoiceDirect(voice, voice.sampleText);
    } else if (action === "select-catalog") {
      if (state.catalogTargetSpeaker) {
        applyVoiceToCharacter(state.catalogTargetSpeaker, voice);
        closeModal("msVoiceModal");
        toast(`已将【${state.catalogTargetSpeaker}】的音色设置为【${voice.name} (${voice.id})】！`);
      } else {
        // No specific target, apply to narrator by default or prompt
        applyVoiceToCharacter("旁白", voice);
        closeModal("msVoiceModal");
        toast(`已将旁白音色设置为【${voice.name} (${voice.id})】！`);
      }
    }
  }

  function applyVoiceToCharacter(speaker, voice) {
    let setting = state.speakerSettings.get(speaker);
    if (!setting) {
      setting = {
        speaker,
        role: inferRole(speaker),
        voiceName: voice.id,
        pitch: voice.defaultPitch || 1.0,
        rateOffset: voice.defaultRate || 0.0,
        baseStyle: voice.styles[0] || "chat",
      };
      state.speakerSettings.set(speaker, setting);
    } else {
      setting.voiceName = voice.id;
      if (voice.defaultPitch) setting.pitch = voice.defaultPitch;
      if (typeof voice.defaultRate === "number") setting.rateOffset = voice.defaultRate;
      if (voice.styles && !voice.styles.includes(setting.baseStyle)) {
        setting.baseStyle = voice.styles[0] || "chat";
      }
    }
    renderVoiceTree();
  }

  /* -------------------------------------------------------------
     角色音色对调互换与快速移植 (Swap & Transfer Dialog)
  ------------------------------------------------------------- */
  function openSwapTransferModal(tab = "swap", preselectChar = null) {
    const speakers = currentSpeakers();
    if (speakers.length < 2 && tab === "swap") {
      toast("当前小说识别到的角色少于 2 个，暂无法进行角色互换。");
      return;
    }

    // Populate swap selects
    const aOptions = speakers.map((s) => `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`).join("");
    els.swapSelectA.innerHTML = aOptions;
    els.swapSelectB.innerHTML = aOptions;

    if (preselectChar && speakers.includes(preselectChar)) {
      els.swapSelectA.value = preselectChar;
      const other = speakers.find((s) => s !== preselectChar) || speakers[0];
      els.swapSelectB.value = other;
    } else {
      els.swapSelectA.value = speakers[0];
      els.swapSelectB.value = speakers[1] || speakers[0];
    }

    // Populate transfer selects
    els.transferSourceSelect.innerHTML = aOptions;
    els.transferTargetSelect.innerHTML = aOptions;
    if (preselectChar && speakers.includes(preselectChar)) {
      els.transferSourceSelect.value = preselectChar;
      const other = speakers.find((s) => s !== preselectChar) || speakers[0];
      els.transferTargetSelect.value = other;
    } else {
      els.transferSourceSelect.value = speakers[0];
      els.transferTargetSelect.value = speakers[1] || speakers[0];
    }

    switchSwapTab(tab);
    updateSwapPreview();
    openModal("swapTransferModal");
  }

  function switchSwapTab(tab) {
    if (tab === "swap") {
      els.tabSwapBtn.classList.add("is-active");
      els.tabTransferBtn.classList.remove("is-active");
      els.tabSwapContent.hidden = false;
      els.tabTransferContent.hidden = true;
    } else {
      els.tabSwapBtn.classList.remove("is-active");
      els.tabTransferBtn.classList.add("is-active");
      els.tabSwapContent.hidden = true;
      els.tabTransferContent.hidden = false;
    }
  }

  function updateSwapPreview() {
    const charA = els.swapSelectA.value;
    const charB = els.swapSelectB.value;
    if (charA === charB) {
      els.swapPreviewArea.innerHTML = `<span style="color:var(--red);">⚠️ 请选择两个不同的角色进行音色对调。</span>`;
      els.confirmSwapBtn.disabled = true;
      return;
    }
    els.confirmSwapBtn.disabled = false;
    const setA = state.speakerSettings.get(charA);
    const setB = state.speakerSettings.get(charB);
    const voiceA = MS_VOICE_MAP[setA?.voiceName]?.name || setA?.voiceName || "默认";
    const voiceB = MS_VOICE_MAP[setB?.voiceName]?.name || setB?.voiceName || "默认";

    els.swapPreviewArea.innerHTML = `
      <div><strong>对调后：</strong></div>
      <div>• 【${escapeHtml(charA)}】将换为：<strong>${escapeHtml(voiceB)}</strong> (原${escapeHtml(charB)}的音色、语调与风格)</div>
      <div>• 【${escapeHtml(charB)}】将换为：<strong>${escapeHtml(voiceA)}</strong> (原${escapeHtml(charA)}的音色、语调与风格)</div>
    `;
  }

  function handleConfirmSwap() {
    const charA = els.swapSelectA.value;
    const charB = els.swapSelectB.value;
    if (charA === charB) return;

    const setA = state.speakerSettings.get(charA);
    const setB = state.speakerSettings.get(charB);
    if (!setA || !setB) return;

    // Swap acoustic attributes while retaining identities
    const tempVoice = setA.voiceName;
    const tempPitch = setA.pitch;
    const tempRate = setA.rateOffset;
    const tempStyle = setA.baseStyle;

    setA.voiceName = setB.voiceName;
    setA.pitch = setB.pitch;
    setA.rateOffset = setB.rateOffset;
    setA.baseStyle = setB.baseStyle;

    setB.voiceName = tempVoice;
    setB.pitch = tempPitch;
    setB.rateOffset = tempRate;
    setB.baseStyle = tempStyle;

    renderVoiceTree();
    closeModal("swapTransferModal");
    toast(`已成功互换【${charA}】与【${charB}】的配音树配置！`);
  }

  function handleConfirmTransfer() {
    const srcChar = els.transferSourceSelect.value;
    const srcSetting = state.speakerSettings.get(srcChar);
    if (!srcSetting) return;

    const mode = document.querySelector('input[name="transferTargetMode"]:checked')?.value || "single";
    const currentList = currentSpeakers();
    let targets = [];

    if (mode === "single") {
      const dst = els.transferTargetSelect.value;
      if (dst === srcChar) {
        toast("源角色与目标角色不能相同。");
        return;
      }
      targets = [dst];
    } else if (mode === "same-gender") {
      const srcGender = inferGender(srcChar);
      targets = currentList.filter((c) => c !== srcChar && inferGender(c) === srcGender);
      if (!targets.length) {
        toast(`未找到其他同性别角色。`);
        return;
      }
    } else if (mode === "all") {
      targets = currentList.filter((c) => c !== srcChar);
    }

    targets.forEach((dst) => {
      const targetSetting = state.speakerSettings.get(dst);
      if (targetSetting) {
        targetSetting.voiceName = srcSetting.voiceName;
        targetSetting.pitch = srcSetting.pitch;
        targetSetting.rateOffset = srcSetting.rateOffset;
        targetSetting.baseStyle = srcSetting.baseStyle;
      }
    });

    renderVoiceTree();
    closeModal("swapTransferModal");
    toast(`已将【${srcChar}】的音色成功移植给 ${targets.length} 位角色！`);
  }

  /* -------------------------------------------------------------
     小说角色搭配树可视化卡片区渲染 (Character Voice Tree)
  ------------------------------------------------------------- */
  function renderVoiceTree() {
    if (!els.characterVoiceTree) return;
    const speakers = currentSpeakers();
    if (!speakers.length) {
      els.characterVoiceTree.innerHTML = '<div class="empty-state">导入小说文本后，将自动识别人物并构建角色语音搭配树。</div>';
      return;
    }

    // Calculate line counts per speaker
    const lineStats = {};
    speakers.forEach((s) => { lineStats[s] = 0; });
    state.chapters.forEach((chapter) => {
      extractSegments(chapter.text).forEach((seg) => {
        if (seg.speaker && lineStats[seg.speaker] !== undefined) {
          lineStats[seg.speaker] += 1;
        }
      });
    });

    // Grouping
    const groups = {
      narrator: { title: "🎙️ 旁白演播组", items: [] },
      protagonist: { title: "👑 核心主役组", items: [] },
      supporting: { title: "👥 登场配角组", items: [] },
    };

    speakers.forEach((speaker) => {
      const setting = state.speakerSettings.get(speaker) || {
        speaker,
        role: inferRole(speaker),
        voiceName: "zh-CN-YunxiNeural",
        pitch: 1.0,
        rateOffset: 0.0,
        baseStyle: "chat",
      };

      if (speaker === "旁白") {
        groups.narrator.items.push({ speaker, setting, count: lineStats[speaker] || 0 });
      } else if (["youngMale", "youngFemale"].includes(setting.role) || (lineStats[speaker] || 0) >= 3) {
        groups.protagonist.items.push({ speaker, setting, count: lineStats[speaker] || 0 });
      } else {
        groups.supporting.items.push({ speaker, setting, count: lineStats[speaker] || 0 });
      }
    });

    // Render tree cards HTML
    let html = "";
    Object.values(groups).forEach((group) => {
      if (!group.items.length) return;
      html += `
        <div class="tree-group">
          <div class="tree-group-header">
            <span class="tree-group-title">${escapeHtml(group.title)}</span>
            <span class="tree-group-count">${group.items.length} 个角色</span>
          </div>
          <div class="tree-cards-list">
            ${group.items.map((item) => renderTreeCard(item.speaker, item.setting, item.count)).join("")}
          </div>
        </div>
      `;
    });

    els.characterVoiceTree.innerHTML = html;
  }

  function renderTreeCard(speaker, setting, count) {
    const msVoice = MS_VOICE_MAP[setting.voiceName] || {
      name: setting.voiceName || "默认音色",
      categoryLabel: "通用",
      styles: ["chat", "narration-relaxed", "cheerful", "serious", "angry", "sad", "fearful"],
    };

    const gender = inferGender(speaker);
    const genderClass = gender === "male" ? "char-badge-gender-male" : "char-badge-gender-female";
    const genderIcon = gender === "male" ? "♂ 男" : "♀ 女";

    // Style dropdown options
    const styles = msVoice.styles || ["chat", "narration-relaxed", "cheerful", "serious", "angry", "sad"];
    const styleOptions = styles
      .map(
        (s) =>
          `<option value="${escapeAttr(s)}" ${setting.baseStyle === s ? "selected" : ""}>${escapeHtml(STYLE_LABELS[s] || s)}</option>`,
      )
      .join("");

    return `
      <div class="tree-card" data-speaker="${escapeAttr(speaker)}">
        <div class="tree-card-header">
          <div class="tree-card-title-box">
            <span class="tree-char-name">${escapeHtml(speaker)}</span>
            <span class="char-badge ${genderClass}">${genderIcon}</span>
            <select class="text-input text-input-sm card-role-select" data-field="role" title="调整角色类型">
              ${Object.entries(ROLE_LABELS)
                .map(
                  ([val, label]) =>
                    `<option value="${val}" ${setting.role === val ? "selected" : ""}>${label}</option>`,
                )
                .join("")}
            </select>
          </div>
          <span class="char-badge-count">发言 ${count} 处</span>
        </div>

        <div class="tree-card-voice-info">
          <div class="current-voice-tag">
            <span>音色:</span>
            <span class="current-voice-name">微软 · ${escapeHtml(msVoice.name)}</span>
          </div>
          <select class="text-input text-input-sm card-style-select" data-field="style" title="情感演绎风格">
            ${styleOptions}
          </select>
        </div>

        <div class="tree-card-sliders">
          <label class="mini-slider">
            音高: <strong>${Number(setting.pitch).toFixed(2)}</strong>
            <input type="range" min="0.5" max="1.8" step="0.05" value="${setting.pitch}" data-field="pitch" />
          </label>
          <label class="mini-slider">
            微调语速: <strong>${Number(setting.rateOffset) >= 0 ? "+" : ""}${Number(setting.rateOffset).toFixed(2)}</strong>
            <input type="range" min="-0.3" max="0.3" step="0.05" value="${setting.rateOffset}" data-field="rateOffset" />
          </label>
        </div>

        <div class="tree-card-actions">
          <button class="secondary-button card-btn-sm" type="button" data-action="audition-character">🔊 试听</button>
          <button class="primary-button card-btn-sm" type="button" data-action="change-voice">🎨 换微软音色</button>
          <button class="ghost-button card-btn-sm" type="button" data-action="swap-character">🔄 互换</button>
          <button class="ghost-button card-btn-sm" type="button" data-action="transfer-character">📋 移植到...</button>
        </div>
      </div>
    `;
  }

  function handleVoiceTreeClick(event) {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const card = btn.closest(".tree-card");
    const speaker = card ? card.dataset.speaker : null;
    if (!speaker) return;

    const action = btn.dataset.action;
    if (action === "audition-character") {
      auditionCharacterSpeaker(speaker);
    } else if (action === "change-voice") {
      openVoiceCatalog(speaker);
    } else if (action === "swap-character") {
      openSwapTransferModal("swap", speaker);
    } else if (action === "transfer-character") {
      openSwapTransferModal("transfer", speaker);
    }
  }

  function handleVoiceTreeChange(event) {
    const card = event.target.closest(".tree-card");
    if (!card) return;
    const speaker = card.dataset.speaker;
    const setting = state.speakerSettings.get(speaker);
    if (!setting) return;

    const field = event.target.dataset.field;
    if (field === "role") {
      setting.role = event.target.value;
      const preset = ROLE_DEFAULTS[setting.role];
      if (preset) {
        setting.voiceName = preset.defaultVoice;
        setting.pitch = preset.pitch;
        setting.rateOffset = preset.rateOffset;
      }
      renderVoiceTree();
    } else if (field === "style") {
      setting.baseStyle = event.target.value;
    }
  }

  function handleVoiceTreeInput(event) {
    const card = event.target.closest(".tree-card");
    if (!card) return;
    const speaker = card.dataset.speaker;
    const setting = state.speakerSettings.get(speaker);
    if (!setting) return;

    const field = event.target.dataset.field;
    if (field === "pitch") {
      setting.pitch = Number(event.target.value);
      const strong = event.target.closest("label").querySelector("strong");
      if (strong) strong.textContent = Number(event.target.value).toFixed(2);
    } else if (field === "rateOffset") {
      setting.rateOffset = Number(event.target.value);
      const strong = event.target.closest("label").querySelector("strong");
      if (strong) strong.textContent = `${Number(event.target.value) >= 0 ? "+" : ""}${Number(event.target.value).toFixed(2)}`;
    }
  }

  /* -------------------------------------------------------------
     试听功能 (Audition Engine)
  ------------------------------------------------------------- */
  function auditionCharacterSpeaker(speaker) {
    if (!isSpeechSupported()) {
      toast("当前浏览器不支持 Web Speech 试听功能。");
      return;
    }

    const setting = state.speakerSettings.get(speaker);
    if (!setting) return;

    // Find a dialogue line from this character if possible, or fall back to template
    let line = "";
    for (const ch of state.chapters) {
      const seg = extractSegments(ch.text).find((s) => s.speaker === speaker && s.text.length >= 6);
      if (seg) {
        line = seg.text;
        break;
      }
    }

    const msVoice = MS_VOICE_MAP[setting.voiceName];
    const textToSpeak = line || (msVoice ? msVoice.sampleText : `我是${speaker}，这是我的音色配音效果。`);

    auditionVoiceDirect(msVoice, textToSpeak, setting.pitch, setting.rateOffset, setting.baseStyle);
    toast(`正在试听【${speaker}】的配音效果...`);
  }

  function auditionVoiceDirect(msVoice, text, customPitch = null, customRateOffset = null, style = "chat") {
    if (!isSpeechSupported()) {
      toast("当前浏览器不支持语音合成试听。");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const resolvedVoice = resolveBrowserVoiceForMsVoice(msVoice);
    if (resolvedVoice) {
      utterance.voice = resolvedVoice;
      utterance.lang = resolvedVoice.lang || "zh-CN";
    } else {
      utterance.lang = "zh-CN";
    }

    const pitchVal = customPitch !== null ? customPitch : (msVoice?.defaultPitch || 1.0);
    const rateOffsetVal = customRateOffset !== null ? customRateOffset : (msVoice?.defaultRate || 0.0);
    const emotion = emotionAdjustment(style);

    utterance.pitch = clamp(pitchVal + emotion.pitch, 0.1, 2.0);
    utterance.rate = clamp(Number(els.rateSlider.value) + rateOffsetVal + emotion.rate, 0.5, 2.0);
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
  }

  function resolveBrowserVoiceForMsVoice(msVoice) {
    if (!state.voices.length) return null;
    const keywords = [];
    if (msVoice) {
      keywords.push(msVoice.name);
      keywords.push(msVoice.fullName.replace("zh-CN-", "").replace("Neural", ""));
    }
    const chineseVoices = state.voices.filter((v) => {
      const val = `${v.name} ${v.lang}`.toLowerCase();
      return val.includes("zh") || val.includes("chinese") || val.includes("中文") || val.includes("普通话");
    });
    const pool = chineseVoices.length ? chineseVoices : state.voices;
    for (const kw of keywords) {
      const match = pool.find((v) => v.name.toLowerCase().includes(kw.toLowerCase()));
      if (match) return match;
    }
    return pool[0] || null;
  }

  /* -------------------------------------------------------------
     弹窗通用交互 (Modal Utilities)
  ------------------------------------------------------------- */
  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
    }
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
    }
  }

  /* -------------------------------------------------------------
     核心业务逻辑 (Text Processing, Chapters, Speech Settings)
  ------------------------------------------------------------- */
  async function handleFileImport(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".epub")) {
      setImportStatus("正在解析 EPUB 电子书");
      try {
        toast(`📖 正在解析 EPUB 电子书《${file.name}》...`);
        const res = await fetch("http://127.0.0.1:8768/api/novel/parse-epub", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            epub_base64: await new Promise((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result);
              r.onerror = reject;
              r.readAsDataURL(file);
            }),
            filename: file.name,
          }),
        });
        const result = await res.json();
        if (result.status === "ok") {
          els.rawText.value = result.full_text;
          els.bookTitle.value = result.title;
          setImportStatus(`EPUB 已解析 (${result.total_chapters} 章)`);
          toast(`✅ 成功解析 EPUB《${result.title}》：已提取 ${result.total_chapters} 个章节！`);
          handleParse();
        } else {
          throw new Error(result.message || "EPUB 解析错误");
        }
      } catch (error) {
        setImportStatus("EPUB 解析失败");
        toast(`EPUB 解析失败：${friendlyError(error)}`);
      }
      return;
    }

    if (!lowerName.endsWith(".txt") && !lowerName.endsWith(".md")) {
      toast("支持 .epub / .txt / .md 文件。");
      event.target.value = "";
      return;
    }

    setImportStatus("正在读取文件");
    try {
      const text = await file.text();
      els.rawText.value = text;
      if (!els.bookTitle.value || els.bookTitle.value === "未命名小说") {
        els.bookTitle.value = file.name.replace(/\.(txt|md)$/i, "");
      }
      setImportStatus("文件已读取");
      toast("文件已载入，可识别章节。");
    } catch (error) {
      setImportStatus("读取失败");
      toast(`文件读取失败：${friendlyError(error)}`);
    }
  }

  async function handleParse() {
    const text = els.rawText.value.trim();
    if (!text) {
      toast("文本为空。请粘贴小说正文或上传 .txt / .md 文件。");
      return;
    }

    setImportStatus("正在识别章节");
    els.parseButton.disabled = true;
    await nextFrame();
    try {
      const parsed = parseChapters(text);
      state.chapters.forEach(clearChapterAudio);
      state.chapters = parsed.map((chapter, index) => ({
        id: createId(),
        title: chapter.title || `第${index + 1}章`,
        text: chapter.text,
        selected: true,
        status: "idle",
        progress: 0,
        audioBlob: null,
        audioUrl: "",
        fileExt: "",
        error: "",
        previewed: false,
      }));
      rebuildSpeakerSettings();
      renderAll();
      setImportStatus(`已识别 ${state.chapters.length} 章`);
      toast(`已识别 ${state.chapters.length} 个章节，角色语音树已智能匹配！`);
    } catch (error) {
      setImportStatus("识别失败");
      toast(`章节识别失败：${friendlyError(error)}`);
    } finally {
      els.parseButton.disabled = false;
    }
  }

  function loadSampleText() {
    els.bookTitle.value = "三国演义示例";
    els.rawText.value = SAMPLE_TEXT;
    handleParse();
  }

  function clearInput() {
    stopWork();
    state.chapters.forEach(clearChapterAudio);
    state.chapters = [];
    state.speakerSettings.clear();
    els.rawText.value = "";
    els.fileInput.value = "";
    setImportStatus("等待导入");
    renderAll();
  }

  function parseChapters(input) {
    const text = cleanText(input);
    if (!text.trim()) {
      throw new Error("清洗后没有可用文本。");
    }

    const lines = text.split("\n");
    const hasHeading = lines.some((line) => isChapterHeading(line.trim()));
    if (!hasHeading) {
      return splitByParagraphs(text);
    }

    const chapters = [];
    let current = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (isChapterHeading(line)) {
        if (current && current.text.trim()) {
          chapters.push(normalizeChapter(current));
        }
        current = { title: line, text: "" };
        continue;
      }

      if (!current) {
        if (!line) continue;
        current = { title: "序章", text: "" };
      }
      current.text += `${rawLine}\n`;
    }

    if (current && current.text.trim()) {
      chapters.push(normalizeChapter(current));
    }

    return chapters.length ? chapters : splitByParagraphs(text);
  }

  function cleanText(input) {
    return input
      .replace(/\r\n?/g, "\n")
      .replace(/[\u200b-\u200f\u202a-\u202e\ufeff]/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/[「『]/g, "“")
      .replace(/[」』]/g, "”")
      .replace(/"([^"\n]{1,600})"/g, "“$1”")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
  }

  function isChapterHeading(line) {
    if (!line || line.length > 80) return false;
    const chineseNumber = "[0-9０-９一二三四五六七八九十百千万两〇零壹贰叁肆伍陆柒捌玖拾]+";
    const patterns = [
      new RegExp(`^第\\s*${chineseNumber}\\s*[章节回卷部篇][\\s:：、.．-]*.{0,56}$`, "i"),
      /^Chapter\s+[0-9ivxlcdm]+[\s:：、.．-]*.{0,56}$/i,
      new RegExp(`^(?:上|中|下)?\\s*卷\\s*${chineseNumber}?.{0,56}$`, "i"),
      new RegExp(`^第\\s*${chineseNumber}\\s*卷.{0,56}$`, "i"),
    ];
    return patterns.some((pattern) => pattern.test(line));
  }

  function normalizeChapter(chapter) {
    return {
      title: chapter.title.trim(),
      text: chapter.text.replace(/\n{3,}/g, "\n\n").trim(),
    };
  }

  function splitByParagraphs(text) {
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    const source = paragraphs.length ? paragraphs : splitSentences(text);
    const chapters = [];
    let bucket = [];
    let size = 0;
    const target = 4200;

    for (const part of source) {
      const partSize = countText(part);
      if (bucket.length && size + partSize > target) {
        chapters.push({ title: `智能分段 ${chapters.length + 1}`, text: bucket.join("\n\n") });
        bucket = [];
        size = 0;
      }
      bucket.push(part);
      size += partSize;
    }
    if (bucket.length) {
      chapters.push({ title: `智能分段 ${chapters.length + 1}`, text: bucket.join("\n\n") });
    }
    return chapters;
  }

  function renderAll() {
    renderChapters();
    renderVoiceTree();
    updateProgressSummary();
    updateSupportStatus();
  }

  function renderChapters() {
    if (!state.chapters.length) {
      els.chapterList.innerHTML = '<div class="empty-state">导入文本后将在这里显示章节。</div>';
      updateProgressSummary();
      return;
    }

    els.chapterList.innerHTML = state.chapters
      .map((chapter, index) => chapterTemplate(chapter, index))
      .join("");
    updateProgressSummary();
  }

  function chapterTemplate(chapter, index) {
    const label = chapterStatusLabel(chapter);
    const statusClass = `is-${chapter.status}`;
    const player = chapter.audioUrl
      ? `<audio controls src="${escapeAttr(chapter.audioUrl)}"></audio>`
      : `<div class="player-placeholder">${chapter.previewed ? "已完成浏览器试听；当前模式暂不提供音频文件。" : "尚未生成可下载音频。"}</div>`;

    return `
      <article class="chapter-item" data-chapter-id="${escapeAttr(chapter.id)}">
        <div class="chapter-head">
          <label class="chapter-check" title="选择章节">
            <input class="chapter-select" type="checkbox" ${chapter.selected ? "checked" : ""} />
          </label>
          <input class="chapter-title-input" type="text" value="${escapeAttr(chapter.title)}" aria-label="章节标题" />
          <span class="word-count">${countText(chapter.text)} 字</span>
          <span class="status-badge ${statusClass}" data-role="status">${label}</span>
        </div>
        <textarea class="chapter-text" spellcheck="false" aria-label="章节正文">${escapeHtml(chapter.text)}</textarea>
        <div class="chapter-actions">
          <div class="button-row">
            <button class="secondary-button" type="button" data-action="preview">试听</button>
            <button class="primary-button" type="button" data-action="generate">生成</button>
            <button class="secondary-button" type="button" data-action="download">下载</button>
            <button class="ghost-button" type="button" data-action="retry">重试</button>
          </div>
          <div class="button-row">
            <button class="ghost-button" type="button" data-action="split">按光标拆分</button>
            <button class="ghost-button" type="button" data-action="merge">并入上一章</button>
          </div>
        </div>
        <div class="chapter-progress" aria-hidden="true">
          <span data-role="progress" style="width:${Math.max(0, Math.min(100, chapter.progress))}%"></span>
        </div>
        <div class="player-slot" data-role="player">${player}</div>
        <div class="notice chapter-error" data-role="error" ${chapter.error ? "" : "hidden"}>${escapeHtml(chapter.error)}</div>
      </article>
    `;
  }

  function updateChapterCard(chapter) {
    const card = chapterCard(chapter.id);
    if (!card) return;
    const status = card.querySelector('[data-role="status"]');
    const progress = card.querySelector('[data-role="progress"]');
    const player = card.querySelector('[data-role="player"]');
    const wordCount = card.querySelector(".word-count");
    const error = card.querySelector('[data-role="error"]');

    if (status) {
      status.className = `status-badge is-${chapter.status}`;
      status.textContent = chapterStatusLabel(chapter);
    }
    if (progress) {
      progress.style.width = `${Math.max(0, Math.min(100, chapter.progress))}%`;
    }
    if (wordCount) {
      wordCount.textContent = `${countText(chapter.text)} 字`;
    }
    if (player) {
      player.innerHTML = chapter.audioUrl
        ? `<audio controls src="${escapeAttr(chapter.audioUrl)}"></audio>`
        : `<div class="player-placeholder">${chapter.previewed ? "已完成浏览器试听；当前模式暂不提供音频文件。" : "尚未生成可下载音频。"}</div>`;
    }
    if (error) {
      error.hidden = !chapter.error;
      error.textContent = chapter.error || "";
    }
    updateProgressSummary();
  }

  function rebuildSpeakerSettings() {
    const speakers = currentSpeakers();
    const next = new Map();
    speakers.forEach((speaker) => {
      const existing = state.speakerSettings.get(speaker);
      if (existing) {
        next.set(speaker, existing);
        return;
      }
      const role = inferRole(speaker);
      const matchedVoice = chooseDefaultMsVoice(speaker, role);
      next.set(speaker, {
        speaker,
        role,
        voiceName: matchedVoice.id,
        pitch: matchedVoice.defaultPitch || 1.0,
        rateOffset: matchedVoice.defaultRate || 0.0,
        baseStyle: matchedVoice.styles[0] || "chat",
      });
    });
    state.speakerSettings = next;
  }

  function chooseDefaultMsVoice(speaker, role) {
    // Specific character name match heuristics
    if (speaker === "旁白") return MS_VOICE_MAP["zh-CN-YunxiNeural"];
    if (/刘备|玄德|曹操|将|帅|侯|帝|王|霸/.test(speaker)) return MS_VOICE_MAP["zh-CN-YunyeNeural"];
    if (/诸葛|亮|孔明|生|生|仙|墨|文/.test(speaker)) return MS_VOICE_MAP["zh-CN-YunfengNeural"];
    if (/张飞|李逵|武松|猛|暴|狂/.test(speaker)) return MS_VOICE_MAP["zh-CN-YunyeNeural"];
    if (/关羽|云长|关公/.test(speaker)) return MS_VOICE_MAP["zh-CN-YunzeNeural"];
    if (/老|翁|祖|仙翁|魔|邪|贼|奸/.test(speaker)) return MS_VOICE_MAP["zh-CN-YunzeNeural"];
    if (/童|娃|儿|小/.test(speaker)) return MS_VOICE_MAP["zh-CN-YunxiaNeural"];
    if (/夫人|小姐|姑娘|女|仙子|妹|姐|妻|妃/.test(speaker)) return MS_VOICE_MAP["zh-CN-XiaohanNeural"];

    // Match by role
    const defaultId = ROLE_DEFAULTS[role]?.defaultVoice || "zh-CN-YunjieNeural";
    return MS_VOICE_MAP[defaultId] || MS_VOICE_CATALOG[0];
  }

  function currentSpeakers() {
    const speakers = new Set(["旁白"]);
    if (els.speakerModeToggle.checked) {
      state.chapters.forEach((chapter) => {
        extractSegments(chapter.text).forEach((segment) => {
          if (segment.type === "dialogue") speakers.add(segment.speaker || "未识别角色");
        });
      });
    }
    return Array.from(speakers);
  }

  function inferRole(speaker) {
    if (speaker === "旁白") return "narrator";
    if (/童|幼|孩|小妹|正太|萝莉/.test(speaker)) return "child";
    if (/夫人|小姐|姑娘|女|母|妻|姬|妃|她|妹|姐|仙子|丫鬟/.test(speaker)) {
      return /母|太后|老妇|掌门|主母/.test(speaker) ? "mature" : "youngFemale";
    }
    if (/老|翁|父|祖|魔|邪|贼|奸|宿敌|怪/.test(speaker)) return "elderVillain";
    if (/叔|伯|将|侯|公|帝|王|掌门|宗师|师兄|大哥/.test(speaker)) return "mature";
    return "youngMale";
  }

  function inferGender(speaker) {
    if (speaker === "旁白") return "male";
    if (/夫人|小姐|姑娘|女|母|妻|姬|妃|她|妹|姐|仙子|丫鬟|妇|娘/.test(speaker)) return "female";
    return "male";
  }

  function refreshVoices() {
    state.voices = "speechSynthesis" in window ? window.speechSynthesis.getVoices() : [];
    updateSupportStatus();
  }

  function updateSupportStatus() {
    const speech = isSpeechSupported();
    const recorder = isRecordingSupported();
    if (speech && recorder) {
      els.supportStatus.textContent = "支持试听与录制";
    } else if (speech) {
      els.supportStatus.textContent = "支持试听";
    } else {
      els.supportStatus.textContent = "不支持语音合成";
    }
  }

  function updateModeNotice() {
    const mode = els.ttsMode.value;
    els.onlinePanel.hidden = mode !== "online";
    if (mode === "browser-preview") {
      els.modeNotice.textContent = "当前模式可离线朗读和单章试听；浏览器 Web Speech API 不提供音频文件流，下载音频暂不支持。";
    } else if (mode === "browser-record") {
      els.modeNotice.textContent = "生成时会请求捕获当前标签页音频，并把朗读录制为 WAV。若浏览器未提供标签页音频捕获，将提示暂不支持。";
    } else {
      els.modeNotice.textContent = "在线接口支持直接将微软角色音色树（音色ID、音高、语速、情感风格）POST至后端服务，生成高保真 MP3/WAV。";
    }
  }

  function handleChapterClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const card = button.closest(".chapter-item");
    const chapter = card ? chapterById(card.dataset.chapterId) : null;
    if (!chapter) return;

    const action = button.dataset.action;
    if (action === "preview") previewChapter(chapter);
    if (action === "generate") generateOneChapter(chapter);
    if (action === "retry") generateOneChapter(chapter);
    if (action === "download") downloadChapter(chapter);
    if (action === "split") splitChapterAtCursor(chapter, card);
    if (action === "merge") mergeChapterWithPrevious(chapter);
  }

  function handleChapterChange(event) {
    const target = event.target;
    if (!target.classList.contains("chapter-select")) return;
    const card = target.closest(".chapter-item");
    const chapter = card ? chapterById(card.dataset.chapterId) : null;
    if (!chapter) return;
    chapter.selected = target.checked;
    updateProgressSummary();
  }

  function handleChapterInput(event) {
    const target = event.target;
    const card = target.closest(".chapter-item");
    const chapter = card ? chapterById(card.dataset.chapterId) : null;
    if (!chapter) return;

    if (target.classList.contains("chapter-title-input")) {
      chapter.title = target.value.trim() || "未命名章节";
    }
    if (target.classList.contains("chapter-text")) {
      chapter.text = target.value;
      chapter.status = "idle";
      chapter.progress = 0;
      chapter.previewed = false;
      clearChapterAudio(chapter);
      updateChapterCard(chapter);
      scheduleVoiceRefresh();
    }
    updateProgressSummary();
  }

  function selectChapters(selected) {
    state.chapters.forEach((chapter) => {
      chapter.selected = selected;
    });
    renderChapters();
  }

  function invertSelection() {
    state.chapters.forEach((chapter) => {
      chapter.selected = !chapter.selected;
    });
    renderChapters();
  }

  function splitChapterAtCursor(chapter, card) {
    const index = state.chapters.findIndex((item) => item.id === chapter.id);
    const textarea = card.querySelector(".chapter-text");
    const position = textarea.selectionStart;
    const before = chapter.text.slice(0, position).trim();
    const after = chapter.text.slice(position).trim();

    if (before.length < 20 || after.length < 20) {
      toast("拆分点两侧文本太短，请把光标放在更合适的位置。");
      return;
    }

    chapter.text = before;
    chapter.status = "idle";
    chapter.progress = 0;
    chapter.previewed = false;
    clearChapterAudio(chapter);

    const newChapter = {
      id: createId(),
      title: inferTitleFromText(after) || `${chapter.title} 下`,
      text: after,
      selected: chapter.selected,
      status: "idle",
      progress: 0,
      audioBlob: null,
      audioUrl: "",
      fileExt: "",
      error: "",
      previewed: false,
    };

    state.chapters.splice(index + 1, 0, newChapter);
    rebuildSpeakerSettings();
    renderAll();
    toast("已按光标拆分章节。");
  }

  function mergeChapterWithPrevious(chapter) {
    const index = state.chapters.findIndex((item) => item.id === chapter.id);
    if (index <= 0) {
      toast("第一章没有上一章可合并。");
      return;
    }

    const previous = state.chapters[index - 1];
    previous.text = `${previous.text.trim()}\n\n${chapter.title}\n${chapter.text.trim()}`;
    previous.status = "idle";
    previous.progress = 0;
    previous.previewed = false;
    clearChapterAudio(previous);
    clearChapterAudio(chapter);
    state.chapters.splice(index, 1);
    rebuildSpeakerSettings();
    renderAll();
    toast("已并入上一章。");
  }

  function inferTitleFromText(text) {
    const firstLine = text.split("\n").map((line) => line.trim()).find(Boolean);
    return firstLine && isChapterHeading(firstLine) ? firstLine : "";
  }

  async function previewFirstChapter() {
    const chapter = state.chapters.find((item) => item.selected) || state.chapters[0];
    if (!chapter) {
      toast("请先导入并识别章节。");
      return;
    }
    await previewChapter(chapter);
  }

  async function previewChapter(chapter) {
    if (state.busy) {
      toast("已有任务进行中，请先停止或等待完成。");
      return;
    }
    if (!isSpeechSupported()) {
      toast("当前浏览器不支持语音合成。请使用新版 Chrome 或 Edge。");
      return;
    }

    setBusy(true, "正在试听");
    state.stopRequested = false;
    try {
      chapter.status = "previewing";
      chapter.progress = 0;
      chapter.error = "";
      updateChapterCard(chapter);
      await speakChapter(chapter);
      if (!state.stopRequested) {
        chapter.status = "completed";
        chapter.progress = 100;
        chapter.previewed = true;
        updateChapterCard(chapter);
        toast("试听完成。浏览器试听模式暂不支持直接下载音频文件。");
      }
    } catch (error) {
      if (!state.stopRequested) {
        markFailed(chapter, error);
      }
    } finally {
      setBusy(false, "空闲");
      state.activeSpeech = null;
    }
  }

  async function generateOneChapter(chapter) {
    if (state.busy) {
      toast("已有任务进行中，请先停止或等待完成。");
      return;
    }
    await runGeneration([chapter]);
  }

  async function generateSelectedChapters() {
    if (state.busy) {
      toast("已有任务进行中，请先停止或等待完成。");
      return;
    }
    const selected = state.chapters.filter((chapter) => chapter.selected);
    if (!selected.length) {
      toast("请至少勾选一个章节。");
      return;
    }
    await runGeneration(selected);
  }

  async function runGeneration(chapters) {
    const mode = els.ttsMode.value;
    if (mode === "browser-preview") {
      toast("浏览器试听模式暂不支持导出音频。请选择“浏览器录制导出 WAV”或配置在线接口。");
      return;
    }

    state.stopRequested = false;
    state.paused = false;
    setBusy(true, "正在生成");
    let captureStream = null;

    try {
      if (mode === "browser-record") {
        if (!isSpeechSupported()) throw new Error("当前浏览器不支持语音合成。");
        if (!isRecordingSupported()) throw new Error("当前浏览器暂不支持标签页音频捕获录制。");
        captureStream = await requestDisplayAudio();
      }

      for (const chapter of chapters) {
        if (state.stopRequested) break;
        await waitIfPaused();
        if (mode === "browser-record") {
          await generateChapterByRecording(chapter, captureStream);
        } else {
          await generateChapterOnline(chapter);
        }
      }

      if (!state.stopRequested) {
        toast("生成任务完成。");
      }
    } catch (error) {
      toast(`生成失败：${friendlyError(error)}`);
    } finally {
      if (captureStream) stopMediaStream(captureStream);
      setBusy(false, state.stopRequested ? "已停止" : "空闲");
      state.onlineAbort = null;
      state.activeSpeech = null;
    }
  }

  async function generateChapterByRecording(chapter, captureStream) {
    chapter.status = "generating";
    chapter.progress = 0;
    chapter.error = "";
    clearChapterAudio(chapter);
    updateChapterCard(chapter);

    const audioTracks = captureStream.getAudioTracks();
    if (!audioTracks.length) throw new Error("没有捕获到标签页音频。请重新选择当前标签页并勾选共享音频。");

    const audioStream = new MediaStream(audioTracks);
    const mimeType = preferredRecorderMimeType();
    const recorder = mimeType ? new MediaRecorder(audioStream, { mimeType }) : new MediaRecorder(audioStream);
    const chunks = [];
    const done = new Promise((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => reject(new Error("录制器发生错误。"));
      recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
    });

    try {
      recorder.start(250);
      await delay(300);
      await speakChapter(chapter);
      await delay(350);
    } catch (error) {
      if (recorder.state !== "inactive") recorder.stop();
      markFailed(chapter, error);
      throw error;
    }

    if (recorder.state !== "inactive") recorder.stop();
    const recordedBlob = await done;
    if (recordedBlob.size < 1200) {
      const error = new Error("录制结果为空。请确认捕获的是当前标签页，并已勾选共享音频。");
      markFailed(chapter, error);
      throw error;
    }

    try {
      const wavBlob = await transcodeBlobToWav(recordedBlob);
      setChapterAudio(chapter, wavBlob, "wav");
    } catch (error) {
      const ext = mimeToExtension(recordedBlob.type) || "webm";
      setChapterAudio(chapter, recordedBlob, ext);
      toast("浏览器无法转码为 WAV，已保留录制原始格式。");
    }
  }

  async function generateChapterOnline(chapter) {
    const endpoint = els.endpointUrl.value.trim();
    if (!endpoint) throw new Error("请填写在线 TTS 接口地址。");

    chapter.status = "generating";
    chapter.progress = 0;
    chapter.error = "";
    clearChapterAudio(chapter);
    updateChapterCard(chapter);

    const segments = buildSegmentsForChapter(chapter);
    const batches = splitSegmentsIntoBatches(segments, readMaxBatchChars());
    const blobs = [];

    for (let index = 0; index < batches.length; index += 1) {
      if (state.stopRequested) throw new Error("已停止。");
      await waitIfPaused();

      state.onlineAbort = new AbortController();
      const blob = await requestOnlineAudio(chapter, batches[index], index, batches.length, state.onlineAbort.signal);
      blobs.push(blob);
      chapter.progress = Math.round(((index + 1) / batches.length) * 96);
      updateChapterCard(chapter);
    }

    if (blobs.length === 1) {
      const ext = mimeToExtension(blobs[0].type) || els.onlineFormat.value;
      setChapterAudio(chapter, blobs[0], ext);
      return;
    }

    try {
      const wavBlob = await concatenateAudioBlobsToWav(blobs);
      setChapterAudio(chapter, wavBlob, "wav");
      toast("多批音频已在浏览器内拼接为 WAV。");
    } catch (error) {
      markFailed(chapter, new Error("多批音频拼接失败。请降低单章长度，或让在线接口直接返回整章音频。"));
      throw error;
    }
  }

  async function requestOnlineAudio(chapter, segments, partIndex, totalParts, signal) {
    const token = els.endpointToken.value.trim();
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const voiceSettingsPayload = Array.from(state.speakerSettings.values()).map((s) => ({
      speaker: s.speaker,
      role: s.role,
      voice_name: s.voiceName,
      pitch: s.pitch,
      rate_offset: `${s.rateOffset >= 0 ? "+" : ""}${Math.round(s.rateOffset * 100)}%`,
      base_style: s.baseStyle || "chat",
    }));

    const response = await fetch(els.endpointUrl.value.trim(), {
      method: "POST",
      headers,
      signal,
      body: JSON.stringify({
        book_title: bookTitle(),
        chapter_index: state.chapters.indexOf(chapter) + 1,
        chapter_title: chapter.title,
        part_index: partIndex,
        total_parts: totalParts,
        output_format: els.onlineFormat.value,
        rate: Number(els.rateSlider.value),
        speaker_mode: els.speakerModeToggle.checked,
        voice_settings: voiceSettingsPayload,
        segments,
      }),
    });

    if (!response.ok) {
      throw new Error(`在线接口返回 ${response.status}。`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      if (data.audio_base64) {
        return base64ToBlob(data.audio_base64, data.mime_type || `audio/${els.onlineFormat.value}`);
      }
      if (data.audio_url) {
        const audioResponse = await fetch(data.audio_url, { signal });
        if (!audioResponse.ok) throw new Error("接口返回的音频地址无法下载。");
        return audioResponse.blob();
      }
      throw new Error("在线接口 JSON 中缺少 audio_base64 或 audio_url。");
    }

    return response.blob();
  }

  function speakChapter(chapter) {
    return new Promise((resolve, reject) => {
      if (!isSpeechSupported()) {
        reject(new Error("当前浏览器不支持语音合成。"));
        return;
      }

      window.speechSynthesis.cancel();
      const items = buildSpeechItems(chapter);
      if (!items.length) {
        reject(new Error("章节文本为空。"));
        return;
      }

      const totalChars = items.reduce((sum, item) => sum + countText(item.text), 0);
      let completedChars = 0;
      let cursor = 0;
      state.activeSpeech = { chapterId: chapter.id, reject };

      const speakNext = () => {
        if (state.stopRequested) {
          reject(new Error("已停止。"));
          return;
        }
        if (cursor >= items.length) {
          chapter.progress = 100;
          updateChapterCard(chapter);
          resolve();
          return;
        }

        const item = items[cursor];
        cursor += 1;
        const utterance = new SpeechSynthesisUtterance(item.text);
        applyUtteranceSettings(utterance, item);

        utterance.onboundary = (event) => {
          if (typeof event.charIndex === "number") {
            const local = Math.max(0, Math.min(countText(item.text), event.charIndex));
            chapter.progress = Math.min(99, Math.round(((completedChars + local) / totalChars) * 100));
            updateChapterCard(chapter);
          }
        };

        utterance.onend = async () => {
          completedChars += countText(item.text);
          chapter.progress = Math.min(99, Math.round((completedChars / totalChars) * 100));
          updateChapterCard(chapter);
          await waitIfPaused();
          speakNext();
        };

        utterance.onerror = (event) => {
          reject(new Error(event.error || "语音合成失败。"));
        };

        window.speechSynthesis.speak(utterance);
      };

      speakNext();
    });
  }

  function buildSpeechItems(chapter) {
    const segments = buildSegmentsForChapter(chapter);
    const items = [];
    segments.forEach((segment) => {
      splitForSpeech(segment.text, 160).forEach((text) => {
        items.push({ ...segment, text });
      });
    });
    return items;
  }

  function buildSegmentsForChapter(chapter) {
    const segments = extractSegments(chapter.text);
    if (els.speakerModeToggle.checked) return segments;
    return segments.map((segment) => ({ ...segment, speaker: "旁白", type: "narration" }));
  }

  function extractSegments(text) {
    const source = cleanText(text);
    const pattern = /“([^”]{1,1200})”|"([^"\n]{1,1200})"/g;
    const segments = [];
    let lastIndex = 0;
    let match;
    let lastSpeaker = "";

    while ((match = pattern.exec(source))) {
      const before = source.slice(lastIndex, match.index).trim();
      if (before) {
        segments.push({
          type: "narration",
          speaker: "旁白",
          text: before,
          emotion: inferEmotion(before, "narration"),
        });
      }

      const spoken = (match[1] || match[2] || "").trim();
      if (spoken) {
        const inferred = inferSpeaker(source, match.index, pattern.lastIndex);
        const speaker = inferred === "沿用上一位" && lastSpeaker ? lastSpeaker : inferred;
        if (speaker && speaker !== "未识别角色") lastSpeaker = speaker;
        segments.push({
          type: "dialogue",
          speaker: speaker || "未识别角色",
          text: spoken,
          emotion: inferEmotion(spoken, "dialogue"),
        });
      }
      lastIndex = pattern.lastIndex;
    }

    const rest = source.slice(lastIndex).trim();
    if (rest) {
      segments.push({
        type: "narration",
        speaker: "旁白",
        text: rest,
        emotion: inferEmotion(rest, "narration"),
      });
    }

    if (!segments.length && source) {
      segments.push({ type: "narration", speaker: "旁白", text: source, emotion: "narration-relaxed" });
    }

    return segments;
  }

  function inferSpeaker(source, start, end) {
    const before = source.slice(Math.max(0, start - 56), start);
    const after = source.slice(end, Math.min(source.length, end + 46));
    const verb = "(?:说道|说|问道|问|答道|答|喝道|喊道|笑道|叹道|道|低声道|冷笑道|怒道)";
    const name = "([\\u4e00-\\u9fa5A-Za-z·]{1,8})";
    const beforeMatch = before.match(new RegExp(`${name}[^“”]{0,24}${verb}[\\s:：，,、]*$`));
    const afterMatch = after.match(new RegExp(`^[\\s，,。.!！?？、]*${name}[^“”]{0,24}${verb}`));
    const candidate = cleanSpeaker((afterMatch && afterMatch[1]) || (beforeMatch && beforeMatch[1]) || "");
    if (candidate) return candidate;
    if (/^\s*[，,。.!！?？、]*(他|她|其人|那人|此人)\s*(?:说道|说|问道|问|答道|答|道)/.test(after)) {
      return "沿用上一位";
    }
    return "未识别角色";
  }

  function cleanSpeaker(value) {
    const cleaned = value
      .replace(/(望着|看着|瞧着|抚须|拱手|低声|高声|厉声|沉声|冷笑|大笑|怒喝|叹息|叹).*$/u, "")
      .replace(/[^\u4e00-\u9fa5A-Za-z·]/g, "");
    if (!cleaned || /^(他|她|我|你|众人|有人|那人|此人|先生|将军)$/.test(cleaned)) return "";
    return cleaned;
  }

  function inferEmotion(text, type) {
    if (/怒|喝|骂|恨|杀|岂有此理|！|!/.test(text)) return "angry";
    if (/笑|喜|乐|哈哈|欣然/.test(text)) return "cheerful";
    if (/哭|泪|悲|叹|哀|伤/.test(text)) return "sad";
    if (/惊|惧|怕|恐|慌|？|\?/.test(text)) return "fearful";
    if (type === "narration") return "narration-relaxed";
    return "serious";
  }

  function applyUtteranceSettings(utterance, item) {
    const setting = state.speakerSettings.get(item.speaker) || state.speakerSettings.get("旁白");
    const msVoice = MS_VOICE_MAP[setting?.voiceName];
    const resolvedVoice = resolveBrowserVoiceForMsVoice(msVoice);

    if (resolvedVoice) {
      utterance.voice = resolvedVoice;
      utterance.lang = resolvedVoice.lang || "zh-CN";
    } else {
      utterance.lang = "zh-CN";
    }

    const emotion = emotionAdjustment(item.emotion || setting?.baseStyle);
    utterance.rate = clamp(Number(els.rateSlider.value) + (setting?.rateOffset || 0) + emotion.rate, 0.5, 2);
    utterance.pitch = clamp((setting?.pitch || 1) + emotion.pitch, 0.1, 2);
    utterance.volume = 1;
  }

  function emotionAdjustment(emotion) {
    const table = {
      angry: { rate: 0.08, pitch: 0.06 },
      cheerful: { rate: 0.06, pitch: 0.08 },
      sad: { rate: -0.09, pitch: -0.08 },
      fearful: { rate: 0.04, pitch: 0.1 },
      serious: { rate: -0.02, pitch: -0.02 },
      "narration-relaxed": { rate: -0.03, pitch: -0.03 },
    };
    return table[emotion] || { rate: 0, pitch: 0 };
  }

  function splitForSpeech(text, maxChars) {
    const sentences = splitSentences(text.replace(/\s+/g, " ").trim());
    const result = [];
    let bucket = "";
    sentences.forEach((sentence) => {
      if (bucket && countText(bucket) + countText(sentence) > maxChars) {
        result.push(bucket);
        bucket = sentence;
      } else {
        bucket += sentence;
      }
    });
    if (bucket) result.push(bucket);

    const hardSplit = [];
    result.forEach((part) => {
      if (countText(part) <= maxChars) {
        hardSplit.push(part);
      } else {
        for (let index = 0; index < part.length; index += maxChars) {
          hardSplit.push(part.slice(index, index + maxChars));
        }
      }
    });
    return hardSplit.filter((part) => part.trim());
  }

  function splitSentences(text) {
    const parts = [];
    let current = "";
    for (const char of text) {
      current += char;
      if ("。！？；.!?;".includes(char)) {
        parts.push(current.trim());
        current = "";
      }
    }
    if (current.trim()) parts.push(current.trim());
    return parts.length ? parts : [text.trim()].filter(Boolean);
  }

  function splitSegmentsIntoBatches(segments, maxChars) {
    const batches = [];
    let current = [];
    let size = 0;
    segments.forEach((segment) => {
      const parts = splitForSpeech(segment.text, maxChars);
      parts.forEach((part) => {
        const piece = { ...segment, text: part };
        const pieceSize = countText(part);
        if (current.length && size + pieceSize > maxChars) {
          batches.push(current);
          current = [];
          size = 0;
        }
        current.push(piece);
        size += pieceSize;
      });
    });
    if (current.length) batches.push(current);
    return batches;
  }

  async function requestDisplayAudio() {
    toast("请选择当前标签页，并勾选共享音频。");
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    if (!stream.getAudioTracks().length) {
      stopMediaStream(stream);
      throw new Error("没有捕获到音频。请重新选择当前标签页并开启共享音频。");
    }
    return stream;
  }

  function preferredRecorderMimeType() {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    return candidates.find((type) => window.MediaRecorder && MediaRecorder.isTypeSupported(type)) || "";
  }

  async function transcodeBlobToWav(blob) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = await blob.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(buffer);
    const wav = encodeWav(decoded);
    await audioContext.close();
    return new Blob([wav], { type: "audio/wav" });
  }

  async function concatenateAudioBlobsToWav(blobs) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const buffers = [];
    for (const blob of blobs) {
      const arrayBuffer = await blob.arrayBuffer();
      buffers.push(await audioContext.decodeAudioData(arrayBuffer));
    }

    const sampleRate = audioContext.sampleRate;
    const channels = Math.max(...buffers.map((buffer) => buffer.numberOfChannels));
    const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
    const output = audioContext.createBuffer(channels, totalLength, sampleRate);
    let offset = 0;
    buffers.forEach((buffer) => {
      for (let channel = 0; channel < channels; channel += 1) {
        const source = buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1));
        output.copyToChannel(source, channel, offset);
      }
      offset += buffer.length;
    });

    const wav = encodeWav(output);
    await audioContext.close();
    return new Blob([wav], { type: "audio/wav" });
  }

  function encodeWav(audioBuffer) {
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length * channels * 2;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);
    let offset = 0;

    writeString(view, offset, "RIFF");
    offset += 4;
    view.setUint32(offset, 36 + length, true);
    offset += 4;
    writeString(view, offset, "WAVE");
    offset += 4;
    writeString(view, offset, "fmt ");
    offset += 4;
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, 1, true);
    offset += 2;
    view.setUint16(offset, channels, true);
    offset += 2;
    view.setUint32(offset, sampleRate, true);
    offset += 4;
    view.setUint32(offset, sampleRate * channels * 2, true);
    offset += 4;
    view.setUint16(offset, channels * 2, true);
    offset += 2;
    view.setUint16(offset, 16, true);
    offset += 2;
    writeString(view, offset, "data");
    offset += 4;
    view.setUint32(offset, length, true);
    offset += 4;

    const channelData = Array.from({ length: channels }, (_, channel) => audioBuffer.getChannelData(channel));
    for (let index = 0; index < audioBuffer.length; index += 1) {
      for (let channel = 0; channel < channels; channel += 1) {
        const sample = clamp(channelData[channel][index], -1, 1);
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }
    return buffer;
  }

  function writeString(view, offset, value) {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  }

  function setChapterAudio(chapter, blob, ext) {
    clearChapterAudio(chapter);
    chapter.audioBlob = blob;
    chapter.fileExt = ext;
    chapter.audioUrl = URL.createObjectURL(blob);
    chapter.status = "completed";
    chapter.progress = 100;
    chapter.previewed = true;
    chapter.error = "";
    updateChapterCard(chapter);
  }

  function clearChapterAudio(chapter) {
    if (chapter.audioUrl) URL.revokeObjectURL(chapter.audioUrl);
    chapter.audioBlob = null;
    chapter.audioUrl = "";
    chapter.fileExt = "";
  }

  function markFailed(chapter, error) {
    chapter.status = "failed";
    chapter.error = friendlyError(error);
    updateChapterCard(chapter);
  }

  function downloadChapter(chapter) {
    if (!chapter.audioBlob) {
      toast("该章节还没有可下载音频。浏览器试听模式暂不支持下载。");
      return;
    }
    const index = state.chapters.indexOf(chapter);
    downloadBlob(chapter.audioBlob, chapterFileName(chapter, index));
  }

  async function downloadGeneratedZip() {
    const generated = state.chapters.filter((chapter) => chapter.audioBlob);
    if (!generated.length) {
      toast("还没有已生成的音频章节，无法打包。");
      return;
    }

    setBusy(true, "正在打包");
    try {
      const files = generated.map((chapter) => ({
        name: chapterFileName(chapter, state.chapters.indexOf(chapter)),
        blob: chapter.audioBlob,
      }));
      const zip = await createZipBlob(files);
      downloadBlob(zip, `${sanitizeFileName(bookTitle())}_有声书.zip`);
      toast("ZIP 已生成。");
    } catch (error) {
      toast(`打包失败：${friendlyError(error)}`);
    } finally {
      setBusy(false, "空闲");
    }
  }

  function chapterFileName(chapter, index) {
    const ext = chapter.fileExt || "mp3";
    return `${sanitizeFileName(bookTitle())}_第${index + 1}章_${sanitizeFileName(chapter.title)}.${ext}`;
  }

  async function createZipBlob(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    const now = new Date();
    const stamp = dosDateTime(now);

    for (const file of files) {
      const data = new Uint8Array(await file.blob.arrayBuffer());
      const name = encoder.encode(file.name);
      const crc = crc32(data);
      const local = zipLocalHeader(name, crc, data.length, stamp);
      const central = zipCentralHeader(name, crc, data.length, stamp, offset);
      localParts.push(local, data);
      centralParts.push(central);
      offset += local.length + data.length;
    }

    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = zipEndRecord(files.length, centralSize, offset);
    return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
  }

  function zipLocalHeader(name, crc, size, stamp) {
    const bytes = new Uint8Array(30 + name.length);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, stamp.time, true);
    view.setUint16(12, stamp.date, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, name.length, true);
    view.setUint16(28, 0, true);
    bytes.set(name, 30);
    return bytes;
  }

  function zipCentralHeader(name, crc, size, stamp, offset) {
    const bytes = new Uint8Array(46 + name.length);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0x0800, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, stamp.time, true);
    view.setUint16(14, stamp.date, true);
    view.setUint32(16, crc, true);
    view.setUint32(20, size, true);
    view.setUint32(24, size, true);
    view.setUint16(28, name.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, offset, true);
    bytes.set(name, 46);
    return bytes;
  }

  function zipEndRecord(count, centralSize, centralOffset) {
    const bytes = new Uint8Array(22);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, count, true);
    view.setUint16(10, count, true);
    view.setUint32(12, centralSize, true);
    view.setUint32(16, centralOffset, true);
    view.setUint16(20, 0, true);
    return bytes;
  }

  function dosDateTime(date) {
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { time, date: dosDate };
  }

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      table[index] = value >>> 0;
    }
    return table;
  })();

  function crc32(data) {
    let crc = 0xffffffff;
    for (let index = 0; index < data.length; index += 1) {
      crc = CRC_TABLE[(crc ^ data[index]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  function base64ToBlob(base64, mimeType) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: mimeType });
  }

  function pauseWork() {
    if (!state.busy) {
      toast("当前没有正在运行的任务。");
      return;
    }
    state.paused = true;
    if (isSpeechSupported() && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
    const active = state.activeSpeech ? chapterById(state.activeSpeech.chapterId) : null;
    if (active && active.status !== "completed" && active.status !== "failed") {
      active.status = "paused";
      updateChapterCard(active);
    }
    setActiveStatus("已暂停");
  }

  function resumeWork() {
    if (!state.paused) {
      toast("当前没有暂停的任务。");
      return;
    }
    state.paused = false;
    if (isSpeechSupported()) window.speechSynthesis.resume();
    const active = state.activeSpeech ? chapterById(state.activeSpeech.chapterId) : null;
    if (active && active.status === "paused") {
      active.status = "generating";
      updateChapterCard(active);
    }
    setActiveStatus("继续生成");
  }

  function stopWork() {
    state.stopRequested = true;
    state.paused = false;
    if (isSpeechSupported()) {
      window.speechSynthesis.cancel();
    }
    if (state.onlineAbort) {
      state.onlineAbort.abort();
      state.onlineAbort = null;
    }
    const active = state.activeSpeech ? chapterById(state.activeSpeech.chapterId) : null;
    if (active && active.status !== "completed" && active.status !== "failed") {
      active.status = "idle";
      active.progress = 0;
      updateChapterCard(active);
    }
    setActiveStatus("已停止");
  }

  async function waitIfPaused() {
    while (state.paused && !state.stopRequested) {
      await delay(180);
    }
  }

  function setBusy(isBusy, statusText) {
    state.busy = isBusy;
    els.generateSelectedButton.disabled = isBusy;
    els.parseButton.disabled = isBusy;
    setActiveStatus(statusText);
  }

  function setActiveStatus(text) {
    els.activeStatus.textContent = text;
  }

  function setImportStatus(text) {
    els.importStatus.textContent = text;
  }

  function updateProgressSummary() {
    const total = state.chapters.length;
    const completed = state.chapters.filter((chapter) => chapter.status === "completed").length;
    const selected = state.chapters.filter((chapter) => chapter.selected).length;
    const chars = state.chapters.reduce((sum, chapter) => sum + countText(chapter.text), 0);
    els.progressText.textContent = `已完成 ${completed} / 共 ${total} 章`;
    els.chapterSummary.textContent = `${total} 章 · ${selected} 已选 · ${chars} 字`;
    els.overallProgress.style.width = total ? `${Math.round((completed / total) * 100)}%` : "0%";
  }

  function scheduleVoiceRefresh() {
    clearTimeout(state.refreshTimer);
    state.refreshTimer = setTimeout(() => {
      rebuildSpeakerSettings();
      renderVoiceTree();
    }, 350);
  }

  function chapterById(id) {
    return state.chapters.find((chapter) => chapter.id === id);
  }

  function chapterCard(id) {
    return els.chapterList.querySelector(`[data-chapter-id="${cssEscape(id)}"]`);
  }

  function chapterStatusLabel(chapter) {
    if (chapter.status === "completed" && !chapter.audioBlob && chapter.previewed) return "已完成试听";
    return STATUS_LABELS[chapter.status] || "待生成";
  }

  function countText(text) {
    return (text || "").replace(/\s/g, "").length;
  }

  function bookTitle() {
    return els.bookTitle.value.trim() || "未命名小说";
  }

  function readMaxBatchChars() {
    return clamp(Number(els.maxBatchChars.value) || 1400, 300, 5000);
  }

  function sanitizeFileName(value) {
    return (value || "未命名")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "")
      .slice(0, 80);
  }

  function mimeToExtension(mime) {
    if (!mime) return "";
    if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
    if (mime.includes("wav")) return "wav";
    if (mime.includes("webm")) return "webm";
    if (mime.includes("mp4")) return "m4a";
    return "";
  }

  function isSpeechSupported() {
    return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }

  function isRecordingSupported() {
    return Boolean(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia && window.MediaRecorder);
  }

  function stopMediaStream(stream) {
    stream.getTracks().forEach((track) => track.stop());
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `chapter-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return CSS.escape(value);
    return String(value).replace(/"/g, '\\"');
  }

  function friendlyError(error) {
    if (!error) return "未知错误";
    if (error.name === "AbortError") return "请求已停止。";
    return error.message || String(error);
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      els.toast.classList.remove("is-visible");
    }, 3600);
  }
})();
