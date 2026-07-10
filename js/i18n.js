/** Simple i18n — en + zh-Hant, fallback to en */
let messages = {};
let messagesEn = {};
let locale = 'en';

const LOCALE_KEY = 'pl-locale';

function getLocale() {
  return locale;
}

function getStoredLocale() {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === 'zh' || stored === 'en') return stored;
  } catch (_) {}
  const hash = location.hash.match(/[?&]lang=(\w+)/);
  if (hash && hash[1] === 'zh') return 'zh';
  return 'en';
}

function deepMerge(base, override) {
  if (!override) return base;
  const out = { ...base };
  for (const key of Object.keys(override)) {
    const b = base[key];
    const o = override[key];
    if (o && typeof o === 'object' && !Array.isArray(o) && b && typeof b === 'object' && !Array.isArray(b)) {
      out[key] = deepMerge(b, o);
    } else {
      out[key] = o;
    }
  }
  return out;
}

async function loadI18n() {
  locale = getStoredLocale();
  const base = window.SITE_BASE || './';
  try {
    const enRes = await fetch(base + 'messages/en.json');
    if (!enRes.ok) throw new Error('en load failed');
    messagesEn = await enRes.json();

    if (locale === 'zh') {
      const zhRes = await fetch(base + 'messages/zh.json');
      if (zhRes.ok) {
        const zh = await zhRes.json();
        messages = deepMerge(messagesEn, zh);
      } else {
        messages = messagesEn;
      }
    } else {
      messages = messagesEn;
    }

    document.documentElement.lang = locale === 'zh' ? 'zh-Hant' : 'en';
    applyI18n();
    injectLangSwitcher();
  } catch (e) {
    console.warn('i18n load failed', e);
    messages = messagesEn || {
      tagline: 'Build better prompts, faster.',
      nav: { discover: 'Discover', search: 'Search', colors: 'Colors' },
      colors: { title: 'Color psychology' },
      prompt: { copy: 'Copy prompt', copied: 'Copied!' },
      lang: { switchToZh: '中文', switchToEn: 'EN' }
    };
  }
}

function setLocale(next) {
  if (next !== 'en' && next !== 'zh') return;
  try {
    localStorage.setItem(LOCALE_KEY, next);
  } catch (_) {}
  location.reload();
}

function injectLangSwitcher() {
  const nav = document.querySelector('.nav-links');
  if (!nav) return;
  let wrap = nav.querySelector('.lang-switch-wrap');
  if (!wrap) {
    wrap = document.createElement('span');
    wrap.className = 'lang-switch-wrap';
    nav.appendChild(wrap);
  }
  const label = locale === 'zh' ? t('lang.switchToEn') : t('lang.switchToZh');
  wrap.innerHTML = `<button type="button" class="lang-switch" aria-label="${t('lang.label') || 'Language'}">${label}</button>`;
  wrap.querySelector('.lang-switch').addEventListener('click', () => {
    setLocale(locale === 'zh' ? 'en' : 'zh');
  });
}

function t(key) {
  const parts = key.split('.');
  let val = messages;
  for (const p of parts) {
    val = val?.[p];
  }
  if (val === undefined && messagesEn !== messages) {
    let fallback = messagesEn;
    for (const p of parts) {
      fallback = fallback?.[p];
    }
    return fallback ?? key;
  }
  return val ?? key;
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = t(key);
    if (text) el.textContent = text;
  });
}

function getColorPsychology(catalog) {
  if (!catalog) return {};
  if (locale === 'zh' && catalog.colorPsychologyZh) {
    return catalog.colorPsychologyZh;
  }
  return catalog.colorPsychology || {};
}

window.getLocale = getLocale;
window.setLocale = setLocale;
window.getColorPsychology = getColorPsychology;
