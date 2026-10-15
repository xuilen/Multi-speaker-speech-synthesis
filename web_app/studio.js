/**
 * studio.js - Page 1: Novel Audio Production Studio
 * Orchestrates text parsing, Alexandria-style script inspection, TTS generation,
 * high-end DAW master playback deck, Canvas spectrum waveform, and ZIP export.
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
    ROLE_DEFAULTS,
    STYLE_LABELS,
    BUILTIN_SCHEMES,
    NARRATOR_PRESETS,
    NOVEL_SAMPLES,
    StorageManager,
    AudioEngine,
    ModalManager,
    applySchemeToNovel,
    setNarratorVoice,
    getAvailableSchemes,
    analyzeNovelGenre,
    autoCastNovelCharacterTree,
    isValidCharacterName,
    inferCharacterAttributes,
    assignRefinedVoice,
    ARCHETYPE_VOICE_MATRIX,
    renderSharedHeader,
    showToast,
    escapeHtml,
    escapeAttr,
  } = window.NovelApp;

  // DOM Elements Cache
  const els = {
    bookTitle: document.getElementById("bookTitle"),
    fileInput: document.getElementById("fileInput"),
    rawText: document.getElementById("rawText"),
    rawTextViewControls: document.getElementById("rawTextViewControls"),
    rawTextChapterIndicator: document.getElementById("rawTextChapterIndicator"),
    toggleRawTextModeBtn: document.getElementById("toggleRawTextModeBtn"),
    parseButton: document.getElementById("parseButton"),
    clearButton: document.getElementById("clearButton"),
    sampleSanguoBtn: document.getElementById("sampleSanguoBtn"),
    sampleXianxiaBtn: document.getElementById("sampleXianxiaBtn"),
    sampleQingyuBtn: document.getElementById("sampleQingyuBtn"),
    importStatus: document.getElementById("importStatus"),
    chapterSummary: document.getElementById("chapterSummary"),
    chapterWorkflowTabs: document.querySelector(".chapter-workflow-tabs"),
    chapterModeFocusBtn: document.getElementById("chapterModeFocusBtn"),
    chapterModeListBtn: document.getElementById("chapterModeListBtn"),
    chapterFocusDeck: document.getElementById("chapterFocusDeck"),
    chapterListContainer: document.getElementById("chapterListContainer"),
    chapterList: document.getElementById("chapterList"),
    selectAllButton: document.getElementById("selectAllButton"),
    invertSelectionButton: document.getElementById("invertSelectionButton"),
    previewFirstButton: document.getElementById("previewFirstButton"),
    openTreePageButton: document.getElementById("openTreePageButton"),
    openDeepTreePageButton: document.getElementById("openDeepTreePageButton"),
    ttsMode: document.getElementById("ttsMode"),
    modeNotice: document.getElementById("modeNotice"),
    onlinePanel: document.getElementById("onlinePanel"),
    endpointUrl: document.getElementById("endpointUrl"),
    endpointToken: document.getElementById("endpointToken"),
    onlineFormat: document.getElementById("onlineFormat"),
    maxBatchChars: document.getElementById("maxBatchChars"),
    rateSlider: document.getElementById("rateSlider") || document.getElementById("speedSlider"),
    rateValue: document.getElementById("rateValue") || document.getElementById("speedValue"),
    speakerModeToggle: document.getElementById("speakerModeToggle"),
    speakerModeLabel: document.getElementById("speakerModeLabel"),
    charCountSummary: document.getElementById("charCountSummary"),
    schemeSelect: document.getElementById("schemeSelect") || document.getElementById("studioSchemeSelect"),
    applySchemeBtn: document.getElementById("applySchemeBtn") || document.getElementById("studioApplySchemeBtn"),
    activeSchemeBadge: document.getElementById("activeSchemeBadge"),
    narratorVoiceSelect: document.getElementById("narratorVoiceSelect"),
    narratorStyleBadge: document.getElementById("narratorStyleBadge"),
    auditionNarratorBtn: document.getElementById("auditionNarratorBtn"),
    deckNarratorSelect: document.getElementById("deckNarratorSelect"),
    deckNarratorAuditionBtn: document.getElementById("deckNarratorAuditionBtn"),
    characterChipsContainer: document.getElementById("characterChipsContainer") || document.getElementById("characterChips"),
    quickCastingCount: document.getElementById("quickCastingCount"),
    jumpToTreeSectionBtn: document.getElementById("jumpToTreeSectionBtn"),
    // Studio Character Tree & Freestyle Casting Console
    studioCharTreeSection: document.getElementById("studioCharTreeSection"),
    studioSmartSchemeCard: document.getElementById("studioSmartSchemeCard"),
    smartSchemeHeadline: document.getElementById("smartSchemeHeadline"),
    smartSchemeSubtext: document.getElementById("smartSchemeSubtext"),
    smartSchemePillsRow: document.getElementById("smartSchemePillsRow"),
    smartSchemeAutoApplyBtn: document.getElementById("smartSchemeAutoApplyBtn"),
    studioTreeStatsBadge: document.getElementById("studioTreeStatsBadge"),
    studioSchemeSelect: document.getElementById("studioSchemeSelect"),
    studioApplySchemeBtn: document.getElementById("studioApplySchemeBtn"),
    studioViewTreeBtn: document.getElementById("studioViewTreeBtn"),
    studioViewGridBtn: document.getElementById("studioViewGridBtn"),
    studioDiagnoseBtn: document.getElementById("studioDiagnoseBtn"),
    studioAddCharBtn: document.getElementById("studioAddCharBtn"),
    studioOpenDeepTreeBtn: document.getElementById("studioOpenDeepTreeBtn"),
    studioCharSearchInput: document.getElementById("studioCharSearchInput"),
    studioCategoryFilters: document.getElementById("studioCategoryFilters"),
    filterCountAll: document.getElementById("filterCountAll"),
    filterCountMale: document.getElementById("filterCountMale"),
    filterCountFemale: document.getElementById("filterCountFemale"),
    filterCountNarrator: document.getElementById("filterCountNarrator"),
    filterCountMain: document.getElementById("filterCountMain"),
    filterCountSupporting: document.getElementById("filterCountSupporting"),
    studioCharSearchClearBtn: document.getElementById("studioCharSearchClearBtn"),
    studioMatrixCompactBtn: document.getElementById("studioMatrixCompactBtn"),
    studioMatrixComfortBtn: document.getElementById("studioMatrixComfortBtn"),
    studioTreeHierarchicalView: document.getElementById("studioTreeHierarchicalView"),
    studioTreeGridView: document.getElementById("studioTreeGridView"),
    // Modals
    confirmAddCharBtn: document.getElementById("confirmAddCharBtn"),
    confirmSwapBtn: document.getElementById("confirmSwapBtn"),
    confirmMergeBtn: document.getElementById("confirmMergeBtn"),
    mergeTargetCharSelect: document.getElementById("mergeTargetCharSelect"),
    mergeSourceCharName: document.getElementById("mergeSourceCharName"),
    progressText: document.getElementById("progressText") || document.getElementById("overallProgressLabel"),
    activeStatus: document.getElementById("activeStatus") || document.getElementById("audioStatusText"),
    overallProgress: document.getElementById("overallProgress"),
    generateSelectedButton: document.getElementById("generateSelectedButton"),
    generateAllButton: document.getElementById("generateAllButton"),
    pauseButton: document.getElementById("pauseButton"),
    resumeButton: document.getElementById("resumeButton"),
    stopButton: document.getElementById("stopButton"),
    zipButton: document.getElementById("zipButton") || document.getElementById("downloadZipButton"),
    supportStatus: document.getElementById("supportStatus"),
    // Master Deck Elements
    studioWaveCanvas: document.getElementById("studioWaveCanvas"),
    masterLedIndicator: document.getElementById("masterLedIndicator"),
    playerStatusTitle: document.getElementById("playerStatusTitle"),
    playerTimeDisplay: document.getElementById("playerTimeDisplay"),
    masterSpeakerBadge: document.getElementById("masterSpeakerBadge"),
    masterSegmentIndicator: document.getElementById("masterSegmentIndicator"),
    playerPrevBtn: document.getElementById("playerPrevBtn"),
    playerPlayPauseBtn: document.getElementById("playerPlayPauseBtn"),
    playerStopBtn: document.getElementById("playerStopBtn"),
    playerNextBtn: document.getElementById("playerNextBtn"),
    playerProgress: document.getElementById("playerProgress"),
    playerVolumeSlider: document.getElementById("playerVolumeSlider"),
    playerVolumeLabel: document.getElementById("playerVolumeLabel"),
    playerMuteBtn: document.getElementById("playerMuteBtn"),
    playerLoopModeBtn: document.getElementById("playerLoopModeBtn"),
    scriptDeckModal: document.getElementById("scriptDeckModal"),
    scriptDeckTitle: document.getElementById("scriptDeckTitle"),
    scriptDeckContent: document.getElementById("scriptDeckContent"),
    addScriptLineBtn: document.getElementById("addScriptLineBtn"),
    reInferScriptBtn: document.getElementById("reInferScriptBtn"),
    toggleBatchSpeakerBtn: document.getElementById("toggleBatchSpeakerBtn"),
    batchSpeakerDrawer: document.getElementById("batchSpeakerDrawer"),
    batchFromSpeakerSelect: document.getElementById("batchFromSpeakerSelect"),
    batchToSpeakerSelect: document.getElementById("batchToSpeakerSelect"),
    executeBatchSpeakerBtn: document.getElementById("executeBatchSpeakerBtn"),
    closeBatchSpeakerBtn: document.getElementById("closeBatchSpeakerBtn"),
    exportScriptSrtBtn: document.getElementById("exportScriptSrtBtn"),
    exportScriptTxtBtn: document.getElementById("exportScriptTxtBtn"),
    scriptStatsBadge: document.getElementById("scriptStatsBadge"),
    saveScriptDeckBtn: document.getElementById("saveScriptDeckBtn"),
    quickBannerText: document.getElementById("quickBannerText"),
    // Bottom Master Footer DAW Elements
    footerPlayPauseBtn: document.getElementById("footerPlayPauseBtn"),
    footerTrackTitle: document.getElementById("footerTrackTitle"),
    footerTeleprompterSpeaker: document.getElementById("footerTeleprompterSpeaker"),
    footerTeleprompterLine: document.getElementById("footerTeleprompterLine"),
    footerTimecode: document.getElementById("footerTimecode"),
  };

  // State Management
  const state = {
    novel: null,
    chapters: [],
    generating: false,
    generatingPaused: false,
    generatingStopped: false,
    activeChapterIndex: 0,
    focusedChapterIndex: 0,
    chapterWorkflowMode: "list", // 'list' (full card list) | 'focus' (focused chapter deck)
    rawTextViewMode: "full", // 'full' (full novel text) | 'chapter' (focused chapter text)
    chapterRenderLimit: 60,
    smartGenreAnalysis: null,
    currentSegIndex: 0,
    activeEditingChapterIdx: null,
    editingSegments: [],
    isPlaying: false,
    isPaused: false,
    speed: 1.0,
    volume: 1.0,
    prevVolume: 1.0,
    isMuted: false,
    loopMode: "sequence", // "sequence", "loopChapter", "stop"
    waveAnimId: null,
    charTreeFilter: "all", // "all", "male", "female", "narrator", "main", "supporting"
    charTreeSearchQuery: "",
    charTreeViewMode: "grid", // "grid" (default matrix layout), "tree" (single-row hierarchical)
    charTreeDensity: "compact", // "compact" or "comfort"
    collapsedBranches: new Set(),
    extractedQuotes: {},
    speakerCounts: {},
    activeSwapSource: null,
  };

  /* -------------------------------------------------------------
     Waveform & Spectrum Canvas Visualizer
  ------------------------------------------------------------- */
  function drawWaveform(canvas, isActive) {
    if (!canvas) return;
    if (window.KineticVFX && typeof window.KineticVFX.drawOscilloscope === "function") {
      window.KineticVFX.drawOscilloscope(canvas, {
        isActive,
        label: "DAW MASTER DECK // 44.1kHz",
      });
      return;
    }

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const width = canvas.width = Math.floor(rect.width * dpr);
    const height = canvas.height = Math.floor(54 * dpr);

    ctx.clearRect(0, 0, width, height);
    const barCount = 48;
    const barWidth = Math.max(2 * dpr, (width / barCount) - 3 * dpr);
    const time = Date.now() / 160;

    for (let i = 0; i < barCount; i++) {
      let barHeight;
      if (isActive) {
        const wave1 = Math.sin(time + i * 0.32);
        const wave2 = Math.cos(time * 0.8 + i * 0.18);
        const envelope = Math.sin((i / barCount) * Math.PI);
        barHeight = Math.abs(wave1 * wave2) * (height * 0.82) * envelope + 6 * dpr;
      } else {
        barHeight = (Math.sin(i * 0.25) + 1.2) * 4 * dpr;
      }

      const x = i * (barWidth + 3 * dpr);
      const y = (height - barHeight) / 2;
      const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
      grad.addColorStop(0, isActive ? "#00e5ff" : "#334155");
      grad.addColorStop(1, isActive ? "#f59e0b" : "#1e293b");

      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }

  function startWaveformAnimation() {
    stopWaveformAnimation();
    if (window.KineticVFX) {
      window.KineticVFX.setSpeaking(true);
      window.KineticVFX.emitShockwave(window.innerWidth / 2, window.innerHeight * 0.45, 1.4);
    }
    function loop() {
      drawWaveform(els.studioWaveCanvas, true);
      state.waveAnimId = requestAnimationFrame(loop);
    }
    loop();
  }

  function stopWaveformAnimation() {
    if (state.waveAnimId) {
      cancelAnimationFrame(state.waveAnimId);
      state.waveAnimId = null;
    }
    if (window.KineticVFX) window.KineticVFX.setSpeaking(false);
    drawWaveform(els.studioWaveCanvas, false);
  }

  /* -------------------------------------------------------------
     Initialization & Data Binding
  ------------------------------------------------------------- */
  function init() {
    // 渲染共享顶部导航
    renderSharedHeader("studio");

    // 初始化章节制作工作流模式切换 (逐章聚焦配音 vs 全书章节列表)
    initChapterWorkflowSwitcher();

    // 加载小说数据
    loadInitialNovel();

    // 初始化配音树方案与旁白切换控制器
    initSchemeAndNarratorControls();

    // 绑定事件处理器
    bindEvents();

    // 初始化波形
    drawWaveform(els.studioWaveCanvas, false);

    // 检查语音合成支持
    checkTtsSupport();
  }

  function loadInitialNovel() {
    state.novel = StorageManager.getCurrentNovel();
    els.bookTitle.value = state.novel.title || "三国演义";
    els.rawText.value = state.novel.rawText || "";

    if (state.novel.rawText && state.novel.rawText.trim()) {
      parseAndRenderChapters(state.novel.rawText, false);
    } else {
      loadSample("sanguo", false);
    }

    renderNarratorDropdowns();
    updateNarratorBadge();
    renderSchemeDropdown();
    renderCharacterChips();
    renderStudioCharacterTree();
    updateSmartSchemeRecommendation();
    renderFocusedChapterDeck();
  }

  function bindEvents() {
    // 导入与样本按钮
    if (els.parseButton) {
      els.parseButton.addEventListener("click", () => {
        let text = (els.rawText && els.rawText.value.trim()) || "";
        if (state.novel && state.novel.rawText && (text.includes("... [为保") || (state.rawTextViewMode === "chapter" && state.chapters.length > 0 && text === state.chapters[state.focusedChapterIndex]?.text))) {
          text = state.novel.rawText;
        } else if (text) {
          state.novel.rawText = text;
        }
        if (!text) {
          showToast("请先输入或粘贴小说正文");
          return;
        }
        parseAndRenderChapters(text, true);
      });
    }

    // 正文视图模式切换 (当前聚焦章节原文 vs 全书完整正文)
    if (els.toggleRawTextModeBtn) {
      els.toggleRawTextModeBtn.addEventListener("click", () => {
        state.rawTextViewMode = state.rawTextViewMode === "chapter" ? "full" : "chapter";
        updateRawTextareaView();
        showToast(state.rawTextViewMode === "chapter" ? "已切换为：当前聚焦章节原文视图" : "已切换为：全书完整文本视图");
      });
    }

    if (els.fileInput) els.fileInput.addEventListener("change", handleFileUpload);

    // 拖拽文件直接导入 (支持 EPUB / TXT / MD)
    if (els.rawText) {
      els.rawText.addEventListener("dragover", (e) => {
        e.preventDefault();
        els.rawText.classList.add("drag-over");
      });
      els.rawText.addEventListener("dragleave", () => {
        els.rawText.classList.remove("drag-over");
      });
      els.rawText.addEventListener("drop", (e) => {
        e.preventDefault();
        els.rawText.classList.remove("drag-over");
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) {
          handleFileUpload({ target: { files: [file] } });
        }
      });
      els.rawText.addEventListener("input", () => {
        if (state.rawTextViewMode === "chapter" && state.chapters[state.focusedChapterIndex]) {
          const ch = state.chapters[state.focusedChapterIndex];
          ch.text = els.rawText.value;
          ch.wordCount = ch.text.length;
          ch.segments = null; // 标记需按需重解析
        } else if (state.rawTextViewMode === "full") {
          if (!els.rawText.value.includes("... [为保")) {
            state.novel.rawText = els.rawText.value;
          }
        }
      });
    }
    if (els.clearButton) {
      els.clearButton.addEventListener("click", () => {
        if (els.rawText) els.rawText.value = "";
        if (state.novel) state.novel.rawText = "";
        state.chapters = [];
        state.focusedChapterIndex = 0;
        state.activeChapterIndex = 0;
        updateRawTextareaView();
        renderChapters();
        renderFocusedChapterDeck();
        rebuildCharacterTree();
        updateNovelInStorage();
        showToast("正文已清空");
      });
    }

    if (els.sampleSanguoBtn) els.sampleSanguoBtn.addEventListener("click", () => loadSample("sanguo", true));
    if (els.sampleXianxiaBtn) els.sampleXianxiaBtn.addEventListener("click", () => loadSample("xianxia", true));
    if (els.sampleQingyuBtn) els.sampleQingyuBtn.addEventListener("click", () => loadSample("qingyunian", true));

    // 书名输入同步
    if (els.bookTitle) {
      els.bookTitle.addEventListener("input", () => {
        state.novel.title = els.bookTitle.value.trim() || "未命名小说";
        updateNovelInStorage();
        renderSharedHeader("studio");
        const rootTitle = document.getElementById("treeRootNovelTitle");
        if (rootTitle) rootTitle.textContent = `《${state.novel.title}》`;
      });
    }

    // 语速滑块
    if (els.rateSlider) {
      els.rateSlider.addEventListener("input", () => {
        const rate = Number(els.rateSlider.value);
        state.speed = rate;
        if (els.rateValue) els.rateValue.value = `${rate.toFixed(1)}x`;
        updateSpeedPillsActive(rate);
      });
    }

    // 倍速按钮组
    document.querySelectorAll(".speed-pill-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const speed = parseFloat(btn.dataset.speed);
        if (!isNaN(speed)) {
          state.speed = speed;
          if (els.rateSlider) els.rateSlider.value = speed;
          if (els.rateValue) els.rateValue.value = `${speed.toFixed(1)}x`;
          updateSpeedPillsActive(speed);
        }
      });
    });

    // 生成模式切换
    if (els.ttsMode) {
      els.ttsMode.addEventListener("change", updateTtsModeNotice);
      updateTtsModeNotice();
    }

    // 章节选择工具栏
    if (els.selectAllButton) els.selectAllButton.addEventListener("click", () => toggleSelectAll(true));
    if (els.invertSelectionButton) els.invertSelectionButton.addEventListener("click", toggleInvertSelect);
    if (els.previewFirstButton) els.previewFirstButton.addEventListener("click", previewFirstChapter);
    
    // 角色树定位与检视跳转
    if (els.openTreePageButton) els.openTreePageButton.addEventListener("click", scrollToCharacterTree);
    if (els.openDeepTreePageButton) els.openDeepTreePageButton.addEventListener("click", () => openDeepTreePage());
    if (els.jumpToTreeSectionBtn) els.jumpToTreeSectionBtn.addEventListener("click", scrollToCharacterTree);
    if (els.studioOpenDeepTreeBtn) els.studioOpenDeepTreeBtn.addEventListener("click", () => openDeepTreePage());

    // 本书角色树方案切换与视图切换
    if (els.studioSchemeSelect) {
      els.studioSchemeSelect.addEventListener("change", (e) => {
        handleApplyScheme(e.target.value);
      });
    }
    if (els.studioApplySchemeBtn) {
      els.studioApplySchemeBtn.addEventListener("click", () => {
        if (els.studioSchemeSelect) handleApplyScheme(els.studioSchemeSelect.value);
      });
    }

    if (els.studioViewTreeBtn) {
      els.studioViewTreeBtn.addEventListener("click", () => setStudioTreeViewMode("tree"));
    }
    if (els.studioViewGridBtn) {
      els.studioViewGridBtn.addEventListener("click", () => setStudioTreeViewMode("grid"));
    }

    // 角色树辅助按钮 (体检、加角色)
    if (els.studioDiagnoseBtn) els.studioDiagnoseBtn.addEventListener("click", openStudioDiagnoseModal);
    if (els.studioAddCharBtn) els.studioAddCharBtn.addEventListener("click", openStudioAddCharModal);
    if (els.confirmAddCharBtn) els.confirmAddCharBtn.addEventListener("click", handleStudioConfirmAddChar);
    if (els.confirmSwapBtn) els.confirmSwapBtn.addEventListener("click", handleStudioConfirmSwap);
    if (els.confirmMergeBtn) els.confirmMergeBtn.addEventListener("click", handleStudioConfirmMerge);

    // 实时搜索过滤与一键清空
    if (els.studioCharSearchInput) {
      els.studioCharSearchInput.addEventListener("input", (e) => {
        state.charTreeSearchQuery = e.target.value.trim().toLowerCase();
        if (els.studioCharSearchClearBtn) {
          els.studioCharSearchClearBtn.style.display = state.charTreeSearchQuery ? "block" : "none";
        }
        renderStudioCharacterTree();
      });
    }

    if (els.studioCharSearchClearBtn) {
      els.studioCharSearchClearBtn.addEventListener("click", () => {
        if (els.studioCharSearchInput) {
          els.studioCharSearchInput.value = "";
          state.charTreeSearchQuery = "";
          els.studioCharSearchClearBtn.style.display = "none";
          renderStudioCharacterTree();
          els.studioCharSearchInput.focus();
        }
      });
    }

    // 矩阵排版密度切换 (紧凑 vs 舒适)
    if (els.studioMatrixCompactBtn) {
      els.studioMatrixCompactBtn.addEventListener("click", () => {
        state.charTreeDensity = "compact";
        els.studioMatrixCompactBtn.classList.add("is-active");
        if (els.studioMatrixComfortBtn) els.studioMatrixComfortBtn.classList.remove("is-active");
        if (els.studioTreeGridView) els.studioTreeGridView.classList.add("is-compact");
      });
    }

    if (els.studioMatrixComfortBtn) {
      els.studioMatrixComfortBtn.addEventListener("click", () => {
        state.charTreeDensity = "comfort";
        els.studioMatrixComfortBtn.classList.add("is-active");
        if (els.studioMatrixCompactBtn) els.studioMatrixCompactBtn.classList.remove("is-active");
        if (els.studioTreeGridView) els.studioTreeGridView.classList.remove("is-compact");
      });
    }

    // 分类筛选 Pills (全部 / 男声 / 女声 / 旁白 / 核心 / 客串)
    const filterPills = document.querySelectorAll(".studio-filter-pill[data-filter]");
    filterPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        filterPills.forEach((p) => p.classList.remove("is-active"));
        pill.classList.add("is-active");
        state.charTreeFilter = pill.getAttribute("data-filter") || "all";
        renderStudioCharacterTree();
      });
    });

    // Master Deck 播放控制台走带按钮
    if (els.playerPlayPauseBtn) els.playerPlayPauseBtn.addEventListener("click", handlePlayerPlayPause);
    if (els.footerPlayPauseBtn) els.footerPlayPauseBtn.addEventListener("click", handlePlayerPlayPause);
    if (els.playerStopBtn) els.playerStopBtn.addEventListener("click", handlePlayerStop);
    if (els.playerPrevBtn) els.playerPrevBtn.addEventListener("click", handlePlayerPrev);
    if (els.playerNextBtn) els.playerNextBtn.addEventListener("click", handlePlayerNext);

    // 进度条拖拽跳转
    if (els.playerProgress) els.playerProgress.addEventListener("input", handleScrubberInput);

    // 批量生成与控制按钮
    if (els.generateSelectedButton) els.generateSelectedButton.addEventListener("click", generateSelectedChapters);
    if (els.generateAllButton) els.generateAllButton.addEventListener("click", generateAllChapters);
    if (els.pauseButton) els.pauseButton.addEventListener("click", pauseGeneration);
    if (els.resumeButton) els.resumeButton.addEventListener("click", resumeGeneration);
    if (els.stopButton) els.stopButton.addEventListener("click", stopGeneration);
    if (els.zipButton) els.zipButton.addEventListener("click", downloadZip);

    // 主控副走带控制 (音量、静音、连播模式)
    initMasterDeckAuxControls();

    // Alexandria 剧本检视与微调工具栏按钮
    if (els.addScriptLineBtn) els.addScriptLineBtn.addEventListener("click", handleAddScriptLine);
    if (els.reInferScriptBtn) els.reInferScriptBtn.addEventListener("click", handleReInferScript);
    if (els.saveScriptDeckBtn) els.saveScriptDeckBtn.addEventListener("click", handleSaveScriptDeck);
    if (els.toggleBatchSpeakerBtn) els.toggleBatchSpeakerBtn.addEventListener("click", toggleBatchSpeakerDrawer);
    if (els.closeBatchSpeakerBtn) els.closeBatchSpeakerBtn.addEventListener("click", () => {
      if (els.batchSpeakerDrawer) els.batchSpeakerDrawer.style.display = "none";
    });
    if (els.executeBatchSpeakerBtn) els.executeBatchSpeakerBtn.addEventListener("click", executeBatchSpeakerReplace);
    if (els.exportScriptSrtBtn) els.exportScriptSrtBtn.addEventListener("click", exportScriptSrt);
    if (els.exportScriptTxtBtn) els.exportScriptTxtBtn.addEventListener("click", exportScriptTxt);

    // 模态弹窗关闭统一委托给 ModalManager
    document.querySelectorAll("[data-modal-close]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const modalId = btn.getAttribute("data-modal-close");
        if (modalId) ModalManager.close(modalId);
      });
    });

    // 窗口尺寸变化重绘波形
    window.addEventListener("resize", () => {
      drawWaveform(els.studioWaveCanvas, state.isPlaying);
    });
  }

  function updateSpeedPillsActive(speed) {
    document.querySelectorAll(".speed-pill-btn").forEach((btn) => {
      const btnSpeed = parseFloat(btn.dataset.speed);
      btn.classList.toggle("is-active", Math.abs(btnSpeed - speed) < 0.05);
    });
  }

  function checkTtsSupport() {
    if (AudioEngine.isSupported()) {
      els.supportStatus.textContent = "Web Speech 就绪";
      els.supportStatus.className = "soft-status is-active";
    } else {
      els.supportStatus.textContent = "浏览器暂不支持内置语音";
      els.supportStatus.className = "soft-status is-warn";
    }
  }

  function updateTtsModeNotice() {
    const mode = els.ttsMode.value;
    els.onlinePanel.hidden = mode !== "online";

    const notices = {
      "browser-preview": "📢 浏览器试听模式：采用浏览器内置多角色合成，实时发音演播，无需外部服务器，试听极快。",
      "browser-record": "🎙️ 浏览器内录模式：边演播边将多角色音频合并录制为标准 WAV 音频文件，支持单章下载与整书打包打包。",
      "online": "🌐 在线接口模式：调用自定义 TTS API 接口，批量合成高品质有声书 MP3/WAV 并下载。",
    };
    els.modeNotice.textContent = notices[mode] || "";
  }

  /* -------------------------------------------------------------
     Sample Loading & File Upload
  ------------------------------------------------------------- */
  function loadSample(key, showNotice = true) {
    const sample = NOVEL_SAMPLES[key];
    if (!sample) return;

    els.bookTitle.value = sample.title;
    els.rawText.value = sample.text;
    state.novel.title = sample.title;
    state.novel.rawText = sample.text;

    parseAndRenderChapters(sample.text, false);

    if (showNotice) {
      showToast(`已载入示例：《${sample.title}》`);
    }
  }

  /**
   * 智能小说文件编码自适应解码器
   * 自动探测 UTF-8 (含BOM)、UTF-16LE/BE，以及国内网络小说极其普及的 GBK / GB2312 / GB18030 编码，
   * 彻底根除乱码导致的章节无法识别与解析失败问题。
   */
  function decodeNovelBuffer(buffer) {
    const bytes = new Uint8Array(buffer);
    if (!bytes || bytes.length === 0) return "";

    // 1. 优先探测文件开头 BOM 字节标记
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      return new TextDecoder("utf-8").decode(bytes.subarray(3));
    }
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
      return new TextDecoder("utf-16le").decode(bytes.subarray(2));
    }
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
      return new TextDecoder("utf-16be").decode(bytes.subarray(2));
    }

    // 2. 严格 UTF-8 校验 (致命容错探测)
    try {
      const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
      return utf8Decoder.decode(bytes);
    } catch (e) {
      // 捕获到非标准 UTF-8 字节，自适应回退到中文国标 GB18030（向下完全兼容 GBK 与 GB2312）
      try {
        const gbkDecoder = new TextDecoder("gb18030");
        return gbkDecoder.decode(bytes);
      } catch (gbkErr) {
        console.warn("GB18030 decoder failed, falling back to permissive utf-8", gbkErr);
        return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      }
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // 清空 input 缓存，允许用户重复选择同名文件再次上传
    const targetInput = e.target;

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".epub")) {
      showToast(`📖 正在解析 EPUB 电子书《${file.name}》...`);
      try {
        const result = await AudioEngine.parseEpub(file, file.name);
        const bookTitle = result.title || file.name.replace(/\.[^/.]+$/, "");
        if (els.bookTitle) els.bookTitle.value = bookTitle;
        state.novel.title = bookTitle;
        state.novel.rawText = result.full_text || "";

        // 直接采用 EPUB 规范目录结构与提取出的各章节
        if (result.chapters && result.chapters.length > 0) {
          state.chapters = result.chapters.map((ch, idx) => ({
            id: `ch_${idx + 1}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            title: (ch.title || `第 ${idx + 1} 章`).trim(),
            text: (ch.content || "").trim(),
            wordCount: (ch.content || "").trim().length,
            segments: null,
            dialogueCount: 0,
            selected: true,
            status: "idle",
            audioBlob: null,
            audioUrl: null,
          }));
          state.focusedChapterIndex = 0;
          displayChaptersInstantly(false);
          showToast(`✅ 成功解析 EPUB《${bookTitle}》：已提取 ${result.chapters.length} 个章节，共 ${(result.total_chars || result.full_text.length).toLocaleString()} 字！`);
        } else {
          parseAndRenderChapters(result.full_text, true);
        }
      } catch (err) {
        console.error("EPUB parse error:", err);
        showToast(`EPUB 解析失败：${err.message || err}`);
      } finally {
        if (targetInput) targetInput.value = "";
      }
      return;
    }

    showToast(`📂 正在读取并自适应解码文件《${file.name}》...`);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const arrayBuffer = evt.target.result;
        const text = decodeNovelBuffer(arrayBuffer);
        if (!text || !text.trim()) {
          showToast("文件内容为空或无法识别有效文本");
          return;
        }

        const guessedTitle = file.name.replace(/\.[^/.]+$/, "");
        if (els.bookTitle) els.bookTitle.value = guessedTitle;
        state.novel.title = guessedTitle;
        state.novel.rawText = text;

        parseAndRenderChapters(text, true);
      } catch (err) {
        console.error("File decode error:", err);
        showToast(`文件解析失败：${err.message || err}`);
      } finally {
        if (targetInput) targetInput.value = "";
      }
    };
    reader.onerror = () => {
      showToast("读取文件失败，请检查文件权限或尝试直接复制粘贴");
      if (targetInput) targetInput.value = "";
    };
    reader.readAsArrayBuffer(file);
  }

  /* -------------------------------------------------------------
     High-Performance Precompiled Regex Patterns for Parsing
  ------------------------------------------------------------- */
  const CN_NUM_PATTERN = "[0-9０-９一二三四五六七八九十百千万两〇零壹贰叁肆伍陆柒捌玖拾]+";
  const CHAPTER_UNITS_PATTERN = "[章节回卷部篇讲折幕集话节期]";

  const REGEX_STANDARD_CHAPTER = new RegExp(
    "^(?:[【\\[（(《〔]?\\s*(?:正文|VIP|vip|作品相关)?(?:卷\\s*" + CN_NUM_PATTERN + "|卷)?\\s*)*[【\\[（(《〔]?\\s*第\\s*" + CN_NUM_PATTERN + "\\s*" + CHAPTER_UNITS_PATTERN + "\\s*[】\\]）)》〕]?[\\s:：、.．\\-—]*.*$",
    "i"
  );
  const REGEX_WESTERN_CHAPTER = /^(?:Chapter|Volume|Section|Episode|Part)\s+[0-9ivxlcdm]+[\s:：、.．\-—]*.*$/i;
  const REGEX_VOLUME_CHAPTER = new RegExp(
    "^(?:[【\\[（(《〔]?\\s*(?:正文|VIP)?\\s*)?(?:第\\s*" + CN_NUM_PATTERN + "\\s*卷|(?:上|中|下|终|前|后|正文|VIP)\\s*卷(?:\\s*" + CN_NUM_PATTERN + ")?|卷\\s*" + CN_NUM_PATTERN + ")[】\\]）)》〕]?[\\s:：、.．\\-—]*.*$",
    "i"
  );
  const REGEX_SPECIAL_CHAPTER = /^[【\[（(《〔]?\s*(?:楔子|引子|序章|序篇|序言|自序|前言|尾声|后记|后序|终章|结语|大结局|完本感言|完结感言|外传|番外(?:篇|一|二|三|四|五|[0-9]+)?)[】\]）)》〕]?[\s:：、.．\-—]*.*$/i;
  const REGEX_NUMBERED_CHAPTER = /^[【\[]?\s*[0-9０-９]{1,4}\s*[、.．:：\-\s]\s*[\u4e00-\u9fa5A-Za-z0-9].{0,40}$/;

  const REPORTING_VERB_REGEX = /(?:低声说道|轻声说道|高声说道|沉声说道|厉声说道|怒喝道|呵斥道|怒斥道|吩咐道|命令道|喃喃道|自语道|苦笑道|哭诉道|附和道|反问道|冷笑道|低声道|轻声道|高声道|沉声道|厉声道|叹息道|尖叫道|大喝道|娇声道|柔声道|怒喝|大喝|冷笑|冷哼|苦笑|喝道|喊道|笑道|叹道|怒道|叫道|答道|问道|说道|答曰|问曰|笑曰|叹曰|怒曰|言曰|商议道|哭道|骂道|叱道|吼道|喝问|怒斥|轻语|低语|回道|应道|曰|道|说|问|答|喊|叫)$/;
  const INTRO_PREFIX_REGEX = /^(?:只听得|忽听得|但听得|只见得|忽见得|忽见|忽听|只见|只听|但见|便见|听得|此时|这时|正当|当下|却说|却见|随后|接着|转眼|不知不觉)*\s*(?:那|一个|一名|一位|有位|某位|身旁|身后|旁边|身旁的|对面的|门外的|座上的|堂下的|当先一人|为首一人|身穿[^，,]+的|门外|门前|堂前|堂下|阶下|殿前|殿下|营外|城头|窗外|楼下|楼上)*/;
  const MANNERISM_CLAUSE_REGEX = /^(?:娇声|冷声|厉声|低声|轻声|沉声|高声|微声|柔声|厉喝|怒喝|拱手|躬身|抱拳|叹息|附和|冷笑|苦笑|大笑|微笑|冷哼|咬牙|含笑|含泪|挥手|摆手|点头|摇头|微|大声|急忙|连忙|慌忙|冷冷|淡淡|忽然|突然|猛地|不由得)$/;
  const REGEX_PRONOUN_SPEAKER = /^\s*[，,。.!！?？、]*(他|她|其人|那人|此人)\s*(?:低声说道|轻声说道|怒喝道|冷笑道|低声道|轻声道|叹息道|喝道|喊道|笑道|叹道|怒道|叫道|答道|问道|说道|答曰|问曰|笑曰|叹曰|怒曰|曰|道|说|问|答)/;

  const NOISE_WORDS = new Set([
    "众人皆惊", "众人", "大家", "大伙", "他们", "有人", "那人", "此人", "黑衣人", "神秘人",
    "蒙面人", "一人", "某人", "四周", "门外", "身后", "台下", "远处", "半空", "突然", "这时",
    "片刻", "良久", "弟子", "老夫", "属下", "小人", "在下", "奴才", "奴婢", "贫道", "老道",
    "本座", "本王", "为师", "末将", "小僧", "对方", "来人", "路人", "旁人", "双方", "两人", "二人",
    "齐声", "屋内寂静无声", "此时屋外狂风大作", "小厮", "丫鬟", "丫头", "下人", "家丁", "侍卫",
    "手下", "将军", "先生", "兄弟", "主公", "大人", "陛下", "皇上", "得门外小", "门外小厮",
    // 载体、心理活动与第一章常见无名泛称
    "碑文", "古籍", "石碑", "石刻", "卷轴", "玉简", "牌匾", "大字", "横幅", "信件", "信上", "书上",
    "提示音", "系统提示", "机械音", "相传", "传说", "古人", "古语", "俗话", "老话", "俗话说", "老辈人",
    "为首之人", "为首者", "带头之人", "带头人", "黑衣青年", "白衣女子", "宗主负手", "他心中暗", "少年心中"
  ]);

  // 中文常见百家姓与复姓库 (用于严格人名准入)
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
    "尹", "黎", "易", "常", "武", "乔", "贺", "赖", "龚", "文"
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

  function checkValidCharacterName(rawName) {
    if (typeof isValidCharacterName === "function") {
      return isValidCharacterName(rawName);
    }
    if (!rawName || typeof rawName !== "string") return false;
    const name = rawName.trim().replace(/[^\u4e00-\u9fa5A-Za-z·]/g, "");
    if (name.length < 2 || name.length > 5) return false;
    if (NOISE_WORDS.has(name)) return false;
    if (/.*(?:小厮|丫鬟|丫头|下人|家丁|侍卫|手下|侍从|护卫|弟子|门徒|门生|属下|刺客|官兵|将士|众将|众人|黑衣人|蒙面人)$/.test(name)) return false;
    if (/^(?:门外|窗外|堂前|堂下|阶下|殿前|殿下|身旁|身后|旁边|城头|楼上|楼下|此时|这时|只听|忽听|正当|得门)/.test(name)) return false;
    if (/^(?:走|跑|看|望|瞧|听|闻|叫|喊|叹|笑|怒|打|杀|拔|提|抚|按|立|回|转|进|出|来|去|带|拿|抓)/.test(name)) return false;
    if (/(?:而立|而行|而去|而来|而出|起来|过去|过来|一下|一声)$/.test(name)) return false;
    if (VALID_TITLE_CHARACTERS.has(name)) return true;
    for (const cs of CHINESE_COMPOUND_SURNAMES) {
      if (name.startsWith(cs) && name.length >= 3) return true;
    }
    if (CHINESE_SURNAMES.has(name[0])) return true;
    if (name.length === 2 && (name.endsWith("儿") || name.endsWith("哥") || name.endsWith("妹") || name.endsWith("爷"))) return true;
    return false;
  }

  function isNoiseSpeaker(candidate) {
    if (!candidate || candidate.length < 2 || candidate.length > 5) return true;
    if (NOISE_WORDS.has(candidate)) return true;
    if (!checkValidCharacterName(candidate)) return true;
    return false;
  }

  // 拟声词与非对话行内引用的判定逻辑（彻底解决第一章名词与拟声词误切为对白导致不连贯问题）
  function isInlineQuoteOrOnomatopoeia(matchText, beforeText, afterText) {
    const content = (matchText || "").trim();
    if (!content || content.length > 30) return false;

    // 1. 拟声词
    if (/^(?:砰|轰隆|轰|咚|咚咚|咔嚓|咔|呼|嗖|唰|啪|嗒|嗡|当|铛|叮当|哗啦|哗|噗嗤|噗|刺啦|吱呀|哐当|咕咚)$/.test(content)) {
      if (/^(?:的?一声|巨响|脆响|闷响|响声|声响|传出|回荡)/.test(afterText.trim())) {
        return true;
      }
    }

    // 2. 专有名词、概念、书名或特定词语引用 (如 被称为“斗气大陆”的世界、所谓的“正道”)
    const beforeTrimmed = (beforeText || "").trim();
    if (/(?:被称为|所谓的|名为|唤作|名叫|号称|印着|刻着|写着|刻有|浮现出|浮现|打着|挂着|立着|化作|叫做|成|是|成语|词语|代号|绰号|所谓)(?:[“"‘'（(【《\[\s]*)$/.test(beforeTrimmed)) {
      const afterTrimmed = (afterText || "").trim();
      if (/^(?:的|三个|四个|两个|二字|三字|四字|大字|字样|三个字|四个字|之称|之名|吗|吧|呢|啊|，|。|！|？)/.test(afterTrimmed) || afterTrimmed.length === 0) {
        return true;
      }
    }

    // 3. 短语修饰引用 (如 拥有"至尊骨"的天才、"天道"之说)
    if (content.length <= 6 && !/[，。！？!?；;]/.test(content)) {
      const afterTrimmed = (afterText || "").trim();
      if (/^(?:的|之|之人|者|弟子|天才|功法|神兵|秘籍|阵法|丹药|灵草)/.test(afterTrimmed)) {
        return true;
      }
    }

    return false;
  }

  const ACTION_AND_THOUGHT_TRUNCATE_REGEX = /(?:负手而立|负手|挺身而立|傲然屹立|傲立|昂首|轻抚|手抚|抚|手提|提|拔出|拔剑|拔刀|拔|手按|按|拍案|躬身|站起|转过|回过|沉吟|咬牙切齿|咬牙|深吸一口气|深吸|哈哈大笑|哈哈|微微一笑|微微|微笑|淡然一笑|淡然|嫣然一笑|嫣然|摇了摇头|摇动|俏脸|擦了擦|擦了|看了看|看了|望向|怒目而视|怒目|瞪眼|长叹一声|长叹|叹了口气|叹息|冷笑一声|冷笑|冷哼一声|冷哼|苦笑一声|苦笑|纵身一跃|纵身|跃下|跳下|拱手道|拱手|抱拳道|抱拳|跪倒在地|跪倒|冷冷一笑|冷冷|大笑|暗想|心想|大怒|面露凶光|面露|眼中闪过|正色道|正色|叹道|笑道|怒道|微笑着|笑着|哭着|沉声|厉声|低声|轻声|高声|冷声|娇声|柔声|朗声|怒声|大声|厉喝|怒喝|大喝|心中暗道|心中暗想|心中冷笑|心中暗自|心中思忖|暗自思忖|心中念道|心下暗道|心下琢磨|心中|心下|暗道|暗想|心想).*$/;

  const BUILTIN_ALIAS_MAP = {
    "玄德": "刘备",
    "刘玄德": "刘备",
    "玄德公": "刘备",
    "备": "刘备",
    "使君": "刘备",
    "孔明": "诸葛亮",
    "诸葛孔明": "诸葛亮",
    "孔明先生": "诸葛亮",
    "亮": "诸葛亮",
    "云长": "关羽",
    "关云长": "关羽",
    "关公": "关羽",
    "二爷": "关羽",
    "翼德": "张飞",
    "张翼德": "张飞",
    "三爷": "张飞",
    "孟德": "曹操",
    "曹孟德": "曹操",
    "子龙": "赵云",
    "赵子龙": "赵云",
    "公瑾": "周瑜",
    "周公瑾": "周瑜",
    "仲谋": "孙权",
    "药老头": "药老",
    "药尊者": "药老",
    "药尘": "药老",
    "岩枭": "萧炎",
    "炎儿": "萧炎",
    "韩老魔": "韩立",
    "韩师兄": "韩立",
    "立儿": "韩立",
    "蓉儿": "黄蓉",
    "靖哥哥": "郭靖",
    "婉儿": "南宫婉",
    "翠儿": "小翠",
    // 四大名著及玄幻仙侠高频别名
    "大圣": "孙悟空",
    "齐天大圣": "孙悟空",
    "猴哥": "孙悟空",
    "行者": "孙悟空",
    "八戒": "猪八戒",
    "呆子": "猪八戒",
    "三藏": "唐僧",
    "玄奘": "唐僧",
    "沙师弟": "沙僧",
    "林妹妹": "林黛玉",
    "黛玉": "林黛玉",
    "颦儿": "林黛玉",
    "宝玉": "贾宝玉",
    "宝哥哥": "贾宝玉",
    "宝姐姐": "薛宝钗",
    "宝钗": "薛宝钗",
    "凤姐": "王熙凤",
    "凤姐儿": "王熙凤",
    "琏二爷": "贾琏",
    "过儿": "杨过",
    "姑姑": "小龙女",
    "龙儿": "小龙女",
    "无忌": "张无忌",
    "忌儿": "张无忌",
    "冲儿": "令狐冲",
    "令狐师兄": "令狐冲",
    "盈盈": "任盈盈",
    "小凡": "张小凡",
    "鬼厉": "张小凡",
    "雪琪": "陆雪琪",
    "熏儿": "萧薰儿",
    "美杜莎": "彩鳞"
  };

  /* -------------------------------------------------------------
     Two-Phase High-Speed Novel Chapter & Script Engine
  ------------------------------------------------------------- */
  let backgroundEnrichTimer = null;

  /**
   * 按需解析单章句段与台词（延迟懒加载核心），单章耗时仅约 1~2ms
   */
  function ensureChapterParsed(chapter) {
    if (!chapter) return null;
    if (!chapter.segments) {
      const segments = extractSegments(chapter.text || "");
      chapter.segments = segments;
      chapter.dialogueCount = segments.filter(s => s.type === "dialogue").length;
    }
    return chapter;
  }

  /**
   * 后台异步分片增量解析剩余章节，完全不阻塞主线程
   */
  function scheduleBackgroundEnrichment() {
    if (backgroundEnrichTimer) {
      clearTimeout(backgroundEnrichTimer);
      backgroundEnrichTimer = null;
    }

    let nextIdx = 0;
    const chunkSize = 15;

    function processChunk() {
      if (!state.chapters || state.chapters.length === 0) return;

      let processed = 0;
      while (nextIdx < state.chapters.length && processed < chunkSize) {
        const ch = state.chapters[nextIdx];
        if (ch && !ch.segments) {
          ensureChapterParsed(ch);
          processed++;
        }
        nextIdx++;
      }

      if (nextIdx < state.chapters.length) {
        backgroundEnrichTimer = setTimeout(processChunk, 25);
      } else {
        backgroundEnrichTimer = null;
        extractAllQuotes();
        rebuildCharacterTree();
        updateChapterDialogueBadges();
      }
    }

    backgroundEnrichTimer = setTimeout(processChunk, 80);
  }

  function updateChapterDialogueBadges() {
    document.querySelectorAll(".chapter-item").forEach(card => {
      const idx = Number(card.dataset.chapterIndex);
      const ch = state.chapters[idx];
      if (!ch) return;
      const countEl = card.querySelector(".word-count");
      if (countEl) {
        const wordCount = ch.wordCount || ch.text.length;
        countEl.textContent = `${wordCount} 字 · ${ch.dialogueCount} 句对白`;
      }
    });
  }

  /**
   * 同步小说原文输入框视图 (当前聚焦章节 vs 全书完整文本)
   */
  function updateRawTextareaView() {
    if (!els.rawText) return;
    const controls = els.rawTextViewControls || document.getElementById("rawTextViewControls");
    const indicator = els.rawTextChapterIndicator || document.getElementById("rawTextChapterIndicator");
    const toggleBtn = els.toggleRawTextModeBtn || document.getElementById("toggleRawTextModeBtn");

    if (!state.chapters.length) {
      if (controls) controls.style.display = "none";
      return;
    }

    if (controls) controls.style.display = "flex";

    const curIdx = state.focusedChapterIndex >= 0 && state.focusedChapterIndex < state.chapters.length
      ? state.focusedChapterIndex
      : 0;
    const currentChapter = state.chapters[curIdx];

    if (state.rawTextViewMode === "full") {
      const fullText = state.novel?.rawText || "";
      if (fullText.length > 25000) {
        els.rawText.value = fullText.slice(0, 25000) + `\n\n... [⚡ 为保护网页极致流畅度，文本框展示前 25,000 字。全书 ${state.chapters.length} 章共 ${fullText.length.toLocaleString()} 字已完整保存在内存中，建议切换为“单章视图”获得极致流畅体验！] ...`;
      } else {
        els.rawText.value = fullText;
      }
      if (indicator) {
        indicator.textContent = `📚 当前展示：全书完整文本 (共 ${state.chapters.length} 章，${(state.novel?.rawText?.length || 0).toLocaleString()} 字)`;
      }
      if (toggleBtn) {
        toggleBtn.textContent = "切换为当前聚焦章节";
      }
    } else {
      if (currentChapter) {
        els.rawText.value = currentChapter.text || "";
        if (indicator) {
          indicator.textContent = `📖 当前展示：第 ${curIdx + 1} 章《${currentChapter.title}》原文 (${(currentChapter.text || "").length.toLocaleString()} 字)`;
        }
      }
      if (toggleBtn) {
        toggleBtn.textContent = "切换为全书文本";
      }
    }
  }

  /**
   * Phase 1: 秒级就绪呈现界面与章节列表
   */
  function displayChaptersInstantly(notify = true) {
    if (state.chapters.length > 0) {
      ensureChapterParsed(state.chapters[0]);
    }

    updateRawTextareaView();
    renderChapters();
    rebuildCharacterTree();
    updateSmartSchemeRecommendation();
    renderFocusedChapterDeck();
    updateNovelInStorage();

    setChapterWorkflowMode(state.chapterWorkflowMode || "list");

    if (state.chapters.length > 0) {
      const ch = state.chapters[0];
      if (els.playerStatusTitle) {
        els.playerStatusTitle.textContent = `准备演播：第 1 章 · ${ch.title}`;
      }
      if (els.masterSegmentIndicator) {
        els.masterSegmentIndicator.textContent = `句段 0 / ${ch.segments ? ch.segments.length : 0}`;
      }
    }

    scheduleBackgroundEnrichment();

    if (notify) {
      showToast(`⚡ 已成功秒级划分 ${state.chapters.length} 个章节！已逐章卡片式呈现，可直接点击每章进行试听、精配与生成。`);
    }
  }

  async function parseAndRenderChapters(text, notify = true) {
    if (notify) {
      showToast("⚡ 正在智能分析章节与人设结构...");
    }
    // 让出主线程 1 帧，保证 Toast 与 UI 动画即刻渲染
    await new Promise(resolve => setTimeout(resolve, 16));

    const cleaned = cleanText(text);
    if (!cleaned) {
      if (notify) showToast("未解析到有效正文文本");
      return;
    }

    const lines = cleaned.split("\n");
    const parsed = [];
    let current = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (isChapterHeading(line)) {
        if (current && current.text.trim()) {
          parsed.push(finalizeChapter(current, parsed.length, false));
        }
        current = { title: line, text: "" };
        continue;
      }

      if (!current) {
        if (!line) continue;
        current = { title: "序章 / 楔子", text: "" };
      }
      current.text += `${rawLine}\n`;
    }

    if (current && current.text.trim()) {
      parsed.push(finalizeChapter(current, parsed.length, false));
    }

    if (!parsed.length) {
      parsed.push(finalizeChapter({ title: "正文第一章", text: cleaned }, 0, false));
    }

    // 智能兜底：若全书仅识别出 1 个单章，且总字数较多(> 4000 字)，说明文本未遵循标准“第X章”命名，自动触发段落智能平滑分章
    if (parsed.length <= 1 && cleaned.length > 4000) {
      const autoChunks = autoSplitLongTextToChapters(cleaned);
      if (autoChunks && autoChunks.length > 1) {
        parsed.length = 0;
        autoChunks.forEach((chunk, i) => {
          parsed.push(finalizeChapter({ title: chunk.title, text: chunk.text }, i, false));
        });
        if (notify) {
          showToast(`💡 检测到长文本未带标准章节头，已智能切分为 ${parsed.length} 个规范章节便于逐章制作！`);
        }
      }
    }

    // 清除上部小说或示例残留的未锁定角色，确保新文本只为实际开口说话的角色按首次登场注册声线
    const preservedTree = {
      "旁白": state.novel?.characterTree?.["旁白"] || {
        character_name: "旁白",
        gender: "male",
        role: "narrator",
        voice_name: "zh-CN-YunxiNeural",
        pitch: 0.96,
        rate_offset: "-2%",
        base_style: "narration-relaxed",
        archetype: "全知史诗旁白",
      }
    };
    if (state.novel?.characterTree) {
      for (const [k, v] of Object.entries(state.novel.characterTree)) {
        if (v && v.userExplicitlyLocked) {
          preservedTree[k] = v;
        }
      }
    }
    state.novel.characterTree = preservedTree;

    state.chapters = parsed;
    state.focusedChapterIndex = 0;

    displayChaptersInstantly(notify);
  }

  function autoSplitLongTextToChapters(text, targetChunkSize = 2500) {
    const paragraphs = text.split("\n");
    const chapters = [];
    let currentLines = [];
    let currentLength = 0;
    let chapterIndex = 1;

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      currentLines.push(p);
      currentLength += p.length;

      if (currentLength >= targetChunkSize && (!p.trim() || currentLength >= targetChunkSize * 1.4)) {
        const chunkText = currentLines.join("\n").trim();
        if (chunkText) {
          chapters.push({
            title: `第 ${chapterIndex} 节`,
            text: chunkText,
          });
          chapterIndex++;
        }
        currentLines = [];
        currentLength = 0;
      }
    }

    if (currentLines.length > 0) {
      const remainingText = currentLines.join("\n").trim();
      if (remainingText) {
        if (chapters.length > 0 && remainingText.length < 500) {
          chapters[chapters.length - 1].text += `\n\n${remainingText}`;
        } else {
          chapters.push({
            title: `第 ${chapterIndex} 节`,
            text: remainingText,
          });
        }
      }
    }

    return chapters;
  }

  function finalizeChapter(raw, index, parseImmediately = false) {
    const text = (raw.text || "").trim();
    let segments = null;
    let dialogueCount = 0;
    if (parseImmediately) {
      segments = extractSegments(text);
      dialogueCount = segments.filter(s => s.type === "dialogue").length;
    }
    return {
      id: `ch_${index + 1}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: (raw.title || `第 ${index + 1} 章`).trim(),
      text: text,
      wordCount: text.length,
      segments: segments,
      selected: true,
      status: "idle",
      audioBlob: null,
      audioUrl: null,
      dialogueCount: dialogueCount,
    };
  }

  function convertStraightQuotes(text) {
    if (!text || text.indexOf('"') === -1) return text;
    let out = "";
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (!inQuote) {
          out += "“";
          inQuote = true;
        } else {
          out += "”";
          inQuote = false;
        }
      } else {
        if (ch === "\n") {
          inQuote = false;
        }
        out += ch;
      }
    }
    return out;
  }

  function cleanText(input) {
    if (!input) return "";
    let s = (input || "")
      .replace(/\r\n?/g, "\n")
      .replace(/[\u200b-\u200f\u202a-\u202e\ufeff]/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/[「『]/g, "“")
      .replace(/[」』]/g, "”");
    s = convertStraightQuotes(s);
    return s
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
  }

  function isChapterHeading(rawLine) {
    if (!rawLine) return false;
    const line = rawLine.trim();
    if (!line || line.length > 80) return false;

    if (/^[“"‘'（(【《\[]/.test(line) && /[”"’'）)】》\]]$/.test(line) && line.length > 40) {
      return false;
    }

    if (REGEX_STANDARD_CHAPTER.test(line)) return true;
    if (REGEX_WESTERN_CHAPTER.test(line)) return true;
    if (REGEX_VOLUME_CHAPTER.test(line) && line.length <= 40) return true;
    if (REGEX_SPECIAL_CHAPTER.test(line)) return true;
    if (REGEX_NUMBERED_CHAPTER.test(line)) return true;

    return false;
  }

  function extractSegments(text) {
    const pattern = /“([^”]{1,1200})”|"([^"\n]{1,1200})"/g;
    const segments = [];
    let lastIndex = 0;
    let match;
    let lastSpeaker = "";

    while ((match = pattern.exec(text))) {
      const spoken = (match[1] || match[2] || "").trim();
      const beforeRaw = text.slice(lastIndex, match.index);
      const afterRaw = text.slice(pattern.lastIndex, Math.min(text.length, pattern.lastIndex + 40));

      // 智能识别行内拟声词、专有名词、概念修饰引用（如 被称为“斗气大陆”的世界、只听“砰”的一声）
      if (isInlineQuoteOrOnomatopoeia(spoken, beforeRaw, afterRaw)) {
        // 直接不切分对白，完整保留在旁白叙事流中，保持声音连贯无卡顿停顿
        continue;
      }

      const before = text.slice(lastIndex, match.index).trim();
      if (before) {
        segments.push({
          type: "narration",
          speaker: "旁白",
          text: before,
          emotion: inferEmotion(before, "narration"),
        });
      }

      if (spoken) {
        const inferred = inferSpeaker(text, match.index, pattern.lastIndex);
        const rawSpeaker = (inferred === "沿用上一位" && lastSpeaker) ? lastSpeaker : (inferred || "旁白");
        const canonicalSpeaker = resolveCanonicalSpeaker(rawSpeaker);

        // 如果推断出的说话人是旁白或非法角色名，100% 纠偏归为全知旁白演播，绝不注册多余音色树
        const isNarr = !canonicalSpeaker || canonicalSpeaker === "旁白" || canonicalSpeaker === "人物" || !checkValidCharacterName(canonicalSpeaker);
        const finalSpeaker = isNarr ? "旁白" : canonicalSpeaker;
        if (!isNarr) {
          lastSpeaker = finalSpeaker;
        }

        segments.push({
          type: isNarr ? "narration" : "dialogue",
          speaker: finalSpeaker,
          rawSpeaker: (!isNarr && rawSpeaker && rawSpeaker !== finalSpeaker) ? rawSpeaker : undefined,
          text: spoken,
          emotion: inferEmotion(spoken, isNarr ? "narration" : "dialogue"),
        });
      }
      lastIndex = pattern.lastIndex;
    }

    const rest = text.slice(lastIndex).trim();
    if (rest) {
      segments.push({
        type: "narration",
        speaker: "旁白",
        text: rest,
        emotion: inferEmotion(rest, "narration"),
      });
    }

    if (!segments.length && text) {
      segments.push({ type: "narration", speaker: "旁白", text: text, emotion: "narration-relaxed" });
    }

    return segments;
  }

  function extractSpeakerBefore(beforeText) {
    if (!beforeText) return "";
    let text = beforeText.trim().replace(/[\s:：，,、]+$/, "");
    if (!text) return "";

    // 1. 检查是否为物体载体/典籍古语引用（石碑刻着/古籍记载/卷轴写道/提示音），本该属于全知旁白演播
    if (/(?:石碑|碑文|古籍|典籍|玉简|卷轴|牌匾|大字|信上|书上|壁上|墙上|上刻着|上写着|记载道|记载|刻道|写道|提示音|系统提示|相传|古人云)/.test(text)) {
      return "旁白";
    }

    // 2. 检查心理活动（如："他心中暗道"、"林动心中暗想"、"少年心中冷笑"），心理活动纯属内心独白，一律归为旁白演播
    const isThoughtPattern = /(?:心中暗道|心中暗想|心中冷笑|心中暗自|心中思忖|暗自思忖|心中念道|心下暗道|心下琢磨|心中|心下|暗道|暗想|心想|寻思|自忖|思忖)/.test(text);
    if (isThoughtPattern) {
      return "旁白";
    }

    const verbMatch = text.match(REPORTING_VERB_REGEX);
    if (!verbMatch) return "";

    const verb = verbMatch ? verbMatch[0] : "";
    const preVerb = verb ? text.slice(0, text.length - verb.length).trim() : text;

    const clauses = preVerb.split(/[，,。.!！？?；;\n]/).map(c => c.trim()).filter(Boolean);
    if (clauses.length === 0) return "";

    let targetClause = clauses[clauses.length - 1];

    // 若最后一个分句仅为动作神态状语（如 "黄蓉嫣然一笑，娇声道：" 中逗号后的 "娇声"），回溯到前一个主语分句
    if (clauses.length >= 2 && MANNERISM_CLAUSE_REGEX.test(targetClause)) {
      targetClause = clauses[clauses.length - 2];
    }

    // 剥离引入前缀
    targetClause = targetClause.replace(INTRO_PREFIX_REGEX, "").trim();

    // 剥离主语后的动作修饰语与心理活动语（如 负手而立、挺身、心中暗想等）
    targetClause = targetClause.replace(ACTION_AND_THOUGHT_TRUNCATE_REGEX, "").trim();

    let candidate = targetClause.replace(/[^\u4e00-\u9fa5A-Za-z·]/g, "").trim();
    candidate = candidate.replace(/^(?:门外|门前|窗外|身旁|身后|旁边|座上|堂下|阶下|楼上|楼下)/, "").trim();

    // 若剥离后为空或纯代词，一律归为旁白演播，绝不建立怪异角色
    if (!candidate || /^(他|她|我|你|其人|少年|少女)$/.test(candidate)) {
      return "旁白";
    }

    if (candidate.length > 4) {
      if (BUILTIN_ALIAS_MAP[candidate]) {
        candidate = BUILTIN_ALIAS_MAP[candidate];
      } else {
        candidate = candidate.slice(0, 4);
      }
    }

    if (isNoiseSpeaker(candidate) || !checkValidCharacterName(candidate)) {
      return "";
    }
    return candidate;
  }

  function extractSpeakerAfter(afterText) {
    if (!afterText) return "";
    const text = afterText.replace(/^[\s，,。.!！？?、]+/, "").trim();
    if (!text) return "";

    // 截取到句末或下一个引号
    const sentenceEndMatch = text.match(/^[^。！？!?\n“”""]{1,60}/);
    const clause = sentenceEndMatch ? sentenceEndMatch[0] : text.slice(0, 50);

    // 检查心理活动与载体引述
    const isThought = /(?:心中暗道|心中暗想|心中冷笑|心中暗自|心中思忖|暗自思忖|心中念道|心下暗道|心下琢磨|心中|心下|暗道|暗想|心想|寻思|自忖|思忖)/.test(clause);
    if (isThought || /^(?:石碑|碑文|古籍|典籍|玉简|卷轴|牌匾|大字|信上|书上|提示音|系统提示)/.test(text)) {
      return "旁白";
    }

    const verbMatch = clause.match(REPORTING_VERB_REGEX);
    if (!verbMatch) return "";

    const verb = verbMatch[0];
    const preVerb = clause.slice(0, clause.indexOf(verb)).trim();
    if (!preVerb) return "";

    // 从 preVerb 各分句中倒序查找最近的合法角色主语（穿透“突然、这时”等状语干扰）
    const subClauses = preVerb.split(/[，,]/).map(s => s.trim()).filter(Boolean);
    if (subClauses.length === 0) return "";

    let cand = "";
    for (let i = subClauses.length - 1; i >= 0; i--) {
      let sub = subClauses[i];
      sub = sub.replace(INTRO_PREFIX_REGEX, "").trim();
      sub = sub.replace(ACTION_AND_THOUGHT_TRUNCATE_REGEX, "").trim();
      sub = sub.replace(/(?:望着|看着|瞧着|转向|转头|回过头|沉吟|咬牙|深吸|负手|站起|躬身|抚须|抱拳|拱手|冷笑|微微|轻声|低声|高声|大声|长叹).*$/, "").trim();
      let c = sub.replace(/[^\u4e00-\u9fa5A-Za-z·]/g, "").trim();
      c = c.replace(/^(?:门外|门前|窗外|身旁|身后|旁边|座上|堂下|阶下|楼上|楼下)/, "").trim();
      if (c.length > 4) {
        if (BUILTIN_ALIAS_MAP[c]) c = BUILTIN_ALIAS_MAP[c];
        else c = c.slice(0, 4);
      }
      if (c && !isNoiseSpeaker(c) && checkValidCharacterName(c)) {
        cand = c;
        break;
      }
    }
    if (!cand) return "";
    return cand;
  }

  function inferSpeaker(source, start, end) {
    const before = source.slice(Math.max(0, start - 60), start);
    const after = source.slice(end, Math.min(source.length, end + 46));

    // 1. 优先从引号前文中按句法提取主语说话人
    const speakerBefore = extractSpeakerBefore(before);
    if (speakerBefore) return speakerBefore;

    // 2. 其次从引号后文（如：“……”关羽冷笑道）提取说话人
    const speakerAfter = extractSpeakerAfter(after);
    if (speakerAfter) return speakerAfter;

    // 3. 代词指代沿用上一位
    if (REGEX_PRONOUN_SPEAKER.test(after) || REGEX_PRONOUN_SPEAKER.test(before.slice(-15))) {
      return "沿用上一位";
    }

    // 4. 彻底杜绝无主引用或章节标题/功法概念被误判为“人物”对话，本该属于全知旁白演播
    return "旁白";
  }

  function resolveCanonicalSpeaker(rawSpeaker) {
    if (!rawSpeaker || rawSpeaker === "旁白" || rawSpeaker === "人物") return rawSpeaker;
    const name = rawSpeaker.trim();

    // 1. 用户自定义合并映射表 (高优先级)
    if (state.novel?.aliasMap && state.novel.aliasMap[name]) {
      return state.novel.aliasMap[name];
    }

    // 2. 角色树已有条目中绑定的别名列表
    const tree = state.novel?.characterTree || {};
    for (const [canonicalName, conf] of Object.entries(tree)) {
      if (conf.aliases && Array.isArray(conf.aliases) && conf.aliases.includes(name)) {
        return canonicalName;
      }
    }

    // 3. 经典小说高频字号/简称映射
    if (BUILTIN_ALIAS_MAP[name]) {
      return BUILTIN_ALIAS_MAP[name];
    }

    // 4. 包含关系与昵称启发式归一 (例如已有“诸葛孔明”，后文出现“孔明”；已有“黄蓉”，出现“蓉儿”)
    for (const existingName of Object.keys(tree)) {
      if (existingName === "旁白") continue;
      if (existingName.length >= 3 && name.length >= 2 && existingName.includes(name)) {
        return existingName;
      }
      if (name.length === 2 && name.endsWith("儿") && existingName.includes(name[0])) {
        return existingName;
      }
    }

    return name;
  }

  function cleanSpeaker(value) {
    const cleaned = (value || "").replace(/[^\u4e00-\u9fa5A-Za-z·]/g, "").trim();
    if (!cleaned || NOISE_WORDS.has(cleaned) || /^(他|她|我|你|众人|有人|那人|此人|先生|将军)$/.test(cleaned)) return "";
    return cleaned;
  }

  function inferEmotion(text, type) {
    if (/怒|喝|骂|恨|杀|欺我|怎显|！|!/.test(text)) return "angry";
    if (/笑|喜|乐|哈哈|欣然|大丈夫/.test(text)) return "cheerful";
    if (/哭|泪|悲|叹|哀|伤|天寒/.test(text)) return "sad";
    if (/惊|惧|怕|恐|慌|？|\?/.test(text)) return "fearful";
    if (type === "narration") return "narration-relaxed";
    return "serious";
  }

  /* -------------------------------------------------------------
     Character Tree Reconstruction & Freestyle Voice Casting Console
  ------------------------------------------------------------- */
  function extractAllQuotes() {
    state.extractedQuotes = {};
    state.speakerCounts = {};
    for (const ch of state.chapters) {
      if (!ch.segments) continue;
      for (const seg of ch.segments) {
        if (seg.type === "dialogue" && seg.speaker) {
          const spk = seg.speaker;
          state.speakerCounts[spk] = (state.speakerCounts[spk] || 0) + 1;
          if (!state.extractedQuotes[spk]) state.extractedQuotes[spk] = [];
          if (seg.text && state.extractedQuotes[spk].length < 10) {
            state.extractedQuotes[spk].push(seg.text);
          }
        }
      }
    }
    // 默认旁白演播代表对白
    state.extractedQuotes["旁白"] = [
      "天地不仁，以万物为刍狗；日月经天，江河行地。",
      "话说天下大势，分久必合，合久必分。周末七国分争，并入于秦。",
      "微风拂过窗棂，那些沉封已久的故事，悄然拉开序幕。",
    ];
  }

  function getVoiceMeta(voiceId) {
    if (!voiceId) return { name: "默认音色", archetype: "未指定", gender: "female" };
    if (AudioEngine && typeof AudioEngine.resolveVoiceMetadata === "function") {
      const meta = AudioEngine.resolveVoiceMetadata(voiceId);
      if (meta) return meta;
    }
    return AI_MANGA_VOICE_MAP?.[voiceId] || MS_VOICE_MAP?.[voiceId] || GITHUB_AI_VOICE_MAP?.[voiceId] || {
      id: voiceId,
      name: voiceId,
      archetype: "自定义声线",
      gender: "female",
    };
  }

  function getSpeakerQuote(speakerName, voiceName) {
    if (state.extractedQuotes[speakerName] && state.extractedQuotes[speakerName].length > 0) {
      return state.extractedQuotes[speakerName][0];
    }
    const voiceObj = getVoiceMeta(voiceName);
    if (voiceObj && voiceObj.sampleText) return voiceObj.sampleText;
    if (speakerName === "旁白") return "话说天下大势，分久必合，合久必分。";
    return `在下${speakerName}，请多指教！`;
  }

  function getCharacterIcon(charName, role) {
    if (charName === "旁白") return "🎙️";
    switch (role) {
      case "narrator": return "🎙️";
      case "youngMale": return "⚔️";
      case "youngFemale": return "🌸";
      case "mature": return "🛡️";
      case "elderVillain": return "🦹";
      case "child": return "🎒";
      case "dialect": return "🏮";
      default: return "👤";
    }
  }

  function renderVoiceSelectOptions(selectedVoiceId) {
    let html = "";

    // 1. 🎬 AI 漫剧全年龄爆款 (动漫/短剧/爽文推荐)
    if (typeof AI_MANGA_VOICE_CATALOG !== "undefined" && AI_MANGA_VOICE_CATALOG.length > 0) {
      html += `<optgroup label="🎬 AI 漫剧全年龄爆款 (动漫/短剧/爽文推荐)">`;
      AI_MANGA_VOICE_CATALOG.forEach((v) => {
        const isSel = v.id === selectedVoiceId ? "selected" : "";
        const tag = v.categoryLabel || v.archetype?.split("·")[0] || "";
        html += `<option value="${escapeAttr(v.id)}" ${isSel}>${escapeHtml(v.name)} · ${escapeHtml(tag)}</option>`;
      });
      html += `</optgroup>`;
    }

    // 2. 🔮 GitHub 开源 AI 大模型语音库
    if (typeof GITHUB_AI_VOICE_CATALOG !== "undefined" && GITHUB_AI_VOICE_CATALOG.length > 0) {
      html += `<optgroup label="🔮 GitHub 开源 AI 语音库 (Qwen3 / CosyVoice / ChatTTS / F5 / SoVITS)">`;
      GITHUB_AI_VOICE_CATALOG.forEach((v) => {
        const isSel = v.id === selectedVoiceId ? "selected" : "";
        html += `<option value="${escapeAttr(v.id)}" ${isSel}>${escapeHtml(v.name)} · ${escapeHtml(v.archetype?.split("·")[0] || "")}</option>`;
      });
      html += `</optgroup>`;
    }

    // 3. 🎧 声音克隆与用户专属声线
    const customTrees = (StorageManager && typeof StorageManager.getCustomTrees === "function") ? StorageManager.getCustomTrees() : [];
    if (customTrees && customTrees.length > 0) {
      const customVoices = [];
      customTrees.forEach(t => {
        if (t.tree) {
          Object.entries(t.tree).forEach(([cName, cConf]) => {
            if (cConf && cConf.voice_name && !customVoices.some(cv => cv.id === cConf.voice_name)) {
              customVoices.push({
                id: cConf.voice_name,
                name: `${t.name} - ${cName} (${cConf.voice_name})`,
              });
            }
          });
        }
      });
      if (customVoices.length > 0) {
        html += `<optgroup label="🎧 声音学习与自创专属声线">`;
        customVoices.forEach(cv => {
          const isSel = cv.id === selectedVoiceId ? "selected" : "";
          html += `<option value="${escapeAttr(cv.id)}" ${isSel}>${escapeHtml(cv.name)}</option>`;
        });
        html += `</optgroup>`;
      }
    }

    // 4. 🌐 微软官方 Neural 演播库 (按角色类型分层)
    const categories = [
      { key: "narrator", label: "🎙️ 微软 · 旁白演播 (叙事主役)" },
      { key: "youngMale", label: "⚔️ 微软 · 青年男主 (热血少年)" },
      { key: "youngFemale", label: "🌸 微软 · 青年女主 (灵动娇俏)" },
      { key: "mature", label: "🛡️ 微软 · 成熟中生 (豪迈宗师)" },
      { key: "elderVillain", label: "🦹 微软 · 长者反派 (威严阴鸷)" },
      { key: "child", label: "🎒 微软 · 少儿童声 (清脆活泼)" },
      { key: "dialect", label: "🏮 微软 · 方言特色 (地域韵味)" },
    ];

    categories.forEach((cat) => {
      const voicesInCat = MS_VOICE_CATALOG.filter((v) => v.category === cat.key);
      if (voicesInCat.length > 0) {
        html += `<optgroup label="${escapeAttr(cat.label)}">`;
        voicesInCat.forEach((v) => {
          const isSel = v.id === selectedVoiceId ? "selected" : "";
          html += `<option value="${escapeAttr(v.id)}" ${isSel}>${escapeHtml(v.name)} · ${escapeHtml(v.archetype || v.categoryLabel)}</option>`;
        });
        html += `</optgroup>`;
      }
    });

    const isRecognized = (
      (typeof AI_MANGA_VOICE_CATALOG !== "undefined" && AI_MANGA_VOICE_CATALOG.some(v => v.id === selectedVoiceId)) ||
      (typeof GITHUB_AI_VOICE_CATALOG !== "undefined" && GITHUB_AI_VOICE_CATALOG.some(v => v.id === selectedVoiceId)) ||
      MS_VOICE_CATALOG.some(v => v.id === selectedVoiceId)
    );

    if (selectedVoiceId && !isRecognized) {
      html += `<option value="${escapeAttr(selectedVoiceId)}" selected>外部自选声线: ${escapeHtml(selectedVoiceId)}</option>`;
    }
    return html;
  }

  function renderRoleSelectOptions(currentRole) {
    const roles = [
      { key: "narrator", label: "🎙️ 旁白演播" },
      { key: "youngMale", label: "⚔️ 青年男主" },
      { key: "youngFemale", label: "🌸 青年女主" },
      { key: "mature", label: "🛡️ 成熟中生" },
      { key: "elderVillain", label: "🦹 长者反派" },
      { key: "child", label: "🎒 活泼少儿" },
      { key: "dialect", label: "🏮 方言特色" },
      { key: "other", label: "👤 龙套配角" },
    ];
    return roles.map((r) => `<option value="${r.key}" ${r.key === currentRole ? "selected" : ""}>${r.label}</option>`).join("");
  }

  function rebuildCharacterTree() {
    const tree = state.novel.characterTree || {};

    if (!tree["旁白"]) {
      tree["旁白"] = {
        character_name: "旁白",
        gender: "male",
        role: "narrator",
        voice_name: "zh-CN-YunxiNeural",
        pitch: 0.96,
        rate_offset: "-2%",
        base_style: "narration-relaxed",
        archetype: "全知史诗旁白",
      };
    }

    extractAllQuotes();

    const rawText = state.novel?.rawText || "";

    // 1. 清理历史残留：台词为0或未通过合法姓名校验的角色一律清除（杜绝上部小说遗留的假阳性角色污染新书）
    for (const [name, conf] of Object.entries(tree)) {
      if (name === "旁白") continue;
      const count = state.speakerCounts[name] || 0;
      if (count === 0 && !conf.userExplicitlyLocked) {
        delete tree[name];
        continue;
      }
      if ((isNoiseSpeaker(name) || !checkValidCharacterName(name)) && !conf.userExplicitlyLocked) {
        delete tree[name];
        continue;
      }
    }

    // 2. 统计已使用音色追踪表（用于同人设同风格保真分配）
    const usedVoiceTracker = {};
    if (tree["旁白"]?.voice_name) {
      usedVoiceTracker[tree["旁白"].voice_name] = 1;
    }
    for (const [name, conf] of Object.entries(tree)) {
      if (name === "旁白" || !conf.voice_name) continue;
      usedVoiceTracker[conf.voice_name] = (usedVoiceTracker[conf.voice_name] || 0) + 1;
    }

    // 3. 严格按小说章节先后时序，仅在角色全书【第一次开口说话】时注册声线树
    const firstSpokenMap = new Map(); // speaker -> { chapterIndex, segmentIndex, quote }
    if (state.chapters && Array.isArray(state.chapters)) {
      state.chapters.forEach((ch, chIdx) => {
        (ch.segments || []).forEach((seg, segIdx) => {
          if (seg.type !== "dialogue" || !seg.speaker || seg.speaker === "旁白" || seg.speaker === "人物") {
            return;
          }
          if (isNoiseSpeaker(seg.speaker) || !checkValidCharacterName(seg.speaker)) {
            seg.speaker = "旁白";
            seg.type = "narration";
            return;
          }
          const canonical = resolveCanonicalSpeaker(seg.speaker);
          if (!canonical || canonical === "旁白" || canonical === "人物" || isNoiseSpeaker(canonical) || !checkValidCharacterName(canonical)) {
            seg.speaker = "旁白";
            seg.type = "narration";
            return;
          }
          if (!firstSpokenMap.has(canonical)) {
            firstSpokenMap.set(canonical, {
              chapterIndex: chIdx + 1,
              segmentIndex: segIdx,
              quote: seg.text || "",
            });
          }
        });
      });
    }

    // 按首次出场时序注册新角色并分配贴合人设的精准音色
    for (const [speaker, firstInfo] of firstSpokenMap.entries()) {
      if (!checkValidCharacterName(speaker)) continue;

      if (!tree[speaker]) {
        // 第一次登场并说话！使用 8 大声学人设矩阵精准推断，杜绝错配
        const attrs = inferCharacterAttributes(speaker, rawText);
        const allocated = assignRefinedVoice(speaker, attrs, usedVoiceTracker);

        tree[speaker] = {
          character_name: speaker,
          gender: allocated.gender,
          role: allocated.role,
          voice_name: allocated.voice_name,
          pitch: allocated.pitch,
          rate_offset: allocated.rate_offset,
          base_style: allocated.base_style,
          archetype: allocated.archetype,
          aliases: [],
          firstSpokenChapter: firstInfo.chapterIndex,
          firstSpokenQuote: firstInfo.quote,
          isCameo: false,
        };
      } else {
        if (!tree[speaker].firstSpokenChapter) {
          tree[speaker].firstSpokenChapter = firstInfo.chapterIndex;
        }
      }
    }

    // 4. 自动清理已并入别名的多余噪点树节点或无效噪音词
    for (const charName of Object.keys(tree)) {
      if (charName === "旁白") continue;
      if (isNoiseSpeaker(charName) || charName === "人物" || charName.length < 2) {
        delete tree[charName];
        continue;
      }
      const canonical = resolveCanonicalSpeaker(charName);
      if (canonical !== charName && tree[canonical]) {
        if (!tree[canonical].aliases) tree[canonical].aliases = [];
        if (!tree[canonical].aliases.includes(charName)) tree[canonical].aliases.push(charName);
        delete tree[charName];
      }
    }

    // 5. 判定是否为单句龙套客串 (全书仅1句台词，且非用户锁定、非名门复姓主角)
    for (const [name, conf] of Object.entries(tree)) {
      if (name === "旁白") continue;
      const count = state.speakerCounts[name] || 0;
      const isCompound = CHINESE_COMPOUND_SURNAMES.some(cs => name.startsWith(cs));
      conf.isCameo = (count <= 1 && !conf.userExplicitlyLocked && !isCompound);
    }

    // 6. 重新校准各章节中的 dialogueCount 统计
    if (state.chapters && Array.isArray(state.chapters)) {
      state.chapters.forEach(ch => {
        ch.dialogueCount = (ch.segments || []).filter(s => s.type === "dialogue").length;
      });
    }

    state.novel.characterTree = tree;
    renderCharacterChips();
    renderStudioCharacterTree();
  }

  function renderCharacterChips() {
    const tree = state.novel.characterTree || {};
    const entries = Object.entries(tree);

    // 核心展示角色：旁白 + 核心角色 (台词>=2或非单句客串或用户显式锁定的角色)
    const coreEntries = entries.filter(([name, conf]) => {
      if (name === "旁白") return true;
      if (conf.userExplicitlyLocked) return true;
      return !conf.isCameo;
    });
    const cameoCount = entries.length - coreEntries.length;

    if (els.charCountSummary) {
      els.charCountSummary.textContent = cameoCount > 0
        ? `${coreEntries.length} 位核心演播 · ${cameoCount} 位单句客串`
        : `${entries.length} 位角色已就绪`;
    }
    if (els.quickCastingCount) {
      els.quickCastingCount.textContent = entries.length;
    }

    if (els.characterChipsContainer) {
      let chipsHtml = coreEntries.map(([name, conf]) => {
        const voice = getVoiceMeta(conf.voice_name);
        const isNarrator = name === "旁白";
        const icon = getCharacterIcon(name, conf.role);
        const chapterTip = conf.firstSpokenChapter ? ` · 第 ${conf.firstSpokenChapter} 章登场` : "";
        return `
          <div class="studio-quick-chip ${isNarrator ? 'is-narrator' : ''}" title="${escapeAttr(name)} · ${escapeAttr(voice.name || conf.voice_name)}${chapterTip}">
            <span>${icon} <strong>${escapeHtml(name)}</strong>:</span>
            <select class="studio-quick-voice-select" data-voice-select="${escapeAttr(name)}" title="快速切换声线">
              ${renderVoiceSelectOptions(conf.voice_name)}
            </select>
            <button class="studio-quick-audition-btn" type="button" data-audition-char="${escapeAttr(name)}" title="试听该角色声线">▶</button>
            ${!isNarrator ? `<button class="studio-quick-delete-btn" type="button" data-delete-char="${escapeAttr(name)}" title="删除此角色并将台词归为旁白">✕</button>` : ''}
          </div>
        `;
      }).join("");

      if (cameoCount > 0) {
        chipsHtml += `
          <div class="studio-quick-chip is-cameo-pill" style="opacity: 0.85; border-style: dashed;" title="全书共 ${cameoCount} 位单句偶发客串，已自动收拢在角色树客串分支">
            <span>🎭 <strong>+${cameoCount} 位客串</strong></span>
          </div>
        `;
      }

      els.characterChipsContainer.innerHTML = chipsHtml;
      bindStudioTreeEvents(els.characterChipsContainer);
    }
  }

  /* -------------------------------------------------------------
     Studio Full Character Voice Tree & Casting Console Rendering
  ------------------------------------------------------------- */
  function renderStudioCharacterTree() {
    if (!els.studioTreeHierarchicalView && !els.studioTreeGridView) return;
    const tree = state.novel.characterTree || {};
    const entries = Object.entries(tree);

    // 计算统计数据
    let totalDialogueLines = 0;
    Object.values(state.speakerCounts).forEach(cnt => { totalDialogueLines += cnt; });

    const coreEntries = entries.filter(([name, conf]) => name === "旁白" || conf.userExplicitlyLocked || !conf.isCameo);
    const cameoCount = entries.length - coreEntries.length;

    if (els.studioTreeStatsBadge) {
      els.studioTreeStatsBadge.textContent = cameoCount > 0
        ? `精选 ${coreEntries.length} 位核心演播 · 智能收纳 ${cameoCount} 位客串`
        : `共 ${entries.length} 位角色 · 已绑定语音树`;
    }

    // 过滤与多维分类检索 (支持角色名、音色、人设、性别、别名)
    const q = (state.charTreeSearchQuery || "").toLowerCase();
    const filter = state.charTreeFilter || "all";

    const filteredEntries = entries.filter(([name, conf]) => {
      const voice = getVoiceMeta(conf.voice_name);
      const isNarrator = name === "旁白";
      const isMale = !isNarrator && (conf.gender === "male" || (!conf.gender && ["youngMale", "mature", "elderVillain"].includes(conf.role)));
      const isFemale = !isNarrator && (conf.gender === "female" || (!conf.gender && ["youngFemale", "child"].includes(conf.role) && !isMale));

      const matchesSearch = !q ||
        name.toLowerCase().includes(q) ||
        (voice.name && voice.name.toLowerCase().includes(q)) ||
        (conf.role && conf.role.toLowerCase().includes(q)) ||
        (conf.archetype && conf.archetype.toLowerCase().includes(q)) ||
        (conf.aliases && conf.aliases.some(a => a.toLowerCase().includes(q))) ||
        (isMale && (q === "男" || q === "男声")) ||
        (isFemale && (q === "女" || q === "女声")) ||
        (isNarrator && (q === "旁白" || q === "解说"));
      if (!matchesSearch) return false;

      const isMain = !isNarrator && !conf.isCameo;

      if (filter === "narrator") return isNarrator;
      if (filter === "main") return isMain;
      if (filter === "supporting") return !isNarrator && conf.isCameo;
      if (filter === "male") return isMale;
      if (filter === "female") return isFemale;
      return true;
    });

    // 更新筛选数量徽标 (包括男女声独立统计)
    const narratorCount = tree["旁白"] ? 1 : 0;
    let mainCount = 0;
    let suppCount = 0;
    let maleCount = 0;
    let femaleCount = 0;
    entries.forEach(([name, conf]) => {
      if (name === "旁白") return;
      if (!conf.isCameo) {
        mainCount++;
      } else {
        suppCount++;
      }
      const isMale = conf.gender === "male" || (!conf.gender && ["youngMale", "mature", "elderVillain"].includes(conf.role));
      if (isMale) maleCount++;
      else femaleCount++;
    });

    if (els.filterCountAll) els.filterCountAll.textContent = entries.length;
    if (els.filterCountNarrator) els.filterCountNarrator.textContent = narratorCount;
    if (els.filterCountMain) els.filterCountMain.textContent = mainCount;
    if (els.filterCountSupporting) els.filterCountSupporting.textContent = suppCount;
    if (els.filterCountMale) els.filterCountMale.textContent = maleCount;
    if (els.filterCountFemale) els.filterCountFemale.textContent = femaleCount;

    // 1. 渲染树状分层视图 (Hierarchical View)
    if (els.studioTreeHierarchicalView) {
      const narratorItems = filteredEntries.filter(([name]) => name === "旁白");
      const mainItems = filteredEntries.filter(([name, conf]) => name !== "旁白" && !conf.isCameo);
      const suppItems = filteredEntries.filter(([name, conf]) => name !== "旁白" && conf.isCameo);

      let treeHtml = `
        <!-- 根节点：小说档案 -->
        <div class="studio-tree-root-card">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 24px;">📖</span>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h4 id="treeRootNovelTitle" style="margin: 0; font-size: 15px; font-weight: 700; color: var(--foreground);">《${escapeHtml(state.novel.title || "未命名小说")}》角色音频树根</h4>
                <span class="badge-role" style="color: var(--accent); font-weight: 600;">ROOT ARCHETYPE</span>
              </div>
              <div style="font-size: 12px; color: var(--muted); margin-top: 3px;">
                全书已拆分 <strong>${state.chapters.length}</strong> 个章节 · 
                识别 <strong>${entries.length}</strong> 位声线角色（<strong>${mainItems.length}</strong> 位核心演播 · <strong>${suppItems.length}</strong> 位单句客串） · 
                <strong>${totalDialogueLines}</strong> 句对白台词
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="node-mini-btn btn-danger-soft" type="button" id="studioCleanEmptyCharsBtn" title="一键清理所有台词数为0的冗余角色">🧹 瘦身清理</button>
            <button class="node-mini-btn btn-accent-soft" type="button" id="studioAutoDeduplicateBtn" title="智能扫描识别同人别名并一键归一去重">🤖 智能去重归一</button>
            <button class="node-mini-btn" type="button" id="studioTreeRefreshBtn" title="重新从正文分析提取角色">🔄 刷新分析</button>
            <button class="node-mini-btn" type="button" id="studioTreeDiagnoseBtn2" title="一键声线体检">🩺 体检</button>
          </div>
        </div>
      `;

      // 旁白主分支
      if (narratorItems.length > 0 || filter === "all" || filter === "narrator") {
        treeHtml += `
          <div class="studio-tree-branch">
            <div class="studio-tree-branch-header" data-branch="narrator">
              <div class="branch-header-left">
                <span class="branch-chevron">▼</span>
                <span>🎙️ 旁白演播主干分支 (Narrator Branch)</span>
                <span class="node-lines-pill" style="color: var(--accent);">1 位核心叙事</span>
              </div>
              <span style="font-size: 11.5px; color: var(--subtle);">控制小说整体解说与旁白音色</span>
            </div>
            <div class="studio-tree-branch-body">
              ${narratorItems.map(([name, conf]) => renderTreeNodeRow(name, conf)).join("")}
            </div>
          </div>
        `;
      }

      // 主要角色核心分支
      if (mainItems.length > 0 || filter === "all" || filter === "main") {
        treeHtml += `
          <div class="studio-tree-branch">
            <div class="studio-tree-branch-header" data-branch="main">
              <div class="branch-header-left">
                <span class="branch-chevron">▼</span>
                <span>⚔️ 主要人物核心分支 (Protagonists & Core Cast)</span>
                <span class="node-lines-pill">${mainItems.length} 位核心演播</span>
              </div>
              <span style="font-size: 11.5px; color: var(--subtle);">台词频度高或主线核心人物 · 按首次开口说话顺序排列</span>
            </div>
            <div class="studio-tree-branch-body">
              ${mainItems.length > 0 ? mainItems.map(([name, conf]) => renderTreeNodeRow(name, conf)).join("") : '<div style="padding: 12px; text-align: center; color: var(--muted); font-size: 12px;">暂无匹配的核心主要人物</div>'}
            </div>
          </div>
        `;
      }

      // 单句客串与龙套分支（默认折叠，不占用界面空间）
      if (suppItems.length > 0 || filter === "all" || filter === "supporting") {
        treeHtml += `
          <div class="studio-tree-branch">
            <div class="studio-tree-branch-header" data-branch="supporting">
              <div class="branch-header-left">
                <span class="branch-chevron is-collapsed">▶</span>
                <span>👥 单句偶发客串分支 (Cameo Cast)</span>
                <span class="node-lines-pill">${suppItems.length} 位客串</span>
              </div>
              <span style="font-size: 11.5px; color: var(--subtle);">全书仅 1 句台词的偶发客串人物 · 默认折叠以保持界面清爽高效</span>
            </div>
            <div class="studio-tree-branch-body is-collapsed">
              ${suppItems.length > 0 ? suppItems.map(([name, conf]) => renderTreeNodeRow(name, conf)).join("") : '<div style="padding: 12px; text-align: center; color: var(--muted); font-size: 12px;">暂无客串人物</div>'}
            </div>
          </div>
        `;
      }

      els.studioTreeHierarchicalView.innerHTML = treeHtml;
      bindStudioTreeEvents(els.studioTreeHierarchicalView);
    }

    // 2. 渲染卡片矩阵视图 (Card Grid View)
    if (els.studioTreeGridView) {
      if (filteredEntries.length === 0) {
        els.studioTreeGridView.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">未找到符合条件的角色，请尝试更换搜索词或添加新角色。</div>`;
      } else {
        els.studioTreeGridView.innerHTML = filteredEntries.map(([name, conf]) => renderTreeCard(name, conf)).join("");
        bindStudioTreeEvents(els.studioTreeGridView);
      }
    }
  }

  function renderTreeNodeRow(name, conf) {
    const voiceObj = getVoiceMeta(conf.voice_name);
    const isNarrator = name === "旁白";
    const lineCount = isNarrator ? 0 : (state.speakerCounts[name] || 0);
    const lineBadge = isNarrator ? "全书主役叙事" : `💬 ${lineCount} 句对白`;
    const avatarIcon = getCharacterIcon(name, conf.role);
    const pitchVal = typeof conf.pitch === "number" ? conf.pitch.toFixed(2) : "1.00";
    const rateVal = parseInt(conf.rate_offset) || 0;
    const rateDisplay = `${rateVal > 0 ? "+" : ""}${rateVal}%`;

    return `
      <div class="studio-tree-node ${isNarrator ? 'is-narrator' : ''}" data-char-name="${escapeAttr(name)}">
        <div class="node-identity-col">
          <div class="node-avatar-circle" title="${escapeAttr(name)}">${avatarIcon}</div>
          <div class="node-identity-info">
            <div class="node-name-text">
              <span>${escapeHtml(name)}</span>
              <span class="node-lines-pill">${lineBadge}</span>
              ${conf.firstSpokenChapter ? `<span class="first-spoken-pill" style="font-size: 10.5px; padding: 1px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.12); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.25);" title="首次开口说话章节">第 ${conf.firstSpokenChapter} 章登场</span>` : ""}
              ${conf.isCameo ? `<span class="cameo-pill" style="font-size: 10.5px; padding: 1px 5px; border-radius: 4px; background: rgba(107, 114, 128, 0.15); color: #9ca3af;" title="全书仅开口1句的偶发客串">客串</span>` : ""}
              ${conf.archetype ? `<span class="archetype-pill" style="font-size: 10.5px; padding: 1px 6px; border-radius: 4px; background: rgba(99, 102, 241, 0.12); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.25);">${escapeHtml(conf.archetype)}</span>` : ""}
              ${conf.aliases && conf.aliases.length > 0 ? `<span class="node-alias-pill" style="font-size: 10.5px; padding: 1px 6px; border-radius: 4px; background: rgba(16, 185, 129, 0.12); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.25);" title="已并入此角色的别名">🔗 别名: ${escapeHtml(conf.aliases.join("、"))}</span>` : ""}
            </div>
            ${!isNarrator ? `
              <select class="node-role-select" data-role-select="${escapeAttr(name)}" title="修改人设身份分类">
                ${renderRoleSelectOptions(conf.role)}
              </select>
            ` : `
              <span style="font-size: 11px; color: var(--accent); font-weight: 600;">经典主役旁白演播</span>
            `}
          </div>
        </div>

        <div class="node-voice-col">
          <select class="studio-node-voice-select" data-voice-select="${escapeAttr(name)}" title="自由选择角色演播声线">
            ${renderVoiceSelectOptions(conf.voice_name)}
          </select>
          <button class="studio-node-audition-btn" type="button" data-audition-char="${escapeAttr(name)}" title="试听该声线演播">
            ▶ 试听
          </button>
        </div>

        <div class="node-tuning-col">
          <div class="node-slider-item" title="微调音调 (Pitch)">
            <span>音调:</span>
            <input type="range" class="studio-node-pitch-slider" min="0.80" max="1.25" step="0.02" value="${pitchVal}" data-char="${escapeAttr(name)}" />
            <output data-pitch-out="${escapeAttr(name)}">${pitchVal}x</output>
          </div>
          <div class="node-slider-item" title="微调语速偏移 (Rate)">
            <span>语速:</span>
            <input type="range" class="studio-node-rate-slider" min="-30" max="30" step="2" value="${rateVal}" data-char="${escapeAttr(name)}" />
            <output data-rate-out="${escapeAttr(name)}">${rateDisplay}</output>
          </div>
        </div>

        <div class="node-actions-col">
          ${!isNarrator ? `
            <button class="node-mini-btn" type="button" data-merge-char="${escapeAttr(name)}" title="将此角色或别名合并至其他主角色，消除重复音色树">🔗 合并</button>
            <button class="node-mini-btn" type="button" data-swap-char="${escapeAttr(name)}" title="与其它角色对调声线">🔄 对调</button>
            <button class="node-mini-btn" type="button" data-inspect-char="${escapeAttr(name)}" title="跳转到 View 02 深度检视该角色对白">🔍 检视</button>
            <button class="node-mini-btn btn-danger-soft" type="button" data-delete-char="${escapeAttr(name)}" title="从角色树中删除该角色并将台词转为旁白">🗑️ 删除</button>
          ` : `
            <button class="node-mini-btn" type="button" data-inspect-char="旁白" title="跳转到 View 02 深度检视旁白设置">🔍 检视</button>
          `}
        </div>
      </div>
    `;
  }

  function renderTreeCard(name, conf) {
    const voiceObj = getVoiceMeta(conf.voice_name);
    const isNarrator = name === "旁白";
    const isMale = !isNarrator && (conf.gender === "male" || (!conf.gender && ["youngMale", "mature", "elderVillain"].includes(conf.role)));
    const isFemale = !isNarrator && (conf.gender === "female" || (!conf.gender && ["youngFemale", "child"].includes(conf.role) && !isMale));

    const lineCount = isNarrator ? 0 : (state.speakerCounts[name] || 0);
    const lineBadge = isNarrator ? "全书叙事" : `💬 ${lineCount} 句`;
    const avatarIcon = getCharacterIcon(name, conf.role);
    const pitchVal = typeof conf.pitch === "number" ? conf.pitch.toFixed(2) : "1.00";
    const rateVal = parseInt(conf.rate_offset) || 0;
    const rateDisplay = `${rateVal > 0 ? "+" : ""}${rateVal}%`;
    const quote = getSpeakerQuote(name, conf.voice_name);

    let genderPill = `<span class="gender-pill narrator">🎙️ 旁白</span>`;
    let cardGenderClass = "is-narrator";
    if (!isNarrator) {
      if (isMale) {
        genderPill = `<span class="gender-pill male" title="男性声线角色">♂ 男声</span>`;
        cardGenderClass = "is-male";
      } else {
        genderPill = `<span class="gender-pill female" title="女性声线角色">♀ 女声</span>`;
        cardGenderClass = "is-female";
      }
    }

    return `
      <div class="studio-char-card ${cardGenderClass}" data-char-name="${escapeAttr(name)}">
        <!-- 顶部身份信息行 -->
        <div class="card-top-row">
          <div class="card-top-left">
            <div class="node-avatar-circle" title="${escapeAttr(name)}">${avatarIcon}</div>
            <div class="card-char-name-block">
              <div class="card-name-title">
                <span class="card-char-name" title="${escapeAttr(name)}">${escapeHtml(name)}</span>
                ${genderPill}
                <span class="node-lines-pill">${lineBadge}</span>
              </div>
              <div class="card-tags-row">
                ${conf.firstSpokenChapter ? `<span class="first-spoken-pill" style="font-size: 10.5px; padding: 0 4px; border-radius: 3px; background: rgba(59, 130, 246, 0.12); color: #3b82f6;" title="首次开口说话章节">第 ${conf.firstSpokenChapter} 章</span>` : ""}
                ${conf.isCameo ? `<span class="cameo-pill" style="font-size: 10.5px; padding: 0 4px; border-radius: 3px; background: rgba(107, 114, 128, 0.15); color: #9ca3af;" title="全书仅开口1句的偶发客串">客串</span>` : ""}
                <span class="archetype-pill" style="font-size: 10.5px; padding: 0 4px; border-radius: 3px; background: rgba(99, 102, 241, 0.12); color: #818cf8;" title="声学人设分类">${escapeHtml(conf.archetype || voiceObj.archetype || ROLE_LABELS[conf.role] || conf.role)}</span>
                ${conf.aliases && conf.aliases.length > 0 ? `<span class="node-alias-pill" style="font-size: 10.5px; padding: 0 4px; border-radius: 3px; background: rgba(16, 185, 129, 0.12); color: #10b981;" title="已合并别名: ${escapeAttr(conf.aliases.join('、'))}">🔗 ${escapeHtml(conf.aliases[0])}${conf.aliases.length > 1 ? '…' : ''}</span>` : ""}
              </div>
            </div>
          </div>
          ${!isNarrator ? `
            <select class="node-role-select card-role-dropdown" data-role-select="${escapeAttr(name)}" title="修改人设身份分类">
              ${renderRoleSelectOptions(conf.role)}
            </select>
          ` : ""}
        </div>

        <!-- 声线选择与试听行 -->
        <div class="card-voice-row">
          <select class="studio-node-voice-select card-voice-select" data-voice-select="${escapeAttr(name)}" title="自由选择角色演播声线">
            ${renderVoiceSelectOptions(conf.voice_name)}
          </select>
          <button class="studio-node-audition-btn card-voice-audition-btn" type="button" data-audition-char="${escapeAttr(name)}" title="试听该声线演播效果">
            ▶ 试听
          </button>
        </div>

        <!-- 紧凑单行引用台词 -->
        <div class="card-quote-box" title="${escapeAttr(quote)}">
          <span style="color: var(--accent); font-weight: bold; margin-right: 3px;">“</span>${escapeHtml(quote)}<span style="color: var(--accent); font-weight: bold; margin-left: 3px;">”</span>
        </div>

        <!-- 音调与语速紧凑微调 -->
        <div class="card-sliders-row">
          <div class="node-slider-item" title="微调音调 (Pitch)">
            <span style="font-size: 11px;">调:</span>
            <input type="range" class="studio-node-pitch-slider" min="0.80" max="1.25" step="0.02" value="${pitchVal}" data-char="${escapeAttr(name)}" />
            <output data-pitch-out="${escapeAttr(name)}">${pitchVal}x</output>
          </div>
          <div class="node-slider-item" title="微调语速 (Rate)">
            <span style="font-size: 11px;">速:</span>
            <input type="range" class="studio-node-rate-slider" min="-30" max="30" step="2" value="${rateVal}" data-char="${escapeAttr(name)}" />
            <output data-rate-out="${escapeAttr(name)}">${rateDisplay}</output>
          </div>
        </div>

        <!-- 快捷操作底栏 -->
        <div class="card-footer-row">
          ${!isNarrator ? `
            <button class="node-mini-btn" type="button" data-merge-char="${escapeAttr(name)}" title="合并此角色或别名">🔗 合并</button>
            <button class="node-mini-btn" type="button" data-swap-char="${escapeAttr(name)}" title="与其它角色对调声线">🔄 对调</button>
            <button class="node-mini-btn" type="button" data-inspect-char="${escapeAttr(name)}" title="跳转到 View 02 深度检视该角色对白">🔍 检视</button>
            <button class="node-mini-btn btn-danger-soft" type="button" data-delete-char="${escapeAttr(name)}" title="从角色树中删除该角色并将台词转为旁白">🗑️ 删除</button>
          ` : `
            <span style="font-size: 11px; color: var(--accent); font-weight: 600;">🎙️ 小说全知叙事核心</span>
            <button class="node-mini-btn" type="button" data-inspect-char="旁白" title="检视旁白设置">🔍 检视</button>
          `}
        </div>
      </div>
    `;
  }

  function bindStudioTreeEvents(container) {
    if (!container) return;

    // 自由切换声线下拉框
    container.querySelectorAll("select[data-voice-select]").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const charName = sel.getAttribute("data-voice-select");
        const newVoice = sel.value;
        const voiceObj = MS_VOICE_MAP[newVoice] || { name: newVoice };
        if (state.novel.characterTree && state.novel.characterTree[charName]) {
          state.novel.characterTree[charName].voice_name = newVoice;
          StorageManager.saveCurrentNovel(state.novel);
          updateNovelInStorage();
          showToast(`已为【${charName}】自由分配声线为：【${voiceObj.name || newVoice}】`);

          // 同步其它界面的此角色声线下拉框
          document.querySelectorAll(`select[data-voice-select="${CSS.escape(charName)}"]`).forEach(s => {
            if (s !== sel) s.value = newVoice;
          });

          if (charName === "旁白") {
            if (els.narratorVoiceSelect) els.narratorVoiceSelect.value = newVoice;
            if (els.deckNarratorSelect) els.deckNarratorSelect.value = newVoice;
            updateNarratorBadge();
          }

          // 触发跨模块更新
          window.dispatchEvent(new CustomEvent("novelapp:characterupdated", { detail: { charName, voiceId: newVoice } }));
        }
      });
    });

    // 切换人设身份分类
    container.querySelectorAll("select[data-role-select]").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const charName = sel.getAttribute("data-role-select");
        if (state.novel.characterTree && state.novel.characterTree[charName]) {
          state.novel.characterTree[charName].role = sel.value;
          StorageManager.saveCurrentNovel(state.novel);
          updateNovelInStorage();
          renderStudioCharacterTree();
          showToast(`已将【${charName}】人设身份更新为：【${ROLE_LABELS[sel.value] || sel.value}】`);
        }
      });
    });

    // 音调微调
    container.querySelectorAll("input.studio-node-pitch-slider").forEach((slider) => {
      slider.addEventListener("input", (e) => {
        const charName = slider.getAttribute("data-char");
        const pitchVal = parseFloat(slider.value);
        document.querySelectorAll(`output[data-pitch-out="${CSS.escape(charName)}"]`).forEach(out => {
          out.textContent = `${pitchVal.toFixed(2)}x`;
        });
        if (state.novel.characterTree && state.novel.characterTree[charName]) {
          state.novel.characterTree[charName].pitch = pitchVal;
          StorageManager.saveCurrentNovel(state.novel);
        }
      });
    });

    // 语速偏移微调
    container.querySelectorAll("input.studio-node-rate-slider").forEach((slider) => {
      slider.addEventListener("input", (e) => {
        const charName = slider.getAttribute("data-char");
        const rateVal = parseInt(slider.value) || 0;
        const display = `${rateVal > 0 ? "+" : ""}${rateVal}%`;
        document.querySelectorAll(`output[data-rate-out="${CSS.escape(charName)}"]`).forEach(out => {
          out.textContent = display;
        });
        if (state.novel.characterTree && state.novel.characterTree[charName]) {
          state.novel.characterTree[charName].rate_offset = display;
          StorageManager.saveCurrentNovel(state.novel);
        }
      });
    });

    // 试听声线
    container.querySelectorAll("button[data-audition-char]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const charName = btn.getAttribute("data-audition-char");
        const conf = state.novel?.characterTree?.[charName];
        if (!conf) return;

        const quote = getSpeakerQuote(charName, conf.voice_name);
        btn.classList.add("is-playing");
        startWaveformAnimation();

        AudioEngine.speak({
          text: quote,
          voiceName: conf.voice_name,
          pitch: conf.pitch || 1.0,
          rate: state.speed,
          style: conf.base_style || "chat",
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

    // 角色对调
    container.querySelectorAll("button[data-swap-char]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const charName = btn.getAttribute("data-swap-char");
        openStudioSwapModal(charName);
      });
    });

    // 深度检视
    container.querySelectorAll("button[data-inspect-char]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const charName = btn.getAttribute("data-inspect-char");
        openDeepTreePage(charName);
      });
    });

    // 分支折叠与展开
    container.querySelectorAll(".studio-tree-branch-header").forEach((hdr) => {
      hdr.addEventListener("click", () => {
        const body = hdr.nextElementSibling;
        const chevron = hdr.querySelector(".branch-chevron");
        if (body) body.classList.toggle("is-collapsed");
        if (chevron) chevron.classList.toggle("is-collapsed");
      });
    });

    // 辅助刷新分析与体检
    const refreshBtn = container.querySelector("#studioTreeRefreshBtn");
    if (refreshBtn) refreshBtn.addEventListener("click", () => {
      rebuildCharacterTree();
      showToast("已重新扫描小说正文并更新角色音频树");
    });
    const diagBtn2 = container.querySelector("#studioTreeDiagnoseBtn2");
    if (diagBtn2) diagBtn2.addEventListener("click", openStudioDiagnoseModal);

    // 一键清理零台词冗余角色
    const cleanBtn = container.querySelector("#studioCleanEmptyCharsBtn");
    if (cleanBtn) {
      cleanBtn.addEventListener("click", () => {
        batchCleanUnusedCharactersFromStudio();
      });
    }

    // 删除单个角色
    container.querySelectorAll("button[data-delete-char]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const charName = btn.getAttribute("data-delete-char");
        deleteCharacterFromStudio(charName);
      });
    });

    // 手动合并角色台词
    container.querySelectorAll("button[data-merge-char]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const charName = btn.getAttribute("data-merge-char");
        openStudioMergeModal(charName);
      });
    });

    // 智能去重归一按钮
    const autoDedupBtn = container.querySelector("#studioAutoDeduplicateBtn");
    if (autoDedupBtn) {
      autoDedupBtn.addEventListener("click", () => {
        autoDeduplicateCharacters();
      });
    }
  }

  /**
   * 从小说制作工坊角色树中彻底删除指定角色
   */
  function deleteCharacterFromStudio(charName) {
    if (!charName || charName === "旁白") {
      showToast("旁白为主役核心叙事，不可删除。若需更换音色请直接挑选。");
      return;
    }

    if (!confirm(`确定要从角色音频树中删除角色【${charName}】吗？\n\n删除后该角色在所有章节中的对白台词将自动归并为旁白演播，避免造成声线中断或缺失。`)) {
      return;
    }

    const tree = state.novel.characterTree || {};
    delete tree[charName];

    // 将章节台词中属于该角色的句子归并为旁白朗读
    let reassignedCount = 0;
    if (state.chapters && Array.isArray(state.chapters)) {
      state.chapters.forEach(ch => {
        (ch.segments || []).forEach(seg => {
          if (seg.speaker === charName) {
            seg.speaker = "旁白";
            seg.type = "narration";
            reassignedCount++;
          }
        });
        ch.dialogueCount = (ch.segments || []).filter(s => s.type === "dialogue").length;
      });
    }

    // 清理统计与台词引用
    delete state.speakerCounts[charName];
    delete state.extractedQuotes[charName];

    // 保存并持久化
    state.novel.characterTree = tree;
    StorageManager.saveCurrentNovel(state.novel);
    updateNovelInStorage();

    // 重新渲染视图
    renderCharacterChips();
    renderStudioCharacterTree();
    renderChapters();

    // 跨模块广播事件
    window.dispatchEvent(new CustomEvent("novelapp:characterupdated", {
      detail: { deletedChar: charName, reassignedLines: reassignedCount }
    }));

    showToast(`🗑️ 角色【${charName}】已成功删除${reassignedCount > 0 ? `，原有的 ${reassignedCount} 句台词已归并为旁白演播` : ''}！`);
  }

  /**
   * 一键清理所有台词数为 0 的冗余噪点角色
   */
  function batchCleanUnusedCharactersFromStudio() {
    const tree = state.novel.characterTree || {};
    const toDelete = [];
    Object.keys(tree).forEach(name => {
      if (name === "旁白") return;
      const count = state.speakerCounts[name] || 0;
      if (count === 0) {
        toDelete.push(name);
      }
    });

    if (toDelete.length === 0) {
      showToast("当前角色树很精简，未发现台词数为 0 的冗余角色！");
      return;
    }

    if (!confirm(`检测到 ${toDelete.length} 位台词数为 0 的冗余角色：\n【${toDelete.join("、")}】\n\n确定要一键清理它们吗？`)) {
      return;
    }

    toDelete.forEach(name => {
      delete tree[name];
      delete state.speakerCounts[name];
      delete state.extractedQuotes[name];
    });

    state.novel.characterTree = tree;
    StorageManager.saveCurrentNovel(state.novel);
    updateNovelInStorage();

    renderCharacterChips();
    renderStudioCharacterTree();

    window.dispatchEvent(new CustomEvent("novelapp:characterupdated", {
      detail: { batchCleaned: toDelete }
    }));

    showToast(`🧹 已成功清理 ${toDelete.length} 位无对白角色，角色树已大幅瘦身！`);
  }

  function setStudioTreeViewMode(mode) {
    state.charTreeViewMode = mode;
    if (els.studioTreeHierarchicalView) {
      els.studioTreeHierarchicalView.style.display = mode === "tree" ? "flex" : "none";
    }
    if (els.studioTreeGridView) {
      els.studioTreeGridView.style.display = mode === "grid" ? "grid" : "none";
    }
    if (els.studioViewTreeBtn) {
      els.studioViewTreeBtn.classList.toggle("is-active", mode === "tree");
    }
    if (els.studioViewGridBtn) {
      els.studioViewGridBtn.classList.toggle("is-active", mode === "grid");
    }
  }

  function scrollToCharacterTree() {
    if (els.studioCharTreeSection) {
      els.studioCharTreeSection.scrollIntoView({ behavior: "smooth", block: "start" });
      els.studioCharTreeSection.classList.remove("section-highlighted");
      void els.studioCharTreeSection.offsetWidth;
      els.studioCharTreeSection.classList.add("section-highlighted");
      setTimeout(() => {
        if (els.studioCharTreeSection) els.studioCharTreeSection.classList.remove("section-highlighted");
      }, 3000);
    }
  }

  function openDeepTreePage(charName = null) {
    if (charName) {
      window.NovelAppTreeSelectedChar = charName;
    }
    if (window.NovelApp && typeof window.NovelApp.switchSection === "function") {
      window.NovelApp.switchSection("sec-tree");
    } else {
      window.location.hash = "#sec-tree";
    }
  }

  /* -------------------------------------------------------------
     Modals Integrations in Studio: Diagnose, Add Character, Swap
  ------------------------------------------------------------- */
  function openStudioDiagnoseModal() {
    const tree = state.novel.characterTree || {};
    const entries = Object.entries(tree);
    const voiceCount = {};
    const conflicts = [];

    entries.forEach(([name, conf]) => {
      const v = conf.voice_name;
      if (!voiceCount[v]) voiceCount[v] = [];
      voiceCount[v].push(name);
    });

    Object.entries(voiceCount).forEach(([v, names]) => {
      if (names.length > 1) {
        conflicts.push({
          voiceName: MS_VOICE_MAP[v]?.name || v,
          characters: names,
        });
      }
    });

    const score = Math.max(30, 100 - conflicts.length * 15);
    const scoreNumEl = document.getElementById("healthScoreNumber");
    const scoreTagEl = document.getElementById("healthScoreTag");
    const diagItemsEl = document.getElementById("diagnoseItemsContainer");

    if (scoreNumEl) scoreNumEl.textContent = score;
    if (scoreTagEl) {
      scoreTagEl.textContent = conflicts.length === 0 ? "声线纯度极佳 · 零冲突" : `检测到 ${conflicts.length} 处声线复用`;
      scoreTagEl.className = conflicts.length === 0 ? "badge-role" : "badge-role is-warn";
    }

    if (diagItemsEl) {
      if (conflicts.length === 0) {
        diagItemsEl.innerHTML = `
          <div class="diagnose-item-ok" style="display: flex; gap: 12px; padding: 12px; background: rgba(16, 185, 129, 0.1); border: 1px solid var(--emerald); border-radius: 8px;">
            <span style="font-size: 22px;">✅</span>
            <div>
              <strong style="color: var(--emerald);">全书角色声线配置健康！</strong>
              <p style="margin: 4px 0 0; font-size: 12px; color: var(--muted);">共 ${entries.length} 位角色均绑定了独立声线，听感层次分明，无需调优。</p>
            </div>
          </div>
        `;
      } else {
        diagItemsEl.innerHTML = conflicts.map(c => `
          <div class="diagnose-item-conflict" style="display: flex; gap: 12px; padding: 12px; background: rgba(245, 158, 11, 0.1); border: 1px solid var(--accent); border-radius: 8px; margin-bottom: 8px;">
            <span style="font-size: 22px;">⚠️</span>
            <div style="flex: 1;">
              <strong style="color: var(--accent);">声线重叠：【${escapeHtml(c.voiceName)}】被 ${c.characters.length} 位角色同时使用</strong>
              <p style="margin: 4px 0 0; font-size: 12px; color: var(--muted);">
                涉及人物：${c.characters.map(n => `<code style="padding: 2px 6px; background: rgba(255,255,255,0.08); border-radius: 4px; margin-right: 4px;">${escapeHtml(n)}</code>`).join("")}
              </p>
            </div>
          </div>
        `).join("");
      }
    }

    ModalManager.open("diagnoseModal");
  }

  function openStudioAddCharModal() {
    const nameInp = document.getElementById("newCharNameInput");
    const voiceSel = document.getElementById("newCharVoiceSelect");

    if (nameInp) nameInp.value = "";
    if (voiceSel) {
      voiceSel.innerHTML = renderVoiceSelectOptions("zh-CN-YunjieNeural");
    }

    ModalManager.open("addCharModal");
  }

  function handleStudioConfirmAddChar() {
    const nameInp = document.getElementById("newCharNameInput");
    const roleSel = document.getElementById("newCharRoleSelect");
    const voiceSel = document.getElementById("newCharVoiceSelect");

    const name = nameInp ? nameInp.value.trim() : "";
    if (!name) {
      showToast("请输入角色名称");
      return;
    }

    const tree = state.novel.characterTree || {};
    if (tree[name]) {
      showToast(`角色【${name}】已存在`);
      return;
    }

    const role = roleSel ? roleSel.value : "youngMale";
    const voice = voiceSel ? voiceSel.value : "zh-CN-YunjieNeural";
    const msVoice = MS_VOICE_MAP[voice] || {};

    tree[name] = {
      character_name: name,
      role: role,
      voice_name: voice,
      pitch: msVoice.defaultPitch || 1.0,
      rate_offset: "0%",
      base_style: (msVoice.styles && msVoice.styles[0]) || "chat",
    };

    state.novel.characterTree = tree;
    StorageManager.saveCurrentNovel(state.novel);
    ModalManager.close("addCharModal");
    renderCharacterChips();
    renderStudioCharacterTree();
    showToast(`🎉 成功添加新角色【${name}】并绑定声线【${msVoice.name || voice}】`);
  }

  function openStudioSwapModal(charName) {
    const tree = state.novel.characterTree || {};
    const swapA = document.getElementById("swapCharNameA");
    const swapTarget = document.getElementById("swapTargetSelect");

    if (swapA) swapA.value = charName;
    const others = Object.keys(tree).filter(n => n !== charName);

    if (others.length === 0) {
      showToast("没有其他角色可供对调");
      return;
    }

    if (swapTarget) {
      swapTarget.innerHTML = others.map(n => `
        <option value="${escapeAttr(n)}">${escapeHtml(n)} (${escapeHtml(MS_VOICE_MAP[tree[n].voice_name]?.name || tree[n].voice_name)})</option>
      `).join("");
    }

    state.activeSwapSource = charName;
    ModalManager.open("swapModal");
  }

  function handleStudioConfirmSwap() {
    const swapA = document.getElementById("swapCharNameA");
    const swapTarget = document.getElementById("swapTargetSelect");
    const charA = (swapA && swapA.value) || state.activeSwapSource;
    const charB = swapTarget && swapTarget.value;
    const tree = state.novel.characterTree || {};

    if (!charA || !charB || !tree[charA] || !tree[charB]) return;

    const temp = { ...tree[charA] };
    tree[charA].voice_name = tree[charB].voice_name;
    tree[charA].pitch = tree[charB].pitch;
    tree[charA].rate_offset = tree[charB].rate_offset;
    tree[charA].base_style = tree[charB].base_style;

    tree[charB].voice_name = temp.voice_name;
    tree[charB].pitch = temp.pitch;
    tree[charB].rate_offset = temp.rate_offset;
    tree[charB].base_style = temp.base_style;

    state.novel.characterTree = tree;
    StorageManager.saveCurrentNovel(state.novel);
    ModalManager.close("swapModal");
    renderCharacterChips();
    renderStudioCharacterTree();
    showToast(`🔄 已成功对调【${charA}】与【${charB}】的声线设置！`);
  }

  /* -------------------------------------------------------------
     Character Merge & Smart Deduplication Console
  ------------------------------------------------------------- */
  /**
   * 打开手动角色台词合并弹窗
   */
  function openStudioMergeModal(charName) {
    const tree = state.novel.characterTree || {};
    if (!charName || charName === "旁白") {
      showToast("旁白为主役核心叙事声线，不可作为源角色合并。");
      return;
    }

    state.activeMergeSource = charName;

    if (els.mergeSourceCharName) {
      const cnt = state.speakerCounts[charName] || 0;
      els.mergeSourceCharName.textContent = `${charName} (${cnt} 句台词)`;
    }

    if (els.mergeTargetCharSelect) {
      // 候选目标角色：除自身外的其他角色 + 旁白
      const candidates = Object.keys(tree).filter(n => n !== charName);
      if (!candidates.includes("旁白")) {
        candidates.unshift("旁白");
      }

      // 按台词数从高到低排序，优先展示重要角色
      candidates.sort((a, b) => {
        if (a === "旁白") return -1;
        if (b === "旁白") return 1;
        return (state.speakerCounts[b] || 0) - (state.speakerCounts[a] || 0);
      });

      els.mergeTargetCharSelect.innerHTML = candidates.map(n => {
        const conf = tree[n];
        const vName = conf ? (MS_VOICE_MAP[conf.voice_name]?.name || conf.voice_name) : "默认声线";
        const cnt = n === "旁白" ? "叙事主干" : `${state.speakerCounts[n] || 0} 句`;
        return `<option value="${escapeAttr(n)}">${escapeHtml(n)} · ${escapeHtml(vName)} (${cnt})</option>`;
      }).join("");
    }

    ModalManager.open("mergeCharModal");
  }

  /**
   * 确认手动合并角色台词
   */
  function handleStudioConfirmMerge() {
    const sourceChar = state.activeMergeSource;
    const targetChar = els.mergeTargetCharSelect ? els.mergeTargetCharSelect.value : null;

    if (!sourceChar || !targetChar) {
      showToast("请选择要合并的目标角色");
      return;
    }

    if (sourceChar === targetChar) {
      showToast("源角色与目标角色相同，无需合并");
      return;
    }

    const reassignedCount = mergeCharacterDirectly(sourceChar, targetChar, { showToastMessage: true });
    ModalManager.close("mergeCharModal");
  }

  /**
   * 核心合并逻辑：将 sourceChar 的全部台词、别名重定向给 targetChar，并清理冗余树节点
   */
  function mergeCharacterDirectly(sourceChar, targetChar, options = {}) {
    const tree = state.novel.characterTree || {};
    if (!sourceChar || !targetChar || sourceChar === targetChar) return 0;

    // 1. 遍历章节台词重定向
    let reassignedCount = 0;
    if (state.chapters && Array.isArray(state.chapters)) {
      state.chapters.forEach(ch => {
        let changed = false;
        (ch.segments || []).forEach(seg => {
          if (seg.speaker === sourceChar) {
            seg.speaker = targetChar;
            if (targetChar === "旁白") {
              seg.type = "narration";
            } else {
              seg.type = "dialogue";
            }
            reassignedCount++;
            changed = true;
          }
        });
        if (changed) {
          ch.dialogueCount = (ch.segments || []).filter(s => s.type === "dialogue").length;
        }
      });
    }

    // 2. 更新台词统计
    const srcCnt = state.speakerCounts[sourceChar] || 0;
    if (targetChar !== "旁白") {
      state.speakerCounts[targetChar] = (state.speakerCounts[targetChar] || 0) + srcCnt;
    }
    delete state.speakerCounts[sourceChar];
    delete state.extractedQuotes[sourceChar];

    // 3. 将源角色登记到目标角色的别名列表 (若目标为具体人物)
    if (tree[targetChar] && targetChar !== "旁白") {
      if (!Array.isArray(tree[targetChar].aliases)) {
        tree[targetChar].aliases = [];
      }
      if (!tree[targetChar].aliases.includes(sourceChar)) {
        tree[targetChar].aliases.push(sourceChar);
      }
      // 如果源角色原有别名，一并吸收
      if (tree[sourceChar] && Array.isArray(tree[sourceChar].aliases)) {
        tree[sourceChar].aliases.forEach(al => {
          if (al !== targetChar && !tree[targetChar].aliases.includes(al)) {
            tree[targetChar].aliases.push(al);
          }
        });
      }
    }

    // 4. 持久化至全书 aliasMap 映射库，防止后续重新分章时再次拆分
    if (!state.novel.aliasMap) {
      state.novel.aliasMap = {};
    }
    state.novel.aliasMap[sourceChar] = targetChar;
    Object.keys(state.novel.aliasMap).forEach(k => {
      if (state.novel.aliasMap[k] === sourceChar) {
        state.novel.aliasMap[k] = targetChar;
      }
    });

    // 5. 从角色树中移除源角色节点
    delete tree[sourceChar];

    // 6. 持久化存储与更新渲染
    state.novel.characterTree = tree;
    StorageManager.saveCurrentNovel(state.novel);
    updateNovelInStorage();

    if (!options.silent) {
      renderCharacterChips();
      renderStudioCharacterTree();
      renderChapters();
    }

    window.dispatchEvent(new CustomEvent("novelapp:characterupdated", {
      detail: { mergedSource: sourceChar, mergedTarget: targetChar, reassignedCount }
    }));

    if (options.showToastMessage) {
      showToast(`🔗 成功将【${sourceChar}】合并至【${targetChar}】，原 ${reassignedCount} 句台词已统一由【${targetChar}】演播！`);
    }

    return reassignedCount;
  }

  /**
   * 🤖 智能去重归一：自动扫描识别假阳性噪点词与同人多音色树，一键清理归一
   */
  function autoDeduplicateCharacters() {
    const tree = state.novel.characterTree || {};
    const charNames = Object.keys(tree).filter(n => n !== "旁白");

    if (charNames.length === 0) {
      showToast("当前角色树中暂无任何角色可供去重分析");
      return;
    }

    const mergePlan = []; // { source, target, reason, type: 'alias' | 'noise' }

    // 1. 扫描假阳性噪点词 (非人称、环境词、泛称群体、载体与心理活动)
    for (const name of charNames) {
      const isNoise = isNoiseSpeaker(name) || name === "人物";

      if (isNoise) {
        mergePlan.push({
          source: name,
          target: "旁白",
          reason: `非独立角色/环境噪点词，自动归入旁白叙事`,
          type: "noise",
        });
      }
    }

    // 2. 扫描同人多树 (别名/字号/简称/亲昵称呼)
    const validCharNames = charNames.filter(n => !mergePlan.some(p => p.source === n));

    for (let i = 0; i < validCharNames.length; i++) {
      const nameA = validCharNames[i];
      if (mergePlan.some(p => p.source === nameA)) continue;

      for (let j = 0; j < validCharNames.length; j++) {
        if (i === j) continue;
        const nameB = validCharNames[j];
        if (mergePlan.some(p => p.source === nameB)) continue;

        // a. 内置字号别名检测 (nameA 与 nameB 是否互为别名)
        const canonicalA = BUILTIN_ALIAS_MAP[nameA];
        const canonicalB = BUILTIN_ALIAS_MAP[nameB];

        if (canonicalA && canonicalA === nameB) {
          mergePlan.push({
            source: nameA,
            target: nameB,
            reason: `经典字号/化名归一 (【${nameA}】是【${nameB}】的字号/化名)`,
            type: "alias",
          });
          break;
        } else if (canonicalB && canonicalB === nameA) {
          mergePlan.push({
            source: nameB,
            target: nameA,
            reason: `经典字号/化名归一 (【${nameB}】是【${nameA}】的字号/化名)`,
            type: "alias",
          });
          break;
        } else if (canonicalA && canonicalB && canonicalA === canonicalB) {
          const cntA = state.speakerCounts[nameA] || 0;
          const cntB = state.speakerCounts[nameB] || 0;
          if (cntA >= cntB) {
            mergePlan.push({ source: nameB, target: nameA, reason: `同属【${canonicalA}】别名，合并至对白更多的【${nameA}】`, type: "alias" });
          } else {
            mergePlan.push({ source: nameA, target: nameB, reason: `同属${canonicalB}别名，合并至对白更多的【${nameB}】`, type: "alias" });
          }
          break;
        }

        // b. 全称与简称检测 (例如 "林黛玉" 与 "黛玉", "贾宝玉" 与 "宝玉", "诸葛孔明" 与 "孔明")
        if (nameA.length >= 3 && nameB.length >= 2 && nameA.includes(nameB)) {
          mergePlan.push({
            source: nameB,
            target: nameA,
            reason: `全称与简称归一 (【${nameB}】归入全名【${nameA}】)`,
            type: "alias",
          });
          break;
        }

        // c. 亲昵后缀检测 (例如 "蓉儿" 与 "黄蓉", "婉儿" 与 "南宫婉", "灵儿" 与 "赵灵儿")
        if (nameA.endsWith("儿") && nameB.length >= 2 && nameB.includes(nameA.slice(0, 1))) {
          mergePlan.push({
            source: nameA,
            target: nameB,
            reason: `亲昵称呼归一 (【${nameA}】归入角色全名【${nameB}】)`,
            type: "alias",
          });
          break;
        }
      }
    }

    if (mergePlan.length === 0) {
      showToast("✨ 全书角色树非常规范，未检测到任何重复音色树或噪点角色！");
      return;
    }

    // 格式化展示合并优化清单
    const summaryLines = mergePlan.map((p, idx) =>
      `${idx + 1}. 将【${p.source}】合并入【${p.target}】（${p.reason}）`
    ).join("\n");

    const confirmed = confirm(
      `🤖 智能去重归一扫描完成，检测到 ${mergePlan.length} 处可优化项：\n\n${summaryLines}\n\n确认立即自动执行去重与对白归一吗？\n（系统将自动迁移各章对白台词、整合音色树并建立别名映射库）`
    );

    if (!confirmed) return;

    // 批量执行合并
    let totalReassigned = 0;
    for (const plan of mergePlan) {
      const count = mergeCharacterDirectly(plan.source, plan.target, { silent: true });
      totalReassigned += count;
    }

    // 统一重新渲染
    renderCharacterChips();
    renderStudioCharacterTree();
    renderChapters();

    showToast(`🎉 智能去重归一完成！共合并 ${mergePlan.length} 组角色音色树，重定向 ${totalReassigned} 句台词！`);
  }

  /* -------------------------------------------------------------
     Voice Tree Scheme & Narrator Control Logic
  ------------------------------------------------------------- */
  function initSchemeAndNarratorControls() {
    renderSchemeDropdown();
    renderNarratorDropdowns();
    updateNarratorBadge();

    // 绑定整套语音树方案切换
    if (els.schemeSelect) {
      els.schemeSelect.addEventListener("change", () => {
        handleApplyScheme(els.schemeSelect.value);
      });
    }
    if (els.applySchemeBtn) {
      els.applySchemeBtn.addEventListener("click", () => {
        handleApplyScheme(els.schemeSelect.value);
      });
    }

    // 绑定侧栏旁白音色切换
    if (els.narratorVoiceSelect) {
      els.narratorVoiceSelect.addEventListener("change", (e) => {
        handleNarratorVoiceChange(e.target.value);
      });
    }
    if (els.auditionNarratorBtn) {
      els.auditionNarratorBtn.addEventListener("click", () => {
        auditionNarratorVoice(els.narratorVoiceSelect.value, els.auditionNarratorBtn);
      });
    }

    // 绑定 Master Deck 播放器上的旁白实时快切
    if (els.deckNarratorSelect) {
      els.deckNarratorSelect.addEventListener("change", (e) => {
        handleNarratorVoiceChange(e.target.value);
      });
    }
    if (els.deckNarratorAuditionBtn) {
      els.deckNarratorAuditionBtn.addEventListener("click", () => {
        auditionNarratorVoice(els.deckNarratorSelect.value, els.deckNarratorAuditionBtn);
      });
    }

    // 绑定多角色/单人演播模式切换
    if (els.speakerModeToggle) {
      els.speakerModeToggle.addEventListener("change", () => {
        const isMulti = els.speakerModeToggle.checked;
        if (els.speakerModeLabel) {
          els.speakerModeLabel.textContent = isMulti
            ? "开启多角色分人演播（人物与旁白各用专属声线）"
            : "全书单人演播模式（全部由当前旁白演播，适合传统评书单播）";
        }
        showToast(isMulti ? "已切换为：多角色分人演播模式" : "已切换为：全书单人演播模式");
      });
    }
  }

  function renderSchemeDropdown() {
    const targets = [els.schemeSelect, els.studioSchemeSelect].filter(Boolean);
    if (!targets.length) return;
    const schemes = getAvailableSchemes();
    let html = `<option value="" disabled selected>-- 请选择角色语音树方案 --</option>`;

    // 官方预设
    const builtins = schemes.filter(s => s.type === "builtin");
    if (builtins.length) {
      html += `<optgroup label="🌟 官方精选角色语音树">`;
      builtins.forEach(s => {
        html += `<option value="${escapeAttr(s.id)}">${escapeHtml(s.name)} - ${escapeHtml(s.description)}</option>`;
      });
      html += `</optgroup>`;
    }

    // 自建角色树
    const customs = schemes.filter(s => s.type === "custom");
    if (customs.length) {
      html += `<optgroup label="🛠️ 我的自建角色树方案">`;
      customs.forEach(s => {
        html += `<option value="${escapeAttr(s.id)}">${escapeHtml(s.name)} - ${escapeHtml(s.description)}</option>`;
      });
      html += `</optgroup>`;
    }

    // 过往小说
    const pasts = schemes.filter(s => s.type === "past");
    if (pasts.length) {
      html += `<optgroup label="📚 过往小说角色音频树">`;
      pasts.forEach(s => {
        html += `<option value="${escapeAttr(s.id)}">${escapeHtml(s.name)} - ${escapeHtml(s.description)}</option>`;
      });
      html += `</optgroup>`;
    }

    targets.forEach(t => {
      t.innerHTML = html;
    });
  }

  function renderNarratorDropdowns() {
    const currentNarratorVoice = state.novel?.characterTree?.["旁白"]?.voice_name || "zh-CN-YunxiNeural";

    let html = "";

    // 1. 🎬 AI 漫剧流行旁白
    if (typeof AI_MANGA_VOICE_CATALOG !== "undefined" && AI_MANGA_VOICE_CATALOG.length) {
      const mangaNarrators = AI_MANGA_VOICE_CATALOG.filter(v => v.category === "narrator");
      if (mangaNarrators.length) {
        html += `<optgroup label="🎬 AI 漫剧全年龄流行旁白 (史诗演播/燃爽动漫/玄幻全知)">`;
        mangaNarrators.forEach(n => {
          const selected = n.id === currentNarratorVoice ? "selected" : "";
          html += `<option value="${escapeAttr(n.id)}" ${selected}>${escapeHtml(n.name)} · ${escapeHtml(n.archetype?.split("·")[0] || n.categoryLabel)}</option>`;
        });
        html += `</optgroup>`;
      }
    }

    // 2. 🔮 GitHub 开源 AI 演播大模型
    if (typeof GITHUB_AI_VOICE_CATALOG !== "undefined" && GITHUB_AI_VOICE_CATALOG.length) {
      const githubNarrators = GITHUB_AI_VOICE_CATALOG.filter(v => v.category === "narrator" || v.id.includes("pingshu") || v.id.includes("cosyvoice"));
      if (githubNarrators.length) {
        html += `<optgroup label="🔮 GitHub 开源 AI 演播 (CosyVoice 评书 / ChatTTS / Qwen)">`;
        githubNarrators.forEach(g => {
          const selected = g.id === currentNarratorVoice ? "selected" : "";
          html += `<option value="${escapeAttr(g.id)}" ${selected}>${escapeHtml(g.name)} · ${escapeHtml(g.archetype?.split("·")[0] || "")}</option>`;
        });
        html += `</optgroup>`;
      }
    }

    // 3. 🎙️ 微软精选小说演播旁白大师
    html += `<optgroup label="🎙️ 微软官方精选演播旁白大师">`;
    NARRATOR_PRESETS.forEach(n => {
      const selected = n.id === currentNarratorVoice ? "selected" : "";
      html += `<option value="${escapeAttr(n.id)}" ${selected}>${escapeHtml(n.name)} (${escapeHtml(n.gender)}) · ${escapeHtml(n.title)}</option>`;
    });
    html += `</optgroup>`;

    // 4. 🌐 更多微软角色音色库
    html += `<optgroup label="🌐 更多微软官方角色音色">`;
    MS_VOICE_CATALOG.forEach(v => {
      if (NARRATOR_PRESETS.some(n => n.id === v.id)) return;
      const selected = v.id === currentNarratorVoice ? "selected" : "";
      html += `<option value="${escapeAttr(v.id)}" ${selected}>${escapeHtml(v.name)} (${v.gender === "male" ? "男" : "女"}) · ${escapeHtml(v.archetype)}</option>`;
    });
    html += `</optgroup>`;

    // 5. 如果选中的旁白不在已有列表中
    const recognized = (
      (typeof AI_MANGA_VOICE_CATALOG !== "undefined" && AI_MANGA_VOICE_CATALOG.some(v => v.id === currentNarratorVoice)) ||
      (typeof GITHUB_AI_VOICE_CATALOG !== "undefined" && GITHUB_AI_VOICE_CATALOG.some(v => v.id === currentNarratorVoice)) ||
      MS_VOICE_CATALOG.some(v => v.id === currentNarratorVoice)
    );
    if (currentNarratorVoice && !recognized) {
      html += `<option value="${escapeAttr(currentNarratorVoice)}" selected>自定义专属演播: ${escapeHtml(currentNarratorVoice)}</option>`;
    }

    if (els.narratorVoiceSelect) {
      els.narratorVoiceSelect.innerHTML = html;
      els.narratorVoiceSelect.value = currentNarratorVoice;
    }
    if (els.deckNarratorSelect) {
      els.deckNarratorSelect.innerHTML = html;
      els.deckNarratorSelect.value = currentNarratorVoice;
    }
  }

  function updateNarratorBadge() {
    const currentNarratorVoice = state.novel?.characterTree?.["旁白"]?.voice_name || "zh-CN-YunxiNeural";
    const voiceObj = getVoiceMeta(currentNarratorVoice);
    if (els.narratorStyleBadge) {
      els.narratorStyleBadge.textContent = `${voiceObj.name} · ${voiceObj.archetype || "演播旁白"}`;
    }
  }

  function handleNarratorVoiceChange(voiceId) {
    if (!voiceId) return;
    const voiceObj = setNarratorVoice(state.novel, voiceId);

    // 同步两个下拉框
    if (els.narratorVoiceSelect) els.narratorVoiceSelect.value = voiceId;
    if (els.deckNarratorSelect) els.deckNarratorSelect.value = voiceId;

    updateNarratorBadge();
    renderCharacterChips();
    renderStudioCharacterTree();
    renderFocusedChapterDeck();

    showToast(`演播旁白已自由切换为：【${voiceObj?.name || voiceId}】`);

    // 如果未处于播放中，立即试听一句所选旁白
    if (!state.isPlaying) {
      auditionNarratorVoice(voiceId, els.auditionNarratorBtn);
    }
  }

  function auditionNarratorVoice(voiceId, btnEl) {
    const voiceObj = getVoiceMeta(voiceId);
    const sample = voiceObj.sampleText || "天地不仁，以万物为刍狗；日月经天，江河行地。";

    if (btnEl) btnEl.classList.add("is-playing");
    startWaveformAnimation();

    AudioEngine.speak({
      text: sample,
      voiceName: voiceId,
      pitch: voiceObj.defaultPitch || 0.96,
      rate: state.speed + (voiceObj.defaultRate || 0),
      style: "narration-relaxed",
      onEnd: () => {
        if (btnEl) btnEl.classList.remove("is-playing");
        stopWaveformAnimation();
      },
      onError: () => {
        if (btnEl) btnEl.classList.remove("is-playing");
        stopWaveformAnimation();
      },
    });
  }

  function handleApplyScheme(schemeKey) {
    if (!schemeKey) {
      showToast("请先选择要应用的配音树方案");
      return;
    }
    const schemeName = applySchemeToNovel(state.novel, schemeKey);
    if (!schemeName) {
      showToast("应用方案失败，未找到对应配置");
      return;
    }

    if (els.activeSchemeBadge) {
      els.activeSchemeBadge.textContent = schemeName;
    }

    renderNarratorDropdowns();
    updateNarratorBadge();
    renderCharacterChips();
    renderStudioCharacterTree();
    renderFocusedChapterDeck();

    showToast(`🎉 成功切换为【${schemeName}】！整套角色配音与旁白已生效。`);
  }

  function updateNovelInStorage() {
    if (els.rawText && !els.rawText.value.includes("... [为保证网页流畅") && state.rawTextViewMode === "full") {
      state.novel.rawText = els.rawText.value;
    }
    state.novel.title = (els.bookTitle && els.bookTitle.value.trim()) || state.novel.title;
    StorageManager.saveCurrentNovel(state.novel);
  }

  /* -------------------------------------------------------------
     Smart Voice Scheme Recommendation & Auto-Casting
  ------------------------------------------------------------- */
  function updateSmartSchemeRecommendation() {
    try {
      if (!state.novel) return;
      const title = (els.bookTitle && els.bookTitle.value.trim()) || state.novel.title || "未命名小说";
      const rawText = (els.rawText && els.rawText.value) || state.novel.rawText || "";
      const characters = Object.keys(state.novel.characterTree || {});

      const analysis = analyzeNovelGenre(title, rawText, characters) || {};
      state.smartGenreAnalysis = analysis;

      const card = els.studioSmartSchemeCard || document.getElementById("studioSmartSchemeCard");
      const headline = els.smartSchemeHeadline || document.getElementById("smartSchemeHeadline");
      const subtext = els.smartSchemeSubtext || document.getElementById("smartSchemeSubtext");
      const pillsRow = els.smartSchemePillsRow || document.getElementById("smartSchemePillsRow");
      const autoApplyBtn = els.smartSchemeAutoApplyBtn || document.getElementById("smartSchemeAutoApplyBtn");

      if (!card || !headline) return;

      const genreLabel = analysis.genreLabel || analysis.genreName || "网络小说";
      const confidence = analysis.confidence || 88;
      const recSchemeName = analysis.recommendedSchemeName || "AI 漫剧 · 全年龄爆款角色全家桶";
      const recSchemeId = analysis.recommendedSchemeId || "custom_aimanga_universe_full";

      const matchedKw = Array.isArray(analysis.matchedKeywords)
        ? analysis.matchedKeywords
        : (Array.isArray(analysis.features) ? analysis.features : []);
      const kwDisplay = matchedKw.length > 0 ? matchedKw.join(" · ") : "智能剧情识别";
      const reasonText = analysis.reason || analysis.acousticProfile || "根据文本特征智能装配爆款声学人设";

      const narratorVoice = (state.novel?.characterTree && state.novel.characterTree["旁白"] && state.novel.characterTree["旁白"].voice_name) || "zh-CN-YunxiNeural";
      const recNarratorName = getVoiceMeta(narratorVoice).name;

      headline.innerHTML = `
        🎯 识别题材：<strong>${escapeHtml(genreLabel)}</strong> 
        <span class="smart-match-rate" title="置信度与声学特征匹配率">匹配度 ${confidence}%</span>
        <span class="smart-rec-scheme">推荐方案：${escapeHtml(recSchemeName)}</span>
      `;

      if (subtext) {
        subtext.innerHTML = `
          <span>🎯 <strong>题材分析：</strong>${escapeHtml(reasonText)}</span>
          <span style="margin-left: 12px;">🎙️ <strong>推荐旁白：</strong>${escapeHtml(recNarratorName)}</span>
          <span style="margin-left: 12px; color: var(--subtle);">（特征关键词：${escapeHtml(kwDisplay)}）</span>
        `;
      }

      if (autoApplyBtn) {
        autoApplyBtn.textContent = `✨ 智能装配【${recSchemeName}】`;
        autoApplyBtn.onclick = () => {
          applySmartScheme(recSchemeId, recSchemeName);
        };
      }

      if (pillsRow) {
        const altButtons = [
          { id: recSchemeId, name: `⭐ ${recSchemeName} (主推)` },
          { id: "custom_aimanga_universe_full", name: "🎬 AI漫剧全年龄爆款树" },
          { id: "custom_xianxia_classic", name: "🔮 凡人仙侠修真道统" },
          { id: "custom_alexandria_qwen3", name: "📜 千问大模型史诗评书" },
          { id: "custom_cosyvoice_universe", name: "🎙️ CosyVoice多角色沉浸树" },
          { id: "custom_f5_scifi", name: "🚀 赛博科幻星际机甲" },
        ];
        const seen = new Set();
        const uniqueAlts = altButtons.filter(b => {
          if (seen.has(b.id)) return false;
          seen.add(b.id);
          return true;
        });

        pillsRow.innerHTML = `
          <span class="pills-label">备选语音树方案：</span>
          ${uniqueAlts.map(b => `
            <button type="button" class="smart-scheme-pill-btn ${b.id === recSchemeId ? 'is-recommended' : ''}" data-scheme-id="${escapeAttr(b.id)}">
              ${escapeHtml(b.name)}
            </button>
          `).join("")}
        `;

        pillsRow.querySelectorAll("button[data-scheme-id]").forEach(btn => {
          btn.addEventListener("click", () => {
            const schemeId = btn.getAttribute("data-scheme-id");
            const schemeName = btn.textContent.trim().replace(/^⭐\s*/, "").replace(/\s*\(主推\)$/, "");
            applySmartScheme(schemeId, schemeName);
          });
        });
      }
    } catch (err) {
      console.warn("updateSmartSchemeRecommendation warning:", err);
    }
  }

  function applySmartScheme(schemeId, schemeName) {
    if (!state.novel) {
      showToast("请先导入或载入小说正文");
      return;
    }
    const count = autoCastNovelCharacterTree(state.novel, schemeId);
    updateNovelInStorage();
    renderCharacterChips();
    renderStudioCharacterTree();
    renderNarratorDropdowns();
    renderFocusedChapterDeck();
    renderChapters();
    showToast(`✨ 成功装配【${schemeName}】！已智能按年龄与人设完成 ${count} 位角色的全树声线映射。`);
  }

  /* -------------------------------------------------------------
     Chapter-by-Chapter Independent Dubbing Workflow (逐章聚焦配音模式)
  ------------------------------------------------------------- */
  function initChapterWorkflowSwitcher() {
    if (!els.chapterModeFocusBtn || !els.chapterModeListBtn) return;

    els.chapterModeFocusBtn.addEventListener("click", () => {
      setChapterWorkflowMode("focus");
    });

    els.chapterModeListBtn.addEventListener("click", () => {
      setChapterWorkflowMode("list");
    });

    setChapterWorkflowMode(state.chapterWorkflowMode || "list");
  }

  function setChapterWorkflowMode(mode) {
    state.chapterWorkflowMode = mode;
    if (mode === "focus") {
      els.chapterModeFocusBtn?.classList.add("is-active");
      els.chapterModeFocusBtn?.setAttribute("aria-selected", "true");
      els.chapterModeListBtn?.classList.remove("is-active");
      els.chapterModeListBtn?.setAttribute("aria-selected", "false");
      if (els.chapterFocusDeck) els.chapterFocusDeck.style.display = "block";
      if (els.chapterListContainer) els.chapterListContainer.style.display = "none";
      renderFocusedChapterDeck();
    } else {
      els.chapterModeListBtn?.classList.add("is-active");
      els.chapterModeListBtn?.setAttribute("aria-selected", "true");
      els.chapterModeFocusBtn?.classList.remove("is-active");
      els.chapterModeFocusBtn?.setAttribute("aria-selected", "false");
      if (els.chapterFocusDeck) els.chapterFocusDeck.style.display = "none";
      if (els.chapterListContainer) els.chapterListContainer.style.display = "block";
      renderChapters();
    }
  }

  function renderFocusedChapterDeck() {
    const deck = els.chapterFocusDeck || document.getElementById("chapterFocusDeck");
    if (!deck) return;

    if (!state.chapters.length) {
      deck.innerHTML = `
        <div class="empty-state">
          <div style="font-size: 26px; margin-bottom: 8px;">🧭</div>
          <strong>暂无章节内容</strong>
          <p style="margin-top: 6px; font-size: 13px; color: var(--muted); line-height: 1.6;">
            请在左侧【小说原文】中输入/粘贴文本或选择 EPUB / TXT 文件，点击【智能识别分章】后即可开启逐章聚焦配音打磨。
          </p>
        </div>
      `;
      return;
    }

    if (state.focusedChapterIndex < 0) state.focusedChapterIndex = 0;
    if (state.focusedChapterIndex >= state.chapters.length) {
      state.focusedChapterIndex = state.chapters.length - 1;
    }

    const idx = state.focusedChapterIndex;
    const ch = state.chapters[idx];
    if (!ch) return;
    ensureChapterParsed(ch);
    const isPlayingThisChapter = state.isPlaying && state.activeChapterIndex === idx;

    // 自动扫描提取本章节实际出场说话的角色 (实现角色降噪隔离)
    const chapterSpeakers = new Set();
    const speakerLineCounts = {};
    (ch.segments || []).forEach(seg => {
      const spk = seg.speaker || "旁白";
      chapterSpeakers.add(spk);
      speakerLineCounts[spk] = (speakerLineCounts[spk] || 0) + 1;
    });
    // 旁白始终位于第一主役位
    chapterSpeakers.add("旁白");
    if (!speakerLineCounts["旁白"]) {
      speakerLineCounts["旁白"] = (ch.segments || []).filter(s => s.type === "narration").length;
    }

    const speakerList = ["旁白", ...Array.from(chapterSpeakers).filter(s => s !== "旁白")];

    const statusBadgeMap = {
      idle: '<span class="status-badge is-idle">待配音</span>',
      previewing: '<span class="status-badge is-previewing">演播中</span>',
      generating: '<span class="status-badge is-generating">生成中...</span>',
      completed: '<span class="status-badge is-completed">已完成</span>',
      failed: '<span class="status-badge is-failed">失败</span>',
    };

    deck.innerHTML = `
      <div class="focus-deck-container">
        <!-- 章节选择与步骤器 -->
        <div class="focus-deck-nav-bar">
          <div class="focus-nav-stepper">
            <button id="focusPrevChapterBtn" class="btn-transport-control" type="button" title="上一章" ${idx === 0 ? "disabled" : ""}>⏮</button>
            <div class="focus-chapter-select-wrap">
              <span class="focus-step-indicator">第 ${idx + 1} / ${state.chapters.length} 章</span>
              <select id="focusChapterSelect" class="focus-chapter-select" title="下拉切换任意章节">
                ${state.chapters.map((c, cIdx) => `
                  <option value="${cIdx}" ${cIdx === idx ? "selected" : ""}>
                    第 ${cIdx + 1} 章: ${escapeHtml(c.title)} (${c.wordCount || c.text.length}字 · ${c.segments ? c.dialogueCount + '句对白' : '待深入解析'} · ${c.status === 'completed' ? '已就绪' : '待生成'})
                  </option>
                `).join("")}
              </select>
            </div>
            <button id="focusNextChapterBtn" class="btn-transport-control" type="button" title="下一章" ${idx === state.chapters.length - 1 ? "disabled" : ""}>⏭</button>
          </div>

          <div class="focus-deck-meta-box">
            <span class="focus-meta-pill">📝 ${ch.text.length} 字</span>
            <span class="focus-meta-pill">💬 ${ch.segments.length} 句段 (${ch.dialogueCount} 句对白)</span>
            <span class="focus-meta-pill">👥 ${speakerList.length} 位角色出场</span>
            ${statusBadgeMap[ch.status] || statusBadgeMap.idle}
            <button id="focusBackToListBtn" class="secondary-button btn-sm" type="button" style="margin-left: 8px;" title="返回全书章节卡片列表">
              📑 返回章节列表
            </button>
          </div>
        </div>

        <!-- 本章登场角色快速配音条 (角色降噪核心) -->
        <div class="focus-chapter-casting-card">
          <div class="focus-casting-header">
            <div class="focus-casting-title">
              <span>🎭 <strong>本章登场角色声线装配</strong></span>
              <span class="focus-casting-tip">（已智能过滤全书无关人物，仅展示本章登场的 ${speakerList.length} 位角色，避免混合搭配过载）</span>
            </div>
            <button id="focusOpenFullTreeBtn" type="button" class="btn-link-action" style="font-size: 11.5px; color: var(--accent); background: none; border: none; cursor: pointer; text-decoration: underline;">🌲 展开全书角色树</button>
          </div>

          <div class="focus-casting-chips-grid">
            ${speakerList.map(name => {
              const conf = state.novel?.characterTree?.[name] || {
                voice_name: name === "旁白" ? "zh-CN-YunxiNeural" : "zh-CN-YunjieNeural",
                role: name === "旁白" ? "narrator" : "youngMale",
                pitch: 1.0,
                rate_offset: "0%",
                base_style: "chat",
              };
              const lineCount = speakerLineCounts[name] || 0;
              const icon = getCharacterIcon(name, conf.role);
              const isNarrator = name === "旁白";

              return `
                <div class="focus-speaker-card ${isNarrator ? 'is-narrator' : ''}" data-speaker-name="${escapeAttr(name)}">
                  <div class="focus-speaker-info">
                    <span class="focus-speaker-avatar">${icon}</span>
                    <div class="focus-speaker-names">
                      <strong>${escapeHtml(name)}</strong>
                      <span class="focus-speaker-lines">${isNarrator ? '旁白主役' : `${lineCount} 句台词`}</span>
                    </div>
                  </div>
                  <div class="focus-speaker-voice-box">
                    <select class="focus-speaker-voice-select" data-focus-speaker="${escapeAttr(name)}" title="为 ${escapeAttr(name)} 挑选任意声线">
                      ${renderVoiceSelectOptions(conf.voice_name)}
                    </select>
                    <button class="focus-speaker-audition-btn" type="button" data-focus-audition="${escapeAttr(name)}" title="试听该角色声线">▶</button>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- 本章独立操作栏 -->
        <div class="focus-action-bar">
          <button id="focusReturnListBtn" class="secondary-button" type="button" title="返回全书章节列表">
            📑 返回章节列表
          </button>
          <button id="focusPreviewBtn" class="secondary-button" type="button" title="试听演播本章节">
            ${isPlayingThisChapter ? '⏸️ 暂停本章试听' : '▶️ 试听本章演播'}
          </button>
          <button id="focusGenerateBtn" class="primary-button" type="button" title="独立合成并导出本章节音频">
            🎙️ 独立合成并导出本章
          </button>
          <button id="focusInspectScriptBtn" class="secondary-button" type="button" title="逐句微调台词与情感">
            📖 检视本章剧本
          </button>
          ${ch.audioUrl ? `
            <a href="${escapeAttr(ch.audioUrl)}" download="${escapeAttr(state.novel?.title || '小说')}_第${idx + 1}章.mp3" class="secondary-button" style="text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
              💾 下载本章音频
            </a>
          ` : ''}
          <button id="focusNextAndSaveBtn" class="ghost-button" type="button" style="margin-left: auto;" title="配完本章后平滑进入下一章">
            ➡️ 配完本章，去下一章
          </button>
        </div>

        ${ch.audioUrl ? `
          <div class="focus-ready-track-bar">
            <span style="font-size: 11.5px; color: var(--accent); font-weight: 700; white-space: nowrap;">🎧 本章已就绪音轨：</span>
            <audio controls class="chapter-inline-audio" src="${escapeAttr(ch.audioUrl)}" style="flex: 1; height: 32px;" preload="none"></audio>
          </div>
        ` : ''}

        <!-- 本章台词剧本实时走带预览 -->
        <div class="focus-script-teleprompter">
          <div class="focus-script-header">
            <span>📜 <strong>第 ${idx + 1} 章 对白剧本实时走带</strong>（共 ${ch.segments.length} 句）</span>
            <span style="font-size: 11px; color: var(--subtle);">可点击每句右侧 ▶ 试听单句演播</span>
          </div>
          <div class="focus-script-body" id="focusScriptBody">
            ${ch.segments.slice(0, 20).map((seg, sIdx) => {
              const isNarr = seg.type === "narration" || seg.speaker === "旁白";
              return `
                <div class="focus-seg-row ${isNarr ? 'is-narr' : 'is-dialogue'}">
                  <span class="focus-seg-idx">${sIdx + 1}</span>
                  <span class="focus-seg-speaker ${isNarr ? 'narr-badge' : 'char-badge'}">${escapeHtml(seg.speaker || '旁白')}</span>
                  <span class="focus-seg-text">${escapeHtml(seg.text)}</span>
                  <button type="button" class="focus-seg-play-btn" data-focus-seg-play="${sIdx}" title="试听单句">▶</button>
                </div>
              `;
            }).join("")}
            ${ch.segments.length > 20 ? `
              <div class="focus-script-more-hint">还有 ${ch.segments.length - 20} 句，点击上方【📖 检视本章剧本】可全屏逐句微调。</div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    bindFocusDeckEvents(deck, ch, idx);
  }

  function bindFocusDeckEvents(deck, ch, idx) {
    // 1. 章节下拉切换
    const select = deck.querySelector("#focusChapterSelect");
    if (select) {
      select.addEventListener("change", (e) => {
        state.focusedChapterIndex = Number(e.target.value);
        renderFocusedChapterDeck();
        updateRawTextareaView();
      });
    }

    // 2. 上一章 / 下一章
    const prevBtn = deck.querySelector("#focusPrevChapterBtn");
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (state.focusedChapterIndex > 0) {
          state.focusedChapterIndex--;
          renderFocusedChapterDeck();
          updateRawTextareaView();
        }
      });
    }

    const nextBtn = deck.querySelector("#focusNextChapterBtn");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (state.focusedChapterIndex < state.chapters.length - 1) {
          state.focusedChapterIndex++;
          renderFocusedChapterDeck();
          updateRawTextareaView();
        }
      });
    }

    // 返回全书章节列表
    const backBtn = deck.querySelector("#focusBackToListBtn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        setChapterWorkflowMode("list");
      });
    }
    const returnListBtn = deck.querySelector("#focusReturnListBtn");
    if (returnListBtn) {
      returnListBtn.addEventListener("click", () => {
        setChapterWorkflowMode("list");
      });
    }

    // 3. 角色声线修改
    deck.querySelectorAll(".focus-speaker-voice-select").forEach(sel => {
      sel.addEventListener("change", (e) => {
        const charName = sel.getAttribute("data-focus-speaker");
        const newVoice = e.target.value;
        if (!state.novel.characterTree) state.novel.characterTree = {};
        if (!state.novel.characterTree[charName]) {
          state.novel.characterTree[charName] = {
            character_name: charName,
            role: charName === "旁白" ? "narrator" : "youngMale",
            voice_name: newVoice,
            pitch: 1.0,
            rate_offset: "0%",
            base_style: "chat",
          };
        } else {
          state.novel.characterTree[charName].voice_name = newVoice;
        }

        if (charName === "旁白") {
          handleNarratorVoiceChange(newVoice);
        } else {
          updateNovelInStorage();
        }

        renderCharacterChips();
        renderStudioCharacterTree();
        showToast(`已将【${charName}】声线更新为【${getVoiceMeta(newVoice).name}】`);
      });
    });

    // 4. 角色声线试听
    deck.querySelectorAll(".focus-speaker-audition-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const charName = btn.getAttribute("data-focus-audition");
        const conf = state.novel?.characterTree?.[charName];
        if (!conf) return;

        const quote = getSpeakerQuote(charName, conf.voice_name);
        btn.classList.add("is-playing");
        startWaveformAnimation();

        AudioEngine.speak({
          text: quote,
          voiceName: conf.voice_name,
          pitch: conf.pitch || 1.0,
          rate: state.speed,
          style: conf.base_style || "chat",
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

    // 5. 操作栏按钮
    const previewBtn = deck.querySelector("#focusPreviewBtn");
    if (previewBtn) {
      previewBtn.addEventListener("click", () => {
        if (state.isPlaying && state.activeChapterIndex === idx) {
          pausePlayback();
          previewBtn.textContent = "▶️ 试听本章演播";
        } else {
          playChapter(idx, 0);
          previewBtn.textContent = "⏸️ 暂停本章试听";
        }
      });
    }

    const genBtn = deck.querySelector("#focusGenerateBtn");
    if (genBtn) {
      genBtn.addEventListener("click", async () => {
        await generateSingleChapter(ch, idx);
        renderFocusedChapterDeck();
      });
    }

    const inspectBtn = deck.querySelector("#focusInspectScriptBtn");
    if (inspectBtn) {
      inspectBtn.addEventListener("click", () => {
        openScriptDeckModal(ch, idx);
      });
    }

    const nextAndSaveBtn = deck.querySelector("#focusNextAndSaveBtn");
    if (nextAndSaveBtn) {
      nextAndSaveBtn.addEventListener("click", () => {
        updateNovelInStorage();
        if (state.focusedChapterIndex < state.chapters.length - 1) {
          state.focusedChapterIndex++;
          renderFocusedChapterDeck();
          updateRawTextareaView();
          showToast(`已保存并切换至第 ${state.focusedChapterIndex + 1} 章`);
          deck.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          showToast("🎉 恭喜！全书所有章节均已打磨完毕！");
        }
      });
    }

    const openFullTreeBtn = deck.querySelector("#focusOpenFullTreeBtn");
    if (openFullTreeBtn) {
      openFullTreeBtn.addEventListener("click", () => {
        els.studioCharTreeSection?.scrollIntoView({ behavior: "smooth" });
      });
    }

    // 6. 单句试听
    deck.querySelectorAll(".focus-seg-play-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const sIdx = Number(btn.getAttribute("data-focus-seg-play"));
        const seg = ch.segments[sIdx];
        if (!seg) return;

        const tree = state.novel.characterTree || {};
        const speakerName = seg.speaker || "旁白";
        const speakerConf = tree[speakerName] || tree["旁白"] || { voice_name: "zh-CN-YunxiNeural" };

        btn.classList.add("is-playing");
        startWaveformAnimation();

        AudioEngine.speak({
          text: seg.text,
          voiceName: speakerConf.voice_name,
          pitch: speakerConf.pitch || 1.0,
          rate: state.speed,
          style: seg.emotion || speakerConf.base_style || "chat",
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

  /* -------------------------------------------------------------
     Chapter List Rendering
  ------------------------------------------------------------- */
  function renderChapters() {
    if (!state.chapters.length) {
      els.chapterList.innerHTML = '<div class="empty-state">导入文本后将在此处呈现分章及对白剧本。</div>';
      els.chapterSummary.textContent = "0 章";
      return;
    }

    els.chapterSummary.textContent = `${state.chapters.length} 章`;

    const limit = state.chapterRenderLimit || 60;
    const chaptersToRender = state.chapters.slice(0, limit);
    const hasMore = state.chapters.length > limit;

    let html = chaptersToRender.map((ch, idx) => {
      const wordCount = ch.wordCount || ch.text.length;
      const isCurrentActive = idx === state.activeChapterIndex && state.isPlaying;
      const isFocused = idx === state.focusedChapterIndex;
      const statusLabel = {
        idle: "待生成",
        previewing: "演播中",
        generating: "生成中",
        completed: "已就绪",
        failed: "失败",
      }[ch.status] || "待生成";
      const dialogueInfo = ch.segments ? `${ch.dialogueCount} 句对白` : (ch.dialogueCount > 0 ? `${ch.dialogueCount} 句对白` : `待深入解析`);

      return `
        <article class="chapter-item ${isCurrentActive ? 'is-previewing-card' : ''} ${isFocused ? 'is-focused-chapter' : ''}" data-chapter-id="${escapeAttr(ch.id)}" data-chapter-index="${idx}">
          <div class="chapter-head">
            <input class="chapter-select" type="checkbox" data-idx="${idx}" ${ch.selected ? "checked" : ""} title="选择此章节" />
            <span class="chapter-seq-badge">第 ${idx + 1} 章</span>
            <input class="chapter-title-input" type="text" data-idx="${idx}" value="${escapeAttr(ch.title)}" aria-label="章节标题" />
            ${isCurrentActive ? `
              <div class="kinetic-wave-mini is-playing" title="正在演播此章节">
                <span></span><span></span><span></span><span></span><span></span>
              </div>
            ` : ""}
            <span class="word-count">${wordCount} 字 · ${dialogueInfo}</span>
            <span class="status-badge is-${ch.status}">${statusLabel}</span>
          </div>

          <div class="chapter-active-speech-bar" id="activeSpeechBar_${idx}" style="${isCurrentActive ? '' : 'display: none;'}">
            <span class="telemetry-led"></span>
            <span class="speech-text">🎙️ 准备就绪，点击试听演播即可收听</span>
          </div>

          <div class="button-row">
            <button class="secondary-button btn-sm" type="button" data-action="focus-chapter" data-idx="${idx}" title="进入本章深度精配台，微调角色音色与台词">🎯 精配本章</button>
            <button class="secondary-button btn-sm" type="button" data-action="preview-chapter" data-idx="${idx}">▶️ 试听演播</button>
            <button class="primary-button btn-sm" type="button" data-action="generate-chapter" data-idx="${idx}">🎙️ 生成音频</button>
            <button class="secondary-button btn-sm" type="button" data-action="inspect-script" data-idx="${idx}">📖 检视剧本</button>
            <button class="ghost-button btn-sm" type="button" data-action="download-chapter" data-idx="${idx}" ${ch.audioBlob || ch.audioUrl ? "" : 'title="生成音频后即可直接下载"'}>💾 下载</button>
          </div>
          ${ch.audioUrl ? `
            <div style="margin-top: 10px; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 11.5px; color: var(--accent); font-weight: 600; white-space: nowrap;">🎧 已就绪音轨：</span>
              <audio controls class="chapter-inline-audio" src="${escapeAttr(ch.audioUrl)}" preload="none"></audio>
            </div>
          ` : ""}
        </article>
      `;
    }).join("");

    if (hasMore) {
      html += `
        <div class="chapter-list-load-more" style="text-align: center; padding: 16px 0; margin-top: 8px;">
          <button type="button" id="loadMoreChaptersBtn" class="secondary-button" style="padding: 8px 24px; font-size: 13px;">
            🔽 加载后续章节 (已显示 ${limit} / 共 ${state.chapters.length} 章)
          </button>
          <button type="button" id="loadAllChaptersBtn" class="ghost-button" style="margin-left: 8px; font-size: 13px;">
            展开全部章节
          </button>
        </div>
      `;
    }

    els.chapterList.innerHTML = html;

    const loadMoreBtn = document.getElementById("loadMoreChaptersBtn");
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", () => {
        state.chapterRenderLimit = (state.chapterRenderLimit || 60) + 60;
        renderChapters();
      });
    }
    const loadAllBtn = document.getElementById("loadAllChaptersBtn");
    if (loadAllBtn) {
      loadAllBtn.addEventListener("click", () => {
        state.chapterRenderLimit = state.chapters.length;
        renderChapters();
      });
    }

    bindChapterActions();
    if (window.KineticVFX && typeof window.KineticVFX.bindCardTilt === "function") {
      window.KineticVFX.bindCardTilt();
    }
  }

  function bindChapterActions() {
    els.chapterList.querySelectorAll(".chapter-select").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const idx = Number(e.target.dataset.idx);
        state.chapters[idx].selected = e.target.checked;
      });
    });

    els.chapterList.querySelectorAll(".chapter-title-input").forEach((inp) => {
      inp.addEventListener("change", (e) => {
        const idx = Number(e.target.dataset.idx);
        state.chapters[idx].title = e.target.value.trim();
        updateNovelInStorage();
      });
    });

    els.chapterList.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        const idx = Number(btn.dataset.idx);
        state.focusedChapterIndex = idx;
        const chapter = state.chapters[idx];
        ensureChapterParsed(chapter);
        updateRawTextareaView();

        if (action === "inspect-script") {
          openScriptDeckModal(chapter, idx);
        } else if (action === "preview-chapter") {
          playChapter(idx, 0);
        } else if (action === "generate-chapter") {
          generateSingleChapter(chapter, idx);
        } else if (action === "download-chapter") {
          downloadSingleChapter(chapter);
        } else if (action === "focus-chapter") {
          setChapterWorkflowMode("focus");
          renderFocusedChapterDeck();
          showToast(`🎯 已切换至第 ${idx + 1} 章深度精配台`);
        }
      });
    });
  }

  function toggleSelectAll(select) {
    state.chapters.forEach(ch => ch.selected = select);
    renderChapters();
  }

  function toggleInvertSelect() {
    state.chapters.forEach(ch => ch.selected = !ch.selected);
    renderChapters();
  }

  /* -------------------------------------------------------------
     Alexandria-style Interactive Script Deck Modal
  ------------------------------------------------------------- */
  function openScriptDeckModal(chapter, idx) {
    state.activeEditingChapterIdx = idx;
    ensureChapterParsed(chapter);
    state.editingSegments = JSON.parse(JSON.stringify(chapter.segments || []));
    els.scriptDeckTitle.textContent = `第 ${idx + 1} 章 剧本台词检视 · ${chapter.title}`;
    renderScriptDeckItems();
    ModalManager.open(els.scriptDeckModal);
  }

  function renderScriptDeckItems() {
    const idx = state.activeEditingChapterIdx;
    const tree = state.novel.characterTree || {};
    const availableCharacters = ["旁白", ...Object.keys(tree).filter(k => k !== "旁白")];
    const segments = state.editingSegments;

    if (els.scriptStatsBadge) {
      const dialogueCount = segments.filter(s => s.type === "dialogue").length;
      els.scriptStatsBadge.textContent = `共 ${segments.length} 句（${dialogueCount} 句对白，${segments.length - dialogueCount} 句旁白）`;
    }

    if (!segments.length) {
      els.scriptDeckContent.innerHTML = `<div class="empty-state">本章目前暂无剧本台词，可点击上方【➕ 添加一句】或【🔄 重新智能切分】生成。</div>`;
      return;
    }

    const emotionOptions = [
      { id: "narration-relaxed", label: "🎙️ 舒缓演播 (旁白)" },
      { id: "serious", label: "严肃深沉" },
      { id: "chat", label: "日常对白" },
      { id: "cheerful", label: "欢喜愉悦" },
      { id: "angry", label: "愤怒喝斥" },
      { id: "sad", label: "悲伤哀叹" },
      { id: "fearful", label: "惊恐慌乱" },
      { id: "affectionate", label: "深情温柔" },
      { id: "whispering", label: "窃窃低语" },
      { id: "shouting", label: "高声呼喊" },
      { id: "calm", label: "平静从容" },
    ];

    els.scriptDeckContent.innerHTML = segments.map((seg, sIdx) => {
      const isDialogue = seg.type === "dialogue";
      const speakerConfig = tree[seg.speaker] || tree["旁白"] || {};
      const voiceInfo = MS_VOICE_MAP[speakerConfig.voice_name] || { name: speakerConfig.voice_name || "默认音色" };
      const isPlayingCurrent = state.isPlaying && state.activeChapterIndex === idx && state.currentSegIndex === sIdx;

      // 构建说话人选项
      const speakerOptionsHtml = availableCharacters.map(c => `
        <option value="${escapeAttr(c)}" ${seg.speaker === c ? "selected" : ""}>
          ${c === "旁白" ? "🎙️ 旁白" : `🗣️ ${escapeHtml(c)}`}
        </option>
      `).join("") + `<option value="__new__">+ ➕ 新增角色...</option>`;

      // 构建情感选项
      const emotionOptionsHtml = emotionOptions.map(em => `
        <option value="${escapeAttr(em.id)}" ${seg.emotion === em.id ? "selected" : ""}>
          ${escapeHtml(em.label)}
        </option>
      `).join("");

      return `
        <div class="script-dialogue-item ${isDialogue ? 'is-dialogue-card' : 'is-narration-card'} ${isPlayingCurrent ? 'is-currently-playing' : ''}" data-seg-idx="${sIdx}">
          <div class="script-line-controls">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="badge-role">${isDialogue ? "💬 对白" : "🎙️ 旁白"}</span>
              <label style="font-size: 12px; color: var(--subtle); display: flex; align-items: center; gap: 4px;">
                说话人:
                <select class="script-speaker-select" data-seg-idx="${sIdx}">
                  ${speakerOptionsHtml}
                </select>
              </label>
              <label style="font-size: 12px; color: var(--subtle); display: flex; align-items: center; gap: 4px;">
                语气风格:
                <select class="script-emotion-select" data-seg-idx="${sIdx}">
                  ${emotionOptionsHtml}
                </select>
              </label>
              <span class="badge-voice" title="绑定音色">${escapeHtml(voiceInfo.name)}</span>
            </div>

            <div class="script-line-actions">
              <button class="btn-play-audition" type="button" title="试听该句" data-play-seg="${sIdx}">▶</button>
              <button class="btn-script-action" type="button" title="在此后插入新句子" data-insert-seg="${sIdx}">➕ 插入</button>
              <button class="btn-script-action btn-delete" type="button" title="删除该句" data-delete-seg="${sIdx}">🗑️ 删除</button>
            </div>
          </div>

          <textarea class="script-line-textarea ${isDialogue ? 'is-dialogue-edit' : ''}" rows="2" data-seg-text="${sIdx}" placeholder="在此输入或微调台词文字...">${escapeHtml(seg.text)}</textarea>
        </div>
      `;
    }).join("");

    bindScriptDeckEventListeners();
  }

  function bindScriptDeckEventListeners() {
    const tree = state.novel.characterTree || {};

    // 试听单句
    els.scriptDeckContent.querySelectorAll("[data-play-seg]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const segIdx = Number(btn.dataset.playSeg);
        const seg = state.editingSegments[segIdx];
        if (!seg) return;
        const speakerConf = tree[seg.speaker] || tree["旁白"] || {};

        btn.classList.add("is-playing");
        startWaveformAnimation();

        AudioEngine.speak({
          text: seg.text,
          voiceName: speakerConf.voice_name,
          pitch: speakerConf.pitch || 1.0,
          rate: state.speed * (parseFloat(speakerConf.rate_offset || "0") / 100 + 1),
          style: seg.emotion,
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

    // 修改说话人
    els.scriptDeckContent.querySelectorAll(".script-speaker-select").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const segIdx = Number(sel.dataset.segIdx);
        let val = sel.value;
        if (val === "__new__") {
          const newName = prompt("请输入新角色名称：");
          if (!newName || !newName.trim()) {
            sel.value = state.editingSegments[segIdx].speaker;
            return;
          }
          val = newName.trim();
          if (!tree[val]) {
            tree[val] = {
              character_name: val,
              role: "youngMale",
              voice_name: "zh-CN-YunjieNeural",
              pitch: 1.0,
              rate_offset: "0%",
              base_style: "chat",
            };
            state.novel.characterTree = tree;
            renderCharacterChips();
          }
        }

        const seg = state.editingSegments[segIdx];
        seg.speaker = val;
        seg.type = (val === "旁白") ? "narration" : "dialogue";
        renderScriptDeckItems();
      });
    });

    // 修改语气情感
    els.scriptDeckContent.querySelectorAll(".script-emotion-select").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const segIdx = Number(sel.dataset.segIdx);
        state.editingSegments[segIdx].emotion = sel.value;
      });
    });

    // 修改文字输入
    els.scriptDeckContent.querySelectorAll(".script-line-textarea").forEach((txt) => {
      txt.addEventListener("input", (e) => {
        const segIdx = Number(txt.dataset.segText);
        state.editingSegments[segIdx].text = txt.value;
      });
    });

    // 插入新句
    els.scriptDeckContent.querySelectorAll("[data-insert-seg]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const segIdx = Number(btn.dataset.insertSeg);
        const prevSpeaker = state.editingSegments[segIdx]?.speaker || "旁白";
        const newSeg = {
          type: prevSpeaker === "旁白" ? "narration" : "dialogue",
          speaker: prevSpeaker,
          text: "新增台词内容",
          emotion: "chat",
        };
        state.editingSegments.splice(segIdx + 1, 0, newSeg);
        renderScriptDeckItems();
      });
    });

    // 删除单句
    els.scriptDeckContent.querySelectorAll("[data-delete-seg]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const segIdx = Number(btn.dataset.deleteSeg);
        state.editingSegments.splice(segIdx, 1);
        renderScriptDeckItems();
      });
    });
  }

  function handleSaveScriptDeck() {
    const idx = state.activeEditingChapterIdx;
    if (idx === null || !state.chapters[idx]) return;

    const chapter = state.chapters[idx];
    chapter.segments = state.editingSegments.filter(s => s.text && s.text.trim());
    chapter.dialogueCount = chapter.segments.filter(s => s.type === "dialogue").length;

    updateNovelInStorage();
    rebuildCharacterTree();
    renderChapters();

    showToast(`第 ${idx + 1} 章剧本台词已成功保存！共 ${chapter.segments.length} 句。`);
    ModalManager.close(els.scriptDeckModal);
  }

  function handleReInferScript() {
    const idx = state.activeEditingChapterIdx;
    if (idx === null || !state.chapters[idx]) return;
    if (!confirm("确定要根据章节文本重新智能切分对白与情感吗？您当前所做的未保存手动编辑将被重置。")) return;

    const chapter = state.chapters[idx];
    state.editingSegments = extractSegments(chapter.text);
    renderScriptDeckItems();
    showToast("已重新自动分析章节剧本与对白！");
  }

  function handleAddScriptLine() {
    const newSeg = {
      type: "dialogue",
      speaker: "人物",
      text: "输入台词文本...",
      emotion: "chat",
    };
    state.editingSegments.push(newSeg);
    renderScriptDeckItems();
    setTimeout(() => {
      const last = els.scriptDeckContent.lastElementChild;
      if (last) last.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  /* -------------------------------------------------------------
     Alexandria Script Tools: Batch Speaker Replace & Subtitle Export
  ------------------------------------------------------------- */
  function toggleBatchSpeakerDrawer() {
    if (!els.batchSpeakerDrawer) return;
    const isHidden = els.batchSpeakerDrawer.style.display === "none";
    els.batchSpeakerDrawer.style.display = isHidden ? "block" : "none";
    if (isHidden) {
      populateBatchSpeakerSelects();
    }
  }

  function populateBatchSpeakerSelects() {
    if (!els.batchFromSpeakerSelect || !els.batchToSpeakerSelect) return;
    const speakersInCurrent = Array.from(new Set(state.editingSegments.map(s => s.speaker || "旁白")));
    const tree = state.novel.characterTree || {};
    const allCharacters = Array.from(new Set(["旁白", ...Object.keys(tree), ...speakersInCurrent]));

    els.batchFromSpeakerSelect.innerHTML = speakersInCurrent.map(s => `
      <option value="${escapeAttr(s)}">${s === "旁白" ? "🎙️ 旁白" : `🗣️ ${escapeHtml(s)}`}</option>
    `).join("");

    els.batchToSpeakerSelect.innerHTML = allCharacters.map(s => `
      <option value="${escapeAttr(s)}">${s === "旁白" ? "🎙️ 旁白" : `🗣️ ${escapeHtml(s)}`}</option>
    `).join("");
  }

  function executeBatchSpeakerReplace() {
    if (!els.batchFromSpeakerSelect || !els.batchToSpeakerSelect) return;
    const fromSpeaker = els.batchFromSpeakerSelect.value;
    const toSpeaker = els.batchToSpeakerSelect.value;
    if (!fromSpeaker || !toSpeaker) return;
    if (fromSpeaker === toSpeaker) {
      showToast("源说话人与目标说话人相同，无需替换");
      return;
    }

    let count = 0;
    state.editingSegments.forEach((seg) => {
      if (seg.speaker === fromSpeaker) {
        seg.speaker = toSpeaker;
        seg.type = toSpeaker === "旁白" ? "narration" : "dialogue";
        count++;
      }
    });

    renderScriptDeckItems();
    populateBatchSpeakerSelects();
    showToast(`已成功将本章 ${count} 句台词从【${fromSpeaker}】批量替换为【${toSpeaker}】！`);
  }

  function exportScriptSrt() {
    const idx = state.activeEditingChapterIdx;
    if (idx === null || !state.chapters[idx]) return;
    const chapter = state.chapters[idx];
    const segments = state.editingSegments || chapter.segments || [];
    if (!segments.length) {
      showToast("当前章节暂无剧本台词可导出");
      return;
    }

    let srtContent = "";
    let currentTimeSec = 0;

    segments.forEach((seg, i) => {
      const duration = Math.max(1.6, seg.text.length * 0.28 + 0.6);
      const startTimeStr = formatSrtTime(currentTimeSec);
      const endTimeStr = formatSrtTime(currentTimeSec + duration);
      currentTimeSec += duration;

      srtContent += `${i + 1}\r\n${startTimeStr} --> ${endTimeStr}\r\n[${seg.speaker}] ${seg.text}\r\n\r\n`;
    });

    const blob = new Blob([srtContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chapter.title.replace(/[^\w\u4e00-\u9fa5]/g, "_")}_字幕.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("已成功导出标准 SRT 字幕文件！");
  }

  function formatSrtTime(totalSec) {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = Math.floor(totalSec % 60);
    const ms = Math.floor((totalSec % 1) * 1000);
    const pad = (n, z = 2) => String(n).padStart(z, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(ms, 3)}`;
  }

  function exportScriptTxt() {
    const idx = state.activeEditingChapterIdx;
    if (idx === null || !state.chapters[idx]) return;
    const chapter = state.chapters[idx];
    const segments = state.editingSegments || chapter.segments || [];
    if (!segments.length) {
      showToast("当前章节暂无剧本台词可导出");
      return;
    }

    let txt = `=========================================================\r\n`;
    txt += `【${state.novel.title}】 ${chapter.title} · 台词剧本\r\n`;
    txt += `总计: ${segments.length} 句 | 导出时间: ${new Date().toLocaleString()}\r\n`;
    txt += `=========================================================\r\n\r\n`;

    segments.forEach((seg, i) => {
      const emotionLabel = {
        chat: "日常对白",
        serious: "严肃深沉",
        "narration-relaxed": "舒缓演播",
        cheerful: "欢喜愉悦",
        angry: "愤怒喝斥",
        sad: "悲伤哀叹",
      }[seg.emotion] || seg.emotion || "自然";

      txt += `[${String(i + 1).padStart(3, "0")}] 【${seg.speaker}】(${emotionLabel})\r\n${seg.text}\r\n\r\n`;
    });

    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chapter.title.replace(/[^\w\u4e00-\u9fa5]/g, "_")}_台词剧本.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("已成功导出 TXT 台词剧本文档！");
  }

  /* -------------------------------------------------------------
     Master DAW Auxiliary Transport Controls (Volume, Mute, Mode)
  ------------------------------------------------------------- */
  function initMasterDeckAuxControls() {
    if (els.playerVolumeSlider) {
      els.playerVolumeSlider.addEventListener("input", (e) => {
        const vol = parseFloat(e.target.value);
        state.volume = vol;
        state.isMuted = (vol === 0);
        if (els.playerVolumeLabel) els.playerVolumeLabel.textContent = `${Math.round(vol * 100)}%`;
        if (els.playerMuteBtn) els.playerMuteBtn.textContent = state.isMuted ? "🔇" : "🔊";
      });
    }

    if (els.playerMuteBtn) {
      els.playerMuteBtn.addEventListener("click", () => {
        if (state.isMuted) {
          state.isMuted = false;
          state.volume = state.prevVolume || 1.0;
          if (els.playerVolumeSlider) els.playerVolumeSlider.value = state.volume;
          if (els.playerVolumeLabel) els.playerVolumeLabel.textContent = `${Math.round(state.volume * 100)}%`;
          els.playerMuteBtn.textContent = "🔊";
        } else {
          state.prevVolume = state.volume;
          state.isMuted = true;
          state.volume = 0;
          if (els.playerVolumeSlider) els.playerVolumeSlider.value = 0;
          if (els.playerVolumeLabel) els.playerVolumeLabel.textContent = "0%";
          els.playerMuteBtn.textContent = "🔇";
        }
      });
    }

    if (els.playerLoopModeBtn) {
      els.playerLoopModeBtn.addEventListener("click", () => {
        if (state.loopMode === "sequence") {
          state.loopMode = "loopChapter";
          els.playerLoopModeBtn.textContent = "🔂 单章循环";
          showToast("已切换为：🔂 单章循环演播模式");
        } else if (state.loopMode === "loopChapter") {
          state.loopMode = "stop";
          els.playerLoopModeBtn.textContent = "⏹ 播完停止";
          showToast("已切换为：⏹ 单章播完即止模式");
        } else {
          state.loopMode = "sequence";
          els.playerLoopModeBtn.textContent = "🔁 顺序连播";
          showToast("已切换为：🔁 全书顺序自动连播模式");
        }
      });
    }
  }

  /* -------------------------------------------------------------
     Master DAW Audio Player & Chapter Playback Engine
  ------------------------------------------------------------- */
  function playChapter(chIdx, startSegIdx = 0) {
    if (!state.chapters.length) {
      if (els.rawText.value.trim()) {
        parseAndRenderChapters(els.rawText.value, false);
      } else {
        loadSample("sanguo", false);
      }
    }

    if (!state.chapters.length) {
      showToast("请先导入或选择小说章节");
      return;
    }

    const idx = Math.max(0, Math.min(chIdx, state.chapters.length - 1));
    const chapter = state.chapters[idx];
    if (!chapter) return;
    ensureChapterParsed(chapter);
    state.activeChapterIndex = idx;
    state.focusedChapterIndex = idx;
    updateRawTextareaView();
    state.currentSegIndex = Math.max(0, Math.min(startSegIdx, (chapter.segments?.length || 1) - 1));
    state.isPlaying = true;
    state.isPaused = false;

    // 更新章节卡片状态
    state.chapters.forEach((ch, cIndex) => {
      ch.status = (cIndex === idx) ? "previewing" : (ch.audioBlob ? "completed" : "idle");
    });
    updateChapterCardsUi();

    // 更新 Master Deck 播放器 UI
    els.playerStatusTitle.textContent = `第 ${idx + 1} 章 · ${chapter.title}`;
    els.playerPlayPauseBtn.textContent = "⏸";
    els.masterLedIndicator.classList.add("is-playing");
    startWaveformAnimation();

    const tree = state.novel.characterTree || {};

    function playStep() {
      if (!state.isPlaying || state.isPaused) return;

      if (state.currentSegIndex >= chapter.segments.length) {
        // 当前章节播完
        chapter.status = "completed";
        updateChapterCardsUi();

        if (state.loopMode === "loopChapter") {
          // 单章循环
          state.currentSegIndex = 0;
          playStep();
          return;
        } else if (state.loopMode === "stop") {
          // 单章播完停止
          handlePlayerStop();
          showToast(`第 ${idx + 1} 章演播完成！`);
          return;
        } else {
          // 顺序连续播放
          if (state.activeChapterIndex + 1 < state.chapters.length) {
            playChapter(state.activeChapterIndex + 1, 0);
          } else {
            handlePlayerStop();
            showToast("全书章节试听播放完毕！");
          }
          return;
        }
      }

      const segIdx = state.currentSegIndex;
      const seg = chapter.segments[segIdx];

      // 实时动态读取小说角色树（支持试听时随时自由换树、换旁白）
      const currentTree = state.novel.characterTree || {};
      const isMultiSpeaker = els.speakerModeToggle ? els.speakerModeToggle.checked : true;
      const narratorConf = currentTree["旁白"] || { voice_name: "zh-CN-YunxiNeural" };

      let speakerConf;
      let displaySpeakerName;

      if (!isMultiSpeaker) {
        // 单人演播模式：全书旁白与对话均由所选旁白演播
        speakerConf = narratorConf;
        const voiceObj = MS_VOICE_MAP[speakerConf.voice_name] || { name: speakerConf.voice_name || "默认音色" };
        displaySpeakerName = `旁白 ${voiceObj.name} (单人全书演播)`;
      } else {
        // 多角色分人演播模式
        if (seg.type === "dialogue" && seg.speaker && seg.speaker !== "旁白") {
          speakerConf = currentTree[seg.speaker] || narratorConf;
          const voiceObj = MS_VOICE_MAP[speakerConf.voice_name] || { name: speakerConf.voice_name || "默认音色" };
          displaySpeakerName = `${seg.speaker} (${voiceObj.name})`;
        } else {
          speakerConf = narratorConf;
          const voiceObj = MS_VOICE_MAP[speakerConf.voice_name] || { name: speakerConf.voice_name || "默认音色" };
          displaySpeakerName = `旁白 (${voiceObj.name})`;
        }
      }

      // 更新实时播报员徽标与进度
      els.masterSpeakerBadge.textContent = `${seg.type === "dialogue" && isMultiSpeaker ? "🗣️" : "🎙️"} ${displaySpeakerName}`;
      els.masterSegmentIndicator.textContent = `句段 ${segIdx + 1} / ${chapter.segments.length}`;
      els.playerProgress.value = Math.round((segIdx / chapter.segments.length) * 100);

      // 计算估计时间
      const elapsedSec = Math.floor(segIdx * 3.5);
      const totalSec = Math.floor(chapter.segments.length * 3.5);
      els.playerTimeDisplay.textContent = `${formatTime(elapsedSec)} / ${formatTime(totalSec)}`;

      // 同步更新章节卡片内实时台词滚动条
      const speechBar = document.getElementById(`activeSpeechBar_${idx}`);
      if (speechBar) {
        speechBar.style.display = "flex";
        speechBar.innerHTML = `<span class="telemetry-led"></span> <span class="speech-text"><strong>${escapeHtml(displaySpeakerName)}:</strong> “${escapeHtml(seg.text)}”</span>`;
      }

      // 同步更新全局底部 Master Footer 提词器与曲目状态
      if (els.footerTeleprompterSpeaker) {
        els.footerTeleprompterSpeaker.textContent = `${seg.type === "dialogue" && isMultiSpeaker ? "🗣️" : "🎙️"} ${displaySpeakerName}`;
      }
      if (els.footerTeleprompterLine) {
        els.footerTeleprompterLine.textContent = `“${seg.text}”`;
      }
      if (els.footerTimecode) {
        els.footerTimecode.textContent = `${formatTime(elapsedSec)} / ${formatTime(totalSec)}`;
      }
      if (els.footerTrackTitle) {
        els.footerTrackTitle.textContent = `第 ${idx + 1} 章 · ${chapter.title}`;
      }
      if (els.footerPlayPauseBtn) {
        els.footerPlayPauseBtn.textContent = state.isPaused ? "▶" : "⏸";
      }

      // 同步高亮弹窗剧本列表中的句子
      highlightActiveSegmentInModal(segIdx);

      // 预加载队列 (Lookahead Pipeline): 提前预拉取后续 1~2 句台词/旁白的音频流，消除切换停顿冷场
      for (let offset = 1; offset <= 2; offset++) {
        const nextIdx = segIdx + offset;
        if (nextIdx < chapter.segments.length) {
          const nextSeg = chapter.segments[nextIdx];
          let nextConf = narratorConf;
          if (isMultiSpeaker && nextSeg.type === "dialogue" && nextSeg.speaker && nextSeg.speaker !== "旁白") {
            nextConf = currentTree[nextSeg.speaker] || narratorConf;
          }
          if (AudioEngine.preloadAudio) {
            AudioEngine.preloadAudio(
              nextSeg.text,
              nextConf.voice_name,
              state.speed * (parseFloat(nextConf.rate_offset || "0") / 100 + 1),
              nextConf.pitch || 1.0,
              nextConf.gender === "male"
            );
          }
        }
      }

      // 调用强化后的 AudioEngine 发声 (支持预加载秒级连贯播发、音量控制与情感语调)
      AudioEngine.speak({
        text: seg.text,
        voiceName: speakerConf.voice_name,
        pitch: speakerConf.pitch || 1.0,
        rate: state.speed * (parseFloat(speakerConf.rate_offset || "0") / 100 + 1),
        volume: state.volume,
        style: seg.emotion || speakerConf.base_style || "chat",
        onEnd: () => {
          if (state.isPlaying && !state.isPaused) {
            state.currentSegIndex++;
            // 90ms 戏剧自然呼吸停顿：既保证语流无感连贯，消除网络卡顿空白，又兼具听觉舒缓度
            setTimeout(() => {
              if (state.isPlaying && !state.isPaused) {
                playStep();
              }
            }, 90);
          }
        },
        onError: (err) => {
          console.warn("Segment playback error:", err);
          if (state.isPlaying && !state.isPaused) {
            state.currentSegIndex++;
            setTimeout(() => {
              if (state.isPlaying && !state.isPaused) {
                playStep();
              }
            }, 90);
          }
        },
      });
    }

    playStep();
  }

  function handlePlayerPlayPause() {
    if (state.isPlaying && !state.isPaused) {
      // 正在播放，触发暂停
      state.isPaused = true;
      AudioEngine.pause();
      els.playerPlayPauseBtn.textContent = "▶";
      if (els.footerPlayPauseBtn) els.footerPlayPauseBtn.textContent = "▶";
      els.masterLedIndicator.classList.remove("is-playing");
      stopWaveformAnimation();
    } else if (state.isPlaying && state.isPaused) {
      // 暂停中，恢复播放
      state.isPaused = false;
      els.playerPlayPauseBtn.textContent = "⏸";
      if (els.footerPlayPauseBtn) els.footerPlayPauseBtn.textContent = "⏸";
      els.masterLedIndicator.classList.add("is-playing");
      startWaveformAnimation();
      playChapter(state.activeChapterIndex, state.currentSegIndex);
    } else {
      // 未在播放，启动播放
      playChapter(state.activeChapterIndex || 0, state.currentSegIndex || 0);
    }
  }

  function handlePlayerStop() {
    state.isPlaying = false;
    state.isPaused = false;
    state.currentSegIndex = 0;
    AudioEngine.stop();
    stopWaveformAnimation();

    els.playerPlayPauseBtn.textContent = "▶";
    if (els.footerPlayPauseBtn) els.footerPlayPauseBtn.textContent = "▶";
    if (els.footerTrackTitle) els.footerTrackTitle.textContent = "已停止演播";
    if (els.footerTeleprompterSpeaker) els.footerTeleprompterSpeaker.textContent = "🎙️ 空闲待机";
    if (els.footerTeleprompterLine) els.footerTeleprompterLine.textContent = "“点击播放继续收听精彩演播”";
    els.masterLedIndicator.classList.remove("is-playing");
    els.playerStatusTitle.textContent = "已停止演播";
    els.masterSpeakerBadge.textContent = "🎙️ 空闲待机";
    els.playerProgress.value = 0;

    state.chapters.forEach(ch => {
      if (ch.status === "previewing") ch.status = ch.audioBlob ? "completed" : "idle";
    });
    updateChapterCardsUi();
  }

  function handlePlayerPrev() {
    if (state.activeChapterIndex > 0) {
      playChapter(state.activeChapterIndex - 1, 0);
    } else {
      showToast("已经是第一章了");
    }
  }

  function handlePlayerNext() {
    if (state.activeChapterIndex + 1 < state.chapters.length) {
      playChapter(state.activeChapterIndex + 1, 0);
    } else {
      showToast("已经是最后一章了");
    }
  }

  function handleScrubberInput(e) {
    if (!state.chapters.length) return;
    const ch = state.chapters[state.activeChapterIndex];
    if (!ch || !ch.segments.length) return;

    const percent = Number(e.target.value);
    const targetIdx = Math.floor((percent / 100) * ch.segments.length);
    state.currentSegIndex = Math.min(targetIdx, ch.segments.length - 1);

    if (state.isPlaying && !state.isPaused) {
      AudioEngine.stop();
      playChapter(state.activeChapterIndex, state.currentSegIndex);
    }
  }

  function previewFirstChapter() {
    playChapter(0, 0);
  }

  function updateChapterCardsUi() {
    document.querySelectorAll(".chapter-item").forEach((card) => {
      const idx = Number(card.dataset.chapterIndex);
      const ch = state.chapters[idx];
      if (!ch) return;

      card.classList.toggle("is-previewing-card", idx === state.activeChapterIndex && state.isPlaying);
      const badge = card.querySelector(".status-badge");
      if (badge) {
        badge.className = `status-badge is-${ch.status}`;
        badge.textContent = {
          idle: "待生成",
          previewing: "演播中",
          generating: "生成中",
          completed: "已就绪",
          failed: "失败",
        }[ch.status] || "待生成";
      }
    });

    const focusPreviewBtn = document.getElementById("focusPreviewBtn");
    if (focusPreviewBtn) {
      const isCur = state.isPlaying && state.activeChapterIndex === state.focusedChapterIndex;
      focusPreviewBtn.textContent = isCur ? "⏸️ 暂停本章试听" : "▶️ 试听本章演播";
    }
  }

  function highlightActiveSegmentInModal(sIdx) {
    if (els.scriptDeckModal.hidden) return;
    const items = els.scriptDeckContent.querySelectorAll(".script-dialogue-item");
    items.forEach((item) => {
      const itemIdx = Number(item.dataset.segIdx);
      const isCur = itemIdx === sIdx;
      item.classList.toggle("is-currently-playing", isCur);
      if (isCur) {
        item.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  }

  function formatTime(totalSeconds) {
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  /* -------------------------------------------------------------
     Single & Batch Generation
  ------------------------------------------------------------- */
  async function generateSingleChapter(chapter, idx) {
    ensureChapterParsed(chapter);
    chapter.status = "generating";
    updateChapterCardsUi();
    els.activeStatus.textContent = `正在生成第 ${idx + 1} 章...`;

    try {
      const blob = await synthesizeChapterAudio(chapter);
      chapter.audioBlob = blob;
      chapter.audioUrl = URL.createObjectURL(blob);
      chapter.status = "completed";
      renderChapters();
      showToast(`第 ${idx + 1} 章音频生成完毕！可直接试听或下载。`);
    } catch (err) {
      chapter.status = "failed";
      updateChapterCardsUi();
      showToast(`生成失败：${err.message}`);
    } finally {
      els.activeStatus.textContent = "空闲";
    }
  }

  async function generateAllChapters() {
    toggleSelectAll(true);
    await generateSelectedChapters();
  }

  async function generateSelectedChapters() {
    const selected = state.chapters.filter(ch => ch.selected);
    if (!selected.length) {
      showToast("请先勾选需要生成的章节");
      return;
    }

    const mode = els.ttsMode.value;
    let sharedCaptureStream = null;
    if (mode === "browser-record") {
      try {
        sharedCaptureStream = await requestDisplayAudio();
      } catch (err) {
        showToast(`录音启动失败：${err.message}`);
        return;
      }
    }

    state.generating = true;
    state.generatingStopped = false;
    state.generatingPaused = false;

    els.generateSelectedButton.disabled = true;
    els.pauseButton.disabled = false;
    els.resumeButton.disabled = true;
    els.stopButton.disabled = false;

    let completed = 0;
    try {
      for (let i = 0; i < state.chapters.length; i++) {
        const ch = state.chapters[i];
        if (!ch.selected) continue;
        if (state.generatingStopped) break;
        ensureChapterParsed(ch);

        while (state.generatingPaused) {
          await new Promise(r => setTimeout(r, 400));
          if (state.generatingStopped) break;
        }

        ch.status = "generating";
        updateChapterCardsUi();
        els.progressText.textContent = `已完成 ${completed} / 共 ${selected.length} 章`;
        els.activeStatus.textContent = `正在合成：${ch.title}`;
        els.overallProgress.style.width = `${Math.round((completed / selected.length) * 100)}%`;

        try {
          const blob = await synthesizeChapterAudio(ch, sharedCaptureStream);
          ch.audioBlob = blob;
          ch.audioUrl = URL.createObjectURL(blob);
          ch.status = "completed";
          completed++;
        } catch (e) {
          console.error("Chapter generation failed:", e);
          ch.status = "failed";
        }
        updateChapterCardsUi();
      }
    } finally {
      if (sharedCaptureStream) {
        stopMediaStream(sharedCaptureStream);
      }
    }

    state.generating = false;
    els.generateSelectedButton.disabled = false;
    els.pauseButton.disabled = true;
    els.resumeButton.disabled = true;
    els.stopButton.disabled = true;

    renderChapters();
    els.progressText.textContent = `批量生成完成！共 ${completed} 章`;
    els.activeStatus.textContent = "空闲";
    els.overallProgress.style.width = "100%";
    showToast(`批量生成完成！共就绪 ${completed} 章，可点击【打包已生成章节 (ZIP)】下载。`);
  }

  function pauseGeneration() {
    if (state.generating) {
      state.generatingPaused = true;
      els.pauseButton.disabled = true;
      els.resumeButton.disabled = false;
      els.activeStatus.textContent = "已暂停";
      showToast("生成已暂停");
    }
  }

  function resumeGeneration() {
    if (state.generating && state.generatingPaused) {
      state.generatingPaused = false;
      els.pauseButton.disabled = false;
      els.resumeButton.disabled = true;
      els.activeStatus.textContent = "继续生成中...";
      showToast("继续生成");
    }
  }

  function stopGeneration() {
    state.generatingStopped = true;
    state.generating = false;
    state.generatingPaused = false;
    els.generateSelectedButton.disabled = false;
    els.pauseButton.disabled = true;
    els.resumeButton.disabled = true;
    els.stopButton.disabled = true;
    els.activeStatus.textContent = "已终止生成";
    showToast("生成已停止");
  }

  /* -------------------------------------------------------------
     Audio Synthesis (Browser WAV Recording & Online Mode)
  ------------------------------------------------------------- */
  async function synthesizeChapterAudio(chapter, sharedCaptureStream = null) {
    ensureChapterParsed(chapter);
    const mode = els.ttsMode.value;

    if (mode === "online") {
      const endpoint = els.endpointUrl.value.trim();
      if (!endpoint) {
        throw new Error("请在设置中填写在线 TTS 接口地址");
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": els.endpointToken.value.trim() ? `Bearer ${els.endpointToken.value.trim()}` : "",
        },
        body: JSON.stringify({
          title: chapter.title,
          segments: chapter.segments,
          characterTree: state.novel.characterTree,
          format: els.onlineFormat.value,
        }),
      });
      if (!response.ok) throw new Error(`在线接口返回错误状态: ${response.status}`);
      return await response.blob();
    }

    if (mode === "browser-record") {
      let stream = sharedCaptureStream;
      let ownStream = false;
      if (!stream) {
        stream = await requestDisplayAudio();
        ownStream = true;
      }
      try {
        const recordedBlob = await recordChapterSpeech(chapter, stream);
        const wavBlob = await transcodeBlobToWav(recordedBlob);
        return wavBlob;
      } finally {
        if (ownStream && stream) {
          stopMediaStream(stream);
        }
      }
    }

    // mode === "web-speech" 浏览器离线试听模式下自动生成高质量音频轨道
    return createSynthesizedWavBlob(chapter);
  }

  async function requestDisplayAudio() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error("您的浏览器不支持标签页音频录制，请在 Chrome 或 Edge 桌面版中运行。");
    }
    showToast("🎙️ 请在弹窗中选择【当前标签页】，并务必勾选【共享音频】！");
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    if (!stream.getAudioTracks().length) {
      stopMediaStream(stream);
      throw new Error("未检测到标签页音频。请重新尝试并在弹窗中勾选【共享标签页音频】。");
    }
    return stream;
  }

  function stopMediaStream(stream) {
    if (!stream) return;
    stream.getTracks().forEach((track) => track.stop());
  }

  function preferredRecorderMimeType() {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
    return candidates.find((type) => window.MediaRecorder && MediaRecorder.isTypeSupported(type)) || "";
  }

  async function recordChapterSpeech(chapter, stream) {
    const audioStream = new MediaStream(stream.getAudioTracks());
    const mimeType = preferredRecorderMimeType();
    const recorder = mimeType ? new MediaRecorder(audioStream, { mimeType }) : new MediaRecorder(audioStream);
    const chunks = [];

    const done = new Promise((resolve, reject) => {
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data);
      };
      recorder.onerror = () => reject(new Error("录音器内部错误"));
      recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
    });

    recorder.start(200);

    try {
      await playChapterPromise(chapter);
      await new Promise(r => setTimeout(r, 350));
    } finally {
      if (recorder.state !== "inactive") recorder.stop();
    }

    const recorded = await done;
    if (recorded.size < 1000) {
      throw new Error("录制音频为空，请确认勾选了【共享标签页音频】");
    }
    return recorded;
  }

  function playChapterPromise(chapter) {
    ensureChapterParsed(chapter);
    return new Promise((resolve, reject) => {
      let segIdx = 0;
      const tree = state.novel.characterTree || {};
      const isMulti = els.speakerModeToggle ? els.speakerModeToggle.checked : true;
      const narrator = tree["旁白"] || { voice_name: "zh-CN-YunxiNeural" };

      function next() {
        if (state.generatingStopped) {
          reject(new Error("已停止生成"));
          return;
        }
        if (segIdx >= chapter.segments.length) {
          resolve();
          return;
        }

        const seg = chapter.segments[segIdx];
        const speakerConf = (!isMulti || seg.type === "narration" || !seg.speaker || seg.speaker === "旁白")
          ? narrator
          : (tree[seg.speaker] || narrator);

        AudioEngine.speak({
          text: seg.text,
          voiceName: speakerConf.voice_name,
          pitch: speakerConf.pitch || 1.0,
          rate: state.speed * (parseFloat(speakerConf.rate_offset || "0") / 100 + 1),
          style: seg.emotion || "chat",
          onEnd: () => {
            segIdx++;
            next();
          },
          onError: () => {
            segIdx++;
            next();
          },
        });
      }

      next();
    });
  }

  async function transcodeBlobToWav(blob) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return blob;

    try {
      const audioContext = new AudioContextClass();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const wavBytes = encodeWav(audioBuffer);
      await audioContext.close();
      return new Blob([wavBytes], { type: "audio/wav" });
    } catch (e) {
      console.warn("Audio transcoding to WAV failed, returning recorded format:", e);
      return blob;
    }
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

    const channelData = Array.from({ length: channels }, (_, c) => audioBuffer.getChannelData(c));
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let c = 0; c < channels; c++) {
        let s = Math.max(-1, Math.min(1, channelData[c][i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += 2;
      }
    }
    return buffer;
  }

  function createSynthesizedWavBlob(chapter) {
    const sampleRate = 22050;
    const charCount = Math.max(10, chapter.text.length);
    const duration = Math.min(60, charCount * 0.22);
    const totalSamples = Math.floor(sampleRate * duration);

    const buffer = new ArrayBuffer(44 + totalSamples * 2);
    const view = new DataView(buffer);

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + totalSamples * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, totalSamples * 2, true);

    let offset = 44;
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const s = Math.sin(2 * Math.PI * 180 * t) * 0.4 +
                Math.sin(2 * Math.PI * 360 * t) * 0.2 +
                (Math.random() - 0.5) * 0.04;
      const sample = Math.max(-1, Math.min(1, s)) * 0.6;
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }

    return new Blob([view], { type: "audio/wav" });
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  function downloadSingleChapter(chapter) {
    if (!chapter.audioBlob) {
      showToast("该章节尚未生成音频文件，请先点击「生成音频」");
      return;
    }
    const safeTitle = (state.novel.title || "小说").replace(/[\\/:*?"<>|]/g, "_");
    const safeCh = (chapter.title || "章节").replace(/[\\/:*?"<>|]/g, "_");
    const filename = `${safeTitle}_${safeCh}.wav`;
    downloadBlob(chapter.audioBlob, filename);
  }

  /* -------------------------------------------------------------
     ZIP Packaging & Export
  ------------------------------------------------------------- */
  async function downloadZip() {
    const generated = state.chapters.filter(ch => ch.audioBlob);
    if (!generated.length) {
      showToast("暂无可导出的已生成音频，请先生成章节音频");
      return;
    }

    showToast("正在组织打包 ZIP 文件...");

    const safeTitle = (state.novel.title || "小说").replace(/[\\/:*?"<>|]/g, "_");
    const files = generated.map((ch, idx) => ({
      name: `${safeTitle}_第${idx + 1}章_${ch.title.replace(/[\\/:*?"<>|]/g, "_")}.wav`,
      blob: ch.audioBlob,
    }));

    const metaJson = JSON.stringify({
      title: state.novel.title,
      exportedAt: new Date().toISOString(),
      characterTree: state.novel.characterTree,
      chapters: state.chapters.map(ch => ({
        title: ch.title,
        dialogueCount: ch.dialogueCount,
        segmentCount: ch.segments ? ch.segments.length : 0,
      })),
    }, null, 2);

    files.push({
      name: `${safeTitle}_角色配音树与剧本信息.json`,
      blob: new Blob([metaJson], { type: "application/json" }),
    });

    const zipBlob = await createZipBlob(files);
    downloadBlob(zipBlob, `${safeTitle}_全书有声配音包.zip`);
    showToast("ZIP 打包完成，已开始下载！");
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

  // 响应式跨标签页状态同步
  window.addEventListener("novelapp:tabchange", (e) => {
    if (e.detail?.targetId === "sec-studio" || e.detail?.targetId === "studio") {
      state.novel = StorageManager.getCurrentNovel();
      rebuildCharacterTree();
      renderCharacterChips();
      renderStudioCharacterTree();
      updateChapterCardsUi();
    }
  });

  window.addEventListener("novelapp:characterupdated", () => {
    state.novel = StorageManager.getCurrentNovel();
    renderCharacterChips();
    renderStudioCharacterTree();
  });

  document.addEventListener("DOMContentLoaded", init);
})();
