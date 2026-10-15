"""Persistent character-to-voice mapping with Microsoft voice catalog and tree operations."""

from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path
from typing import Any

from novel_tts_system.schemas import CharacterMetadata, CharacterRole, Gender, VoiceConfig


VOICE_POOL: dict[str, str] = {
    "narration_male": "zh-CN-YunxiNeural",
    "narration_female": "zh-CN-XiaoxiaoNeural",
    "young_male": "zh-CN-YunjieNeural",
    "young_female": "zh-CN-XiaoyiNeural",
    "elder_villain": "zh-CN-YunzeNeural",
}

# Microsoft Azure / Edge TTS Comprehensive Chinese Voice Catalog
MS_VOICE_CATALOG: list[dict[str, Any]] = [
    # 旁白演播组 (Narrators)
    {
        "id": "zh-CN-YunxiNeural",
        "name": "云希",
        "fullName": "zh-CN-YunxiNeural",
        "gender": "male",
        "category": "narrator",
        "categoryLabel": "旁白演播",
        "archetype": "沉稳磁性 / 小说旁白主役",
        "tags": ["经典旁白", "多情感", "沉稳男声"],
        "styles": [
            "narration-relaxed",
            "cheerful",
            "angry",
            "sad",
            "serious",
            "fearful",
            "whispering",
            "depressed",
            "excited",
        ],
        "defaultRate": "+0%",
        "defaultPitch": "-2%",
        "sampleText": "天地不仁，以万物为刍狗；日月经天，江河行地。",
    },
    {
        "id": "zh-CN-XiaoxiaoNeural",
        "name": "晓晓",
        "fullName": "zh-CN-XiaoxiaoNeural",
        "gender": "female",
        "category": "narrator",
        "categoryLabel": "旁白演播",
        "archetype": "温暖知性 / 柔和小说旁白",
        "tags": ["温暖女主播", "多情感", "知性细腻"],
        "styles": [
            "narration-relaxed",
            "cheerful",
            "angry",
            "sad",
            "serious",
            "gentle",
            "affectionate",
            "fearful",
        ],
        "defaultRate": "-2%",
        "defaultPitch": "+0%",
        "sampleText": "微风拂过窗棂，那些沉封已久的故事，悄然拉开序幕。",
    },
    {
        "id": "zh-CN-YunjianNeural",
        "name": "云健",
        "fullName": "zh-CN-YunjianNeural",
        "gender": "male",
        "category": "narrator",
        "categoryLabel": "旁白演播",
        "archetype": "激情影视解说 / 评书演播",
        "tags": ["评书史诗", "解说", "高昂有力"],
        "styles": ["sports-commentary", "narration-relaxed", "serious"],
        "defaultRate": "+2%",
        "defaultPitch": "-1%",
        "sampleText": "话说天下大势，分久必合，合久必分！",
    },
    {
        "id": "zh-CN-XiaoqiuNeural",
        "name": "晓秋",
        "fullName": "zh-CN-XiaoqiuNeural",
        "gender": "female",
        "category": "narrator",
        "categoryLabel": "旁白演播",
        "archetype": "典雅深情 / 纪实与文学故事",
        "tags": ["优雅从容", "文学朗读"],
        "styles": ["narration-relaxed", "gentle"],
        "defaultRate": "-3%",
        "defaultPitch": "-2%",
        "sampleText": "岁月如水流逝，唯有那座石桥依旧静默在烟雨之中。",
    },
    {
        "id": "zh-CN-YunyangNeural",
        "name": "云扬",
        "fullName": "zh-CN-YunyangNeural",
        "gender": "male",
        "category": "narrator",
        "categoryLabel": "旁白演播",
        "archetype": "专业严肃 / 播音主持",
        "tags": ["新闻专业", "端正庄重"],
        "styles": ["newscast", "customerservice"],
        "defaultRate": "+0%",
        "defaultPitch": "+0%",
        "sampleText": "本台消息，今日江南一带细雨连绵，商道渐次畅通。",
    },
    # 青年男主组 (Young Male Protagonists)
    {
        "id": "zh-CN-YunjieNeural",
        "name": "云杰",
        "fullName": "zh-CN-YunjieNeural",
        "gender": "male",
        "category": "youngMale",
        "categoryLabel": "青年男主",
        "archetype": "热血少侠 / 阳光正气男主",
        "tags": ["热血洒脱", "少年意气", "正派男主"],
        "styles": ["chat", "cheerful", "angry", "serious"],
        "defaultRate": "+2%",
        "defaultPitch": "+0%",
        "sampleText": "我若成佛，天下无魔；我若成魔，佛奈我何！",
    },
    {
        "id": "zh-CN-YunfengNeural",
        "name": "云枫",
        "fullName": "zh-CN-YunfengNeural",
        "gender": "male",
        "category": "youngMale",
        "categoryLabel": "青年男主",
        "archetype": "温润公子 / 儒雅书生 / 深情男配",
        "tags": ["温文尔雅", "深情内敛"],
        "styles": ["chat", "sad", "gentle"],
        "defaultRate": "-2%",
        "defaultPitch": "+1%",
        "sampleText": "浮生若梦，若能护得所爱之人周全，此生足矣。",
    },
    {
        "id": "zh-CN-YunhaoNeural",
        "name": "云皓",
        "fullName": "zh-CN-YunhaoNeural",
        "gender": "male",
        "category": "youngMale",
        "categoryLabel": "青年男主",
        "archetype": "朝气蓬勃 / 阳光爽朗男青年",
        "tags": ["活力自信", "机敏幽默"],
        "styles": ["chat", "cheerful", "excited"],
        "defaultRate": "+4%",
        "defaultPitch": "+2%",
        "sampleText": "别担心，前面的路就算再凶险，有我陪你闯过去！",
    },
    # 青年女主组 (Young Female Protagonists)
    {
        "id": "zh-CN-XiaohanNeural",
        "name": "晓涵",
        "fullName": "zh-CN-XiaohanNeural",
        "gender": "female",
        "category": "youngFemale",
        "categoryLabel": "青年女主",
        "archetype": "清纯柔美 / 出尘仙子 / 坚韧女主",
        "tags": ["灵动娇美", "多情感", "女主首选"],
        "styles": ["gentle", "sad", "cheerful", "fearful", "affectionate"],
        "defaultRate": "+2%",
        "defaultPitch": "+4%",
        "sampleText": "哪怕踏遍天涯海角，我也一定要找到当年的真相。",
    },
    {
        "id": "zh-CN-XiaoyiNeural",
        "name": "晓伊",
        "fullName": "zh-CN-XiaoyiNeural",
        "gender": "female",
        "category": "youngFemale",
        "categoryLabel": "青年女主",
        "archetype": "活泼灵动 / 傲娇师妹 / 机敏少女",
        "tags": ["清脆甜美", "活泼灵动"],
        "styles": ["chat", "cheerful", "angry"],
        "defaultRate": "+4%",
        "defaultPitch": "+6%",
        "sampleText": "哼，本姑娘才不稀罕你的好意呢，不过既然你开口了……",
    },
    {
        "id": "zh-CN-XiaoshuangNeural",
        "name": "晓双",
        "fullName": "zh-CN-XiaoshuangNeural",
        "gender": "female",
        "category": "youngFemale",
        "categoryLabel": "青年女主",
        "archetype": "娇俏软萌 / 少女闺蜜",
        "tags": ["娇憨可爱", "灵动小妹"],
        "styles": ["cheerful"],
        "defaultRate": "+4%",
        "defaultPitch": "+8%",
        "sampleText": "哇！师兄你快看，那边的桃花开得好漂亮呀！",
    },
    # 成熟中生组 (Mature & Masters)
    {
        "id": "zh-CN-YunyeNeural",
        "name": "云野",
        "fullName": "zh-CN-YunyeNeural",
        "gender": "male",
        "category": "mature",
        "categoryLabel": "成熟中生",
        "archetype": "豪迈宗师 / 威严将领 / 铁血硬汉",
        "tags": ["霸气威严", "厚重有力"],
        "styles": ["serious", "angry", "cheerful"],
        "defaultRate": "-2%",
        "defaultPitch": "-4%",
        "sampleText": "三尺青锋在此，犯我山门者，杀无赦！",
    },
    {
        "id": "zh-CN-XiaoruiNeural",
        "name": "晓睿",
        "fullName": "zh-CN-XiaoruiNeural",
        "gender": "female",
        "category": "mature",
        "categoryLabel": "成熟中生",
        "archetype": "冷静睿智 / 女掌门 / 霸气御姐",
        "tags": ["冷静干练", "睿智端庄"],
        "styles": ["serious", "calm"],
        "defaultRate": "-2%",
        "defaultPitch": "-2%",
        "sampleText": "成大事者不恤小耻，局势已定，容不得半分优柔寡断。",
    },
    {
        "id": "zh-CN-XiaozhenNeural",
        "name": "晓甄",
        "fullName": "zh-CN-XiaozhenNeural",
        "gender": "female",
        "category": "mature",
        "categoryLabel": "成熟中生",
        "archetype": "雍容华贵 / 皇后母仪 / 贵妇掌门",
        "tags": ["优雅端庄", "母仪天下"],
        "styles": ["narration-relaxed", "gentle"],
        "defaultRate": "-3%",
        "defaultPitch": "-1%",
        "sampleText": "在这深宫之中，唯有沉静自持，方能走得长远。",
    },
    {
        "id": "zh-CN-XiaoyanNeural",
        "name": "晓颜",
        "fullName": "zh-CN-XiaoyanNeural",
        "gender": "female",
        "category": "mature",
        "categoryLabel": "成熟中生",
        "archetype": "温良贤淑 / 慈祥母亲 / 柔和掌柜",
        "tags": ["亲切温厚", "温婉从容"],
        "styles": ["customerservice", "gentle"],
        "defaultRate": "-1%",
        "defaultPitch": "+0%",
        "sampleText": "快趁热喝了这碗参汤吧，身子骨要紧。",
    },
    # 长者反派组 (Elders & Villains)
    {
        "id": "zh-CN-YunzeNeural",
        "name": "云泽",
        "fullName": "zh-CN-YunzeNeural",
        "gender": "male",
        "category": "elderVillain",
        "categoryLabel": "长者反派",
        "archetype": "沧桑老者 / 阴冷魔头 / 绝世宿敌",
        "tags": ["阴冷深沉", "苍老威严", "反派经典"],
        "styles": ["serious", "angry", "depressed"],
        "defaultRate": "-6%",
        "defaultPitch": "-8%",
        "sampleText": "桀桀桀……年轻人，你以为凭你那点微末道行，能翻得了天吗？",
    },
    {
        "id": "zh-CN-XiaomoNeural",
        "name": "晓墨",
        "fullName": "zh-CN-XiaomoNeural",
        "gender": "female",
        "category": "elderVillain",
        "categoryLabel": "长者反派",
        "archetype": "诡谲妖婆 / 阴鸷毒妇 / 变化莫测",
        "tags": ["多角色变化", "阴郁诡谲"],
        "styles": ["chat", "serious", "angry", "depressed", "whispering"],
        "defaultRate": "-4%",
        "defaultPitch": "-5%",
        "sampleText": "既然落入了老身的幽冥幻境，就休想活着走出去！",
    },
    # 少儿童声组 (Kids & Youths)
    {
        "id": "zh-CN-YunxiaNeural",
        "name": "云夏",
        "fullName": "zh-CN-YunxiaNeural",
        "gender": "male",
        "category": "child",
        "categoryLabel": "少儿童声",
        "archetype": "淘气小男孩 / 机敏小灵兽 / 道童",
        "tags": ["机灵可爱", "天真童声"],
        "styles": ["cheerful"],
        "defaultRate": "+4%",
        "defaultPitch": "+10%",
        "sampleText": "主人主人！快醒醒，前面的山洞里好像藏着大宝贝！",
    },
    {
        "id": "zh-CN-XiaoyouNeural",
        "name": "晓悠",
        "fullName": "zh-CN-XiaoyouNeural",
        "gender": "female",
        "category": "child",
        "categoryLabel": "少儿童声",
        "archetype": "天真小女孩 / 软萌幼童 / 睡前童话",
        "tags": ["软糯童真", "呆萌可爱"],
        "styles": ["cheerful", "gentle"],
        "defaultRate": "+2%",
        "defaultPitch": "+12%",
        "sampleText": "大哥哥，月亮升起来了，你答应给我讲的神仙故事呢？",
    },
    # 方言特色组 (Dialects & Regional)
    {
        "id": "zh-CN-Shaanxi-XiaoniNeural",
        "name": "陕西晓妮",
        "fullName": "zh-CN-Shaanxi-XiaoniNeural",
        "gender": "female",
        "category": "dialect",
        "categoryLabel": "方言特色",
        "archetype": "关中秦腔风味 / 质朴豪爽",
        "tags": ["陕西方言", "质朴嘹亮"],
        "styles": ["general"],
        "defaultRate": "+0%",
        "defaultPitch": "+0%",
        "sampleText": "额跟你说，这事情可马虎不得，咱得办得稳稳当当的！",
    },
    {
        "id": "zh-CN-Liaoning-XiaobeiNeural",
        "name": "辽宁晓北",
        "fullName": "zh-CN-Liaoning-XiaobeiNeural",
        "gender": "female",
        "category": "dialect",
        "categoryLabel": "方言特色",
        "archetype": "东北话 / 幽默风趣 / 老铁豪爽",
        "tags": ["东北方言", "幽默接地气"],
        "styles": ["cheerful"],
        "defaultRate": "+2%",
        "defaultPitch": "+2%",
        "sampleText": "哎呀妈呀，老铁这可老厉害了，妥妥的没毛病！",
    },
    {
        "id": "zh-CN-Sichuan-YunxiNeural",
        "name": "四川云希",
        "fullName": "zh-CN-Sichuan-YunxiNeural",
        "gender": "male",
        "category": "dialect",
        "categoryLabel": "方言特色",
        "archetype": "四川话 / 安逸巴适 / 川味麻辣",
        "tags": ["四川方言", "巴适灵动"],
        "styles": ["chat"],
        "defaultRate": "+0%",
        "defaultPitch": "+0%",
        "sampleText": "莫慌嘛，吃碗麻辣小面，摆摆龙门阵，巴适得板！",
    },
    {
        "id": "zh-CN-Shandong-YunxiangNeural",
        "name": "山东云翔",
        "fullName": "zh-CN-Shandong-YunxiangNeural",
        "gender": "male",
        "category": "dialect",
        "categoryLabel": "方言特色",
        "archetype": "齐鲁风味 / 淳朴忠厚 / 山东好汉",
        "tags": ["山东方言", "厚道淳朴"],
        "styles": ["chat"],
        "defaultRate": "+0%",
        "defaultPitch": "-2%",
        "sampleText": "俺们庄户人家讲究的就是一个实诚，答应你的事绝不反悔！",
    },
    {
        "id": "zh-HK-WanLungNeural",
        "name": "香港云龙",
        "fullName": "zh-HK-WanLungNeural",
        "gender": "male",
        "category": "dialect",
        "categoryLabel": "方言特色",
        "archetype": "粤语评书 / 港风豪杰 / 沧桑叙事",
        "tags": ["粤语男声", "港风演播"],
        "styles": ["general"],
        "defaultRate": "-1%",
        "defaultPitch": "-2%",
        "sampleText": "江湖風雲變幻莫測，今日一別，不知何日再相逢。",
    },
    {
        "id": "zh-TW-HsiaoChenNeural",
        "name": "台湾晓臻",
        "fullName": "zh-TW-HsiaoChenNeural",
        "gender": "female",
        "category": "dialect",
        "categoryLabel": "方言特色",
        "archetype": "台湾腔温柔 / 细腻深情",
        "tags": ["台湾女声", "甜美温柔"],
        "styles": ["general"],
        "defaultRate": "+0%",
        "defaultPitch": "+2%",
        "sampleText": "其實只要大家平平安安的，心裡就覺得好溫暖喔。",
    },
    # 扩展 Azure 官方高拟真小说角色音色
    {
        "id": "zh-CN-XiaomengNeural",
        "name": "晓梦",
        "fullName": "zh-CN-XiaomengNeural",
        "gender": "female",
        "category": "youngFemale",
        "categoryLabel": "青年女主",
        "archetype": "清冷仙子 / 出尘飘逸玄幻神女",
        "tags": ["玄幻修真", "清冷仙气", "多情感"],
        "styles": ["gentle", "sad", "whispering", "serious"],
        "defaultRate": "-1%",
        "defaultPitch": "+5%",
        "sampleText": "天道渺茫，红尘如梦。你我既入仙门，便当割舍这俗世羁绊。",
    },
    {
        "id": "zh-CN-XiaoxuanNeural",
        "name": "晓萱",
        "fullName": "zh-CN-XiaoxuanNeural",
        "gender": "female",
        "category": "youngFemale",
        "categoryLabel": "青年女主",
        "archetype": "自信职场 / 现代都市干练女主",
        "tags": ["现代言情", "独立自信", "清晰明快"],
        "styles": ["chat", "cheerful", "serious"],
        "defaultRate": "+2%",
        "defaultPitch": "+3%",
        "sampleText": "市场不相信眼泪，既然拿下了这个项目，我们就要做到业界第一。",
    },
    {
        "id": "zh-CN-XiaorouNeural",
        "name": "晓柔",
        "fullName": "zh-CN-XiaorouNeural",
        "gender": "female",
        "category": "youngFemale",
        "categoryLabel": "青年女主",
        "archetype": "凄婉柔弱 / 虐恋深情千金佳人",
        "tags": ["虐恋悲情", "柔弱惹怜", "古典言情"],
        "styles": ["sad", "gentle", "fearful"],
        "defaultRate": "-3%",
        "defaultPitch": "+4%",
        "sampleText": "若你的心中早已有了旁人，又何必许我这一世浮华誓言……",
    },
    {
        "id": "zh-CN-YunhaiNeural",
        "name": "云海",
        "fullName": "zh-CN-YunhaiNeural",
        "gender": "male",
        "category": "mature",
        "categoryLabel": "成熟中生",
        "archetype": "仙门尊者 / 飘逸修真掌教仙尊",
        "tags": ["修仙宗主", "仙风道骨", "威严飘逸"],
        "styles": ["serious", "narration-relaxed", "calm"],
        "defaultRate": "-2%",
        "defaultPitch": "-3%",
        "sampleText": "万法归一，大道无形。今日尔等入我山门，当以守护苍生为己任！",
    },
    {
        "id": "zh-CN-XiaochenNeural",
        "name": "晓辰",
        "fullName": "zh-CN-XiaochenNeural",
        "gender": "male",
        "category": "youngMale",
        "categoryLabel": "青年男主",
        "archetype": "阳光元气 / 青春校园朝气少年",
        "tags": ["青春校园", "朝气活力", "阳光幽默"],
        "styles": ["chat", "cheerful"],
        "defaultRate": "+3%",
        "defaultPitch": "+1%",
        "sampleText": "喂！别磨蹭了，操场上的篮球赛马上就要开始了，快跟我来！",
    },
    {
        "id": "zh-CN-Henan-YundengNeural",
        "name": "河南云登",
        "fullName": "zh-CN-Henan-YundengNeural",
        "gender": "male",
        "category": "dialect",
        "categoryLabel": "方言特色",
        "archetype": "中原风韵 / 憨厚质朴豪爽豫调",
        "tags": ["河南方言", "质朴忠厚", "接地气"],
        "styles": ["chat"],
        "defaultRate": "+0%",
        "defaultPitch": "-1%",
        "sampleText": "中！这事包在俺身上，咱中原汉子说话算话，妥妥滴！",
    },
    {
        "id": "zh-HK-HiuMaanNeural",
        "name": "香港晓曼",
        "fullName": "zh-HK-HiuMaanNeural",
        "gender": "female",
        "category": "dialect",
        "categoryLabel": "方言特色",
        "archetype": "港岛佳人 / 典雅粤语知性女主",
        "tags": ["粤语女声", "港风典雅", "知性温婉"],
        "styles": ["general"],
        "defaultRate": "+0%",
        "defaultPitch": "+2%",
        "sampleText": "人生就好似一齣戲，兜兜轉轉，最緊要係活出真我。",
    },
    {
        "id": "zh-HK-HiuGaaiNeural",
        "name": "香港晓佳",
        "fullName": "zh-HK-HiuGaaiNeural",
        "gender": "female",
        "category": "dialect",
        "categoryLabel": "方言特色",
        "archetype": "活泼港妹 / 娇俏粤语千金少女",
        "tags": ["粤语甜美", "灵动少女", "娇俏港味"],
        "styles": ["cheerful"],
        "defaultRate": "+3%",
        "defaultPitch": "+7%",
        "sampleText": "點解你成日都咁木獨架？今日去銅鑼灣飲下午茶好唔好啊？",
    },
    {
        "id": "zh-TW-YunJheNeural",
        "name": "台湾云哲",
        "fullName": "zh-TW-YunJheNeural",
        "gender": "male",
        "category": "dialect",
        "categoryLabel": "方言特色",
        "archetype": "偶像男主 / 温润磁性台湾国语",
        "tags": ["台湾男声", "偶像剧温润", "深情治愈"],
        "styles": ["general"],
        "defaultRate": "-1%",
        "defaultPitch": "-1%",
        "sampleText": "只要妳轉過身，我一直都會在這裡等妳，不管多久都一樣。",
    },
    {
        "id": "zh-TW-HsiaoYuNeural",
        "name": "台湾晓雨",
        "fullName": "zh-TW-HsiaoYuNeural",
        "gender": "female",
        "category": "dialect",
        "categoryLabel": "方言特色",
        "archetype": "文艺清纯 / 软糯甜美腔调少女",
        "tags": ["台湾女声", "文艺软糯", "甜美治愈"],
        "styles": ["general"],
        "defaultRate": "+1%",
        "defaultPitch": "+5%",
        "sampleText": "那個……今天的天空好乾淨喔，微風吹過來真的好舒服。",
    },
    {
        "id": "zh-CN-liaoning-YunbiaoNeural",
        "name": "辽宁云彪",
        "fullName": "zh-CN-liaoning-YunbiaoNeural",
        "gender": "male",
        "category": "dialect",
        "categoryLabel": "方言特色",
        "archetype": "关东硬汉 / 豪爽铁血江湖大哥",
        "tags": ["东北方言", "硬汉豪爽", "重情重义"],
        "styles": ["chat"],
        "defaultRate": "+1%",
        "defaultPitch": "-4%",
        "sampleText": "兄弟，啥也别说了！今天谁敢动你一根汗毛，老子跟他死磕到底！",
    },
    {
        "id": "zh-CN-shaanxi-YunxiangNeural",
        "name": "陕西云翔",
        "fullName": "zh-CN-shaanxi-YunxiangNeural",
        "gender": "male",
        "category": "dialect",
        "categoryLabel": "方言特色",
        "archetype": "秦川汉子 / 厚重大气古韵秦风",
        "tags": ["陕西方言", "厚重大气", "关中豪杰"],
        "styles": ["chat"],
        "defaultRate": "-1%",
        "defaultPitch": "-3%",
        "sampleText": "这八百里秦川自古多豪杰，好男儿志在四方，岂能困守一隅！",
    },
    {
        "id": "zh-CN-sichuan-YunyangNeural",
        "name": "四川云阳",
        "fullName": "zh-CN-sichuan-YunyangNeural",
        "gender": "male",
        "category": "dialect",
        "categoryLabel": "方言特色",
        "archetype": "锦官豪客 / 洒脱川味机敏书生",
        "tags": ["四川方言", "机智幽默", "巴蜀风流"],
        "styles": ["chat"],
        "defaultRate": "+2%",
        "defaultPitch": "-1%",
        "sampleText": "哎呀呀，莫着急莫上火，船到桥头自然直，喝口盖碗茶再说嘛！",
    },
    {
        "id": "zh-CN-shandong-XiaoniNeural",
        "name": "山东晓妮",
        "fullName": "zh-CN-shandong-XiaoniNeural",
        "gender": "female",
        "category": "dialect",
        "categoryLabel": "方言特色",
        "archetype": "齐鲁大嫚 / 质朴坦诚直率姑娘",
        "tags": ["山东方言", "坦诚爽快", "热情淳朴"],
        "styles": ["chat"],
        "defaultRate": "+1%",
        "defaultPitch": "+1%",
        "sampleText": "俺们山东人直肠子，有啥说啥，能帮上你的忙俺心里就亮堂！",
    },
]

# GitHub 开源 AI 语音大模型库 (Qwen3-TTS / Alexandria, CosyVoice, ChatTTS, F5-TTS, GPT-SoVITS, Fish-Speech)
GITHUB_AI_VOICE_CATALOG: list[dict[str, Any]] = [
    {
        "id": "github-alexandria-storyteller",
        "name": "千问·评书大宗师",
        "fullName": "alexandria-qwen3-storyteller",
        "gender": "male",
        "category": "narrator",
        "categoryLabel": "开源评书主役",
        "repo": "Finrandojin/alexandria-audiobook",
        "modelTech": "Qwen3-TTS 8B · Alexandria LoRA",
        "archetype": "雄浑厚重 · 金戈铁马评书大宗师",
        "tags": ["Alexandria", "Qwen3-TTS", "评书演播", "单田芳风骨"],
        "styles": ["narration-relaxed", "serious", "sports-commentary"],
        "defaultRate": "-2%",
        "defaultPitch": "-3%",
        "sampleText": "欲知后事如何，且听下回分解！话说那道凌厉剑气，直破九重云霄！",
    },
    {
        "id": "github-alexandria-swordmaster",
        "name": "千问·剑宗少侠",
        "fullName": "alexandria-qwen3-swordmaster",
        "gender": "male",
        "category": "youngMale",
        "categoryLabel": "青年男主",
        "repo": "Finrandojin/alexandria-audiobook",
        "modelTech": "Qwen3-TTS 8B · Alexandria LoRA",
        "archetype": "鲜衣怒马 · 少年意气拔剑破空",
        "tags": ["Alexandria", "Qwen3-TTS", "修仙少侠", "热血男主"],
        "styles": ["chat", "cheerful", "angry"],
        "defaultRate": "+2%",
        "defaultPitch": "+0%",
        "sampleText": "我辈修士何惜一战？纵是万劫不复，这柄青锋剑也绝不退缩半分！",
    },
    {
        "id": "github-alexandria-fairywangshu",
        "name": "千问·望舒仙子",
        "fullName": "alexandria-qwen3-fairywangshu",
        "gender": "female",
        "category": "youngFemale",
        "categoryLabel": "青年女主",
        "repo": "Finrandojin/alexandria-audiobook",
        "modelTech": "Qwen3-TTS 8B · Alexandria LoRA",
        "archetype": "清冷出尘 · 太上忘情空灵仙子",
        "tags": ["Alexandria", "Qwen3-TTS", "清冷仙女", "出尘脱俗"],
        "styles": ["gentle", "sad", "whispering"],
        "defaultRate": "-2%",
        "defaultPitch": "+6%",
        "sampleText": "红尘百转，皆如露如电。你所执着的恩怨，在天道面前不过沧海一粟。",
    },
    {
        "id": "github-alexandria-demonlord",
        "name": "千问·九幽魔皇",
        "fullName": "alexandria-qwen3-demonlord",
        "gender": "male",
        "category": "elderVillain",
        "categoryLabel": "长者反派",
        "repo": "Finrandojin/alexandria-audiobook",
        "modelTech": "Qwen3-TTS 8B · Alexandria LoRA",
        "archetype": "阴郁森然 · 九幽至尊威压天下",
        "tags": ["Alexandria", "Qwen3-TTS", "魔道至尊", "阴鸷反派"],
        "styles": ["serious", "angry", "depressed"],
        "defaultRate": "-6%",
        "defaultPitch": "-9%",
        "sampleText": "本座隐忍三千载，待封印破开之日，天地众生皆当臣服在九幽王座之下！",
    },
    {
        "id": "github-alexandria-foxjunior",
        "name": "千问·灵狐小师妹",
        "fullName": "alexandria-qwen3-foxjunior",
        "gender": "female",
        "category": "child",
        "categoryLabel": "少儿童声",
        "repo": "Finrandojin/alexandria-audiobook",
        "modelTech": "Qwen3-TTS 8B · Alexandria LoRA",
        "archetype": "娇憨明媚 · 古灵精怪天真仙宠",
        "tags": ["Alexandria", "Qwen3-TTS", "灵宠萌妹", "机敏活泼"],
        "styles": ["cheerful", "chat"],
        "defaultRate": "+4%",
        "defaultPitch": "+14%",
        "sampleText": "师兄师兄！快把藏在储物袋里的九叶灵芝拿出来尝尝嘛，我都闻到香味啦！",
    },
    {
        "id": "github-cosyvoice-narrator",
        "name": "CosyVoice·自然演播",
        "fullName": "funaudio-cosyvoice-narrator",
        "gender": "male",
        "category": "narrator",
        "categoryLabel": "沉浸演播",
        "repo": "FunAudioLLM/CosyVoice",
        "modelTech": "CosyVoice-300M · Multi-Emotion Flow",
        "archetype": "电影质感 · 沉浸式小说文学叙事",
        "tags": ["CosyVoice", "阿里开源", "电影质感", "多情感大模型"],
        "styles": ["narration-relaxed", "gentle", "serious"],
        "defaultRate": "-1%",
        "defaultPitch": "-2%",
        "sampleText": "夜雨洗净了石阶上的青苔，马蹄声由远及近，敲碎了古镇深巷里长久的寂静。",
    },
    {
        "id": "github-cosyvoice-hotblood",
        "name": "CosyVoice·热血少侠",
        "fullName": "funaudio-cosyvoice-hotblood",
        "gender": "male",
        "category": "youngMale",
        "categoryLabel": "青年男主",
        "repo": "FunAudioLLM/CosyVoice",
        "modelTech": "CosyVoice-300M · Instruct Fine-Tuned",
        "archetype": "高燃国漫 · 不屈呐喊逆天改命",
        "tags": ["CosyVoice", "国漫主角", "热血激情"],
        "styles": ["cheerful", "angry", "chat"],
        "defaultRate": "+3%",
        "defaultPitch": "+1%",
        "sampleText": "天若压我，我便劈碎这苍穹；地若拘我，我便踏平这厚土！",
    },
    {
        "id": "github-cosyvoice-foxempress",
        "name": "CosyVoice·天狐御姐",
        "fullName": "funaudio-cosyvoice-foxempress",
        "gender": "female",
        "category": "mature",
        "categoryLabel": "成熟女主",
        "repo": "FunAudioLLM/CosyVoice",
        "modelTech": "CosyVoice-300M · Emotional Prompting",
        "archetype": "魅惑威严 · 算无遗策妖族女帝",
        "tags": ["CosyVoice", "成熟御姐", "算无遗策", "妖皇女帝"],
        "styles": ["serious", "whispering", "calm"],
        "defaultRate": "-2%",
        "defaultPitch": "-2%",
        "sampleText": "世人皆道我心狠手辣，可若不先执掌棋局，你我不过是他人生死案上的鱼肉罢了。",
    },
    {
        "id": "github-cosyvoice-zenmonk",
        "name": "CosyVoice·扫地老僧",
        "fullName": "funaudio-cosyvoice-zenmonk",
        "gender": "male",
        "category": "elderVillain",
        "categoryLabel": "长者宗师",
        "repo": "FunAudioLLM/CosyVoice",
        "modelTech": "CosyVoice-300M · Deep Timbre",
        "archetype": "暮鼓晨钟 · 看破红尘少林神僧",
        "tags": ["CosyVoice", "得道高僧", "慈悲苍老", "世外宗师"],
        "styles": ["serious", "gentle"],
        "defaultRate": "-5%",
        "defaultPitch": "-8%",
        "sampleText": "阿弥陀佛，执念如镜花水月，施主既然放不下，便在藏经阁中多参悟几年吧。",
    },
    {
        "id": "github-chattts-teahouse",
        "name": "ChatTTS·茶馆说书",
        "fullName": "chattts-teahouse-storyteller",
        "gender": "male",
        "category": "narrator",
        "categoryLabel": "市井说书",
        "repo": "2noise/ChatTTS",
        "modelTech": "ChatTTS · Conversational Diffusion",
        "archetype": "笑叹自如 · 极富口语呼吸感与市井烟火",
        "tags": ["ChatTTS", "拟真对话", "口语笑叹", "市井江湖"],
        "styles": ["chat", "cheerful"],
        "defaultRate": "+0%",
        "defaultPitch": "-1%",
        "sampleText": "哈哈，列位看官可听真切喽！那店家手里握着的不是酒壶，分明是半截淬了毒的柳叶飞刀啊！",
    },
    {
        "id": "github-chattts-urbanmale",
        "name": "ChatTTS·随性青年",
        "fullName": "chattts-urban-male",
        "gender": "male",
        "category": "youngMale",
        "categoryLabel": "青年男主",
        "repo": "2noise/ChatTTS",
        "modelTech": "ChatTTS · Natural Pause Engine",
        "archetype": "慵懒松弛 · 都市生活对白男声",
        "tags": ["ChatTTS", "现代日常", "松弛感", "真实呼吸"],
        "styles": ["chat"],
        "defaultRate": "+2%",
        "defaultPitch": "+0%",
        "sampleText": "呃……说实话，这事儿真没你想的那么复杂，反正兵来将挡，水来土掩嘛。",
    },
    {
        "id": "github-chattts-livelygirl",
        "name": "ChatTTS·灵动少女",
        "fullName": "chattts-lively-female",
        "gender": "female",
        "category": "youngFemale",
        "categoryLabel": "青年女主",
        "repo": "2noise/ChatTTS",
        "modelTech": "ChatTTS · Laugh Token Model",
        "archetype": "活泼灵俏 · 带气口轻笑灵动对白",
        "tags": ["ChatTTS", "灵动轻笑", "日常对白", "真实少女"],
        "styles": ["cheerful", "chat"],
        "defaultRate": "+3%",
        "defaultPitch": "+6%",
        "sampleText": "噗嗤……你这人怎么总是傻乎乎的，好啦好啦，本姑娘陪你一起去还不行嘛！",
    },
    {
        "id": "github-f5-cybercommando",
        "name": "F5-TTS·赛博特勤",
        "fullName": "f5tts-cyber-commando",
        "gender": "male",
        "category": "mature",
        "categoryLabel": "冷冽特勤",
        "repo": "SWivid/F5-TTS",
        "modelTech": "F5-TTS · Flow Matching DiT",
        "archetype": "硬核冷峻 · 未来机甲无机质指令",
        "tags": ["F5-TTS", "Flow Matching", "赛博科幻", "硬核机甲"],
        "styles": ["serious", "calm"],
        "defaultRate": "+2%",
        "defaultPitch": "-5%",
        "sampleText": "警告：核心聚变反应堆温度逼近临界值，战术外骨骼已切换为超载攻防模式。",
    },
    {
        "id": "github-f5-epicchronicle",
        "name": "F5-TTS·编年史叙事",
        "fullName": "f5tts-epic-chronicle",
        "gender": "male",
        "category": "narrator",
        "categoryLabel": "浩瀚叙事",
        "repo": "SWivid/F5-TTS",
        "modelTech": "F5-TTS · Zero-Shot High-Fidelity",
        "archetype": "全知浩瀚 · 跨越万年的星际史诗",
        "tags": ["F5-TTS", "星际史诗", "全知视角", "宏大叙事"],
        "styles": ["narration-relaxed", "serious"],
        "defaultRate": "-3%",
        "defaultPitch": "-3%",
        "sampleText": "在群星熄灭的三百万年后，孤独的科考船终于捕获了来自母星的第一束微弱信标。",
    },
    {
        "id": "github-f5-nightstalker",
        "name": "F5-TTS·暗夜宿敌",
        "fullName": "f5tts-night-stalker",
        "gender": "male",
        "category": "elderVillain",
        "categoryLabel": "窒息反派",
        "repo": "SWivid/F5-TTS",
        "modelTech": "F5-TTS · Deep Resonance",
        "archetype": "极度压迫 · 窒息阴森黑暗主宰",
        "tags": ["F5-TTS", "悬疑惊悚", "阴郁反派", "极度压迫"],
        "styles": ["whispering", "serious"],
        "defaultRate": "-5%",
        "defaultPitch": "-10%",
        "sampleText": "别白费力气了……当你凝视深渊的那一刻起，你的影子就已经属于我了。",
    },
    {
        "id": "github-gptsovits-swordpoet",
        "name": "GPT-SoVITS·青莲剑仙",
        "fullName": "gptsovits-sword-poet",
        "gender": "male",
        "category": "youngMale",
        "categoryLabel": "纵酒剑仙",
        "repo": "RVC-Boss/GPT-SoVITS",
        "modelTech": "GPT-SoVITS · Few-Shot Clone",
        "archetype": "纵酒长歌 · 豪迈洒脱青莲剑仙",
        "tags": ["GPT-SoVITS", "声音克隆", "剑仙诗酒", "豪放不羁"],
        "styles": ["cheerful", "chat"],
        "defaultRate": "+1%",
        "defaultPitch": "-1%",
        "sampleText": "大鹏一日同风起，扶摇直上九万里！小友，且饮了这盏浊酒，看我一剑破千军！",
    },
    {
        "id": "github-gptsovits-daoboy",
        "name": "GPT-SoVITS·软萌小道童",
        "fullName": "gptsovits-daoist-boy",
        "gender": "male",
        "category": "child",
        "categoryLabel": "机敏道童",
        "repo": "RVC-Boss/GPT-SoVITS",
        "modelTech": "GPT-SoVITS · Voice Design",
        "archetype": "天真烂漫 · 仙山炼丹纯真道童",
        "tags": ["GPT-SoVITS", "软萌仙童", "修仙道童", "少儿童音"],
        "styles": ["cheerful"],
        "defaultRate": "+4%",
        "defaultPitch": "+15%",
        "sampleText": "师傅闭关前交代过了，今日开炉炼造凝气丹，谁要是敢偷懒，就罚抄道德经一百遍！",
    },
    {
        "id": "github-fish-broadcast",
        "name": "Fish·电台超清演播",
        "fullName": "fishaudio-speech-broadcast",
        "gender": "male",
        "category": "narrator",
        "categoryLabel": "超清电台",
        "repo": "fishaudio/fish-speech",
        "modelTech": "Fish-Speech · Autoregressive Dual-Token",
        "archetype": "广播剧质感 · 磁性温润电影级旁白",
        "tags": ["Fish-Speech", "自回归TTS", "广播剧", "高保真音频"],
        "styles": ["narration-relaxed", "gentle"],
        "defaultRate": "-1%",
        "defaultPitch": "-2%",
        "sampleText": "这里是夜航电台。在这个寂静的深夜，愿这段故事能够陪伴每一位尚未入眠的行者。",
    },
]

GITHUB_AI_VOICE_MAP: dict[str, dict[str, Any]] = {item["id"]: item for item in GITHUB_AI_VOICE_CATALOG}

# Curated AI Manga / Comic Drama Voice Catalog covering all age groups (3-100+ years)
AI_MANGA_VOICE_CATALOG: list[dict[str, Any]] = [
    # 1. 漫剧全知/高燃解说旁白 (All-Ages Narrative)
    {
        "id": "zh-CN-YunxiNeural",
        "name": "云希 · 漫剧全知史诗旁白",
        "fullName": "zh-CN-YunxiNeural",
        "gender": "male",
        "ageGroup": "adult",
        "ageBand": "全知旁白",
        "category": "narrator",
        "categoryLabel": "漫剧主线旁白",
        "series": "主线叙事",
        "archetype": "电影质感 · 宏大沉浸短剧与漫剧解说",
        "tags": ["AI漫剧热播", "霸榜男主讲", "男低音", "沉稳史诗"],
        "styles": ["narration-relaxed", "serious"],
        "defaultRate": "-2%",
        "defaultPitch": "-4%",
        "sampleText": "天道崩塌，诸神陨落。少年从深渊中爬出，手中那柄残破断剑，正发出嗜血的低鸣！",
    },
    {
        "id": "zh-CN-YunjianNeural",
        "name": "云健 · 漫剧高能卡点解说",
        "fullName": "zh-CN-YunjianNeural",
        "gender": "male",
        "ageGroup": "adult",
        "ageBand": "高能爆点",
        "category": "narrator",
        "categoryLabel": "高能打脸解说",
        "series": "主线叙事",
        "archetype": "高燃快节奏 · 短剧反转爆点演播",
        "tags": ["爆款短剧", "逆袭打脸", "高能卡点", "节奏拉满"],
        "styles": ["sports-commentary", "cheerful"],
        "defaultRate": "+4%",
        "defaultPitch": "-2%",
        "sampleText": "注意看，这个男人叫龙傲天！三年前被家族逐出山门，三年后携万千战神强势归来！",
    },
    {
        "id": "zh-CN-XiaoxiaoNeural",
        "name": "晓晓 · 唯美言情漫剧旁白",
        "fullName": "zh-CN-XiaoxiaoNeural",
        "gender": "female",
        "ageGroup": "adult",
        "ageBand": "言情唯美",
        "category": "narrator",
        "categoryLabel": "甜宠言情旁白",
        "series": "主线叙事",
        "archetype": "温婉动人 · 穿越重生唯美叙事",
        "tags": ["言情漫剧", "古风穿越", "娓娓道来", "情感治愈"],
        "styles": ["gentle", "narration-relaxed"],
        "defaultRate": "+0%",
        "defaultPitch": "+2%",
        "sampleText": "那一世桃花树下的回眸，成了她此后三百年万劫不复的执念。",
    },

    # 2. 幼年/童年/萌宝灵宠 (Child & Mascot, 3~12岁)
    {
        "id": "zh-CN-XiaoyouNeural",
        "name": "晓悠 · 软萌奶气小千金",
        "fullName": "zh-CN-XiaoyouNeural",
        "gender": "female",
        "ageGroup": "child",
        "ageBand": "3~8岁 幼童",
        "category": "child",
        "categoryLabel": "奶气萌宝 (3-8岁)",
        "series": "萌宝团宠",
        "archetype": "奶团子 · 萌翻全场的团宠小千金",
        "tags": ["萌宝漫剧", "团宠小千金", "奶声奶气", "治愈萌系"],
        "styles": ["cheerful", "gentle"],
        "defaultRate": "+2%",
        "defaultPitch": "+25%",
        "sampleText": "爹爹抱抱！娘亲说了，今天要是爹爹不亲小宝一口，小宝就不吃糖葫芦啦！",
    },
    {
        "id": "zh-CN-YunxiaNeural",
        "name": "云夏 · 淘气机敏小正太",
        "fullName": "zh-CN-YunxiaNeural",
        "gender": "male",
        "ageGroup": "child",
        "ageBand": "6~12岁 正太",
        "category": "child",
        "categoryLabel": "机敏正太 (6-12岁)",
        "series": "萌宝团宠",
        "archetype": "机敏小道童 · 捉狭捣蛋天才少爷",
        "tags": ["淘气小少爷", "天才神童", "童真活力"],
        "styles": ["cheerful"],
        "defaultRate": "+4%",
        "defaultPitch": "+20%",
        "sampleText": "略略略！大笨蛋坏叔叔，你以为布个烂阵法就能困住本少爷吗？看我的破天符！",
    },
    {
        "id": "github-alexandria-foxjunior",
        "name": "灵狐小师妹 · 傲娇撒娇仙宠",
        "fullName": "alexandria-qwen3-foxjunior",
        "gender": "female",
        "ageGroup": "child",
        "ageBand": "灵兽萌宠",
        "category": "child",
        "categoryLabel": "化形仙宠",
        "series": "萌宝团宠",
        "archetype": "娇憨灵狐 · 贪吃粘人的化形仙宠",
        "tags": ["仙侠灵宠", "萌系化形", "娇憨软糯"],
        "styles": ["cheerful", "chat"],
        "defaultRate": "+4%",
        "defaultPitch": "+28%",
        "sampleText": "主人主人！储物袋里的九转灵丹被我当糖豆吃完了，呜呜，不要打尾巴嘛！",
    },

    # 3. 少年意气/宗门逆袭期 (Youth, 13~18岁)
    {
        "id": "zh-CN-YunjieNeural",
        "name": "云杰 · 热血少年漫逆袭男主",
        "fullName": "zh-CN-YunjieNeural",
        "gender": "male",
        "ageGroup": "young",
        "ageBand": "14~18岁 少年",
        "category": "youngMale",
        "categoryLabel": "热血少侠 (14-18岁)",
        "series": "修真逆袭",
        "archetype": "三十年河东 · 逆天不屈少年意气",
        "tags": ["爆燃主角", "少年漫主役", "绝不认输", "废柴逆袭"],
        "styles": ["chat", "angry", "cheerful"],
        "defaultRate": "+2%",
        "defaultPitch": "+0%",
        "sampleText": "你们骂我是不能聚气的废柴？睁大眼睛看清楚，今天破开这天地神劫的，就是我！",
    },
    {
        "id": "zh-CN-XiaochenNeural",
        "name": "晓辰 · 阳光洒脱小师弟",
        "fullName": "zh-CN-XiaochenNeural",
        "gender": "male",
        "ageGroup": "young",
        "ageBand": "15~18岁 少年",
        "category": "youngMale",
        "categoryLabel": "阳光元气 (15-18岁)",
        "series": "修真逆袭",
        "archetype": "鲜衣怒马 · 仗剑走天涯元气少年",
        "tags": ["阳光正直", "快意恩仇", "仗义热忱"],
        "styles": ["chat", "cheerful"],
        "defaultRate": "+3%",
        "defaultPitch": "+2%",
        "sampleText": "喂，师姐！下山捉妖这么好玩的事儿，你竟然想抛下我偷偷去？等等我！",
    },
    {
        "id": "zh-CN-XiaoshuangNeural",
        "name": "晓双 · 娇俏天真小师妹",
        "fullName": "zh-CN-XiaoshuangNeural",
        "gender": "female",
        "ageGroup": "young",
        "ageBand": "14~17岁 少女",
        "category": "youngFemale",
        "categoryLabel": "灵俏师妹 (14-17岁)",
        "series": "甜宠言情",
        "archetype": "甜度拉满 · 活泼灵动宗门小师妹",
        "tags": ["娇憨甜妹", "宗门团宠", "天真浪漫"],
        "styles": ["cheerful"],
        "defaultRate": "+4%",
        "defaultPitch": "+18%",
        "sampleText": "师兄，你看后山的灵桃熟透啦，我们去偷摘几个烤着吃好不好？师傅发现了我顶着！",
    },
    {
        "id": "zh-CN-XiaoyiNeural",
        "name": "晓伊 · 傲娇毒舌千金青梅",
        "fullName": "zh-CN-XiaoyiNeural",
        "gender": "female",
        "ageGroup": "young",
        "ageBand": "15~18岁 少女",
        "category": "youngFemale",
        "categoryLabel": "傲娇青梅 (15-18岁)",
        "series": "甜宠言情",
        "archetype": "口是心非 · 刀子嘴豆腐心傲娇少女",
        "tags": ["傲娇青梅", "口嫌体正直", "俏皮清脆"],
        "styles": ["chat", "angry", "cheerful"],
        "defaultRate": "+4%",
        "defaultPitch": "+15%",
        "sampleText": "谁、谁特意为你求的平安符了？这只是路边算命摊买一送一顺带拿的，不要就扔掉！",
    },

    # 4. 青年主役/仙尊/霸总/神女 (Young Adult, 19~28岁)
    {
        "id": "zh-CN-YunyeNeural",
        "name": "云野 · 孤傲冷酷霸总/魔皇仙尊",
        "fullName": "zh-CN-YunyeNeural",
        "gender": "male",
        "ageGroup": "adult",
        "ageBand": "22~28岁 青年",
        "category": "mature",
        "categoryLabel": "高冷霸总/仙尊 (22-28岁)",
        "series": "战神霸总",
        "archetype": "磁性低音炮 · 杀伐果断禁欲帝尊与总裁",
        "tags": ["磁性低音炮", "帝尊霸总", "极度危险", "唯我独尊"],
        "styles": ["serious", "angry"],
        "defaultRate": "-2%",
        "defaultPitch": "-8%",
        "sampleText": "跪下。这世间敢直视本座双眼的人，除了你，其余都已经化作了黄土。",
    },
    {
        "id": "zh-CN-YunfengNeural",
        "name": "云枫 · 白月光儒雅公子",
        "fullName": "zh-CN-YunfengNeural",
        "gender": "male",
        "ageGroup": "young",
        "ageBand": "20~25岁 青年",
        "category": "youngMale",
        "categoryLabel": "温润白月光 (20-25岁)",
        "series": "甜宠言情",
        "archetype": "君子如玉 · 温柔深情守候者",
        "tags": ["白月光男二", "温润如玉", "深情治愈"],
        "styles": ["gentle", "chat"],
        "defaultRate": "-1%",
        "defaultPitch": "+0%",
        "sampleText": "阿阮，若这天下容不下你，我便陪你弃了这仙道，浪迹山水，共度余生。",
    },
    {
        "id": "github-gptsovits-swordpoet",
        "name": "青莲剑仙 · 纵酒狂傲剑仙",
        "fullName": "gptsovits-sword-poet",
        "gender": "male",
        "ageGroup": "young",
        "ageBand": "20~26岁 青年",
        "category": "youngMale",
        "categoryLabel": "狂傲剑客 (20-26岁)",
        "series": "修真逆袭",
        "archetype": "不羁浪子 · 诗剑双绝天下无双",
        "tags": ["狂傲男主", "剑仙诗酒", "大鹏同风"],
        "styles": ["cheerful", "chat"],
        "defaultRate": "+1%",
        "defaultPitch": "-2%",
        "sampleText": "天不生我李长歌，剑道万古如长夜！诸位贼子，可接得下我这一剑开天门？！",
    },
    {
        "id": "zh-CN-XiaomengNeural",
        "name": "晓梦 · 清冷出尘神女/冰山师尊",
        "fullName": "zh-CN-XiaomengNeural",
        "gender": "female",
        "ageGroup": "young",
        "ageBand": "20~25岁 青年",
        "category": "youngFemale",
        "categoryLabel": "清冷神女 (20-25岁)",
        "series": "修真逆袭",
        "archetype": "高岭之花 · 太上忘情绝色师尊",
        "tags": ["冰山美人", "绝色神女", "清冷空灵"],
        "styles": ["whispering", "gentle", "serious"],
        "defaultRate": "-1%",
        "defaultPitch": "+10%",
        "sampleText": "修仙者当斩断凡尘情丝。你口中所谓的喜欢，不过是心魔作祟罢了。",
    },
    {
        "id": "zh-CN-XiaorouNeural",
        "name": "晓柔 · 凄美深情/虐恋千金女主",
        "fullName": "zh-CN-XiaorouNeural",
        "gender": "female",
        "ageGroup": "young",
        "ageBand": "18~24岁 青年",
        "category": "youngFemale",
        "categoryLabel": "凄美千金 (18-24岁)",
        "series": "甜宠言情",
        "archetype": "我见犹怜 · 虐恋情深惹人落泪",
        "tags": ["虐恋悲情", "柔弱惹怜", "声线动情"],
        "styles": ["sad", "gentle", "fearful"],
        "defaultRate": "-3%",
        "defaultPitch": "+8%",
        "sampleText": "如果剜去这颗玲珑心能换你此生安宁，那这条命……你拿去便是。",
    },
    {
        "id": "zh-CN-XiaoxuanNeural",
        "name": "晓萱 · 飒爽独立/大女主反杀",
        "fullName": "zh-CN-XiaoxuanNeural",
        "gender": "female",
        "ageGroup": "young",
        "ageBand": "22~26岁 青年",
        "category": "youngFemale",
        "categoryLabel": "飒爽大女主 (22-26岁)",
        "series": "战神霸总",
        "archetype": "干练果决 · 智商在线绝地反杀",
        "tags": ["大女主题材", "双商在线", "反杀打脸"],
        "styles": ["serious", "chat", "cheerful"],
        "defaultRate": "+2%",
        "defaultPitch": "+5%",
        "sampleText": "收起你那套恩赐的嘴脸！今日不是你们霍家休我，而是我陆昭华，休了你！",
    },
    {
        "id": "zh-CN-XiaohanNeural",
        "name": "晓涵 · 心机绿茶/两面三刀女配",
        "fullName": "zh-CN-XiaohanNeural",
        "gender": "female",
        "ageGroup": "young",
        "ageBand": "19~24岁 青年",
        "category": "youngFemale",
        "categoryLabel": "心机女配 (19-24岁)",
        "series": "主线叙事",
        "archetype": "两面三刀 · 娇滴滴陷害原女主",
        "tags": ["茶艺大师", "漫剧反转", "心机做作"],
        "styles": ["gentle", "fearful"],
        "defaultRate": "+2%",
        "defaultPitch": "+12%",
        "sampleText": "王爷别怪姐姐……都是臣妾不好，不该惹姐姐生气，姐姐推我下水一定不是故意的，咳咳……",
    },

    # 5. 成熟中生/掌门/主母/将领 (Mature, 30~50岁)
    {
        "id": "zh-CN-YunhaiNeural",
        "name": "云海 · 威严掌门/仙宗巨擘",
        "fullName": "zh-CN-YunhaiNeural",
        "gender": "male",
        "ageGroup": "adult",
        "ageBand": "40~55岁 中年",
        "category": "mature",
        "categoryLabel": "仙门至尊 (40-55岁)",
        "series": "修真逆袭",
        "archetype": "定海神针 · 威震八荒不怒自威",
        "tags": ["仙门宗主", "浩然正气", "沉稳威严"],
        "styles": ["serious", "narration-relaxed"],
        "defaultRate": "-2%",
        "defaultPitch": "-6%",
        "sampleText": "今日老夫在此，谁敢伤我玄天宗弟子一人，老夫便荡平他九族满门！",
    },
    {
        "id": "github-cosyvoice-foxempress",
        "name": "天狐御姐 · 妖皇女帝/霸气主母",
        "fullName": "funaudio-cosyvoice-foxempress",
        "gender": "female",
        "ageGroup": "adult",
        "ageBand": "30~40岁 中年",
        "category": "mature",
        "categoryLabel": "霸气御姐 (30-40岁)",
        "series": "战神霸总",
        "archetype": "绝世风华 · 算无遗策翻手为云",
        "tags": ["妖族女帝", "气场两米八", "狂拽御姐"],
        "styles": ["serious", "calm"],
        "defaultRate": "-2%",
        "defaultPitch": "-4%",
        "sampleText": "普天之下莫非王土，本座看上的人，阎王来了也休想带走半步！",
    },
    {
        "id": "zh-CN-XiaozhenNeural",
        "name": "晓甄 · 豪门掌权主母/皇后",
        "fullName": "zh-CN-XiaozhenNeural",
        "gender": "female",
        "ageGroup": "adult",
        "ageBand": "38~50岁 中年",
        "category": "mature",
        "categoryLabel": "豪门主母 (38-50岁)",
        "series": "战神霸总",
        "archetype": "深沉老练 · 家族掌舵人",
        "tags": ["豪门恩怨", "端庄心机", "母仪天下"],
        "styles": ["narration-relaxed", "gentle"],
        "defaultRate": "-3%",
        "defaultPitch": "-2%",
        "sampleText": "在这霍家大院里，没有规矩不成方圆。来人，掌嘴三十，让她长长记性！",
    },
    {
        "id": "zh-CN-XiaoyanNeural",
        "name": "晓颜 · 慈爱温厚师母/长辈",
        "fullName": "zh-CN-XiaoyanNeural",
        "gender": "female",
        "ageGroup": "adult",
        "ageBand": "40~55岁 中年",
        "category": "mature",
        "categoryLabel": "慈爱长辈 (40-55岁)",
        "series": "甜宠言情",
        "archetype": "温婉贤淑 · 默默守护的慈母师娘",
        "tags": ["慈母长辈", "温情治愈", "亲切温厚"],
        "styles": ["customerservice", "gentle"],
        "defaultRate": "-1%",
        "defaultPitch": "+2%",
        "sampleText": "好孩子，受委屈了吧？快把这参汤喝了，万事有师娘替你做主。",
    },

    # 6. 沧桑长者/神僧/魔尊幕后 (Elder / Villain, 60~100+岁)
    {
        "id": "github-cosyvoice-zenmonk",
        "name": "扫地神僧 · 绝世隐世老仙翁",
        "fullName": "funaudio-cosyvoice-zenmonk",
        "gender": "male",
        "ageGroup": "elder",
        "ageBand": "70~90岁 长者",
        "category": "elderVillain",
        "categoryLabel": "隐世神僧 (70-90岁)",
        "series": "修真逆袭",
        "archetype": "暮鼓晨钟 · 看透红尘世外高人",
        "tags": ["扫地僧", "深不可测", "世外高人"],
        "styles": ["serious", "gentle"],
        "defaultRate": "-5%",
        "defaultPitch": "-16%",
        "sampleText": "施主，执念已深，何苦执迷不悟？放下屠刀，方知天地之大。",
    },
    {
        "id": "zh-CN-YunzeNeural",
        "name": "云泽 · 枯骨魔尊/幕后大反派",
        "fullName": "zh-CN-YunzeNeural",
        "gender": "male",
        "ageGroup": "elder",
        "ageBand": "60~80岁 长者",
        "category": "elderVillain",
        "categoryLabel": "阴鸷魔尊 (60-80岁)",
        "series": "修真逆袭",
        "archetype": "桀骜阴森 · 漫剧终极黑手",
        "tags": ["终极大Boss", "桀桀怪笑", "极度压迫"],
        "styles": ["serious", "angry", "depressed"],
        "defaultRate": "-6%",
        "defaultPitch": "-18%",
        "sampleText": "桀桀桀……小家伙，你以为你拼死找到的藏宝图，不是本尊三十年前故意留给你的饵吗？",
    },
    {
        "id": "zh-CN-XiaomoNeural",
        "name": "晓墨 · 恶毒刁钻老妪/鬼婆",
        "fullName": "zh-CN-XiaomoNeural",
        "gender": "female",
        "ageGroup": "elder",
        "ageBand": "60~75岁 长者",
        "category": "elderVillain",
        "categoryLabel": "恶毒老妪 (60-75岁)",
        "series": "战神霸总",
        "archetype": "尖酸刻薄 · 阴冷诡谲恶毒老妇",
        "tags": ["恶毒嬷嬷", "阴鸷诡谲", "反派女巫"],
        "styles": ["serious", "angry", "whispering"],
        "defaultRate": "-4%",
        "defaultPitch": "-12%",
        "sampleText": "老身侍奉过三代先帝，什么样的硬骨头没见过？把十指拶子拿上来，老身亲自伺候姑娘！",
    },
]

AI_MANGA_VOICE_MAP: dict[str, dict[str, Any]] = {item["id"]: item for item in AI_MANGA_VOICE_CATALOG}

# Quick Lookup Map for catalog items
MS_VOICE_MAP: dict[str, dict[str, Any]] = {item["id"]: item for item in MS_VOICE_CATALOG}

# Categorized Tree definition
MS_VOICE_TREE: dict[str, dict[str, Any]] = {
    "narrator": {
        "key": "narrator",
        "label": "旁白演播",
        "description": "沉稳、典雅、激昂，适合小说章节主讲与背景渲染",
        "voices": [v for v in MS_VOICE_CATALOG if v["category"] == "narrator"],
    },
    "youngMale": {
        "key": "youngMale",
        "label": "青年男主",
        "description": "热血少年、温润书生、阳光青年，主角首选",
        "voices": [v for v in MS_VOICE_CATALOG if v["category"] == "youngMale"],
    },
    "youngFemale": {
        "key": "youngFemale",
        "label": "青年女主",
        "description": "出尘清纯、活泼灵动、娇俏可爱，女性主角与重要配角首选",
        "voices": [v for v in MS_VOICE_CATALOG if v["category"] == "youngFemale"],
    },
    "mature": {
        "key": "mature",
        "label": "成熟中生",
        "description": "宗师掌门、威严将领、冷静御姐、温厚长辈",
        "voices": [v for v in MS_VOICE_CATALOG if v["category"] == "mature"],
    },
    "elderVillain": {
        "key": "elderVillain",
        "label": "长者反派",
        "description": "沧桑老者、邪派宿敌、阴沉幕后黑手",
        "voices": [v for v in MS_VOICE_CATALOG if v["category"] == "elderVillain"],
    },
    "child": {
        "key": "child",
        "label": "少儿童声",
        "description": "机敏童子、纯真萝莉、可爱灵兽童音",
        "voices": [v for v in MS_VOICE_CATALOG if v["category"] == "child"],
    },
    "dialect": {
        "key": "dialect",
        "label": "方言特色",
        "description": "陕西、东北、四川、山东、粤语、台湾风情",
        "voices": [v for v in MS_VOICE_CATALOG if v["category"] == "dialect"],
    },
}

# Pre-packaged Classic Novel Character Voice Schemes
BUILTIN_VOICE_SCHEMES: dict[str, dict[str, Any]] = {
    "aimanga_universe": {
        "id": "aimanga_universe",
        "name": "🎬 AI 漫剧 · 全年龄全系通配版",
        "description": "短剧/动态漫黄金配置，覆盖全知旁白、高燃逆袭少侠、高冷神女仙尊、威严帝尊、桀骜老魔、软萌团宠千金",
        "characters": {
            "旁白": {
                "voice_name": "zh-CN-YunxiNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "narrator",
                "base_style": "narration-relaxed",
                "rate_offset": "-2%",
                "pitch_offset": "-4%",
                "category": "narrator",
                "display_name": "云希 · 史诗旁白",
            },
            "逆袭少侠": {
                "voice_name": "zh-CN-YunjieNeural",
                "gender": "male",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "chat",
                "rate_offset": "+2%",
                "pitch_offset": "+0%",
                "category": "youngMale",
                "display_name": "云杰 · 热血少年",
            },
            "冰山神女": {
                "voice_name": "zh-CN-XiaomengNeural",
                "gender": "female",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "gentle",
                "rate_offset": "+0%",
                "pitch_offset": "+10%",
                "category": "youngFemale",
                "display_name": "晓梦 · 清冷神女",
            },
            "磁性帝尊": {
                "voice_name": "zh-CN-YunyeNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "supporting",
                "base_style": "serious",
                "rate_offset": "-2%",
                "pitch_offset": "-8%",
                "category": "mature",
                "display_name": "云野 · 磁性霸总/仙尊",
            },
            "枯骨魔尊": {
                "voice_name": "zh-CN-YunzeNeural",
                "gender": "male",
                "age_group": "elder",
                "role": "villain",
                "base_style": "serious",
                "rate_offset": "-6%",
                "pitch_offset": "-18%",
                "category": "elderVillain",
                "display_name": "云泽 · 阴鸷老魔",
            },
            "软萌千金": {
                "voice_name": "zh-CN-XiaoyouNeural",
                "gender": "female",
                "age_group": "child",
                "role": "supporting",
                "base_style": "cheerful",
                "rate_offset": "+2%",
                "pitch_offset": "+25%",
                "category": "child",
                "display_name": "晓悠 · 奶气萌宝",
            },
        },
    },
    "aimanga_cultivation": {
        "id": "aimanga_cultivation",
        "name": "⚔️ AI 漫剧 · 玄幻修真宗门逆袭树",
        "description": "热血爆燃男主、高冷清丽师尊、威严仙门宗主、阴鸷枯骨魔尊、淘气炼丹道童",
        "characters": {
            "旁白": {
                "voice_name": "zh-CN-YunxiNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "narrator",
                "base_style": "narration-relaxed",
                "rate_offset": "-2%",
                "pitch_offset": "-6%",
                "category": "narrator",
                "display_name": "修真宏大旁白",
            },
            "男主角": {
                "voice_name": "zh-CN-YunjieNeural",
                "gender": "male",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "chat",
                "rate_offset": "+3%",
                "pitch_offset": "+0%",
                "category": "youngMale",
                "display_name": "逆天少侠",
            },
            "女主角": {
                "voice_name": "zh-CN-XiaomengNeural",
                "gender": "female",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "whispering",
                "rate_offset": "-1%",
                "pitch_offset": "+10%",
                "category": "youngFemale",
                "display_name": "清冷师尊",
            },
            "威严掌门": {
                "voice_name": "zh-CN-YunhaiNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "supporting",
                "base_style": "serious",
                "rate_offset": "-2%",
                "pitch_offset": "-6%",
                "category": "mature",
                "display_name": "宗门巨擘",
            },
            "反派魔尊": {
                "voice_name": "zh-CN-YunzeNeural",
                "gender": "male",
                "age_group": "elder",
                "role": "villain",
                "base_style": "serious",
                "rate_offset": "-6%",
                "pitch_offset": "-18%",
                "category": "elderVillain",
                "display_name": "九幽老怪",
            },
            "少儿童子": {
                "voice_name": "zh-CN-YunxiaNeural",
                "gender": "male",
                "age_group": "child",
                "role": "supporting",
                "base_style": "cheerful",
                "rate_offset": "+4%",
                "pitch_offset": "+20%",
                "category": "child",
                "display_name": "机敏小道童",
            },
        },
    },
    "aimanga_urban_ceo": {
        "id": "aimanga_urban_ceo",
        "name": "👑 AI 漫剧 · 战神霸总与赘婿反转树",
        "description": "快节奏反转解说、低音炮禁欲霸总、飒爽反杀大女主、心机豪门主母、恶毒刁钻老妪",
        "characters": {
            "高能解说": {
                "voice_name": "zh-CN-YunjianNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "narrator",
                "base_style": "sports-commentary",
                "rate_offset": "+4%",
                "pitch_offset": "-2%",
                "category": "narrator",
                "display_name": "卡点高燃解说",
            },
            "战神霸总": {
                "voice_name": "zh-CN-YunyeNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "protagonist",
                "base_style": "serious",
                "rate_offset": "-2%",
                "pitch_offset": "-8%",
                "category": "mature",
                "display_name": "低音炮战神",
            },
            "飒爽女主": {
                "voice_name": "zh-CN-XiaoxuanNeural",
                "gender": "female",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "serious",
                "rate_offset": "+2%",
                "pitch_offset": "+5%",
                "category": "youngFemale",
                "display_name": "反杀大女主",
            },
            "豪门主母": {
                "voice_name": "zh-CN-XiaozhenNeural",
                "gender": "female",
                "age_group": "adult",
                "role": "supporting",
                "base_style": "gentle",
                "rate_offset": "-2%",
                "pitch_offset": "-2%",
                "category": "mature",
                "display_name": "深沉掌权夫人",
            },
            "恶毒老妇": {
                "voice_name": "zh-CN-XiaomoNeural",
                "gender": "female",
                "age_group": "elder",
                "role": "villain",
                "base_style": "serious",
                "rate_offset": "-4%",
                "pitch_offset": "-12%",
                "category": "elderVillain",
                "display_name": "刁钻恶毒老妪",
            },
            "团宠千金": {
                "voice_name": "zh-CN-XiaoyouNeural",
                "gender": "female",
                "age_group": "child",
                "role": "supporting",
                "base_style": "cheerful",
                "rate_offset": "+2%",
                "pitch_offset": "+25%",
                "category": "child",
                "display_name": "奶气小千金",
            },
        },
    },
    "aimanga_rebirth_romance": {
        "id": "aimanga_rebirth_romance",
        "name": "🌸 AI 漫剧 · 古风重生虐恋甜宠树",
        "description": "唯美言情旁白、温润白月光公子、凄美虐恋女主、慈爱师娘、娇俏小师妹",
        "characters": {
            "旁白": {
                "voice_name": "zh-CN-XiaoxiaoNeural",
                "gender": "female",
                "age_group": "adult",
                "role": "narrator",
                "base_style": "gentle",
                "rate_offset": "+0%",
                "pitch_offset": "+2%",
                "category": "narrator",
                "display_name": "唯美言情旁白",
            },
            "男主角": {
                "voice_name": "zh-CN-YunfengNeural",
                "gender": "male",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "gentle",
                "rate_offset": "-1%",
                "pitch_offset": "+0%",
                "category": "youngMale",
                "display_name": "温润白月光",
            },
            "女主角": {
                "voice_name": "zh-CN-XiaorouNeural",
                "gender": "female",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "sad",
                "rate_offset": "-2%",
                "pitch_offset": "+8%",
                "category": "youngFemale",
                "display_name": "凄美千金",
            },
            "慈爱师娘": {
                "voice_name": "zh-CN-XiaoyanNeural",
                "gender": "female",
                "age_group": "adult",
                "role": "supporting",
                "base_style": "gentle",
                "rate_offset": "-1%",
                "pitch_offset": "+2%",
                "category": "mature",
                "display_name": "温厚长辈",
            },
            "恶毒嬷嬷": {
                "voice_name": "zh-CN-XiaomoNeural",
                "gender": "female",
                "age_group": "elder",
                "role": "villain",
                "base_style": "whispering",
                "rate_offset": "-4%",
                "pitch_offset": "-12%",
                "category": "elderVillain",
                "display_name": "阴鸷恶仆",
            },
            "娇俏师妹": {
                "voice_name": "zh-CN-XiaoshuangNeural",
                "gender": "female",
                "age_group": "young",
                "role": "supporting",
                "base_style": "cheerful",
                "rate_offset": "+4%",
                "pitch_offset": "+18%",
                "category": "child",
                "display_name": "活泼小师妹",
            },
        },
    },
    "azure_official_full": {
        "id": "azure_official_full",
        "name": "Azure 官方全景角色语音树",
        "description": "微软全量 Neural 演播库精调，覆盖 22 位小说原型角色，无需试听全量即用",
        "characters": {
            "旁白": {
                "voice_name": "zh-CN-YunxiNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "narrator",
                "base_style": "narration-relaxed",
                "rate_offset": "-2%",
                "pitch_offset": "-2%",
                "category": "narrator",
                "display_name": "沉稳演播旁白",
            },
            "青年男主": {
                "voice_name": "zh-CN-YunjieNeural",
                "gender": "male",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "chat",
                "rate_offset": "+2%",
                "pitch_offset": "+0%",
                "category": "youngMale",
                "display_name": "热血少侠",
            },
            "青年女主": {
                "voice_name": "zh-CN-XiaohanNeural",
                "gender": "female",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "gentle",
                "rate_offset": "+2%",
                "pitch_offset": "+4%",
                "category": "youngFemale",
                "display_name": "柔情佳人",
            },
            "成熟中生": {
                "voice_name": "zh-CN-YunyeNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "supporting",
                "base_style": "serious",
                "rate_offset": "-2%",
                "pitch_offset": "-2%",
                "category": "mature",
                "display_name": "威严宗师",
            },
            "长者反派": {
                "voice_name": "zh-CN-YunzeNeural",
                "gender": "male",
                "age_group": "elder",
                "role": "villain",
                "base_style": "serious",
                "rate_offset": "-6%",
                "pitch_offset": "-8%",
                "category": "elderVillain",
                "display_name": "绝世宿敌",
            },
            "少儿童声": {
                "voice_name": "zh-CN-YunxiaNeural",
                "gender": "male",
                "age_group": "child",
                "role": "supporting",
                "base_style": "cheerful",
                "rate_offset": "+4%",
                "pitch_offset": "+8%",
                "category": "child",
                "display_name": "机敏童子",
            },
        },
    },
    "alexandria_qwen3": {
        "id": "alexandria_qwen3",
        "name": "Alexandria · Qwen3-TTS 评书演播树",
        "description": "GitHub Alexandria 8B 评书大宗师、剑宗少侠、望舒仙子、九幽魔皇",
        "characters": {
            "旁白": {
                "voice_name": "github-alexandria-storyteller",
                "gender": "male",
                "age_group": "adult",
                "role": "narrator",
                "base_style": "narration-relaxed",
                "rate_offset": "-2%",
                "pitch_offset": "-3%",
                "category": "narrator",
                "display_name": "评书大宗师",
            },
            "剑宗少侠": {
                "voice_name": "github-alexandria-swordmaster",
                "gender": "male",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "chat",
                "rate_offset": "+2%",
                "pitch_offset": "+0%",
                "category": "youngMale",
                "display_name": "鲜衣怒马少侠",
            },
            "望舒仙子": {
                "voice_name": "github-alexandria-fairywangshu",
                "gender": "female",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "gentle",
                "rate_offset": "-2%",
                "pitch_offset": "+6%",
                "category": "youngFemale",
                "display_name": "清冷空灵仙子",
            },
            "九幽魔皇": {
                "voice_name": "github-alexandria-demonlord",
                "gender": "male",
                "age_group": "elder",
                "role": "villain",
                "base_style": "serious",
                "rate_offset": "-6%",
                "pitch_offset": "-9%",
                "category": "elderVillain",
                "display_name": "九幽魔皇",
            },
            "灵狐小师妹": {
                "voice_name": "github-alexandria-foxjunior",
                "gender": "female",
                "age_group": "child",
                "role": "supporting",
                "base_style": "cheerful",
                "rate_offset": "+4%",
                "pitch_offset": "+14%",
                "category": "child",
                "display_name": "娇憨灵宠",
            },
        },
    },
    "cosyvoice_universe": {
        "id": "cosyvoice_universe",
        "name": "CosyVoice · 国漫大世界配音树",
        "description": "GitHub CosyVoice-300M 自然文学演播、热血国漫少侠、天狐御姐、扫地神僧",
        "characters": {
            "旁白": {
                "voice_name": "github-cosyvoice-narrator",
                "gender": "male",
                "age_group": "adult",
                "role": "narrator",
                "base_style": "narration-relaxed",
                "rate_offset": "-1%",
                "pitch_offset": "-2%",
                "category": "narrator",
                "display_name": "自然文学演播",
            },
            "热血少侠": {
                "voice_name": "github-cosyvoice-hotblood",
                "gender": "male",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "chat",
                "rate_offset": "+3%",
                "pitch_offset": "+1%",
                "category": "youngMale",
                "display_name": "国漫热血主角",
            },
            "天狐御姐": {
                "voice_name": "github-cosyvoice-foxempress",
                "gender": "female",
                "age_group": "adult",
                "role": "supporting",
                "base_style": "serious",
                "rate_offset": "-2%",
                "pitch_offset": "-2%",
                "category": "mature",
                "display_name": "魅惑妖族女帝",
            },
            "扫地老僧": {
                "voice_name": "github-cosyvoice-zenmonk",
                "gender": "male",
                "age_group": "elder",
                "role": "supporting",
                "base_style": "serious",
                "rate_offset": "-5%",
                "pitch_offset": "-8%",
                "category": "elderVillain",
                "display_name": "得道少林神僧",
            },
        },
    },
    "chattts_dialogue": {
        "id": "chattts_dialogue",
        "name": "ChatTTS · 市井江湖对话对白树",
        "description": "GitHub ChatTTS 极富口语呼吸感与笑叹断句的拟真对白、茶馆说书人",
        "characters": {
            "茶馆说书人": {
                "voice_name": "github-chattts-teahouse",
                "gender": "male",
                "age_group": "adult",
                "role": "narrator",
                "base_style": "chat",
                "rate_offset": "+0%",
                "pitch_offset": "-1%",
                "category": "narrator",
                "display_name": "市井茶馆说书",
            },
            "随性青年": {
                "voice_name": "github-chattts-urbanmale",
                "gender": "male",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "chat",
                "rate_offset": "+2%",
                "pitch_offset": "+0%",
                "category": "youngMale",
                "display_name": "松弛随性青年",
            },
            "灵动少女": {
                "voice_name": "github-chattts-livelygirl",
                "gender": "female",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "cheerful",
                "rate_offset": "+3%",
                "pitch_offset": "+6%",
                "category": "youngFemale",
                "display_name": "轻笑灵动少女",
            },
        },
    },
    "f5_scifi": {
        "id": "f5_scifi",
        "name": "F5-TTS · 赛博科幻与未来史诗树",
        "description": "GitHub F5-TTS 星际编年史宏大叙事、赛博特勤冷冽音、暗夜宿敌",
        "characters": {
            "星际编年史": {
                "voice_name": "github-f5-epicchronicle",
                "gender": "male",
                "age_group": "adult",
                "role": "narrator",
                "base_style": "narration-relaxed",
                "rate_offset": "-3%",
                "pitch_offset": "-3%",
                "category": "narrator",
                "display_name": "全知浩瀚叙事",
            },
            "赛博特勤": {
                "voice_name": "github-f5-cybercommando",
                "gender": "male",
                "age_group": "adult",
                "role": "protagonist",
                "base_style": "serious",
                "rate_offset": "+2%",
                "pitch_offset": "-5%",
                "category": "mature",
                "display_name": "冷冽机甲特勤",
            },
            "暗夜宿敌": {
                "voice_name": "github-f5-nightstalker",
                "gender": "male",
                "age_group": "elder",
                "role": "villain",
                "base_style": "whispering",
                "rate_offset": "-5%",
                "pitch_offset": "-10%",
                "category": "elderVillain",
                "display_name": "窒息阴森主宰",
            },
        },
    },
    "gpt_sovits_legends": {
        "id": "gpt_sovits_legends",
        "name": "GPT-SoVITS · 仙侠传世音色树",
        "description": "GitHub GPT-SoVITS 李白青莲剑仙、软萌仙山道童",
        "characters": {
            "青莲剑仙": {
                "voice_name": "github-gptsovits-swordpoet",
                "gender": "male",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "chat",
                "rate_offset": "+1%",
                "pitch_offset": "-1%",
                "category": "youngMale",
                "display_name": "豪放不羁剑仙",
            },
            "仙山道童": {
                "voice_name": "github-gptsovits-daoboy",
                "gender": "male",
                "age_group": "child",
                "role": "supporting",
                "base_style": "cheerful",
                "rate_offset": "+4%",
                "pitch_offset": "+15%",
                "category": "child",
                "display_name": "炼丹纯真小道童",
            },
        },
    },
    "xianxia": {
        "id": "xianxia",
        "name": "玄幻修仙配音树",
        "description": "适合修仙、玄幻、洪荒小说，层次分明，仙侠意境浓郁",
        "characters": {
            "旁白": {
                "voice_name": "zh-CN-YunxiNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "narrator",
                "base_style": "narration-relaxed",
                "rate_offset": "-2%",
                "pitch_offset": "-2%",
                "category": "narrator",
                "display_name": "修仙宏大旁白",
            },
            "男主角": {
                "voice_name": "zh-CN-YunjieNeural",
                "gender": "male",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "chat",
                "rate_offset": "+2%",
                "pitch_offset": "+0%",
                "category": "youngMale",
                "display_name": "逆天少侠",
            },
            "女主角": {
                "voice_name": "zh-CN-XiaohanNeural",
                "gender": "female",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "gentle",
                "rate_offset": "+2%",
                "pitch_offset": "+4%",
                "category": "youngFemale",
                "display_name": "清冷仙子",
            },
            "师尊仙翁": {
                "voice_name": "zh-CN-YunzeNeural",
                "gender": "male",
                "age_group": "elder",
                "role": "supporting",
                "base_style": "serious",
                "rate_offset": "-5%",
                "pitch_offset": "-6%",
                "category": "elderVillain",
                "display_name": "得道宗师",
            },
            "反派魔皇": {
                "voice_name": "zh-CN-YunzeNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "villain",
                "base_style": "angry",
                "rate_offset": "-4%",
                "pitch_offset": "-8%",
                "category": "elderVillain",
                "display_name": "九幽魔皇",
            },
            "灵兽道童": {
                "voice_name": "zh-CN-YunxiaNeural",
                "gender": "male",
                "age_group": "child",
                "role": "supporting",
                "base_style": "cheerful",
                "rate_offset": "+4%",
                "pitch_offset": "+8%",
                "category": "child",
                "display_name": "机敏小灵狐",
            },
        },
    },
    "historical": {
        "id": "historical",
        "name": "三国历史演义配音树",
        "description": "适合历史、三国、战国、楚汉等波澜壮阔的史诗小说",
        "characters": {
            "旁白": {
                "voice_name": "zh-CN-YunjianNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "narrator",
                "base_style": "narration-relaxed",
                "rate_offset": "-2%",
                "pitch_offset": "-2%",
                "category": "narrator",
                "display_name": "评书史诗旁白",
            },
            "刘备": {
                "voice_name": "zh-CN-YunyeNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "protagonist",
                "base_style": "serious",
                "rate_offset": "-2%",
                "pitch_offset": "-2%",
                "category": "mature",
                "display_name": "昭烈帝仁德沉稳",
            },
            "诸葛亮": {
                "voice_name": "zh-CN-YunfengNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "protagonist",
                "base_style": "gentle",
                "rate_offset": "-1%",
                "pitch_offset": "+0%",
                "category": "youngMale",
                "display_name": "卧龙从容儒雅",
            },
            "关羽": {
                "voice_name": "zh-CN-YunzeNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "supporting",
                "base_style": "serious",
                "rate_offset": "-4%",
                "pitch_offset": "-4%",
                "category": "elderVillain",
                "display_name": "美髯公傲骨豪迈",
            },
            "张飞": {
                "voice_name": "zh-CN-YunyeNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "supporting",
                "base_style": "angry",
                "rate_offset": "+4%",
                "pitch_offset": "+2%",
                "category": "mature",
                "display_name": "翼德勇烈咆哮",
            },
            "曹操": {
                "voice_name": "zh-CN-YunzeNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "villain",
                "base_style": "serious",
                "rate_offset": "-3%",
                "pitch_offset": "-5%",
                "category": "elderVillain",
                "display_name": "魏武枭雄",
            },
        },
    },
    "romance": {
        "id": "romance",
        "name": "现代都市言情配音树",
        "description": "适合都市甜宠、职场成长、现代轻喜剧小说",
        "characters": {
            "旁白": {
                "voice_name": "zh-CN-XiaoxiaoNeural",
                "gender": "female",
                "age_group": "adult",
                "role": "narrator",
                "base_style": "narration-relaxed",
                "rate_offset": "+0%",
                "pitch_offset": "+0%",
                "category": "narrator",
                "display_name": "温暖情感旁白",
            },
            "男主角": {
                "voice_name": "zh-CN-YunxiNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "protagonist",
                "base_style": "serious",
                "rate_offset": "-2%",
                "pitch_offset": "-3%",
                "category": "narrator",
                "display_name": "深情沉着男主",
            },
            "女主角": {
                "voice_name": "zh-CN-XiaohanNeural",
                "gender": "female",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "chat",
                "rate_offset": "+2%",
                "pitch_offset": "+2%",
                "category": "youngFemale",
                "display_name": "独立坚韧女主",
            },
            "闺蜜好友": {
                "voice_name": "zh-CN-XiaoyiNeural",
                "gender": "female",
                "age_group": "young",
                "role": "supporting",
                "base_style": "cheerful",
                "rate_offset": "+4%",
                "pitch_offset": "+4%",
                "category": "youngFemale",
                "display_name": "活泼神助攻",
            },
            "阳光男二": {
                "voice_name": "zh-CN-YunhaoNeural",
                "gender": "male",
                "age_group": "young",
                "role": "supporting",
                "base_style": "gentle",
                "rate_offset": "+2%",
                "pitch_offset": "+2%",
                "category": "youngMale",
                "display_name": "温暖守护者",
            },
        },
    },
    "mystery": {
        "id": "mystery",
        "name": "悬疑惊悚破案配音树",
        "description": "适合悬疑探案、密室解谜、惊悚民俗小说",
        "characters": {
            "旁白": {
                "voice_name": "zh-CN-YunxiNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "narrator",
                "base_style": "serious",
                "rate_offset": "-4%",
                "pitch_offset": "-4%",
                "category": "narrator",
                "display_name": "压抑悬疑旁白",
            },
            "神探主角": {
                "voice_name": "zh-CN-YunfengNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "protagonist",
                "base_style": "serious",
                "rate_offset": "-2%",
                "pitch_offset": "-2%",
                "category": "youngMale",
                "display_name": "冷静刑警",
            },
            "受害者/惊恐角色": {
                "voice_name": "zh-CN-XiaohanNeural",
                "gender": "female",
                "age_group": "young",
                "role": "supporting",
                "base_style": "fearful",
                "rate_offset": "+2%",
                "pitch_offset": "+4%",
                "category": "youngFemale",
                "display_name": "心惊胆战当事人",
            },
            "幕后真凶": {
                "voice_name": "zh-CN-XiaomoNeural",
                "gender": "female",
                "age_group": "adult",
                "role": "villain",
                "base_style": "whispering",
                "rate_offset": "-4%",
                "pitch_offset": "-5%",
                "category": "elderVillain",
                "display_name": "阴郁幕后黑手",
            },
        },
    },
}


class CharacterRegistry:
    """Manage stable Azure voice assignments, tree operations, presets and transfers."""

    def __init__(self, registry_path: Path, narrator_gender: str = "male") -> None:
        self.registry_path = registry_path
        self.narrator_gender = narrator_gender if narrator_gender in {"male", "female"} else "male"
        self._voices: dict[str, VoiceConfig] = {}
        self.registry_path.parent.mkdir(parents=True, exist_ok=True)
        self.load()
        self._ensure_narrator()

    def load(self) -> None:
        """Load the persistent character registry if it exists."""

        if not self.registry_path.exists():
            self._voices = {}
            return

        data = json.loads(self.registry_path.read_text(encoding="utf-8"))
        entries = data.get("characters", data if isinstance(data, dict) else {})
        self._voices = {
            name: VoiceConfig.model_validate(config)
            for name, config in entries.items()
            if isinstance(config, dict)
        }

    def save(self) -> None:
        """Persist the registry as human-readable JSON."""

        payload = {
            "version": 2,
            "characters": {
                name: voice.model_dump(mode="json")
                for name, voice in sorted(self._voices.items(), key=lambda item: item[0])
            },
        }
        self.registry_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def get_voice(
        self,
        character_name: str,
        metadata: CharacterMetadata | None = None,
        segment_type: str | None = None,
    ) -> VoiceConfig:
        """Return an existing or newly assigned voice for a character."""

        normalized_name = self._normalize_name(character_name, segment_type)
        if normalized_name in self._voices:
            return self._voices[normalized_name]

        voice = self._assign_voice(normalized_name, metadata)
        self._voices[normalized_name] = voice
        self.save()
        return voice

    def set_voice(self, character_name: str, config: VoiceConfig) -> VoiceConfig:
        """Directly set or override a character's voice configuration."""

        name = self._normalize_name(character_name, None)
        updated = config.model_copy(update={"character_name": name})
        self._voices[name] = updated
        self.save()
        return updated

    def swap_voices(self, char_a: str, char_b: str) -> tuple[VoiceConfig, VoiceConfig]:
        """Swap voice sound configurations between two characters.

        Keeps character identity (names), but swaps voice_name, base_style,
        pitch, rate, and category attributes.
        """

        name_a = self._normalize_name(char_a, None)
        name_b = self._normalize_name(char_b, None)

        voice_a = self.get_voice(name_a)
        voice_b = self.get_voice(name_b)

        # Exchange acoustic properties while keeping original names
        new_a = voice_a.model_copy(
            update={
                "voice_name": voice_b.voice_name,
                "base_style": voice_b.base_style,
                "rate_offset": voice_b.rate_offset,
                "pitch_offset": voice_b.pitch_offset,
                "category": voice_b.category,
                "display_name": voice_b.display_name,
            }
        )
        new_b = voice_b.model_copy(
            update={
                "voice_name": voice_a.voice_name,
                "base_style": voice_a.base_style,
                "rate_offset": voice_a.rate_offset,
                "pitch_offset": voice_a.pitch_offset,
                "category": voice_a.category,
                "display_name": voice_a.display_name,
            }
        )

        self._voices[name_a] = new_a
        self._voices[name_b] = new_b
        self.save()
        return new_a, new_b

    def transfer_voice(
        self,
        source_name: str,
        target_name: str,
        preserve_target_meta: bool = True,
    ) -> VoiceConfig:
        """Transfer source character's voice sound tree to target character."""

        src = self._normalize_name(source_name, None)
        dst = self._normalize_name(target_name, None)
        src_voice = self.get_voice(src)

        if dst in self._voices and preserve_target_meta:
            existing = self._voices[dst]
            updated = existing.model_copy(
                update={
                    "voice_name": src_voice.voice_name,
                    "base_style": src_voice.base_style,
                    "rate_offset": src_voice.rate_offset,
                    "pitch_offset": src_voice.pitch_offset,
                    "category": src_voice.category,
                    "display_name": src_voice.display_name,
                }
            )
        else:
            updated = src_voice.model_copy(update={"character_name": dst})

        self._voices[dst] = updated
        self.save()
        return updated

    def copy_voice_to_many(self, source_name: str, target_names: list[str]) -> list[VoiceConfig]:
        """Copy a voice configuration to multiple characters simultaneously."""

        results: list[VoiceConfig] = []
        for name in target_names:
            results.append(self.transfer_voice(source_name, name))
        return results

    def sync_from_metadata(self, characters: list[CharacterMetadata]) -> None:
        """Ensure every LLM-discovered character has a stable voice entry."""

        changed = False
        for character in characters:
            if character.name == "旁白":
                continue
            if character.name not in self._voices:
                self._voices[character.name] = self._assign_voice(character.name, character)
                changed = True
        if changed:
            self.save()

    def all_voices(self) -> dict[str, VoiceConfig]:
        """Return a copy of the current registry."""

        return dict(self._voices)

    def get_character_tree(self) -> dict[str, list[dict[str, Any]]]:
        """Group characters into a hierarchical role tree for visual rendering."""

        groups: dict[str, list[dict[str, Any]]] = {
            "narrator": [],
            "protagonist": [],
            "supporting": [],
            "elderVillain": [],
            "others": [],
        }

        for name, voice in sorted(self._voices.items(), key=lambda x: x[0]):
            dump = voice.model_dump(mode="json")
            if name == "旁白" or voice.role == "narrator":
                groups["narrator"].append(dump)
            elif voice.role == "protagonist":
                groups["protagonist"].append(dump)
            elif voice.role == "villain" or voice.age_group == "elder" or voice.category == "elderVillain":
                groups["elderVillain"].append(dump)
            elif voice.role == "supporting":
                groups["supporting"].append(dump)
            else:
                groups["others"].append(dump)

        return groups

    def export_scheme(
        self,
        export_path: Path | str | None = None,
        name: str = "自定义配音树方案",
        description: str = "",
    ) -> dict[str, Any]:
        """Export the active character voice tree as a portable scheme for exchange."""

        payload: dict[str, Any] = {
            "version": 2,
            "scheme_name": name,
            "description": description or f"从当前小说导出的配音树方案 (包含 {len(self._voices)} 个角色)",
            "characters": {
                name: voice.model_dump(mode="json")
                for name, voice in sorted(self._voices.items(), key=lambda item: item[0])
            },
        }

        if export_path:
            path = Path(export_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

        return payload

    def import_scheme(
        self,
        scheme_data_or_path: dict[str, Any] | str | Path,
        remapping: dict[str, str] | None = None,
        overwrite: bool = True,
    ) -> int:
        """Import a voice scheme (from another novel or preset file) into current novel.

        remapping: optional dictionary mapping scheme character names to novel character names.
        e.g. {"刘备": "沈砚", "曹操": "灰袍老者"}
        """

        if isinstance(scheme_data_or_path, (str, Path)):
            path = Path(scheme_data_or_path)
            if not path.exists():
                raise FileNotFoundError(f"Voice scheme file not found: {path}")
            data = json.loads(path.read_text(encoding="utf-8"))
        else:
            data = scheme_data_or_path

        chars_dict = data.get("characters", data if isinstance(data, dict) else {})
        mapping = remapping or {}
        imported_count = 0

        for scheme_char_name, voice_data in chars_dict.items():
            if not isinstance(voice_data, dict):
                continue

            target_name = mapping.get(scheme_char_name, scheme_char_name)
            target_name = self._normalize_name(target_name, None)

            if not overwrite and target_name in self._voices:
                continue

            # Clone dict and set character name
            cloned = dict(voice_data)
            cloned["character_name"] = target_name
            try:
                config = VoiceConfig.model_validate(cloned)
                self._voices[target_name] = config
                imported_count += 1
            except Exception:
                continue

        if imported_count > 0:
            self.save()

        return imported_count

    def apply_builtin_scheme(
        self,
        scheme_name: str,
        character_mapping: dict[str, str] | None = None,
    ) -> int:
        """Apply a predefined novel voice scheme (e.g. 'xianxia', 'historical')."""

        key = scheme_name.lower().strip()
        if key not in BUILTIN_VOICE_SCHEMES:
            candidates = ", ".join(BUILTIN_VOICE_SCHEMES.keys())
            raise ValueError(f"Unknown preset scheme '{scheme_name}'. Available: {candidates}")

        preset = BUILTIN_VOICE_SCHEMES[key]
        return self.import_scheme(preset, remapping=character_mapping, overwrite=True)

    @classmethod
    def list_ms_voices(cls) -> list[dict[str, Any]]:
        """Return the complete list of available Microsoft Azure / Edge voices."""

        return copy.deepcopy(MS_VOICE_CATALOG)

    @classmethod
    def get_ms_voice(cls, voice_name: str) -> dict[str, Any] | None:
        """Find voice metadata by voice name."""

        return MS_VOICE_MAP.get(voice_name)

    @classmethod
    def get_ms_tree(cls) -> dict[str, Any]:
        """Return the categorized voice tree structure."""

        return copy.deepcopy(MS_VOICE_TREE)

    @classmethod
    def list_ai_manga_voices(cls) -> list[dict[str, Any]]:
        """Return the curated list of AI manga characters across all age groups."""

        return copy.deepcopy(AI_MANGA_VOICE_CATALOG)

    @classmethod
    def get_ai_manga_voice(cls, voice_id: str) -> dict[str, Any] | None:
        """Find AI manga voice metadata by ID."""

        return AI_MANGA_VOICE_MAP.get(voice_id)

    @classmethod
    def list_github_voices(cls) -> list[dict[str, Any]]:
        """Return the complete list of GitHub open source AI voice catalog."""

        return copy.deepcopy(GITHUB_AI_VOICE_CATALOG)

    @classmethod
    def get_github_voice(cls, voice_id: str) -> dict[str, Any] | None:
        """Find GitHub AI voice metadata by ID."""

        return GITHUB_AI_VOICE_MAP.get(voice_id)

    @classmethod
    def list_builtin_schemes(cls) -> dict[str, Any]:
        """Return all built-in novel schemes."""

        return {
            key: {
                "id": scheme["id"],
                "name": scheme["name"],
                "description": scheme["description"],
                "characterCount": len(scheme["characters"]),
            }
            for key, scheme in BUILTIN_VOICE_SCHEMES.items()
        }

    def _ensure_narrator(self) -> None:
        if "旁白" in self._voices:
            return
        voice_name = VOICE_POOL["narration_female" if self.narrator_gender == "female" else "narration_male"]
        self._voices["旁白"] = VoiceConfig(
            character_name="旁白",
            voice_name=voice_name,
            gender=self.narrator_gender,  # type: ignore[arg-type]
            age_group="adult",
            role="narrator",
            base_style="narration-relaxed",
            rate_offset="+0%",
            pitch_offset="+0%",
            category="narrator",
            display_name="默认小说旁白",
        )
        self.save()

    def _assign_voice(self, name: str, metadata: CharacterMetadata | None) -> VoiceConfig:
        gender: Gender = metadata.gender if metadata else "unknown"
        age_group = metadata.age_group if metadata else "unknown"
        role: CharacterRole = metadata.role if metadata else "unknown"

        if role == "villain" or age_group == "elder":
            voice_name = VOICE_POOL["elder_villain"]
            category = "elderVillain"
            base_rate = -5
            base_pitch = -8
            base_style = "serious"
        elif gender == "female":
            voice_name = VOICE_POOL["young_female"]
            category = "youngFemale"
            base_rate = 2
            base_pitch = 5 if age_group in {"child", "young"} else 2
            base_style = "chat"
        elif gender == "male":
            voice_name = VOICE_POOL["young_male"]
            category = "youngMale"
            base_rate = 0
            base_pitch = -2
            base_style = "chat"
        else:
            inferred_gender = self._infer_name_gender(name)
            gender = inferred_gender  # type: ignore[assignment]
            if inferred_gender == "female":
                voice_name = VOICE_POOL["young_female"]
                category = "youngFemale"
                base_rate = 2
                base_pitch = 3
            else:
                voice_name = VOICE_POOL["young_male"]
                category = "youngMale"
                base_rate = 0
                base_pitch = -1
            base_style = "chat"

        rate_variation, pitch_variation = self._stable_variation(name)
        return VoiceConfig(
            character_name=name,
            voice_name=voice_name,
            gender=gender,
            age_group=age_group,
            role=role,
            base_style=base_style,
            rate_offset=f"{base_rate + rate_variation:+d}%",
            pitch_offset=f"{base_pitch + pitch_variation:+d}%",
            category=category,
            display_name=f"自动匹配 ({voice_name})",
        )

    def _infer_name_gender(self, name: str) -> str:
        """根据角色名与称号启发式推断性别，杜绝随机分配女性声线给男性角色"""
        if not name or name == "旁白":
            return "male"
        female_keywords = {
            "女", "娘", "妹", "姐", "妃", "后", "妻", "婆", "妇", "姥", "姨", "姑", "母",
            "婢", "妾", "丫鬟", "丫头", "姑娘", "小姐", "圣女", "魔女", "神女", "师姐", "师妹",
            "师娘", "师太", "公主", "郡主", "千金", "皇后", "太后", "贵妃", "王妃", "少妇",
            "娜", "婷", "娟", "芳", "丽", "莉", "雅", "琴", "萍", "蓉", "娥", "姬", "嫣", "娴",
            "曼", "婉", "薇", "蝶", "莹", "瑶", "倩", "蕊", "蕾", "茜", "珊", "妍", "琪", "萱",
            "菡", "黛", "媚", "娇", "兰", "凤", "珠", "翠", "环", "纨", "钗", "巧", "惜", "迎", "探"
        }
        male_keywords = {
            "男", "爷", "哥", "弟", "汉", "伯", "叔", "翁", "公", "僧", "道", "少爷", "公子",
            "少侠", "大侠", "帮主", "门主", "堂主", "舵主", "宗主", "教主", "掌教", "掌门", "长老",
            "老道", "老僧", "师祖", "老者", "头陀", "总管", "庄主", "堡主", "寨主", "殿下",
            "侯", "将", "相", "帅", "官", "大人", "督公", "太监", "公公", "军师", "陛下", "皇上",
            "大帝", "尊者", "天尊", "仙尊", "魔尊", "魔皇", "武圣", "剑圣", "拳尊", "老怪", "书生",
            "秀才", "强盗", "土匪", "道长", "和尚", "贫僧", "衲子", "太守", "县令", "巡抚", "知府",
            "总督", "将军", "校尉", "都尉", "教头", "捕快", "镖头", "侍卫", "小二", "掌柜", "伙计",
            "刚", "强", "勇", "猛", "伟", "峰", "浩", "博", "岩", "栋", "豪", "震", "霸", "飞",
            "雄", "健", "超", "雷", "豹", "虎", "彪", "龙", "鹏", "靖", "锋", "羽", "备", "德",
            "云", "操", "权", "策", "布", "辽", "懿", "昭", "泰", "魁", "岳", "烈", "铮", "瀚"
        }
        for kw in female_keywords:
            if kw in name:
                return "female"
        for kw in male_keywords:
            if kw in name:
                return "male"
        return "male"

    def _unknown_voice(self, name: str) -> str:
        gender = self._infer_name_gender(name)
        if gender == "female":
            return VOICE_POOL["young_female"]
        return VOICE_POOL["young_male"]

    @staticmethod
    def _normalize_name(character_name: str, segment_type: str | None) -> str:
        if segment_type == "narration":
            return "旁白"
        name = (character_name or "").strip()
        return name or "未知角色"

    @staticmethod
    def _hash_int(value: str) -> int:
        digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
        return int(digest[:8], 16)

    def _stable_variation(self, name: str) -> tuple[int, int]:
        seed = self._hash_int(name)
        rate = (seed % 7) - 3
        pitch = ((seed // 7) % 9) - 4
        return rate, pitch
