import Tesseract from 'tesseract.js';

export type OcrLang = 'chi_sim' | 'eng' | 'chi_sim+eng';

let workerPromise: Promise<Tesseract.Worker> | null = null;
let currentLang = '';

const CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist';
const CORE_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.0';

/**
 * OCR 识别。
 *
 * 说明：
 * - worker 与 wasm 核心从 jsDelivr 加载；
 * - 语言模型不显式指定 langPath：tesseract.js v5 内部默认就走
 *   `https://cdn.jsdelivr.net/npm/@tesseract.js-data/<lang>/4.0.0_best_int`，
 *   这比旧的 tessdata.projectnaptha.com 稳定，且支持一次加载多种语言。
 * - 模型下载后由浏览器缓存，同一语言只需下载一次。
 */
export async function recognize(
  image: File | Blob | string,
  lang: OcrLang = 'chi_sim+eng',
  onProgress?: (p: number, status: string) => void,
): Promise<Tesseract.RecognizeResult> {
  if (!workerPromise || currentLang !== lang) {
    if (workerPromise) {
      const old = await workerPromise.catch(() => null);
      await old?.terminate().catch(() => undefined);
    }
    currentLang = lang;
    workerPromise = Tesseract.createWorker(lang, 1, {
      workerPath: `${CDN}/worker.min.js`,
      corePath: CORE_CDN,
      logger: (m) => {
        if (m.status === 'loading language traineddata') {
          onProgress?.(m.progress, `正在下载语言模型（${lang}）`);
        } else if (m.status === 'recognizing text') {
          onProgress?.(m.progress, '正在识别文字');
        }
      },
    });
  }
  const worker = await workerPromise;
  return worker.recognize(image as any);
}

export async function terminateOcr() {
  if (workerPromise) {
    const w = await workerPromise.catch(() => null);
    await w?.terminate().catch(() => undefined);
    workerPromise = null;
    currentLang = '';
  }
}
