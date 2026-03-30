# GPT Quote

一个 Chrome 浏览器扩展，让你在 ChatGPT 对话中快速引用之前的回答内容。

## 功能

- 在 [chatgpt.com](https://chatgpt.com) 页面中，选中任意回答文本后右键，点击 **"引用此内容"**
- 插件自动将该回答对应的用户提问 + 选中内容填充到聊天输入框，并附上提示词"这是你之前的回答"

**填充格式示例：**

```
「你的原始提问内容」

「你选中的回答内容」

这是你之前的回答，
```

## 安装

1. 克隆或下载本仓库
   ```bash
   git clone https://github.com/fuguoheng/gpt-quote.git
   ```

2. 打开 Chrome，访问 `chrome://extensions/`

3. 右上角开启 **开发者模式**

4. 点击 **加载已解压的扩展程序**，选择本项目目录

## 使用方法

1. 打开 [chatgpt.com](https://chatgpt.com) 进行对话
2. 用鼠标选中 ChatGPT 回答中的某段文字
3. 右键菜单 → 点击 **"引用此内容"**
4. 聊天输入框自动填入引用内容，光标定位在末尾，可直接继续输入追问

## 文件结构

```
gpt-quote/
├── manifest.json       # 插件配置（Manifest V3）
├── background.js       # Service Worker：右键菜单注册与核心逻辑
├── content.js          # 内容脚本：DOM 查询与输入框填充
├── icons/              # 插件图标
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## 权限说明

| 权限 | 用途 |
|------|------|
| `contextMenus` | 注册右键菜单项 |
| `activeTab` | 访问当前标签页 |
| `scripting` | 向页面注入脚本 |
| `host_permissions: chatgpt.com` | 仅作用于 ChatGPT 页面 |

## License

MIT
