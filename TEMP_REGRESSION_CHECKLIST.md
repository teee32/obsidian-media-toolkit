# 临时实机回归验证清单

本文件只服务于当前这一轮真人工回归，测试完成后可直接删除。

## 使用建议

- 建议在另一台机器新建一个临时 Vault 做回归，避免污染日常笔记。
- 建议先拉取最新 `master`，再把插件产物放进 `.obsidian/plugins/obsidian-media-toolkit/`。
- 每一项都按“操作”和“预期结果”核对；如果不符合，记录具体文件名、链接写法和界面提示。

## 建议准备的测试数据

### 图片

- `attachments/moon-a.jpg` 和 `attachments/moon-b.jpg`
  - 两个文件内容完全相同，用于重复检测。
- `other/moon-a.jpg`
  - 与上面同名但路径不同，用于验证不会误改同名附件链接。

### 文档

- `attachments/sample.pdf`
- `attachments/sample.docx`
- `attachments/sample.xlsx`
- `attachments/sample.pptx`

### 笔记

- `notes/wiki-links.md`
  - 写入 `![[moon-a.jpg]]`
  - 写入 `[[sample.docx]]`
- `notes/markdown-links.md`
  - 写入 `![moon](../attachments/moon-a.jpg)`
  - 写入 `![moon query](../attachments/moon-a.jpg?raw=1)`
  - 写入 `![moon hash](../attachments/moon-a.jpg#page=1)`
- `notes/same-name.md`
  - 写入 `![[other/moon-a.jpg]]`
- `notes/docs.md`
  - 分别写入 `[[sample.pdf]]`、`[[sample.docx]]`、`[[sample.xlsx]]`、`[[sample.pptx]]`

## 回归清单

### 1. 安装与基础冒烟

- [ ] 插件能正常启用，没有报错弹窗。
- [ ] 命令面板里能看到 `媒体库`、`查找未引用图片`、`打开重复检测`、`隔离文件管理`。
- [ ] 打开各个视图时没有空白页、错位按钮或明显样式异常。

### 2. 文档支持显示

- [ ] 在设置页中，相关开关文案显示为“启用文档支持”，不是“启用 PDF 支持”。
- [ ] 媒体库能显示 `pdf/docx/xlsx/pptx` 文件。
- [ ] 文档缩略图回退标签按真实扩展名显示，例如 `PDF`、`DOCX`、`XLSX`、`PPTX`。
- [ ] PDF 点击预览时可正常内嵌预览。
- [ ] DOCX/XLSX/PPTX 点击预览时不会崩溃；界面明确提示该类型不支持内嵌预览。
- [ ] DOCX/XLSX/PPTX 在预览弹窗中仍可复制路径、复制链接、打开原文件、查找引用。

### 3. 未引用媒体视图

- [ ] 未被任何笔记引用的图片和文档能出现在未引用视图中。
- [ ] 已被笔记引用的 `sample.pdf/docx/xlsx/pptx` 不会被误判成未引用。
- [ ] 文档在未引用视图中的回退标签也按真实扩展名显示。

### 4. 重复检测基础行为

- [ ] `moon-a.jpg` 与 `moon-b.jpg` 能被识别为同一组重复图片。
- [ ] 每组会建议保留一个文件，其余文件显示“隔离”按钮。
- [ ] 一键隔离和单个隔离都能正常执行，没有报错。

### 5. 重复隔离后的链接重写

- [ ] 在重复检测中保留 `moon-b.jpg`、隔离 `moon-a.jpg`。
- [ ] `notes/wiki-links.md` 里的 `![[moon-a.jpg]]` 会被改写为指向保留文件。
- [ ] `notes/markdown-links.md` 里的 `![moon](../attachments/moon-a.jpg)` 会被改写为指向保留文件。
- [ ] `notes/markdown-links.md` 里的带查询参数链接 `?raw=1` 仍然保留查询参数，只替换文件目标。
- [ ] `notes/markdown-links.md` 里的带锚点链接 `#page=1` 仍然保留锚点，只替换文件目标。
- [ ] `notes/same-name.md` 里的 `![[other/moon-a.jpg]]` 不会被误改。
- [ ] 隔离完成后，笔记中不应再残留指向已隔离副本的失效链接。

### 6. 隔离区管理

- [ ] 被隔离的重复文件会进入隔离区，而不是直接消失。
- [ ] 隔离管理里能看到原始路径、类型、引用计数等信息。
- [ ] 对隔离文件执行恢复后，文件能回到原路径。
- [ ] 恢复后，如果重新打开笔记，链接仍然保持有效。

### 7. 文档引用工作流

- [ ] 在媒体库中对 `sample.docx`、`sample.xlsx`、`sample.pptx` 使用“复制链接”后，得到的链接能插入笔记并正常解析。
- [ ] 对这些文档使用“在笔记中查找”时，能定位到包含对应链接的笔记。
- [ ] 对这些文档使用“打开原文件”时，会交给系统默认程序打开。

### 8. 回归结束前的最终检查

- [ ] 所有视图切换后仍然稳定，没有明显卡死或报错 Notice。
- [ ] 重复检测、未引用视图、隔离管理三条主流程都至少完整走通一次。
- [ ] 如果发现问题，已经记录复现步骤、测试文件、实际结果和预期结果。

## 结果记录模板

### 通过

- 环境:
- Vault:
- 插件版本 / 提交:
- 结论:

### 不通过

- 环境:
- Vault:
- 插件版本 / 提交:
- 失败步骤:
- 实际结果:
- 预期结果:
- 附件/截图:
