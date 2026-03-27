# Reply Strategy Prompt Optimization 实施计划

> **面向代理执行者：** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 提升 reply strategy 的分析深度与候选回复自然度，并确保联系人画像内容直接注入 prompt。

**架构：** 调整 `reply_strategy.md` 的输出要求和风格约束；扩展 `buildReplyStrategyPrompt`，在命令侧读取画像文件正文并注入 prompt；用测试覆盖新的 prompt 内容与读取行为。实现保持现有 analyzer 调用链，不改命令入口和消息处理逻辑。

**技术栈：** TypeScript、Vitest、Markdown prompt templates

---

## Chunk 1: Prompt Builder 与模板

### 任务 1：先写失败测试

**Files:**
- Modify: `apps/cli/tests/reply-strategy-prompt-builder.test.ts`
- Modify: `apps/cli/tests/reply-strategy-analyzer.test.ts`

- [ ] **步骤 1：更新 prompt builder 测试，要求 prompt 包含画像正文并保留路径信息**
- [ ] **步骤 2：更新 analyzer 测试，验证传给 buildPrompt 的参数包含画像路径**
- [ ] **步骤 3：运行 reply strategy 相关测试并确认至少有一处失败**

### 任务 2：实现最小改动让测试通过

**Files:**
- Modify: `apps/cli/src/features/reply-strategy/prompt-builder.ts`
- Modify: `apps/cli/prompts/reply_strategy.md`

- [ ] **步骤 1：在 prompt builder 中读取画像正文并拼接到最终 prompt**
- [ ] **步骤 2：重写 reply strategy 模板，强化温和陪练、冷静拆局、自然候选回复约束**
- [ ] **步骤 3：运行目标测试并确认通过**

