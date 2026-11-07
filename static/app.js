/* STA258 ebook companion · retains the original chat / citations / math / image features. */
(() => {
  'use strict';
  const chat = document.getElementById('chat');
  const form = document.getElementById('composer');
  const textarea = document.getElementById('message');
  const sendButton = document.getElementById('send');
  const newChat = document.getElementById('newChat');
  const welcome = document.getElementById('welcome');
  const chatPanel = document.querySelector('.chat-panel');
  const themeToggle = document.getElementById('themeToggle');
  const themeLabel = document.getElementById('themeLabel');
  const tocToggle = document.getElementById('tocToggle');
  const tocLabel = document.getElementById('tocToggleLabel');
  const tocPanel = document.getElementById('contentsPanel');
  const mainGrid = document.getElementById('mainGrid');
  const suggestions = document.getElementById('suggestions');
  const refreshQuestions = document.getElementById('refreshQuestions');
  const protectedMode = document.body.dataset.protected === 'true';
  let previousResponseId = null;
  let isSending = false;

  const EBOOK_RAW_BASE = 'https://raw.githubusercontent.com/nishanmudalige/STA258_Book/main/';
  const THEME_KEY = 'sta258_agent_theme_v1';
  const TOC_KEY = 'sta258_agent_contents_v1';
  const QUESTIONS_KEY = 'sta258_agent_previous_questions_v1';
  let lastShownIds = [];

  function readStored(key, fallback = null) {
    try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; }
  }
  function saveStored(key, value) {
    try { localStorage.setItem(key, value); } catch (_) { /* Non-essential preference */ }
  }
  function accessCode() {
    try { return sessionStorage.getItem('ebook_agent_code') || ''; } catch (_) { return ''; }
  }

  function applyTheme(theme, save = true) {
    const dark = theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    themeToggle.setAttribute('aria-pressed', String(dark));
    themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    themeToggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    themeLabel.textContent = dark ? 'Light mode' : 'Dark mode';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#132340' : '#ffffff';
    if (save) saveStored(THEME_KEY, dark ? 'dark' : 'light');
  }
  applyTheme(document.documentElement.dataset.theme, false);
  themeToggle.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  function setChaptersVisible(visible, save = true) {
    tocPanel.hidden = !visible;
    mainGrid.classList.toggle('contents-hidden', !visible);
    tocToggle.setAttribute('aria-expanded', String(visible));
    tocLabel.textContent = visible ? 'Hide chapters' : 'Show chapters';
    if (save) saveStored(TOC_KEY, visible ? 'yes' : 'no');
  }
  const storedToc = readStored(TOC_KEY);
  setChaptersVisible(storedToc === null ? window.matchMedia('(min-width: 801px)').matches : storedToc === 'yes', false);
  tocToggle.addEventListener('click', () => setChaptersVisible(tocPanel.hidden));

  if (protectedMode) {
    const codeInput = document.getElementById('accessCode');
    const saveCode = document.getElementById('saveCode');
    codeInput.value = accessCode();
    saveCode.addEventListener('click', () => {
      try { sessionStorage.setItem('ebook_agent_code', codeInput.value.trim()); } catch (_) { /* Session storage may be disabled */ }
      saveCode.textContent = 'Saved';
      window.setTimeout(() => { saveCode.textContent = 'Save code'; }, 1100);
    });
    codeInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); saveCode.click(); }
    });
  }

  // Four DISTINCT cards, picked randomly from the STA258 curriculum.
  // A full replacement is selected every page visit / New chat / Shuffle.
  // Where possible, avoid the four questions that appeared immediately before.
  const QUESTION_BANK = [
    {id:'parameter', topic:'FOUNDATIONS', title:'Parameter vs. statistic?', question:'Explain the difference between a population parameter and a sample statistic, using an example from STA258.'},
    {id:'sampling', topic:'FOUNDATIONS', title:'What is a sampling distribution?', question:'Explain what a sampling distribution is and why it is useful for statistical inference.'},
    {id:'clt', topic:'FOUNDATIONS', title:'When does the central limit theorem apply?', question:'Explain the central limit theorem, including its conditions, with a simple example.'},
    {id:'normal', topic:'PROBABILITY', title:'How do I use a normal distribution?', question:'Walk through a normal-distribution probability calculation using a z-score.'},
    {id:'r-intro', topic:'R PROGRAMMING', title:'How do I start analysing data in R?', question:'Show a simple STA258 example in R for importing data and producing a summary and plot.'},
    {id:'histogram', topic:'DESCRIPTIVE STATS', title:'How do I interpret a histogram?', question:'Explain how to interpret the shape, centre, spread, and potential outliers in a histogram.'},
    {id:'boxplot', topic:'DESCRIPTIVE STATS', title:'What does a boxplot tell me?', question:'Explain the five-number summary and how to identify potential outliers using a boxplot.'},
    {id:'standard-error', topic:'INFERENCE', title:'SD vs. standard error?', question:'Explain the difference between a standard deviation and a standard error, with an example.'},
    {id:'ci', topic:'CONFIDENCE INTERVALS', title:'What does 95% confidence mean?', question:'Interpret a 95% confidence interval correctly and explain a common misconception.'},
    {id:'ci-choice', topic:'CONFIDENCE INTERVALS', title:'z-interval or t-interval?', question:'How can I decide whether to use a z confidence interval or a t confidence interval for a population mean?'},
    {id:'welch', topic:'CONFIDENCE INTERVALS', title:'Welch vs. pooled t methods?', question:'When should I use a Welch two-sample t interval or test instead of a pooled two-sample t method?'},
    {id:'paired', topic:'HYPOTHESIS TESTS', title:'When is a paired t-test appropriate?', question:'Give an example that demonstrates the difference between a paired t-test and an independent two-sample t-test.'},
    {id:'p-value', topic:'HYPOTHESIS TESTS', title:'What does a p-value mean?', question:'Explain the meaning of a p-value, including what it does not tell us.'},
    {id:'error-types', topic:'HYPOTHESIS TESTS', title:'Type I vs. Type II errors?', question:'Compare Type I and Type II errors in a hypothesis test using a realistic example.'},
    {id:'power', topic:'STATISTICAL POWER', title:'How does sample size affect power?', question:'Explain the relationship between sample size, effect size, significance level, and statistical power.'},
    {id:'power-calc', topic:'STATISTICAL POWER', title:'How do I calculate power?', question:'Walk through an example of a statistical power calculation for a one-sample hypothesis test.'},
    {id:'anova', topic:'ANOVA', title:'How does one-way ANOVA work?', question:'Explain how one-way ANOVA compares several group means and what the F statistic represents.'},
    {id:'anova-conditions', topic:'ANOVA', title:'What are ANOVA assumptions?', question:'Explain the assumptions of a one-way ANOVA and how to assess them.'},
    {id:'slope', topic:'REGRESSION', title:'How do I interpret a regression slope?', question:'Explain the interpretation of the slope and intercept in simple linear regression with a real-world example.'},
    {id:'residuals', topic:'REGRESSION', title:'What do residual plots reveal?', question:'How should I interpret residual and Q-Q plots when checking a simple linear regression model?'},
    {id:'regression-ci', topic:'REGRESSION', title:'Confidence vs. prediction intervals?', question:'Explain the difference between a confidence interval for a mean response and a prediction interval for an individual response in regression.'},
    {id:'chisquare', topic:'CATEGORICAL DATA', title:'When do I use a chi-square test?', question:'Compare a chi-square test of independence and a chi-square goodness-of-fit test using examples.'},
    {id:'contingency', topic:'CATEGORICAL DATA', title:'How do I read a contingency table?', question:'Explain how to calculate and interpret row percentages and column percentages in a contingency table.'},
    {id:'book-check', topic:'EBOOK REVIEW', title:'Can you check an ebook example?', question:'Choose one example from the STA258 ebook and carefully explain how I can verify its calculations and conclusions.'}
  ];

  function chooseQuestions() {
    let previousIds = [];
    try {
      const parsed = JSON.parse(readStored(QUESTIONS_KEY, '[]'));
      if (Array.isArray(parsed)) previousIds = parsed;
    } catch (_) { /* Invalid saved preferences should never break the interface. */ }
    previousIds = [...new Set([...previousIds, ...lastShownIds])];
    const fresh = QUESTION_BANK.filter(item => !previousIds.includes(item.id));
    const choices = fresh.length >= 4 ? fresh : QUESTION_BANK;
    const pool = choices.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const selected = pool.slice(0, 4);
    lastShownIds = selected.map(item => item.id);
    suggestions.replaceChildren();
    selected.forEach(item => {
      const button = document.createElement('button');
      button.className = 'suggestion';
      button.type = 'button';
      button.dataset.question = item.question;
      const tag = document.createElement('span');
      tag.className = 'suggestion-tag'; tag.textContent = item.topic;
      const copy = document.createElement('span');
      copy.className = 'suggestion-copy'; copy.textContent = item.title;
      const arrow = document.createElement('span');
      arrow.className = 'suggestion-arrow'; arrow.textContent = '↗';
      arrow.setAttribute('aria-hidden', 'true');
      button.append(tag, copy, arrow);
      suggestions.appendChild(button);
    });
    saveStored(QUESTIONS_KEY, JSON.stringify(selected.map(item => item.id)));
  }
  chooseQuestions();
  refreshQuestions.addEventListener('click', chooseQuestions);
  suggestions.addEventListener('click', event => {
    const button = event.target.closest('button.suggestion');
    if (!button || isSending) return;
    textarea.value = button.dataset.question || '';
    const code = document.getElementById('accessCode');
    if (protectedMode && !accessCode() && code) { code.focus(); return; }
    form.requestSubmit();
  });

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  // The Markdown parser otherwise treats LaTeX backslashes as Markdown escapes.
  function protectMath(text) {
    const math = [];
    const protectedText = (text || '').replace(
      /\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$/g,
      match => {
        const token = `EBOOKMATHPLACEHOLDER${math.length}END`;
        math.push(match);
        return token;
      }
    );
    return {protectedText, math};
  }
  function renderMarkdown(text) {
    if (!window.marked) return `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
    marked.setOptions({breaks: true, gfm: true});
    const {protectedText, math} = protectMath(text);
    let html = marked.parse(protectedText);
    math.forEach((expression, index) => {
      html = html.split(`EBOOKMATHPLACEHOLDER${index}END`).join(expression);
    });
    if (window.DOMPurify) html = DOMPurify.sanitize(html, {
      USE_PROFILES: {html: true},
      ADD_ATTR: ['target','rel','loading','decoding']
    });
    else return `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
    return html;
  }
  function prepareLinks(container) {
    container.querySelectorAll('a').forEach(a => {
      if (/^https?:\/\//i.test(a.href)) {
        a.target = '_blank'; a.rel = 'noopener noreferrer';
      }
    });
  }
  function prepareImages(container) {
    container.querySelectorAll('img').forEach(img => {
      let src = img.getAttribute('src');
      if (!src) return;
      if (!/^(https?:|data:|blob:)/i.test(src)) {
        src = src.replace(/^(\.\.\/)+/, '').replace(/^\.\/+/, '');
        src = src.replace(/^docs\//, '').replace(/^Book_Files\//, 'Book_files/');
        img.src = new URL(src, EBOOK_RAW_BASE).href;
      }
      img.loading = 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
    });
  }
  function typesetMath(container, attempts = 0) {
    if (window.MathJax?.typesetPromise) {
      if (window.MathJax.typesetClear) window.MathJax.typesetClear([container]);
      window.MathJax.typesetPromise([container]).catch(() => {});
    } else if (attempts < 20) {
      window.setTimeout(() => typesetMath(container, attempts + 1), 100);
    }
  }
  function scrollToLatest() { chat.scrollTop = chat.scrollHeight; }
  const PROVENANCE = {
    book: {label: 'From the textbook', cls: 'from-book', hint: 'Supported by retrieved STA258 ebook content.'},
    related: {label: 'Related · beyond the textbook', cls: 'related-content', hint: 'New examples, explanations, or graphs based on general statistical knowledge; not verified as textbook content.'},
    outside: {label: 'Outside the ebook scope', cls: 'out-of-scope', hint: 'This question is unrelated to the STA258 ebook and its academic topics.'}
  };
  function addSourceLinks(section, sources) {
    if (!Array.isArray(sources) || !sources.length) return;
    const box = document.createElement('div');
    box.className = 'sources';
    const title = document.createElement('div');
    title.className = 'sources-title'; title.textContent = 'Supporting ebook chapters';
    box.appendChild(title);
    sources.forEach(source => {
      if (!/^https:\/\//i.test(source.url || '')) return;
      const link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.textContent = source.label || 'Ebook chapter';
      box.appendChild(link);
    });
    if (box.children.length > 1) section.appendChild(box);
  }
  function appendAnswerSection(bubble, kind, markdown, sources = [], plot = null) {
    if (!markdown && !plot) return;
    const meta = PROVENANCE[kind];
    const section = document.createElement('section');
    section.className = `answer-section ${meta.cls}`;
    const badge = document.createElement('span');
    badge.className = `provenance-badge ${meta.cls}`;
    badge.textContent = meta.label;
    badge.title = meta.hint;
    section.appendChild(badge);
    if (kind === 'related') {
      const caveat = document.createElement('p'); caveat.className = 'provenance-note';
      caveat.textContent = 'Additional content from general statistical knowledge, not a passage or figure from the ebook.';
      section.appendChild(caveat);
    }
    if (markdown) {
      const content = document.createElement('div');
      content.className = 'answer-markdown'; content.innerHTML = renderMarkdown(markdown);
      prepareImages(content); prepareLinks(content);
      section.appendChild(content);
    }
    if (plot && kind === 'related' && window.STA258Plots) {
      const chart = window.STA258Plots.render(plot);
      if (chart) section.appendChild(chart);
    }
    if (kind === 'book') addSourceLinks(section, sources);
    bubble.appendChild(section);
  }
  function addMessage(role, text, sources = [], provenance = null) {
    const article = document.createElement('article');
    article.className = `message ${role}`;
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'assistant' ? 'STA' : 'You';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    if (role === 'assistant' && provenance &&
        ('book_answer' in provenance || 'related_answer' in provenance || 'outside_answer' in provenance)) {
      appendAnswerSection(bubble, 'book', provenance.book_answer, sources);
      appendAnswerSection(bubble, 'related', provenance.related_answer, [], provenance.plot);
      appendAnswerSection(bubble, 'outside', provenance.outside_answer);
      if (!bubble.childNodes.length) bubble.innerHTML = renderMarkdown(text || 'I did not receive an answer.');
    } else if (role === 'assistant') {
      bubble.innerHTML = renderMarkdown(text);
      prepareImages(bubble); prepareLinks(bubble);
      addSourceLinks(bubble, sources);
    } else {
      bubble.innerHTML = `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
    }
    article.append(avatar, bubble);
    chat.appendChild(article);
    scrollToLatest();
    if (role === 'assistant') typesetMath(bubble);
    return article;
  }
  function addThinking() {
    const article = document.createElement('article');
    article.className = 'message assistant thinking-row';
    article.innerHTML = '<div class="avatar">STA</div><div class="bubble thinking"><span></span><span></span><span></span><span class="thinking-label">Consulting the ebook…</span></div>';
    chat.appendChild(article); scrollToLatest();
    return article;
  }
  async function sendQuestion(question) {
    if (isSending || !question.trim()) return;
    isSending = true;
    welcome.hidden = true;
    chatPanel.classList.remove('is-start');
    addMessage('user', question);
    const thinking = addThinking();
    sendButton.disabled = true;
    textarea.disabled = true;
    try {
      const payload = {message: question};
      if (previousResponseId) payload.previous_response_id = previousResponseId;
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type':'application/json', 'X-Ebook-Agent-Code': accessCode()},
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed.');
      previousResponseId = data.response_id || null;
      addMessage('assistant', data.answer || 'I did not receive an answer.', data.sources || [], data);
    } catch (error) {
      addMessage('assistant', `**Error:** ${error.message || 'Unable to complete your request.'}`);
    } finally {
      thinking.remove();
      isSending = false;
      sendButton.disabled = false;
      textarea.disabled = false;
      textarea.focus();
      scrollToLatest();
    }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (isSending) return;
    const question = textarea.value.trim();
    if (!question) return;
    const code = document.getElementById('accessCode');
    if (protectedMode && !accessCode() && code) { code.focus(); return; }
    textarea.value = '';
    sendQuestion(question);
  });
  textarea.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  newChat.addEventListener('click', () => {
    if (isSending) return;
    previousResponseId = null;
    chat.querySelectorAll('.message').forEach(item => item.remove());
    textarea.value = '';
    welcome.hidden = false;
    chatPanel.classList.add('is-start');
    chooseQuestions();
    chat.scrollTop = 0;
    textarea.focus();
  });
})();
