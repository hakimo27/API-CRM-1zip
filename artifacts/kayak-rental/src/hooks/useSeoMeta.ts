import { useEffect } from 'react';

interface SeoMeta {
  title?: string | null;
  description?: string | null;
  image?: string | null;
  type?: 'website' | 'article' | 'product';
}

const SITE_NAME = 'Байдабаза';
const DEFAULT_TITLE = 'Байдабаза — Аренда байдарок и каноэ';
const DEFAULT_DESC = 'Аренда байдарок, каноэ и SUP-досок в Москве и Подмосковье. Более 100 единиц снаряжения. Доставка. Онлайн-бронирование.';

function setMeta(name: string, content: string, isProp = false) {
  const attr = isProp ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

export function useSeoMeta({ title, description, image, type = 'website' }: SeoMeta) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESC;

    document.title = fullTitle;
    setMeta('description', desc);

    setMeta('og:title', fullTitle, true);
    setMeta('og:description', desc, true);
    setMeta('og:type', type, true);
    setMeta('og:site_name', SITE_NAME, true);
    if (image) setMeta('og:image', image, true);

    setMeta('twitter:card', image ? 'summary_large_image' : 'summary');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', desc);
    if (image) setMeta('twitter:image', fullTitle);

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, description, image, type]);
}
