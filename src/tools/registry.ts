export type CategoryId =
  | 'pdf'
  | 'image'
  | 'media'
  | 'text'
  | 'encode'
  | 'dev'
  | 'convert'
  | 'life';

export interface Category {
  id: CategoryId;
  name: string;
  desc: string;
  color: string;
  icon: string;
}

export interface ToolMeta {
  id: string;
  slug: string;
  name: string;
  desc: string;
  category: CategoryId;
  keywords: string[];
  /** 图标名，取自 components/Icon.tsx */
  icon: string;
  /** 运行时依赖说明：纯前端 / 需要下载模型 / 需要联网 */
  badge?: '本地' | '需下载模型' | '较重';
  hot?: boolean;
}

export const categories: Category[] = [
  { id: 'pdf', name: 'PDF 工具', desc: '合并、拆分、压缩、转换、加密', color: 'rose', icon: 'file-text' },
  { id: 'image', name: '图片工具', desc: '格式转换、压缩、缩放、加水印', color: 'amber', icon: 'image' },
  { id: 'media', name: '音视频', desc: '格式转换、提取音轨、GIF', color: 'violet', icon: 'film' },
  { id: 'text', name: '文本处理', desc: 'JSON、正则、文本清洗、Markdown', color: 'emerald', icon: 'type' },
  { id: 'encode', name: '编码加密', desc: 'Base64、URL、哈希、JWT', color: 'sky', icon: 'lock' },
  { id: 'dev', name: '开发辅助', desc: '二维码、时间戳、颜色、UUID', color: 'indigo', icon: 'code' },
  { id: 'convert', name: '格式转换', desc: '文档、编码、单位换算', color: 'teal', icon: 'repeat' },
  { id: 'life', name: '生活计算', desc: '单位、日期、BMI、贷款', color: 'orange', icon: 'calculator' },
];

export const tools: ToolMeta[] = [
  // ---------- PDF ----------
  {
    id: 'pdf-merge', slug: 'pdf-merge', icon: 'file-plus', name: 'PDF 合并', category: 'pdf', hot: true, badge: '本地',
    desc: '把多个 PDF 拖进来，按顺序合成一个文件，支持增删调整顺序。',
    keywords: ['pdf合并', '合并pdf', '多个pdf合成一个', 'merge pdf'],
  },
  {
    id: 'pdf-split', slug: 'pdf-split', icon: 'scissors', name: 'PDF 拆分', category: 'pdf', hot: true, badge: '本地',
    desc: '按页码范围拆分，或每 N 页切一份，也可以把每一页单独导出。',
    keywords: ['pdf拆分', 'pdf分割', '提取pdf页面', 'split pdf'],
  },
  {
    id: 'pdf-compress', slug: 'pdf-compress', icon: 'gauge', name: 'PDF 压缩', category: 'pdf', hot: true, badge: '本地',
    desc: '重新压缩内嵌图片来减小体积，适合扫描件、图片型 PDF。',
    keywords: ['pdf压缩', 'pdf变小', '压缩pdf', 'compress pdf'],
  },
  {
    id: 'pdf-to-image', slug: 'pdf-to-image', icon: 'image', name: 'PDF 转图片', category: 'pdf', hot: true, badge: '本地',
    desc: '把 PDF 每一页导出成 PNG 或 JPG，可指定清晰度，支持打包下载。',
    keywords: ['pdf转图片', 'pdf转jpg', 'pdf转png', 'pdf to image'],
  },
  {
    id: 'image-to-pdf', slug: 'image-to-pdf', icon: 'file-output', name: '图片转 PDF', category: 'pdf', hot: true, badge: '本地',
    desc: '多张图片合成 PDF，可排序、设置页面尺寸与边距。',
    keywords: ['图片转pdf', 'jpg转pdf', '照片转pdf', 'image to pdf'],
  },
  {
    id: 'pdf-rotate', slug: 'pdf-rotate', icon: 'repeat', name: 'PDF 旋转页面', category: 'pdf', badge: '本地',
    desc: '修正扫描件方向，支持整份旋转或只转指定页。',
    keywords: ['pdf旋转', 'pdf横向', 'rotate pdf'],
  },
  {
    id: 'pdf-watermark', slug: 'pdf-watermark', icon: 'layers', name: 'PDF 加水印', category: 'pdf', badge: '本地',
    desc: '添加文字水印，可调字号、透明度、角度、颜色与平铺密度。',
    keywords: ['pdf水印', 'pdf加水印', 'watermark pdf'],
  },
  {
    id: 'pdf-page-number', slug: 'pdf-page-number', icon: 'hash', name: 'PDF 加页码', category: 'pdf', badge: '本地',
    desc: '批量给 PDF 底部加页码，支持起始页码与格式自定义。',
    keywords: ['pdf页码', 'pdf加页脚', 'pdf page number'],
  },
  {
    id: 'pdf-protect', slug: 'pdf-protect', icon: 'lock', name: 'PDF 加密 / 解密', category: 'pdf', badge: '本地',
    desc: '设置打开密码保护 PDF；或移除已知密码。',
    keywords: ['pdf加密', 'pdf密码', 'pdf解密', 'protect pdf'],
  },

  // ---------- 图片 ----------
  {
    id: 'image-convert', slug: 'image-convert', icon: 'repeat', name: '图片格式转换', category: 'image', hot: true, badge: '本地',
    desc: 'PNG / JPG / WebP / AVIF / BMP / ICO 互转，HEIC 也能直接转 JPG。',
    keywords: ['图片格式转换', 'heic转jpg', 'png转jpg', 'webp转换', 'image converter'],
  },
  {
    id: 'image-compress', slug: 'image-compress', icon: 'gauge', name: '图片压缩', category: 'image', hot: true, badge: '本地',
    desc: '按质量或目标体积压缩，批量处理，肉眼几乎看不出区别。',
    keywords: ['图片压缩', '照片压缩', 'png压缩', '图片压缩到500kb', '压缩到指定大小', 'compress image'],
  },
  {
    id: 'image-resize', slug: 'image-resize', icon: 'crop', name: '图片批量缩放', category: 'image', hot: true, badge: '本地',
    desc: '按像素、百分比或最长边批量缩放，支持保持比例。',
    keywords: ['图片缩放', '图片改尺寸', '批量改图', 'resize image'],
  },
  {
    id: 'image-watermark', slug: 'image-watermark', icon: 'layers', name: '图片加文字水印', category: 'image', badge: '本地',
    desc: '批量给图片打上文字水印，可调位置、字号、透明度与旋转角。',
    keywords: ['图片水印', '加水印', 'watermark image'],
  },
  {
    id: 'image-remove-bg', slug: 'image-remove-bg', icon: 'wand', name: '图片去底（纯色背景）', category: 'image', badge: '本地',
    desc: '把白底、纯色底的证件照或商品图变成透明 PNG，可调容差。',
    keywords: ['图片去底', '白底转透明', '抠图', 'remove background'],
  },
  {
    id: 'image-collage', slug: 'image-collage', icon: 'images', name: '图片拼接 / 长图', category: 'image', badge: '本地',
    desc: '多张图横向或纵向拼成一张长图，自动对齐宽度。',
    keywords: ['图片拼接', '长图拼接', '拼图', 'collage'],
  },
  {
    id: 'image-base64', slug: 'image-base64', icon: 'code', name: '图片转 Base64', category: 'image', badge: '本地',
    desc: '把图片转成 Base64 / Data URI 字符串，方便贴进代码或 CSS。',
    keywords: ['图片base64', 'data uri', 'image to base64'],
  },

  // ---------- 音视频 ----------
  {
    id: 'media-convert', slug: 'media-convert', icon: 'film', name: '音视频格式转换', category: 'media', badge: '较重',
    desc: '视频转格式、提取音轨、音频互转。基于 ffmpeg.wasm，首次需加载约 30MB 引擎。',
    keywords: ['视频转换', 'mp4转webm', '提取音频', '音频转换', 'ffmpeg'],
  },
  {
    id: 'video-to-gif', slug: 'video-to-gif', icon: 'film', name: '视频转 GIF', category: 'media', badge: '较重',
    desc: '截取视频片段生成 GIF，可调帧率、宽度与起止时间。',
    keywords: ['视频转gif', 'gif制作', 'video to gif'],
  },
  {
    id: 'video-trim', slug: 'video-trim', icon: 'scissors', name: '视频截取', category: 'media', badge: '较重',
    desc: '按时间点裁剪视频片段，适合快速去掉片头片尾。',
    keywords: ['视频裁剪', '视频截取', 'trim video'],
  },

  // ---------- OCR ----------
  {
    id: 'ocr', slug: 'ocr', icon: 'scan', name: '图片文字识别 OCR', category: 'image', hot: true, badge: '需下载模型',
    desc: '识别图片里的中英文文字，首次使用需下载约 15MB 语言模型。',
    keywords: ['ocr', '图片转文字', '文字识别', '提取图片文字'],
  },

  // ---------- 文本 ----------
  {
    id: 'json-format', slug: 'json-format', icon: 'code', name: 'JSON 格式化 / 校验', category: 'text', hot: true, badge: '本地',
    desc: '美化、压缩、校验 JSON，可转成 CSV / YAML / XML，支持转义字符串。',
    keywords: ['json格式化', 'json校验', 'json美化', 'json转csv'],
  },
  {
    id: 'text-clean', slug: 'text-clean', icon: 'type', name: '文本清洗', category: 'text', badge: '本地',
    desc: '去空行、去首尾空格、去重行、排序、加行号、统计字数。',
    keywords: ['文本去重', '去空行', '文本处理', 'text tools'],
  },
  {
    id: 'regex-test', slug: 'regex-test', icon: 'terminal', name: '正则测试', category: 'text', badge: '本地',
    desc: '实时高亮匹配结果，支持分组、替换与常用正则速查。',
    keywords: ['正则测试', 'regex', '正则表达式'],
  },
  {
    id: 'markdown-preview', slug: 'markdown-preview', icon: 'file-text', name: 'Markdown 预览', category: 'text', badge: '本地',
    desc: '边写边看渲染效果，支持导出 HTML。',
    keywords: ['markdown预览', 'md转html', 'markdown编辑器'],
  },
  {
    id: 'case-convert', slug: 'case-convert', icon: 'type', name: '命名风格转换', category: 'text', badge: '本地',
    desc: '驼峰、下划线、短横线、常量、标题大小写互相转换，写代码时很常用。',
    keywords: ['驼峰转换', '命名转换', 'camelCase', 'snake_case'],
  },

  // ---------- 编码加密 ----------
  {
    id: 'base64', slug: 'base64', icon: 'code', name: 'Base64 编解码', category: 'encode', hot: true, badge: '本地',
    desc: '文本 / 文件与 Base64 互转，支持 Data URI 与自动识别。',
    keywords: ['base64编码', 'base64解码', 'base64转换'],
  },
  {
    id: 'url-codec', slug: 'url-codec', icon: 'repeat', name: 'URL 编解码', category: 'encode', badge: '本地',
    desc: 'URL 编码与解码，逐段解析查询参数表格。',
    keywords: ['url编码', 'url解码', 'urlencode'],
  },
  {
    id: 'hash', slug: 'hash', icon: 'fingerprint', name: '哈希计算', category: 'encode', badge: '本地',
    desc: 'MD5 / SHA-1 / SHA-256 / SHA-512，计算文本或文件摘要。',
    keywords: ['md5', 'sha256', '哈希计算', '文件校验'],
  },
  {
    id: 'jwt', slug: 'jwt', icon: 'key', name: 'JWT 解析', category: 'encode', badge: '本地',
    desc: '解开 Token 的 Header 与 Payload，查看过期时间与字段。',
    keywords: ['jwt解析', 'token解析', 'jwt decode'],
  },

  // ---------- 开发辅助 ----------
  {
    id: 'qrcode', slug: 'qrcode', icon: 'qr', name: '二维码生成', category: 'dev', hot: true, badge: '本地',
    desc: '生成网址、文本、WiFi、名片二维码，可调尺寸与容错级别，导出 PNG。',
    keywords: ['二维码生成', 'qrcode', 'wifi二维码'],
  },
  {
    id: 'barcode-decode', slug: 'barcode-decode', icon: 'scan', name: '二维码识别', category: 'dev', badge: '本地',
    desc: '上传带二维码的图片，直接解出里面的内容。',
    keywords: ['二维码识别', '扫码', 'qrcode decode'],
  },
  {
    id: 'timestamp', slug: 'timestamp', icon: 'clock', name: '时间戳转换', category: 'dev', hot: true, badge: '本地',
    desc: 'Unix 时间戳与日期互转，支持毫秒、秒与本地时区。',
    keywords: ['时间戳转换', 'unix时间戳', 'timestamp'],
  },
  {
    id: 'color', slug: 'color', icon: 'palette', name: '颜色工具', category: 'dev', badge: '本地',
    desc: 'HEX / RGB / HSL 互转，屏幕取色，生成明暗色阶与对比度检查。',
    keywords: ['颜色转换', 'hex转rgb', '取色器', 'color picker'],
  },
  {
    id: 'uuid', slug: 'uuid', icon: 'fingerprint', name: 'UUID 生成', category: 'dev', badge: '本地',
    desc: '批量生成 UUID v4 / v7 与短 ID，可去掉中划线或转大写。',
    keywords: ['uuid生成', 'guid', '随机id'],
  },
  {
    id: 'cron', slug: 'cron', icon: 'clock', name: 'Cron 表达式解析', category: 'dev', badge: '本地',
    desc: '把 cron 表达式翻译成人话，并列出接下来几次执行时间。',
    keywords: ['cron表达式', '定时任务', 'crontab'],
  },

  // ---------- 格式转换（文档） ----------
  {
    id: 'doc-to-pdf', slug: 'doc-to-pdf', icon: 'file-output', name: 'Word 转 PDF', category: 'convert', badge: '本地',
    desc: '读取 .docx 文字内容并排版生成 PDF。纯浏览器实现，复杂版式会简化。',
    keywords: ['word转pdf', 'docx转pdf', 'doc转pdf'],
  },
  {
    id: 'pdf-to-text', slug: 'pdf-to-text', icon: 'file-text', name: 'PDF 转文本', category: 'convert', badge: '本地',
    desc: '提取 PDF 中的文字，支持按页输出并导出 TXT。',
    keywords: ['pdf转txt', 'pdf提取文字', 'pdf to text'],
  },

  // ---------- 生活计算 ----------
  {
    id: 'unit-convert', slug: 'unit-convert', icon: 'repeat', name: '单位换算', category: 'life', hot: true, badge: '本地',
    desc: '长度、重量、面积、体积、温度、速度、存储等常用单位换算。',
    keywords: ['单位换算', '长度换算', '斤和公斤', 'unit converter'],
  },
  {
    id: 'date-calc', slug: 'date-calc', icon: 'calendar', name: '日期计算', category: 'life', badge: '本地',
    desc: '两个日期相差多少天，或从某天起加减天数、工作日。',
    keywords: ['日期计算', '相差天数', '日期加减'],
  },
  {
    id: 'finance', slug: 'finance', icon: 'wallet', name: '贷款 / 利息计算', category: 'life', badge: '本地',
    desc: '等额本息与等额本金对比，算月供、总利息与还款计划。',
    keywords: ['房贷计算', '贷款计算器', '利息计算'],
  },
  {
    id: 'bmi', slug: 'bmi', icon: 'activity', name: 'BMI / 热量估算', category: 'life', badge: '本地',
    desc: '输入身高体重算 BMI 与基础代谢，给出区间参考。',
    keywords: ['bmi计算', '基础代谢', '热量计算'],
  },
];

export function toolBySlug(slug: string): ToolMeta | undefined {
  return tools.find((t) => t.slug === slug);
}

export function toolsByCategory(id: CategoryId): ToolMeta[] {
  return tools.filter((t) => t.category === id);
}

export function searchTools(q: string): ToolMeta[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return tools.filter(
    (t) =>
      t.name.toLowerCase().includes(s) ||
      t.desc.toLowerCase().includes(s) ||
      t.keywords.some((k) => k.toLowerCase().includes(s)),
  );
}
