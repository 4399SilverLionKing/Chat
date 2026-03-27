# 交互式 Codex 教练与项目级 Skills 实施计划

> **面向代理执行者：** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 为仓库新增项目级 `AGENTS.md`、三个官方结构的 skills，以及可供交互式 Codex 调用的 `show-contact` / `fetch-chat-context` 命令。

**架构：** 采用“项目级规则 + skill 编排 + 薄命令入口”的方案。`AGENTS.md` 提供全局规则，`.agents/skills` 提供恋爱聊天分析、WeFlow 访问与会话路由能力，CLI 新命令负责稳定输出联系人与聊天上下文，旧 prompt 引用同步迁移到新 skill 路径。

**技术栈：** TypeScript, Commander, Vitest, Markdown

---

## Chunk 1: 项目级规则与 Skill 文档

### 任务 1：新增项目级 `AGENTS.md`

**Files:**
- Create: `AGENTS.md`

- [ ] **步骤 1：编写文档存在性测试或引用测试**

由于当前仓库没有文档自动化校验，此任务以实现后人工读取验证为准，不单独新增测试框架。

- [ ] **步骤 2：创建 `AGENTS.md`**

写入以下内容：
- 项目级 skills 位于 `.agents/skills/`
- 遇到恋爱聊天分析、关系判断、回复建议、对话复盘时优先匹配相关 skill
- 涉及 WeFlow 数据时优先调用仓库命令，而不是临时拼装请求
- 输出应基于证据，避免脑补，建议需尊重边界

- [ ] **步骤 3：人工检查内容是否覆盖 spec 中的全局规则**

Run: `Get-Content -Path '.\\AGENTS.md'`
Expected: 包含 skills 目录说明、WeFlow 调用约束、输出边界约束

### 任务 2：新增 `love-chat-coach` skill

**Files:**
- Create: `.agents/skills/love-chat-coach/SKILL.md`
- Reference: `skills/love_chat_summary.md`

- [ ] **步骤 1：整理旧文档中的有效原则**

人工提炼：
- 先建立轻松感、熟悉感、信任感
- 不查岗、不施压、不油腻
- 关注舒适度、节奏、边界感、投入度

- [ ] **步骤 2：创建 `SKILL.md`**

结构至少包括：
- frontmatter `name` / `description`
- `Use when`
- `Do not use when`
- `Workflow`
- `Output requirements`
- `Guardrails`

- [ ] **步骤 3：人工检查 skill 是否从“经验笔记”变成“可执行技能文档”**

Run: `Get-Content -Path '.\\.agents\\skills\\love-chat-coach\\SKILL.md'`
Expected: 存在明确触发条件、流程和禁止事项

### 任务 3：新增 `weflow-chat-access` 与 `coach-session` skills

**Files:**
- Create: `.agents/skills/weflow-chat-access/SKILL.md`
- Create: `.agents/skills/coach-session/SKILL.md`

- [ ] **步骤 1：创建 `weflow-chat-access/SKILL.md`**

要求：
- 定义何时需要联系人信息、聊天上下文、画像
- 明确优先调用 `show-contact`、`fetch-chat-context`、已有重分析命令
- 明确联系人不确定时先要求补标识

- [ ] **步骤 2：创建 `coach-session/SKILL.md`**

要求：
- 将用户意图分为原则咨询、关系判断、回复建议、聊天复盘
- 决定何时直接回答，何时先取数再分析
- 输出模式区分短答、完整分析、候选回复

- [ ] **步骤 3：人工检查两个 skill 的职责边界是否清晰**

Run: `Get-Content -Path '.\\.agents\\skills\\weflow-chat-access\\SKILL.md'`
Run: `Get-Content -Path '.\\.agents\\skills\\coach-session\\SKILL.md'`
Expected: 一个偏取数，一个偏会话编排，不大段重复恋爱分析原则

## Chunk 2: 旧引用迁移

### 任务 4：将现有 prompt 引用迁移到新 skill 路径

**Files:**
- Modify: `apps/cli/prompts/chat_profile_analysis.md`
- Modify: `apps/cli/prompts/reply_strategy.md`
- Test: `apps/cli/tests/prompt-builder.test.ts`
- Test: `apps/cli/tests/reply-strategy-prompt-builder.test.ts`

- [ ] **步骤 1：编写失败测试，要求 prompt 引用新路径**

在相关测试中把断言从 `Chat\\skills\\love_chat_summary.md` 改为 `.agents\\skills\\love-chat-coach\\SKILL.md`。

- [ ] **步骤 2：运行相关测试并确认它失败**

Run: `pnpm --filter @chat-tools/cli test -- prompt-builder reply-strategy-prompt-builder`
Expected: FAIL，旧 prompt 仍引用旧路径

- [ ] **步骤 3：修改两个 prompt 模板**

将引用更新为：
- `Chat\\.agents\\skills\\love-chat-coach\\SKILL.md`

- [ ] **步骤 4：重新运行相关测试并确认通过**

Run: `pnpm --filter @chat-tools/cli test -- prompt-builder reply-strategy-prompt-builder`
Expected: PASS

## Chunk 3: `show-contact` 命令

### 任务 5：为 `show-contact` 命令编写测试

**Files:**
- Create: `apps/cli/tests/show-contact-command.test.ts`

- [ ] **步骤 1：编写失败测试**

覆盖：
- 使用配置中的默认标识
- `--wxid` 覆盖配置
- 成功时输出 JSON，包含 `wxid`、`wechatId`、`displayName`、`talker`

- [ ] **步骤 2：运行测试并确认它失败**

Run: `pnpm --filter @chat-tools/cli test -- show-contact-command`
Expected: FAIL，命令尚不存在

### 任务 6：实现 `show-contact` 命令

**Files:**
- Create: `apps/cli/src/commands/show-contact.ts`
- Modify: `apps/cli/src/cli.ts`

- [ ] **步骤 1：实现最小命令**

实现依赖注入风格，复用：
- `loadConfig`
- `chooseContactIdentifier`
- `resolveContact`
- `WeFlowClient`

输出：
- `stdout(JSON.stringify(result, null, 2))`

- [ ] **步骤 2：注册命令**

在 `createCli` 中注册 `show-contact`

- [ ] **步骤 3：运行测试并确认通过**

Run: `pnpm --filter @chat-tools/cli test -- show-contact-command`
Expected: PASS

## Chunk 4: `fetch-chat-context` 命令

### 任务 7：为 `fetch-chat-context` 命令编写失败测试

**Files:**
- Create: `apps/cli/tests/fetch-chat-context-command.test.ts`

- [ ] **步骤 1：编写失败测试**

覆盖：
- `--recent-count` 时只输出最近 N 条、顺序为时间正序
- `--format json` 输出联系人和消息结构
- 默认 `text` 输出经 `sanitizeMessages` 清洗后的对话文本

- [ ] **步骤 2：运行测试并确认它失败**

Run: `pnpm --filter @chat-tools/cli test -- fetch-chat-context-command`
Expected: FAIL，命令尚不存在

### 任务 8：实现 `fetch-chat-context` 命令

**Files:**
- Create: `apps/cli/src/commands/fetch-chat-context.ts`
- Modify: `apps/cli/src/cli.ts`

- [ ] **步骤 1：实现最小命令**

复用：
- `loadConfig`
- `chooseContactIdentifier`
- `resolveContact`
- `collectMessages`
- `sanitizeMessages`
- `WeFlowClient`

行为：
- 获取联系人
- 拉取消息
- 按 `createTime` 正序排序
- 若有 `recent-count` 则取最后 N 条
- `text` 输出 `我/对方：...`
- `json` 输出联系人和结构化消息

- [ ] **步骤 2：注册命令**

在 `createCli` 中注册 `fetch-chat-context`

- [ ] **步骤 3：运行测试并确认通过**

Run: `pnpm --filter @chat-tools/cli test -- fetch-chat-context-command`
Expected: PASS

## Chunk 5: README 与总体验证

### 任务 9：更新 README 使用说明

**Files:**
- Modify: `README.md`

- [ ] **步骤 1：更新文档**

补充：
- 项目级 `AGENTS.md`
- `.agents/skills` 的位置
- `show-contact` / `fetch-chat-context` 示例
- 在项目根目录启动交互式 Codex 的推荐用法

- [ ] **步骤 2：人工检查 README**

Run: `Get-Content -Path '.\\README.md'`
Expected: 包含新命令和项目级 skill 说明

### 任务 10：运行完整验证

**Files:**
- Verify only

- [ ] **步骤 1：运行 CLI 测试**

Run: `pnpm --filter @chat-tools/cli test`
Expected: PASS

- [ ] **步骤 2：运行类型检查**

Run: `pnpm --filter @chat-tools/cli typecheck`
Expected: PASS

- [ ] **步骤 3：检查最终改动**

Run: `git status --short`
Expected: 仅包含本次新增和修改文件，以及用户原有未提交改动
