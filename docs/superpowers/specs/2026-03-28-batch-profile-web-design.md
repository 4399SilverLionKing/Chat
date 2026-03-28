# 批量角色画像生成前端页面设计

## 1. 背景

当前仓库已经具备以下基础能力：

- `apps/cli` 中已有 `analyze-chat-profile` 命令，可基于 WeFlow 聊天记录生成单个联系人画像
- `apps/cli/src/integrations/weflow/client.ts` 已经实现了与 WeFlow 的基础通信能力
- `packages/shared` 已经沉淀了 WeFlow 相关的数据模型、schema 与错误类型

现需新增一个本地使用的前端页面，用于批量选择联系人并串行触发画像生成。用户期望：

- 页面可直接读取 WeFlow 全部联系人作为候选列表
- 通过复选框批量选择需要生成画像的联系人
- 点击一次按钮后，按顺序逐个触发 CLI 执行画像生成
- 在页面内看到每个联系人的执行状态与日志摘要
- 前端骨架使用官方命令生成 `Vite + React + Tailwind`

本次设计的重点不是做部署型 Web 系统，而是在当前本地工具仓库内补齐一个稳定、可复用、可观察的批量操作界面。

## 2. 目标

- 新增独立前端应用 `apps/web`
- 使用官方命令生成 `Vite + React + Tailwind` 项目骨架
- 将 WeFlow HTTP 客户端从 CLI 中抽离为独立可复用模块
- 让 CLI 与 Web 本地服务复用同一套 WeFlow 通信实现
- 提供联系人列表、搜索、复选、批量执行与任务状态展示页面
- 提供本地 API 以支持前端读取联系人和触发串行 CLI 任务

## 3. 非目标

- 不做线上部署方案设计
- 不直接在浏览器中暴露 WeFlow token 或由浏览器直接触发系统命令
- 不在首版中支持并发批量执行
- 不在首版中支持任务暂停、恢复、取消
- 不在首版中支持复杂权限系统、多用户隔离或数据库持久化
- 不在首版中引入重量级后端框架，如 `NestJS`

## 4. 设计原则

- 保持本地工具属性，优先降低实现复杂度
- 保持职责边界清晰，避免前端直接承担系统能力
- 尽量复用现有 CLI 画像生成逻辑，而不是在 Web 中重写一套分析流程
- 把 WeFlow 通信从 CLI 细节中抽离出来，形成更清晰的复用层
- 首版只做最小可用闭环，先保证链路跑通与状态可见

## 5. 总体架构

目标结构如下：

```text
Chat/
  apps/
    cli/
    web/
      src/
      server/
  packages/
    shared/
    weflow-client/
```

链路分层如下：

1. `packages/weflow-client`
   负责与 WeFlow 进行 HTTP 通信，提供 `listContacts()` 与 `listMessages()` 等能力。
2. `apps/cli`
   继续作为单次画像生成入口，保留 `analyze-chat-profile` 命令。
3. `apps/web/server`
   作为本地 API 服务，读取配置、调用 `weflow-client`、串行触发 CLI，并向前端暴露任务状态。
4. `apps/web/src`
   作为页面层，负责联系人筛选、选择、发起批量任务与展示执行结果。

## 6. 模块拆分设计

### 6.1 `packages/weflow-client`

将 [client.ts](/abs/path/C:/Users/Admin/Desktop/Chat/apps/cli/src/integrations/weflow/client.ts) 中的 WeFlow HTTP 通信逻辑抽离为独立包。

建议职责：

- 构造带 token 的请求
- 处理超时
- 统一错误包装
- 解析 `/api/v1/contacts`
- 解析 `/api/v1/messages`
- 复用 `@chat-tools/shared` 中已有的 schema 与类型

建议导出：

- `WeFlowClient`
- `WeFlowClientOptions`
- 与联系人、消息读取相关的输入类型

这样做的价值是：

- CLI 与 Web 本地服务共享同一套 WeFlow 通信实现
- 避免未来出现两套 HTTP 实现不一致
- 让 `apps/cli` 更聚焦在命令编排而不是基础集成细节

### 6.2 `apps/cli`

CLI 保持“单角色执行入口”的定位，不承担批量编排逻辑。

保留：

- `analyze-chat-profile`

调整：

- CLI 内部不再直接持有 WeFlow HTTP 客户端实现，而是依赖 `packages/weflow-client`

不新增首版批量 CLI 命令，避免与 Web 本地服务的任务编排职责重叠。

### 6.3 `apps/web/server`

本地服务层采用轻量 Node 服务，不引入 `NestJS`。

职责：

- 读取当前配置
- 调用 `packages/weflow-client` 获取全部联系人
- 接收前端提交的 `wxid[]`
- 串行调用 CLI 的 `analyze-chat-profile`
- 维护批任务的内存状态
- 向前端提供任务查询接口

采用轻量服务的原因：

- 当前场景只在本地使用
- 功能面很窄，不需要重量级框架
- 更贴合“工具型页面”的开发成本与维护成本

### 6.4 `apps/web/src`

前端应用使用官方命令生成 `Vite + React + Tailwind` 骨架，在现有风格基础上实现一个工具型页面。

职责：

- 拉取联系人列表
- 支持搜索与批量勾选
- 发起批任务
- 轮询任务状态
- 展示每个联系人的执行结果、日志摘要与输出路径

## 7. 运行方式

本地运行分为两部分：

- Web 前端开发服务
- Web 本地 API 服务

前端与本地 API 服务解耦，理由如下：

- 浏览器不能直接拉起本地 CLI 进程
- 读取本地配置与保护 token 更适合留在 Node 侧
- 后续如需调整任务调度，不需要修改前端结构

本次设计不追求生产部署形态，只要求本地开发与本地使用顺畅。

## 8. 页面交互设计

页面分为三块：

### 8.1 联系人工具栏

包含：

- 搜索框
- 刷新联系人按钮
- 全选当前筛选结果
- 清空已选
- 已选数量展示

搜索优先匹配：

- `displayName`
- `remark`
- `nickname`
- `wechatId`
- `wxid`

### 8.2 联系人列表

每一行展示：

- 复选框
- 联系人主显示名
- 备注名或昵称摘要
- `wechatId`
- `wxid`

行为要求：

- 支持按筛选结果进行批量选择
- 支持清晰区分未选与已选状态
- 默认按较适合人工识别的字段排序，例如 `displayName`

### 8.3 批量任务面板

包含：

- “开始生成画像”按钮
- 批任务整体状态
- 每个联系人的任务状态
- stdout/stderr 摘要
- 生成成功后的画像路径

状态文案采用：

- `待运行`
- `运行中`
- `成功`
- `失败`

首版不做取消与重试按钮，但结构上允许未来补充。

## 9. API 设计

### 9.1 `GET /api/contacts`

作用：

- 读取配置
- 调用 `WeFlowClient.listContacts()`
- 返回结构化联系人列表

返回字段建议包括：

- `wxid`
- `wechatId`
- `displayName`
- `remark`
- `nickname`
- `avatarUrl`

### 9.2 `POST /api/profile-jobs`

作用：

- 接收前端选中的 `wxid[]`
- 创建一个新的批任务
- 立即开始串行执行

请求示例：

```json
{
  "wxids": ["wxid_a", "wxid_b", "wxid_c"]
}
```

返回字段建议包括：

- `jobId`
- `status`
- `items`

### 9.3 `GET /api/profile-jobs/:jobId`

作用：

- 返回批任务整体状态
- 返回各联系人子任务状态
- 返回日志摘要和输出路径

首版前端可通过轮询该接口完成状态更新，不强制引入 `SSE`。

## 10. 任务编排设计

批任务采用严格串行执行。

执行规则：

1. 创建批任务后，所有子任务初始为 `pending`
2. 从第一个联系人开始执行 CLI
3. 当前联系人执行结束后，再进入下一个
4. 单个联系人失败时，将其记为 `failed`
5. 默认继续执行后续联系人，不采用“失败即停”
6. 全部联系人结束后，批任务进入 `completed`，即使中间包含失败项

选择串行执行的原因：

- 更符合当前用户要求
- 更易于定位失败项
- 对本地资源、外部接口和 CLI 调试更友好

## 11. CLI 调用设计

本地服务通过子进程调用现有 CLI 命令：

```bash
pnpm --filter @chat-tools/cli dev -- analyze-chat-profile --wxid <wxid>
```

服务层负责：

- 组装命令参数
- 捕获退出码
- 采集 stdout/stderr
- 从命令输出中提取 `profilePath`

这样可以最大化复用现有画像生成逻辑，降低双端实现不一致的风险。

## 12. 状态模型设计

建议定义两层状态：

### 12.1 批任务状态

- `idle`
- `running`
- `completed`
- `failed`

注：

- 若任务已创建并开始执行，则通常是 `running`
- 若整体调度逻辑出现异常，可标记为 `failed`
- 若仅某些子任务失败，但调度完成，整体仍可记为 `completed`

### 12.2 子任务状态

- `pending`
- `running`
- `succeeded`
- `failed`

每个子任务记录：

- `wxid`
- `displayName`
- `status`
- `startedAt`
- `finishedAt`
- `stdoutSnippet`
- `stderrSnippet`
- `profilePath`
- `errorMessage`

## 13. 错误处理

需要覆盖以下错误场景：

- 配置文件缺失或解析失败
- WeFlow 请求失败
- 联系人列表读取失败
- 批任务提交参数为空
- CLI 子进程启动失败
- CLI 返回非零退出码
- CLI 成功退出但未解析到画像路径

处理原则：

- API 返回结构化错误
- 前端明确区分“联系人加载失败”和“批任务中单项失败”
- 对单个子任务失败给出足够摘要，不阻断整批后续执行

## 14. 首版范围控制

首版明确包含：

- WeFlow 客户端抽离
- Web 骨架生成
- 联系人列表展示与搜索
- 多选与全选
- 串行批量执行
- 任务轮询
- 状态与日志摘要展示

首版明确不包含：

- 并发执行
- 任务取消
- 失败重试
- 历史任务持久化
- 服务端数据库
- 实时推送协议

## 15. 实现顺序

建议按如下顺序推进：

1. 用官方命令在 `apps/web` 生成 `Vite + React + Tailwind` 骨架
2. 新增 `packages/weflow-client` 并迁移 WeFlow HTTP 客户端
3. 调整 `apps/cli` 依赖，改为使用新包
4. 在 `apps/web/server` 中实现轻量本地 API
5. 在 `apps/web/src` 中实现联系人列表与筛选交互
6. 实现批任务面板与轮询
7. 增加必要的类型检查与测试

## 16. 设计取舍

### 16.1 为什么不让前端直接调用 WeFlow

- 会暴露本地 token
- 浏览器不适合直接承担本地系统能力
- 与 CLI 执行链路天然割裂

### 16.2 为什么不直接做成纯前端

- 浏览器无法直接起本地 CLI 进程
- 配置读取与本地命令执行应留在 Node 环境

### 16.3 为什么不使用 `NestJS`

- 当前功能面过窄，不值得引入重量级框架
- 增加样板代码和维护成本
- 与“本地工具型服务”的规模不匹配

### 16.4 为什么不直接把批量逻辑塞进 CLI

- 用户要的是可视化选择与过程可见
- Web 本地服务更适合作为批量任务编排层
- CLI 继续专注单次命令能力，职责更清晰

## 17. 用户可见结果

完成后，用户可以：

- 打开本地前端页面
- 从 WeFlow 全部联系人中搜索并勾选目标角色
- 点击一次按钮，串行批量生成画像
- 在页面中看到每个角色的执行状态、日志摘要和输出路径

用户不需要手工逐个执行 CLI 命令，也不需要自行整理批量执行结果。
