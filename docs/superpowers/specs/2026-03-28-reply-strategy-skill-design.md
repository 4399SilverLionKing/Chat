# 回复策略从重命令迁移到独立 Skill 设计

## 1. 背景

当前仓库通过 `generate-reply-strategy` 命令生成回复策略 Markdown 文件，并将产物保存到 `data/reply`。这套方式适合批处理产物，但不适合“看完最近聊天后，立刻问一句该怎么回”的交互式场景。

用户明确希望把“回复策略”做成项目级 skill，用于在 Codex 会话中直接获得回复建议，而不是继续保留为重命令。

## 2. 目标

- 新增独立项目级 skill：`reply-strategy-coach`
- 删除 `generate-reply-strategy` 命令与 `pnpm reply`
- 让回复建议默认通过交互式 skill 产出，而不是写入文件
- 保留 `show-contact`、`fetch-chat-context`、`analyze-chat-profile`
- 将已有画像从“回复建议的前置依赖”降级为“可选增强信息”

## 3. 非目标

- 不删除画像分析能力
- 不新增新的重型 CLI 命令替代 `generate-reply-strategy`
- 不引入自动发消息或自动写回外部系统
- 不把回复建议重新并回 `love-chat-coach`

## 4. 方案选择

本次采用独立 skill 方案，而不是把回复建议继续塞进 `love-chat-coach`。

理由：

- `love-chat-coach` 已承担关系判断、节奏分析、聊天复盘等分析职责
- “教我怎么回复”是高频、即时、面向下一条消息的场景，适合作为单独入口
- 独立 skill 更容易维护触发条件、输出格式和风险约束

## 5. 目标结构

新增：

- `.agents/skills/reply-strategy-coach/SKILL.md`

删除：

- `apps/cli/src/commands/generate-reply-strategy.ts`
- `apps/cli/src/features/reply-strategy/`
- `apps/cli/prompts/reply_strategy.md`
- `apps/cli/tests/generate-reply-strategy-command.test.ts`
- `apps/cli/tests/reply-strategy-analyzer.test.ts`
- `apps/cli/tests/reply-strategy-prompt-builder.test.ts`

同步收口：

- 根目录 `package.json` 中的 `reply` script
- CLI 注册逻辑
- 配置模型中的 `storage.reply_dir`
- 配置模型中的 `reply_strategy.recent_count`
- `FileStore.saveReplyStrategy`

## 6. Skill 设计

### 6.1 职责

`reply-strategy-coach` 专门负责以下问题：

- “这句怎么回更自然？”
- “现在该不该回？”
- “给我 3 到 5 个可直接发的版本”
- “我这轮回复应该推进、维持还是收一点？”

### 6.2 工作流

1. 先判断是否已有足够聊天证据
2. 如果证据不足，转向 `weflow-chat-access`
3. 有最近聊天时，直接基于最近聊天给回复建议
4. 若联系人已确认且仓库内存在 `data/profiles/<wxid>.md`，只在需要长期互动模式时参考画像
5. 不默认要求先运行 `analyze-chat-profile`

### 6.3 输出要求

- 先给当前局面判断
- 再给回复策略
- 再给 3 到 5 条自然候选回复
- 最后补 2 到 4 条使用提醒
- 明确区分高置信判断和低置信推测
- 不提供施压、套路、审问、PUA 风格建议

## 7. 现有 Skills 的协同

- `coach-session`：将“生成回复建议”路由到 `reply-strategy-coach`
- `love-chat-coach`：保留分析与复盘职责，不再把回复建议作为主入口能力
- `weflow-chat-access`：继续负责联系人确认、最近聊天获取和画像按需复用

## 8. 文档调整

- `README.md`：把“回复策略生成文件”改成“交互式回复建议 skill”
- `docs/getting-started.md`：删除 `pnpm reply` 和 `generate-reply-strategy` 用法
- 教程中的推荐工作流改为：
  - `show-contact`
  - `fetch-chat-context`
  - 需要长期模式时再 `analyze-chat-profile`
  - 回复建议通过 `reply-strategy-coach` 在 Codex 会话中完成

## 9. 预期结果

调整后，仓库的职责会更清晰：

- CLI 负责取证和画像
- Skill 负责交互式分析与回复建议
- 用户不再需要为“下一句怎么回”运行一个保存 Markdown 文件的重命令
