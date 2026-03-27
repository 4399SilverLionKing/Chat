# 聊天记录角色画像分析功能规格说明

## 1. 背景与目标

本功能用于基于指定联系人的聊天记录生成角色画像。第一版以命令行工具形式提供能力，围绕单个联系人执行一次完整分析流程：

1. 调用 WeFlow HTTP API 获取聊天记录
2. 清洗接口返回内容，仅保留双方有效发言
3. 调用本地 `codex exec` 分析聊天内容
4. 将画像结果覆盖保存到本地固定文件

本功能需要满足以下目标：

- 配置通过 TOML 文件管理
- 支持通过 `wxid` 或微信号定位联系人
- 支持通过日期范围截取聊天记录
- 输出中文画像
- 若已有旧画像，分析时应将旧画像作为可读取上下文
- 项目结构需要为未来新增其他能力预留复用空间

## 2. 范围

### 2.1 第一版范围

- 提供单个联系人画像分析命令
- 支持 `--wxid` 或 `--wechat-id` 二选一输入
- 调用 WeFlow 联系人与消息接口
- 支持 `start` / `end` 时间范围过滤
- 清洗聊天内容，仅保留双方说话内容
- 调用本地 `codex exec`
- 将结果保存为每联系人一个固定 Markdown 文件
- 可配置是否额外保存清洗后的聊天文本

### 2.2 暂不包含

- 批量分析多个联系人
- 画像结果的 JSON 结构化存储
- HTTP 服务形态
- 多分析器实现切换
- 复杂日志系统、任务调度、消息增量游标

## 3. 用户入口

第一版提供统一 CLI 入口，画像分析作为其中一个能力子命令。

示例：

```bash
python -m app.cli analyze-chat-profile
python -m app.cli analyze-chat-profile --wxid wxid_xxx
python -m app.cli analyze-chat-profile --wechat-id my_wechat_id
```

约束：

- `--wxid` 与 `--wechat-id` 均为可选
- 若命令行未传入联系人标识，则使用默认 TOML 配置中的联系人配置
- 若命令行和 TOML 都未提供可用联系人标识，则直接报错中断
- 命令行传入时覆盖 TOML 中的联系人配置
- 当前命令一次只处理一个联系人

## 4. 配置设计

配置文件使用 TOML。当前保留真正需要由用户控制的参数，不暴露 `codex` 调用细节和输出语言设置。

示例：

```toml
[storage]
profile_dir = "./data/profiles"
save_sanitized_chat = false
sanitized_chat_dir = "./data/sanitized"

[weflow]
base_url = "http://127.0.0.1:8080"
timeout_seconds = 30
token = ""
wxid = ""
wechat_id = ""

[weflow.messages]
page_size = 200
max_pages = 10
start = ""
end = ""
```

字段说明：

- `storage.profile_dir`：联系人画像保存目录
- `storage.save_sanitized_chat`：是否保存清洗后的聊天文本
- `storage.sanitized_chat_dir`：清洗文本保存目录
- `weflow.base_url`：WeFlow 服务地址
- `weflow.timeout_seconds`：请求超时时间
- `weflow.token`：访问令牌
- `weflow.wxid`：默认联系人 `wxid`
- `weflow.wechat_id`：默认联系人微信号
- `weflow.messages.page_size`：单页消息数量
- `weflow.messages.max_pages`：最多拉取页数
- `weflow.messages.start`：开始时间，支持 `YYYYMMDD` 或时间戳
- `weflow.messages.end`：结束时间，支持 `YYYYMMDD` 或时间戳

说明：

- 若命令行未传入联系人标识，则读取 TOML 中的 `weflow.wxid` 或 `weflow.wechat_id`
- TOML 同时存在 `weflow.wxid` 和 `weflow.wechat_id` 时，优先使用 `weflow.wxid`
- 输出语言固定为中文，不配置
- `codex exec` 调用参数先由实现内置，后续如确有需要再开放配置

## 5. 总体架构

项目根目录不以单一功能命名，公共能力上收，聊天画像作为一个 feature 模块存在。

```text
app/
  cli.py
  config/
    loader.py
    models.py
  core/
    codex_runner.py
    file_store.py
    exceptions.py
  integrations/
    weflow/
      client.py
      models.py
  features/
    chat_profile/
      __init__.py
      analyzer.py
      contact_resolver.py
      message_sanitizer.py
      prompt_builder.py
      models.py
  prompts/
    chat_profile_analysis.md

config/
  config.example.toml

data/
  profiles/
  sanitized/
```

模块职责：

- `app/cli.py`：统一命令行入口，分发不同能力命令
- `app/config/`：配置模型与 TOML 加载
- `app/core/codex_runner.py`：封装 `codex exec` 调用
- `app/core/file_store.py`：封装文件读写、路径生成、目录创建
- `app/core/exceptions.py`：通用异常定义
- `app/integrations/weflow/`：WeFlow API 请求与响应映射
- `app/features/chat_profile/`：画像能力专属业务逻辑
- `app/prompts/chat_profile_analysis.md`：画像分析 prompt 模板

## 6. 执行流程

单次分析流程如下：

1. CLI 读取命令参数与 TOML 配置
2. 先按 `命令行参数 > TOML 配置` 决定联系人输入来源
3. 若最终同时存在 `wxid` 与微信号，则优先使用 `wxid`
4. 根据最终选定的 `wxid` 或微信号调用联系人解析逻辑
5. 若命令行和 TOML 都未提供联系人标识，则直接报错中断
6. 联系人解析逻辑通过 WeFlow `/api/v1/contacts` 找到目标联系人
7. 若找不到目标联系人，则直接报错中断
8. 使用联系人对应的会话标识调用 WeFlow `/api/v1/messages`
9. 请求消息时带上配置中的 `page_size`、`max_pages`、`start`、`end`
10. 清洗消息，仅保留双方说话内容
11. 检查该联系人是否已有旧画像文件
12. 构建 prompt，并将清洗后的聊天内容传给 `codex exec`
13. 获取 Codex 输出，覆盖写入联系人画像文件
14. 如开启 `save_sanitized_chat`，额外保存清洗后的聊天文本

## 7. 联系人与文件命名规则

联系人定位支持：

- `wxid`
- 微信号

解析策略：

- 联系人输入来源优先级为：命令行 `--wxid` / `--wechat-id` > TOML 配置
- 若命令行未传入，则从 TOML 中读取 `weflow.wxid` 或 `weflow.wechat_id`
- TOML 内部若同时配置两者，优先使用 `weflow.wxid`
- 若传入 `--wxid`，优先按联系人 `username` 精确匹配
- 若传入 `--wechat-id`，按联系人 `alias` 精确匹配
- 若最终没有任何可用联系人标识，直接报错
- 若未匹配到联系人，直接报错
- 若匹配结果异常不唯一，直接报错，不做模糊选择

画像文件命名规则：

- 画像文件固定使用联系人 `wxid` 作为文件名
- 文件格式为 Markdown
- 每个联系人对应一个固定文件，后续分析覆盖更新

示例：

```text
data/profiles/wxid_xxx.md
```

这样即使用户通过微信号发起分析，最终落盘仍有稳定主键。

## 8. 聊天清洗规则

清洗目标是将 WeFlow 返回的复杂消息结构简化为适合画像分析的对话文本。

第一版规则：

- 仅保留双方真实发言内容
- 输出顺序与原消息时间顺序一致
- 每条记录保留说话人标签和文本内容
- 忽略系统消息、状态消息、明显非文本且无可读语义的内容

建议输出格式：

```text
我：今天在忙什么？
对方：在开会，晚点回你。
我：好，结束后聊。
```

说明：

- “我”与“对方”的判定由消息方向字段决定
- 第一版不要求保留原始时间戳到清洗文本中，避免干扰画像分析
- 若后续需要更细粒度行为分析，再考虑引入时间信息

## 9. Codex 分析策略

分析器使用本地 `codex exec`，由 Python 通过 `subprocess` 调用。

调用策略：

- 清洗后的聊天文本通过标准输入传入
- prompt 由模板动态拼装
- 输出目标为 Markdown 画像文本

prompt 必须约束画像至少包含以下部分：

- 基本信息
- 性格分析
- 聊天偏好

同时应要求：

- 输出语言固定为中文
- 依据聊天内容做有证据约束的分析，避免无根据臆断
- 当信息不足时明确写出“不足以判断”
- 输出应直接可保存为最终画像文档

## 10. 旧画像处理策略

旧画像不直接拼接进 prompt。

若联系人已有画像文件：

- Python 在 prompt 中告知旧画像文件路径
- 要求 `codex exec` 在分析前先阅读旧画像
- 再结合本次聊天内容生成更新后的完整画像

选择该方案的原因：

- 保持 prompt 精简
- 避免旧画像变长后挤占上下文
- 让旧画像继续作为本地可追踪资料存在

## 11. 数据保存策略

画像保存：

- 保存为 Markdown
- 每联系人一个固定文件
- 每次分析覆盖写入

清洗文本保存：

- 由 `storage.save_sanitized_chat` 控制
- 若为 `true`，保存到 `storage.sanitized_chat_dir`
- 若为 `false`，仅作为本次流程中的临时数据

## 12. 错误处理

第一版错误处理以明确、可定位为目标。

错误类型：

- 配置错误：字段缺失、路径非法、时间格式不合法
- 联系人解析失败：找不到联系人或结果不唯一
- WeFlow 请求失败：超时、认证失败、接口异常、返回结构不符合预期
- 聊天内容为空：在指定范围内没有可分析的有效对话
- Codex 执行失败：命令不存在、退出码非 0、结果为空
- 文件保存失败：目录无法创建或无写权限

处理原则：

- CLI 直接输出清晰错误信息
- 错误信息应包含联系人标识和关键上下文
- 预期失败返回非 0 退出码
- 不做静默降级

## 13. 验证与测试

单元测试重点：

- 配置加载与时间参数校验
- 联系人文件名生成规则
- 聊天清洗逻辑
- prompt 构建逻辑

集成测试重点：

- WeFlow client 的请求组装与响应映射
- `codex exec` 调用封装
- 旧画像存在与不存在两种分支

手工验收场景：

- 使用 `wxid` 分析成功
- 使用微信号分析成功
- 指定 `start` / `end` 后仅分析目标区间
- 已有画像时能够覆盖更新
- 开启保存清洗文本后能正确落盘

## 14. 可扩展性约束

当前结构需要为未来能力扩展留出空间，但不引入超前复杂度。

明确要求：

- `core/` 仅保留真正可复用能力
- WeFlow 集成与画像业务逻辑解耦
- 画像 feature 不反向依赖其他未来 feature
- 新能力应通过 `app/cli.py` 增加新子命令接入

未来可能扩展但本次不实现：

- 批量分析
- 其他消息源接入
- 更多分析任务，如关系变化、沟通风格总结
- 更细粒度的画像增量更新策略

## 15. 参考

- WeFlow HTTP API 文档：<https://github.com/hicccc77/WeFlow/blob/main/docs/HTTP-API.md>
- OpenAI Codex 文档：<https://platform.openai.com/docs/guides/code-generation>
