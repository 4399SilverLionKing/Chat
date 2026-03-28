# Chat Tools TypeScript Workspace

这是一个面向 WeFlow 聊天数据的 TypeScript workspace，用来做联系人确认、聊天上下文提取、聊天画像分析，以及在 Codex 会话里基于聊天证据给出回复建议。它既可以直接作为 CLI 工具使用，也可以在仓库根目录配合项目级 `AGENTS.md` 和 `.agents/skills/` 作为 Codex 的协作工作区使用。

## 适用场景

- 想从 WeFlow 里确认某个联系人并读取最近聊天
- 想基于聊天记录生成联系人画像
- 想在交互式 Codex 会话里拿到“下一句怎么回”的建议
- 想在交互式 Codex 会话里结合项目级 skills 做聊天分析与建议

## 核心能力

- `show-contact`：解析联系人并输出结构化 JSON
- `fetch-chat-context`：获取最近聊天或指定时间范围内的聊天上下文
- `analyze-chat-profile`：基于聊天记录生成联系人画像
- Web 批量画像页面：从 WeFlow 拉全部联系人，勾选后串行批量跑画像生成
- 项目级 Codex skills：在仓库内直接组织“联系人确认 -> 聊天取证 -> 分析/建议”的工作流

## 仓库结构

- `apps/cli`：CLI 命令实现
- `packages/shared`：共享模型、配置与 schema
- `config/config.toml`：默认配置文件
- `data`：画像和清洗后的聊天数据输出目录
- `.agents/skills`：项目级 Codex skills
- `docs`：详细使用文档

## 快速开始

1. 安装依赖

```bash
pnpm install
```

2. 按实际环境修改 `config/config.toml`

至少需要确认：

- `weflow.base_url`
- `weflow.token`
- `weflow.wxid` 或 `weflow.wechat_id`

3. 运行常用命令

```bash
pnpm --filter @chat-tools/cli dev -- show-contact
pnpm --filter @chat-tools/cli dev -- fetch-chat-context --recent-count 50
pnpm analyze
pnpm dev:web-server
pnpm dev:web
codex
```

其中：

- `pnpm dev:web-server`：启动本地 API，负责读取联系人和串行触发 CLI
- `pnpm dev:web`：启动前端页面，默认通过 Vite 代理访问本地 API

## 详细教程

完整上手文档见 [docs/getting-started.md](./docs/getting-started.md)。

其中包含：

- 环境准备与配置说明
- CLI 命令详解
- Codex 与项目级 skills 的协作方式
- 推荐工作流与常见问题
