# Chat Tools TypeScript Workspace

当前 TypeScript 重写版位于这个 workspace 下。

## 环境

- Node.js 22+
- `pnpm`

## 安装

```bash
pnpm install
```

## 运行测试

```bash
pnpm test
pnpm typecheck
```

## 运行 CLI

```bash
pnpm analyze
pnpm --filter @chat-tools/cli dev -- analyze-chat-profile
pnpm --filter @chat-tools/cli dev -- analyze-chat-profile --wxid wxid_xxx
pnpm --filter @chat-tools/cli dev -- analyze-chat-profile --wechat-id my_wechat_id
pnpm reply
pnpm --filter @chat-tools/cli dev -- generate-reply-strategy
pnpm --filter @chat-tools/cli dev -- generate-reply-strategy --recent-count 50
pnpm --filter @chat-tools/cli dev -- show-contact
pnpm --filter @chat-tools/cli dev -- show-contact --wechat-id my_wechat_id
pnpm --filter @chat-tools/cli dev -- fetch-chat-context --recent-count 80
pnpm --filter @chat-tools/cli dev -- fetch-chat-context --format json --wechat-id my_wechat_id
```

默认读取 `config/config.toml`。如命令行未传联系人标识，则回退到 TOML 中的 `weflow.wxid` 或 `weflow.wechat_id`。

`generate-reply-strategy` 会读取 `reply_strategy.recent_count` 作为默认最近消息条数，并支持命令行 `--recent-count` 覆盖。

该命令依赖已有联系人画像；如果对应画像不存在，请先运行 `analyze-chat-profile`。

命令成功后会默认保存到 `storage.reply_dir`，文件名格式为 `YYYY-MM-DD-<wxid>.md`，终端只输出保存路径。

`show-contact` 会输出结构化联系人 JSON，适合在交互式 Codex 会话中先确认目标联系人。

`fetch-chat-context` 默认输出清洗后的文本聊天上下文，也支持 `--format json` 输出结构化消息。

## 项目级 Codex Skills

仓库根目录提供项目级 [AGENTS.md](./AGENTS.md) 和 `.agents/skills/`：

- `love-chat-coach`
- `weflow-chat-access`
- `coach-session`

推荐做法是在项目根目录启动交互式 Codex，让它自动读取这些项目级规则与 skills，再在需要时调用本仓库 CLI：

```bash
codex
```

典型用法：

- 先用 `show-contact` 确认联系人
- 再用 `fetch-chat-context` 取最近聊天
- 必要时再调用 `analyze-chat-profile` 或 `generate-reply-strategy`
