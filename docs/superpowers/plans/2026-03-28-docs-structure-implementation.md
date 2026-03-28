# 文档入口与上手教程重构实施计划

> **面向代理执行者：** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 将根目录 `README.md` 收敛为项目介绍页，并在 `docs/getting-started.md` 提供一篇完整上手教程。

**架构：** 采用“首页入口 + 单篇完整教程”的双层结构。`README.md` 负责介绍项目定位、核心能力和文档入口，`docs/getting-started.md` 负责安装、配置、CLI 使用和 Codex 协作方式的连续说明。

**技术栈：** Markdown、pnpm workspace、现有 CLI 命令与项目级 skills

---

## Chunk 1: 事实梳理

### 任务 1：确认文档需要覆盖的事实来源

**Files:**
- Modify: `README.md`
- Create: `docs/getting-started.md`
- Reference: `apps/cli/src/cli.ts`
- Reference: `apps/cli/src/commands/analyze-chat-profile.ts`
- Reference: `apps/cli/src/commands/generate-reply-strategy.ts`
- Reference: `apps/cli/src/commands/fetch-chat-context.ts`
- Reference: `apps/cli/src/commands/show-contact.ts`
- Reference: `config/config.toml`
- Reference: `AGENTS.md`
- Reference: `.agents/skills/love-chat-coach/SKILL.md`
- Reference: `.agents/skills/weflow-chat-access/SKILL.md`
- Reference: `.agents/skills/coach-session/SKILL.md`

- [ ] **步骤 1：梳理 CLI 命令与别名**

记录以下命令与其职责：

- `analyze-chat-profile`
- `generate-reply-strategy`
- `fetch-chat-context`
- `show-contact`
- 根目录 `pnpm analyze` / `pnpm reply` 脚本

- [ ] **步骤 2：梳理配置与输出目录**

确认 `config/config.toml` 中下列配置项会在教程中出现：

- `storage.*`
- `weflow.*`
- `weflow.messages.*`
- `reply_strategy.recent_count`

- [ ] **步骤 3：梳理 Codex 协作入口**

确认教程中需要说明：

- 根目录 `AGENTS.md`
- `.agents/skills/` 下的 3 个项目级 skills
- 在仓库根目录启动 `codex` 的推荐方式

## Chunk 2: README 重写

### 任务 2：把 README 收敛成项目入口页

**Files:**
- Modify: `README.md`

- [ ] **步骤 1：重写标题下简介**

用 2 到 4 句话说明项目定位、适用场景和工作方式。

- [ ] **步骤 2：保留核心能力概览**

只列出关键能力，不展开为长命令手册。

- [ ] **步骤 3：加入最小化快速开始**

仅保留安装、配置、启动命令和教程入口。

- [ ] **步骤 4：加入文档链接**

明确告诉读者完整教程在 `docs/getting-started.md`。

## Chunk 3: 完整教程编写

### 任务 3：新增 docs 主教程

**Files:**
- Create: `docs/getting-started.md`

- [ ] **步骤 1：编写从零上手结构**

包含项目简介、适用场景、环境要求、安装依赖、配置说明、CLI 快速上手。

- [ ] **步骤 2：补齐命令详解**

对 `show-contact`、`fetch-chat-context`、`analyze-chat-profile`、`generate-reply-strategy` 写出用途、典型命令和输出说明。

- [ ] **步骤 3：补齐 Codex 协作部分**

说明项目级 `AGENTS.md`、skills、推荐使用流程和与 CLI 的配合方式。

- [ ] **步骤 4：补齐推荐工作流与常见问题**

给出最小实践路径和常见排查点。

## Chunk 4: 校验

### 任务 4：检查文档入口与内容一致性

**Files:**
- Modify: `README.md`
- Create: `docs/getting-started.md`

- [ ] **步骤 1：检查 README 与 docs 是否职责重复**

确保长篇命令说明只保留在 `docs/getting-started.md`。

- [ ] **步骤 2：检查链接和路径**

确认 `README.md` 中的教程链接有效，文中提到的路径都存在。

- [ ] **步骤 3：检查命令与配置描述是否和代码一致**

对照 CLI 注册文件和 `config/config.toml`，避免描述漂移。
