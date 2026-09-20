const chat = document.getElementById('chat');
const form = document.getElementById('composer');
const textarea = document.getElementById('message');
const sendButton = document.getElementById('send');
const newChat = document.getElementById('newChat');
const protectedMode = document.body.dataset.protected === 'true';
let previousResponseId = null;

const BOOK_BASE = 'https://nishanmudalige.github.io/STA258_Book/';

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

/* ------------------------------------------------------------------------- *
 * Maths
 *
 * marked treats a backslash as a Markdown escape, so it eats the delimiters
 * before MathJax ever sees them:  \(\mu\)  ->  (\mu)  and  \[ ... \]  ->  [ ... ].
 * That is why formulas were showing as literal text.
 *
 * So: pull every maths span out first, run Markdown on what is left, then put
 * the maths back and let MathJax typeset it.
 * ------------------------------------------------------------------------- */

const MATH_OPEN = '';
const MATH_CLOSE = '';

// "$12.50" and "$5 to $10" are money, not maths. Only treat $...$ as maths when
// it looks like maths: a backslash, or a ^ _ = { } style symbol.
function looksLikeMath(inner) {
  if (!inner.trim()) return false;
  if (/^[\s\d.,]+$/.test(inner)) return false;
  return /[\\^_={}]/.test(inner) || /[A-Za-z]/.test(inner);
}

function protectMath(text) {
  const store = [];
  const keep = (raw) => MATH_OPEN + (store.push(raw) - 1) + MATH_CLOSE;

  let out = text
    // display first, so $$ is not eaten by the $ rule
    .replace(/\$\$([\s\S]+?)\$\$/g, (m) => keep(m))
    .replace(/\\\[([\s\S]+?)\\\]/g, (m) => keep(m))
    .replace(/\\\(([\s\S]+?)\\\)/g, (m) => keep(m))
    .replace(/\$([^$\n]+?)\$/g, (m, inner) => (looksLikeMath(inner) ? keep(m) : m));

  return { out, store };
}

function restoreMath(html, store) {
  return html.replace(
    new RegExp(MATH_OPEN + '(\\d+)' + MATH_CLOSE, 'g'),
    (_, i) => escapeHtml(store[Number(i)])   // escape so "a < b" cannot open a tag
  );
}

/* MathJax is loaded with `defer`. On a slow connection the first answer can
 * arrive before it exists, and the old code silently skipped typesetting for
 * the rest of the session. Wait for it instead. */
let mathJaxReady = null;
function whenMathJaxReady() {
  if (mathJaxReady) return mathJaxReady;
  mathJaxReady = new Promise((resolve) => {
    const tick = () => {
      if (window.MathJax && window.MathJax.typesetPromise) {
        const startup = window.MathJax.startup && window.MathJax.startup.promise;
        (startup || Promise.resolve()).then(resolve).catch(resolve);
      } else {
        setTimeout(tick, 120);
      }
    };
    tick();
  });
  return mathJaxReady;
}

function typesetMath(el) {
  whenMathJaxReady()
    .then(() => window.MathJax.typesetPromise([el]))
    .then(() => { chat.scrollTop = chat.scrollHeight; })
    .catch(() => {});
}

/* ------------------------------------------------------------------------- *
 * Markdown
 * ------------------------------------------------------------------------- */

function renderMarkdown(text) {
  marked.setOptions({ breaks: true, gfm: true });
  const { out, store } = protectMath(text || '');
  return restoreMath(marked.parse(out), store);
}

// The model may cite a figure with a path relative to the ebook
// ("Book_files/figure-html/x-1.png"). Point those at the published site.
function absolutiseImages(bubble) {
  bubble.querySelectorAll('img').forEach(img => {
    const raw = img.getAttribute('src') || '';
    if (raw && !/^(https?:)?\/\//i.test(raw) && !raw.startsWith('data:')) {
      img.src = BOOK_BASE + raw.replace(/^\.?\//, '');
    }
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      const note = document.createElement('p');
      note.className = 'img-missing';
      note.textContent = img.alt
        ? `[figure unavailable: ${img.alt}]`
        : '[figure unavailable]';
      img.replaceWith(note);
    }, { once: true });
  });
}

function addMessage(role, text, sources = []) {
  const article = document.createElement('article');
  article.className = `message ${role}`;
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = role === 'assistant' ? 'EA' : 'You';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  if (role === 'assistant') bubble.innerHTML = renderMarkdown(text);
  else bubble.innerHTML = `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;

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
      a.rel = 'noopener';
      a.textContent = source.label;
      sourceBox.appendChild(a);
    });
    bubble.appendChild(sourceBox);
  }

  article.append(avatar, bubble);
  chat.appendChild(article);
  chat.scrollTop = chat.scrollHeight;

  if (role === 'assistant') {
    absolutiseImages(bubble);
    typesetMath(bubble);
  }
  return article;
}

function addThinking() {
  const article = document.createElement('article');
  article.className = 'message assistant thinking-row';
  article.innerHTML = `<div class="avatar">EA</div><div class="bubble thinking"><span></span><span></span><span></span></div>`;
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
