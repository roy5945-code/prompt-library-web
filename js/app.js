/** Main SPA router and views */
let catalog = { sections: [], prompts: [] };

const SECTION_ICONS = {
  'writing-content': '✍️',
  'marketing-social': '📣',
  'markets-niche': '🎯',
  'language-translation': '🌐',
  'business-career': '💼',
  'education-learning': '📚',
  'coding-development': '💻',
  'agentic-looping': '🤖',
  'photo-image': '📷',
  'graphic-design': '🎨',
  'color-brand': '🌈',
  'video-motion': '🎬',
  'website-ui': '🖥️',
};

async function loadCatalog() {
  const base = window.SITE_BASE || './';
  const res = await fetch(base + 'data/catalog.json');
  if (!res.ok) throw new Error('Failed to load catalog: ' + res.status);
  catalog = await res.json();
}

function getSection(id) {
  return catalog.sections.find(s => s.id === id);
}

function getPrompt(slug) {
  return catalog.prompts.find(p => p.slug === slug);
}

function getPromptsForSection(sectionId) {
  return catalog.prompts.filter(p => p.section === sectionId);
}

function getFeaturedPrompts() {
  return catalog.prompts.filter(p => p.featured);
}

function getRecommendedPrompts() {
  return catalog.prompts.filter(p => p.recommended);
}

function getMarketItem(type, id) {
  if (!id || !catalog.markets) return null;
  return (catalog.markets[type] || []).find(m => m.id === id);
}

function marketLabel(type, id) {
  const item = getMarketItem(type, id);
  return item ? item.label : id;
}

function marketPath(industry = '', product = '', niche = '') {
  const parts = ['markets'];
  if (industry) parts.push(industry);
  if (product) parts.push(product);
  if (niche) parts.push(niche);
  return '#/' + parts.join('/');
}

function filterByMarkets(industry, product, niche) {
  if (!industry && !product && !niche) {
    return catalog.prompts.filter(p => p.section === 'markets-niche');
  }
  return catalog.prompts.filter(p => {
    const m = p.markets || {};
    if (industry && !(m.industries || []).includes(industry)) return false;
    if (product && !(m.products || []).includes(product)) return false;
    if (niche && !(m.niches || []).includes(niche)) return false;
    return true;
  }).sort((a, b) => {
    const score = (p) => {
      let s = p.section === 'markets-niche' ? 10 : 0;
      const m = p.markets || {};
      if (industry && (m.industries || []).includes(industry)) s += 1;
      if (product && (m.products || []).includes(product)) s += 1;
      if (niche && (m.niches || []).includes(niche)) s += 1;
      return s;
    };
    return score(b) - score(a);
  });
}

function renderMarketChips(type, selectedIndustry, selectedProduct, selectedNiche) {
  const items = catalog.markets?.[type] || [];
  const labelKey = type === 'industries' ? 'industry' : type === 'products' ? 'product' : 'niche';
  const dim = type === 'industries' ? 'i' : type === 'products' ? 'p' : 'n';

  let allHref = marketPath(
    dim === 'i' ? '' : selectedIndustry,
    dim === 'p' ? '' : selectedProduct,
    dim === 'n' ? '' : selectedNiche
  );

  const chips = items.map(item => {
    let href;
    if (dim === 'i') href = marketPath(item.id, selectedProduct, selectedNiche);
    else if (dim === 'p') href = marketPath(selectedIndustry, item.id, selectedNiche);
    else href = marketPath(selectedIndustry, selectedProduct, item.id);

    const isActive =
      (dim === 'i' && selectedIndustry === item.id) ||
      (dim === 'p' && selectedProduct === item.id) ||
      (dim === 'n' && selectedNiche === item.id);

    return `<a href="${href}" class="market-chip${isActive ? ' market-chip-active' : ''}" title="${escapeHtml(item.description || '')}">${item.label}</a>`;
  }).join('');

  return `
    <div class="market-filter-row">
      <span class="market-filter-label">${t('markets.' + labelKey)}</span>
      <div class="market-chips">
        <a href="${allHref}" class="market-chip${!(dim === 'i' ? selectedIndustry : dim === 'p' ? selectedProduct : selectedNiche) ? ' market-chip-active' : ''}">${t('markets.all')}</a>
        ${chips}
      </div>
    </div>
  `;
}

function renderMarketTags(p) {
  if (!p.markets) return '';
  const tags = [];
  const m = p.markets;
  (m.niches || []).slice(0, 2).forEach(id => {
    tags.push(`<a href="${marketPath('', '', id)}" class="tag tag-market">${marketLabel('niches', id)}</a>`);
  });
  if (!tags.length) {
    (m.industries || []).slice(0, 1).forEach(id => {
      tags.push(`<a href="${marketPath(id)}" class="tag tag-market">${marketLabel('industries', id)}</a>`);
    });
  }
  return tags.join('');
}

function renderPromptBadges(p, opts = {}) {
  let html = '';
  if (p.recommended && !opts.skipRecommended) html += ` <span class="tag tag-recommended">${t('prompt.recommended')}</span>`;
  if (p.featured) html += ` <span class="tag tag-featured">${t('featured.badge')}</span>`;
  return html;
}

function renderPromptLead(prompt) {
  const cls = prompt.recommended ? 'prompt-lead prompt-lead-recommended' : 'prompt-lead';
  const badge = prompt.recommended
    ? `<span class="prompt-lead-badge tag tag-recommended">${t('prompt.recommended')}</span>`
    : '';
  return `
    <div class="${cls}">
      ${badge}
      <p class="prompt-lead-text">${escapeHtml(prompt.description)}</p>
    </div>
  `;
}

function renderTipBox(prompt) {
  if (!prompt.tips) return '';
  const label = prompt.recommended ? t('prompt.recommended') : t('prompt.tips');
  const extra = prompt.recommended ? `<span class="tip-recommended-why">${t('prompt.recommendedWhy')}</span><br>` : '';
  const cls = prompt.recommended ? 'tip-box tip-recommended' : 'tip-box';
  return `<div class="${cls}"><strong>${label}</strong><br>${extra}${prompt.tips}</div>`;
}

function renderPromptCard(p, opts = {}) {
  const section = opts.showSection ? getSection(p.section) : null;
  return `
    <a href="#/prompt/${p.slug}" class="prompt-card${p.featured ? ' prompt-card-featured' : ''}${p.recommended ? ' prompt-card-recommended' : ''}">
      <h3>${p.title}${renderPromptBadges(p)}</h3>
      <p>${p.description}</p>
      <div class="tags">
        ${section ? `<span class="tag">${section.title}</span>` : ''}
        <span class="tag tag-difficulty-${p.difficulty}">${t('prompt.difficulty.' + p.difficulty) || p.difficulty}</span>
        ${p.tags.slice(0, opts.tagLimit ?? 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
        ${opts.showMarkets ? renderMarketTags(p) : ''}
      </div>
    </a>
  `;
}

function searchPrompts(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return catalog.prompts.filter(p => {
    const m = p.markets || {};
    const marketText = [
      ...(m.industries || []).map(id => marketLabel('industries', id)),
      ...(m.products || []).map(id => marketLabel('products', id)),
      ...(m.niches || []).map(id => marketLabel('niches', id)),
    ].join(' ').toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q)) ||
      p.section.toLowerCase().includes(q) ||
      marketText.includes(q)
    );
  });
}

function adSlot(id = 'ad-mid') {
  const key = id === 'ad-home' ? 'home' : id === 'ad-section' ? 'section' : 'footer';
  return renderAdUnit(key);
}

function renderHome() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="hero">
      <div class="divider"></div>
      <h1>${t('tagline')}</h1>
      <p>${t('subtitle')}</p>
      <div class="stats">
        <div><div class="stat-num">${catalog.totalPrompts || catalog.prompts.length}</div><div class="stat-label">Prompts</div></div>
        <div><div class="stat-num">${catalog.sections.length}</div><div class="stat-label">Sections</div></div>
      </div>
      <form class="search-bar" onsubmit="return goSearch(event)">
        <input type="text" id="home-search" placeholder="${t('search.placeholder')}" aria-label="Search">
        <button type="submit">${t('search.button')}</button>
      </form>
    </div>
    ${adSlot('ad-home')}
    ${renderFeaturedSection()}
    ${renderRecommendedSection()}
    ${renderMarketTeaser()}
    ${renderColorTeaser()}
    <div class="container page-section">
      <h2 class="section-heading">${t('sections.title')}</h2>
      <div class="section-grid">
        ${catalog.sections.map(s => `
          <a href="#/section/${s.id}" class="section-card">
            <div class="icon">${SECTION_ICONS[s.id] || '📄'}</div>
            <h3>${s.title}</h3>
            <p>${s.promptCount} ${t('sections.prompts')}${s.hasVisualExamples ? ' · ' + t('sections.visuals') : ''}</p>
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

function renderMarketTeaser() {
  if (!catalog.markets?.niches) return '';
  const picks = ['b2b-startup', 'local-restaurant', 'd2c-brand', 'fitness-coach', 'ecommerce-store', 'course-creator'];
  return `
    <div class="container page-section market-teaser">
      <h2 class="section-heading">${t('markets.title')}</h2>
      <p class="featured-subtitle">${t('markets.homeTeaser')} <a href="#/markets">${t('markets.browseSection')} →</a></p>
      <div class="market-chips market-chips-wrap">
        ${picks.map(id => {
          const item = getMarketItem('niches', id);
          if (!item) return '';
          return `<a href="${marketPath('', '', id)}" class="market-chip">${item.label}</a>`;
        }).join('')}
      </div>
    </div>
  `;
}

function renderColorTeaser() {
  const cp = typeof getColorPsychology === 'function' ? getColorPsychology(catalog) : (catalog.colorPsychology || {});
  if (!cp.colors) return '';
  const picks = cp.colors.slice(0, 6);
  return `
    <div class="container page-section market-teaser">
      <h2 class="section-heading">${t('colors.title')}</h2>
      <p class="featured-subtitle">${t('colors.subtitle')} <a href="#/colors">${t('colors.colorGuide')} →</a></p>
      <div class="color-teaser-swatches">
        ${picks.map(c => {
          const hex = (c.hexSuggestions && c.hexSuggestions[0]) || '#888';
          return `<a href="#/colors" class="color-teaser-swatch" style="background:${hex}" title="${c.name}: ${c.psychology}"><span>${c.name}</span></a>`;
        }).join('')}
      </div>
    </div>
  `;
}

function renderMarkets(industry = '', product = '', niche = '') {
  const results = filterByMarkets(industry, product, niche);
  const hasFilter = industry || product || niche;
  const filterParts = [];
  if (industry) filterParts.push(marketLabel('industries', industry));
  if (product) filterParts.push(marketLabel('products', product));
  if (niche) filterParts.push(marketLabel('niches', niche));

  document.getElementById('app').innerHTML = `
    <div class="container page-section">
      <div class="breadcrumb"><a href="#/">Home</a> / ${t('nav.markets')}</div>
      <h1 class="section-heading">${t('markets.title')}</h1>
      <p class="featured-subtitle">${t('markets.subtitle')}</p>
      ${adSlot('ad-section')}
      <div class="market-filters">
        ${renderMarketChips('industries', industry, product, niche)}
        ${renderMarketChips('products', industry, product, niche)}
        ${renderMarketChips('niches', industry, product, niche)}
        ${hasFilter ? `<p class="market-active-filters"><strong>${results.length}</strong> ${t('markets.results')}${filterParts.length ? ': ' + filterParts.join(' · ') : ''} · <a href="#/markets">${t('markets.clearFilters')}</a></p>` : ''}
      </div>
      ${results.length === 0 ? `<p class="empty-state">${t('markets.noResults')}</p>` : `
        <div class="prompt-list">
          ${results.map(p => renderPromptCard(p, { showSection: true, showMarkets: true, tagLimit: 2 })).join('')}
        </div>
      `}
    </div>
  `;
}

function renderRecommendedSection() {
  const recommended = getRecommendedPrompts();
  if (!recommended.length) return '';
  return `
    <div class="container page-section">
      <h2 class="section-heading">${t('recommended.title')}</h2>
      <p class="featured-subtitle">${t('recommended.subtitle')}</p>
      <div class="featured-grid">
        ${recommended.map(p => renderPromptCard(p, { showSection: true, tagLimit: 2 })).join('')}
      </div>
    </div>
  `;
}

function renderFeaturedSection() {
  const featured = getFeaturedPrompts();
  if (!featured.length) return '';
  return `
    <div class="container page-section">
      <h2 class="section-heading">${t('featured.title')}</h2>
      <p class="featured-subtitle">${t('featured.subtitle')}</p>
      <div class="featured-grid">
        ${featured.map(p => renderPromptCard(p, { showSection: true, tagLimit: 2 })).join('')}
      </div>
    </div>
  `;
}

function renderDiscover() {
  document.getElementById('app').innerHTML = `
    <div class="container page-section">
      <h1 class="section-heading">${t('discover.title')}</h1>
      <p style="font-family:var(--font-sans);color:var(--text-muted);margin-bottom:32px">${t('discover.subtitle')}</p>
      <div class="section-grid">
        ${catalog.sections.map(s => `
          <a href="#/section/${s.id}" class="section-card">
            <div class="icon">${SECTION_ICONS[s.id] || '📄'}</div>
            <h3>${s.title}</h3>
            <p>${s.description}</p>
            <p style="margin-top:8px">${s.promptCount} prompts</p>
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

function renderSection(sectionId) {
  const section = getSection(sectionId);
  if (!section) return renderNotFound();
  const prompts = getPromptsForSection(sectionId);

  document.getElementById('app').innerHTML = `
    <div class="container page-section">
      <div class="breadcrumb"><a href="#/">Home</a> / ${section.title}</div>
      <h1 class="section-heading">${section.title}</h1>
      <p style="font-family:var(--font-sans);color:var(--text-muted);margin-bottom:32px">${section.description}</p>
      ${adSlot('ad-section')}
      <div class="prompt-list">
        ${prompts.map(p => renderPromptCard(p)).join('')}
      </div>
    </div>
  `;
}

function renderVisualExample(prompt) {
  if (!prompt.visual) return '';
  const v = prompt.visual;
  let media = '';
  if (v.type === 'video') {
    media = `<video src="${v.url}" poster="${v.thumbnail || ''}" controls muted playsinline></video>`;
  } else {
    media = `<img src="${v.url}" alt="Example outcome for ${prompt.title}" loading="lazy">`;
  }
  const exampleFilled = renderPlainTemplate(prompt.template, prompt.exampleValues || {});
  return `
    <div class="visual-example">
      ${media}
      <div class="visual-caption">
        ${t('prompt.examplePrompt')}
        ${v.attribution ? ` · <a href="${v.attributionUrl || '#'}" target="_blank" rel="noopener">${v.attribution}</a>` : ''}
      </div>
      <div class="example-prompt">${escapeHtml(exampleFilled)}</div>
    </div>
  `;
}

function renderPrompt(slug) {
  const prompt = getPrompt(slug);
  if (!prompt) return renderNotFound();
  const section = getSection(prompt.section);

  document.getElementById('app').innerHTML = `
    <div class="container-wide page-section">
      <div class="breadcrumb">
        <a href="#/">Home</a> /
        <a href="#/section/${prompt.section}">${section?.title || prompt.section}</a> /
        ${prompt.title}
      </div>
      <div class="prompt-header">
        <h1>${prompt.title}${renderPromptBadges(prompt, { skipRecommended: true })}</h1>
        ${renderPromptLead(prompt)}
        <div class="tags prompt-header-tags">
          <span class="tag tag-difficulty-${prompt.difficulty}">${t('prompt.difficulty.' + prompt.difficulty) || prompt.difficulty}</span>
          ${prompt.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          ${renderMarketTags(prompt)}
        </div>
      </div>
      ${renderTipBox(prompt)}
      ${renderVisualExample(prompt)}
      ${adSlot('ad-prompt')}
      <div id="builder-mount"></div>
    </div>
  `;

  renderPromptBuilder(prompt, document.getElementById('builder-mount'));
}

function renderColors() {
  const cp = typeof getColorPsychology === 'function' ? getColorPsychology(catalog) : (catalog.colorPsychology || {});
  const personalities = cp.brandPersonalities || [];
  const colors = cp.colors || [];
  const colorPrompts = getPromptsForSection('color-brand');

  document.getElementById('app').innerHTML = `
    <div class="container page-section">
      <div class="breadcrumb"><a href="#/">${t('nav.home')}</a> / ${t('nav.colors')}</div>
      <h1 class="section-heading">${t('colors.title')}</h1>
      <p class="featured-subtitle">${t('colors.subtitle')}</p>
      ${adSlot('ad-section')}

      <h2 class="color-section-title">${t('colors.personalities')}</h2>
      <p class="color-section-hint">${t('colors.personalityHint')}</p>
      <div class="personality-grid">
        ${personalities.map(p => `
          <div class="personality-card">
            <h3>${p.label}</h3>
            <p>${p.description}</p>
            <div class="personality-colors">
              ${(p.colorTendency || []).map(c => `<span class="personality-color-tag">${c}</span>`).join('')}
            </div>
            ${p.avoid ? `<p class="personality-avoid"><strong>${t('colors.avoid')}:</strong> ${(p.avoid || []).join(typeof getLocale === 'function' && getLocale() === 'zh' ? '、' : ', ')}</p>` : ''}
          </div>
        `).join('')}
      </div>

      <h2 class="color-section-title">${t('colors.colorGuide')}</h2>
      <div class="color-guide-grid">
        ${colors.map(c => {
          const swatch = (c.hexSuggestions && c.hexSuggestions[0]) || '#888';
          return `
            <div class="color-guide-card">
              <div class="color-swatch" style="background:${swatch}"></div>
              <div class="color-guide-body">
                <h3>${c.name}</h3>
                <p class="color-psychology-label">${t('colors.psychology')}: ${c.psychology}</p>
                <p class="color-first-impression">${t('colors.firstImpression')}: ${c.firstImpression}</p>
                <p><strong>${t('colors.bestFor')}:</strong> ${(c.bestFor || []).join(typeof getLocale === 'function' && getLocale() === 'zh' ? ' · ' : ' · ')}</p>
                <p><strong>${t('colors.uxImpact')}:</strong> ${c.uxImpact}</p>
                ${c.examples ? `<p><strong>${t('colors.examples')}:</strong> ${c.examples.join(', ')}</p>` : ''}
                ${c.caution ? `<p class="color-caution"><strong>${t('colors.caution')}:</strong> ${c.caution}</p>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <h2 class="color-section-title">${t('colors.browsePrompts')}</h2>
      <p class="color-section-hint">${t('colors.promptsHint')}</p>
      <div class="prompt-list">
        ${colorPrompts.map(p => renderPromptCard(p)).join('')}
      </div>
    </div>
  `;
}

function renderSearch(query = '') {
  const results = searchPrompts(query);
  document.getElementById('app').innerHTML = `
    <div class="container search-page">
      <h1>${t('nav.search')}</h1>
      <form class="search-bar search-wide" onsubmit="return goSearch(event)">
        <input type="text" id="search-input" value="${escapeHtml(query)}" placeholder="${t('search.placeholder')}" aria-label="Search">
        <button type="submit">${t('search.button')}</button>
      </form>
      ${results.length === 0 ? `<p class="empty-state">${t('search.noResults')}</p>` : `
        <div class="prompt-list">
          ${results.map(p => renderPromptCard(p, { showSection: true, tagLimit: 2 })).join('')}
        </div>
      `}
    </div>
  `;
}

function renderNotFound() {
  document.getElementById('app').innerHTML = `
    <div class="container empty-state">
      <h1>Page not found</h1>
      <p><a href="#/">Return home</a></p>
    </div>
  `;
}

function goSearch(e) {
  e.preventDefault();
  const input = e.target.querySelector('input');
  location.hash = '#/search/' + encodeURIComponent(input.value);
  return false;
}

function route() {
  const hash = location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean);

  if (parts.length === 0 || parts[0] === '') return renderHome();
  if (parts[0] === 'discover') return renderDiscover();
  if (parts[0] === 'markets') return renderMarkets(parts[1] || '', parts[2] || '', parts[3] || '');
  if (parts[0] === 'colors') return renderColors();
  if (parts[0] === 'section' && parts[1]) return renderSection(parts[1]);
  if (parts[0] === 'prompt' && parts[1]) return renderPrompt(parts[1]);
  if (parts[0] === 'search') return renderSearch(decodeURIComponent(parts[1] || ''));

  renderNotFound();
}

window.goSearch = goSearch;

function renderFooterAd() {
  const el = document.getElementById('ad-footer-slot');
  if (el && typeof renderAdUnit === 'function') {
    el.outerHTML = renderAdUnit('footer');
  }
}

async function init() {
  try {
    if (typeof initAds === 'function') await initAds();
    await loadI18n();
    await loadCatalog();
    renderFooterAd();
    window.addEventListener('hashchange', () => { route(); pushAds(); });
    route();
    pushAds();
  } catch (err) {
    console.error(err);
    document.getElementById('app').innerHTML =
      '<div class="container empty-state"><h1>Unable to load prompts</h1><p>Please refresh the page. If this continues, try <a href="' +
      (window.SITE_BASE || './') + '">reopening the site</a>.</p></div>';
  }
}

init();
