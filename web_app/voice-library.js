/**
 * voice-library.js - Page 3: Global Character Voice Material Library & Cross-Novel Remix Workbench
 * Provides 3 material sources (Past novels, Custom trees, Microsoft catalog)
 * with full HTML5 Drag-and-Drop cross-novel voice transplanting and scheme mixing.
 */
(() => {
  "use strict";

  const {
    MS_VOICE_CATALOG,
    MS_VOICE_MAP,
    MS_VOICE_TREE,
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
    cloneAzureFullTreeToCustom,
    cloneGitHubAiTreesToCustom,
    cloneAiMangaFullTreeToCustom,
    exportAiMangaTreeJson,
    exportAiMangaTreeMarkdown,
    renderSharedHeader,
    showToast,
    escapeHtml,
    escapeAttr,
  } = window.NovelApp;

  // DOM Elements
  const els = {
    tabPastNovelsBtn: document.getElementById("tabPastNovelsBtn"),
    tabCustomTreesBtn: document.getElementById("tabCustomTreesBtn"),
    tabMsCatalogBtn: document.getElementById("tabMsCatalogBtn"),
    tabGithubAiBtn: document.getElementById("tabGithubAiBtn"),
    tabAiMangaBtn: document.getElementById("tabAiMangaBtn"),
    tabVoiceLearnerBtn: document.getElementById("tabVoiceLearnerBtn"),
    importAiMangaTreeBtn: document.getElementById("importAiMangaTreeBtn"),
    downloadAiMangaBtn: document.getElementById("downloadAiMangaBtn"),
    importFullAzureTreeBtn: document.getElementById("importFullAzureTreeBtn"),
    importGitHubAiTreeBtn: document.getElementById("importGitHubAiTreeBtn"),
    sourceSearchInput: document.getElementById("sourceSearchInput"),
    sourceExpandAllBtn: document.getElementById("sourceExpandAllBtn"),
    sourceCollapseAllBtn: document.getElementById("sourceCollapseAllBtn"),
    createCustomTreeBtn: document.getElementById("createCustomTreeBtn"),
    addCustomGitHubTreeBtn: document.getElementById("addCustomGitHubTreeBtn"),
    sourceTreeRoot: document.getElementById("sourceTreeRoot"),
    targetNovelSelect: document.getElementById("targetNovelSelect"),
    targetCharCountBadge: document.getElementById("targetCharCountBadge"),
    targetTreeRoot: document.getElementById("targetTreeRoot"),
    addNewCharDropZone: document.getElementById("addNewCharDropZone"),
    quickSchemeApplySelect: document.getElementById("quickSchemeApplySelect"),
    quickSchemeApplyBtn: document.getElementById("quickSchemeApplyBtn"),
    targetCleanEmptyCharsBtn: document.getElementById("targetCleanEmptyCharsBtn"),
    resetTargetTreeBtn: document.getElementById("resetTargetTreeBtn"),
    remixLogBox: document.getElementById("remixLogBox"),
    remixLogCount: document.getElementById("remixLogCount"),
    saveRemixToStudioBtn: document.getElementById("saveRemixToStudioBtn"),
    saveAsCustomSchemeBtn: document.getElementById("saveAsCustomSchemeBtn"),
    exportSchemeJsonBtn: document.getElementById("exportSchemeJsonBtn"),
    importSchemeJsonBtn: document.getElementById("importSchemeJsonBtn"),
    schemeFileInput: document.getElementById("schemeFileInput"),
    quickTransplantModalBtn: document.getElementById("quickTransplantModalBtn"),
    quickTransplantModal: document.getElementById("quickTransplantModal"),
    wizardSourceSelect: document.getElementById("wizardSourceSelect"),
    wizardTargetSelect: document.getElementById("wizardTargetSelect"),
    confirmWizardTransplantBtn: document.getElementById("confirmWizardTransplantBtn"),
    saveCustomModal: document.getElementById("saveCustomModal"),
    customSchemeNameInput: document.getElementById("customSchemeNameInput"),
    customSchemeDescInput: document.getElementById("customSchemeDescInput"),
    confirmSaveCustomBtn: document.getElementById("confirmSaveCustomBtn"),

    // A/B 声线对比与题材筛选 DOM
    openAbCompareModalBtn: document.getElementById("openAbCompareModalBtn"),
    genreFilterPills: document.getElementById("genreFilterPills"),
    abCompareModal: document.getElementById("abCompareModal"),
    abCompareSampleText: document.getElementById("abCompareSampleText"),
    abVoiceSelectA: document.getElementById("abVoiceSelectA"),
    abVoiceSelectB: document.getElementById("abVoiceSelectB"),
    abVoiceBadgeA: document.getElementById("abVoiceBadgeA"),
    abVoiceBadgeB: document.getElementById("abVoiceBadgeB"),
    abPitchA: document.getElementById("abPitchA"),
    abPitchB: document.getElementById("abPitchB"),
    playAbVoiceABtn: document.getElementById("playAbVoiceABtn"),
    playAbVoiceBBtn: document.getElementById("playAbVoiceBBtn"),
    abSample1: document.getElementById("abSample1"),
    abSample2: document.getElementById("abSample2"),
    abSample3: document.getElementById("abSample3"),
    abSample4: document.getElementById("abSample4"),

    // 全息声学监听视听舱 DOM
    libraryMonitorTitle: document.getElementById("libraryMonitorTitle"),
    libraryVoiceBadge: document.getElementById("libraryVoiceBadge"),
    libraryArchetypeBadge: document.getElementById("libraryArchetypeBadge"),
    libraryStopAuditionBtn: document.getElementById("libraryStopAuditionBtn"),
    libraryWaveCanvas: document.getElementById("libraryWaveCanvas"),
  };

  // State
  const state = {
    activeSourceTab: "pastNovels", // pastNovels, customTrees, msCatalog
    activeGenre: "all", // all, narrator, youngMale, youngFemale, mature, elderVillain, child, dialect
    currentNovel: null,
    targetNovel: null,
    pastNovels: [],
    customTrees: {},
    sourceExpandedGroups: new Set(["root_0", "root_1", "root_2", "cat_narrator", "cat_youngMale", "cat_youngFemale", "cat_mature", "cat_elderVillain", "cat_child", "cat_dialect"]),
    sourceSearchQuery: "",
    remixLogs: [],
    transplantMap: {}, // targetCharName => { fromNovel, fromChar, fromVoice }
    isPlayingAudition: false,
  };

  let waveAnimId = null;
  function drawWaveform(isActive) {
    if (!els.libraryWaveCanvas) return;
    state.isPlayingAudition = Boolean(isActive);

    if (window.KineticVFX && typeof window.KineticVFX.drawOscilloscope === "function") {
      window.KineticVFX.drawOscilloscope(els.libraryWaveCanvas, {
        isActive: state.isPlayingAudition,
        label: "PHONIC LAB // ACOUSTIC SPECTRUM",
      });
    }

    if (state.isPlayingAudition) {
      cancelAnimationFrame(waveAnimId);
      waveAnimId = requestAnimationFrame(() => drawWaveform(true));
    }
  }

  function playAuditionVoice({ voiceId, charName = "", novelTitle = "", sampleText = "", pitch = 1.0, rate = "0%" }) {
    AudioEngine.stop();
    drawWaveform(false);

    const voiceMeta = (typeof AI_MANGA_VOICE_MAP !== "undefined" ? AI_MANGA_VOICE_MAP[voiceId] : null) || MS_VOICE_MAP[voiceId] || (typeof GITHUB_AI_VOICE_MAP !== "undefined" ? GITHUB_AI_VOICE_MAP[voiceId] : null);
    if (els.libraryMonitorTitle) {
      els.libraryMonitorTitle.textContent = `声学监听演播：【${novelTitle || "素材库"}】${charName ? `${charName} · ` : ""}${voiceMeta?.name || voiceId}`;
    }
    if (els.libraryVoiceBadge) {
      els.libraryVoiceBadge.textContent = voiceMeta ? `${voiceMeta.name} (${voiceId})` : voiceId;
    }
    if (els.libraryArchetypeBadge) {
      els.libraryArchetypeBadge.textContent = voiceMeta?.archetype || voiceMeta?.categoryLabel || "小说专属声线";
    }

    drawWaveform(true);
    if (window.KineticVFX) {
      window.KineticVFX.setSpeaking(true);
      window.KineticVFX.emitShockwave(window.innerWidth / 2, 220, 1.25);
    }

    const textToSpeak = sampleText || voiceMeta?.sampleText || `正在试听 ${charName || voiceMeta?.name || voiceId} 的小说演播声线，天地玄黄，宇宙洪荒。`;
    const numRate = typeof rate === "string" ? (parseFloat(rate) || 0) / 100 + 1.0 : Number(rate || 1.0);

    AudioEngine.speak({
      text: textToSpeak,
      voiceName: voiceId,
      pitch: Number(pitch || 1.0),
      rate: numRate,
      gender: voiceMeta?.gender,
      role: voiceMeta?.category,
      onEnd: () => {
        drawWaveform(false);
        if (window.KineticVFX) window.KineticVFX.setSpeaking(false);
        document.querySelectorAll(".btn-play-audition.is-playing").forEach((b) => b.classList.remove("is-playing"));
        if (els.libraryMonitorTitle) {
          els.libraryMonitorTitle.textContent = "声线声学监听：空闲状态。点击任意素材或角色的【▶ 试听】查看实时波形";
        }
      },
      onError: () => {
        drawWaveform(false);
        if (window.KineticVFX) window.KineticVFX.setSpeaking(false);
        document.querySelectorAll(".btn-play-audition.is-playing").forEach((b) => b.classList.remove("is-playing"));
      },
    });
  }

  /* -------------------------------------------------------------
     Initialization
  ------------------------------------------------------------- */
  function init() {
    renderSharedHeader("voiceLibrary");

    loadData();
    renderSourceTabs();
    renderSourceTree();
    populateTargetNovelSelect();
    renderTargetTree();
    initQuickSchemeControls();
    initGenreFilterPills();
    initAbCompareModal();
    initGitHubTreeBuilder();
    bindEvents();
    bindDragAndDropEvents();
    drawWaveform(false);
  }

  function loadData() {
    state.currentNovel = StorageManager.getCurrentNovel();
    state.targetNovel = JSON.parse(JSON.stringify(state.currentNovel));
    state.pastNovels = StorageManager.getPastNovels();
    state.customTrees = StorageManager.getCustomTrees();
  }

  function bindEvents() {
    // 选项卡切换
    els.tabPastNovelsBtn.addEventListener("click", () => switchSourceTab("pastNovels"));
    els.tabCustomTreesBtn.addEventListener("click", () => switchSourceTab("customTrees"));
    els.tabMsCatalogBtn.addEventListener("click", () => switchSourceTab("msCatalog"));
    if (els.tabGithubAiBtn) {
      els.tabGithubAiBtn.addEventListener("click", () => switchSourceTab("githubAi"));
    }
    if (els.tabAiMangaBtn) {
      els.tabAiMangaBtn.addEventListener("click", () => switchSourceTab("aiManga"));
    }
    if (els.tabVoiceLearnerBtn) {
      els.tabVoiceLearnerBtn.addEventListener("click", () => switchSourceTab("voiceLearner"));
    }

    // 一键导入 AI 漫剧全年龄爆款角色语音树
    if (els.importAiMangaTreeBtn) {
      els.importAiMangaTreeBtn.addEventListener("click", () => {
        const fullTree = cloneAiMangaFullTreeToCustom();
        state.customTrees = StorageManager.getCustomTrees();
        switchSourceTab("customTrees");
        showToast(`🎬 已成功将【${fullTree.name}】（共24位全年龄段角色）全量导入自建库！`);
      });
    }

    // 下载 AI 漫剧配音树配置 (同时下载 JSON 与 Markdown 档案)
    if (els.downloadAiMangaBtn) {
      els.downloadAiMangaBtn.addEventListener("click", () => {
        exportAiMangaTreeJson();
        setTimeout(() => exportAiMangaTreeMarkdown(), 400);
      });
    }

    // 一键全量复制 Azure 官方角色树至自建库
    if (els.importFullAzureTreeBtn) {
      els.importFullAzureTreeBtn.addEventListener("click", () => {
        const fullTree = cloneAzureFullTreeToCustom();
        state.customTrees = StorageManager.getCustomTrees();
        switchSourceTab("customTrees");
        showToast(`✅ 已全量复制【${fullTree.name}】至自建库！包含 22 位代表角色，无需试听即刻开箱即用。`);
      });
    }

    // 一键导入 GitHub 开源 AI 语音大模型角色树至自建库
    if (els.importGitHubAiTreeBtn) {
      els.importGitHubAiTreeBtn.addEventListener("click", () => {
        const trees = cloneGitHubAiTreesToCustom();
        state.customTrees = StorageManager.getCustomTrees();
        switchSourceTab("customTrees");
        showToast(`🎉 成功导入 ${trees.length} 套 GitHub 开源大模型配音树（Qwen3、CosyVoice、ChatTTS、F5-TTS）到自建库！`);
      });
    }

    // 自助录入与添加 GitHub / 开源语音树模态框
    if (els.addCustomGitHubTreeBtn) {
      els.addCustomGitHubTreeBtn.addEventListener("click", () => {
        ModalManager.open("addGitHubTreeModal");
      });
    }

    // 搜索过滤
    els.sourceSearchInput.addEventListener("input", (e) => {
      state.sourceSearchQuery = e.target.value.trim().toLowerCase();
      renderSourceTree();
    });

    // 展开与折叠全部
    els.sourceExpandAllBtn.addEventListener("click", () => {
      document.querySelectorAll("#sourceTreeRoot .arborist-children").forEach(el => el.style.display = "");
      document.querySelectorAll("#sourceTreeRoot .arborist-expander").forEach(el => el.classList.add("is-expanded"));
    });

    els.sourceCollapseAllBtn.addEventListener("click", () => {
      document.querySelectorAll("#sourceTreeRoot .arborist-children").forEach(el => el.style.display = "none");
      document.querySelectorAll("#sourceTreeRoot .arborist-expander").forEach(el => el.classList.remove("is-expanded"));
    });

    // 目标小说切换
    els.targetNovelSelect.addEventListener("change", handleTargetNovelChange);

    // 重置目标小说音色搭配
    els.resetTargetTreeBtn.addEventListener("click", resetTargetTree);
    if (els.targetCleanEmptyCharsBtn) {
      els.targetCleanEmptyCharsBtn.addEventListener("click", batchCleanTargetNovelCharacters);
    }

    // 保存混搭结果至当前小说
    els.saveRemixToStudioBtn.addEventListener("click", saveRemixToStudio);

    // 另存为自建角色树方案
    if (els.createCustomTreeBtn) els.createCustomTreeBtn.addEventListener("click", openSaveCustomModal);
    els.saveAsCustomSchemeBtn.addEventListener("click", openSaveCustomModal);
    els.confirmSaveCustomBtn.addEventListener("click", handleConfirmSaveCustom);

    // 导出与导入 JSON
    els.exportSchemeJsonBtn.addEventListener("click", exportSchemeJson);
    els.importSchemeJsonBtn.addEventListener("click", () => els.schemeFileInput.click());
    els.schemeFileInput.addEventListener("change", handleImportSchemeJson);

    // 快捷移植向导
    els.quickTransplantModalBtn.addEventListener("click", openQuickTransplantModal);
    els.confirmWizardTransplantBtn.addEventListener("click", handleConfirmWizardTransplant);

    // 全息声学监听视听舱停止按钮
    if (els.libraryStopAuditionBtn) {
      els.libraryStopAuditionBtn.addEventListener("click", () => {
        AudioEngine.stop();
        drawWaveform(false);
        if (window.KineticVFX) window.KineticVFX.setSpeaking(false);
        document.querySelectorAll(".btn-play-audition.is-playing").forEach((b) => b.classList.remove("is-playing"));
        if (els.libraryMonitorTitle) {
          els.libraryMonitorTitle.textContent = "声线声学监听：已停止试听";
        }
      });
    }

    // 窗口尺寸变化波形自适应
    window.addEventListener("resize", () => {
      drawWaveform(state.isPlayingAudition);
    });

    // 模态弹窗关闭统一委托给 ModalManager
    document.querySelectorAll("[data-modal-close]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const modalId = btn.getAttribute("data-modal-close");
        if (modalId) ModalManager.close(modalId);
      });
    });
  }

  function switchSourceTab(tabKey) {
    state.activeSourceTab = tabKey;
    els.tabPastNovelsBtn.classList.toggle("is-active", tabKey === "pastNovels");
    els.tabCustomTreesBtn.classList.toggle("is-active", tabKey === "customTrees");
    els.tabMsCatalogBtn.classList.toggle("is-active", tabKey === "msCatalog");
    if (els.tabGithubAiBtn) els.tabGithubAiBtn.classList.toggle("is-active", tabKey === "githubAi");
    if (els.tabAiMangaBtn) els.tabAiMangaBtn.classList.toggle("is-active", tabKey === "aiManga");
    if (els.tabVoiceLearnerBtn) els.tabVoiceLearnerBtn.classList.toggle("is-active", tabKey === "voiceLearner");

    els.createCustomTreeBtn.style.display = tabKey === "customTrees" ? "inline-flex" : "none";
    renderSourceTree();
  }

  function renderSourceTabs() {
    switchSourceTab(state.activeSourceTab);
  }

  /* -------------------------------------------------------------
     Source Material Tree Rendering (Left Pane)
  ------------------------------------------------------------- */
  function renderSourceTree() {
    const q = state.sourceSearchQuery;

    if (state.activeSourceTab === "pastNovels") {
      renderPastNovelsSource(q);
    } else if (state.activeSourceTab === "customTrees") {
      renderCustomTreesSource(q);
    } else if (state.activeSourceTab === "msCatalog") {
      renderMsCatalogSource(q);
    } else if (state.activeSourceTab === "githubAi") {
      renderGithubAiSource(q);
    } else if (state.activeSourceTab === "aiManga") {
      renderAiMangaSource(q);
    } else if (state.activeSourceTab === "voiceLearner") {
      renderVoiceLearnerSource();
    }

    bindSourceTreeAudition();
  }

  /**
   * 来源 ①：过往小说音频树 (Past Novels Archive)
   */
  function renderPastNovelsSource(q) {
    const novels = state.pastNovels;
    if (!novels || novels.length === 0) {
      els.sourceTreeRoot.innerHTML = '<li class="empty-state">暂无过往小说记录。</li>';
      return;
    }

    let html = "";
    novels.forEach((novel, nIdx) => {
      const charEntries = Object.entries(novel.characterTree || {});
      const filteredChars = charEntries.filter(([name, conf]) => {
        const voice = MS_VOICE_MAP[conf.voice_name] || {};
        if (state.activeGenre !== "all") {
          const cat = voice.category || conf.role || "mature";
          const matchesGenre = (cat === state.activeGenre) || (conf.role === state.activeGenre) || (state.activeGenre === "narrator" && name === "旁白");
          if (!matchesGenre) return false;
        }
        if (!q) return true;
        return name.toLowerCase().includes(q) ||
               (voice.name || conf.voice_name || "").toLowerCase().includes(q) ||
               novel.title.toLowerCase().includes(q);
      });

      if (q && filteredChars.length === 0 && !novel.title.toLowerCase().includes(q)) return;
      if (state.activeGenre !== "all" && filteredChars.length === 0) return;

      const groupKey = `past_${nIdx}`;
      const isExpanded = state.sourceExpandedGroups.has(groupKey) || Boolean(q) || (state.activeGenre !== "all");

      html += `
        <li class="arborist-node">
          <div class="arborist-row" data-source-group="${groupKey}">
            <span class="arborist-expander ${isExpanded ? 'is-expanded' : ''}">▶</span>
            <span class="arborist-icon">📚</span>
            <span class="arborist-label" style="font-weight: 600;">《${escapeHtml(novel.title)}》</span>
            <div class="arborist-meta">
              <span class="badge-role">${charEntries.length} 角色</span>
            </div>
          </div>

          <ul class="arborist-children" style="${isExpanded ? '' : 'display: none;'}">
      `;

      filteredChars.forEach(([charName, conf]) => {
        const voice = MS_VOICE_MAP[conf.voice_name] || { name: conf.voice_name };
        const roleLabel = ROLE_LABELS[conf.role] || conf.role;
        const payloadJson = JSON.stringify({
          sourceType: "past-novel",
          sourceOriginName: `《${novel.title}》`,
          sourceCharName: charName,
          role: conf.role,
          voiceName: conf.voice_name,
          pitch: conf.pitch || 1.0,
          rateOffset: conf.rate_offset || "0%",
          baseStyle: conf.base_style || "chat",
          sampleText: voice.sampleText || `${charName}在此，请听我一言。`,
        });

        html += `
          <li class="arborist-node">
            <div class="arborist-row is-draggable" draggable="true" data-drag-payload='${escapeAttr(payloadJson)}'>
              <span class="arborist-expander is-leaf-spacer">·</span>
              <span class="arborist-icon">🗣️</span>
              <span class="arborist-label" title="拖拽 ${escapeAttr(charName)} 音色至右侧小说进行移植">${escapeHtml(charName)}</span>
              <div class="arborist-meta">
                <span class="badge-role">${escapeHtml(roleLabel)}</span>
                <span class="badge-voice">${escapeHtml(voice.name || conf.voice_name)}</span>
                <button class="btn-play-audition" type="button" title="试听该角色音色" data-audition-voice="${escapeAttr(conf.voice_name)}" data-pitch="${conf.pitch || 1}" data-rate="${conf.rate_offset || '0%'}">▶</button>
              </div>
            </div>
          </li>
        `;
      });

      html += `
          </ul>
        </li>
      `;
    });

    els.sourceTreeRoot.innerHTML = html || '<li class="empty-state">没有匹配的过往小说角色。</li>';
  }

  /**
   * 来源 ②：自建自创角色树 (Custom Designed Trees)
   */
  function renderCustomTreesSource(q) {
    const list = Array.isArray(state.customTrees)
      ? state.customTrees
      : Object.entries(state.customTrees || {}).map(([k, v]) => ({ id: k, ...v }));

    if (list.length === 0) {
      els.sourceTreeRoot.innerHTML = '<li class="empty-state">暂无自建角色树方案。点击右上角【➕ 新建模版】可将当前配音存为新方案。</li>';
      return;
    }

    let html = "";
    list.forEach((scheme, sIdx) => {
      const charEntries = Object.entries(scheme.characterTree || scheme.characters || scheme.archetypes || {});
      const schemeId = scheme.id || `custom_${sIdx}`;
      const filtered = charEntries.filter(([name, conf]) => {
        const voiceName = conf.voice_name || conf.voiceName || "";
        const voice = MS_VOICE_MAP[voiceName] || {};
        if (state.activeGenre !== "all") {
          const cat = voice.category || conf.role || "mature";
          const matchesGenre = (cat === state.activeGenre) || (conf.role === state.activeGenre) || (state.activeGenre === "narrator" && name === "旁白");
          if (!matchesGenre) return false;
        }
        if (!q) return true;
        return name.toLowerCase().includes(q) ||
               (voice.name || voiceName).toLowerCase().includes(q) ||
               scheme.name.toLowerCase().includes(q);
      });

      if (q && filtered.length === 0 && !scheme.name.toLowerCase().includes(q)) return;
      if (state.activeGenre !== "all" && filtered.length === 0) return;

      const groupKey = `custom_${sIdx}`;
      const isExpanded = state.sourceExpandedGroups.has(groupKey) || Boolean(q) || (state.activeGenre !== "all");

      html += `
        <li class="arborist-node">
          <div class="arborist-row" data-source-group="${groupKey}">
            <span class="arborist-expander ${isExpanded ? 'is-expanded' : ''}">▶</span>
            <span class="arborist-icon">🛠️</span>
            <span class="arborist-label" style="font-weight: 600;">${escapeHtml(scheme.name)}</span>
            <div class="arborist-meta">
              <span class="badge-role">${charEntries.length} 角色</span>
              <button class="btn-delete-node" type="button" title="删除此自建角色树" data-delete-custom-tree="${escapeAttr(schemeId)}" style="background: none; border: none; cursor: pointer; font-size: 13px; opacity: 0.7; padding: 2px 4px;">🗑️</button>
            </div>
          </div>

          <ul class="arborist-children" style="${isExpanded ? '' : 'display: none;'}">
      `;

      filtered.forEach(([charName, conf]) => {
        const vName = conf.voice_name || conf.voiceName;
        const voice = MS_VOICE_MAP[vName] || { name: vName };
        const role = conf.role || "mature";
        const roleLabel = ROLE_LABELS[role] || role;

        const payloadJson = JSON.stringify({
          sourceType: "custom-tree",
          sourceOriginName: scheme.name,
          sourceCharName: charName,
          role: role,
          voiceName: vName,
          pitch: conf.pitch || 1.0,
          rateOffset: conf.rate_offset || conf.rateOffset || "0%",
          baseStyle: conf.base_style || conf.baseStyle || "chat",
          sampleText: voice.sampleText || `${charName}在此，请听我一言。`,
        });

        html += `
          <li class="arborist-node">
            <div class="arborist-row is-draggable" draggable="true" data-drag-payload='${escapeAttr(payloadJson)}'>
              <span class="arborist-expander is-leaf-spacer">·</span>
              <span class="arborist-icon">🎭</span>
              <span class="arborist-label" title="拖拽 ${escapeAttr(charName)} 音色至右侧小说进行移植">${escapeHtml(charName)}</span>
              <div class="arborist-meta">
                <span class="badge-role">${escapeHtml(roleLabel)}</span>
                <span class="badge-voice">${escapeHtml(voice.name || vName)}</span>
                <button class="btn-play-audition" type="button" title="试听该方案音色" data-audition-voice="${escapeAttr(vName)}" data-pitch="${conf.pitch || 1}" data-rate="${conf.rate_offset || conf.rateOffset || '0%'}">▶</button>
                <button class="btn-delete-node" type="button" title="从自建角色树【${escapeAttr(scheme.name)}】中删除角色【${escapeAttr(charName)}】" data-delete-custom-char="${escapeAttr(charName)}" data-scheme-id="${escapeAttr(schemeId)}" style="background: none; border: none; cursor: pointer; color: #ef4444; font-size: 13px; opacity: 0.75; padding: 2px 4px;">🗑️</button>
              </div>
            </div>
          </li>
        `;
      });

      html += `
          </ul>
        </li>
      `;
    });

    els.sourceTreeRoot.innerHTML = html || '<li class="empty-state">没有匹配的自建角色树。</li>';
  }

  /**
   * 来源 ③：微软语音内置分类树 (Microsoft Azure/Edge Voice Tree)
   */
  function renderMsCatalogSource(q) {
    const categories = [
      { key: "narrator", label: "🎙️ 旁白演播", voices: [] },
      { key: "youngMale", label: "⚔️ 青年男主", voices: [] },
      { key: "youngFemale", label: "🌸 青年女主", voices: [] },
      { key: "mature", label: "🛡️ 成熟中生", voices: [] },
      { key: "elderVillain", label: "🦹 长者反派", voices: [] },
      { key: "child", label: "🧒 少儿童声", voices: [] },
      { key: "dialect", label: "🏮 方言特色", voices: [] },
    ];

    const catMap = {};
    categories.forEach(c => catMap[c.key] = c.voices);

    MS_VOICE_CATALOG.forEach((v) => {
      if (q) {
        const text = `${v.name} ${v.fullName} ${v.archetype} ${v.tags.join(" ")}`.toLowerCase();
        if (!text.includes(q)) return;
      }
      const list = catMap[v.category] || catMap["mature"];
      list.push(v);
    });

    let html = "";
    categories.forEach((cat) => {
      if (state.activeGenre !== "all" && cat.key !== state.activeGenre) return;
      if (cat.voices.length === 0) return;

      const groupKey = `cat_${cat.key}`;
      const isExpanded = state.sourceExpandedGroups.has(groupKey) || Boolean(q) || (state.activeGenre !== "all");

      html += `
        <li class="arborist-node">
          <div class="arborist-row" data-source-group="${groupKey}">
            <span class="arborist-expander ${isExpanded ? 'is-expanded' : ''}">▶</span>
            <span class="arborist-icon">📁</span>
            <span class="arborist-label" style="font-weight: 600;">${escapeHtml(cat.label)}</span>
            <div class="arborist-meta">
              <span class="badge-role">${cat.voices.length} 款音色</span>
            </div>
          </div>

          <ul class="arborist-children" style="${isExpanded ? '' : 'display: none;'}">
      `;

      cat.voices.forEach((v) => {
        const payloadJson = JSON.stringify({
          sourceType: "ms-voice",
          sourceOriginName: "微软内置语音树",
          sourceCharName: v.name,
          role: v.category,
          voiceName: v.id,
          pitch: v.defaultPitch || 1.0,
          rateOffset: `${Math.round((v.defaultRate || 0) * 100)}%`,
          baseStyle: (v.styles && v.styles[0]) || "chat",
          sampleText: v.sampleText,
        });

        html += `
          <li class="arborist-node">
            <div class="arborist-row is-draggable" draggable="true" data-drag-payload='${escapeAttr(payloadJson)}'>
              <span class="arborist-expander is-leaf-spacer">·</span>
              <span class="arborist-icon">🎙️</span>
              <span class="arborist-label" title="${escapeAttr(v.archetype)}">${escapeHtml(v.name)} <span style="font-size: 11.5px; color: var(--subtle); font-weight: normal;">· ${escapeHtml(v.archetype.split("·")[0] || "")}</span></span>
              <div class="arborist-meta">
                <span class="badge-voice">${escapeHtml(v.name)}</span>
                <button class="btn-play-audition" type="button" title="试听该微软音色" data-audition-voice="${escapeAttr(v.id)}" data-pitch="${v.defaultPitch || 1}" data-sample="${escapeAttr(v.sampleText)}">▶</button>
              </div>
            </div>
          </li>
        `;
      });

      html += `
          </ul>
        </li>
      `;
    });

    els.sourceTreeRoot.innerHTML = html || '<li class="empty-state">没有找到匹配的微软音色。</li>';
  }

  /**
   * 来源 ④：GitHub 开源 AI 语音大模型库 (Alexandria Qwen3, CosyVoice, ChatTTS, F5-TTS, GPT-SoVITS, Fish-Speech)
   */
  function renderGithubAiSource(q) {
    const list = GITHUB_AI_VOICE_CATALOG || [];
    if (list.length === 0) {
      els.sourceTreeRoot.innerHTML = '<li class="empty-state">暂无 GitHub 开源 AI 语音模型数据。</li>';
      return;
    }

    const repos = [
      {
        key: "alexandria",
        name: "Alexandria · Qwen3-TTS 评书演播",
        repo: "Finrandojin/alexandria-audiobook",
        stars: "GitHub 8.2k",
        modelTech: "Qwen3-TTS 8B · LoRA 评书与修仙演播",
        voices: [],
      },
      {
        key: "cosyvoice",
        name: "CosyVoice-300M · 阿里多情感语音",
        repo: "FunAudioLLM/CosyVoice",
        stars: "GitHub 14.5k",
        modelTech: "CosyVoice Flow-Matching 多情感大模型",
        voices: [],
      },
      {
        key: "chattts",
        name: "ChatTTS · 拟真对话笑叹对白",
        repo: "2noise/ChatTTS",
        stars: "GitHub 36.8k",
        modelTech: "Conversational Diffusion 自然笑叹断句",
        voices: [],
      },
      {
        key: "f5tts",
        name: "F5-TTS · 流匹配高保真语音",
        repo: "SWivid/F5-TTS",
        stars: "GitHub 11.2k",
        modelTech: "Flow-Matching DiT 赛博科幻史诗",
        voices: [],
      },
      {
        key: "gptsovits",
        name: "GPT-SoVITS · 仙侠传世音色克隆",
        repo: "RVC-Boss/GPT-SoVITS",
        stars: "GitHub 42.1k",
        modelTech: "Few-Shot Voice Cloning 经典仙侠",
        voices: [],
      },
      {
        key: "fishspeech",
        name: "Fish-Speech · 超清双语广播剧",
        repo: "fishaudio/fish-speech",
        stars: "GitHub 19.3k",
        modelTech: "Dual-Token Autoregressive 电影级电台",
        voices: [],
      },
    ];

    const repoMap = {};
    repos.forEach((r) => { repoMap[r.key] = r; });

    list.forEach((v) => {
      if (q) {
        const text = `${v.name} ${v.fullName} ${v.archetype} ${v.tags.join(" ")} ${v.repo} ${v.modelTech}`.toLowerCase();
        if (!text.includes(q)) return;
      }
      if (state.activeGenre !== "all" && state.activeGenre !== "opensource") {
        if (v.category !== state.activeGenre) return;
      }

      if (v.repo.includes("alexandria")) repoMap.alexandria.voices.push(v);
      else if (v.repo.includes("CosyVoice")) repoMap.cosyvoice.voices.push(v);
      else if (v.repo.includes("ChatTTS")) repoMap.chattts.voices.push(v);
      else if (v.repo.includes("F5-TTS")) repoMap.f5tts.voices.push(v);
      else if (v.repo.includes("GPT-SoVITS")) repoMap.gptsovits.voices.push(v);
      else if (v.repo.includes("fish-speech")) repoMap.fishspeech.voices.push(v);
      else repoMap.alexandria.voices.push(v);
    });

    let html = "";
    repos.forEach((r) => {
      if (r.voices.length === 0) return;

      const groupKey = `gh_${r.key}`;
      const isExpanded = state.sourceExpandedGroups.has(groupKey) || Boolean(q) || (state.activeGenre !== "all");

      html += `
        <li class="arborist-node">
          <div class="arborist-row" data-source-group="${groupKey}">
            <span class="arborist-expander ${isExpanded ? 'is-expanded' : ''}">▶</span>
            <span class="arborist-icon">🔮</span>
            <span class="arborist-label" style="font-weight: 600;">${escapeHtml(r.name)}</span>
            <div class="arborist-meta">
              <span class="badge-role" style="color: var(--cyan); border-color: rgba(0, 229, 255, 0.4);">${escapeHtml(r.stars)}</span>
              <span class="badge-voice">${r.voices.length} 款开源音色</span>
            </div>
          </div>

          <ul class="arborist-children" style="${isExpanded ? '' : 'display: none;'}">
      `;

      r.voices.forEach((v) => {
        const roleLabel = ROLE_LABELS[v.category] || v.category;
        const payloadJson = JSON.stringify({
          sourceType: "github-ai-voice",
          sourceOriginName: r.name,
          sourceCharName: v.name,
          role: v.category,
          voiceName: v.id,
          pitch: v.defaultPitch || 1.0,
          rateOffset: `${Math.round((v.defaultRate || 0) * 100)}%`,
          baseStyle: (v.styles && v.styles[0]) || "chat",
          sampleText: v.sampleText,
        });

        html += `
          <li class="arborist-node">
            <div class="arborist-row is-draggable" draggable="true" data-drag-payload='${escapeAttr(payloadJson)}'>
              <span class="arborist-expander is-leaf-spacer">·</span>
              <span class="arborist-icon">${v.gender === "male" ? "⚔️" : "🌸"}</span>
              <span class="arborist-label" title="${escapeAttr(v.archetype)} · ${escapeAttr(v.modelTech)}">
                ${escapeHtml(v.name)}
                <span style="font-size: 11px; color: var(--subtle); font-weight: normal;">· ${escapeHtml(v.archetype.split("·")[0] || "")}</span>
              </span>
              <div class="arborist-meta">
                <span class="badge-role" style="font-size: 10.5px;">${escapeHtml(roleLabel)}</span>
                <span class="badge-voice" style="color: var(--cyan); font-size: 10.5px;">${escapeHtml(v.name.split("·")[0])}</span>
                <button class="btn-play-audition" type="button" title="试听该开源大模型音色" data-audition-voice="${escapeAttr(v.id)}" data-pitch="${v.defaultPitch || 1}" data-sample="${escapeAttr(v.sampleText)}">▶</button>
              </div>
            </div>
          </li>
        `;
      });

      html += `
          </ul>
        </li>
      `;
    });

    els.sourceTreeRoot.innerHTML = html || '<li class="empty-state">没有找到匹配的 GitHub 开源 AI 音色。</li>';
  }

  /**
   * 来源 ⑤：AI 漫剧全年龄段爆款角色语音库 (AI Comic Drama Voice Universe)
   */
  function renderAiMangaSource(q) {
    const list = AI_MANGA_VOICE_CATALOG || [];
    if (list.length === 0) {
      els.sourceTreeRoot.innerHTML = '<li class="empty-state">暂无 AI 漫剧角色语音数据。</li>';
      return;
    }

    const groups = [
      { key: "narrator", name: "🎬 漫剧全知史诗旁白 & 高能卡点解说", desc: "主线叙事 · 电影质感与高能反转", voices: [] },
      { key: "baby_mascot", name: "🍼 幼年萌宝 & 团宠仙宠 (3~12岁)", desc: "奶团子、机敏正太、化形灵狐", voices: [] },
      { key: "shonen_youth", name: "⚔️ 少年逆袭 & 宗门同门 (13~18岁)", desc: "热血废柴、元气少侠、娇憨师妹、傲娇青梅", voices: [] },
      { key: "young_leads", name: "👑 青年霸总 / 孤傲仙尊 / 清冷神女 (19~28岁)", desc: "冷面低音炮、白月光公子、高岭之花、凄美千金、大女主反杀", voices: [] },
      { key: "mature_elders", name: "🛡️ 成熟中生 / 宗门大能 / 妖皇御姐 (30~50岁)", desc: "威严掌门、气场御姐、豪门主母、慈爱师娘", voices: [] },
      { key: "boss_villain", name: "👹 沧桑老者 / 阴鸷魔尊 / 恶毒老妪 (60~100+岁)", desc: "扫地神僧、枯骨魔尊、终极大Boss、恶毒嬷嬷", voices: [] },
    ];

    const groupMap = {};
    groups.forEach((g) => { groupMap[g.key] = g; });

    list.forEach((v) => {
      if (q) {
        const text = `${v.name} ${v.fullName} ${v.archetype} ${v.tags.join(" ")} ${v.series} ${v.ageBand}`.toLowerCase();
        if (!text.includes(q)) return;
      }
      if (state.activeGenre !== "all" && state.activeGenre !== "manga") {
        if (v.category !== state.activeGenre) return;
      }

      if (v.category === "narrator") groupMap.narrator.voices.push(v);
      else if (v.category === "child") groupMap.baby_mascot.voices.push(v);
      else if (v.ageGroup === "young" && (v.ageBand.includes("14") || v.ageBand.includes("15") || v.ageBand.includes("17") || v.ageBand.includes("18"))) groupMap.shonen_youth.voices.push(v);
      else if (v.ageGroup === "elder" || v.category === "elderVillain") groupMap.boss_villain.voices.push(v);
      else if (v.ageGroup === "adult" && (v.ageBand.includes("30") || v.ageBand.includes("40") || v.ageBand.includes("50"))) groupMap.mature_elders.voices.push(v);
      else groupMap.young_leads.voices.push(v);
    });

    let html = "";
    groups.forEach((g) => {
      if (g.voices.length === 0) return;
      const groupKey = `manga_${g.key}`;
      const isExpanded = state.sourceExpandedGroups.has(groupKey) || Boolean(q) || (state.activeGenre !== "all");

      html += `
        <li class="arborist-node">
          <div class="arborist-row" data-source-group="${groupKey}">
            <span class="arborist-expander ${isExpanded ? 'is-expanded' : ''}">▶</span>
            <span class="arborist-icon">🎬</span>
            <span class="arborist-label" style="font-weight: 600;">${escapeHtml(g.name)}</span>
            <div class="arborist-meta">
              <span class="badge-role" style="color: #ec4899; border-color: rgba(236, 72, 153, 0.45); font-size: 10.5px;">${escapeHtml(g.desc.split("·")[0] || "")}</span>
              <span class="badge-voice">${g.voices.length} 位漫剧角色</span>
            </div>
          </div>

          <ul class="arborist-children" style="${isExpanded ? '' : 'display: none;'}">
      `;

      g.voices.forEach((v) => {
        const roleLabel = ROLE_LABELS[v.category] || v.category;
        const payloadJson = JSON.stringify({
          sourceType: "aimanga-voice",
          sourceOriginName: "AI漫剧全年龄库",
          sourceCharName: v.name.split(" · ")[0],
          role: v.category,
          voiceName: v.id,
          pitch: v.defaultPitch || 1.0,
          rateOffset: `${(v.defaultRate || 0) >= 0 ? "+" : ""}${Math.round((v.defaultRate || 0) * 100)}%`,
          baseStyle: (v.styles && v.styles[0]) || "chat",
          sampleText: v.sampleText,
          ageBand: v.ageBand,
          archetype: v.archetype,
        });

        html += `
          <li class="arborist-node">
            <div class="arborist-row is-draggable" draggable="true" data-drag-payload='${escapeAttr(payloadJson)}'>
              <span class="arborist-expander is-leaf-spacer">·</span>
              <span class="arborist-icon">${v.gender === "male" ? "⚔️" : "🌸"}</span>
              <span class="arborist-label" title="${escapeAttr(v.archetype)} · ${escapeAttr(v.ageBand)}">
                <strong>${escapeHtml(v.name.split(" · ")[0])}</strong>
                <span style="font-size: 11px; color: var(--subtle); font-weight: normal;"> · ${escapeHtml(v.archetype.split("·")[0] || "")}</span>
              </span>
              <div class="arborist-meta">
                <span class="badge-role" style="font-size: 10px; color: #ec4899; border-color: rgba(236, 72, 153, 0.35);">${escapeHtml(v.ageBand)}</span>
                <span class="badge-voice" style="font-size: 10px;">${escapeHtml(v.id.replace("zh-CN-", "").replace("Neural", ""))}</span>
                <button class="btn-play-audition" type="button" title="试听该漫剧角色音色" data-audition-voice="${escapeAttr(v.id)}" data-pitch="${v.defaultPitch || 1}" data-sample="${escapeAttr(v.sampleText)}">▶</button>
              </div>
            </div>
          </li>
        `;
      });

      html += `
          </ul>
        </li>
      `;
    });

    els.sourceTreeRoot.innerHTML = html || '<li class="empty-state">没有找到匹配的 AI 漫剧角色音色。</li>';
  }

  /* -------------------------------------------------------------
     Source Material ⑥：声音自主学习与自创专属语音树 (Voice Learner Studio)
  ------------------------------------------------------------- */
  let learnerCurrentAudioB64 = null;
  let learnerCurrentFileName = "";
  let learnerLastAnalysis = null;

  function generateDemoToneWavBase64(freqHz, duration = 1.5) {
    const sampleRate = 16000;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, numSamples * 2, true);
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sample = 0.5 * Math.sin(2 * Math.PI * freqHz * t) + 0.25 * Math.sin(2 * Math.PI * freqHz * 2 * t);
      const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
      view.setInt16(44 + i * 2, intSample, true);
    }
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function renderVoiceLearnerSource() {
    const userTrees = StorageManager.getCustomTrees();
    const treeList = Array.isArray(userTrees) ? userTrees : Object.values(userTrees || {});
    const learnedTrees = treeList.filter(t => t.id && t.id.startsWith("custom_learned_"));

    let html = `
      <div class="learner-studio-wrap">
        <!-- 头部导引 -->
        <div class="learner-hero-banner">
          <div class="learner-hero-title">
            <span>🎧</span>
            <span>声音学习与自创专属语音树 (Voice Timbre Learning Studio)</span>
          </div>
          <p class="learner-hero-desc">
            自由导入您喜欢的声音音频（MP3、WAV、M4A 等），AI 声学引擎自动提取基频 F0、音色共振峰与演播节奏，克隆匹配高保真神经声线，为您构建独立的专属全角色配音树！
          </p>
        </div>

        <!-- 1. 音频导入区 -->
        <div class="learner-drop-zone" id="learnerDropZone">
          <span class="learner-drop-icon">📁</span>
          <div class="learner-drop-text">点击选择音频文件 或 直接拖拽音频文件到此处</div>
          <div class="learner-drop-hint">支持 .mp3, .wav, .m4a, .aac, .flac 格式（建议 1~30 秒清晰纯人声录音）</div>
          <input type="file" id="learnerFileInput" accept="audio/*" style="display:none;" />

          <div style="margin-top: 12px; font-size: 11.5px; color: var(--subtle);">
            或一键加载声部经典样本快速体验：
          </div>
          <div class="learner-preset-chips" id="learnerDemoChips">
            <button type="button" class="learner-preset-btn" data-freq="118" data-title="沉稳霸总男低音 (118Hz)">🎵 样本1: 霸总男低音 (118Hz)</button>
            <button type="button" class="learner-preset-btn" data-freq="150" data-title="鲜衣怒马少侠 (150Hz)">🎵 样本2: 热血少侠 (150Hz)</button>
            <button type="button" class="learner-preset-btn" data-freq="225" data-title="清冷冰山神女 (225Hz)">🎵 样本3: 冰山神女 (225Hz)</button>
            <button type="button" class="learner-preset-btn" data-freq="280" data-title="软萌奶气小千金 (280Hz)">🎵 样本4: 奶气幼童 (280Hz)</button>
          </div>
        </div>

        <!-- 2. 音频即时试听与分析启动条 -->
        <div id="learnerPlayerSection" style="${learnerCurrentAudioB64 ? '' : 'display:none;'}" class="tactical-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="font-size: 13px; color: var(--text);">已加载音频：<span id="learnerLoadedFileName" style="color: #10b981;">${escapeHtml(learnerCurrentFileName || "user_audio.wav")}</span></strong>
            <button type="button" id="learnerReuploadBtn" class="tree-mini-btn">重新选择</button>
          </div>
          <audio id="learnerAudioElement" controls style="width: 100%; margin-bottom: 8px;" src="${learnerCurrentAudioB64 ? 'data:audio/wav;base64,' + learnerCurrentAudioB64 : ''}"></audio>
          <button type="button" id="btnRunAcousticAnalysis" class="primary-button" style="width: 100%; background: #10b981; border-color: #059669; font-weight: 700;">
            ⚡ 立即开始声学特征分析与音色学习
          </button>
        </div>

        <!-- 3. 声学特征学习结果仪表盘 -->
        <div id="learnerResultSection" style="${learnerLastAnalysis ? '' : 'display:none;'}" class="tactical-card" style="border-color: rgba(16, 185, 129, 0.45);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="font-size: 13px; font-weight: 700; color: #10b981; display: flex; align-items: center; gap: 6px;">
              <span>🧬</span>
              <span>AI 声学特征与音色学习报告</span>
            </div>
            <span class="badge-role" style="color: #10b981; border-color: rgba(16, 185, 129, 0.45);">匹配度 <span id="learnerMatchScore">${learnerLastAnalysis?.similarity_score || 97}%</span></span>
          </div>

          <div class="learner-stats-grid">
            <div class="learner-stat-card">
              <span class="learner-stat-label">基频 (F0)</span>
              <span class="learner-stat-val" id="learnerF0Val">${learnerLastAnalysis?.f0_pitch_hz || 0} Hz</span>
              <span class="learner-stat-sub" id="learnerVoiceBandVal">${escapeHtml(learnerLastAnalysis?.voice_band || "检测中")}</span>
            </div>
            <div class="learner-stat-card">
              <span class="learner-stat-label">语速与节奏</span>
              <span class="learner-stat-val" id="learnerTempoVal">${learnerLastAnalysis?.speech_rate_wpm || 220} WPM</span>
              <span class="learner-stat-sub" id="learnerTempoLabel">${escapeHtml(learnerLastAnalysis?.tempo_label || "适中")}</span>
            </div>
            <div class="learner-stat-card">
              <span class="learner-stat-label">最佳匹配底模</span>
              <span class="learner-stat-val" id="learnerBaseVoiceVal" style="font-size: 12px;">${escapeHtml(learnerLastAnalysis?.recommended_voice?.replace('zh-CN-', '') || '')}</span>
              <span class="learner-stat-sub" id="learnerOffsetVal">音调 ${escapeHtml(learnerLastAnalysis?.recommended_pitch_offset || '+0Hz')}</span>
            </div>
            <div class="learner-stat-card">
              <span class="learner-stat-label">推荐戏剧戏路</span>
              <span class="learner-stat-val" id="learnerRoleVal" style="font-size: 13px;">${escapeHtml(learnerLastAnalysis?.base_archetype || "小说主役")}</span>
              <span class="learner-stat-sub">${learnerLastAnalysis?.estimated_gender === 'male' ? '男声' : '女声'}</span>
            </div>
          </div>

          <div style="margin-top: 10px;">
            <span style="font-size: 11px; color: var(--subtle);">声学特性标签：</span>
            <div class="learner-tags-wrap" id="learnerTagsWrap">
              ${(learnerLastAnalysis?.timbre_tags || []).map(tag => `<span class="learner-tag-badge">${escapeHtml(tag)}</span>`).join('')}
            </div>
          </div>

          <!-- 克隆效果即时试听 -->
          <div class="learner-audition-card" style="margin-top: 12px;">
            <label style="font-size: 11.5px; color: var(--subtle); display: block; margin-bottom: 4px;">试听学习克隆后的合成效果：</label>
            <textarea id="learnerAuditionText" class="text-input" rows="2" style="font-size: 12px; margin-bottom: 8px;">天道崩塌，诸神陨落。少年从深渊中爬出，手中的残破断剑正发出嗜血的低鸣！</textarea>
            <div style="display: flex; gap: 8px;">
              <button type="button" id="btnAuditionClonedVoice" class="primary-button btn-sm" style="flex: 1; background: #10b981; border-color: #059669;">
                ▶ 试听 AI 学习克隆音色
              </button>
              <button type="button" id="btnStopAuditionClonedVoice" class="secondary-button btn-sm">⏹ 停止</button>
            </div>
          </div>

          <!-- 生成与保存用户专属语音树 -->
          <div class="learner-tree-builder" style="margin-top: 14px;">
            <div style="font-size: 13px; font-weight: 700; color: #10b981; margin-bottom: 8px;">
              🌳 生成用户独立专属语音树
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
              <label>
                <span class="field-label" style="font-size: 11px;">语音树名称</span>
                <input id="learnerTreeNameInput" class="text-input" type="text" value="我的专属AI学习配音树" />
              </label>
              <label>
                <span class="field-label" style="font-size: 11px;">赋予主要角色名</span>
                <input id="learnerRoleNameInput" class="text-input" type="text" value="主角男声" />
              </label>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" id="btnConfirmBuildTree" class="primary-button" style="flex: 2; background: #10b981; border-color: #059669; font-weight: 700;">
                🌳 一键生成并保存为我的专属语音树
              </button>
              <button type="button" id="btnExportLearnedJson" class="secondary-button" style="flex: 1;">
                💾 下载配置 (JSON)
              </button>
            </div>
          </div>
        </div>

        <!-- 4. 已有自创语音树列表 -->
        <div style="margin-top: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="font-size: 13px; color: var(--text);">已训练生成的专属语音树 (${learnedTrees.length})</strong>
          </div>
          <div id="learnedTreesList">
            ${learnedTrees.length === 0 ? '<div class="empty-state" style="padding: 16px;">暂无自主训练语音树。请在上方上传音频提取音色后生成！</div>' : ''}
            ${learnedTrees.map(t => {
              const chars = t.characters || t.characterTree || {};
              const charKeys = Object.keys(chars);
              return `
                <div class="tactical-card" style="margin-bottom: 8px; padding: 10px 12px; border-color: rgba(16, 185, 129, 0.3);">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <strong style="color: #10b981; font-size: 13px;">${escapeHtml(t.name)}</strong>
                      <span style="font-size: 11px; color: var(--subtle); margin-left: 6px;">共 ${charKeys.length} 位角色</span>
                    </div>
                    <div style="display: flex; gap: 6px;">
                      <button type="button" class="tree-mini-btn" data-apply-learned-tree="${escapeAttr(t.id)}" style="color: #10b981; border-color: rgba(16, 185, 129, 0.5);">✅ 应用到当前小说</button>
                      <button type="button" class="tree-mini-btn" data-delete-learned-tree="${escapeAttr(t.id)}" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.3);">🗑️ 删除</button>
                    </div>
                  </div>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                    包含角色：${charKeys.map(k => `<span class="badge-role" style="font-size: 10px; margin-right: 4px;">${escapeHtml(k)} (${chars[k].voice_name || ''})</span>`).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    els.sourceTreeRoot.innerHTML = html;
    bindVoiceLearnerEvents();
  }

  function bindVoiceLearnerEvents() {
    const dropZone = document.getElementById("learnerDropZone");
    const fileInput = document.getElementById("learnerFileInput");
    const reuploadBtn = document.getElementById("learnerReuploadBtn");
    const playerSection = document.getElementById("learnerPlayerSection");
    const audioEl = document.getElementById("learnerAudioElement");
    const fileNameSpan = document.getElementById("learnerLoadedFileName");
    const btnRunAnalysis = document.getElementById("btnRunAcousticAnalysis");
    const btnAudition = document.getElementById("btnAuditionClonedVoice");
    const btnStopAudition = document.getElementById("btnStopAuditionClonedVoice");
    const btnBuildTree = document.getElementById("btnConfirmBuildTree");
    const btnExportJson = document.getElementById("btnExportLearnedJson");

    if (dropZone && fileInput) {
      dropZone.addEventListener("click", (e) => {
        if (e.target.closest("#learnerDemoChips")) return;
        fileInput.click();
      });

      dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("is-dragover");
      });

      dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("is-dragover");
      });

      dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("is-dragover");
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
          handleFile(e.target.files[0]);
        }
      });
    }

    if (reuploadBtn && fileInput) {
      reuploadBtn.addEventListener("click", () => fileInput.click());
    }

    function handleFile(file) {
      learnerCurrentFileName = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        const fullDataUrl = e.target.result;
        learnerCurrentAudioB64 = fullDataUrl.split(",")[1];
        if (playerSection) playerSection.style.display = "";
        if (audioEl) audioEl.src = fullDataUrl;
        if (fileNameSpan) fileNameSpan.textContent = file.name;
        showToast(`📁 已加载音频文件：${file.name}，可点击下方按钮开始声学分析！`);
      };
      reader.readAsDataURL(file);
    }

    // 预设 Demo 样本点击
    document.querySelectorAll("#learnerDemoChips button").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const freq = parseFloat(btn.dataset.freq || "120");
        const title = btn.dataset.title || "demo_sample.wav";
        learnerCurrentFileName = title;
        learnerCurrentAudioB64 = generateDemoToneWavBase64(freq, 1.6);
        const dataUrl = "data:audio/wav;base64," + learnerCurrentAudioB64;
        if (playerSection) playerSection.style.display = "";
        if (audioEl) audioEl.src = dataUrl;
        if (fileNameSpan) fileNameSpan.textContent = title;
        showToast(`🎵 已加载【${title}】样本音频！`);
      });
    });

    // 触发分析
    if (btnRunAnalysis) {
      btnRunAnalysis.addEventListener("click", async () => {
        if (!learnerCurrentAudioB64) {
          showToast("请先上传或选择一段音频！", "error");
          return;
        }
        btnRunAnalysis.disabled = true;
        btnRunAnalysis.textContent = "⏳ 正在进行高精度声学分析与音色建模...";

        try {
          const analysis = await AudioEngine.analyzeUserAudio(learnerCurrentAudioB64, learnerCurrentFileName);
          learnerLastAnalysis = analysis;
          btnRunAnalysis.disabled = false;
          btnRunAnalysis.textContent = "⚡ 立即开始声学特征分析与音色学习";
          showToast(`🎉 声学分析与音色学习完成！基频 ${analysis.f0_pitch_hz}Hz，匹配 ${analysis.recommended_voice}！`);
          renderVoiceLearnerSource();
        } catch (err) {
          btnRunAnalysis.disabled = false;
          btnRunAnalysis.textContent = "⚡ 立即开始声学特征分析与音色学习";
          showToast(err.message || "声学分析失败", "error");
        }
      });
    }

    // 试听克隆音色
    if (btnAudition) {
      btnAudition.addEventListener("click", () => {
        if (!learnerLastAnalysis) {
          showToast("请先完成声学特征分析！", "error");
          return;
        }
        const text = (document.getElementById("learnerAuditionText")?.value || "").trim() || "天道崩塌，诸神陨落。";
        AudioEngine.speak({
          text,
          voiceName: learnerLastAnalysis.recommended_voice,
          pitch: 1.0,
          rate: 1.0,
          role: learnerLastAnalysis.estimated_gender === "male" ? "youngMale" : "youngFemale",
        });
        showToast(`▶ 正在试听 AI 克隆音色【${learnerLastAnalysis.recommended_voice}】...`);
      });
    }

    if (btnStopAudition) {
      btnStopAudition.addEventListener("click", () => AudioEngine.stop());
    }

    // 生成与保存专属语音树
    if (btnBuildTree) {
      btnBuildTree.addEventListener("click", async () => {
        if (!learnerLastAnalysis) {
          showToast("请先完成声学特征分析与音色学习！", "error");
          return;
        }
        const treeName = (document.getElementById("learnerTreeNameInput")?.value || "").trim() || "我的专属AI学习配音树";
        const roleName = (document.getElementById("learnerRoleNameInput")?.value || "").trim() || "主角男声";
        const treeId = "custom_learned_" + Date.now();

        try {
          btnBuildTree.disabled = true;
          btnBuildTree.textContent = "⏳ 正在构建专属语音树...";
          const tree = await AudioEngine.trainCustomTree(treeId, treeName, learnerLastAnalysis, roleName);
          // 同时持久化到客户端 StorageManager
          StorageManager.saveCustomTree(tree.id, tree);
          state.customTrees = StorageManager.getCustomTrees();
          btnBuildTree.disabled = false;
          btnBuildTree.textContent = "🌳 一键生成并保存为我的专属语音树";
          showToast(`🎉 恭喜！专属语音树【${treeName}】生成成功，已加入自建库与配音选项！`);
          renderVoiceLearnerSource();
        } catch (err) {
          btnBuildTree.disabled = false;
          btnBuildTree.textContent = "🌳 一键生成并保存为我的专属语音树";
          showToast(err.message || "生成专属语音树失败", "error");
        }
      });
    }

    // 下载配置 JSON
    if (btnExportJson) {
      btnExportJson.addEventListener("click", () => {
        if (!learnerLastAnalysis) {
          showToast("请先完成声学特征分析！", "error");
          return;
        }
        const treeName = (document.getElementById("learnerTreeNameInput")?.value || "").trim() || "我的专属AI学习配音树";
        const exportData = {
          tree_name: treeName,
          learned_profile: learnerLastAnalysis,
          exported_at: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${treeName}_配置.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
    }

    // 树列表应用与删除
    document.querySelectorAll("[data-apply-learned-tree]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.applyLearnedTree;
        const trees = StorageManager.getCustomTrees();
        const tree = (Array.isArray(trees) ? trees : Object.values(trees || {})).find(t => t.id === id);
        if (!tree) return;
        const chars = tree.characters || tree.characterTree || {};
        const count = Object.keys(chars).length;
        // 应用到当前 targetNovel
        if (state.targetNovel) {
          const novel = state.targetNovel;
          novel.characters = novel.characters || {};
          Object.assign(novel.characters, chars);
          StorageManager.saveNovel(novel);
          renderTargetTree();
          showToast(`✅ 已将专属语音树【${tree.name}】（共${count}位角色）应用到当前小说！`);
        } else {
          showToast(`✅ 已激活专属语音树【${tree.name}】！`);
        }
      });
    });

    document.querySelectorAll("[data-delete-learned-tree]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.deleteLearnedTree;
        if (confirm("确定要删除这套专属自创语音树吗？")) {
          StorageManager.deleteCustomTree(id);
          state.customTrees = StorageManager.getCustomTrees();
          showToast("🗑️ 已删除该专属自创语音树。");
          renderVoiceLearnerSource();
        }
      });
    });
  }

  function bindSourceTreeAudition() {
    // 展开/折叠分类
    els.sourceTreeRoot.querySelectorAll("[data-source-group]").forEach((row) => {
      row.addEventListener("click", () => {
        const key = row.dataset.sourceGroup;
        const ul = row.nextElementSibling;
        const expander = row.querySelector(".arborist-expander");
        if (!ul) return;

        if (ul.style.display === "none") {
          ul.style.display = "";
          expander.classList.add("is-expanded");
          state.sourceExpandedGroups.add(key);
        } else {
          ul.style.display = "none";
          expander.classList.remove("is-expanded");
          state.sourceExpandedGroups.delete(key);
        }
      });
    });

    // 试听音色
    els.sourceTreeRoot.querySelectorAll("[data-audition-voice]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const vId = btn.dataset.auditionVoice;
        const pitch = parseFloat(btn.dataset.pitch || "1.0");
        const rate = btn.dataset.rate || "0%";
        const voiceObj = (typeof AI_MANGA_VOICE_MAP !== "undefined" ? AI_MANGA_VOICE_MAP[vId] : null) || MS_VOICE_MAP[vId] || (typeof GITHUB_AI_VOICE_MAP !== "undefined" ? GITHUB_AI_VOICE_MAP[vId] : null);
        const sample = btn.dataset.sample || voiceObj?.sampleText || "天地不仁，以万物为刍狗。";

        document.querySelectorAll(".btn-play-audition.is-playing").forEach((b) => b.classList.remove("is-playing"));
        btn.classList.add("is-playing");

        const nodeLabel = btn.closest(".arborist-node")?.querySelector(".arborist-name")?.textContent || "";
        playAuditionVoice({
          voiceId: vId,
          charName: nodeLabel,
          novelTitle: state.activeSourceTab === "pastNovels" ? "过往小说" : (state.activeSourceTab === "customTrees" ? "自建角色树" : (state.activeSourceTab === "aiManga" ? "AI漫剧全年龄库" : (state.activeSourceTab === "githubAi" ? "GitHub 开源 AI 库" : "微软语音库"))),
          sampleText: sample,
          pitch,
          rate,
        });
      });
    });

    // 删除自建角色树方案
    els.sourceTreeRoot.querySelectorAll("[data-delete-custom-tree]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const schemeId = btn.dataset.deleteCustomTree;
        const list = Array.isArray(state.customTrees) ? state.customTrees : Object.values(state.customTrees || {});
        const found = list.find((t) => t.id === schemeId);
        const sName = found ? found.name : "此方案";
        if (!confirm(`确定要彻底删除自建角色树【${sName}】吗？`)) return;

        StorageManager.deleteCustomTree(schemeId);
        state.customTrees = StorageManager.getCustomTrees();
        renderSourceTree();
        renderQuickSchemeSelect();
        showToast(`已删除自建角色树【${sName}】`);
      });
    });

    // 删除自建角色树方案中的单个角色
    els.sourceTreeRoot.querySelectorAll("[data-delete-custom-char]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const charName = btn.dataset.deleteCustomChar;
        const schemeId = btn.dataset.schemeId;
        const list = Array.isArray(state.customTrees) ? state.customTrees : Object.values(state.customTrees || {});
        const found = list.find((t) => t.id === schemeId);
        if (!found) return;

        if (!confirm(`确定要从自建角色树【${found.name}】中删除角色【${charName}】吗？`)) return;

        if (found.characterTree) delete found.characterTree[charName];
        if (found.characters) delete found.characters[charName];

        StorageManager.saveCustomTree(schemeId, found);
        state.customTrees = StorageManager.getCustomTrees();
        renderSourceTree();
        renderQuickSchemeSelect();
        showToast(`已从自建角色树【${found.name}】中删除角色【${charName}】`);
      });
    });

    if (window.KineticVFX && typeof window.KineticVFX.bindCardTilt === "function") {
      window.KineticVFX.bindCardTilt();
    }
  }

  /* -------------------------------------------------------------
     Target Remix Workbench Rendering (Right Pane)
  ------------------------------------------------------------- */
  function populateTargetNovelSelect() {
    const list = [
      { id: "current", title: `📖 当前小说：《${state.currentNovel.title}》` },
      ...state.pastNovels.map((p, idx) => ({ id: `past_${idx}`, title: `📚 过往小说：《${p.title}》`, novel: p })),
    ];

    els.targetNovelSelect.innerHTML = list.map(item => `
      <option value="${item.id}">${escapeHtml(item.title)}</option>
    `).join("");
  }

  function handleTargetNovelChange() {
    const val = els.targetNovelSelect.value;
    if (val === "current") {
      state.targetNovel = JSON.parse(JSON.stringify(state.currentNovel));
    } else if (val.startsWith("past_")) {
      const idx = parseInt(val.replace("past_", ""), 10);
      const past = state.pastNovels[idx];
      if (past) {
        state.targetNovel = JSON.parse(JSON.stringify(past));
      }
    }
    state.transplantMap = {};
    renderTargetTree();
    showToast(`已切换混搭目标小说为：《${state.targetNovel.title}》`);
  }

  function renderTargetTree() {
    const tree = state.targetNovel.characterTree || {};
    const charEntries = Object.entries(tree);

    els.targetCharCountBadge.textContent = `${charEntries.length} 位角色`;

    let html = `
      <li class="arborist-node">
        <div class="arborist-row" style="background: rgba(216, 168, 79, 0.08); font-weight: 700;">
          <span class="arborist-icon">📖</span>
          <span class="arborist-label">目标小说角色音频树 · 《${escapeHtml(state.targetNovel.title)}》</span>
          <div class="arborist-meta">
            <span class="badge-role">${charEntries.length} 角色</span>
          </div>
        </div>
      </li>
    `;

    charEntries.forEach(([charName, conf]) => {
      const voice = MS_VOICE_MAP[conf.voice_name] || { name: conf.voice_name };
      const roleLabel = ROLE_LABELS[conf.role] || conf.role;
      const transplantInfo = state.transplantMap[charName];

      html += `
        <li class="arborist-node">
          <div class="arborist-row target-drop-row" data-target-char="${escapeAttr(charName)}" title="将左侧音色节点拖拽至此处，移植给【${escapeAttr(charName)}】">
            <span class="arborist-expander is-leaf-spacer">·</span>
            <span class="arborist-icon">🎯</span>
            <span class="arborist-label" style="font-weight: 600;">
              ${escapeHtml(charName)}
              ${transplantInfo ? `<span class="transfer-badge-indicator" title="已从${escapeAttr(transplantInfo.fromNovel)}移植">⚡ 已移植自: ${escapeHtml(transplantInfo.fromChar)}</span>` : ""}
            </span>
            <div class="arborist-meta">
              <span class="badge-role">${escapeHtml(roleLabel)}</span>
              <span class="badge-voice" title="当前音色：${escapeAttr(conf.voice_name)}">${escapeHtml(voice.name || conf.voice_name)}</span>
              <button class="btn-play-audition" type="button" title="试听当前混搭音色" data-audition-target="${escapeAttr(charName)}">▶</button>
              ${charName !== "旁白" ? `<button class="btn-delete-node" type="button" title="从目标树中移除此角色" data-remove-target-char="${escapeAttr(charName)}" style="background: none; border: none; cursor: pointer; font-size: 12px; opacity: 0.6; padding: 2px 4px;">✕</button>` : ""}
            </div>
          </div>
        </li>
      `;
    });

    els.targetTreeRoot.innerHTML = html;
    bindTargetTreeEvents();
  }

  function bindTargetTreeEvents() {
    // 试听目标音色
    els.targetTreeRoot.querySelectorAll("[data-audition-target]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const charName = btn.dataset.auditionTarget;
        const conf = state.targetNovel.characterTree[charName];
        if (!conf) return;

        document.querySelectorAll(".btn-play-audition.is-playing").forEach((b) => b.classList.remove("is-playing"));
        btn.classList.add("is-playing");
        const sample = MS_VOICE_MAP[conf.voice_name]?.sampleText || `${charName}在此，请听我一言。`;
        playAuditionVoice({
          voiceId: conf.voice_name,
          charName,
          novelTitle: state.targetNovel.title || "目标小说",
          sampleText: sample,
          pitch: conf.pitch || 1.0,
          rate: conf.rate_offset || "0%",
        });
      });
    });

    // 移除目标角色
    els.targetTreeRoot.querySelectorAll("[data-remove-target-char]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const charName = btn.dataset.removeTargetChar;
        if (!confirm(`确定要从目标小说树中移除角色【${charName}】吗？`)) return;

        delete state.targetNovel.characterTree[charName];
        delete state.transplantMap[charName];

        // 若当前混搭目标就是当前小说，同步修改其章节剧本并保存
        if (els.targetNovelSelect && els.targetNovelSelect.value === "current") {
          let reassigned = 0;
          if (state.targetNovel.chapters && Array.isArray(state.targetNovel.chapters)) {
            state.targetNovel.chapters.forEach(ch => {
              (ch.segments || []).forEach(seg => {
                if (seg.speaker === charName) {
                  seg.speaker = "旁白";
                  seg.type = "narration";
                  reassigned++;
                }
              });
            });
          }
          StorageManager.saveCurrentNovel(state.targetNovel);
          state.currentNovel = JSON.parse(JSON.stringify(state.targetNovel));
          window.dispatchEvent(new CustomEvent("novelapp:characterupdated", { detail: { characterName: charName, deleted: true } }));
        }

        renderTargetTree();
        showToast(`已从目标树中移除角色【${charName}】`);
      });
    });

    if (window.KineticVFX && typeof window.KineticVFX.bindCardTilt === "function") {
      window.KineticVFX.bindCardTilt();
    }
  }

  /* -------------------------------------------------------------
     Drag and Drop Cross-Novel Transfer Core
  ------------------------------------------------------------- */
  let draggedPayload = null;

  function bindDragAndDropEvents() {
    // Drag Start from Left Source Tree
    document.addEventListener("dragstart", (e) => {
      const row = e.target.closest("[draggable='true']");
      if (!row) return;

      const raw = row.getAttribute("data-drag-payload");
      if (!raw) return;

      try {
        draggedPayload = JSON.parse(raw);
        e.dataTransfer.setData("application/json", raw);
        e.dataTransfer.effectAllowed = "copyMove";
        row.classList.add("is-dragging");
      } catch (err) {
        console.warn("Invalid drag payload", err);
      }
    });

    document.addEventListener("dragend", (e) => {
      const row = e.target.closest("[draggable='true']");
      if (row) row.classList.remove("is-dragging");
      draggedPayload = null;
      document.querySelectorAll(".drop-target-active, .drag-over").forEach(el => {
        el.classList.remove("drop-target-active", "drag-over");
      });
    });

    // Drag Over on Target Workbench Rows
    els.targetTreeRoot.addEventListener("dragover", (e) => {
      const targetRow = e.target.closest(".target-drop-row");
      if (targetRow) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        targetRow.classList.add("drop-target-active");
      }
    });

    els.targetTreeRoot.addEventListener("dragleave", (e) => {
      const targetRow = e.target.closest(".target-drop-row");
      if (targetRow) {
        targetRow.classList.remove("drop-target-active");
      }
    });

    // Drop onto Target Character Row (Transplant Voice)
    els.targetTreeRoot.addEventListener("drop", (e) => {
      e.preventDefault();
      const targetRow = e.target.closest(".target-drop-row");
      if (!targetRow) return;

      targetRow.classList.remove("drop-target-active");

      const targetCharName = targetRow.getAttribute("data-target-char");
      let payload = draggedPayload;
      if (!payload) {
        try {
          payload = JSON.parse(e.dataTransfer.getData("application/json"));
        } catch (err) {}
      }

      if (!payload || !targetCharName) return;

      executeTransplant(payload, targetCharName);
    });

    // Drop onto "Add New Character" Drop Zone
    els.addNewCharDropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      els.addNewCharDropZone.classList.add("drag-over");
    });

    els.addNewCharDropZone.addEventListener("dragleave", () => {
      els.addNewCharDropZone.classList.remove("drag-over");
    });

    els.addNewCharDropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      els.addNewCharDropZone.classList.remove("drag-over");

      let payload = draggedPayload;
      if (!payload) {
        try {
          payload = JSON.parse(e.dataTransfer.getData("application/json"));
        } catch (err) {}
      }

      if (!payload) return;

      executeAddNewCharacterFromDrop(payload);
    });
  }

  function executeTransplant(payload, targetCharName) {
    const tree = state.targetNovel.characterTree;
    if (!tree || !tree[targetCharName]) return;

    const oldVoice = tree[targetCharName].voice_name;

    // 覆盖移植该角色的完整音色属性
    tree[targetCharName].voice_name = payload.voiceName;
    tree[targetCharName].pitch = payload.pitch || 1.0;
    tree[targetCharName].rate_offset = payload.rateOffset || "0%";
    tree[targetCharName].base_style = payload.baseStyle || "chat";

    // 记录移植标记
    state.transplantMap[targetCharName] = {
      fromNovel: payload.sourceOriginName,
      fromChar: payload.sourceCharName,
      fromVoice: payload.voiceName,
    };

    // 记录动态历史日志
    const voiceObj = MS_VOICE_MAP[payload.voiceName] || { name: payload.voiceName };
    const timeStr = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    const logItem = `[${timeStr}] 成功将【${payload.sourceOriginName}】的「${payload.sourceCharName}」(${voiceObj.name}) 移植给《${state.targetNovel.title}》的「${targetCharName}」！`;
    addRemixLog(logItem);

    renderTargetTree();
    if (window.KineticVFX) {
      window.KineticVFX.emitShockwave(window.innerWidth * 0.7, window.innerHeight * 0.45, 1.5);
    }
    showToast(`声线移植成功！【${targetCharName}】现已换用 ${voiceObj.name}`);

    // 触发简短试听提示
    AudioEngine.speak({
      text: `${targetCharName}已换上${voiceObj.name}的声线。`,
      voiceName: payload.voiceName,
      pitch: payload.pitch || 1.0,
      rate: 1.0,
    });
  }

  function executeAddNewCharacterFromDrop(payload) {
    const tree = state.targetNovel.characterTree;
    if (!tree) return;

    let charName = payload.sourceCharName;
    if (tree[charName]) {
      charName = `${payload.sourceCharName} (移植)`;
    }

    tree[charName] = {
      character_name: charName,
      role: payload.role || "mature",
      voice_name: payload.voiceName,
      pitch: payload.pitch || 1.0,
      rate_offset: payload.rateOffset || "0%",
      base_style: payload.baseStyle || "chat",
    };

    state.transplantMap[charName] = {
      fromNovel: payload.sourceOriginName,
      fromChar: payload.sourceCharName,
      fromVoice: payload.voiceName,
    };

    const timeStr = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    const voiceObj = MS_VOICE_MAP[payload.voiceName] || { name: payload.voiceName };
    const logItem = `[${timeStr}] 将【${payload.sourceOriginName}】的新角色「${charName}」(${voiceObj.name}) 成功混搭并添入《${state.targetNovel.title}》！`;
    addRemixLog(logItem);

    renderTargetTree();
    showToast(`已成功将【${charName}】加入小说角色树！`);
  }

  function addRemixLog(text) {
    state.remixLogs.unshift(text);
    els.remixLogCount.textContent = `${state.remixLogs.length} 条操作`;
    els.remixLogBox.innerHTML = state.remixLogs.map(log => `
      <div class="remix-log-item">
        <span style="color: var(--teal);">✨</span>
        <span>${escapeHtml(log)}</span>
      </div>
    `).join("");
  }

  /* -------------------------------------------------------------
     Target Actions (Save, Reset, Export, Import)
  ------------------------------------------------------------- */
  function saveRemixToStudio() {
    StorageManager.saveCurrentNovel(state.targetNovel);
    state.currentNovel = JSON.parse(JSON.stringify(state.targetNovel));
    showToast(`🎉 混搭移植结果已保存至小说工坊！可随时返回 Page 1 演播或 Page 2 可视化微调。`);
  }

  function resetTargetTree() {
    const defaultSample = NOVEL_SAMPLES.sanguo;
    state.targetNovel.characterTree = {
      "旁白": { character_name: "旁白", role: "narrator", voice_name: "zh-CN-YunjianNeural", pitch: 0.96, rate_offset: "-2%", base_style: "sports-commentary" },
      "刘备": { character_name: "刘备", role: "mature", voice_name: "zh-CN-YunyeNeural", pitch: 0.92, rate_offset: "-2%", base_style: "serious" },
      "关羽": { character_name: "关羽", role: "mature", voice_name: "zh-CN-YunzeNeural", pitch: 0.88, rate_offset: "-3%", base_style: "serious" },
      "张飞": { character_name: "张飞", role: "mature", voice_name: "zh-CN-YunyeNeural", pitch: 0.94, rate_offset: "+4%", base_style: "angry" },
    };
    state.transplantMap = {};
    renderTargetTree();
    showToast("已重置目标小说为经典初始配音树");
  }

  /**
   * 一键清理目标小说角色树中所有 0 台词冗余角色（瘦身清理）
   */
  function batchCleanTargetNovelCharacters() {
    const tree = state.targetNovel?.characterTree || {};
    const candidates = [];

    // 统计当前小说中的各说话人台词数
    const speakerCounts = {};
    if (state.targetNovel.chapters && Array.isArray(state.targetNovel.chapters)) {
      state.targetNovel.chapters.forEach(ch => {
        (ch.segments || []).forEach(seg => {
          if (seg.speaker) {
            speakerCounts[seg.speaker] = (speakerCounts[seg.speaker] || 0) + 1;
          }
        });
      });
    }

    for (const [charName] of Object.entries(tree)) {
      if (charName === "旁白") continue;
      const count = speakerCounts[charName] || 0;
      if (count === 0) {
        candidates.push(charName);
      }
    }

    if (candidates.length === 0) {
      showToast("目标小说角色树非常健康精炼，未发现 0 台词冗余角色！");
      return;
    }

    const preview = candidates.slice(0, 8).join("、");
    const more = candidates.length > 8 ? ` 等共 ${candidates.length} 位角色` : "";
    if (!confirm(`检测到目标小说中有 ${candidates.length} 位 0 台词角色：\n【${preview}${more}】\n\n确定要一键清理它们吗？清理后角色树将瘦身！`)) {
      return;
    }

    candidates.forEach(name => {
      delete tree[name];
      delete state.transplantMap[name];
    });

    if (els.targetNovelSelect && els.targetNovelSelect.value === "current") {
      StorageManager.saveCurrentNovel(state.targetNovel);
      state.currentNovel = JSON.parse(JSON.stringify(state.targetNovel));
      window.dispatchEvent(new CustomEvent("novelapp:characterupdated", { detail: { batchCleaned: true, count: candidates.length } }));
    }

    renderTargetTree();
    showToast(`🧹 已成功清理 ${candidates.length} 位冗余角色，目标角色树已瘦身！`);
  }

  function openSaveCustomModal() {
    els.customSchemeNameInput.value = `我的《${state.targetNovel.title}》混搭配音树`;
    els.customSchemeDescInput.value = `由全局语音素材库混搭移植而成，包含 ${Object.keys(state.targetNovel.characterTree || {}).length} 位角色的专属声线。`;
    ModalManager.open(els.saveCustomModal);
  }

  function handleConfirmSaveCustom() {
    const name = els.customSchemeNameInput.value.trim();
    if (!name) {
      showToast("请输入方案名称");
      return;
    }

    const schemeId = `custom_${Date.now()}`;
    const newScheme = {
      id: schemeId,
      name: name,
      description: els.customSchemeDescInput.value.trim(),
      characterTree: JSON.parse(JSON.stringify(state.targetNovel.characterTree)),
    };

    StorageManager.saveCustomTree(schemeId, newScheme);
    state.customTrees = StorageManager.getCustomTrees();
    ModalManager.close(els.saveCustomModal);

    // 自动刷新素材库 Tab ②
    switchSourceTab("customTrees");
    showToast(`🌟 已成功将混搭结果保存为自建角色树方案：【${name}】！`);
  }

  function exportSchemeJson() {
    const data = {
      title: state.targetNovel.title,
      exportedAt: new Date().toISOString(),
      characterTree: state.targetNovel.characterTree,
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const filename = `${state.targetNovel.title}_角色音频树混搭方案.json`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    showToast("已成功导出配音树 JSON 文件！");
  }

  function handleImportSchemeJson(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (!parsed.characterTree) {
          throw new Error("JSON 中未找到有效的 characterTree 字段");
        }
        state.targetNovel.characterTree = parsed.characterTree;
        state.transplantMap = {};
        renderTargetTree();
        showToast(`已成功导入来自【${file.name}】的配音树方案！`);
      } catch (err) {
        showToast(`导入失败：${err.message}`);
      }
    };
    reader.readAsText(file, "utf-8");
  }

  /* -------------------------------------------------------------
     Quick Whole-Scheme Applicator for Target Novel
  ------------------------------------------------------------- */
  function initQuickSchemeControls() {
    renderQuickSchemeSelect();

    if (els.quickSchemeApplySelect) {
      els.quickSchemeApplySelect.addEventListener("change", () => {
        handleApplyQuickScheme(els.quickSchemeApplySelect.value);
      });
    }
    if (els.quickSchemeApplyBtn) {
      els.quickSchemeApplyBtn.addEventListener("click", () => {
        handleApplyQuickScheme(els.quickSchemeApplySelect.value);
      });
    }
  }

  function renderQuickSchemeSelect() {
    if (!els.quickSchemeApplySelect) return;
    const schemes = getAvailableSchemes();
    let html = `<option value="" disabled selected>-- 挑选配音树方案一键覆盖 --</option>`;

    const builtins = schemes.filter((s) => s.type === "builtin");
    if (builtins.length) {
      html += `<optgroup label="🌟 官方精选角色语音树">`;
      builtins.forEach((s) => {
        html += `<option value="${escapeAttr(s.id)}">${escapeHtml(s.name)}</option>`;
      });
      html += `</optgroup>`;
    }

    const customs = schemes.filter((s) => s.type === "custom");
    if (customs.length) {
      html += `<optgroup label="🛠️ 我的自建角色树方案">`;
      customs.forEach((s) => {
        html += `<option value="${escapeAttr(s.id)}">${escapeHtml(s.name)}</option>`;
      });
      html += `</optgroup>`;
    }

    const pasts = schemes.filter((s) => s.type === "past");
    if (pasts.length) {
      html += `<optgroup label="📚 过往小说角色音频树">`;
      pasts.forEach((s) => {
        html += `<option value="${escapeAttr(s.id)}">${escapeHtml(s.name)}</option>`;
      });
      html += `</optgroup>`;
    }

    els.quickSchemeApplySelect.innerHTML = html;
  }

  function handleApplyQuickScheme(schemeKey) {
    if (!schemeKey) {
      showToast("请先选择要覆盖的配音树方案");
      return;
    }
    const schemeName = applySchemeToNovel(state.targetNovel, schemeKey);
    if (!schemeName) {
      showToast("应用方案失败，未找到该配置");
      return;
    }

    const timeStr = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    addRemixLog(`[${timeStr}] 一键将整套配音树【${schemeName}】覆盖应用至目标小说《${state.targetNovel.title}》！`);

    renderTargetTree();
    showToast(`🎉 成功将整套【${schemeName}】覆盖至《${state.targetNovel.title}》！点击保存即可同步。`);
  }

  /* -------------------------------------------------------------
     Quick Transplant Wizard Modal (Alternative to Drag-and-Drop)
  ------------------------------------------------------------- */
  function openQuickTransplantModal() {
    // 汇总所有来源可用角色
    const sources = [];

    // 过往小说
    state.pastNovels.forEach(p => {
      Object.entries(p.characterTree || p.characters || {}).forEach(([cName, conf]) => {
        const v = MS_VOICE_MAP[conf.voice_name] || { name: conf.voice_name };
        sources.push({
          label: `《${p.title}》- ${cName} (${v.name})`,
          conf: { ...conf, sourceOriginName: `《${p.title}》`, sourceCharName: cName },
        });
      });
    });

    // 自建角色树
    const customList = Array.isArray(state.customTrees) ? state.customTrees : Object.values(state.customTrees || {});
    customList.forEach(c => {
      Object.entries(c.characterTree || c.characters || {}).forEach(([cName, conf]) => {
        const v = MS_VOICE_MAP[conf.voice_name] || { name: conf.voice_name };
        sources.push({
          label: `自建树【${c.name}】 - ${cName} (${v.name})`,
          conf: { ...conf, sourceOriginName: `自建树【${c.name}】`, sourceCharName: cName },
        });
      });
    });

    // 微软精选演播旁白大师优先排前
    NARRATOR_PRESETS.forEach(n => {
      sources.push({
        label: `🎙️ 旁白大师 - ${n.name} (${n.title})`,
        conf: { voiceName: n.id, pitch: 0.96, rateOffset: "0%", baseStyle: "narration-relaxed", sourceOriginName: "旁白大师库", sourceCharName: `${n.name}旁白` },
      });
    });

    // 微软其他角色音色
    MS_VOICE_CATALOG.forEach(v => {
      if (NARRATOR_PRESETS.some(n => n.id === v.id)) return;
      sources.push({
        label: `微软语音 - ${v.name} (${v.archetype})`,
        conf: { voiceName: v.id, pitch: v.defaultPitch || 1, rateOffset: "0%", baseStyle: "chat", sourceOriginName: "微软语音库", sourceCharName: v.name },
      });
    });

    els.wizardSourceSelect.innerHTML = sources.map((s, idx) => `
      <option value="${idx}">${escapeHtml(s.label)}</option>
    `).join("");
    els.wizardSourceSelect._sourceData = sources;

    // 目标小说角色（旁白排在最前面并加显眼图标）
    const targetChars = Object.keys(state.targetNovel.characterTree || {});
    targetChars.sort((a, b) => (a === "旁白" ? -1 : (b === "旁白" ? 1 : a.localeCompare(b))));

    els.wizardTargetSelect.innerHTML = targetChars.map(c => {
      const isNar = c === "旁白";
      const voiceId = state.targetNovel.characterTree[c]?.voice_name;
      const voiceName = MS_VOICE_MAP[voiceId]?.name || voiceId;
      return `
        <option value="${escapeAttr(c)}">${isNar ? "🎙️ " : "🗣️ "}${escapeHtml(c)} (当前音色: ${escapeHtml(voiceName)})</option>
      `;
    }).join("");

    ModalManager.open(els.quickTransplantModal);
  }

  function handleConfirmWizardTransplant() {
    const idx = parseInt(els.wizardSourceSelect.value, 10);
    const targetChar = els.wizardTargetSelect.value;
    const selectedSource = els.wizardSourceSelect._sourceData?.[idx];

    if (!selectedSource || !targetChar) return;

    executeTransplant(selectedSource.conf, targetChar);
    ModalManager.close(els.quickTransplantModal);
  }

  /* -------------------------------------------------------------
     Genre Filter Pills
  ------------------------------------------------------------- */
  function initGenreFilterPills() {
    if (!els.genreFilterPills) return;
    const buttons = els.genreFilterPills.querySelectorAll(".genre-pill-btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        const genre = btn.getAttribute("data-genre") || "all";
        state.activeGenre = genre;
        if (genre === "learner" && state.activeSourceTab !== "voiceLearner") {
          switchSourceTab("voiceLearner");
        } else if (genre === "manga" && state.activeSourceTab !== "aiManga") {
          switchSourceTab("aiManga");
        } else if (genre === "opensource" && state.activeSourceTab !== "githubAi") {
          switchSourceTab("githubAi");
        } else {
          renderSourceTree();
        }
      });
    });
  }

  /* -------------------------------------------------------------
     A/B Voice Comparison Lab
  ------------------------------------------------------------- */
  function initAbCompareModal() {
    if (!els.openAbCompareModalBtn || !els.abCompareModal) return;

    els.openAbCompareModalBtn.addEventListener("click", () => {
      ModalManager.open(els.abCompareModal);
    });

    if (els.abVoiceSelectA && els.abVoiceSelectB) {
      let optionsHtml = "";
      if (typeof AI_MANGA_VOICE_CATALOG !== "undefined" && AI_MANGA_VOICE_CATALOG.length) {
        optionsHtml += `<optgroup label="🎬 AI 漫剧全年龄爆款声线">`;
        AI_MANGA_VOICE_CATALOG.forEach((v) => {
          const gen = v.gender === "male" ? "男" : "女";
          optionsHtml += `<option value="${escapeAttr(v.id)}">${escapeHtml(v.name)} [${v.ageBand}] (${gen})</option>`;
        });
        optionsHtml += `</optgroup>`;
      }

      optionsHtml += `<optgroup label="🌐 微软官方 Neural 演播库">`;
      MS_VOICE_CATALOG.forEach((v) => {
        const gen = v.gender === "male" ? "男" : "女";
        optionsHtml += `<option value="${escapeAttr(v.id)}">${escapeHtml(v.name)} - ${escapeHtml(v.archetype)} (${gen})</option>`;
      });
      optionsHtml += `</optgroup>`;

      els.abVoiceSelectA.innerHTML = optionsHtml;
      els.abVoiceSelectB.innerHTML = optionsHtml;

      // Default A to Yunxi, B to Yunjian
      els.abVoiceSelectA.value = "zh-CN-YunxiNeural";
      els.abVoiceSelectB.value = "zh-CN-YunjianNeural";

      const updateBadges = () => {
        if (els.abVoiceBadgeA) {
          const vA = (typeof AI_MANGA_VOICE_MAP !== "undefined" ? AI_MANGA_VOICE_MAP[els.abVoiceSelectA.value] : null) || MS_VOICE_MAP[els.abVoiceSelectA.value];
          els.abVoiceBadgeA.textContent = vA ? `${vA.name} · ${vA.archetype}` : els.abVoiceSelectA.value;
        }
        if (els.abVoiceBadgeB) {
          const vB = (typeof AI_MANGA_VOICE_MAP !== "undefined" ? AI_MANGA_VOICE_MAP[els.abVoiceSelectB.value] : null) || MS_VOICE_MAP[els.abVoiceSelectB.value];
          els.abVoiceBadgeB.textContent = vB ? `${vB.name} · ${vB.archetype}` : els.abVoiceSelectB.value;
        }
      };

      els.abVoiceSelectA.addEventListener("change", updateBadges);
      els.abVoiceSelectB.addEventListener("change", updateBadges);
      updateBadges();
    }

    const samplePresets = {
      abSample1: "“天地不仁，以万物为刍狗；日月经天，江河行地。凡人修仙，逆天而行！”",
      abSample2: "“哈哈哈哈！今日便借这万里长江之水，为诸位英雄践行！杀！”",
      abSample3: "“若是累了，便靠着我歇歇吧。无论天涯海角，我都在你身边。”",
      abSample4: "“夜深了，门外似乎有什么东西在缓缓抓挠……那绝不是人类的手指。”",
    };

    Object.entries(samplePresets).forEach(([id, text]) => {
      const btn = els[id];
      if (btn) {
        btn.addEventListener("click", () => {
          if (els.abCompareSampleText) els.abCompareSampleText.value = text;
        });
      }
    });

    if (els.playAbVoiceABtn) {
      els.playAbVoiceABtn.addEventListener("click", () => {
        const voiceId = els.abVoiceSelectA?.value || "zh-CN-YunxiNeural";
        const text = (els.abCompareSampleText && els.abCompareSampleText.value.trim()) || "测试演播台词";
        const pitch = parseFloat(els.abPitchA?.value || "1.0");
        playAuditionVoice({ voiceId, charName: "声线 A", novelTitle: "A/B声线测试", sampleText: text, pitch });
      });
    }

    if (els.playAbVoiceBBtn) {
      els.playAbVoiceBBtn.addEventListener("click", () => {
        const voiceId = els.abVoiceSelectB?.value || "zh-CN-YunjianNeural";
        const text = (els.abCompareSampleText && els.abCompareSampleText.value.trim()) || "测试演播台词";
        const pitch = parseFloat(els.abPitchB?.value || "1.0");
        playAuditionVoice({ voiceId, charName: "声线 B", novelTitle: "A/B声线测试", sampleText: text, pitch });
      });
    }
  }

  /* -------------------------------------------------------------
     GitHub & 开源 AI 语音树自助录入向导控制器
  ------------------------------------------------------------- */
  function initGitHubTreeBuilder() {
    const modal = document.getElementById("addGitHubTreeModal");
    if (!modal) return;

    const presetSelect = document.getElementById("githubPresetTemplateSelect");
    const repoNameInput = document.getElementById("githubTreeRepoName");
    const repoUrlInput = document.getElementById("githubTreeRepoUrl");
    const modelTechInput = document.getElementById("githubTreeModelTech");
    const descInput = document.getElementById("githubTreeDesc");
    const roleCountLabel = document.getElementById("githubRoleCountLabel");
    const addRoleBtn = document.getElementById("addGithubRoleRowBtn");
    const toggleJsonBtn = document.getElementById("toggleGithubJsonModeBtn");
    const jsonContainer = document.getElementById("githubJsonEditorContainer");
    const jsonTextarea = document.getElementById("githubTreeJsonTextarea");
    const applyJsonBtn = document.getElementById("applyGithubJsonBtn");
    const rolesWrap = document.getElementById("githubRolesListWrap");
    const saveBtn = document.getElementById("confirmSaveGithubTreeBtn");

    let builderRoles = [];
    let isJsonMode = false;

    const EDGE_BASE_VOICES = [
      { id: "zh-CN-YunxiNeural", label: "云希 (阳光青年/经典男主)", defaultGender: "male" },
      { id: "zh-CN-XiaoxiaoNeural", label: "晓晓 (温柔知性/女主标配)", defaultGender: "female" },
      { id: "zh-CN-YunyangNeural", label: "云扬 (专业播音/沉稳大叔/旁白)", defaultGender: "male" },
      { id: "zh-CN-XiaoyiNeural", label: "晓伊 (亲切灵动/少女才女)", defaultGender: "female" },
      { id: "zh-TW-YunJheNeural", label: "云哲 (热血坚毅/少侠少年)", defaultGender: "male" },
      { id: "zh-TW-HsiaoChenNeural", label: "晓臻 (清冷御姐/神女仙尊)", defaultGender: "female" },
      { id: "zh-TW-HsiaoYuNeural", label: "晓雨 (娇俏活泼/萝莉萌宠)", defaultGender: "female" },
      { id: "zh-HK-WanLungNeural", label: "云龙 (苍劲威严/霸道魔尊/老者)", defaultGender: "male" },
      { id: "zh-HK-HiuGaaiNeural", label: "晓佳 (成熟干练/宗门女将)", defaultGender: "female" },
      { id: "zh-HK-HiuMaanNeural", label: "晓曼 (宁静优雅/古风长老)", defaultGender: "female" },
      { id: "zh-CN-liaoning-XiaobeiNeural", label: "晓北 (爽朗幽默/江湖豪客)", defaultGender: "female" },
      { id: "zh-CN-shaanxi-XiaoniNeural", label: "晓妮 (粗犷方言/特色异士)", defaultGender: "female" },
    ];

    const PRESETS = {
      gptsovits_v2: {
        repoName: "RVC-Boss/GPT-SoVITS-v2",
        repoUrl: "https://github.com/RVC-Boss/GPT-SoVITS",
        modelTech: "Few-Shot Voice Conversion & VITS 2.0",
        desc: "顶级开源少样本音色克隆模型，擅长仙侠修仙、霸气主角与深沉魔皇配音",
        roles: [
          { name: "冷峻剑仙 (男主)", role: "youngMale", baseVoice: "zh-TW-YunJheNeural", pitch: "+4Hz", rate: "+2%", sampleText: "天不生我李淳罡，万古剑道如长夜！一剑西来，千峰辟易！" },
          { name: "俏皮师妹 (女主)", role: "youngFemale", baseVoice: "zh-TW-HsiaoYuNeural", pitch: "+16Hz", rate: "+3%", sampleText: "师兄，你等等我嘛！这山里的桃花都开了，你也不陪我去看看！" },
          { name: "沉稳掌门 (宗师)", role: "mature", baseVoice: "zh-CN-YunxiNeural", pitch: "-8Hz", rate: "-2%", sampleText: "本门三千弟子，今日以命相搏，只为护我宗门万世基业！" },
          { name: "幽冥老祖 (反派)", role: "elderVillain", baseVoice: "zh-HK-WanLungNeural", pitch: "-14Hz", rate: "-5%", sampleText: "桀桀桀……毛头小子，凭你也敢在本座面前口出狂言！受死吧！" },
        ],
      },
      cosyvoice_2: {
        repoName: "FunAudioLLM/CosyVoice-2",
        repoUrl: "https://github.com/FunAudioLLM/CosyVoice",
        modelTech: "Flow-Matching Multi-Speaker Synthesis",
        desc: "阿里通义实验室开源多情感大模型，音色饱满自然，极具戏剧张力",
        roles: [
          { name: "热血少年 (男主)", role: "youngMale", baseVoice: "zh-CN-YunxiNeural", pitch: "+2Hz", rate: "+4%", sampleText: "我命由我不由天！只要有一丝希望，我就绝不会放弃！" },
          { name: "傲娇公主 (女主)", role: "youngFemale", baseVoice: "zh-TW-HsiaoChenNeural", pitch: "+6Hz", rate: "+1%", sampleText: "哼，本宫才没有关心你呢，你可别自作多情！" },
          { name: "智谋军师 (配角)", role: "supporting", baseVoice: "zh-CN-YunyangNeural", pitch: "-4Hz", rate: "+0%", sampleText: "主公莫急，敌军粮道已被我军暗中截断，三日之内必不战自乱。" },
          { name: "古稀仙翁 (老者)", role: "elderVillain", baseVoice: "zh-HK-WanLungNeural", pitch: "-10Hz", rate: "-6%", sampleText: "因果循环，自有天定。小友，红尘虽好，莫要执念太深啊。" },
        ],
      },
      chattts_novel: {
        repoName: "2noise/ChatTTS-Novel-FineTuned",
        repoUrl: "https://github.com/2noise/ChatTTS",
        modelTech: "Conversational Diffusion with Laughter & Sighs",
        desc: "专为小说对话打造，极具生活感，支持自然笑声、叹息与市井百态",
        roles: [
          { name: "茶楼说书人 (旁白)", role: "narrator", baseVoice: "zh-CN-YunxiNeural", pitch: "+0Hz", rate: "-1%", sampleText: "话说天下大势，分久必合，合久必分。且听醒木一响，客官慢用！" },
          { name: "市井小贩 (配角)", role: "supporting", baseVoice: "zh-CN-liaoning-XiaobeiNeural", pitch: "+4Hz", rate: "+5%", sampleText: "新鲜出炉的胡麻饼嘞！热乎喷香，客官您不来上两块尝尝鲜？" },
          { name: "机灵小童 (幼年)", role: "child", baseVoice: "zh-TW-HsiaoYuNeural", pitch: "+20Hz", rate: "+6%", sampleText: "娘亲娘亲，你看天上有一条好大好大的大金龙飞过去啦！" },
        ],
      },
      f5tts_epic: {
        repoName: "SWivid/F5-TTS-Epic",
        repoUrl: "https://github.com/SWivid/F5-TTS",
        modelTech: "Non-Autoregressive Flow Matching DiT",
        desc: "非自回归极速流式 DiT 模型，气势恢宏，适合史诗玄幻仙侠大戏",
        roles: [
          { name: "霸道神皇 (至尊男主)", role: "youngMale", baseVoice: "zh-TW-YunJheNeural", pitch: "-2Hz", rate: "+2%", sampleText: "三界之内，顺我者昌，逆我者亡！九天十地，谁敢与我一战！" },
          { name: "清冷仙尊 (神女女主)", role: "youngFemale", baseVoice: "zh-HK-HiuMaanNeural", pitch: "-2Hz", rate: "-3%", sampleText: "凡尘如梦，过眼云烟。你若执迷不悟，休怪本尊剑下无情。" },
          { name: "上古魔尊 (暗黑反派)", role: "elderVillain", baseVoice: "zh-HK-WanLungNeural", pitch: "-16Hz", rate: "-4%", sampleText: "封印本座千年，你们的神明可曾想过，血海滔天的这一天！" },
        ],
      },
      fishspeech_radio: {
        repoName: "fishaudio/Fish-Speech-Studio",
        repoUrl: "https://github.com/fishaudio/fish-speech",
        modelTech: "Dual-Token Autoregressive Architecture",
        desc: "拟真广播电台与有声小说专业级配音，语流丝滑，沉浸感极强",
        roles: [
          { name: "深夜电台主持 (沉浸旁白)", role: "narrator", baseVoice: "zh-CN-YunxiNeural", pitch: "-4Hz", rate: "-3%", sampleText: "夜深了，世界安静下来。这里是有声剧场，让我们继续走进今晚的故事。" },
          { name: "悬疑刑侦队长 (主角)", role: "mature", baseVoice: "zh-CN-YunyangNeural", pitch: "-6Hz", rate: "+1%", sampleText: "现场没有指纹，窗户从里面反锁，这是一起典型的密室谋杀。" },
          { name: "知性女法医 (配角)", role: "youngFemale", baseVoice: "zh-HK-HiuGaaiNeural", pitch: "-1Hz", rate: "-1%", sampleText: "死者胃部残留有微量杏仁味毒素，死亡时间在昨晚十一点到凌晨一点之间。" },
        ],
      },
      openvoice_v2: {
        repoName: "myshell-ai/OpenVoice-v2",
        repoUrl: "https://github.com/myshell-ai/OpenVoice",
        modelTech: "Instant Voice Cloning with Flexible Tone Control",
        desc: "灵活声线音色克隆与多情绪多语种，百搭万能",
        roles: [
          { name: "暗夜刺客 (主角男声)", role: "youngMale", baseVoice: "zh-TW-YunJheNeural", pitch: "-4Hz", rate: "+3%", sampleText: "十步杀一人，千里不留行。我的匕首，只饮该死之人的血。" },
          { name: "灵动妖姬 (主角女声)", role: "youngFemale", baseVoice: "zh-TW-HsiaoChenNeural", pitch: "+8Hz", rate: "+2%", sampleText: "公子何必走得这么急呢？不如留下来，陪奴家喝一杯桂花酿吧。" },
          { name: "异域神秘客 (配角)", role: "supporting", baseVoice: "zh-CN-shaanxi-XiaoniNeural", pitch: "-2Hz", rate: "+0%", sampleText: "在茫茫大漠深处，藏着一座被时间遗忘的黄金古城。" },
        ],
      },
    };

    function syncJsonTextarea() {
      if (!jsonTextarea) return;
      const data = {
        name: repoNameInput?.value || "我的开源语音树",
        repoUrl: repoUrlInput?.value || "",
        modelTech: modelTechInput?.value || "",
        description: descInput?.value || "",
        roles: builderRoles,
      };
      jsonTextarea.value = JSON.stringify(data, null, 2);
    }

    function renderRoles() {
      if (!rolesWrap) return;
      if (roleCountLabel) roleCountLabel.textContent = builderRoles.length;

      if (builderRoles.length === 0) {
        rolesWrap.innerHTML = `
          <div style="text-align: center; padding: 24px; color: var(--muted); border: 1px dashed var(--line); border-radius: 8px;">
            暂无角色声线。请点击上方【➕ 添加角色声线】或在上方选择【快捷预填主流开源模版】快速载入！
          </div>
        `;
        return;
      }

      rolesWrap.innerHTML = builderRoles.map((r, idx) => {
        const voiceOptionsHtml = EDGE_BASE_VOICES.map(opt =>
          `<option value="${opt.id}" ${opt.id === r.baseVoice ? "selected" : ""}>${opt.label}</option>`
        ).join("");

        return `
          <div class="github-role-row" data-role-idx="${idx}">
            <div class="github-role-row-grid">
              <div>
                <input type="text" class="text-input text-input-sm role-name-input" value="${escapeHtml(r.name || '')}" placeholder="角色名 (如:冷面魔皇)" style="font-weight: 600;" />
              </div>
              <div>
                <select class="text-input text-input-sm role-category-select">
                  <option value="youngMale" ${r.role === "youngMale" ? "selected" : ""}>少侠男主</option>
                  <option value="youngFemale" ${r.role === "youngFemale" ? "selected" : ""}>柔美女主</option>
                  <option value="mature" ${r.role === "mature" ? "selected" : ""}>沉稳大叔</option>
                  <option value="elderVillain" ${r.role === "elderVillain" ? "selected" : ""}>老辣魔尊</option>
                  <option value="child" ${r.role === "child" ? "selected" : ""}>童声萌宠</option>
                  <option value="narrator" ${r.role === "narrator" ? "selected" : ""}>旁白说书</option>
                  <option value="supporting" ${r.role === "supporting" ? "selected" : ""}>精彩配角</option>
                </select>
              </div>
              <div>
                <select class="text-input text-input-sm role-base-voice-select">
                  ${voiceOptionsHtml}
                </select>
              </div>
              <div>
                <input type="text" class="text-input text-input-sm role-pitch-input" value="${escapeHtml(r.pitch || '+0Hz')}" placeholder="音调(Hz)" title="音调微调，如 -12Hz, +0Hz, +14Hz" />
              </div>
              <div>
                <input type="text" class="text-input text-input-sm role-rate-input" value="${escapeHtml(r.rate || '+0%')}" placeholder="语速(%)" title="语速微调，如 -5%, +0%, +4%" />
              </div>
              <div>
                <input type="text" class="text-input text-input-sm role-sample-input" value="${escapeHtml(r.sampleText || '')}" placeholder="试听台词..." />
              </div>
              <button type="button" class="role-audition-btn" title="试听该声线" style="height: 32px; width: 32px; border-radius: 6px; border: 1px solid var(--line); background: var(--panel); cursor: pointer; display: flex; align-items: center; justify-content: center;">🔊</button>
              <button type="button" class="btn-icon-danger role-delete-btn" title="删除角色">🗑️</button>
            </div>
          </div>
        `;
      }).join("");

      rolesWrap.querySelectorAll(".github-role-row").forEach(rowEl => {
        const idx = parseInt(rowEl.dataset.roleIdx, 10);
        const nameInput = rowEl.querySelector(".role-name-input");
        const catSelect = rowEl.querySelector(".role-category-select");
        const voiceSelect = rowEl.querySelector(".role-base-voice-select");
        const pitchInput = rowEl.querySelector(".role-pitch-input");
        const rateInput = rowEl.querySelector(".role-rate-input");
        const sampleInput = rowEl.querySelector(".role-sample-input");
        const auditionBtn = rowEl.querySelector(".role-audition-btn");
        const deleteBtn = rowEl.querySelector(".role-delete-btn");

        if (nameInput) nameInput.addEventListener("input", (e) => { builderRoles[idx].name = e.target.value; syncJsonTextarea(); });
        if (catSelect) catSelect.addEventListener("change", (e) => { builderRoles[idx].role = e.target.value; syncJsonTextarea(); });
        if (voiceSelect) voiceSelect.addEventListener("change", (e) => { builderRoles[idx].baseVoice = e.target.value; syncJsonTextarea(); });
        if (pitchInput) pitchInput.addEventListener("input", (e) => { builderRoles[idx].pitch = e.target.value; syncJsonTextarea(); });
        if (rateInput) rateInput.addEventListener("input", (e) => { builderRoles[idx].rate = e.target.value; syncJsonTextarea(); });
        if (sampleInput) sampleInput.addEventListener("input", (e) => { builderRoles[idx].sampleText = e.target.value; syncJsonTextarea(); });

        if (auditionBtn) {
          auditionBtn.addEventListener("click", () => {
            const r = builderRoles[idx];
            playAuditionVoice({
              voiceId: r.baseVoice || "zh-CN-YunxiNeural",
              charName: r.name || "开源角色",
              novelTitle: repoNameInput?.value || "GitHub 开源树",
              sampleText: r.sampleText || "万千大道，唯我独尊！",
              pitch: 1.0,
              rate: r.rate || "+0%",
            });
          });
        }

        if (deleteBtn) {
          deleteBtn.addEventListener("click", () => {
            builderRoles.splice(idx, 1);
            renderRoles();
            syncJsonTextarea();
          });
        }
      });
    }

    if (presetSelect) {
      presetSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        if (!val || !PRESETS[val]) return;
        const tpl = PRESETS[val];
        if (repoNameInput) repoNameInput.value = tpl.repoName;
        if (repoUrlInput) repoUrlInput.value = tpl.repoUrl;
        if (modelTechInput) modelTechInput.value = tpl.modelTech;
        if (descInput) descInput.value = tpl.desc;
        builderRoles = JSON.parse(JSON.stringify(tpl.roles));
        renderRoles();
        syncJsonTextarea();
        showToast(`⚡ 已载入【${tpl.repoName}】开源模版，包含 ${tpl.roles.length} 位声线！`);
      });
    }

    if (addRoleBtn) {
      addRoleBtn.addEventListener("click", () => {
        builderRoles.push({
          name: `新角色 ${builderRoles.length + 1}`,
          role: "youngMale",
          baseVoice: "zh-CN-YunxiNeural",
          pitch: "+0Hz",
          rate: "+0%",
          sampleText: "天不生我李淳罡，万古剑道如长夜！",
        });
        renderRoles();
        syncJsonTextarea();
      });
    }

    if (toggleJsonBtn && jsonContainer) {
      toggleJsonBtn.addEventListener("click", () => {
        isJsonMode = !isJsonMode;
        jsonContainer.style.display = isJsonMode ? "block" : "none";
        toggleJsonBtn.textContent = isJsonMode ? "📊 切换表单模式" : "📋 切换 JSON 模式";
        if (isJsonMode) syncJsonTextarea();
      });
    }

    if (applyJsonBtn && jsonTextarea) {
      applyJsonBtn.addEventListener("click", () => {
        try {
          const parsed = JSON.parse(jsonTextarea.value);
          if (parsed.repoName && repoNameInput) repoNameInput.value = parsed.repoName;
          if (parsed.name && repoNameInput) repoNameInput.value = parsed.name;
          if (parsed.repoUrl && repoUrlInput) repoUrlInput.value = parsed.repoUrl;
          if (parsed.modelTech && modelTechInput) modelTechInput.value = parsed.modelTech;
          if ((parsed.desc || parsed.description) && descInput) descInput.value = parsed.desc || parsed.description;
          if (Array.isArray(parsed.roles)) {
            builderRoles = parsed.roles.map(r => ({
              name: r.name || r.charName || "角色",
              role: r.role || r.category || "youngMale",
              baseVoice: r.baseVoice || r.voiceName || r.voiceId || "zh-CN-YunxiNeural",
              pitch: r.pitch || "+0Hz",
              rate: r.rate || "+0%",
              sampleText: r.sampleText || "天道酬勤，剑指苍穹！",
            }));
          }
          renderRoles();
          showToast("✅ JSON 方案已解析并同步至表单！");
        } catch (err) {
          showToast("JSON 格式错误，请检查语法！");
        }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const repoName = (repoNameInput?.value || "").trim();
        if (!repoName) {
          showToast("请输入开源仓库或语音树名称！");
          return;
        }
        if (builderRoles.length === 0) {
          showToast("请至少添加 1 位角色声线！");
          return;
        }

        const treeId = `custom_github_${Date.now()}`;
        const treeObj = {
          id: treeId,
          name: repoName,
          description: (descInput?.value || "").trim() || `基于 ${repoName} 的开源多角色语音树`,
          repoUrl: (repoUrlInput?.value || "").trim(),
          modelTech: (modelTechInput?.value || "").trim() || "GitHub Open-Source AI Architecture",
          sourceType: "github-open-source",
          characterCount: builderRoles.length,
          createdAt: new Date().toISOString(),
          characterTree: {},
          mapping: {},
          roles: [],
        };

        builderRoles.forEach(r => {
          const voiceId = `custom-gh-${treeId}-${r.name}`;
          treeObj.characterTree[r.name] = {
            name: r.name,
            role: r.role,
            voiceName: r.baseVoice,
            pitch: r.pitch,
            rate: r.rate,
            sampleText: r.sampleText,
          };
          treeObj.mapping[r.role] = r.baseVoice;
          treeObj.roles.push({
            id: voiceId,
            name: r.name,
            category: r.role,
            gender: (r.role === "youngFemale" || r.role === "female" || r.role === "fairy") ? "female" : "male",
            sampleText: r.sampleText,
            baseVoice: r.baseVoice,
            pitch: r.pitch,
            rate: r.rate,
          });

          // 动态注册到系统运行时 GitHub 目录中
          GITHUB_AI_VOICE_CATALOG.push({
            id: voiceId,
            name: `${r.name} (${repoName.split("/").pop()})`,
            fullName: `${repoName} - ${r.name}`,
            gender: (r.role === "youngFemale" || r.role === "female" || r.role === "fairy") ? "female" : "male",
            category: r.role,
            repo: repoName,
            modelTech: treeObj.modelTech,
            sampleText: r.sampleText,
            defaultPitch: r.pitch,
            defaultRate: r.rate,
          });
          GITHUB_AI_VOICE_MAP[voiceId] = GITHUB_AI_VOICE_CATALOG[GITHUB_AI_VOICE_CATALOG.length - 1];
        });

        // 持久化到自创角色树
        StorageManager.saveCustomTree(treeObj);
        state.customTrees = StorageManager.getCustomTrees();

        // 关闭弹窗
        ModalManager.close("addGitHubTreeModal");

        // 切换到自创角色树选项卡并重新渲染
        switchSourceTab("customTrees");
        showToast(`🎉 成功录入 GitHub 开源语音树《${repoName}》，共 ${builderRoles.length} 个角色声线已就绪！`);
      });
    }

    // 初始化时载入第一个默认模版
    if (presetSelect) {
      presetSelect.value = "gptsovits_v2";
      presetSelect.dispatchEvent(new Event("change"));
    }
  }

  // 响应式跨标签页状态同步
  window.addEventListener("novelapp:tabchange", (e) => {
    if (e.detail?.targetId === "sec-library" || e.detail?.targetId === "library") {
      loadData();
      populateTargetNovelSelect();
      renderSourceTree();
      renderTargetTree();
    }
  });

  // 响应式跨视图角色树更新 (Studio 或角色树中删除/清理角色)
  window.addEventListener("novelapp:characterupdated", () => {
    loadData();
    if (els.targetNovelSelect && els.targetNovelSelect.value === "current") {
      state.targetNovel = JSON.parse(JSON.stringify(state.currentNovel));
    }
    renderTargetTree();
    renderSourceTree();
  });

  // 启动
  document.addEventListener("DOMContentLoaded", init);
})();
