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
    narratorMale: "旁白男",
    narratorFemale: "旁白女",
    youngMale: "青年男",
    youngFemale: "青年女",
    elderVillain: "长者/反派",
  };

  const ROLE_DEFAULTS = {
    narratorMale: { pitch: 0.92, rateOffset: -0.04, keywords: ["Yunxi", "云希", "Kangkang", "Male", "男"] },
    narratorFemale: { pitch: 1.06, rateOffset: -0.02, keywords: ["Xiaoxiao", "晓晓", "Huihui", "Female", "女"] },
    youngMale: { pitch: 1.0, rateOffset: 0.02, keywords: ["Yunjie", "云杰", "Kangkang", "Male", "男"] },
    youngFemale: { pitch: 1.16, rateOffset: 0.04, keywords: ["Xiaoyi", "晓伊", "Xiaoxiao", "Female", "女"] },
    elderVillain: { pitch: 0.78, rateOffset: -0.08, keywords: ["Yunze", "云泽", "Kangkang", "Male", "男"] },
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
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    applyTheme(state.theme);
    bindEvents();
    refreshVoices();
    updateSupportStatus();
    updateModeNotice();
    renderAll();

    if ("speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", () => {
        refreshVoices();
        rebuildSpeakerSettings();
        renderVoiceTable();
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
      "refreshVoicesButton",
      "voiceTable",
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
      renderVoiceTable();
    });
    els.refreshVoicesButton.addEventListener("click", () => {
      refreshVoices();
      rebuildSpeakerSettings();
      renderVoiceTable();
      toast("已刷新浏览器音色列表。");
    });
    els.generateSelectedButton.addEventListener("click", generateSelectedChapters);
    els.pauseButton.addEventListener("click", pauseWork);
    els.resumeButton.addEventListener("click", resumeWork);
    els.stopButton.addEventListener("click", stopWork);
    els.zipButton.addEventListener("click", downloadGeneratedZip);

    els.chapterList.addEventListener("click", handleChapterClick);
    els.chapterList.addEventListener("change", handleChapterChange);
    els.chapterList.addEventListener("input", handleChapterInput);
    els.voiceTable.addEventListener("change", handleVoiceChange);
    els.voiceTable.addEventListener("input", handleVoiceChange);
  }

  function applyTheme(theme) {
    state.theme = theme;
    document.body.dataset.theme = theme;
    localStorage.setItem("novelTtsTheme", theme);
    els.themeToggle.title = theme === "dark" ? "切换浅色" : "切换深色";
  }

  async function handleFileImport(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".txt") && !lowerName.endsWith(".md")) {
      toast("仅支持 .txt / .md 文件。EPUB 请先用桌面项目或阅读器导出为文本。");
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
      toast(`已识别 ${state.chapters.length} 个章节，可继续调整分割点。`);
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
    renderVoiceTable();
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

  function renderVoiceTable() {
    const speakers = currentSpeakers();
    if (!speakers.length) {
      els.voiceTable.innerHTML = '<div class="empty-state">导入文本后自动匹配角色。</div>';
      return;
    }

    els.voiceTable.innerHTML = speakers
      .map((speaker) => {
        const setting = state.speakerSettings.get(speaker);
        return `
          <div class="voice-row" data-speaker="${escapeAttr(speaker)}">
            <div class="speaker-name" title="${escapeAttr(speaker)}">${escapeHtml(speaker)}</div>
            <select class="text-input" data-field="role" aria-label="${escapeAttr(speaker)}角色类型">
              ${Object.entries(ROLE_LABELS)
                .map(
                  ([value, label]) =>
                    `<option value="${value}" ${setting.role === value ? "selected" : ""}>${label}</option>`,
                )
                .join("")}
            </select>
            <select class="text-input" data-field="voice" aria-label="${escapeAttr(speaker)}浏览器音色">
              ${voiceOptions(setting.voiceName)}
            </select>
            <div class="micro-controls">
              <label class="mini-slider">音高 ${Number(setting.pitch).toFixed(2)}
                <input type="range" min="0.5" max="1.8" step="0.05" value="${setting.pitch}" data-field="pitch" />
              </label>
              <label class="mini-slider">角色语速 ${Number(setting.rateOffset).toFixed(2)}
                <input type="range" min="-0.3" max="0.3" step="0.05" value="${setting.rateOffset}" data-field="rateOffset" />
              </label>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function voiceOptions(selectedVoiceName) {
    if (!state.voices.length) {
      return '<option value="">浏览器尚未返回音色</option>';
    }
    return state.voices
      .map((voice) => {
        const label = `${voice.name}${voice.lang ? ` · ${voice.lang}` : ""}`;
        return `<option value="${escapeAttr(voice.name)}" ${voice.name === selectedVoiceName ? "selected" : ""}>${escapeHtml(label)}</option>`;
      })
      .join("");
  }

  function rebuildSpeakerSettings() {
    const speakers = currentSpeakers();
    const next = new Map();
    speakers.forEach((speaker, index) => {
      const existing = state.speakerSettings.get(speaker);
      if (existing) {
        next.set(speaker, existing);
        return;
      }
      const role = inferRole(speaker);
      next.set(speaker, {
        speaker,
        role,
        voiceName: chooseVoiceName(role, index),
        pitch: ROLE_DEFAULTS[role].pitch,
        rateOffset: ROLE_DEFAULTS[role].rateOffset,
      });
    });
    state.speakerSettings = next;
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
    if (speaker === "旁白") return "narratorMale";
    if (/夫人|小姐|姑娘|女|母|妻|姬|妃|她|妹|姐/.test(speaker)) return "youngFemale";
    if (/老|翁|父|叔|伯|卓|操|贼|魔|王/.test(speaker)) return "elderVillain";
    return "youngMale";
  }

  function chooseVoiceName(role, offset = 0) {
    if (!state.voices.length) return "";
    const chineseVoices = state.voices.filter((voice) => {
      const value = `${voice.name} ${voice.lang}`.toLowerCase();
      return value.includes("zh") || value.includes("chinese") || value.includes("中文") || value.includes("普通话");
    });
    const pool = chineseVoices.length ? chineseVoices : state.voices;
    const keywords = ROLE_DEFAULTS[role].keywords;
    const matched = pool.find((voice) =>
      keywords.some((keyword) => `${voice.name} ${voice.lang}`.toLowerCase().includes(keyword.toLowerCase())),
    );
    return (matched || pool[offset % pool.length]).name;
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
      els.modeNotice.textContent = "在线接口会收到章节分批文本与角色音色设置，并需返回 audio/mpeg 或 audio/wav。接口鉴权令牌只保存在当前页面输入框。";
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

  function handleVoiceChange(event) {
    const row = event.target.closest(".voice-row");
    if (!row) return;
    const speaker = row.dataset.speaker;
    const setting = state.speakerSettings.get(speaker);
    if (!setting) return;
    const field = event.target.dataset.field;
    if (!field) return;

    if (field === "role") {
      setting.role = event.target.value;
      const defaults = ROLE_DEFAULTS[setting.role];
      setting.pitch = defaults.pitch;
      setting.rateOffset = defaults.rateOffset;
      setting.voiceName = chooseVoiceName(setting.role);
      renderVoiceTable();
      return;
    }

    if (field === "voice") setting.voiceName = event.target.value;
    if (field === "pitch") setting.pitch = Number(event.target.value);
    if (field === "rateOffset") setting.rateOffset = Number(event.target.value);

    if (field === "pitch" || field === "rateOffset") {
      const label = event.target.closest(".mini-slider");
      if (label) {
        const text = field === "pitch" ? "音高" : "角色语速";
        label.childNodes[0].nodeValue = `${text} ${Number(event.target.value).toFixed(2)} `;
      }
    }
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
        voice_settings: Array.from(state.speakerSettings.values()),
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
    const voice = setting ? state.voices.find((candidate) => candidate.name === setting.voiceName) : null;
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || "zh-CN";
    } else {
      utterance.lang = "zh-CN";
    }

    const emotion = emotionAdjustment(item.emotion);
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
      renderVoiceTable();
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
