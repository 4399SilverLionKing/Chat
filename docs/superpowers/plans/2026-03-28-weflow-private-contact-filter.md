# WeFlow 私聊联系人过滤实施计划

> **面向代理执行者：** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 让 `GET /api/contacts` 仅返回 `contactType === "friend"` 的 WeFlow 联系人。

**架构：** 在 `apps/web/server/routes/contacts.ts` 的服务端路由层完成过滤，保持前端 `ApiContact` 结构和搜索逻辑不变。通过路由测试覆盖混合联系人输入，验证只返回 friend 且保持原有排序与错误处理行为。

**技术栈：** `Express`、`TypeScript`、`Vitest`

---

### 任务 1：为联系人接口补充 friend 过滤测试

**Files:**
- Modify: `apps/web/server/tests/contacts-route.test.ts`
- Test: `apps/web/server/tests/contacts-route.test.ts`

- [ ] **步骤 1：编写失败测试**

在现有成功用例中加入一个非 `friend` 联系人样本，并把断言改为仅返回 `friend` 联系人。

- [ ] **步骤 2：运行测试并确认它失败**

Run: `pnpm --filter @chat-tools/web test -- contacts-route.test.ts`
Expected: FAIL，因为当前 `/api/contacts` 仍返回全部联系人。

- [ ] **步骤 3：编写最小实现**

在 `apps/web/server/routes/contacts.ts` 中对 `listContacts()` 的结果先执行 `contact.contactType === "friend"` 过滤，再执行映射和排序。

- [ ] **步骤 4：运行测试并确认它通过**

Run: `pnpm --filter @chat-tools/web test -- contacts-route.test.ts`
Expected: PASS，且原有错误处理测试仍通过。

- [ ] **步骤 5：提交**

```bash
git add apps/web/server/routes/contacts.ts apps/web/server/tests/contacts-route.test.ts docs/superpowers/specs/2026-03-28-weflow-private-contact-filter-design.md docs/superpowers/plans/2026-03-28-weflow-private-contact-filter.md
git commit -m "fix: filter non-friend weflow contacts"
```
