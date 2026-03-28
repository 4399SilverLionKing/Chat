# 批量角色画像生成前端页面实施计划

> **面向代理执行者：** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 新增一个本地可用的批量画像生成 Web 页面，支持从 WeFlow 读取全部联系人、勾选联系人并串行触发现有 CLI 画像生成命令。

**架构：** 将现有 WeFlow HTTP 通信从 CLI 中抽离到 `packages/weflow-client`，由 `apps/cli` 与 `apps/web/server` 共同复用。`apps/web` 使用官方 `Vite + React + Tailwind` 骨架承载联系人列表和任务面板，本地 Node API 负责拉取联系人、串行执行 CLI、维护内存中的批任务状态。

**技术栈：** pnpm workspace、TypeScript、Vitest、Vite、React、Tailwind CSS、Express、execa

---

## Chunk 1: 脚手架与工作区接入

### 任务 1：用官方命令生成 `apps/web` 骨架并接入 workspace

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/index.html`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tsconfig.app.json`
- Create: `apps/web/tsconfig.node.json`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/index.css`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **步骤 1：在空目录执行官方 Vite React TS 脚手架命令**

Run:

```bash
cd apps/web
pnpm create vite@latest . --template react-ts
```

Expected:

- `apps/web` 下生成官方 Vite React TypeScript 结构
- `package.json` 中出现 Vite / React 基础依赖

- [ ] **步骤 2：按官方 Tailwind Vite 集成方式安装依赖**

Run:

```bash
cd apps/web
pnpm add tailwindcss @tailwindcss/vite
```

Expected:

- `apps/web/package.json` 中新增 Tailwind 相关依赖

- [ ] **步骤 3：为本地 API 服务补齐运行依赖**

在 `apps/web/package.json` 中补充：

- 运行依赖：`express`, `execa`
- 开发依赖：`tsx`, `vitest`, `@types/express`

并补充脚本：

- `dev`
- `dev:server`
- `build`
- `build:server`
- `test`
- `typecheck`

- [ ] **步骤 4：为根工作区补充 Web 相关便捷脚本**

修改 `package.json` 根脚本，至少新增：

- `dev:web`
- `dev:web-server`

Expected:

- 可以分别启动前端和本地 API

- [ ] **步骤 5：运行安装并确认 workspace 正常识别新应用**

Run:

```bash
pnpm install
pnpm --filter @chat-tools/web typecheck
```

Expected:

- 依赖安装成功
- `apps/web` 被 workspace 正常识别
- `typecheck` 初始通过

## Chunk 2: 提取独立 WeFlow 客户端包

### 任务 2：新增 `packages/weflow-client` 并迁移 HTTP 通信实现

**Files:**
- Create: `packages/weflow-client/package.json`
- Create: `packages/weflow-client/tsconfig.json`
- Create: `packages/weflow-client/src/index.ts`
- Create: `packages/weflow-client/src/client.ts`
- Create: `packages/weflow-client/tests/client.test.ts`
- Modify: `pnpm-lock.yaml`

- [ ] **步骤 1：为新包编写失败测试**

在 `packages/weflow-client/tests/client.test.ts` 中覆盖：

- `listContacts()` 成功解析响应
- `listMessages()` 正确带上 `talker`, `limit`, `offset`, `start`, `end`
- 401 / 500 响应被包装成 `WeFlowError`
- 长整型 `serverId` 被保留为字符串

- [ ] **步骤 2：运行测试并确认它失败**

Run:

```bash
pnpm --filter @chat-tools/weflow-client test -- tests/client.test.ts
```

Expected:

- FAIL，因为包和实现尚不存在

- [ ] **步骤 3：创建新包并迁移现有客户端实现**

从 `apps/cli/src/integrations/weflow/client.ts` 迁移逻辑到：

- `packages/weflow-client/src/client.ts`
- `packages/weflow-client/src/index.ts`

实现要求：

- API 形状与当前客户端保持兼容
- 继续依赖 `@chat-tools/shared` 的 schema 和错误类型
- 保留超时、错误包装与 `serverId` 处理逻辑

- [ ] **步骤 4：运行测试并确认新包通过**

Run:

```bash
pnpm --filter @chat-tools/weflow-client test -- tests/client.test.ts
pnpm --filter @chat-tools/weflow-client typecheck
```

Expected:

- PASS

- [ ] **步骤 5：提交**

Run:

```bash
git add packages/weflow-client pnpm-lock.yaml
git commit -m "feat: extract weflow client package"
```

## Chunk 3: CLI 迁移到共享 WeFlow 客户端

### 任务 3：让 CLI 改为依赖 `@chat-tools/weflow-client`

**Files:**
- Modify: `apps/cli/package.json`
- Modify: `apps/cli/src/commands/analyze-chat-profile.ts`
- Modify: `apps/cli/src/commands/show-contact.ts`
- Delete: `apps/cli/src/integrations/weflow/client.ts`
- Modify: `apps/cli/tests/analyze-chat-profile-command.test.ts`
- Modify: `apps/cli/tests/show-contact-command.test.ts`
- Modify: `pnpm-lock.yaml`

- [ ] **步骤 1：补充或调整 CLI 侧测试断言**

确认 `analyze-chat-profile` 与 `show-contact` 的测试仍覆盖：

- 正常加载配置
- 构造默认依赖
- 成功输出预期结果

如有必要，增加一个测试确保默认依赖来源于 `@chat-tools/weflow-client` 的 `WeFlowClient`。

- [ ] **步骤 2：运行相关测试并确认当前基线通过**

Run:

```bash
pnpm --filter @chat-tools/cli test -- tests/analyze-chat-profile-command.test.ts tests/show-contact-command.test.ts
```

Expected:

- PASS，作为迁移前基线

- [ ] **步骤 3：修改 CLI 依赖并移除旧实现**

在 `apps/cli/package.json` 中新增 workspace 依赖：

- `@chat-tools/weflow-client`

修改：

- `apps/cli/src/commands/analyze-chat-profile.ts`
- `apps/cli/src/commands/show-contact.ts`

删除：

- `apps/cli/src/integrations/weflow/client.ts`

- [ ] **步骤 4：运行 CLI 测试并确认迁移无回归**

Run:

```bash
pnpm --filter @chat-tools/cli test -- tests/analyze-chat-profile-command.test.ts tests/show-contact-command.test.ts tests/fetch-chat-context-command.test.ts tests/cli.test.ts
pnpm --filter @chat-tools/cli typecheck
```

Expected:

- PASS

- [ ] **步骤 5：提交**

Run:

```bash
git add apps/cli pnpm-lock.yaml
git commit -m "refactor: share weflow client across apps"
```

## Chunk 4: 本地 API 的联系人读取能力

### 任务 4：为 `apps/web/server` 建立基础服务和联系人接口

**Files:**
- Create: `apps/web/server/index.ts`
- Create: `apps/web/server/app.ts`
- Create: `apps/web/server/config.ts`
- Create: `apps/web/server/routes/contacts.ts`
- Create: `apps/web/server/routes/health.ts`
- Create: `apps/web/server/models.ts`
- Create: `apps/web/server/tests/contacts-route.test.ts`
- Modify: `apps/web/vite.config.ts`
- Modify: `apps/web/package.json`

- [ ] **步骤 1：编写失败测试**

在 `apps/web/server/tests/contacts-route.test.ts` 中覆盖：

- `GET /api/health` 返回 200
- `GET /api/contacts` 成功返回标准化联系人列表
- WeFlow 读取失败时返回结构化错误
- 返回列表按 `displayName` 排序

- [ ] **步骤 2：运行测试并确认它失败**

Run:

```bash
pnpm --filter @chat-tools/web test -- server/tests/contacts-route.test.ts
```

Expected:

- FAIL，因为 server 入口和路由尚不存在

- [ ] **步骤 3：实现最小服务骨架**

创建：

- `apps/web/server/app.ts`：Express app 组装
- `apps/web/server/index.ts`：监听端口
- `apps/web/server/config.ts`：复用 `apps/cli/src/config/load-config.ts` 读取配置
- `apps/web/server/routes/health.ts`
- `apps/web/server/routes/contacts.ts`
- `apps/web/server/models.ts`：联系人 API 返回模型

实现要求：

- 联系人读取通过 `@chat-tools/weflow-client`
- API 返回字段为页面可直接消费的 shape
- `vite.config.ts` 配置 `/api` 到本地 server 端口的代理

- [ ] **步骤 4：运行测试并确认联系人接口通过**

Run:

```bash
pnpm --filter @chat-tools/web test -- server/tests/contacts-route.test.ts
pnpm --filter @chat-tools/web typecheck
```

Expected:

- PASS

- [ ] **步骤 5：提交**

Run:

```bash
git add apps/web
git commit -m "feat: add web contacts api"
```

## Chunk 5: 批量任务调度与 CLI 串行执行

### 任务 5：实现批任务模型、串行执行器和查询接口

**Files:**
- Create: `apps/web/server/job-store.ts`
- Create: `apps/web/server/profile-job-runner.ts`
- Create: `apps/web/server/routes/profile-jobs.ts`
- Create: `apps/web/server/tests/profile-job-runner.test.ts`
- Create: `apps/web/server/tests/profile-jobs-route.test.ts`
- Modify: `apps/web/server/app.ts`
- Modify: `apps/web/server/models.ts`

- [ ] **步骤 1：编写失败测试覆盖任务状态流转**

在 `apps/web/server/tests/profile-job-runner.test.ts` 中覆盖：

- 新建任务后所有项为 `pending`
- 执行时按顺序进入 `running`
- 单项成功后写入 `profilePath`
- 单项失败后记录 `stderr` 与 `errorMessage`
- 某一项失败不阻断后续项
- 全部结束后批任务状态为 `completed`

在 `apps/web/server/tests/profile-jobs-route.test.ts` 中覆盖：

- `POST /api/profile-jobs` 空数组返回 400
- 合法 `wxids` 创建任务并返回 `jobId`
- `GET /api/profile-jobs/:jobId` 返回当前任务状态

- [ ] **步骤 2：运行测试并确认它失败**

Run:

```bash
pnpm --filter @chat-tools/web test -- server/tests/profile-job-runner.test.ts server/tests/profile-jobs-route.test.ts
```

Expected:

- FAIL，因为任务执行器和路由尚未实现

- [ ] **步骤 3：实现内存任务仓库与串行执行器**

创建：

- `apps/web/server/job-store.ts`
- `apps/web/server/profile-job-runner.ts`
- `apps/web/server/routes/profile-jobs.ts`

实现要求：

- 使用内存存储 job 状态
- 逐个调用：

```bash
pnpm --filter @chat-tools/cli dev -- analyze-chat-profile --wxid <wxid>
```

- 捕获 stdout / stderr / exit code
- 从 stdout 中解析 `Profile saved to: ...`
- 任务模型包含批状态和子任务状态

- [ ] **步骤 4：运行测试并确认任务接口通过**

Run:

```bash
pnpm --filter @chat-tools/web test -- server/tests/profile-job-runner.test.ts server/tests/profile-jobs-route.test.ts
pnpm --filter @chat-tools/web typecheck
```

Expected:

- PASS

- [ ] **步骤 5：提交**

Run:

```bash
git add apps/web
git commit -m "feat: add serial profile job runner"
```

## Chunk 6: 前端联系人选择页

### 任务 6：实现联系人列表、搜索和批量勾选交互

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/index.css`
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/types.ts`
- Create: `apps/web/src/components/contact-toolbar.tsx`
- Create: `apps/web/src/components/contact-list.tsx`
- Create: `apps/web/src/components/contact-row.tsx`
- Create: `apps/web/src/hooks/use-contacts.ts`
- Create: `apps/web/src/utils/contact-filter.ts`
- Create: `apps/web/src/utils/contact-filter.test.ts`

- [ ] **步骤 1：编写失败测试**

在 `apps/web/src/utils/contact-filter.test.ts` 中覆盖：

- 搜索同时匹配 `displayName`
- 搜索匹配 `remark`、`nickname`
- 搜索匹配 `wechatId`、`wxid`
- 空搜索返回全部联系人
- 排序结果稳定

- [ ] **步骤 2：运行测试并确认它失败**

Run:

```bash
pnpm --filter @chat-tools/web test -- src/utils/contact-filter.test.ts
```

Expected:

- FAIL，因为过滤工具和前端数据结构尚未完成

- [ ] **步骤 3：实现联系人页最小闭环**

实现：

- `src/lib/api.ts`：封装 `GET /api/contacts`
- `src/hooks/use-contacts.ts`：加载、刷新与错误状态
- `src/utils/contact-filter.ts`
- `src/components/contact-toolbar.tsx`
- `src/components/contact-list.tsx`
- `src/components/contact-row.tsx`
- `src/App.tsx`

页面要求：

- 搜索框
- 刷新按钮
- 全选筛选结果
- 清空选择
- 已选数量
- 联系人复选列表

- [ ] **步骤 4：接入 Tailwind 官方 Vite 插件与基础样式**

修改：

- `apps/web/vite.config.ts`
- `apps/web/src/index.css`

至少完成：

- 在 `vite.config.ts` 注册 `@tailwindcss/vite`
- 在 `index.css` 使用 `@import "tailwindcss";`
- 基于工具页场景定义清晰的间距、层级和状态样式

- [ ] **步骤 5：运行测试与类型检查**

Run:

```bash
pnpm --filter @chat-tools/web test -- src/utils/contact-filter.test.ts
pnpm --filter @chat-tools/web typecheck
```

Expected:

- PASS

- [ ] **步骤 6：提交**

Run:

```bash
git add apps/web
git commit -m "feat: add contact selection page"
```

## Chunk 7: 前端任务面板与轮询

### 任务 7：实现批量执行按钮、任务轮询和结果展示

**Files:**
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/components/job-panel.tsx`
- Create: `apps/web/src/components/job-item.tsx`
- Create: `apps/web/src/hooks/use-profile-job.ts`
- Create: `apps/web/src/utils/job-status.ts`
- Create: `apps/web/src/utils/job-status.test.ts`
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/types.ts`

- [ ] **步骤 1：编写失败测试**

在 `apps/web/src/utils/job-status.test.ts` 中覆盖：

- 后端状态到中文文案的映射
- `pending / running / succeeded / failed` 的显示映射
- 批状态 `running / completed / failed` 的映射

- [ ] **步骤 2：运行测试并确认它失败**

Run:

```bash
pnpm --filter @chat-tools/web test -- src/utils/job-status.test.ts
```

Expected:

- FAIL，因为任务状态工具与前端任务面板尚未存在

- [ ] **步骤 3：实现任务 API 封装与轮询 hook**

实现：

- `POST /api/profile-jobs`
- `GET /api/profile-jobs/:jobId`
- `src/hooks/use-profile-job.ts`

要求：

- 选中联系人后点击按钮可创建任务
- 任务运行时自动轮询
- 批任务结束后自动停止轮询

- [ ] **步骤 4：实现任务面板 UI**

创建：

- `src/components/job-panel.tsx`
- `src/components/job-item.tsx`

展示：

- 整体任务状态
- 每个联系人状态
- 日志摘要
- 成功项的 `profilePath`

- [ ] **步骤 5：运行前端测试与类型检查**

Run:

```bash
pnpm --filter @chat-tools/web test -- src/utils/job-status.test.ts
pnpm --filter @chat-tools/web typecheck
```

Expected:

- PASS

- [ ] **步骤 6：提交**

Run:

```bash
git add apps/web
git commit -m "feat: add batch profile job panel"
```

## Chunk 8: 端到端校验与文档补充

### 任务 8：完成最终验证并补充使用说明

**Files:**
- Modify: `README.md`
- Modify: `docs/getting-started.md`
- Modify: `package.json`
- Modify: `apps/web/package.json`

- [ ] **步骤 1：补充最小使用说明**

在 `README.md` 或 `docs/getting-started.md` 中补充：

- 启动前端命令
- 启动本地 API 命令
- 页面用途和限制

- [ ] **步骤 2：运行测试**

Run:

```bash
pnpm --filter @chat-tools/weflow-client test
pnpm --filter @chat-tools/cli test
pnpm --filter @chat-tools/web test
```

Expected:

- PASS

- [ ] **步骤 3：运行类型检查**

Run:

```bash
pnpm typecheck
```

Expected:

- PASS

- [ ] **步骤 4：进行本地冒烟验证**

Run:

```bash
pnpm dev:web-server
pnpm dev:web
```

Expected:

- 页面可以打开
- 联系人列表可加载
- 选择联系人后可成功创建任务
- 任务状态能从 `待运行` 过渡到 `运行中` 再到 `成功 / 失败`

- [ ] **步骤 5：检查最终差异**

Run:

```bash
git diff --stat
```

Expected:

- 仅包含 `packages/weflow-client`、`apps/web`、CLI 迁移、根脚本与必要文档变更
