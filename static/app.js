const chat = document.getElementById('chat');
const form = document.getElementById('composer');
const textarea = document.getElementById('message');
const sendButton = document.getElementById('send');
const newChat = document.getElementById('newChat');
const protectedMode = document.body.dataset.protected === 'true';
let previousResponseId = null;

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

function renderMarkdown(text) {
  marked.setOptions({ breaks: true });
  return marked.parse(text || '');
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
  if (role === 'assistant' && window.MathJax?.typesetPromise) {
    MathJax.typesetPromise([bubble]).catch(() => {});
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
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ebook-Agent-Code': accessCode(),
      },
      body: JSON.stringify({ message: question, previous_response_id: previousResponseId }),
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
