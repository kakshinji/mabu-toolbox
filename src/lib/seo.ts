/**
 * 运行时 SEO：路由切换时更新 title / description / canonical / OG。
 * 爬虫看到的是构建期预渲染的静态 HTML（scripts/prerender.mjs），
 * 这里负责用户站内跳转后的头部信息同步。
 */
import { useEffect } from 'react';
import { BASE } from './router';

export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) || '';
export const SITE_NAME = '抹布工具箱';

export interface SeoInput {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function useSeo({ title, description, path, keywords, jsonLd, noindex }: SeoInput) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`;
    document.title = fullTitle;

    const url = `${SITE_URL}${BASE}${path === '/' ? '/' : `${path}/`}`.replace(/([^:])\/{2,}/g, '$1/');
    setMeta('meta[name="description"]', 'name', 'description', description);
    if (keywords?.length) setMeta('meta[name="keywords"]', 'name', 'keywords', keywords.join(','));
    setMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large');
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', url);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    const id = 'seo-jsonld';
    document.getElementById(id)?.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = id;
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, path, keywords, jsonLd, noindex]);
}
