# 交互式 Codex 教练与项目级 Skills 设计

## 1. 背景

当前 workspace 已具备以下基础能力：

- 通过 `analyze-chat-profile` 从 WeFlow 拉取聊天记录并生成联系人画像
- 通过 `generate-reply-strategy` 基于已有画像和最近聊天生成回复建议
- 在仓库内保留了一份偏恋爱聊天分析导向的参考文档 `skills/love_chat_summary.md`

现需新增一套更适合交互式使用的能力组织方式，使用户可以：

- 在项目根目录启动交互式 Codex 终端
- 让 Codex 自动继承本项目的恋爱聊天分析规则与会话编排规则
- 在需要时通过本仓库提供的命令脚本获取 WeFlow 联系人与聊天上下文
- 用自然语言直接询问“教练”问题，例如关系判断、聊天复盘、回复建议、局面分析

该能力的重点不是再新增一个单一命令，而是为交互式 Codex 提供项目级规则、技能包和稳定的命令入口。

## 2. 目标

- 在仓库根目录新增项目级 `AGENTS.md`
- 将现有恋爱聊天分析规则重组为官方可识别的项目级 skill
- 在仓库内采用 `.agents/skills/<skill-name>/SKILL.md` 的组织方式
- 新增用于交互式 Codex 调用的薄命令入口，以便稳定获取 WeFlow 数据
- 让 Codex 在交互式会话中可以基于：
  - 项目级规则
  - 恋爱聊天分析 skill
  - WeFlow 数据访问 skill
  - 会话编排 skill
  - 仓库内命令脚本
  执行更稳定的聊天分析与建议工作流

## 3. 非目标

- 不实现自动发消息
- 不在本次设计中引入多轮持久化会话管理
- 不将所有分析场景统一重构为一个大型通用框架
- 不依赖 skill 自己直接手写 HTTP 请求来访问 WeFlow
- 不把项目级 skill 退化为普通参考文档堆积

## 4. 官方机制约束

本次设计遵循 Codex 官方的两层组织方式：

- `AGENTS.md` 作为项目级指令入口，供 Codex 在项目上下文中自动读取
- `.agents/skills/<skill-name>/SKILL.md` 作为项目级 skill 存放位置

因此，现有 `skills/love_chat_summary.md` 不能继续作为“项目级 skill 主入口”存在。它最多只能作为旧参考材料，其有效内容需要迁移进新的 `SKILL.md` 结构。

## 5. 目录设计

目标目录结构如下：

```text
Chat/
  AGENTS.md
  .agents/
    skills/
      love-chat-coach/
        SKILL.md
      weflow-chat-access/
        SKILL.md
      coach-session/
        SKILL.md
  apps/
    cli/
      src/
        commands/
          show-contact.ts
          fetch-chat-context.ts
```

现有文件保留并复用：

- `apps/cli/src/commands/analyze-chat-profile.ts`
- `apps/cli/src/commands/generate-reply-strategy.ts`
- `apps/cli/src/integrations/weflow/client.ts`
- `apps/cli/src/features/shared/contact-resolver.ts`
- `apps/cli/src/features/shared/message-sanitizer.ts`

## 6. AGENTS.md 设计

仓库根目录的 `AGENTS.md` 负责声明本项目的全局工作规则，不承载具体实现细节。

建议包含以下内容：

- 本仓库提供项目级 skills，目录为 `.agents/skills/`
- 当用户请求恋爱聊天分析、关系判断、回复建议、对话复盘、基于聊天证据给建议时，应优先匹配相关 skill
- 涉及 WeFlow 数据获取时，应优先调用仓库内命令脚本或 CLI，而不是在会话里临时拼装 HTTP 请求
- 输出应优先基于聊天证据，避免过度脑补
- 建议应自然、尊重边界、避免操控感、施压感、查岗感
- 若证据不足，应明确说明“不足以判断”或“只能给通用建议”

`AGENTS.md` 的职责是定义全局规则与能力入口，不复制各个 skill 的详细流程。

## 7. Skill 设计

### 7.1 `love-chat-coach`

职责：

- 负责恋爱聊天分析的方法论与输出约束
- 负责关系阶段判断、舒适度分析、投入度分析、边界感分析、聊天复盘、建议输出
- 不负责取数

建议内容结构：

- `Use when`
- `Do not use when`
- `Workflow`
- `Output requirements`
- `Guardrails`

关键要求：

- 仅基于聊天证据分析
- 区分高置信和低置信判断
- 不把普通友好强行解释为暧昧
- 不输出油腻、PUA、施压式建议

### 7.2 `weflow-chat-access`

职责：

- 负责定义什么时候需要读取联系人信息、聊天上下文、已有画像或回复建议
- 负责规定优先使用哪些命令来获取数据
- 不负责恋爱分析

建议内容结构：

- `Use when`
- `Workflow`
- `Tooling`
- `Data preference`
- `Failure handling`

关键要求：

- 先识别联系人，再获取聊天
- 优先调用本仓库命令入口
- 在已有本地画像或本地分析足够时，可减少重复取数
- 若联系人无法确认，应要求补充标识，而不是猜测

### 7.3 `coach-session`

职责：

- 负责在交互式会话中进行意图路由与流程编排
- 决定是直接回答，还是先取数、再分析
- 将 `love-chat-coach` 与 `weflow-chat-access` 串联

建议内容结构：

- `Intent routing`
- `Decision tree`
- `Session output modes`
- `Escalation`

关键要求：

- 用户只问原则性问题时，可以直接答，但应说明未基于具体聊天
- 用户要求判断具体关系或当前局面时，应优先检查是否已有足够上下文
- 用户要求基于最近聊天给建议时，应优先获取最近聊天上下文

## 8. 现有 `love_chat_summary.md` 的迁移原则

现有 `skills/love_chat_summary.md` 的有效内容应被吸收到 `love-chat-coach/SKILL.md`，但必须从“经验笔记”改写为“可执行技能文档”。

改写原则如下：

- 保留原文中有价值的聊天原则
- 去掉冗余示例、散文化表达和面向普通读者的文章语气
- 改成对 agent 清晰的结构化约束
- 用“何时使用、如何判断、输出要求、禁止事项”的组织方式重写

## 9. 命令脚本设计

为了让交互式 Codex 稳定使用 WeFlow 数据，新增两个薄命令入口。

### 9.1 `show-contact`

用途：

- 根据 `--wxid` 或 `--wechat-id` 解析目标联系人
- 向 Codex 提供稳定、标准化的联系人信息

命令示例：

```bash
pnpm --filter @chat-tools/cli dev -- show-contact --wxid wxid_xxx
pnpm --filter @chat-tools/cli dev -- show-contact --wechat-id my_wechat_id
```

输出建议：

- 默认输出 JSON
- 至少包含以下字段：
  - `wxid`
  - `wechatId`
  - `displayName`
  - `talker`

设计原因：

- 交互式 Codex 需要一个稳定的联系人确认入口
- 联系人识别应尽量结构化，避免解析自由文本输出

### 9.2 `fetch-chat-context`

用途：

- 获取指定联系人最近一段聊天，供交互式 Codex 直接分析

命令示例：

```bash
pnpm --filter @chat-tools/cli dev -- fetch-chat-context --wechat-id my_wechat_id --recent-count 80
pnpm --filter @chat-tools/cli dev -- fetch-chat-context --wxid wxid_xxx --start 2026-03-01 --end 2026-03-28
```

建议参数：

- `--wxid <wxid>`
- `--wechat-id <wechatId>`
- `--recent-count <number>`
- `--start <YYYY-MM-DD>`
- `--end <YYYY-MM-DD>`
- `--format <text|json>`

输出建议：

- `text`：输出清洗后的对话文本，格式与现有 `sanitizeMessages` 结果保持一致
- `json`：输出结构化消息数组和联系人基础信息，便于后续扩展

设计原因：

- 交互式 Codex 在大量场景下并不需要生成完整画像，只需要最近聊天上下文
- 将“取数”与“分析”拆开后，skill 更容易稳定调用工具

## 10. 与现有命令的关系

现有命令继续保留：

- `analyze-chat-profile`
- `generate-reply-strategy`

角色划分如下：

- `show-contact`：轻量联系人确认
- `fetch-chat-context`：轻量上下文拉取
- `analyze-chat-profile`：重分析，生成长期画像
- `generate-reply-strategy`：重分析，生成即时回复建议

交互式 Codex 优先调用轻量命令；只有在确有必要时，才触发重分析命令。

## 11. 交互式会话工作流

目标工作流如下：

1. 用户在项目根目录启动交互式 Codex
2. Codex 自动读取项目级 `AGENTS.md`
3. Codex 根据用户问题匹配相关 skill
4. 当问题涉及具体联系人或具体聊天局面时：
   - 先调用 `show-contact`
   - 再调用 `fetch-chat-context`
5. 当仅凭最近聊天不足以支撑结论时，可进一步读取已有画像，或调用 `analyze-chat-profile`
6. 最终由 `love-chat-coach` 约束输出分析与建议

典型例子：

- “帮我看看她现在对我是什么感觉”
- “我刚刚这句回得是不是太用力了”
- “基于我们最近聊天，给我三条自然一点的回复”

## 12. 实现顺序

建议实现顺序如下：

1. 新增仓库根 `AGENTS.md`
2. 新建 `.agents/skills/love-chat-coach/SKILL.md`
3. 新建 `.agents/skills/weflow-chat-access/SKILL.md`
4. 新建 `.agents/skills/coach-session/SKILL.md`
5. 将 `skills/love_chat_summary.md` 的有效原则迁移到 `love-chat-coach`
6. 新增 `show-contact` 命令
7. 新增 `fetch-chat-context` 命令
8. 在 `apps/cli/src/cli.ts` 中注册新命令
9. 更新 `README.md`，补充交互式 Codex 使用说明

## 13. 设计取舍

本次设计选择“交互式 Codex + 项目级 skills + 薄命令入口”，而不是以下两种方案：

### 13.1 纯命令式

不采用原因：

- 每增加一种分析意图，都要新增命令
- 难以承接自然语言教练式提问

### 13.2 纯 skill，无命令入口

不采用原因：

- skill 适合定义规则与流程，不适合承担稳定的数据访问实现
- 让 agent 在会话中临时拼装 WeFlow 请求，稳定性与可维护性都较差

当前方案在灵活性与可执行性之间更平衡。

## 14. 用户可见结果

完成后，用户可以：

- 在项目根目录启动交互式 Codex
- 让 Codex 自动继承本项目的教练规则
- 直接提问“教练”类问题
- 让 Codex 在需要时主动调用仓库内命令获取联系人和聊天上下文

用户不需要记住复杂的 prompt 组装方式，也不需要手工把每段聊天复制进 prompt。
