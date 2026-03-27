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
pnpm dev -- analyze-chat-profile
pnpm --filter @chat-tools/cli dev -- analyze-chat-profile
pnpm --filter @chat-tools/cli dev -- analyze-chat-profile --wxid wxid_xxx
pnpm --filter @chat-tools/cli dev -- analyze-chat-profile --wechat-id my_wechat_id
pnpm --filter @chat-tools/cli dev -- generate-reply-strategy
pnpm --filter @chat-tools/cli dev -- generate-reply-strategy --recent-count 50
```

默认读取 `config/config.toml`。如命令行未传联系人标识，则回退到 TOML 中的 `weflow.wxid` 或 `weflow.wechat_id`。

`generate-reply-strategy` 会读取 `reply_strategy.recent_count` 作为默认最近消息条数，并支持命令行 `--recent-count` 覆盖。

该命令依赖已有联系人画像；如果对应画像不存在，请先运行 `analyze-chat-profile`。
