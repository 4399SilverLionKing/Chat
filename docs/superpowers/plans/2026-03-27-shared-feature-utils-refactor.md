# Shared Feature Utils Refactor 实施计划

> **面向代理执行者：** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 将 `chat-profile` 与 `reply-strategy` 共用的聊天上下文工具提取到 `apps/cli/src/features/shared`。

**架构：** 保持两个 analyzer 和各自 prompt builder 不动，只迁移 `contact-resolver.ts` 与 `message-sanitizer.ts` 到共享目录，并更新 commands、features、tests 的 import。这样能降低跨 feature 依赖而不引入额外抽象。

**技术栈：** TypeScript、Vitest

---

## Chunk 1: Shared Utilities

### 任务 1：先写失败测试

**Files:**
- Modify: `apps/cli/tests/contact-resolver.test.ts`
- Modify: `apps/cli/tests/message-sanitizer.test.ts`

- [ ] **步骤 1：将测试导入路径改为 `features/shared`**
- [ ] **步骤 2：运行目标测试并确认因模块不存在而失败**

### 任务 2：实现最小重构

**Files:**
- Create: `apps/cli/src/features/shared/contact-resolver.ts`
- Create: `apps/cli/src/features/shared/message-sanitizer.ts`
- Delete: `apps/cli/src/features/chat-profile/contact-resolver.ts`
- Delete: `apps/cli/src/features/chat-profile/message-sanitizer.ts`
- Modify: `apps/cli/src/features/chat-profile/analyzer.ts`
- Modify: `apps/cli/src/features/reply-strategy/analyzer.ts`
- Modify: `apps/cli/src/commands/analyze-chat-profile.ts`
- Modify: `apps/cli/src/commands/generate-reply-strategy.ts`

- [ ] **步骤 1：迁移共享文件到 `features/shared`**
- [ ] **步骤 2：更新所有生产代码 import**
- [ ] **步骤 3：运行相关测试并确认通过**

