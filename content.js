// content.js - 辅助脚本，监听来自 background 的消息
// 主要逻辑已在 background.js 的 quoteSelectedText 函数中处理

// 监听扩展消息（备用方案）
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'quoteText') {
    const result = handleQuote(message.selectedText);
    sendResponse({ success: result });
  }
  return true;
});

function handleQuote(selectedText) {
  const questionText = findCorrespondingQuestion(selectedText);
  
  let quoteContent = "";
  if (questionText) {
    quoteContent = `「${questionText}」\n\n「${selectedText}」\n\n这是你之前的回答，`;
  } else {
    quoteContent = `「${selectedText}」\n\n这是你之前的回答，`;
  }

  return fillChatInput(quoteContent);
}

function findCorrespondingQuestion(selectedText) {
  if (!selectedText || !selectedText.trim()) return null;
  
  const trimmedText = selectedText.trim();

  // 方案1: 通过 conversation-turn data-testid 查找
  const allTurns = Array.from(document.querySelectorAll('[data-testid^="conversation-turn-"]'));
  
  for (let i = 0; i < allTurns.length; i++) {
    const turn = allTurns[i];
    const turnText = (turn.innerText || turn.textContent || "").trim();
    
    if (turnText.includes(trimmedText)) {
      // 向前找用户消息
      for (let j = i - 1; j >= 0; j--) {
        const prevTurn = allTurns[j];
        const userMsgEl = prevTurn.querySelector('[data-message-author-role="user"]');
        if (userMsgEl) {
          return (userMsgEl.innerText || userMsgEl.textContent || "").trim();
        }
      }
    }
  }

  // 方案2: 通过 article 标签查找
  const articles = Array.from(document.querySelectorAll('article'));
  
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const articleText = (article.innerText || article.textContent || "").trim();
    
    if (articleText.includes(trimmedText)) {
      // 向前找用户消息
      for (let j = i - 1; j >= 0; j--) {
        const prevArticle = articles[j];
        const testId = prevArticle.getAttribute('data-testid') || '';
        const isUser = testId.includes('user') || 
                       prevArticle.querySelector('[data-message-author-role="user"]');
        
        if (isUser) {
          const msgEl = prevArticle.querySelector('[data-message-author-role="user"]');
          return msgEl 
            ? (msgEl.innerText || msgEl.textContent || "").trim()
            : (prevArticle.innerText || prevArticle.textContent || "").trim();
        }
      }
      break;
    }
  }

  return null;
}

function fillChatInput(text) {
  const selectors = [
    '#prompt-textarea',
    'div[id="prompt-textarea"]',
    'div[contenteditable="true"][data-id]',
    'div[contenteditable="true"]',
    'textarea[placeholder]'
  ];

  let inputEl = null;
  for (const selector of selectors) {
    inputEl = document.querySelector(selector);
    if (inputEl) break;
  }

  if (!inputEl) {
    console.error('[GPT Quote] 未找到聊天输入框');
    return false;
  }

  inputEl.focus();

  if (inputEl.tagName === 'TEXTAREA') {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    ).set;
    nativeInputValueSetter.call(inputEl, text);
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (inputEl.contentEditable === 'true') {
    inputEl.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) {
        document.execCommand('insertLineBreak', false, null);
      }
      if (lines[i]) {
        document.execCommand('insertText', false, lines[i]);
      }
    }
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return true;
}
