const QUOTE_BOX_ID = "gpt-quote-box";
const QUOTE_STYLE_ID = "gpt-quote-style";
const DEFAULT_PROMPT = "这是你之前的回答，请基于引用继续回答：";

let currentQuote = null;
let isPreparingSubmission = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "quoteText") {
    const result = handleQuote(message.selectedText);
    sendResponse({ success: result });
  }
  return true;
});

document.addEventListener(
  "click",
  (event) => {
    if (!currentQuote) {
      return;
    }

    const sendButton = event.target.closest('button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="发送"]');
    if (!sendButton) {
      return;
    }

    prepareQuotedMessage();
  },
  true
);

document.addEventListener(
  "keydown",
  (event) => {
    if (!currentQuote || event.key !== "Enter" || event.shiftKey || event.isComposing) {
      return;
    }

    const inputEl = getInputElement();
    if (!inputEl || !inputEl.contains(event.target)) {
      return;
    }

    prepareQuotedMessage();
  },
  true
);

function handleQuote(selectedText) {
  if (!selectedText || !selectedText.trim()) {
    return false;
  }

  const questionText = findCorrespondingQuestion(selectedText);
  currentQuote = {
    questionText,
    selectedText: selectedText.trim()
  };

  ensureQuoteStyle();
  renderQuoteBox();

  const inputEl = getInputElement();
  if (!inputEl) {
    console.error("[GPT Quote] 未找到聊天输入框");
    return false;
  }

  const currentText = getInputText(inputEl).trim();
  if (!currentText) {
    setInputText(inputEl, DEFAULT_PROMPT);
  }

  inputEl.focus();
  inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
  return true;
}

function findCorrespondingQuestion(selectedText) {
  const trimmedText = selectedText.trim();
  const allTurns = Array.from(document.querySelectorAll('[data-testid^="conversation-turn-"]'));

  for (let i = 0; i < allTurns.length; i++) {
    const turn = allTurns[i];
    const turnText = (turn.innerText || turn.textContent || "").trim();

    if (!turnText.includes(trimmedText)) {
      continue;
    }

    for (let j = i - 1; j >= 0; j--) {
      const prevTurn = allTurns[j];
      const userMsgEl = prevTurn.querySelector('[data-message-author-role="user"]');
      if (userMsgEl) {
        return (userMsgEl.innerText || userMsgEl.textContent || "").trim();
      }
    }
  }

  const articles = Array.from(document.querySelectorAll("article"));
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const articleText = (article.innerText || article.textContent || "").trim();

    if (!articleText.includes(trimmedText)) {
      continue;
    }

    for (let j = i - 1; j >= 0; j--) {
      const prevArticle = articles[j];
      const testId = prevArticle.getAttribute("data-testid") || "";
      const isUser = testId.includes("user") || prevArticle.querySelector('[data-message-author-role="user"]');

      if (!isUser) {
        continue;
      }

      const msgEl = prevArticle.querySelector('[data-message-author-role="user"]');
      return msgEl
        ? (msgEl.innerText || msgEl.textContent || "").trim()
        : (prevArticle.innerText || prevArticle.textContent || "").trim();
    }

    break;
  }

  return null;
}

function prepareQuotedMessage() {
  if (!currentQuote || isPreparingSubmission) {
    return;
  }

  const inputEl = getInputElement();
  if (!inputEl) {
    return;
  }

  const currentText = getInputText(inputEl).trim();
  const userText = currentText === DEFAULT_PROMPT ? "" : currentText;
  const finalText = [buildQuotePayload(currentQuote), userText || DEFAULT_PROMPT]
    .filter(Boolean)
    .join("\n\n");

  isPreparingSubmission = true;
  setInputText(inputEl, finalText);

  window.setTimeout(() => {
    clearQuoteState();
    isPreparingSubmission = false;
  }, 300);
}

function buildQuotePayload(quote) {
  const lines = ["[引用内容]"];

  if (quote.questionText) {
    lines.push("问题：", quote.questionText, "");
  }

  lines.push("回答：", quote.selectedText, "[/引用内容]");
  return lines.join("\n");
}

function renderQuoteBox() {
  const inputEl = getInputElement();
  if (!inputEl || !currentQuote) {
    return;
  }

  const host = getQuoteHost(inputEl);
  if (!host) {
    return;
  }

  let quoteBox = document.getElementById(QUOTE_BOX_ID);
  if (!quoteBox) {
    quoteBox = document.createElement("div");
    quoteBox.id = QUOTE_BOX_ID;
    host.prepend(quoteBox);
  } else if (quoteBox.parentElement !== host) {
    host.prepend(quoteBox);
  }

  const questionBlock = currentQuote.questionText
    ? `<div class="gpt-quote-meta"><span class="gpt-quote-label">问题</span><div class="gpt-quote-text">${escapeHtml(currentQuote.questionText)}</div></div>`
    : "";

  quoteBox.innerHTML = `
    <div class="gpt-quote-header">
      <span class="gpt-quote-badge">引用</span>
      <button type="button" class="gpt-quote-close" aria-label="移除引用">×</button>
    </div>
    ${questionBlock}
    <div class="gpt-quote-meta">
      <span class="gpt-quote-label">内容</span>
      <div class="gpt-quote-text">${escapeHtml(currentQuote.selectedText)}</div>
    </div>
  `;

  const closeButton = quoteBox.querySelector(".gpt-quote-close");
  closeButton?.addEventListener("click", () => {
    clearQuoteState();
  });
}

function clearQuoteState() {
  const inputEl = getInputElement();
  if (inputEl) {
    const currentText = getInputText(inputEl).trim();
    if (currentText === DEFAULT_PROMPT) {
      setInputText(inputEl, "");
    }
  }

  currentQuote = null;
  const quoteBox = document.getElementById(QUOTE_BOX_ID);
  quoteBox?.remove();
}

function getQuoteHost(inputEl) {
  return (
    inputEl.closest("form") ||
    inputEl.parentElement ||
    inputEl.closest('[data-testid="composer"]') ||
    inputEl.closest("main")
  );
}

function getInputElement() {
  const selectors = [
    "#prompt-textarea",
    'div[id="prompt-textarea"]',
    'div[contenteditable="true"][data-id]',
    'div[contenteditable="true"]',
    "textarea[placeholder]"
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }

  return null;
}

function getInputText(inputEl) {
  if (inputEl.tagName === "TEXTAREA") {
    return inputEl.value || "";
  }

  return inputEl.innerText || inputEl.textContent || "";
}

function setInputText(inputEl, text) {
  inputEl.focus();

  if (inputEl.tagName === "TEXTAREA") {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
    nativeInputValueSetter?.call(inputEl, text);
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  document.execCommand("selectAll", false, null);
  document.execCommand("delete", false, null);

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) {
      document.execCommand("insertLineBreak", false, null);
    }
    if (lines[i]) {
      document.execCommand("insertText", false, lines[i]);
    }
  }

  inputEl.dispatchEvent(new Event("input", { bubbles: true }));
}

function ensureQuoteStyle() {
  if (document.getElementById(QUOTE_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = QUOTE_STYLE_ID;
  style.textContent = `
    #${QUOTE_BOX_ID} {
      margin-bottom: 12px;
      padding: 12px;
      border: 1px solid rgba(59, 130, 246, 0.35);
      border-left: 4px solid rgb(59, 130, 246);
      border-radius: 12px;
      background: rgba(59, 130, 246, 0.08);
      color: inherit;
    }

    #${QUOTE_BOX_ID} .gpt-quote-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }

    #${QUOTE_BOX_ID} .gpt-quote-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(59, 130, 246, 0.14);
      color: rgb(37, 99, 235);
      font-size: 12px;
      font-weight: 600;
      line-height: 20px;
    }

    #${QUOTE_BOX_ID} .gpt-quote-close {
      border: 0;
      background: transparent;
      color: inherit;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      opacity: 0.7;
    }

    #${QUOTE_BOX_ID} .gpt-quote-meta + .gpt-quote-meta {
      margin-top: 10px;
    }

    #${QUOTE_BOX_ID} .gpt-quote-label {
      display: block;
      margin-bottom: 4px;
      font-size: 12px;
      font-weight: 600;
      opacity: 0.75;
    }

    #${QUOTE_BOX_ID} .gpt-quote-text {
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 13px;
      line-height: 1.5;
    }
  `;

  document.head.appendChild(style);
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
