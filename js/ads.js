/**
 * Google AdSense loader.
 * Reads site/config/adsense.json — enable after AdSense approval.
 */
let adsConfig = { enabled: false, publisherId: '', adSlots: {} };

async function loadAdsConfig() {
  try {
    const base = window.SITE_BASE || './';
    const res = await fetch(base + 'config/adsense.json');
    if (res.ok) adsConfig = await res.json();
  } catch (e) {
    console.warn('Ads config not loaded', e);
  }
}

function loadAdSenseScript(publisherId) {
  if (document.querySelector('script[data-adsense]')) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + publisherId;
  s.crossOrigin = 'anonymous';
  s.setAttribute('data-adsense', 'true');
  document.head.appendChild(s);
}

function renderAdUnit(slotKey) {
  if (!adsConfig.enabled || !adsConfig.publisherId || adsConfig.publisherId.includes('REPLACE')) {
    return `
      <aside class="ad-slot" aria-label="Advertisement">
        <span class="ad-label">${typeof t === 'function' ? t('ads.label') : 'Advertisement'}</span>
        <div class="ad-placeholder"><p class="ad-note">Ad space — enables free access for everyone</p></div>
      </aside>`;
  }

  const slot = adsConfig.adSlots[slotKey] || adsConfig.adSlots.footer;
  if (!slot || String(slot.slot).includes('REPLACE')) {
    return `
      <aside class="ad-slot" aria-label="Advertisement">
        <span class="ad-label">Advertisement</span>
        <div class="ad-placeholder"><p class="ad-note">Add ad slot ID in config/adsense.json</p></div>
      </aside>`;
  }

  return `
    <aside class="ad-slot" aria-label="Advertisement">
      <span class="ad-label">${typeof t === 'function' ? t('ads.label') : 'Advertisement'}</span>
      <ins class="adsbygoogle"
        style="display:block"
        data-ad-client="${adsConfig.publisherId}"
        data-ad-slot="${slot.slot}"
        data-ad-format="${slot.format || 'auto'}"
        data-full-width-responsive="${slot.fullWidthResponsive !== false ? 'true' : 'false'}"></ins>
    </aside>`;
}

function pushAds() {
  if (!adsConfig.enabled) return;
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {
    console.warn('AdSense push failed', e);
  }
}

async function initAds() {
  await loadAdsConfig();
  if (adsConfig.enabled && adsConfig.publisherId && !adsConfig.publisherId.includes('REPLACE')) {
    loadAdSenseScript(adsConfig.publisherId);
  }
}

window.renderAdUnit = renderAdUnit;
window.pushAds = pushAds;
window.initAds = initAds;
