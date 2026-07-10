/** {{variable}} template parser and renderer */

function extractVariables(template) {
  const regex = /\{\{(\w+)\}\}/g;
  const seen = new Set();
  const vars = [];
  let match;
  while ((match = regex.exec(template)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      vars.push(match[1]);
    }
  }
  return vars;
}

function labelFromName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

function renderTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const val = values[name];
    if (val === undefined || val === '') {
      const label = labelFromName(name);
      return `<span class="var-highlight var-empty">${escapeHtml(label)}</span>`;
    }
    return `<span class="var-highlight">${escapeHtml(val)}</span>`;
  });
}

function renderPlainTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const val = values[name];
    return val !== undefined && val !== '' ? val : `{{${name}}}`;
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function openInAI(provider, promptText) {
  const text = promptText || '';
  let url;

  switch (provider) {
    case 'cursor': {
      const cursorText = text.length > 7900 ? text.slice(0, 7900) + '…' : text;
      url = new URL('https://cursor.com/link/prompt');
      url.searchParams.set('text', cursorText);
      window.open(url.toString(), '_blank');
      return;
    }
    case 'codex': {
      url = new URL('codex://new');
      url.searchParams.set('prompt', text);
      window.open(url.toString(), '_blank');
      return;
    }
    case 'gemini': {
      url = new URL('https://gemini.google.com/app');
      url.searchParams.set('q', text);
      window.open(url.toString(), '_blank');
      return;
    }
    default:
      return;
  }
}

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = t('prompt.copied') || 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  });
}

function buildFormFields(prompt, container, onUpdate) {
  container.innerHTML = '';
  const values = { ...(prompt.exampleValues || {}) };

  for (const v of prompt.variables) {
    const field = document.createElement('div');
    field.className = 'field field-customizable';

    const label = document.createElement('label');
    label.setAttribute('for', `var-${v.name}`);
    const marker = document.createElement('span');
    marker.className = 'field-marker';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = '◆';
    label.appendChild(marker);
    label.appendChild(document.createTextNode(v.label || labelFromName(v.name)));
    field.appendChild(label);

    let input;
    if (v.type === 'select') {
      input = document.createElement('select');
      input.id = `var-${v.name}`;
      for (const opt of v.options || []) {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        if (values[v.name] === opt || v.default === opt) o.selected = true;
        input.appendChild(o);
      }
    } else if (v.type === 'textarea') {
      input = document.createElement('textarea');
      input.id = `var-${v.name}`;
      input.placeholder = v.placeholder || '';
      input.value = values[v.name] || '';
    } else {
      input = document.createElement('input');
      input.type = v.type === 'number' ? 'number' : 'text';
      input.id = `var-${v.name}`;
      input.placeholder = v.placeholder || '';
      input.value = values[v.name] || v.default || '';
    }

    input.addEventListener('input', () => {
      values[v.name] = input.value;
      onUpdate(values);
    });
    input.addEventListener('change', () => {
      values[v.name] = input.value;
      onUpdate(values);
    });

    field.appendChild(input);
    container.appendChild(field);
  }

  onUpdate(values);
  return values;
}

function renderPromptBuilder(prompt, mountEl) {
  mountEl.innerHTML = `
    <div class="builder">
      <div class="panel panel-form">
        <h2 data-i18n="prompt.fillVariables">Fill in variables</h2>
        <p class="panel-hint" data-i18n="prompt.customizeHint">Fields marked with ◆ customize your prompt.</p>
        <div id="form-fields"></div>
      </div>
      <div class="panel panel-preview">
        <h2 data-i18n="prompt.livePreview">Live preview</h2>
        <p class="panel-hint" data-i18n="prompt.previewHint">Highlighted text updates as you edit.</p>
        <div class="preview-box" id="preview-box"></div>
        <p class="panel-hint panel-hint-actions" data-i18n="prompt.openHint">Codex opens the desktop app. Cursor and Gemini open in your browser.</p>
        <div class="actions">
          <button class="btn btn-primary" id="copy-btn" data-i18n="prompt.copy">Copy prompt</button>
          <button class="btn" id="codex-btn" data-i18n="prompt.openCodex">Open in Codex</button>
          <button class="btn" id="cursor-btn" data-i18n="prompt.openCursor">Open in Cursor</button>
          <button class="btn" id="gemini-btn" data-i18n="prompt.openGemini">Open in Gemini</button>
        </div>
      </div>
    </div>
  `;
  applyI18n();

  const previewBox = mountEl.querySelector('#preview-box');
  const formFields = mountEl.querySelector('#form-fields');

  buildFormFields(prompt, formFields, (values) => {
    previewBox.innerHTML = renderTemplate(prompt.template, values);
    previewBox.dataset.plain = renderPlainTemplate(prompt.template, values);
  });

  mountEl.querySelector('#copy-btn').addEventListener('click', function () {
    copyText(previewBox.dataset.plain || previewBox.textContent, this);
  });
  mountEl.querySelector('#codex-btn').addEventListener('click', () => {
    openInAI('codex', previewBox.dataset.plain || previewBox.textContent);
  });
  mountEl.querySelector('#cursor-btn').addEventListener('click', () => {
    openInAI('cursor', previewBox.dataset.plain || previewBox.textContent);
  });
  mountEl.querySelector('#gemini-btn').addEventListener('click', () => {
    openInAI('gemini', previewBox.dataset.plain || previewBox.textContent);
  });
}
