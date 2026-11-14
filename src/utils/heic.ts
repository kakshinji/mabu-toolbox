/**
 * HEIC/HEIF 解码。
 * 使用浏览器版 libheif（自包含 wasm），从站点静态资源按需加载，避免打包 Node 依赖。
 */
let heifPromise: Promise<any> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('HEIC 解码模块加载失败'));
    document.head.appendChild(s);
  });
}

async function getHeif(): Promise<any> {
  if (heifPromise) return heifPromise;
  heifPromise = (async () => {
    const globalAny = window as any;
    if (globalAny.libheif) return globalAny.libheif;

    // 优先使用本地静态资源（public/vendor），离线也能用
    const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
    const local = `${base}vendor/libheif-bundle.mjs`;
    try {
      const mod: any = await import(/* @vite-ignore */ local);
      const lib = mod.default ?? mod;
      if (lib?.HeifDecoder) {
        globalAny.libheif = lib;
        return lib;
      }
    } catch {
      /* 回退到 CDN */
    }
    await loadScript('https://cdn.jsdelivr.net/npm/libheif-js@1.23.5/libheif-wasm/libheif.js');
    if (!globalAny.libheif) throw new Error('无法加载 HEIC 解码模块');
    return globalAny.libheif;
  })();
  return heifPromise;
}

export async function decodeHeic(file: File): Promise<ImageBitmap> {
  const libheif = await getHeif();
  const decoder = new libheif.HeifDecoder();
  const data = new Uint8Array(await file.arrayBuffer());
  const images = decoder.decode(data);
  if (!images || !images.length) throw new Error('无法解析 HEIC 文件，可能是不支持的编码');
  const image = images[0] as {
    get_width(): number;
    get_height(): number;
    display(data: ImageData, cb: (d: ImageData | null) => void): void;
  };
  const width = image.get_width();
  const height = image.get_height();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器不支持 Canvas');
  const imageData = ctx.createImageData(width, height);
  await new Promise<void>((resolve, reject) => {
    image.display(imageData, (displayData: ImageData | null) => {
      if (!displayData) return reject(new Error('HEIC 渲染失败'));
      ctx.putImageData(displayData, 0, 0);
      resolve();
    });
  });
  return createImageBitmap(canvas);
}

export function isHeic(file: File): boolean {
  return /\.(heic|heif)$/i.test(file.name) || /heic|heif/i.test(file.type);
}
