# 高情商回复独立命令设计

## 1. 背景

当前 workspace 已具备 `analyze-chat-profile` 命令，可以从 WeFlow 拉取聊天记录并生成联系人画像。现需在此基础上新增一个独立命令，用于结合：

- `skills/love_chat_summary.md`
- 联系人已有画像文件
- 最近一段聊天记录

生成更贴近当前聊天局面的回复策略，并给出 3 到 5 条可直接发送的候选回复。

该功能的定位不是长期资料沉淀，而是基于最近上下文的即时辅助，因此默认输出到终端，不额外落盘。

## 2. 目标

- 新增独立 CLI 命令 `generate-reply-strategy`
- 命令可按现有规则解析联系人标识，支持 `--wxid` 与 `--wechat-id`
- 命令默认从 TOML 配置读取最近消息条数，并支持命令行覆盖
- 命令读取最近 `N` 条聊天消息作为上下文
- 命令读取 `skills/love_chat_summary.md` 与对应联系人画像
- 命令调用 Codex 输出：
  - 当前局面判断
  - 回复策略
  - 3 到 5 条可直接发送的候选回复
  - 简短使用提醒

## 3. 非目标

- 不自动发送消息
- 不在本次命令中重新生成联系人画像
- 不引入多轮会话状态管理
- 不新增回复结果文件持久化
- 不顺手重构现有画像分析为通用分析框架

## 4. 用户接口设计

### 4.1 CLI 命令

新增命令：

```bash
pnpm --filter @chat-tools/cli dev -- generate-reply-strategy
pnpm --filter @chat-tools/cli dev -- generate-reply-strategy --wxid wxid_xxx
pnpm --filter @chat-tools/cli dev -- generate-reply-strategy --wechat-id my_wechat_id
pnpm --filter @chat-tools/cli dev -- generate-reply-strategy --recent-count 50
```

命令参数：

- `--wxid <wxid>`
- `--wechat-id <wechatId>`
- `--recent-count <number>`

联系人解析规则与 `analyze-chat-profile` 完全一致：

- 优先使用命令行传入标识
- 若命令行未传，则回退到 `config/config.toml` 中的联系人配置

### 4.2 TOML 配置

新增配置段：

```toml
[reply_strategy]
recent_count = 30
```

语义：

- `recent_count` 表示生成回复策略时默认取最近多少条消息
- 必须为正整数
- 若命令行传入 `--recent-count`，则命令行优先

设计上不将该参数塞入 `weflow.messages`，因为它仅服务于回复策略场景，不应影响其他消息拉取逻辑的默认配置语义。

## 5. 输出设计

命令执行成功后，将 Markdown 文本直接打印到标准输出，固定包含以下模块：

- `## 当前局面判断`
- `## 回复策略`
- `## 候选回复`
- `## 使用提醒`

各模块职责：

- 当前局面判断：总结最近聊天气氛、对方状态、当前更适合推进、维持还是收一点
- 回复策略：给出话题方向、表达方式、节奏建议、边界提醒
- 候选回复：给出 3 到 5 条中文候选回复，要求可直接发送，但仍需贴近真实语气
- 使用提醒：给出简短风险提示，避免用户机械复制或过度推进

## 6. 失败与降级策略

### 6.1 缺少画像文件

若 `data/profiles/<wxid>.md` 不存在，则命令直接失败并报错，提示用户先运行：

```bash
analyze-chat-profile
```

原因：

- 该功能质量显著依赖已有画像
- 缺画像时静默降级会导致输出质量不稳定
- 明确失败更容易暴露前置依赖

### 6.2 最近消息为空

若联系人最近消息为空，则命令直接失败并报错。

### 6.3 消息条数不足

若最近消息不足 `recent_count`，则按实际拿到的条数继续生成，不报错。

## 7. 实现方案

### 7.1 采用平行扩展而非泛化重构

本次采用与现有 `analyze-chat-profile` 平行的实现方式，新建一条 `reply-strategy` 分析链路，而不是先抽象统一分析框架。

原因：

- 当前需求边界明确，优先控制改动范围
- 现有画像分析链路已经稳定，便于按相同骨架扩展
- 避免把单一功能演进成大规模重构任务

### 7.2 目录与模块

新增文件建议：

- `apps/cli/src/commands/generate-reply-strategy.ts`
- `apps/cli/src/features/reply-strategy/analyzer.ts`
- `apps/cli/src/features/reply-strategy/prompt-builder.ts`
- `apps/cli/prompts/reply_strategy.md`

需要修改的现有文件：

- `apps/cli/src/cli.ts`
- `packages/shared/src/config/models.ts`
- `packages/shared/src/config/schemas.ts`
- `config/config.toml`
- `README.md`

### 7.3 复用边界

复用现有能力：

- `chooseContactIdentifier`
- `resolveContact`
- `collectMessages`
- `sanitizeMessages`
- `CodexRunner`
- `FileStore.getProfilePath(wxid)`

不复用的部分：

- 不复用 `ChatProfileAnalyzer` 作为父类或通用分析器
- 不复用现有画像 prompt 模板

原因是当前代码量不大，直接平行扩展可获得更清晰的职责边界，后续若命令种类继续增加，再考虑抽象共用分析框架。

## 8. 数据流

命令主流程如下：

1. 读取并解析配置
2. 解析联系人标识
3. 解析最终使用的 `recentCount`
4. 解析联系人信息，得到 `wxid`、显示名、`talker`
5. 拉取消息列表
6. 按时间排序后截取最近 `N` 条消息
7. 标准化并清洗消息文本
8. 定位并校验画像文件路径
9. 构造 reply strategy prompt
10. 调用 Codex 生成策略结果
11. 将结果输出到标准输出

其中第 6 步需要明确是“先按时间正序整理，再取最后 N 条”，以保证上下文是最近一段真实对话，而不是接口返回顺序偶然决定的结果。

## 9. Prompt 设计

新增 `apps/cli/prompts/reply_strategy.md`，要求 Codex：

- 参考 `skills/love_chat_summary.md`
- 参考指定联系人画像文件
- 重点分析最近这段对话的聊天局面，而不是复述整个人物画像
- 输出内容必须兼顾自然、尊重边界、可执行性
- 候选回复禁止油腻、套路化、施压式、审问式表达
- 候选回复应贴近当前局面，不做脱离上下文的强行升级

`prompt-builder` 负责将以下信息拼入提示：

- 目标联系人名称
- 联系人标识
- 画像文件路径
- 最近消息条数

Codex 的标准输入中仍然附带清洗后的聊天记录文本。画像文件与 `love_chat_summary` 的读取方式保持与现有实现一致，即通过 prompt 指示 Codex 在 workspace 中读取文件。

## 10. 错误处理

需要新增或明确的错误场景：

- 联系人解析失败
- 画像文件不存在
- 最近消息为空
- `recent_count` 非正整数
- Codex 返回空输出或执行失败

错误信息应具体到可执行动作，例如：

- “Reply strategy profile not found: <path>. Run analyze-chat-profile first.”
- “Reply strategy requires at least one recent message.”
- “reply_strategy.recent_count must be a positive integer.”

## 11. 测试方案

### 11.1 配置测试

在 `packages/shared/tests/config-schemas.test.ts` 中补充：

- 能解析 `[reply_strategy] recent_count`
- 非法值会被拒绝

### 11.2 CLI 注册测试

在 `apps/cli/tests/cli.test.ts` 中补充：

- `generate-reply-strategy` 已注册到 CLI

### 11.3 命令测试

新增命令测试，覆盖：

- 未传 `--recent-count` 时使用 TOML 默认值
- 传入 `--recent-count` 时覆盖配置值
- 缺少画像时抛出清晰错误
- 成功时将结果写入标准输出

### 11.4 Prompt Builder 测试

新增测试覆盖：

- 默认读取 reply strategy 模板
- 提示中包含联系人名、标识、画像路径、最近消息数

### 11.5 Analyzer 测试

新增测试覆盖：

- 只截取最近 `N` 条消息
- 消息不足 `N` 条时按实际消息继续
- 最近消息为空时报错
- 传给 `CodexRunner` 的内容为清洗后的最近上下文

## 12. 风险与后续演进

### 12.1 当前风险

- 画像内容由 LLM 生成，若画像本身偏差较大，会影响回复建议质量
- “高情商”本质上仍然是策略建议，不能保证对所有关系阶段都适用
- 若最近消息样本太短，策略会更依赖已有画像，局面判断可能偏泛

### 12.2 后续可演进方向

本次不纳入实现，但后续可考虑：

- 增加“只输出候选回复”或“只输出策略”的模式开关
- 增加语气风格参数，例如自然、俏皮、克制
- 增加可选输出文件保存能力
- 当画像缺失时提供显式 `--allow-without-profile` 降级模式

## 13. 验收标准

满足以下条件即可认为本次功能完成：

- CLI 存在 `generate-reply-strategy` 命令
- 支持 `--wxid`、`--wechat-id`、`--recent-count`
- 默认从 TOML 读取 `reply_strategy.recent_count`
- 能读取对应画像文件并校验其存在性
- 能基于最近 `N` 条消息生成 Markdown 结果
- 结果中包含策略分析与 3 到 5 条候选回复
- 缺少画像或缺少最近消息时，错误行为明确
- 相关自动化测试通过
