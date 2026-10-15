/**
 * character-tree.js - Page 2: Current Novel Character Audio Tree Visualizer
 * Arborist-style tree structure + Alexandria-style voice & dialogue inspector.
 */
(() => {
  "use strict";

  const {
    MS_VOICE_CATALOG,
    MS_VOICE_MAP,
    GITHUB_AI_VOICE_CATALOG,
    GITHUB_AI_VOICE_MAP,
    AI_MANGA_VOICE_CATALOG,
    AI_MANGA_VOICE_MAP,
    ROLE_LABELS,
    STYLE_LABELS,
    BUILTIN_SCHEMES,
    NARRATOR_PRESETS,
    StorageManager,
    AudioEngine,
    ModalManager,
    applySchemeToNovel,
    setNarratorVoice,
    getAvailableSchemes,
    renderSharedHeader,
    showToast,
    escapeHtml,
    escapeAttr,
  } = window.NovelApp;

  function getVoiceMeta(voiceId) {
    if (!voiceId) return { name: "默认音色", archetype: "未指定", gender: "female" };
    return AI_MANGA_VOICE_MAP?.[voiceId] || MS_VOICE_MAP?.[voiceId] || GITHUB_AI_VOICE_MAP?.[voiceId] || {
      id: voiceId,
      name: voiceId,
      archetype: "自定义声线",
      gender: "female",
    };
  }

  // DOM Elements
  const els = {
    treeBannerInfo: document.getElementById("treeBannerInfo"),
    treeSchemeSelect: document.getElementById("treeSchemeSelect"),
    applyTreeSchemeBtn: document.getElementById("applyTreeSchemeBtn"),
    activeTreeSchemeBadge: document.getElementById("activeTreeSchemeBadge"),
    treeSearchInput: document.getElementById("treeSearchInput"),
    expandAllBtn: document.getElementById("expandAllBtn"),
    collapseAllBtn: document.getElementById("collapseAllBtn"),
    addCharacterBtn: document.getElementById("addCharacterBtn"),
    treeStatsText: document.getElementById("treeStatsText"),
    arboristTreeRoot: document.getElementById("arboristTreeRoot"),
    batchCleanCharsBtn: document.getElementById("batchCleanCharsBtn"),
    inspectorAvatar: document.getElementById("inspectorAvatar"),
    inspectorCharName: document.getElementById("inspectorCharName"),
    inspectorRoleBadge: document.getElementById("inspectorRoleBadge"),
    inspectorVoiceBadge: document.getElementById("inspectorVoiceBadge"),
    inspectorArchetypeDesc: document.getElementById("inspectorArchetypeDesc"),
    narratorQuickPillsBox: document.getElementById("narratorQuickPillsBox"),
    narratorQuickPillsContainer: document.getElementById("narratorQuickPillsContainer"),
    pickVoiceBtn: document.getElementById("pickVoiceBtn"),
    swapVoiceBtn: document.getElementById("swapVoiceBtn"),
    renameCharBtn: document.getElementById("renameCharBtn"),
    copyVoiceBtn: document.getElementById("copyVoiceBtn"),
    pasteVoiceBtn: document.getElementById("pasteVoiceBtn"),
    mergeCharBtn: document.getElementById("mergeCharBtn"),
    deleteCharBtn: document.getElementById("deleteCharBtn"),
    inspectorWaveCanvas: document.getElementById("inspectorWaveCanvas"),
    auditionCharVoiceBtn: document.getElementById("auditionCharVoiceBtn"),
    playAllCharLinesBtn: document.getElementById("playAllCharLinesBtn"),
    inspectorSampleLine: document.getElementById("inspectorSampleLine"),
    charPitchSlider: document.getElementById("charPitchSlider"),
    charPitchValue: document.getElementById("charPitchValue"),
    charRateSlider: document.getElementById("charRateSlider"),
    charRateValue: document.getElementById("charRateValue"),
    charEmotionSelect: document.getElementById("charEmotionSelect"),
    saveCharConfigBtn: document.getElementById("saveCharConfigBtn"),
    charLinesSummary: document.getElementById("charLinesSummary"),
    charDialogueDeck: document.getElementById("charDialogueDeck"),
    // Modals
    msVoiceModal: document.getElementById("msVoiceModal"),
    catalogCategoryList: document.getElementById("catalogCategoryList"),
    catalogSearchInput: document.getElementById("catalogSearchInput"),
    catalogGenderFilter: document.getElementById("catalogGenderFilter"),
    catalogVoiceGrid: document.getElementById("catalogVoiceGrid"),
    swapModal: document.getElementById("swapModal"),
    swapCharNameA: document.getElementById("swapCharNameA"),
    swapTargetSelect: document.getElementById("swapTargetSelect"),
    confirmSwapBtn: document.getElementById("confirmSwapBtn"),
    addCharModal: document.getElementById("addCharModal"),
    newCharNameInput: document.getElementById("newCharNameInput"),
    newCharRoleSelect: document.getElementById("newCharRoleSelect"),
    newCharVoiceSelect: document.getElementById("newCharVoiceSelect"),
    confirmAddCharBtn: document.getElementById("confirmAddCharBtn"),
    mergeCharModal: document.getElementById("mergeCharModal"),
    mergeSourceCharName: document.getElementById("mergeSourceCharName"),
    mergeTargetCharSelect: document.getElementById("mergeTargetCharSelect"),
    confirmMergeBtn: document.getElementById("confirmMergeBtn"),
    diagnoseTreeBtn: document.getElementById("diagnoseTreeBtn"),
    exportCastingCardBtn: document.getElementById("exportCastingCardBtn"),
    diagnoseModal: document.getElementById("diagnoseModal"),
    healthScoreNumber: document.getElementById("healthScoreNumber"),
    healthScoreTag: document.getElementById("healthScoreTag"),
    diagnoseItemsContainer: document.getElementById("diagnoseItemsContainer"),
    autoOptimizeVoicesBtn: document.getElementById("autoOptimizeVoicesBtn"),
  };

  // State
  const state = {
    novel: null,
    selectedCharName: "旁白",
    extractedQuotes: {}, // speaker => [{ text, emotion, chapterTitle }]
    expandedGroups: new Set(["root", "narrator", "youngMale", "mature", "youngFemale", "elderVillain", "child", "other"]),
    searchQuery: "",
    waveAnimId: null,
  };

  /* -------------------------------------------------------------
     Waveform Canvas Animation
  ------------------------------------------------------------- */
  function drawWaveform(canvas, isActive) {
    if (!canvas) return;
    if (window.KineticVFX && typeof window.KineticVFX.drawOscilloscope === "function") {
      window.KineticVFX.drawOscilloscope(canvas, {
        isActive,
        label: "HERO CHARACTER VOICE // 44.1kHz",
      });
      return;
    }

    const ctx = canvas.getContext("2d");
    const width = canvas.width = canvas.parentElement.clientWidth || 360;
    const height = canvas.height = 52;

    ctx.clearRect(0, 0, width, height);
    const barCount = 42;
    const barWidth = Math.max(2, (width / barCount) - 3);
    const time = Date.now() / 200;

    for (let i = 0; i < barCount; i++) {
      let barHeight;
      if (isActive) {
        barHeight = Math.abs(Math.sin(time + i * 0.35) * Math.cos(time * 0.7 + i * 0.2)) * (height * 0.78) + 4;
      } else {
        barHeight = (Math.sin(i * 0.2) + 1.2) * 5;
      }

      const x = i * (barWidth + 3);
      const y = (height - barHeight) / 2;
      const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
      grad.addColorStop(0, isActive ? "#00e5ff" : "#4a4c46");
      grad.addColorStop(1, isActive ? "#f59e0b" : "#2e302a");

      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }

  function startWaveformAnimation() {
    stopWaveformAnimation();
    if (els.inspectorAvatar) els.inspectorAvatar.classList.add("is-speaking");
    if (window.KineticVFX) {
      window.KineticVFX.setSpeaking(true);
      window.KineticVFX.emitShockwave(window.innerWidth * 0.65, window.innerHeight * 0.32, 1.35);
    }
    function loop() {
      drawWaveform(els.inspectorWaveCanvas, true);
      state.waveAnimId = requestAnimationFrame(loop);
    }
    loop();
  }

  function stopWaveformAnimation() {
    if (state.waveAnimId) {
      cancelAnimationFrame(state.waveAnimId);
      state.waveAnimId = null;
    }
    if (els.inspectorAvatar) els.inspectorAvatar.classList.remove("is-speaking");
    if (window.KineticVFX) window.KineticVFX.setSpeaking(false);
    drawWaveform(els.inspectorWaveCanvas, false);
  }

  /* -------------------------------------------------------------
     Initialization
  ------------------------------------------------------------- */
  function init() {
    // 渲染共享头部
    renderSharedHeader("characterTree");

    // 加载小说数据
    loadNovelData();

    // 初始化全局角色语音树方案快速切换控制条
    initTreeSchemeControls();

    // 扫描小说正文提取角色对白金句
    extractNovelDialogueQuotes();

    // 渲染 Arborist 树形结构
    renderTree();

    // 渲染右侧检视器
    selectCharacter(state.selectedCharName || "旁白");

    // 绑定事件
    bindEvents();

    // 初始化波形
    drawWaveform(els.inspectorWaveCanvas, false);
  }

  function loadNovelData() {
    state.novel = StorageManager.getCurrentNovel();

    // 确保有角色树
    if (!state.novel.characterTree || Object.keys(state.novel.characterTree).length === 0) {
      state.novel.characterTree = {
        "旁白": { character_name: "旁白", role: "narrator", voice_name: "zh-CN-YunxiNeural", pitch: 0.96, rate_offset: "-2%", base_style: "narration-relaxed" },
        "刘备": { character_name: "刘备", role: "mature", voice_name: "zh-CN-YunyeNeural", pitch: 0.92, rate_offset: "-2%", base_style: "serious" },
        "关羽": { character_name: "关羽", role: "mature", voice_name: "zh-CN-YunzeNeural", pitch: 0.88, rate_offset: "-3%", base_style: "serious" },
        "张飞": { character_name: "张飞", role: "mature", voice_name: "zh-CN-YunyeNeural", pitch: 0.94, rate_offset: "+4%", base_style: "angry" },
      };
      StorageManager.saveCurrentNovel(state.novel);
    }

    const charCount = Object.keys(state.novel.characterTree).length;
    els.treeBannerInfo.textContent = `正在检视《${state.novel.title}》的角色音频树，共 ${charCount} 位角色。支持逐个试听、微调参数与对调混搭。`;
  }

  function extractNovelDialogueQuotes() {
    state.extractedQuotes = {};
    const text = state.novel.rawText || "";
    if (!text) return;

    const pattern = /“([^”]{1,1200})”|"([^"\n]{1,1200})"/g;
    let lastIndex = 0;
    let match;
    let lastSpeaker = "";

    while ((match = pattern.exec(text))) {
      const spoken = (match[1] || match[2] || "").trim();
      const before = text.slice(Math.max(0, match.index - 50), match.index);
      const after = text.slice(pattern.lastIndex, Math.min(text.length, pattern.lastIndex + 40));

      const verb = "(?:说道|说|问道|问|答道|答|喝道|喊道|笑道|叹道|道|低声道|冷笑道|怒道)";
      const name = "([\\u4e00-\\u9fa5A-Za-z·]{1,8})";
      const beforeMatch = before.match(new RegExp(`${name}[^“”]{0,24}${verb}[\\s:：，,、]*$`));
      const afterMatch = after.match(new RegExp(`^[\\s，,。.!！?？、]*${name}[^“”]{0,24}${verb}`));
      let speaker = (afterMatch && afterMatch[1]) || (beforeMatch && beforeMatch[1]) || "";
      speaker = speaker.replace(/[^\u4e00-\u9fa5A-Za-z·]/g, "").trim();

      if (!speaker && /^\s*[，,。.!！?？、]*(他|她|其人|那人)\s*(?:说道|说|问道|问)/.test(after)) {
        speaker = lastSpeaker;
      }
      if (speaker && speaker !== "旁白") {
        lastSpeaker = speaker;
        if (!state.extractedQuotes[speaker]) state.extractedQuotes[speaker] = [];
        state.extractedQuotes[speaker].push({
          text: spoken,
          emotion: /怒|喝|骂/.test(spoken) ? "angry" : (/笑|喜/.test(spoken) ? "cheerful" : "chat"),
        });
      }
      lastIndex = pattern.lastIndex;
    }

    // 默认旁白代表句
    state.extractedQuotes["旁白"] = [
      { text: "话说天下大势，分久必合，合久必分。周末七国分争，并入于秦。", emotion: "narration-relaxed" },
      { text: "微风拂过窗棂，那些沉封已久的故事，悄然拉开序幕。", emotion: "narration-relaxed" },
    ];
  }

  function bindEvents() {
    // 树搜索过滤
    els.treeSearchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      renderTree();
    });

    // 展开/折叠全部
    els.expandAllBtn.addEventListener("click", () => {
      state.expandedGroups = new Set(["root", "narrator", "youngMale", "youngFemale", "mature", "elderVillain", "child", "other"]);
      renderTree();
    });

    els.collapseAllBtn.addEventListener("click", () => {
      state.expandedGroups.clear();
      renderTree();
    });

    // 添加角色模态框
    els.addCharacterBtn.addEventListener("click", openAddCharModal);
    els.confirmAddCharBtn.addEventListener("click", handleConfirmAddChar);

    // 检视器滑块与事件
    els.charPitchSlider.addEventListener("input", (e) => {
      els.charPitchValue.value = Number(e.target.value).toFixed(2);
    });

    els.charRateSlider.addEventListener("input", (e) => {
      const val = Number(e.target.value);
      els.charRateValue.value = `${val > 0 ? "+" : ""}${val}%`;
    });

    els.saveCharConfigBtn.addEventListener("click", saveSelectedCharConfig);

    // 专属试听
    els.auditionCharVoiceBtn.addEventListener("click", auditionSelectedChar);
    if (els.playAllCharLinesBtn) els.playAllCharLinesBtn.addEventListener("click", handlePlayAllCharLines);

    // 挑选音色与对调
    els.pickVoiceBtn.addEventListener("click", openMsVoiceModal);
    els.swapVoiceBtn.addEventListener("click", openSwapModal);
    els.confirmSwapBtn.addEventListener("click", handleConfirmSwap);

    // 角色高级管理（重命名、复制声线、粘贴声线、合并、删除）
    if (els.renameCharBtn) els.renameCharBtn.addEventListener("click", handleRenameChar);
    if (els.copyVoiceBtn) els.copyVoiceBtn.addEventListener("click", handleCopyVoice);
    if (els.pasteVoiceBtn) els.pasteVoiceBtn.addEventListener("click", handlePasteVoice);
    if (els.mergeCharBtn) els.mergeCharBtn.addEventListener("click", openMergeCharModal);
    if (els.batchCleanCharsBtn) els.batchCleanCharsBtn.addEventListener("click", batchCleanZeroLineCharacters);
    if (els.deleteCharBtn) els.deleteCharBtn.addEventListener("click", handleDeleteChar);
    if (els.confirmMergeBtn) els.confirmMergeBtn.addEventListener("click", handleConfirmMerge);

    // 声线体检诊断与配音卡导出
    if (els.diagnoseTreeBtn) els.diagnoseTreeBtn.addEventListener("click", openDiagnoseModal);
    if (els.exportCastingCardBtn) els.exportCastingCardBtn.addEventListener("click", exportCastingCard);
    if (els.autoOptimizeVoicesBtn) els.autoOptimizeVoicesBtn.addEventListener("click", handleAutoOptimizeVoices);

    // 模态弹窗关闭统一委托给 ModalManager
    document.querySelectorAll("[data-modal-close]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const modalId = btn.getAttribute("data-modal-close");
        if (modalId) ModalManager.close(modalId);
      });
    });

    // 微软音色库搜索与过滤
    els.catalogSearchInput.addEventListener("input", filterMsVoiceGrid);
    els.catalogGenderFilter.addEventListener("change", filterMsVoiceGrid);
  }

  /* -------------------------------------------------------------
     Character Tree Voice Health Diagnostic & Optimization
  ------------------------------------------------------------- */
  function openDiagnoseModal() {
    runVoiceHealthCheck();
    ModalManager.open(els.diagnoseModal);
  }

  function runVoiceHealthCheck() {
    const tree = state.novel.characterTree || {};
    const characters = Object.entries(tree);
    if (!characters.length) return;

    let score = 100;
    const items = [];

    // 1. 统计音色重叠与冲突
    const voiceUsage = {}; // voiceId => [charNames]
    characters.forEach(([charName, conf]) => {
      const vId = conf.voice_name || "default";
      if (!voiceUsage[vId]) voiceUsage[vId] = [];
      voiceUsage[vId].push(charName);
    });

    // 检查冲突
    let collisionCount = 0;
    for (const [vId, chars] of Object.entries(voiceUsage)) {
      const msVoice = MS_VOICE_MAP[vId] || { name: vId };
      if (chars.length > 1) {
        collisionCount += (chars.length - 1);
        score -= (chars.length - 1) * 12;
        items.push({
          type: "warning",
          badge: "⚠️ 声线重叠冲突",
          title: `音色【${msVoice.name}】被同时绑定于 ${chars.join("、")}`,
          desc: `在小说对白中，两个角色使用相同音色会导致听众难以区分说话人。建议为其中角色分配不同声线。`,
        });
      }
    }

    // 2. 检查人设与音色性别契合度
    characters.forEach(([charName, conf]) => {
      const msVoice = MS_VOICE_MAP[conf.voice_name];
      if (msVoice) {
        if (conf.role === "youngFemale" && msVoice.gender === "male") {
          score -= 10;
          items.push({
            type: "danger",
            badge: "❌ 性别风格异常",
            title: `女性角色【${charName}】绑定了男性音色【${msVoice.name}】`,
            desc: `当前绑定可能不符合常规女性人设，若非特殊剧情设定建议更换为女性声线。`,
          });
        } else if (conf.role === "youngMale" && msVoice.gender === "female") {
          score -= 10;
          items.push({
            type: "danger",
            badge: "❌ 性别风格异常",
            title: `男性角色【${charName}】绑定了女性音色【${msVoice.name}】`,
            desc: `当前绑定可能不符合常规青年男主人设，建议更换为青年男声线。`,
          });
        }
      }
    });

    // 3. 良好项目
    const narratorVoice = tree["旁白"]?.voice_name;
    const narratorVoiceObj = MS_VOICE_MAP[narratorVoice];
    if (narratorVoiceObj) {
      items.push({
        type: "good",
        badge: "✅ 旁白主役就绪",
        title: `全书主役旁白采用【${narratorVoiceObj.name}】(${narratorVoiceObj.archetype || "经典演播"})`,
        desc: `音质饱满端庄，节奏平稳，适合长时间有声演播。`,
      });
    }

    if (collisionCount === 0) {
      items.push({
        type: "good",
        badge: "✅ 全书千人千面",
        title: `全书各角色音色全部独立，无任何声线冲突`,
        desc: `每位角色均拥有专属音色辨识度，多角色戏剧张力表现优异。`,
      });
    }

    score = Math.max(30, Math.min(100, score));

    if (els.healthScoreNumber) els.healthScoreNumber.textContent = String(score);
    if (els.healthScoreTag) {
      if (score >= 90) {
        els.healthScoreTag.textContent = "卓越 · 千人千面";
        els.healthScoreTag.style.color = "var(--accent-cyan)";
      } else if (score >= 75) {
        els.healthScoreTag.textContent = "良好 · 少量重叠";
        els.healthScoreTag.style.color = "var(--accent-gold)";
      } else {
        els.healthScoreTag.textContent = "预警 · 存在混淆风险";
        els.healthScoreTag.style.color = "#ef4444";
      }
    }

    if (els.diagnoseItemsContainer) {
      els.diagnoseItemsContainer.innerHTML = items.map(item => `
        <div class="diagnose-item-card is-${item.type}">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
              <span class="badge-role" style="font-size: 11px;">${item.badge}</span>
              <strong style="color: var(--text);">${escapeHtml(item.title)}</strong>
            </div>
            <p style="margin: 0; font-size: 11.5px; color: var(--muted);">${escapeHtml(item.desc)}</p>
          </div>
        </div>
      `).join("");
    }
  }

  function handleAutoOptimizeVoices() {
    const tree = state.novel.characterTree || {};
    const usedVoices = new Set();

    if (tree["旁白"]) {
      usedVoices.add(tree["旁白"].voice_name);
    }

    const candidateVoices = {
      youngMale: ["zh-CN-YunjieNeural", "zh-CN-YunfengNeural", "zh-CN-YunhaoNeural"],
      youngFemale: ["zh-CN-XiaohanNeural", "zh-CN-XiaomengNeural", "zh-CN-XiaozhenNeural", "zh-CN-XiaoruiNeural"],
      mature: ["zh-CN-YunyeNeural", "zh-CN-YunzeNeural", "zh-CN-YunjianNeural"],
      elderVillain: ["zh-CN-YunzeNeural", "zh-CN-YunxiNeural"],
      child: ["zh-CN-XiaoxuanNeural", "zh-CN-XiaoyiNeural", "zh-CN-XiaoyouNeural"],
      dialect: ["zh-CN-liaoning-XiaobeiNeural", "zh-CN-shaanxi-XiaoniNeural", "zh-CN-sichuan-YunxiNeural"],
      narrator: ["zh-CN-YunxiNeural", "zh-CN-XiaoxiaoNeural", "zh-CN-YunjianNeural", "zh-CN-YunyangNeural"],
    };

    for (const [charName, conf] of Object.entries(tree)) {
      if (charName === "旁白") continue;
      const role = conf.role || "youngMale";
      const pool = candidateVoices[role] || candidateVoices.mature;
      let selectedVoice = pool.find(v => !usedVoices.has(v));
      if (!selectedVoice) {
        selectedVoice = MS_VOICE_CATALOG.find(v => !usedVoices.has(v.id) && (role === "youngFemale" ? v.gender === "female" : (role === "youngMale" ? v.gender === "male" : true)))?.id;
      }
      if (!selectedVoice) selectedVoice = pool[0];

      conf.voice_name = selectedVoice;
      usedVoices.add(selectedVoice);
    }

    StorageManager.saveCurrentNovel(state.novel);
    renderTree();
    inspectCharacter(state.selectedCharName);
    runVoiceHealthCheck();
    showToast("全书角色已智能分配独立不重复的专属音色！");
  }

  function exportCastingCard() {
    const tree = state.novel.characterTree || {};
    const entries = Object.entries(tree);
    if (!entries.length) {
      showToast("当前角色树为空，无法导出");
      return;
    }

    let md = `# 《${state.novel.title}》角色配音设计档案卡\n\n`;
    md += `> 生成时间：${new Date().toLocaleString()} · 共 ${entries.length} 位角色 · 架构引擎：声影小说工坊\n\n`;
    md += `| 角色名称 | 人设分类 | 绑定微软音色 | 音高 (Pitch) | 语速微调 | 情感风格 | 原著对白数 |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    entries.forEach(([charName, conf]) => {
      const msVoice = MS_VOICE_MAP[conf.voice_name] || { name: conf.voice_name };
      const quotes = (state.extractedQuotes[charName] || []).length;
      md += `| **${charName}** | ${ROLE_LABELS[conf.role] || conf.role} | ${msVoice.name} (\`${conf.voice_name}\`) | ${conf.pitch || 1.0} | ${conf.rate_offset || "0%"} | ${conf.base_style || "chat"} | ${quotes} 句 |\n`;
    });

    md += `\n## 角色专属原著对白摘录\n\n`;
    entries.forEach(([charName]) => {
      const quotes = state.extractedQuotes[charName] || [];
      if (quotes.length) {
        md += `### ${charName}\n`;
        quotes.slice(0, 3).forEach((q, i) => {
          md += `${i + 1}. “${q.text}”\n`;
        });
        md += `\n`;
      }
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `《${state.novel.title}》角色配音设计卡.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("已成功导出全书角色配音设计卡 Markdown！");
  }

  /* -------------------------------------------------------------
     Arborist Tree Rendering Logic
  ------------------------------------------------------------- */
  function renderTree() {
    const tree = state.novel.characterTree || {};
    const charEntries = Object.entries(tree);

    els.treeStatsText.textContent = `共 ${charEntries.length} 位角色 · 全部就绪`;

    // 按人设类型分组
    const groups = {
      narrator: { label: "🎙️ 旁白演播", characters: [] },
      youngMale: { label: "⚔️ 青年主角 / 豪杰", characters: [] },
      youngFemale: { label: "🌸 青年女主 / 佳人", characters: [] },
      mature: { label: "🛡️ 成熟中生 / 将领", characters: [] },
      elderVillain: { label: "🦹 长者反派 / 智囊", characters: [] },
      child: { label: "🧒 少儿童声", characters: [] },
      other: { label: "🎭 其他配角", characters: [] },
    };

    for (const [name, conf] of charEntries) {
      // 搜索过滤
      if (state.searchQuery) {
        const q = state.searchQuery;
        const voice = MS_VOICE_MAP[conf.voice_name] || {};
        const matchesName = name.toLowerCase().includes(q);
        const matchesVoice = (voice.name || conf.voice_name || "").toLowerCase().includes(q);
        const matchesRole = (ROLE_LABELS[conf.role] || "").toLowerCase().includes(q);
        if (!matchesName && !matchesVoice && !matchesRole) {
          continue;
        }
      }

      const roleKey = conf.role in groups ? conf.role : "other";
      groups[roleKey].characters.push({ name, ...conf });
    }

    const isRootExpanded = state.expandedGroups.has("root");

    let html = `
      <!-- 根节点：当前小说 -->
      <li class="arborist-node">
        <div class="arborist-row ${state.selectedCharName === '__root__' ? 'is-selected' : ''}" data-node-type="root">
          <span class="arborist-expander ${isRootExpanded ? 'is-expanded' : ''}" data-toggle-group="root">▶</span>
          <span class="arborist-icon">📖</span>
          <span class="arborist-label" title="${escapeAttr(state.novel.title)}">当前小说：${escapeHtml(state.novel.title)}</span>
          <div class="arborist-meta">
            <span class="badge-role">${charEntries.length} 角色</span>
          </div>
        </div>

        <ul class="arborist-children" style="${isRootExpanded ? '' : 'display: none;'}">
    `;

    for (const [groupKey, groupData] of Object.entries(groups)) {
      if (groupData.characters.length === 0 && state.searchQuery) continue;

      const isGroupExpanded = state.expandedGroups.has(groupKey);

      html += `
        <li class="arborist-node">
          <div class="arborist-row" data-node-type="group" data-group-key="${groupKey}">
            <span class="arborist-expander ${isGroupExpanded ? 'is-expanded' : ''}" data-toggle-group="${groupKey}">▶</span>
            <span class="arborist-icon">📁</span>
            <span class="arborist-label">${escapeHtml(groupData.label)}</span>
            <div class="arborist-meta">
              <span class="badge-lines-count">${groupData.characters.length} 位</span>
            </div>
          </div>

          <ul class="arborist-children" style="${isGroupExpanded ? '' : 'display: none;'}">
      `;

      for (const char of groupData.characters) {
        const isSelected = char.name === state.selectedCharName;
        const voice = MS_VOICE_MAP[char.voice_name] || { name: char.voice_name };
        const linesCount = (state.extractedQuotes[char.name] || []).length;
        const avatarIcon = char.role === "youngFemale" ? "👧" : (char.role === "child" ? "🧒" : (char.role === "elderVillain" ? "🧓" : "🧑"));

        html += `
          <li class="arborist-node">
            <div class="arborist-row ${isSelected ? 'is-selected' : ''}" data-char-name="${escapeAttr(char.name)}">
              <span class="arborist-expander is-leaf-spacer">·</span>
              <span class="arborist-icon">${char.name === "旁白" ? "🎙️" : avatarIcon}</span>
              <span class="arborist-label" title="${escapeAttr(char.name)}">${escapeHtml(char.name)}</span>
              <div class="arborist-meta">
                <span class="badge-voice" title="音色：${escapeAttr(char.voice_name)}">${escapeHtml(voice.name || char.voice_name)}</span>
                <span class="badge-lines-count">${linesCount} 句</span>
                <button class="btn-play-audition" type="button" title="点击即刻试听 ${escapeAttr(char.name)} 音色" data-audition-char="${escapeAttr(char.name)}">▶</button>
                ${char.name !== "旁白" ? `<button class="btn-delete-node" type="button" title="删除角色【${escapeAttr(char.name)}】并将台词归为旁白" data-delete-char-row="${escapeAttr(char.name)}" style="background: none; border: none; cursor: pointer; color: #ef4444; font-size: 13px; padding: 2px 4px; opacity: 0.75;">🗑️</button>` : ''}
              </div>
            </div>
          </li>
        `;
      }

      html += `
          </ul>
        </li>
      `;
    }

    html += `
        </ul>
      </li>
    `;

    els.arboristTreeRoot.innerHTML = html;
    bindTreeEvents();
  }

  function bindTreeEvents() {
    // 展开/折叠箭头点击
    els.arboristTreeRoot.querySelectorAll("[data-toggle-group]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const groupKey = btn.dataset.toggleGroup;
        if (state.expandedGroups.has(groupKey)) {
          state.expandedGroups.delete(groupKey);
        } else {
          state.expandedGroups.add(groupKey);
        }
        renderTree();
      });
    });

    // 角色行点击选择
    els.arboristTreeRoot.querySelectorAll("[data-char-name]").forEach((row) => {
      row.addEventListener("click", () => {
        const charName = row.dataset.charName;
        selectCharacter(charName);
      });
    });

    // 节点即刻试听按钮点击
    els.arboristTreeRoot.querySelectorAll("[data-audition-char]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const charName = btn.dataset.auditionChar;
        auditionCharacterByName(charName, btn);
      });
    });

    // 树节点直接删除角色
    els.arboristTreeRoot.querySelectorAll("[data-delete-char-row]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const charName = btn.dataset.deleteCharRow;
        state.selectedCharName = charName;
        handleDeleteChar();
      });
    });

    if (window.KineticVFX && typeof window.KineticVFX.bindCardTilt === "function") {
      window.KineticVFX.bindCardTilt();
    }
  }

  /* -------------------------------------------------------------
     Inspector Logic
  ------------------------------------------------------------- */
  function selectCharacter(charName) {
    state.selectedCharName = charName;
    const tree = state.novel.characterTree || {};
    const conf = tree[charName];

    // 更新左侧树的选中样式
    els.arboristTreeRoot.querySelectorAll(".arborist-row").forEach(r => {
      r.classList.toggle("is-selected", r.dataset.charName === charName);
    });

    if (!conf) return;

    const voice = MS_VOICE_MAP[conf.voice_name] || { name: conf.voice_name, archetype: "自定义音色" };
    const roleLabel = ROLE_LABELS[conf.role] || conf.role;

    els.inspectorCharName.textContent = charName;
    els.inspectorAvatar.textContent = charName === "旁白" ? "🎙️" : (conf.role === "youngFemale" ? "👧" : "🧑");
    els.inspectorRoleBadge.textContent = roleLabel;
    els.inspectorVoiceBadge.textContent = `${voice.name || conf.voice_name}`;
    els.inspectorArchetypeDesc.textContent = voice.archetype || `当前绑定音色：${conf.voice_name}`;

    // 更新微调控制器
    els.charPitchSlider.value = conf.pitch || 1.0;
    els.charPitchValue.value = Number(conf.pitch || 1.0).toFixed(2);

    const rateNum = parseInt(conf.rate_offset || "0", 10) || 0;
    els.charRateSlider.value = rateNum;
    els.charRateValue.value = `${rateNum > 0 ? "+" : ""}${rateNum}%`;

    els.charEmotionSelect.value = conf.base_style || "chat";

    // 示例代表句
    const quotes = state.extractedQuotes[charName] || [];
    const sampleLine = quotes.length > 0 ? quotes[0].text : (voice.sampleText || "天地不仁，以万物为刍狗。");
    els.inspectorSampleLine.textContent = `“${sampleLine}”`;

    // 旁白专属声线一键自由快切胶囊
    if (charName === "旁白" && els.narratorQuickPillsBox) {
      els.narratorQuickPillsBox.style.display = "block";
      renderNarratorQuickPills(conf.voice_name);
    } else if (els.narratorQuickPillsBox) {
      els.narratorQuickPillsBox.style.display = "none";
    }

    // 渲染 Alexandria 台词录
    renderCharacterDialogueDeck(charName, quotes);
  }

  /* -------------------------------------------------------------
     Tree Scheme Switching & Quick Narrator Controls
  ------------------------------------------------------------- */
  function initTreeSchemeControls() {
    renderTreeSchemeDropdown();

    if (els.treeSchemeSelect) {
      els.treeSchemeSelect.addEventListener("change", () => {
        handleApplyTreeScheme(els.treeSchemeSelect.value);
      });
    }
    if (els.applyTreeSchemeBtn) {
      els.applyTreeSchemeBtn.addEventListener("click", () => {
        handleApplyTreeScheme(els.treeSchemeSelect.value);
      });
    }
  }

  /* -------------------------------------------------------------
     Character Advanced Operations (Rename, Copy/Paste, Delete, Merge, Play All)
  ------------------------------------------------------------- */
  function handleCopyVoice() {
    const charName = state.selectedCharName;
    const tree = state.novel.characterTree || {};
    const conf = tree[charName];
    if (!conf) return;

    state.copiedVoiceConfig = {
      voice_name: conf.voice_name,
      pitch: conf.pitch || 1.0,
      rate_offset: conf.rate_offset || "0%",
      base_style: conf.base_style || "chat",
      role: conf.role,
    };

    const voiceName = MS_VOICE_MAP[conf.voice_name]?.name || conf.voice_name;
    showToast(`📋 已复制【${charName}】(${voiceName}) 的声线设置！可在其他角色上点击「粘贴」快速复用。`);
  }

  function handlePasteVoice() {
    if (!state.copiedVoiceConfig) {
      showToast("尚未复制任何声线配置，请先在某个角色上点击「📋 复制声线」");
      return;
    }

    const charName = state.selectedCharName;
    const tree = state.novel.characterTree || {};
    const conf = tree[charName];
    if (!conf) return;

    conf.voice_name = state.copiedVoiceConfig.voice_name;
    conf.pitch = state.copiedVoiceConfig.pitch;
    conf.rate_offset = state.copiedVoiceConfig.rate_offset;
    conf.base_style = state.copiedVoiceConfig.base_style;

    StorageManager.saveCurrentNovel(state.novel);
    selectCharacter(charName);
    renderTree();

    const voiceName = MS_VOICE_MAP[conf.voice_name]?.name || conf.voice_name;
    showToast(`📥 已成功将【${voiceName}】声线粘贴至角色【${charName}】！`);
    auditionSelectedChar();
  }

  function handleRenameChar() {
    const charName = state.selectedCharName;
    if (charName === "旁白") {
      showToast("旁白作为小说演播叙事核心，不可修改名称。");
      return;
    }

    const newName = prompt(`请输入角色【${charName}】的新名称：`, charName);
    if (!newName || !newName.trim() || newName.trim() === charName) return;

    const trimmed = newName.trim();
    const tree = state.novel.characterTree || {};
    if (tree[trimmed]) {
      showToast(`已有同名角色【${trimmed}】，如需整合请使用「合并」功能。`);
      return;
    }

    // 迁移 characterTree
    tree[trimmed] = { ...tree[charName], character_name: trimmed };
    delete tree[charName];

    // 同步迁移章节剧本中的对话人
    let updatedLines = 0;
    if (state.novel.chapters && Array.isArray(state.novel.chapters)) {
      state.novel.chapters.forEach(ch => {
        (ch.segments || []).forEach(seg => {
          if (seg.speaker === charName) {
            seg.speaker = trimmed;
            updatedLines++;
          }
        });
      });
    }

    // 同步迁移台词引用缓存
    if (state.extractedQuotes[charName]) {
      state.extractedQuotes[trimmed] = state.extractedQuotes[charName];
      delete state.extractedQuotes[charName];
    }

    state.selectedCharName = trimmed;
    StorageManager.saveCurrentNovel(state.novel);

    renderTree();
    selectCharacter(trimmed);
    showToast(`✏️ 角色【${charName}】已重命名为【${trimmed}】！`);
  }

  function handleDeleteChar() {
    const charName = state.selectedCharName;
    if (charName === "旁白") {
      showToast("旁白不可删除。若需更换音色，请点击「更换音色」挑选。");
      return;
    }

    if (!confirm(`确定要从角色树中删除角色【${charName}】吗？删除后其台词将自动转为旁白朗读。`)) return;

    const tree = state.novel.characterTree || {};
    delete tree[charName];

    let reassigned = 0;
    if (state.novel.chapters && Array.isArray(state.novel.chapters)) {
      state.novel.chapters.forEach(ch => {
        (ch.segments || []).forEach(seg => {
          if (seg.speaker === charName) {
            seg.speaker = "旁白";
            seg.type = "narration";
            reassigned++;
          }
        });
      });
    }

    if (state.extractedQuotes[charName]) {
      delete state.extractedQuotes[charName];
    }

    state.selectedCharName = "旁白";
    StorageManager.saveCurrentNovel(state.novel);

    // 跨模块通知更新
    window.dispatchEvent(new CustomEvent("novelapp:characterupdated", { detail: { characterName: charName, deleted: true } }));

    renderTree();
    selectCharacter("旁白");
    showToast(`🗑️ 角色【${charName}】已删除，其原有的 ${reassigned} 句台词已自动归并为旁白演播。`);
  }

  /**
   * 一键清理角色音频树中所有 0 台词的冗余角色（瘦身清理）
   */
  function batchCleanZeroLineCharacters() {
    const tree = state.novel?.characterTree || {};
    const candidates = [];

    for (const [charName] of Object.entries(tree)) {
      if (charName === "旁白") continue;
      const quoteCount = (state.extractedQuotes[charName] || []).length;
      
      // 检查章节数据中的实际台词数
      let dialogueCount = 0;
      if (state.novel.chapters && Array.isArray(state.novel.chapters)) {
        state.novel.chapters.forEach(ch => {
          (ch.segments || []).forEach(seg => {
            if (seg.speaker === charName) dialogueCount++;
          });
        });
      }

      if (quoteCount === 0 && dialogueCount === 0) {
        candidates.push(charName);
      }
    }

    if (candidates.length === 0) {
      showToast("当前角色树非常精炼健康，没有检测到 0 台词的冗余角色！");
      return;
    }

    const previewNames = candidates.slice(0, 8).join("、");
    const moreText = candidates.length > 8 ? ` 等共 ${candidates.length} 位角色` : "";
    if (!confirm(`检测到 ${candidates.length} 位 0 台词的冗余角色：\n【${previewNames}${moreText}】\n\n确定要一键清理它们吗？清理后角色音频树将大幅瘦身！`)) {
      return;
    }

    candidates.forEach((name) => {
      delete tree[name];
      if (state.extractedQuotes[name]) {
        delete state.extractedQuotes[name];
      }
    });

    if (candidates.includes(state.selectedCharName)) {
      state.selectedCharName = "旁白";
    }

    StorageManager.saveCurrentNovel(state.novel);

    // 广播跨视图事件通知 Studio 和素材库
    window.dispatchEvent(new CustomEvent("novelapp:characterupdated", { detail: { batchCleaned: true, count: candidates.length } }));

    renderTree();
    selectCharacter(state.selectedCharName || "旁白");
    showToast(`🧹 已成功清理 ${candidates.length} 位冗余角色，角色树已完成瘦身！`);
  }

  function openMergeCharModal() {
    const charName = state.selectedCharName;
    if (charName === "旁白") {
      showToast("旁白不可被合并至其他角色。");
      return;
    }

    els.mergeSourceCharName.textContent = charName;
    const tree = state.novel.characterTree || {};
    const candidates = Object.keys(tree).filter(c => c !== charName);

    els.mergeTargetCharSelect.innerHTML = candidates.map(c => `
      <option value="${escapeAttr(c)}">
        ${c === "旁白" ? "🎙️ 旁白演播" : `🗣️ ${escapeHtml(c)} (${MS_VOICE_MAP[tree[c]?.voice_name]?.name || tree[c]?.voice_name})`}
      </option>
    `).join("");

    ModalManager.open(els.mergeCharModal);
  }

  function handleConfirmMerge() {
    const sourceChar = state.selectedCharName;
    const targetChar = els.mergeTargetCharSelect.value;
    if (!sourceChar || !targetChar || sourceChar === targetChar) return;

    const tree = state.novel.characterTree || {};
    delete tree[sourceChar];

    let reassigned = 0;
    if (state.novel.chapters && Array.isArray(state.novel.chapters)) {
      state.novel.chapters.forEach(ch => {
        (ch.segments || []).forEach(seg => {
          if (seg.speaker === sourceChar) {
            seg.speaker = targetChar;
            seg.type = (targetChar === "旁白") ? "narration" : "dialogue";
            reassigned++;
          }
        });
      });
    }

    if (state.extractedQuotes[sourceChar]) {
      if (!state.extractedQuotes[targetChar]) state.extractedQuotes[targetChar] = [];
      state.extractedQuotes[targetChar].push(...state.extractedQuotes[sourceChar]);
      delete state.extractedQuotes[sourceChar];
    }

    state.selectedCharName = targetChar;
    StorageManager.saveCurrentNovel(state.novel);

    // 跨模块通知更新
    window.dispatchEvent(new CustomEvent("novelapp:characterupdated", { detail: { sourceChar, targetChar, merged: true } }));

    ModalManager.close(els.mergeCharModal);
    renderTree();
    selectCharacter(targetChar);
    showToast(`🔀 已成功将【${sourceChar}】的台词全部合并至【${targetChar}】！`);
  }

  function handlePlayAllCharLines() {
    const charName = state.selectedCharName;
    const quotes = state.extractedQuotes[charName] || [];
    if (!quotes.length) {
      showToast(`角色【${charName}】暂无可连续试听的台词。`);
      return;
    }

    if (state.isPlayingAllLines) {
      state.isPlayingAllLines = false;
      AudioEngine.stop();
      stopWaveformAnimation();
      els.playAllCharLinesBtn.textContent = "▶ 连放全部台词";
      els.playAllCharLinesBtn.classList.remove("is-playing");
      return;
    }

    state.isPlayingAllLines = true;
    els.playAllCharLinesBtn.textContent = "⏹ 停止连放";
    els.playAllCharLinesBtn.classList.add("is-playing");
    startWaveformAnimation();

    let curIdx = 0;
    const tree = state.novel.characterTree || {};
    const conf = tree[charName] || {};

    function playNextLine() {
      if (!state.isPlayingAllLines || curIdx >= quotes.length) {
        state.isPlayingAllLines = false;
        stopWaveformAnimation();
        els.playAllCharLinesBtn.textContent = "▶ 连放全部台词";
        els.playAllCharLinesBtn.classList.remove("is-playing");
        showToast(`【${charName}】的全部台词试听完毕！`);
        return;
      }

      const q = quotes[curIdx];
      highlightDialogueCardInDeck(curIdx);

      AudioEngine.speak({
        text: q.text,
        voiceName: conf.voice_name,
        pitch: conf.pitch || 1.0,
        rate: state.speed || 1.0,
        style: q.emotion || conf.base_style || "chat",
        onEnd: () => {
          if (state.isPlayingAllLines) {
            curIdx++;
            playNextLine();
          }
        },
        onError: () => {
          if (state.isPlayingAllLines) {
            curIdx++;
            playNextLine();
          }
        },
      });
    }

    playNextLine();
  }

  function highlightDialogueCardInDeck(idx) {
    const items = els.charDialogueDeck.querySelectorAll(".dialogue-quote-item");
    items.forEach((item, i) => {
      const isCur = i === idx;
      item.classList.toggle("is-currently-playing", isCur);
      if (isCur) item.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function renderTreeSchemeDropdown() {
    if (!els.treeSchemeSelect) return;
    const schemes = getAvailableSchemes();
    let html = `<option value="" disabled selected>-- 挑选并一键替换整套角色配音树 --</option>`;

    const builtins = schemes.filter(s => s.type === "builtin");
    if (builtins.length) {
      html += `<optgroup label="🌟 官方精选角色语音树">`;
      builtins.forEach(s => {
        html += `<option value="${escapeAttr(s.id)}">${escapeHtml(s.name)} - ${escapeHtml(s.description)}</option>`;
      });
      html += `</optgroup>`;
    }

    const customs = schemes.filter(s => s.type === "custom");
    if (customs.length) {
      html += `<optgroup label="🛠️ 我的自建角色树方案">`;
      customs.forEach(s => {
        html += `<option value="${escapeAttr(s.id)}">${escapeHtml(s.name)} - ${escapeHtml(s.description)}</option>`;
      });
      html += `</optgroup>`;
    }

    const pasts = schemes.filter(s => s.type === "past");
    if (pasts.length) {
      html += `<optgroup label="📚 过往小说角色音频树">`;
      pasts.forEach(s => {
        html += `<option value="${escapeAttr(s.id)}">${escapeHtml(s.name)} - ${escapeHtml(s.description)}</option>`;
      });
      html += `</optgroup>`;
    }

    els.treeSchemeSelect.innerHTML = html;
  }

  function handleApplyTreeScheme(schemeKey) {
    if (!schemeKey) {
      showToast("请先选择配音树方案");
      return;
    }
    const schemeName = applySchemeToNovel(state.novel, schemeKey);
    if (!schemeName) {
      showToast("应用方案失败，未找到该配置");
      return;
    }

    if (els.activeTreeSchemeBadge) {
      els.activeTreeSchemeBadge.textContent = schemeName;
    }

    renderTree();
    selectCharacter(state.selectedCharName || "旁白");
    showToast(`🎉 成功切换为【${schemeName}】！整套角色配音树与旁白已刷新。`);
  }

  function renderNarratorQuickPills(currentVoiceName) {
    if (!els.narratorQuickPillsContainer) return;
    els.narratorQuickPillsContainer.innerHTML = NARRATOR_PRESETS.map((n) => {
      const isActive = n.id === currentVoiceName;
      return `
        <button class="narrator-pill-btn ${isActive ? 'is-active' : ''}" type="button" data-narrator-id="${escapeAttr(n.id)}" title="${escapeAttr(n.title)}">
          <span>🎙️ ${escapeHtml(n.name)}</span>
          <span style="font-size: 10px; opacity: 0.85;">(${escapeHtml(n.tag)})</span>
        </button>
      `;
    }).join("") + `
      <button class="narrator-pill-btn" type="button" id="browseMoreNarratorBtn" style="border-style: dashed;" title="打开完整微软音色分类库">
        <span>🌐 挑选更多音色...</span>
      </button>
    `;

    els.narratorQuickPillsContainer.querySelectorAll("[data-narrator-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const voiceId = btn.dataset.narratorId;
        const voiceObj = setNarratorVoice(state.novel, voiceId);
        selectCharacter("旁白");
        renderTree();
        auditionCharacterByName("旁白", els.auditionCharVoiceBtn);
        showToast(`演播旁白声线已自由切换为：【${voiceObj?.name || voiceId}】`);
      });
    });

    const moreBtn = document.getElementById("browseMoreNarratorBtn");
    if (moreBtn) {
      moreBtn.addEventListener("click", openMsVoiceModal);
    }
  }

  function renderCharacterDialogueDeck(charName, quotes) {
    els.charLinesSummary.textContent = `原著提取共 ${quotes.length} 句`;

    if (!quotes.length) {
      els.charDialogueDeck.innerHTML = `
        <div style="padding: 16px; color: var(--subtle); font-size: 13px; text-align: center;">
          当前小说正文中未提取到 ${escapeHtml(charName)} 的显式带引号对白，已自动为其配置标准演播声线。
        </div>
      `;
      return;
    }

    const conf = state.novel.characterTree[charName] || {};
    const voice = MS_VOICE_MAP[conf.voice_name] || { name: conf.voice_name };

    els.charDialogueDeck.innerHTML = quotes.map((q, idx) => {
      const emotionLabel = STYLE_LABELS[q.emotion] || q.emotion;
      return `
        <div class="script-dialogue-item">
          <div class="script-line-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge-role">#${idx + 1}</span>
              <strong>${escapeHtml(charName)}</strong>
              <span class="badge-voice">${escapeHtml(voice.name || conf.voice_name)}</span>
              <span style="font-size: 11px; color: var(--subtle);">${escapeHtml(emotionLabel)}</span>
            </div>
            <button class="btn-play-audition" type="button" title="听该角色演播这句台词" data-quote-idx="${idx}">▶</button>
          </div>
          <p class="script-line-text is-dialogue">“${escapeHtml(q.text)}”</p>
        </div>
      `;
    }).join("");

    // 绑定单句对白试听
    els.charDialogueDeck.querySelectorAll("[data-quote-idx]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const qIdx = Number(btn.dataset.quoteIdx);
        const quote = quotes[qIdx];

        btn.classList.add("is-playing");
        startWaveformAnimation();

        AudioEngine.speak({
          text: quote.text,
          voiceName: conf.voice_name,
          pitch: conf.pitch || 1.0,
          rate: 1.0 + (parseInt(conf.rate_offset || "0", 10) / 100),
          style: quote.emotion || conf.base_style || "chat",
          onEnd: () => {
            btn.classList.remove("is-playing");
            stopWaveformAnimation();
          },
          onError: () => {
            btn.classList.remove("is-playing");
            stopWaveformAnimation();
          },
        });
      });
    });
  }

  function auditionCharacterByName(charName, btnElement) {
    const conf = state.novel.characterTree[charName];
    if (!conf) return;

    if (btnElement) btnElement.classList.add("is-playing");
    startWaveformAnimation();

    const quotes = state.extractedQuotes[charName] || [];
    const text = quotes.length > 0 ? quotes[0].text : (MS_VOICE_MAP[conf.voice_name]?.sampleText || `${charName}在此，请听我一言！`);

    AudioEngine.speak({
      text: text,
      voiceName: conf.voice_name,
      pitch: conf.pitch || 1.0,
      rate: 1.0 + (parseInt(conf.rate_offset || "0", 10) / 100),
      style: conf.base_style || "chat",
      onEnd: () => {
        if (btnElement) btnElement.classList.remove("is-playing");
        stopWaveformAnimation();
      },
      onError: () => {
        if (btnElement) btnElement.classList.remove("is-playing");
        stopWaveformAnimation();
      },
    });
  }

  function auditionSelectedChar() {
    auditionCharacterByName(state.selectedCharName, els.auditionCharVoiceBtn);
  }

  function saveSelectedCharConfig() {
    const conf = state.novel.characterTree[state.selectedCharName];
    if (!conf) return;

    conf.pitch = Number(els.charPitchSlider.value);
    conf.rate_offset = `${els.charRateSlider.value > 0 ? "+" : ""}${els.charRateSlider.value}%`;
    conf.base_style = els.charEmotionSelect.value;

    StorageManager.saveCurrentNovel(state.novel);
    renderTree();
    showToast(`已保存角色【${state.selectedCharName}】的参数微调！`);
  }

  /* -------------------------------------------------------------
     Pick Voice Modal (Microsoft Catalog)
  ------------------------------------------------------------- */
  function openMsVoiceModal() {
    renderMsVoiceCatalog();
    ModalManager.open(els.msVoiceModal);
  }

  function renderMsVoiceCatalog() {
    // 渲染左侧分类
    const categories = [
      { key: "all", label: "🌟 全部音色" },
      { key: "aimanga", label: "🎬 AI 漫剧爆款" },
      { key: "github", label: "🔮 GitHub 开源" },
      { key: "narrator", label: "🎙️ 旁白演播" },
      { key: "youngMale", label: "⚔️ 青年男主" },
      { key: "youngFemale", label: "🌸 青年女主" },
      { key: "mature", label: "🛡️ 成熟中生" },
      { key: "elderVillain", label: "🦹 长者反派" },
      { key: "child", label: "🧒 少儿童声" },
      { key: "dialect", label: "🏮 方言特色" },
    ];

    els.catalogCategoryList.innerHTML = categories.map((cat, idx) => `
      <li class="catalog-category-item ${idx === 0 ? 'is-active' : ''}" data-cat-key="${cat.key}">
        ${escapeHtml(cat.label)}
      </li>
    `).join("");

    els.catalogCategoryList.querySelectorAll(".catalog-category-item").forEach((item) => {
      item.addEventListener("click", () => {
        els.catalogCategoryList.querySelectorAll(".catalog-category-item").forEach(i => i.classList.remove("is-active"));
        item.classList.add("is-active");
        filterMsVoiceGrid();
      });
    });

    filterMsVoiceGrid();
  }

  function filterMsVoiceGrid() {
    const activeCat = els.catalogCategoryList.querySelector(".catalog-category-item.is-active")?.dataset.catKey || "all";
    const q = (els.catalogSearchInput.value || "").trim().toLowerCase();
    const gender = els.catalogGenderFilter.value;

    const allVoices = [
      ...(AI_MANGA_VOICE_CATALOG || []),
      ...MS_VOICE_CATALOG,
      ...(GITHUB_AI_VOICE_CATALOG || []),
    ];

    const filtered = allVoices.filter((v) => {
      if (activeCat === "aimanga") {
        if (!v.id.startsWith("aimanga-") && !AI_MANGA_VOICE_CATALOG?.some(m => m.id === v.id)) return false;
      } else if (activeCat === "github") {
        if (!v.id.startsWith("github-") && !GITHUB_AI_VOICE_CATALOG?.some(g => g.id === v.id)) return false;
      } else if (activeCat !== "all" && v.category !== activeCat) {
        return false;
      }
      if (gender !== "all" && v.gender !== gender) return false;
      if (q) {
        const text = `${v.name} ${v.fullName} ${v.archetype} ${(v.tags || []).join(" ")}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    els.catalogVoiceGrid.innerHTML = filtered.map((v) => `
      <div class="catalog-voice-card">
        <div class="voice-card-header">
          <div>
            <div class="voice-card-name">${escapeHtml(v.name)}</div>
            <div class="voice-card-archetype">${escapeHtml(v.archetype)}</div>
          </div>
          <span class="badge-role">${v.gender === "male" ? "男声" : "女声"}</span>
        </div>
        <p class="voice-card-sample">“${escapeHtml(v.sampleText)}”</p>
        <div class="voice-card-tags">
          ${v.tags.map(t => `<span class="voice-tag">${escapeHtml(t)}</span>`).join("")}
        </div>
        <div class="voice-card-footer">
          <button class="secondary-button btn-sm" type="button" data-audition-voice="${escapeAttr(v.id)}">▶ 试听</button>
          <button class="primary-button btn-sm" type="button" data-pick-voice="${escapeAttr(v.id)}">选用为此角色</button>
        </div>
      </div>
    `).join("");

    // 绑定试听与选用
    els.catalogVoiceGrid.querySelectorAll("[data-audition-voice]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const voiceId = btn.dataset.auditionVoice;
        const voice = MS_VOICE_MAP[voiceId] || (GITHUB_AI_VOICE_MAP && GITHUB_AI_VOICE_MAP[voiceId]);
        AudioEngine.speak({
          text: voice?.sampleText || "天地不仁，以万物为刍狗。",
          voiceName: voiceId,
          pitch: voice?.defaultPitch || 1.0,
          rate: 1.0,
          gender: voice?.gender,
          role: voice?.category,
        });
      });
    });

    els.catalogVoiceGrid.querySelectorAll("[data-pick-voice]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const voiceId = btn.dataset.pickVoice;
        const conf = state.novel.characterTree[state.selectedCharName];
        if (conf) {
          conf.voice_name = voiceId;
          StorageManager.saveCurrentNovel(state.novel);
          selectCharacter(state.selectedCharName);
          renderTree();
          ModalManager.close(els.msVoiceModal);
          const voiceObj = MS_VOICE_MAP[voiceId] || (GITHUB_AI_VOICE_MAP && GITHUB_AI_VOICE_MAP[voiceId]);
          showToast(`已将【${state.selectedCharName}】音色更换为：${voiceObj?.name || voiceId}`);
        }
      });
    });
  }

  /* -------------------------------------------------------------
     Swap Voice Modal
  ------------------------------------------------------------- */
  function openSwapModal() {
    els.swapCharNameA.value = state.selectedCharName;
    const tree = state.novel.characterTree || {};
    const otherChars = Object.keys(tree).filter(name => name !== state.selectedCharName);

    if (otherChars.length === 0) {
      showToast("小说中暂无其他角色可供对调");
      return;
    }

    els.swapTargetSelect.innerHTML = otherChars.map(name => `
      <option value="${escapeAttr(name)}">${escapeHtml(name)} (${escapeHtml(MS_VOICE_MAP[tree[name].voice_name]?.name || GITHUB_AI_VOICE_MAP?.[tree[name].voice_name]?.name || tree[name].voice_name)})</option>
    `).join("");

    ModalManager.open(els.swapModal);
  }

  function handleConfirmSwap() {
    const charA = state.selectedCharName;
    const charB = els.swapTargetSelect.value;
    const tree = state.novel.characterTree || {};

    if (!tree[charA] || !tree[charB]) return;

    // 对调音色及参数
    const temp = { ...tree[charA] };
    tree[charA].voice_name = tree[charB].voice_name;
    tree[charA].pitch = tree[charB].pitch;
    tree[charA].rate_offset = tree[charB].rate_offset;
    tree[charA].base_style = tree[charB].base_style;

    tree[charB].voice_name = temp.voice_name;
    tree[charB].pitch = temp.pitch;
    tree[charB].rate_offset = temp.rate_offset;
    tree[charB].base_style = temp.base_style;

    StorageManager.saveCurrentNovel(state.novel);
    ModalManager.close(els.swapModal);
    selectCharacter(charA);
    renderTree();
    showToast(`已成功对调【${charA}】与【${charB}】的音色！`);
  }

  /* -------------------------------------------------------------
     Add Custom Character Modal
  ------------------------------------------------------------- */
  function openAddCharModal() {
    els.newCharNameInput.value = "";
    const all = [...MS_VOICE_CATALOG, ...(GITHUB_AI_VOICE_CATALOG || [])];
    els.newCharVoiceSelect.innerHTML = all.map(v => `
      <option value="${escapeAttr(v.id)}">${escapeHtml(v.name)} · ${escapeHtml(v.archetype)}</option>
    `).join("");
    ModalManager.open(els.addCharModal);
  }

  function handleConfirmAddChar() {
    const name = els.newCharNameInput.value.trim();
    if (!name) {
      showToast("请输入角色姓名");
      return;
    }

    const tree = state.novel.characterTree || {};
    if (tree[name]) {
      showToast("该角色已存在于当前小说树中");
      return;
    }

    const role = els.newCharRoleSelect.value;
    const voiceId = els.newCharVoiceSelect.value;

    tree[name] = {
      character_name: name,
      role: role,
      voice_name: voiceId,
      pitch: 1.0,
      rate_offset: "0%",
      base_style: "chat",
    };

    StorageManager.saveCurrentNovel(state.novel);
    ModalManager.close(els.addCharModal);
    renderTree();
    selectCharacter(name);
    showToast(`已向小说角色树添加【${name}】！`);
  }

  // 响应式跨标签页状态同步
  window.addEventListener("novelapp:tabchange", (e) => {
    if (e.detail?.targetId === "sec-tree" || e.detail?.targetId === "tree") {
      loadNovelData();
      extractNovelDialogueQuotes();
      renderTree();
      if (window.NovelAppTreeSelectedChar && state.novel?.characterTree?.[window.NovelAppTreeSelectedChar]) {
        state.selectedCharName = window.NovelAppTreeSelectedChar;
        window.NovelAppTreeSelectedChar = null;
      }
      selectCharacter(state.selectedCharName || "旁白");
    }
  });

  // 跨视图联动：当小说制作工坊或素材库删除/修改/清理角色时，实时刷新角色树
  window.addEventListener("novelapp:characterupdated", () => {
    loadNovelData();
    extractNovelDialogueQuotes();
    renderTree();
    if (!state.novel?.characterTree?.[state.selectedCharName]) {
      state.selectedCharName = "旁白";
    }
    selectCharacter(state.selectedCharName || "旁白");
  });

  // 启动
  document.addEventListener("DOMContentLoaded", init);
})();
