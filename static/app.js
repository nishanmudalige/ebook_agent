const chat = document.getElementById('chat');
const form = document.getElementById('composer');
const textarea = document.getElementById('message');
const sendButton = document.getElementById('send');
const newChat = document.getElementById('newChat');
const protectedMode = document.body.dataset.protected === 'true';
let previousResponseId = null;

const EBOOK_RAW_BASE = 'https://raw.githubusercontent.com/nishanmudalige/STA258_Book/main/';

function accessCode() {
  return sessionStorage.getItem('ebook_agent_code') || '';
}

if (protectedMode) {
  const codeInput = document.getElementById('accessCode');
  const saveCode = document.getElementById('saveCode');
  codeInput.value = accessCode();
  saveCode.addEventListener('click', () => {
    sessionStorage.setItem('ebook_agent_code', codeInput.value.trim());
    saveCode.textContent = 'Saved';
    setTimeout(() => saveCode.textContent = 'Use code', 900);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// marked.js treats backslashes as Markdown escapes. Protect LaTeX before Markdown
// parsing, then restore it for MathJax. This fixes raw output such as (\mu).
function protectMath(text) {
  const math = [];
  const protectedText = (text || '').replace(
    /\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$/g,
    (match) => {
      const token = `EBOOKMATHPLACEHOLDER${math.length}END`;
      math.push(match);
      return token;
    }
  );
  return { protectedText, math };
}

function renderMarkdown(text) {
  marked.setOptions({ breaks: true, gfm: true });
  const { protectedText, math } = protectMath(text);
  let html = marked.parse(protectedText);

  math.forEach((expression, index) => {
    const token = `EBOOKMATHPLACEHOLDER${index}END`;
    html = html.split(token).join(expression);
  });

  // Sanitize generated HTML while preserving normal Markdown output.
  if (window.DOMPurify) {
    html = DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['target', 'rel', 'loading', 'decoding']
    });
  }
  return html;
}

function prepareLinks(container) {
  container.querySelectorAll('a').forEach((a) => {
    if (/^https?:\/\//i.test(a.href)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  });
}

function prepareImages(container) {
  container.querySelectorAll('img').forEach((img) => {
    let src = img.getAttribute('src');
    if (!src) return;

    // If the model returns an ebook-relative path, resolve it against the public
    // repository rather than against the Flask/Render server.
    if (!/^(https?:|data:|blob:)/i.test(src)) {
      src = src.replace(/^(\.\.\/)+/, '').replace(/^\.\/+/, '');
      src = src.replace(/^docs\//, '');
      src = src.replace(/^Book_Files\//, 'Book_files/');
      img.src = new URL(src, EBOOK_RAW_BASE).href;
    }

    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
  });
}

function typesetMath(container, tries = 0) {
  if (window.MathJax?.typesetPromise) {
    if (window.MathJax.typesetClear) MathJax.typesetClear([container]);
    MathJax.typesetPromise([container]).catch(() => {});
  } else if (tries < 20) {
    setTimeout(() => typesetMath(container, tries + 1), 100);
  }
}

function addMessage(role, text, sources = []) {
  const article = document.createElement('article');
  article.className = `message ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = role === 'assistant' ? 'EA' : 'You';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  if (role === 'assistant') {
    bubble.innerHTML = renderMarkdown(text);
    prepareImages(bubble);
    prepareLinks(bubble);
  } else {
    bubble.innerHTML = `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
  }

  if (sources && sources.length) {
    const sourceBox = document.createElement('div');
    sourceBox.className = 'sources';
    const title = document.createElement('div');
    title.className = 'sources-title';
    title.textContent = 'Ebook sources';
    sourceBox.appendChild(title);

    sources.forEach(source => {
      const a = document.createElement('a');
      a.href = source.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = source.label;
      sourceBox.appendChild(a);
    });
    bubble.appendChild(sourceBox);
  }

  article.append(avatar, bubble);
  chat.appendChild(article);
  chat.scrollTop = chat.scrollHeight;

  if (role === 'assistant') typesetMath(bubble);
  return article;
}

function addThinking() {
  const article = document.createElement('article');
  article.className = 'message assistant thinking-row';
  article.innerHTML = `<div class="avatar">EA</div><div class="bubble thinking"><span></span><span></span><span></span><span class="thinking-label">Searching ebook…</span></div>`;
  chat.appendChild(article);
  chat.scrollTop = chat.scrollHeight;
  return article;
}

async function sendQuestion(question) {
  addMessage('user', question);
  const thinking = addThinking();
  sendButton.disabled = true;
  textarea.disabled = true;

  try {
    const payload = { message: question };
    if (previousResponseId) payload.previous_response_id = previousResponseId;

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ebook-Agent-Code': accessCode(),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    thinking.remove();
    if (!response.ok) throw new Error(data.error || 'Request failed.');

    previousResponseId = data.response_id;
    addMessage('assistant', data.answer, data.sources || []);
  } catch (error) {
    thinking.remove();
    addMessage('assistant', `**Error:** ${error.message}`);
  } finally {
    sendButton.disabled = false;
    textarea.disabled = false;
    textarea.focus();
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const question = textarea.value.trim();
  if (!question) return;
  textarea.value = '';
  sendQuestion(question);
});

textarea.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

document.querySelectorAll('.suggestion').forEach(btn => {
  btn.addEventListener('click', () => {
    textarea.value = btn.textContent;
    form.requestSubmit();
  });
});

newChat.addEventListener('click', () => {
  previousResponseId = null;
  [...chat.querySelectorAll('.message:not(.welcome)')].forEach(el => el.remove());
  textarea.value = '';
  textarea.focus();
});
