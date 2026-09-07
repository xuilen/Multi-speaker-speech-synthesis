# 小说文本转有声书网页应用

直接双击打开 `index.html` 即可使用，无需后端服务和登录。

## 生成模式

- 浏览器试听 Web Speech：使用浏览器内置语音朗读，可离线试听；Web Speech API 不提供音频文件流，因此暂不支持下载音频。
- 浏览器录制导出 WAV：通过浏览器捕获当前标签页音频，把朗读录制为 WAV；需要 Chrome / Edge 支持标签页音频捕获，并在弹窗中选择当前标签页且勾选共享音频。
- 在线接口导出 MP3/WAV：向你填写的 TTS 接口发送章节文本、角色分段和音色设置，接口需返回音频 Blob、`audio_base64` 或 `audio_url`。

## 在线接口请求格式

页面会向接口发送 `POST` JSON：

```json
{
  "book_title": "书名",
  "chapter_index": 1,
  "chapter_title": "第一章",
  "part_index": 0,
  "total_parts": 1,
  "output_format": "mp3",
  "rate": 1,
  "speaker_mode": true,
  "voice_settings": [],
  "segments": []
}
```

接口可直接返回 `audio/mpeg`、`audio/wav`，或返回：

```json
{
  "audio_base64": "...",
  "mime_type": "audio/mpeg"
}
```

也可以返回：

```json
{
  "audio_url": "https://example.com/chapter.mp3"
}
```
