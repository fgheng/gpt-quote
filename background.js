chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "quote-selection",
    title: "引用此内容",
    contexts: ["selection"],
    documentUrlPatterns: ["https://chatgpt.com/*"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "quote-selection" || !tab?.id || !info.selectionText?.trim()) {
    return;
  }

  chrome.tabs.sendMessage(tab.id, {
    action: "quoteText",
    selectedText: info.selectionText
  });
});
