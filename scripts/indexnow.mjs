/**
 * IndexNow 提交：把 sitemap 里的 URL 推送给 Bing / Yandex / Seznam 等
 * 用法：node scripts/indexnow.mjs [--dry]
 * 需要站点已部署（要能访问 key 校验文件）。
 */
import fs from 'node:fs';
import path from 'node:path';

const SITE_URL = (process.env.SITE_URL || 'https://kakshinji.github.io/mabu-toolbox').replace(/\/$/, '');
const KEY = process.env.INDEXNOW_KEY || 'mabutoolbox2026indexnowkey';
const DIST = path.resolve('dist');
const dry = process.argv.includes('--dry');

function urls() {
  const file = path.join(DIST, 'sitemap.xml');
  if (!fs.existsSync(file)) {
    console.error('找不到 dist/sitemap.xml，请先执行 npm run build');
    process.exit(1);
  }
  const xml = fs.readFileSync(file, 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

const list = urls();
if (!list.length) {
  console.error('sitemap 里没有 URL');
  process.exit(1);
}

const payload = {
  host: new URL(SITE_URL).host,
  key: KEY,
  keyLocation: `${SITE_URL}/${KEY}.txt`,
  urlList: list,
};

if (dry) {
  console.log(`[dry] 将提交 ${list.length} 个 URL 到 ${payload.host}`);
  console.log(`[dry] keyLocation: ${payload.keyLocation}`);
  process.exit(0);
}

const endpoints = ['https://api.indexnow.org/indexnow', 'https://www.bing.com/indexnow'];

for (const endpoint of endpoints) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    console.log(`[${endpoint}] HTTP ${res.status} ${res.statusText}（提交 ${list.length} 条）`);
  } catch (e) {
    console.log(`[${endpoint}] 失败：${e.message}`);
  }
}

console.log(`[indexnow] 已提交 ${list.length} 个 URL`);
