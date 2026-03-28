# WeFlow 私聊联系人过滤设计

## 1. 背景

当前前端页面通过 `GET /api/contacts` 拉取 WeFlow 联系人列表。接口直接返回了全部联系人，导致前端列表中同时出现私聊对象、群聊、公众号等非目标对象，影响批量画像任务的选择效率。

仓库现状如下：

- `packages/shared/src/weflow/models.ts` 已保留 WeFlow 原始联系人字段 `contactType`
- `apps/web/server/routes/contacts.ts` 当前未使用 `contactType`，而是直接把所有联系人映射为前端 `ApiContact`

因此，本次应优先在服务端联系人接口处做过滤，而不是把识别责任下放到前端。

## 2. 目标

- 让 `GET /api/contacts` 只返回私聊联系人
- 首版过滤规则采用最小实现：仅保留 `contactType === "friend"` 的联系人
- 保持前端 `ApiContact` 结构不变，避免不必要的接口扩展

## 3. 非目标

- 不在本次变更中向前端暴露 `contactType`
- 不在本次变更中引入 `chatroom`、`gh_*` 等启发式兜底规则
- 不修改 WeFlow client、shared schema 或前端筛选逻辑

## 4. 方案

在 `apps/web/server/routes/contacts.ts` 的 `/api/contacts` 路由中：

1. 先调用 `listContacts()` 获取 WeFlow 联系人
2. 过滤出 `contact.contactType === "friend"` 的记录
3. 对过滤后的结果沿用现有 `toApiContact()` 映射和排序逻辑
4. 返回给前端

## 5. 测试策略

更新 `apps/web/server/tests/contacts-route.test.ts`：

- 保留现有“按 displayName 排序返回联系人”的断言，但输入样本改为混合 `friend` 与非 `friend`
- 新增验证：响应中只包含 `contactType === "friend"` 的联系人

## 6. 风险与回滚

唯一主要风险是 WeFlow 中部分真实私聊对象可能不被标记为 `friend`，从而被误过滤。

如果验证后发现误杀明显，本次实现可作为第一版基线，下一步再补：

- 更完整的 `contactType` 白名单
- 或少量启发式排除规则
