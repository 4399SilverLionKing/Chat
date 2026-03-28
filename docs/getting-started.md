# Chat Tools 完整上手指南

## 1. 项目简介

`chat-tools-ts` 是一个围绕 WeFlow 聊天数据构建的 TypeScript workspace，目标是把“联系人确认、聊天上下文获取、聊天画像分析、交互式回复建议”组织成一套可复用的工作流。

这个仓库有两种典型使用方式：

- 直接运行 CLI 命令，按步骤完成联系人确认、取数和分析
- 在仓库根目录启动交互式 `codex`，让 Codex 自动读取项目级 `AGENTS.md` 和 `.agents/skills/`，再按需调用 CLI

## 2. 适用场景

- 想确认某个微信联系人在 WeFlow 里的结构化信息
- 想拉取最近聊天，先自己看上下文，再决定是否深入分析
- 想生成联系人画像，沉淀长期互动特征
- 想基于最近聊天，必要时结合已有画像，拿到更具体的回复建议
- 想在 Codex 会话中基于聊天证据做关系判断、聊天复盘或回复建议

## 3. 环境要求

- Node.js 22+
- `pnpm`
- 可访问的 WeFlow 服务
- 有效的 WeFlow token

## 4. 安装依赖

在仓库根目录执行：

```bash
pnpm install
```

常用脚本如下：

```bash
pnpm build
pnpm test
pnpm typecheck
pnpm analyze
```

其中：

- `pnpm analyze` 等价于运行 `analyze-chat-profile`

## 5. 配置说明

默认配置文件是 `config/config.toml`。

当前仓库里的示例结构如下：

```toml
[storage]
profile_dir = "./data/profiles"
save_sanitized_chat = true
sanitized_chat_dir = "./data/sanitized"

[weflow]
base_url = "http://127.0.0.1:5032"
timeout_seconds = 30
token = ""
wxid = "wxid_xxx"
wechat_id = "your_wechat_id"

[weflow.messages]
page_size = 200
max_pages = 10
start = ""
end = ""
```

关键字段说明：

- `storage.profile_dir`：联系人画像输出目录
- `storage.save_sanitized_chat`：是否保存清洗后的聊天文本
- `storage.sanitized_chat_dir`：清洗后聊天文本目录
- `weflow.base_url`：WeFlow 服务地址
- `weflow.timeout_seconds`：请求超时秒数
- `weflow.token`：WeFlow token
- `weflow.wxid` / `weflow.wechat_id`：默认联系人标识，命令行不传时会回退到这里
- `weflow.messages.page_size` / `max_pages`：取消息时的分页配置
- `weflow.messages.start` / `end`：默认时间范围，留空表示不额外限制

路径解析规则：

- 如果配置的是相对路径，会相对于当前项目根目录解析
- 默认输出目录都在仓库的 `data/` 下

## 6. CLI 快速上手

所有命令都可以通过以下方式直接执行：

```bash
pnpm --filter @chat-tools/cli dev -- <command>
```

推荐按下面顺序使用：

1. 先确认联系人
2. 再读取最近聊天
3. 需要时生成画像
4. 如果要问“下一句怎么回”，在 Codex 会话里触发 `reply-strategy-coach`

### 第一步：确认联系人

```bash
pnpm --filter @chat-tools/cli dev -- show-contact
pnpm --filter @chat-tools/cli dev -- show-contact --wxid wxid_xxx
pnpm --filter @chat-tools/cli dev -- show-contact --wechat-id my_wechat_id
```

说明：

- 输出是结构化 JSON
- 如果命令行没有传 `--wxid` 或 `--wechat-id`，会回退到 `config/config.toml`
- 这一步很适合在 Codex 会话里先确认目标联系人是否正确

### 第二步：获取聊天上下文

```bash
pnpm --filter @chat-tools/cli dev -- fetch-chat-context
pnpm --filter @chat-tools/cli dev -- fetch-chat-context --recent-count 80
pnpm --filter @chat-tools/cli dev -- fetch-chat-context --start 2026-03-01 --end 2026-03-28
pnpm --filter @chat-tools/cli dev -- fetch-chat-context --format json --wechat-id my_wechat_id
```

说明：

- 默认输出清洗后的文本聊天上下文
- `--format json` 会输出结构化消息与联系人信息
- `--recent-count` 只截取最近 N 条消息
- `--start` / `--end` 可以覆盖配置文件中的默认时间范围

### 第三步：生成联系人画像

```bash
pnpm analyze
pnpm --filter @chat-tools/cli dev -- analyze-chat-profile
pnpm --filter @chat-tools/cli dev -- analyze-chat-profile --wxid wxid_xxx
pnpm --filter @chat-tools/cli dev -- analyze-chat-profile --wechat-id my_wechat_id
```

说明：

- 该命令会拉取消息、调用分析流程，并把结果写入 `storage.profile_dir`
- 终端只输出保存路径，例如 `Profile saved to: ...`
- 如果你后续的问题明显依赖长期互动模式，通常应先确保画像已经存在

### 第四步：在 Codex 里获取回复建议

在仓库根目录启动：

```bash
codex
```

然后直接提类似问题：

- “这是我们最近 20 条聊天，下一句怎么回更自然？”
- “先帮我看局面，再给我 3 个可直接发的版本”
- “这句我现在该不该回，回的话怎么回更轻松？”

如果最近聊天证据已经足够，项目级 `reply-strategy-coach` 会直接给出即时建议；只有问题明显依赖长期互动模式时，才需要参考已有画像。

## 7. 常用命令详解

### `show-contact`

用途：确认某个联系人在 WeFlow 中的结构化身份信息。

适合什么时候用：

- 你不确定 `wxid` / `wechat_id` 是否填对
- 准备在 Codex 会话里先确认分析对象
- 想拿到后续命令可复用的联系人信息

### `fetch-chat-context`

用途：读取最近聊天或指定时间范围内的聊天记录，并做基础清洗。

适合什么时候用：

- 你想先自己看聊天，再决定要不要深入分析
- 你只需要证据，不需要直接生成画像
- 你要在 Codex 里让它基于最近聊天做判断或回复建议

### `analyze-chat-profile`

用途：把某个联系人的一段聊天历史整理成画像文件。

适合什么时候用：

- 你想沉淀长期互动特征
- 你后续的判断需要长期互动模式
- 当前问题已经超出“只看最近几条消息”能回答的范围

### `reply-strategy-coach`

用途：在 Codex 会话里基于最近聊天直接给出回复策略和候选回复。

适合什么时候用：

- 你已经有最近聊天证据
- 你想知道“这句怎么回更自然”
- 你希望拿到几条可以直接发的回复版本

## 8. 在 Codex 中使用这个仓库

仓库根目录已经提供了：

- `AGENTS.md`
- `.agents/skills/love-chat-coach/SKILL.md`
- `.agents/skills/reply-strategy-coach/SKILL.md`
- `.agents/skills/weflow-chat-access/SKILL.md`
- `.agents/skills/coach-session/SKILL.md`

推荐方式是在仓库根目录启动：

```bash
codex
```

这样 Codex 会自动读取项目级规则和 skills，并在合适的时候调用本仓库 CLI。

这套组织方式的作用是：

- `AGENTS.md` 负责项目级约束
- `weflow-chat-access` 负责联系人确认、聊天取证和画像复用顺序
- `love-chat-coach` 负责关系判断、聊天复盘和节奏分析
- `reply-strategy-coach` 负责“怎么回复”的即时建议和候选回复
- `coach-session` 负责把“通用原则 / 局面判断 / 回复建议 / 复盘 / 证据查询”分流到合适流程

如果你是作为仓库使用者而不是 Codex 使用者，也可以完全跳过这部分，只用 CLI。

## 9. 推荐工作流

### 纯 CLI 工作流

```bash
pnpm --filter @chat-tools/cli dev -- show-contact --wechat-id my_wechat_id
pnpm --filter @chat-tools/cli dev -- fetch-chat-context --wechat-id my_wechat_id --recent-count 50
pnpm --filter @chat-tools/cli dev -- analyze-chat-profile --wechat-id my_wechat_id
```

适合：

- 你已经明确目标联系人
- 你想自己控制每一步输入输出
- 你更关心保存下来的产物文件

### Codex 协作工作流

1. 在仓库根目录启动 `codex`
2. 先让 Codex 用 `show-contact` 确认联系人
3. 再让它用 `fetch-chat-context` 获取最近聊天
4. 只有在需要长期画像时，再调用 `analyze-chat-profile`
5. 如果目标是“这句怎么回”，优先让它触发 `reply-strategy-coach`

适合：

- 你希望在终端里直接提问题
- 你想让分析结论更明确地建立在聊天证据上
- 你希望项目级规则自动约束输出风格

## 10. 输出目录与产物

默认情况下，常见产物都在 `data/` 下：

- `data/profiles`：联系人画像
- `data/sanitized`：清洗后的聊天文本

如果修改了 `config/config.toml` 里的 `storage.*` 字段，输出目录会随之变化。

## 11. 常见问题

### 没传 `--wxid` 或 `--wechat-id` 还能运行吗？

可以，只要 `config/config.toml` 里已经配置了 `weflow.wxid` 或 `weflow.wechat_id`。

### 回复建议还需要先跑画像吗？

不需要。只要最近聊天证据已经够用，就可以直接在 Codex 会话里用 `reply-strategy-coach` 获取建议。只有问题明显依赖长期互动模式时，才需要参考已有画像或先运行 `analyze-chat-profile`。

### 什么时候用 `fetch-chat-context`，什么时候直接做画像？

- 只想看证据、判断局面或给当下回复建议时，优先用 `fetch-chat-context`
- 需要长期画像、历史互动特征或更稳定的后续产物时，再用 `analyze-chat-profile`

### 如果命令失败，先查什么？

- `config/config.toml` 是否填写了正确的 `weflow.base_url` 和 `weflow.token`
- 联系人标识是否正确
- WeFlow 服务是否可访问
- 时间范围、分页和最近消息条数是否设置得过于严格
