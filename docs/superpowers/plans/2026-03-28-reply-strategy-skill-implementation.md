# 回复策略 Skill 化与命令移除实施计划

> **面向代理执行者：** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 删除 `generate-reply-strategy` 命令并新增独立 `reply-strategy-coach` 项目级 skill。

**架构：** CLI 只保留联系人确认、聊天取证和画像分析；回复建议迁移为项目级 skill，通过 `coach-session` 和 `weflow-chat-access` 协同触发。共享配置和文件存储接口同步收口，移除只为旧命令服务的字段与 API。

**技术栈：** TypeScript、Vitest、Markdown、项目级 Codex skills

---

## Chunk 1: CLI 行为收口

### 任务 1：移除回复策略命令入口

**Files:**
- Modify: `apps/cli/src/cli.ts`
- Delete: `apps/cli/src/commands/generate-reply-strategy.ts`
- Modify: `apps/cli/tests/cli.test.ts`
- Delete: `apps/cli/tests/generate-reply-strategy-command.test.ts`
- Modify: `package.json`

- [ ] **步骤 1：编写失败测试**

在 `apps/cli/tests/cli.test.ts` 中改为断言 CLI 只注册：

- `analyze-chat-profile`
- `fetch-chat-context`
- `show-contact`

并明确断言不再包含 `generate-reply-strategy`。

- [ ] **步骤 2：运行测试并确认它失败**

Run: `pnpm --filter @chat-tools/cli test -- tests/cli.test.ts`
Expected: FAIL because CLI still registers `generate-reply-strategy`

- [ ] **步骤 3：实现最小修改**

移除 `apps/cli/src/cli.ts` 中对 `generate-reply-strategy` 的导入、依赖拼装与注册。

删除：

- `apps/cli/src/commands/generate-reply-strategy.ts`
- `apps/cli/tests/generate-reply-strategy-command.test.ts`

删除根脚本中的：

- `package.json` -> `scripts.reply`

- [ ] **步骤 4：运行测试并确认它通过**

Run: `pnpm --filter @chat-tools/cli test -- tests/cli.test.ts`
Expected: PASS

## Chunk 2: 配置与存储收口

### 任务 2：删除旧命令专属配置与存储接口

**Files:**
- Modify: `packages/shared/src/config/models.ts`
- Modify: `packages/shared/src/config/schemas.ts`
- Modify: `packages/shared/tests/config-schemas.test.ts`
- Modify: `apps/cli/src/config/load-config.ts`
- Modify: `apps/cli/tests/load-config.test.ts`
- Modify: `apps/cli/src/core/file-store.ts`
- Modify: `apps/cli/tests/file-store.test.ts`
- Modify: `config/config.toml`
- Modify: `apps/cli/src/commands/analyze-chat-profile.ts`
- Modify: `apps/cli/tests/show-contact-command.test.ts`
- Modify: `apps/cli/tests/fetch-chat-context-command.test.ts`

- [ ] **步骤 1：编写失败测试**

先改测试，去掉以下结构：

- `storage.replyDir`
- `replyStrategy.recentCount`
- `reply_dir`
- `[reply_strategy]`
- `saveReplyStrategy`

- [ ] **步骤 2：运行测试并确认它失败**

Run: `pnpm --filter @chat-tools/cli test -- tests/load-config.test.ts tests/file-store.test.ts tests/show-contact-command.test.ts tests/fetch-chat-context-command.test.ts && pnpm --filter @chat-tools/shared test -- tests/config-schemas.test.ts`
Expected: FAIL because production code still expects removed fields

- [ ] **步骤 3：实现最小修改**

在生产代码中同步删除：

- `StorageConfig.replyDir`
- `ReplyStrategyConfig`
- `AppConfig.replyStrategy`
- `reply_strategy` schema
- `loadConfig` 对 `replyDir` 的路径解析
- `FileStore.saveReplyStrategy`
- `analyze-chat-profile.ts` 中传入 `replyDir`

- [ ] **步骤 4：运行测试并确认它通过**

Run: `pnpm --filter @chat-tools/cli test -- tests/load-config.test.ts tests/file-store.test.ts tests/show-contact-command.test.ts tests/fetch-chat-context-command.test.ts && pnpm --filter @chat-tools/shared test -- tests/config-schemas.test.ts`
Expected: PASS

## Chunk 3: 删除回复策略实现层

### 任务 3：移除 reply-strategy 特性代码

**Files:**
- Delete: `apps/cli/src/features/reply-strategy/analyzer.ts`
- Delete: `apps/cli/src/features/reply-strategy/prompt-builder.ts`
- Delete: `apps/cli/prompts/reply_strategy.md`
- Delete: `apps/cli/tests/reply-strategy-analyzer.test.ts`
- Delete: `apps/cli/tests/reply-strategy-prompt-builder.test.ts`

- [ ] **步骤 1：确认无剩余引用**

搜索 `ReplyStrategyAnalyzer`、`buildReplyStrategyPrompt`、`reply_strategy.md`。

- [ ] **步骤 2：删除实现与测试**

删除回复策略实现层与其测试。

- [ ] **步骤 3：运行 CLI 相关测试**

Run: `pnpm --filter @chat-tools/cli test`
Expected: PASS with no reply-strategy tests remaining

## Chunk 4: 新 Skill 与文档迁移

### 任务 4：新增独立 skill 并更新现有技能路由

**Files:**
- Create: `.agents/skills/reply-strategy-coach/SKILL.md`
- Modify: `.agents/skills/coach-session/SKILL.md`
- Modify: `.agents/skills/love-chat-coach/SKILL.md`
- Modify: `.agents/skills/weflow-chat-access/SKILL.md`
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `docs/getting-started.md`

- [ ] **步骤 1：编写 skill**

新增 `reply-strategy-coach`，职责聚焦“教我怎么回复”。

- [ ] **步骤 2：更新已有 skill 路由**

让 `coach-session` 将回复建议指向新 skill，并让 `love-chat-coach` 从“主做回复建议”退回到分析与复盘职责。

- [ ] **步骤 3：更新项目与教程文档**

移除所有对 `pnpm reply` 与 `generate-reply-strategy` 的用户向推荐，改成说明回复建议通过 skill 获取。

- [ ] **步骤 4：人工检查文本一致性**

搜索：

- `generate-reply-strategy`
- `pnpm reply`
- `reply_strategy`
- `reply_dir`

确保用户向文档和技能入口里没有旧推荐残留。

## Chunk 5: 最终验证

### 任务 5：运行完整验证并检查差异

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Create: `docs/getting-started.md`
- Create: `.agents/skills/reply-strategy-coach/SKILL.md`

- [ ] **步骤 1：运行测试**

Run: `pnpm --filter @chat-tools/shared test && pnpm --filter @chat-tools/cli test`
Expected: PASS

- [ ] **步骤 2：运行类型检查**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **步骤 3：检查最终差异**

Run: `git diff --stat`
Expected: only reply-strategy removal, new skill, and docs / config cleanup changes
