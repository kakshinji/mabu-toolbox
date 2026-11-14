# GitHub 电脑小工具 / 文件转换项目清单

> 整理时间：2026-11-14。星数、语言、许可证均来自 GitHub API 实时查询（个别项目因 API 限流未取到，会标注「未核实」）。
> 选型原则：优先「本地/离线处理」和「免安装或单文件」，其次再看功能多少。

## 一、一览表

| 项目 | Stars | 语言 | 许可证 | 定位 |
|---|---:|---|---|---|
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | 207.7k | Python | Unlicense | 命令行音视频下载（其实是全格式转换的底座） |
| [microsoft/PowerToys](https://github.com/microsoft/PowerToys) | 141.0k | C | MIT | Windows 官方效率工具箱（30+ 小工具） |
| [localsend](https://github.com/localsend/localsend) | 98.9k | Dart | Apache-2.0 | 局域网跨设备传文件（AirDrop 替代） |
| [Stirling-PDF](https://github.com/Stirling-Tools/Stirling-PDF) | 96.5k | TypeScript/Java | 自定义（类 GPL） | 自托管 PDF 全能工作站 |
| [drawio-desktop](https://github.com/jgraph/drawio-desktop) | 64.0k | JavaScript | GPL-3.0 | 离线画流程图/架构图 |
| [Umi-OCR](https://github.com/hiroi-sora/Umi-OCR) | 48.7k | Python | MIT | 离线 OCR，截图/批量/PDF |
| [lossless-cut](https://github.com/mifi/lossless-cut) | 46.0k | TypeScript | GPL-2.0 | 视频无损剪辑（不重编码） |
| [ShareX](https://github.com/ShareX/ShareX) | 41.0k | C# | GPL-3.0 | 截图/录屏/上传/OCR 瑞士军刀 |
| [OCRmyPDF](https://github.com/ocrmypdf/OCRmyPDF) | 35.3k | Python | MPL-2.0 | 给扫描版 PDF 加可搜索文字层 |
| [Filee](https://github.com/KnifeLemon/Filee) | 26.9k | C# | MIT | 桌面离线转换 263 种格式（含 HWP） |
| [HandBrake](https://github.com/HandBrake/HandBrake) | 25.0k | C | GPL-2.0 | 视频转码压制 |
| [ConvertX](https://github.com/C4illin/ConvertX) | 19.7k | TypeScript | AGPL-3.0 | 自托管在线转换，1000+ 格式 |
| [ImageMagick](https://github.com/ImageMagick/ImageMagick) | 17.9k | C | ImageMagick License | 命令行图像处理/转换 |
| [VERT](https://github.com/VERT-sh/VERT) | 16.3k | TypeScript | AGPL-3.0 | 浏览器内 WASM 转换，250+ 格式 |
| [Flow.Launcher](https://github.com/Flow-Launcher/Flow.Launcher) | 16.0k | C# | MIT | Windows 启动器 + 插件生态 |
| [CopyQ](https://github.com/hluk/CopyQ) | 12.6k | C++ | GPL-3.0 | 剪贴板管理 |
| [pdfarranger](https://github.com/pdfarranger/pdfarranger) | 6.1k | Python | GPL-3.0 | 图形化合并/拆分/重排 PDF 页 |
| [ToolKnit Desktop](https://github.com/ZihangDong/toolknit-desktop) | 2.2k | JS/Tauri | 自定义 | Windows 本地工具箱，60+ 小工具 |
| [JamTools](https://github.com/fandesfyf/JamTools) | 0.74k | Python | 自定义 | 截屏/录屏/OCR/翻译/格式转换全家桶 |

---

## 二、文件转换：三种形态，按使用场景选

### 1. 想「装一个客户端，什么都能转」→ Filee

- 仓库：https://github.com/KnifeLemon/Filee
- 263 种格式，拖拽即转：图片、PDF、Word/Excel/PPT、视频、音频、电子书、压缩包，**连韩文 HWP/HWPX 都支持**。
- 完全离线、不需要装 Office；MIT 协议；Windows / macOS / Linux（.NET 8 + Avalonia）。
- 适合：办公室电脑上替掉「在线转换网站」这一整类需求。

### 2. 想「一台机器当私人转换服务器，全家/团队共用」→ ConvertX

- 仓库：https://github.com/C4illin/ConvertX
- Docker 一键起，浏览器上传即转；底层调 FFmpeg、Pandoc、ImageMagick、LibreOffice、Calibre 等，官方称 1000+ 格式。
- 带账号体系、转换历史、批量上传；支持 NAS（群晖/TrueNAS）自托管。
- 注意：AGPL-3.0，商用二次分发要开源；Word→PDF 这类依赖容器内 LibreOffice。
- 中文友好的同步分支：[ConvertX-CN](https://github.com/pi-docket/ConvertX-CN)（对齐上游 v0.19.0，Lite/Standard/Full 镜像可选）。

### 3. 想「什么都不装，浏览器里转完就走」→ VERT

- 仓库：https://github.com/VERT-sh/VERT（原 LaciG/VERT，已迁移到组织 [VERT-sh](https://github.com/VERT-sh)）
- 用 WebAssembly 在本地跑转换，250+ 格式，文件不上传（视频走官方实例时会走服务端，可自建 daemon 保持全本地）。
- 适合：临时在别人电脑上转个文件，或不想装软件。

### 4. 同类备选

- [transmute](https://github.com/transmute-app/transmute)：自托管，3000+ 种转换 + 压缩，Python/FastAPI，MIT。
- [HRConvert2](https://github.com/zelon88/HRConvert2)：老牌 PHP 自托管方案，490+ 格式、26 种语言。
- [飞鼠格式](https://github.com/LaoFeng-mouse/flyingmouse-format)：Windows 端 Electron 工具，内置 FFmpeg/LibreOffice/Poppler/Tesseract，图片/文档/PDF/音视频 + OCR，中文界面，适合国内 WPS 用户（许可证非标准开源，仅限个人免费）。

---

## 三、按功能分类的「小工具」

### PDF 专项

| 项目 | 说明 |
|---|---|
| [Stirling-PDF](https://github.com/Stirling-Tools/Stirling-PDF) | 合并/拆分/旋转/加密/压缩/PDF↔Word/PPT/图片/OCR/水印/签名，Docker 起一个网页版「PDF 哆啦A梦」。缺点是 Java + 镜像比较大。 |
| [pdfarranger](https://github.com/pdfarranger/pdfarranger) | 轻量 GTK 小工具，拖页面重排、合并拆分裁剪旋转，比网页工具顺手。 |
| [OCRmyPDF](https://github.com/ocrmypdf/OCRmyPDF) | 给扫描 PDF 加 OCR 文字层，生成可搜索的双层 PDF，命令行可批量。 |

### 图片

| 项目 | 说明 |
|---|---|
| [ImageMagick](https://github.com/ImageMagick/ImageMagick) | 命令行批量转格式/缩放/加水印的事实标准，`magick *.png -resize 50% out.jpg`。 |
| [Filee](https://github.com/KnifeLemon/Filee) | 不想写命令就用它，图形界面批量转。 |
| Windows PowerToys 的 Image Resizer | 右键「调整图片大小」，批量缩放最省事。 |

### 音视频

| 项目 | 说明 |
|---|---|
| [LosslessCut](https://github.com/mifi/lossless-cut) | 基于 FFmpeg 的无损切割/合并，几乎秒切、不掉画质，处理无人机/录屏大文件首选。 |
| [HandBrake](https://github.com/HandBrake/HandBrake) | 压制转码，预设丰富（手机、4K、网络分享）。 |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | 下载 + 抽音频 + 转封装，`-x --audio-format mp3` 一行搞定。 |
| [JamTools](https://github.com/fandesfyf/JamTools) | 带 GUI 的多媒体格式转换 + 录屏 + OCR + 翻译，一个软件凑齐。 |

### 文件管理 / 系统效率

| 项目 | 说明 |
|---|---|
| [PowerToys](https://github.com/microsoft/PowerToys) | FancyZones 窗口布局、PowerRename 批量重命名、Quick Accent、Text Extractor、Command Palette、鼠标增强等 30+ 项。`winget install Microsoft.PowerToys` |
| [Files](https://github.com/files-community/Files) | 现代风格文件管理器，多标签、双栏、云盘集成，替代 Explorer。 |
| [Flow.Launcher](https://github.com/Flow-Launcher/Flow.Launcher) | 空格键呼出的启动器，插件市场里有计算器、翻译、剪贴板、文件搜索。 |
| [CopyQ](https://github.com/hluk/CopyQ) | 剪贴板历史 + 脚本化处理，可存图片、置顶片段。 |
| [LocalSend](https://github.com/localsend/localsend) | 手机↔电脑局域网互传，免登录免流量，全平台。 |
| [drawio-desktop](https://github.com/jgraph/drawio-desktop) | 离线 draw.io，画流程图/架构图导出 PNG/SVG/PDF。 |

### OCR / 截图

| 项目 | 说明 |
|---|---|
| [Umi-OCR](https://github.com/hiroi-sora/Umi-OCR) | 离线 OCR 天花板之一：截图识别、批量图片、PDF 扫描、二维码，自带多国语言库，解压即用。 |
| [ShareX](https://github.com/ShareX/ShareX) | 截图/录屏/GIF/OCR/上传一条流水线，快捷键可自定义工作流。 |

### 一站式小工具盒子

| 项目 | 说明 |
|---|---|
| [ToolKnit Desktop](https://github.com/ZihangDong/toolknit-desktop) | Tauri 2 + Rust，安装包 40MB 左右，60 项工具分 12 类：PDF 9 项、图片 6 项、音视频、Whisper 离线转写、JSON 格式化、C 盘清理等，全部本地处理。 |
| [JamTools](https://github.com/fandesfyf/JamTools) | Python/PyQt5，截屏录屏、OCR、多语言翻译、格式转换、键鼠录制、局域网传输。 |

---

## 四、给 Windows 用户的「最小可用组合」

如果只想装 4 个软件覆盖 90% 的日常需求：

1. **PowerToys** —— 批量重命名、窗口布局、取色、图片缩放、文本提取。
2. **Filee** —— 所有格式转换（图片/文档/PDF/音视频/电子书）。
3. **Umi-OCR** —— 截图识字、扫描件转文字。
4. **LosslessCut** —— 视频剪切不重新编码。

再加一个 **LocalSend** 解决手机传电脑，基本就不需要再打开各种在线转换网站了。

## 五、自建党的组合

- 一台 NAS / 小主机跑 **ConvertX**（转格式）+ **Stirling-PDF**（PDF 全套）+ **OCRmyPDF**（扫描件可搜索），全家浏览器访问，文件不出内网。
- 远程/公网访问时务必加反向代理和鉴权，这两个项目默认定位是内网工具。

---

## 备注

- 「在线转换网站」最大的问题是文件上传和广告，上面这些项目基本都能做到本地处理。
- 许可证提醒：MIT/Apache 类可自由商用；GPL 类二次分发需开源；AGPL 类（ConvertX、VERT）做 SaaS 需开源服务端代码；Stirling-PDF 与 JamTools、ToolKnit 为自定义协议，商用前先读 LICENSE。
