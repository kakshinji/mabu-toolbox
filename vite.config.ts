import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  build: {
    // 注意：这里刻意使用 esnext + 关闭 esbuild 压缩。
    // 在部分 Windows 环境下 esbuild 的临时文件删除会被拦截，跳过 esbuild 转译可保证构建成功，
    // 产物按现代浏览器输出（站点本身依赖 WebAssembly 与 ES2022，无需兼容旧浏览器）。
    target: 'esnext',
    minify: false,
    chunkSizeWarningLimit: 4000,
  },
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  preview: {
    port: 4173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
});
