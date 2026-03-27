# 高情商回复独立命令 实施计划

> **面向代理执行者：** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 新增 `generate-reply-strategy` 独立命令，基于联系人画像与最近 `N` 条消息生成回复策略和 3 到 5 条候选回复。

**架构：** 沿用现有 `analyze-chat-profile` 的链路形状，平行新增 `reply-strategy` 功能目录，而不是抽象通用分析框架。命令层负责配置解析与依赖装配，`analyzer` 负责联系人解析、消息截取、画像校验和 Codex 调用，`prompt-builder` 负责模板拼装。

**技术栈：** TypeScript、Node.js ESM、Commander、Zod、Vitest、Execa

---

## 文件结构映射

### 新增文件

- `apps/cli/src/commands/generate-reply-strategy.ts`
- `apps/cli/src/features/reply-strategy/analyzer.ts`
- `apps/cli/src/features/reply-strategy/prompt-builder.ts`
- `apps/cli/prompts/reply_strategy.md`
- `apps/cli/tests/generate-reply-strategy-command.test.ts`
- `apps/cli/tests/reply-strategy-analyzer.test.ts`
- `apps/cli/tests/reply-strategy-prompt-builder.test.ts`

### 修改文件

- `apps/cli/src/cli.ts`
- `packages/shared/src/config/models.ts`
- `packages/shared/src/config/schemas.ts`
- `packages/shared/tests/config-schemas.test.ts`
- `apps/cli/tests/cli.test.ts`
- `apps/cli/tests/load-config.test.ts`
- `config/config.toml`
- `README.md`

### 职责边界

- `generate-reply-strategy.ts`：解析命令行参数、装配默认依赖、调用 analyzer、打印结果
- `reply-strategy/analyzer.ts`：解析联系人、收集消息、截取最近 `N` 条、读取画像路径、构建 prompt、调用 Codex
- `reply-strategy/prompt-builder.ts`：读取 `reply_strategy.md` 模板并注入联系人、画像、最近消息条数
- `reply_strategy.md`：约束 Codex 输出结构和回复风格

## Chunk 1: 配置与共享模型

### 任务 1：为 reply strategy 增加配置模型与解析

**Files:**
- Modify: `packages/shared/src/config/models.ts`
- Modify: `packages/shared/src/config/schemas.ts`
- Modify: `packages/shared/tests/config-schemas.test.ts`
- Modify: `apps/cli/tests/load-config.test.ts`
- Modify: `config/config.toml`

- [ ] **步骤 1：先写失败测试，锁定配置结构**

在 `packages/shared/tests/config-schemas.test.ts` 增加对 `[reply_strategy] recent_count` 的断言，并补一个非法值样例。测试目标：

```ts
expect(config.replyStrategy.recentCount).toBe(30);
expect(() =>
  parseAppConfig({
    storage: { /* ... */ },
    weflow: { /* ... */ },
    reply_strategy: { recent_count: 0 },
  }),
).toThrow();
```

在 `apps/cli/tests/load-config.test.ts` 的测试 TOML 中加入：

```toml
[reply_strategy]
recent_count = 30
```

并断言：

```ts
expect(config.replyStrategy.recentCount).toBe(30);
```

- [ ] **步骤 2：运行配置相关测试并确认失败**

Run:

```bash
pnpm --filter @chat-tools/shared test -- tests/config-schemas.test.ts
pnpm --filter @chat-tools/cli test -- tests/load-config.test.ts
```

Expected:

- `config.replyStrategy` 相关断言失败
- 或 `reply_strategy` 未被识别导致 schema 报错

- [ ] **步骤 3：编写最小实现**

在 `packages/shared/src/config/models.ts` 新增：

```ts
export type ReplyStrategyConfig = {
  recentCount: number;
};
```

并把 `AppConfig` 扩展为：

```ts
export type AppConfig = {
  storage: StorageConfig;
  weflow: WeFlowConfig;
  replyStrategy: ReplyStrategyConfig;
};
```

在 `packages/shared/src/config/schemas.ts` 新增 `replyStrategySchema`，约束 `recent_count` 为正整数：

```ts
const replyStrategySchema = z
  .object({
    recent_count: z.number().int().positive(),
  })
  .transform((value) => ({
    recentCount: value.recent_count,
  }));
```

并把它接入 `appConfigSchema`。`config/config.toml` 补充：

```toml
[reply_strategy]
recent_count = 30
```

- [ ] **步骤 4：重新运行测试并确认通过**

Run:

```bash
pnpm --filter @chat-tools/shared test -- tests/config-schemas.test.ts
pnpm --filter @chat-tools/cli test -- tests/load-config.test.ts
```

Expected:

- 两组测试通过

- [ ] **步骤 5：提交**

```bash
git add packages/shared/src/config/models.ts packages/shared/src/config/schemas.ts packages/shared/tests/config-schemas.test.ts apps/cli/tests/load-config.test.ts
git add -p config/config.toml
git commit -m "feat: add reply strategy config"
```

## Chunk 2: Prompt Builder 与 Analyzer

### 任务 2：先定义 reply strategy 的 prompt-builder 行为

**Files:**
- Create: `apps/cli/src/features/reply-strategy/prompt-builder.ts`
- Create: `apps/cli/prompts/reply_strategy.md`
- Create: `apps/cli/tests/reply-strategy-prompt-builder.test.ts`

- [ ] **步骤 1：编写失败测试，定义 prompt 拼装内容**

新增 `apps/cli/tests/reply-strategy-prompt-builder.test.ts`，覆盖：

- 默认读取 `apps/cli/prompts/reply_strategy.md`
- 拼接后包含联系人名称、联系人标识、画像路径、最近消息条数

核心断言示例：

```ts
expect(prompt).toContain("目标联系人：Alice");
expect(prompt).toContain("联系人标识：wxid_1");
expect(prompt).toContain("画像文件路径：");
expect(prompt).toContain("最近消息条数：30");
```

- [ ] **步骤 2：运行 prompt-builder 测试并确认失败**

Run:

```bash
pnpm --filter @chat-tools/cli test -- tests/reply-strategy-prompt-builder.test.ts
```

Expected:

- 文件不存在
- 或导入失败

- [ ] **步骤 3：编写最小实现**

创建 `apps/cli/prompts/reply_strategy.md`，要求输出：

- `## 当前局面判断`
- `## 回复策略`
- `## 候选回复`
- `## 使用提醒`

同时在模板中明确要求：

- 读取 `skills/love_chat_summary.md`
- 阅读指定画像文件
- 禁止油腻、套路化、施压式、审问式表达
- 候选回复为 3 到 5 条，中文，可直接发送但要贴近当前语气

在 `prompt-builder.ts` 中仿照现有 `chat-profile/prompt-builder.ts`：

```ts
type BuildReplyStrategyPromptOptions = {
  contactName: string;
  identifierValue: string;
  profilePath: string;
  recentCount: number;
  promptTemplatePath?: string;
};
```

返回拼接后的 prompt 字符串。

- [ ] **步骤 4：运行测试并确认通过**

Run:

```bash
pnpm --filter @chat-tools/cli test -- tests/reply-strategy-prompt-builder.test.ts
```

Expected:

- 测试通过

- [ ] **步骤 5：提交**

```bash
git add apps/cli/src/features/reply-strategy/prompt-builder.ts apps/cli/prompts/reply_strategy.md apps/cli/tests/reply-strategy-prompt-builder.test.ts
git commit -m "feat: add reply strategy prompt builder"
```

### 任务 3：实现 reply strategy analyzer，并且只使用最近 N 条消息

**Files:**
- Create: `apps/cli/src/features/reply-strategy/analyzer.ts`
- Create: `apps/cli/tests/reply-strategy-analyzer.test.ts`
- Reuse: `apps/cli/src/features/chat-profile/contact-resolver.ts`
- Reuse: `apps/cli/src/features/chat-profile/message-sanitizer.ts`

- [ ] **步骤 1：编写失败测试，锁定 analyzer 的关键行为**

新增 `apps/cli/tests/reply-strategy-analyzer.test.ts`，至少覆盖：

1. 只截取最近 `N` 条消息
2. 消息不足 `N` 条时按实际条数继续
3. 最近消息为空时报错
4. 缺少画像文件时报错
5. 成功时把 Codex 输出作为结果返回

示例断言：

```ts
expect(codexRunner.run).toHaveBeenCalledWith({
  prompt: "prompt",
  chatText: "我：第二条\n对方：第三条",
  cwd: process.cwd(),
});
```

以及：

```ts
await expect(analyzer.generate(/* ... */)).rejects.toThrow(
  /Reply strategy profile not found/,
);
```

- [ ] **步骤 2：运行 analyzer 测试并确认失败**

Run:

```bash
pnpm --filter @chat-tools/cli test -- tests/reply-strategy-analyzer.test.ts
```

Expected:

- 新文件不存在
- 或断言失败

- [ ] **步骤 3：编写最小实现**

在 `analyzer.ts` 中实现 `ReplyStrategyAnalyzer`，建议接口：

```ts
type GenerateReplyStrategyOptions = {
  identifier: ContactIdentifier;
  pageSize: number;
  maxPages: number;
  start: string;
  end: string;
  recentCount: number;
  cwd: string;
};

type ReplyStrategyResult = {
  markdown: string;
};
```

关键逻辑：

```ts
const contact = await this.resolveContactFn(this.weflowClient, options.identifier);
const messages = await this.collectMessagesFn({ /* ... */ });
const recentMessages = [...messages]
  .sort((left, right) => left.createTime - right.createTime)
  .slice(-options.recentCount);

if (recentMessages.length === 0) {
  throw new Error("Reply strategy requires at least one recent message.");
}

const profilePath = this.fileStore.getProfilePath(contact.wxid);
await access(profilePath);

const sanitizedChat = sanitizeMessages(normalize(recentMessages));
const prompt = await this.buildPromptFn({
  contactName: contact.displayName,
  identifierValue: contact.wxid,
  profilePath,
  recentCount: recentMessages.length,
});

const markdown = await this.codexRunner.run({
  prompt,
  chatText: sanitizedChat,
  cwd: options.cwd,
});
```

注意：

- 先排序，再 `slice(-recentCount)`
- 传给 prompt 的 `recentCount` 用实际消息条数，而不是配置值原样透传
- 不新增共享错误类型，先用清晰的 `Error` 文本即可

- [ ] **步骤 4：运行测试并确认通过**

Run:

```bash
pnpm --filter @chat-tools/cli test -- tests/reply-strategy-analyzer.test.ts
```

Expected:

- 测试通过

- [ ] **步骤 5：提交**

```bash
git add apps/cli/src/features/reply-strategy/analyzer.ts apps/cli/tests/reply-strategy-analyzer.test.ts
git commit -m "feat: add reply strategy analyzer"
```

## Chunk 3: CLI 命令接入

### 任务 4：注册新命令并验证默认值、覆盖值和错误输出

**Files:**
- Create: `apps/cli/src/commands/generate-reply-strategy.ts`
- Create: `apps/cli/tests/generate-reply-strategy-command.test.ts`
- Modify: `apps/cli/src/cli.ts`
- Modify: `apps/cli/tests/cli.test.ts`

- [ ] **步骤 1：编写失败测试，定义命令层契约**

新增 `apps/cli/tests/generate-reply-strategy-command.test.ts`，覆盖：

1. 未传 `--recent-count` 时，使用 `config.replyStrategy.recentCount`
2. 传 `--recent-count 50` 时覆盖配置值
3. 成功时把 analyzer 结果写到 `stdout`
4. 缺画像报错时，`runCli` 返回 `1` 并向 `stderr` 输出错误

同时修改 `apps/cli/tests/cli.test.ts`：

```ts
expect(program.commands.map((command) => command.name())).toContain(
  "generate-reply-strategy",
);
```

- [ ] **步骤 2：运行命令测试并确认失败**

Run:

```bash
pnpm --filter @chat-tools/cli test -- tests/generate-reply-strategy-command.test.ts tests/cli.test.ts
```

Expected:

- 命令未注册
- 或新命令文件缺失

- [ ] **步骤 3：编写最小实现**

在 `generate-reply-strategy.ts` 中仿照 `analyze-chat-profile.ts` 建立依赖装配：

```ts
type GenerateReplyStrategyCliOptions = {
  wechatId?: string;
  wxid?: string;
  recentCount?: string;
};
```

默认依赖需要：

- `loadConfig`
- `cwd`
- `stdout`
- `createAnalyzer`

行为要点：

- `recentCount` 解析优先级：CLI > TOML
- 若 CLI 值不是正整数，直接抛错
- `stdout(result.markdown)`

建议增加一个小型解析函数，避免把 `Number(...)` 散落在命令处理逻辑里：

```ts
function resolveRecentCount(cliValue: string | undefined, configValue: number): number {
  if (cliValue === undefined) {
    return configValue;
  }

  const parsed = Number(cliValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("--recent-count must be a positive integer");
  }

  return parsed;
}
```

在 `apps/cli/src/cli.ts` 注册该命令。

- [ ] **步骤 4：运行测试并确认通过**

Run:

```bash
pnpm --filter @chat-tools/cli test -- tests/generate-reply-strategy-command.test.ts tests/cli.test.ts
```

Expected:

- 测试通过

- [ ] **步骤 5：提交**

```bash
git add apps/cli/src/commands/generate-reply-strategy.ts apps/cli/src/cli.ts apps/cli/tests/generate-reply-strategy-command.test.ts apps/cli/tests/cli.test.ts
git commit -m "feat: add reply strategy command"
```

## Chunk 4: 文档与整体验证

### 任务 5：补充 README，完成命令级与全量验证

**Files:**
- Modify: `README.md`

- [ ] **步骤 1：补 README 使用说明**

在 `README.md` 中补充：

- `generate-reply-strategy` 的运行方式
- `--recent-count` 示例
- 说明该命令依赖已有画像，若缺失需先运行 `analyze-chat-profile`

建议新增示例：

```bash
pnpm --filter @chat-tools/cli dev -- generate-reply-strategy
pnpm --filter @chat-tools/cli dev -- generate-reply-strategy --recent-count 50
```

- [ ] **步骤 2：运行 reply strategy 相关测试**

Run:

```bash
pnpm --filter @chat-tools/cli test -- tests/reply-strategy-prompt-builder.test.ts tests/reply-strategy-analyzer.test.ts tests/generate-reply-strategy-command.test.ts tests/cli.test.ts tests/load-config.test.ts
pnpm --filter @chat-tools/shared test -- tests/config-schemas.test.ts
```

Expected:

- 所有 reply strategy 相关测试通过

- [ ] **步骤 3：运行全量测试与类型检查**

Run:

```bash
pnpm test
pnpm typecheck
```

Expected:

- 全部测试通过
- `typecheck` 无错误

- [ ] **步骤 4：做一次手工冒烟**

在本地环境具备配置与画像文件时运行：

```bash
pnpm --filter @chat-tools/cli dev -- generate-reply-strategy --wxid wxid_jubqjkwdhcbz22
```

Expected:

- 终端直接打印 Markdown
- 输出含 `## 当前局面判断`
- 输出含 `## 候选回复`
- 候选回复条数为 3 到 5 条

- [ ] **步骤 5：提交**

```bash
git add README.md
git commit -m "docs: add reply strategy usage"
```

## 执行备注

- 如果 `collectMessages` 当前会拉取全部页再截断最近 `N` 条，不需要为这次需求提前优化分页停止条件，先保持实现简单。
- 如果后续发现 `reply-strategy` 与 `chat-profile` 共用逻辑越来越多，再单独做一次抽象重构，不在本次计划内提前设计。
- 当前仓库工作树已有其他未提交改动，执行时不要回退无关文件，只处理本计划涉及的文件。
