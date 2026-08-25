# Fuyue Kaomoji Drawer

[简体中文](./README.md) · [English](./README.en.md)

一个可以直接塞进聊天输入区的 React 颜文字抽屉，加上一层可选的本地 MCP 服务。默认只使用用户自己的本地存储；支持手动添加/删除、多重分类、收藏、隐藏的使用频率排序、Unicode 跨设备风险提醒，以及较稳定的兼容版复制。

它的主入口仍是**前端组件 / 一条命令接入**。MCP 是给 AI companion 和桌面客户端的可选入口，不要求普通用户部署服务器。需要团队数据库、REST API 或 SQLite 时，只要实现同一个 `KaomojiRepository` 接口，无需重写界面或工具定义。

## 三种使用方式

| 方式 | 适合谁 | 数据位置 | 需要后端 |
| --- | --- | --- | --- |
| 本地即用 | 个人网页、PWA、小工具 | `localStorage` | 否 |
| Repository 适配 | 聊天应用、团队产品、智能体工具 | REST / IndexedDB / SQLite / MCP | 由你决定 |
| 本地 MCP | Operit、Codex、Claude Desktop 等支持 stdio MCP 的客户端 | 用户目录中的 JSON | 否，仅需 Node.js |

## 从 GitHub 安装

```bash
npm install github:TangfanOVO/fuyue-kaomoji-drawer
```

也可以固定到发布版本：

```bash
npm install github:TangfanOVO/fuyue-kaomoji-drawer#v0.1.1
```

## React 接入

```tsx
import { KaomojiDrawer, createLocalKaomojiRepository } from "@fuyue/kaomoji-drawer";
import "@fuyue/kaomoji-drawer/styles.css";

const repository = createLocalKaomojiRepository();

<KaomojiDrawer
  repository={repository}
  onInsert={(value) => setDraft((draft) => `${draft} ${value}`.trim())}
/>
```

组件不会显示 `useCount`，但每次选用都会在本地累计，并把常用项自然排到前面。

## 给 AI 使用：可选 MCP

MCP 不会模拟点击抽屉。AI 调用 `kaomoji_pick` 后会得到一个颜文字，再把它放进自己的回复；选用次数会写进本地 JSON，常用项随后自然靠前。

先全局安装固定版本：

```bash
npm install -g github:TangfanOVO/fuyue-kaomoji-drawer#v0.1.1
```

再在支持 stdio MCP 的客户端里增加：

```json
{
  "mcpServers": {
    "kaomoji": {
      "command": "fuyue-kaomoji-mcp"
    }
  }
}
```

也可以直接让客户端用 `npx` 拉取 GitHub 版本：

```json
{
  "mcpServers": {
    "kaomoji": {
      "command": "npx",
      "args": ["-y", "github:TangfanOVO/fuyue-kaomoji-drawer#v0.1.1"]
    }
  }
}
```

默认数据文件是 `~/.fuyue-kaomoji/kaomoji.json`。可用环境变量 `FUYUE_KAOMOJI_PATH` 指向另一份 JSON。工具包括：

- `kaomoji_search`：按情绪、名称、分类或颜文字片段搜索；
- `kaomoji_pick`：选择最高排序结果并累计隐藏频率；
- `kaomoji_add` / `kaomoji_remove`：手动增删；
- `kaomoji_favorite`：收藏或取消收藏；
- `kaomoji_inspect`：不入库，只检查乱码与跨设备兼容风险。

Operit 是否能直接使用，取决于当前版本是否支持本地 stdio MCP 与自定义命令。支持时只需配置一次；不支持时仍可单独使用 React 抽屉。

### 让抽屉与 AI 共用频率

浏览器的 `localStorage` 和本地 MCP 的 JSON **不会天然互通**。若想真正实现“人常用什么，AI 也逐渐常用什么”，请让前端 repository 和 MCP 指向同一份后端/文件桥接：

```text
React drawer ── KaomojiRepository ── shared REST/SQLite/JSON bridge
                                      └── MCP tools
```

本仓库故意不附带公网同步账号；共享由使用者自己的应用边界决定。

## 自己接数据源

实现 `KaomojiRepository` 即可连接 REST API、IndexedDB、SQLite 或可选 MCP 工具：

```ts
import type { KaomojiRepository } from "@fuyue/kaomoji-drawer";

const repository: KaomojiRepository = {
  list: () => fetch("/api/kaomoji").then((response) => response.json()).then((data) => data.items),
  upsert: (value, categories, label) => request("/api/kaomoji", { method: "POST", body: { value, categories, label } }),
  remove: (value) => request(`/api/kaomoji/${encodeURIComponent(value)}`, { method: "DELETE" }),
  markUsed: (value) => request("/api/kaomoji/use", { method: "POST", body: { value } }),
  setFavorite: (value, favorite) => request("/api/kaomoji/favorite", { method: "POST", body: { value, favorite } }),
};
```

远程抓取与自动审批应放在你自己的 repository/backend 适配层：保留来源和许可证；可信且跨设备稳定的条目可以自动入库，罕见字形、分类存疑或来源不清的条目应进入人工候选箱。不要把未经审核的网页集合静默发布给所有用户。

## Unicode 兼容说明

部分颜文字在一台设备正常、另一台设备变成黑条或方块，通常是缺少字体字形或叠加符号渲染差异，不一定是 UTF-8 损坏。本组件会：

- 清除只用于文本传输方向控制的字符；
- 保留原始颜文字；
- 标注叠加符号和罕见字形风险；
- 可以生成一份损失细节但更稳定的副本。

兼容检测是风险提示，不是所有设备字体的绝对保证。

## 开发

```bash
npm install
npm test
```

要求 Node.js 20 或更新版本。MCP 使用官方 TypeScript SDK v2 的 stdio transport；协议输出只走 stdout，不在那里打印调试日志。

## 致谢

设计灵感来自 [Pyruslili/KaomojiDrawerKit](https://github.com/Pyruslili/KaomojiDrawerKit)。本实现是独立的 React/TypeScript 组件，并未复制其 Swift 源码或默认数据集。

许可证：[MIT](./LICENSE)。允许个人与商业使用、修改、分发和再许可；请保留版权与许可证声明。
