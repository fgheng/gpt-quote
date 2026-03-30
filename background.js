// 插件安装时创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "quote-selection",
    title: "引用此内容",
    contexts: ["selection"],
    documentUrlPatterns: ["https://chatgpt.com/*"]
  });
});

// 右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "quote-selection") {
    const selectedText = info.selectionText;
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: quoteSelectedText,
      args: [selectedText]
    });
  }
});

// 注入到页面的函数
function quoteSelectedText(selectedText) {
  // 查找选中文本所在的回答块
  const findCorrespondingQuestion = (selectedText) => {
    // 获取所有对话轮次
    const allTurns = document.querySelectorAll('[data-testid^="conversation-turn-"]');
    
    let targetAnswerTurn = null;
    let questionText = null;

    for (let i = 0; i < allTurns.length; i++) {
      const turn = allTurns[i];
      const turnText = turn.innerText || turn.textContent || "";
      
      if (turnText.includes(selectedText.trim())) {
        targetAnswerTurn = turn;
        // 查找前面的用户问题（往前找最近的用户消息）
        for (let j = i - 1; j >= 0; j--) {
          const prevTurn = allTurns[j];
          // 用户消息通常包含特定标识
          const isUserMessage = 
            prevTurn.querySelector('[data-message-author-role="user"]') ||
            prevTurn.querySelector('.whitespace-pre-wrap') ||
            prevTurn.closest('[data-testid*="user"]');
          
          if (isUserMessage) {
            const msgEl = prevTurn.querySelector('[data-message-author-role="user"]') || 
                          prevTurn.querySelector('.whitespace-pre-wrap');
            questionText = msgEl ? (msgEl.innerText || msgEl.textContent).trim() : null;
            break;
          }
        }
        break;
      }
    }

    // 如果通过 data-testid 没找到，尝试通过 article 标签查找
    if (!targetAnswerTurn) {
      const articles = document.querySelectorAll('article[data-testid]');
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        const articleText = article.innerText || article.textContent || "";
        
        if (articleText.includes(selectedText.trim())) {
          targetAnswerTurn = article;
          // 往前查找用户消息
          for (let j = i - 1; j >= 0; j--) {
            const prevArticle = articles[j];
            const isUser = prevArticle.getAttribute('data-testid')?.includes('user') ||
                           prevArticle.querySelector('[data-message-author-role="user"]');
            if (isUser) {
              questionText = (prevArticle.innerText || prevArticle.textContent || "").trim();
              break;
            }
          }
          break;
        }
      }
    }

    return questionText;
  };

  const questionText = findCorrespondingQuestion(selectedText);

  // 构造引用内容
  let quoteContent = "";
  if (questionText) {
    quoteContent = `「${questionText}」\n\n「${selectedText}」\n\n这是你之前的回答，`;
  } else {
    quoteContent = `「${selectedText}」\n\n这是你之前的回答，`;
  }

  // 填充到聊天输入框
  const fillChatInput = (text) => {
    // ChatGPT 的输入框选择器（尝试多种可能）
    const selectors = [
      '#prompt-textarea',
      'div[id="prompt-textarea"]',
      'textarea[placeholder]',
      '[contenteditable="true"][data-id="root"]',
      'div[contenteditable="true"]'
    ];

    let inputEl = null;
    for (const selector of selectors) {
      inputEl = document.querySelector(selector);
      if (inputEl) break;
    }

    if (!inputEl) {
      alert('未找到聊天输入框，请检查页面是否已加载完成');
      return;
    }

    // 聚焦输入框
    inputEl.focus();

    // 根据元素类型设置内容
    if (inputEl.tagName === 'TEXTAREA') {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      ).set;
      nativeInputValueSetter.call(inputEl, text);
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (inputEl.contentEditable === 'true') {
      // 对于 contenteditable 元素，使用 execCommand 或直接操作
      inputEl.innerHTML = '';
      
      // 使用 document.execCommand 插入文本
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
      
      // 将换行符转换为 <br> 并插入
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

    // 滚动到输入框
    inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  fillChatInput(quoteContent);
}
