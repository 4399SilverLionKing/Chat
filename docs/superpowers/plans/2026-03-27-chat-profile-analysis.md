# 聊天记录角色画像分析功能实施计划

> **面向代理执行者：** 必须使用 superpowers:executing-plans 来执行这份计划。步骤使用复选框（`- [ ]`）语法跟踪。

**目标：** 实现一个基于 WeFlow 聊天记录与本地 `codex exec` 的单联系人角色画像分析 CLI 工具。

**架构：** 项目以 `app/` 为根组织。公共能力放在 `config`、`core`、`integrations`，聊天画像逻辑放在 `features/chat_profile`。主流程由 CLI 读取 TOML 配置与联系人输入，拉取并清洗消息后调用 `codex exec` 生成中文画像，再按联系人 `wxid` 覆盖保存结果。

**技术栈：** Python 3.11+、`argparse`、`tomllib`、`requests`、`subprocess`、`pytest`

---

## Chunk 1: 项目骨架与测试基础

### 任务 1：建立 Python 项目骨架

**文件：**
- 新建：`pyproject.toml`
- 新建：`README.md`
- 新建：`app/__init__.py`
- 新建：`app/cli.py`
- 新建：`app/config/__init__.py`
- 新建：`app/core/__init__.py`
- 新建：`app/integrations/__init__.py`
- 新建：`app/integrations/weflow/__init__.py`
- 新建：`app/features/__init__.py`
- 新建：`app/features/chat_profile/__init__.py`
- 新建：`app/prompts/chat_profile_analysis.md`
- 新建：`config/config.example.toml`
- 新建：`tests/__init__.py`

- [ ] **步骤 1：先编写一个最小 CLI 冒烟测试，定义命令入口存在**

```python
from app.cli import build_parser


def test_build_parser_contains_chat_profile_command():
    parser = build_parser()
    subparsers_action = next(
        action for action in parser._actions if action.dest == "command"
    )
    assert "analyze-chat-profile" in subparsers_action.choices
```

- [ ] **步骤 2：运行测试，确认当前失败**

运行：`pytest tests/test_cli_smoke.py -v`
预期：FAIL，并提示 `app.cli` 或 `build_parser` 不存在

- [ ] **步骤 3：创建项目基础文件与最小命令行骨架**

```python
# app/cli.py
import argparse


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="chat-tools")
    subparsers = parser.add_subparsers(dest="command")

    analyze = subparsers.add_parser("analyze-chat-profile")
    analyze.add_argument("--wxid")
    analyze.add_argument("--wechat-id")
    return parser
```

- [ ] **步骤 4：再次运行测试，确认通过**

运行：`pytest tests/test_cli_smoke.py -v`
预期：PASS

- [ ] **步骤 5：补齐工程元数据**

要求：
- `pyproject.toml` 定义项目名、Python 版本、运行依赖、测试依赖
- `README.md` 写明用途、安装、运行示例
- `config/config.example.toml` 与规格保持一致
- `app/prompts/chat_profile_analysis.md` 先放 prompt 模板占位文本

- [ ] **步骤 6：提交**

```bash
git add pyproject.toml README.md app config tests
git commit -m "chore: bootstrap chat profile analyzer project"
```

### 任务 2：建立通用异常与基础类型

**文件：**
- 新建：`app/core/exceptions.py`
- 新建：`app/features/chat_profile/models.py`
- 新建：`tests/core/test_exceptions.py`
- 新建：`tests/features/chat_profile/test_models.py`

- [ ] **步骤 1：先编写失败测试，定义核心领域对象**

```python
from app.features.chat_profile.models import ContactIdentifier, ResolvedContact


def test_contact_identifier_prefers_wxid():
    identifier = ContactIdentifier(wxid="wxid_1", wechat_id="alice")
    assert identifier.preferred_value == "wxid_1"
    assert identifier.preferred_type == "wxid"
```

- [ ] **步骤 2：运行测试，确认失败**

运行：`pytest tests/features/chat_profile/test_models.py -v`
预期：FAIL，并提示模型未定义

- [ ] **步骤 3：实现最小模型与异常类**

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class ContactIdentifier:
    wxid: str | None = None
    wechat_id: str | None = None

    @property
    def preferred_type(self) -> str:
        return "wxid" if self.wxid else "wechat_id"
```

要求：
- `exceptions.py` 至少定义 `ConfigError`、`ContactResolutionError`、`WeFlowError`、`SanitizationError`、`CodexExecutionError`、`StorageError`
- `models.py` 至少定义 `ContactIdentifier`、`ResolvedContact`、`NormalizedMessage`

- [ ] **步骤 4：再次运行测试，确认通过**

运行：`pytest tests/core/test_exceptions.py tests/features/chat_profile/test_models.py -v`
预期：PASS

- [ ] **步骤 5：提交**

```bash
git add app/core/exceptions.py app/features/chat_profile/models.py tests/core tests/features/chat_profile
git commit -m "feat: add core exceptions and chat profile models"
```

## Chunk 2: 配置加载与联系人输入决策

### 任务 3：实现 TOML 配置模型与加载器

**文件：**
- 新建：`app/config/models.py`
- 新建：`app/config/loader.py`
- 新建：`tests/config/test_loader.py`

- [ ] **步骤 1：先编写失败测试，定义配置文件加载行为**

```python
from pathlib import Path

from app.config.loader import load_config


def test_load_config_reads_default_contact_and_storage(tmp_path: Path):
    config_file = tmp_path / "config.toml"
    config_file.write_text(
        """
[storage]
profile_dir = "./data/profiles"
save_sanitized_chat = false
sanitized_chat_dir = "./data/sanitized"

[weflow]
base_url = "http://127.0.0.1:8080"
timeout_seconds = 30
token = "token"
wxid = "wxid_1"
wechat_id = "alice"

[weflow.messages]
page_size = 200
max_pages = 10
start = ""
end = ""
""".strip(),
        encoding="utf-8",
    )

    config = load_config(config_file)
    assert config.weflow.wxid == "wxid_1"
    assert config.weflow.wechat_id == "alice"
```

- [ ] **步骤 2：运行测试，确认失败**

运行：`pytest tests/config/test_loader.py -v`
预期：FAIL，并提示 `load_config` 不存在

- [ ] **步骤 3：实现配置模型与加载器**

要求：
- 使用 `tomllib` 读取 TOML
- 默认配置路径固定为 `config/config.toml`
- 相对路径按项目根目录解析，不按当前 shell 目录漂移
- 配置缺失或类型错误时抛出 `ConfigError`
- 暴露 `get_default_config_path()` 供 CLI 使用

参考实现片段：

```python
DEFAULT_CONFIG_PATH = Path("config/config.toml")


def get_default_config_path() -> Path:
    return DEFAULT_CONFIG_PATH
```

- [ ] **步骤 4：补充边界测试**

至少覆盖：
- 默认路径返回值正确
- 配置文件不存在时报错
- `start` / `end` 为字符串时成功保留原值
- 相对路径被转换为绝对路径

- [ ] **步骤 5：运行测试，确认通过**

运行：`pytest tests/config/test_loader.py -v`
预期：PASS

- [ ] **步骤 6：提交**

```bash
git add app/config tests/config
git commit -m "feat: add config loader and models"
```

### 任务 4：实现联系人输入优先级决策

**文件：**
- 修改：`app/cli.py`
- 新建：`app/features/chat_profile/contact_resolver.py`
- 新建：`tests/features/chat_profile/test_contact_identifier_resolution.py`

- [ ] **步骤 1：先编写失败测试，锁定输入优先级规则**

```python
from app.features.chat_profile.contact_resolver import choose_contact_identifier
from app.features.chat_profile.models import ContactIdentifier


def test_cli_wxid_overrides_config_wechat_id():
    chosen = choose_contact_identifier(
        cli_wxid="wxid_cli",
        cli_wechat_id=None,
        config_wxid=None,
        config_wechat_id="alice",
    )
    assert chosen == ContactIdentifier(wxid="wxid_cli", wechat_id=None)
```

- [ ] **步骤 2：运行测试，确认失败**

运行：`pytest tests/features/chat_profile/test_contact_identifier_resolution.py -v`
预期：FAIL

- [ ] **步骤 3：实现选择逻辑**

规则必须覆盖：
- 命令行优先于 TOML
- 同一来源同时有 `wxid` 和 `wechat_id` 时优先 `wxid`
- 最终没有任何联系人标识时抛出 `ContactResolutionError`

建议签名：

```python
def choose_contact_identifier(
    cli_wxid: str | None,
    cli_wechat_id: str | None,
    config_wxid: str | None,
    config_wechat_id: str | None,
) -> ContactIdentifier:
    ...
```

- [ ] **步骤 4：在 CLI 中接入该选择逻辑**

要求：
- CLI 不接收 `--config`
- 只从默认路径加载配置
- `main()` 中在真正执行前完成联系人输入归一化

- [ ] **步骤 5：运行测试，确认通过**

运行：`pytest tests/features/chat_profile/test_contact_identifier_resolution.py tests/test_cli_smoke.py -v`
预期：PASS

- [ ] **步骤 6：提交**

```bash
git add app/cli.py app/features/chat_profile/contact_resolver.py tests/features/chat_profile
git commit -m "feat: add contact identifier selection rules"
```

## Chunk 3: WeFlow 集成与联系人解析

### 任务 5：实现 WeFlow 客户端

**文件：**
- 新建：`app/integrations/weflow/models.py`
- 新建：`app/integrations/weflow/client.py`
- 新建：`tests/integrations/weflow/test_client.py`

- [ ] **步骤 1：先编写失败测试，定义联系人与消息请求**

```python
import responses

from app.integrations.weflow.client import WeFlowClient


@responses.activate
def test_list_contacts_uses_token_header():
    responses.add(
        responses.GET,
        "http://127.0.0.1:8080/api/v1/contacts",
        json={"data": [{"username": "wxid_1", "alias": "alice"}]},
        status=200,
    )

    client = WeFlowClient(base_url="http://127.0.0.1:8080", token="token", timeout_seconds=30)
    contacts = client.list_contacts()
    assert contacts[0].username == "wxid_1"
```

- [ ] **步骤 2：运行测试，确认失败**

运行：`pytest tests/integrations/weflow/test_client.py -v`
预期：FAIL

- [ ] **步骤 3：实现最小客户端**

要求：
- 使用 `requests.Session`
- 封装 `list_contacts()` 与 `list_messages(...)`
- 统一处理超时与非 2xx 返回
- 将 API 结果映射为明确的数据模型

建议接口：

```python
class WeFlowClient:
    def list_contacts(self) -> list[WeFlowContact]:
        ...

    def list_messages(
        self,
        talker: str,
        page_size: int,
        page: int,
        start: str | None,
        end: str | None,
    ) -> list[WeFlowMessage]:
        ...
```

- [ ] **步骤 4：补齐错误测试**

至少覆盖：
- 超时抛出 `WeFlowError`
- 认证失败抛出 `WeFlowError`
- 返回字段缺失抛出 `WeFlowError`

- [ ] **步骤 5：运行测试，确认通过**

运行：`pytest tests/integrations/weflow/test_client.py -v`
预期：PASS

- [ ] **步骤 6：提交**

```bash
git add app/integrations/weflow tests/integrations/weflow pyproject.toml
git commit -m "feat: add weflow client integration"
```

### 任务 6：实现联系人解析与消息拉取编排

**文件：**
- 修改：`app/features/chat_profile/contact_resolver.py`
- 新建：`tests/features/chat_profile/test_contact_resolver.py`

- [ ] **步骤 1：先编写失败测试，定义联系人解析行为**

```python
from app.features.chat_profile.contact_resolver import resolve_contact
from app.features.chat_profile.models import ContactIdentifier


class FakeClient:
    def list_contacts(self):
        return [
            type("Contact", (), {"username": "wxid_1", "alias": "alice", "nickname": "Alice"})(),
        ]


def test_resolve_contact_by_wechat_id():
    resolved = resolve_contact(FakeClient(), ContactIdentifier(wechat_id="alice"))
    assert resolved.wxid == "wxid_1"
    assert resolved.wechat_id == "alice"
```

- [ ] **步骤 2：运行测试，确认失败**

运行：`pytest tests/features/chat_profile/test_contact_resolver.py -v`
预期：FAIL

- [ ] **步骤 3：实现解析逻辑**

要求：
- 使用 `username` 精确匹配 `wxid`
- 使用 `alias` 精确匹配微信号
- 匹配不到时报 `ContactResolutionError`
- 匹配多个时报 `ContactResolutionError`

- [ ] **步骤 4：补充消息分页拉取辅助函数测试**

建议新增函数：

```python
def collect_messages(
    client: WeFlowClient,
    talker: str,
    page_size: int,
    max_pages: int,
    start: str | None,
    end: str | None,
) -> list[WeFlowMessage]:
    ...
```

要求：
- 到达空页时停止
- 达到 `max_pages` 时停止
- 保留 API 返回顺序，并在需要时统一按时间升序整理

- [ ] **步骤 5：运行测试，确认通过**

运行：`pytest tests/features/chat_profile/test_contact_resolver.py -v`
预期：PASS

- [ ] **步骤 6：提交**

```bash
git add app/features/chat_profile/contact_resolver.py tests/features/chat_profile/test_contact_resolver.py
git commit -m "feat: add contact resolution and message collection"
```

## Chunk 4: 消息清洗、Prompt 与 Codex 执行

### 任务 7：实现消息清洗器

**文件：**
- 新建：`app/features/chat_profile/message_sanitizer.py`
- 新建：`tests/features/chat_profile/test_message_sanitizer.py`

- [ ] **步骤 1：先编写失败测试，锁定清洗输出格式**

```python
from app.features.chat_profile.message_sanitizer import sanitize_messages
from app.features.chat_profile.models import NormalizedMessage


def test_sanitize_messages_keeps_only_speaker_and_text():
    messages = [
        NormalizedMessage(speaker="我", text="你好"),
        NormalizedMessage(speaker="对方", text="在吗"),
    ]
    result = sanitize_messages(messages)
    assert result == "我：你好\\n对方：在吗"
```

- [ ] **步骤 2：运行测试，确认失败**

运行：`pytest tests/features/chat_profile/test_message_sanitizer.py -v`
预期：FAIL

- [ ] **步骤 3：实现最小清洗逻辑**

规则：
- 跳过空白文本
- 保留说话人标签
- 使用 `说话人：内容` 格式逐行拼接
- 结果为空时抛出 `SanitizationError`

- [ ] **步骤 4：补充边界测试**

至少覆盖：
- 空字符串被忽略
- 去除首尾空白
- 顺序保持不变
- 所有消息都被过滤后抛错

- [ ] **步骤 5：运行测试，确认通过**

运行：`pytest tests/features/chat_profile/test_message_sanitizer.py -v`
预期：PASS

- [ ] **步骤 6：提交**

```bash
git add app/features/chat_profile/message_sanitizer.py tests/features/chat_profile/test_message_sanitizer.py
git commit -m "feat: add chat message sanitizer"
```

### 任务 8：实现 Prompt 构建器

**文件：**
- 新建：`app/features/chat_profile/prompt_builder.py`
- 修改：`app/prompts/chat_profile_analysis.md`
- 新建：`tests/features/chat_profile/test_prompt_builder.py`

- [ ] **步骤 1：先编写失败测试，锁定 prompt 关键约束**

```python
from pathlib import Path

from app.features.chat_profile.prompt_builder import build_chat_profile_prompt


def test_prompt_mentions_required_sections_and_old_profile(tmp_path: Path):
    profile_file = tmp_path / "wxid_1.md"
    profile_file.write_text("# old", encoding="utf-8")

    prompt = build_chat_profile_prompt(
        contact_name="Alice",
        identifier_value="wxid_1",
        old_profile_path=profile_file,
    )

    assert "基本信息" in prompt
    assert "性格分析" in prompt
    assert "聊天偏好" in prompt
    assert str(profile_file) in prompt
```

- [ ] **步骤 2：运行测试，确认失败**

运行：`pytest tests/features/chat_profile/test_prompt_builder.py -v`
预期：FAIL

- [ ] **步骤 3：实现 prompt 模板加载与拼装**

要求：
- 从 `app/prompts/chat_profile_analysis.md` 读取模板
- 动态插入联系人展示名、标识值、旧画像路径提示
- 当旧画像不存在时，不输出该段落
- 明确要求输出中文 Markdown

- [ ] **步骤 4：运行测试，确认通过**

运行：`pytest tests/features/chat_profile/test_prompt_builder.py -v`
预期：PASS

- [ ] **步骤 5：提交**

```bash
git add app/features/chat_profile/prompt_builder.py app/prompts/chat_profile_analysis.md tests/features/chat_profile/test_prompt_builder.py
git commit -m "feat: add prompt builder for chat profile analysis"
```

### 任务 9：实现 Codex 执行封装

**文件：**
- 新建：`app/core/codex_runner.py`
- 新建：`tests/core/test_codex_runner.py`

- [ ] **步骤 1：先编写失败测试，定义 subprocess 调用契约**

```python
from pathlib import Path
from unittest.mock import Mock, patch

from app.core.codex_runner import CodexRunner


def test_codex_runner_passes_prompt_and_chat_text(tmp_path: Path):
    old_profile = tmp_path / "wxid_1.md"
    old_profile.write_text("# old", encoding="utf-8")

    completed = Mock(returncode=0, stdout="# profile", stderr="")
    with patch("subprocess.run", return_value=completed) as run_mock:
        runner = CodexRunner()
        output = runner.run(
            prompt="analyze",
            chat_text="我：你好",
            cwd=tmp_path,
        )

    assert output == "# profile"
    args, kwargs = run_mock.call_args
    assert "codex" in args[0]
    assert "exec" in args[0]
    assert kwargs["input"] == "我：你好"
```

- [ ] **步骤 2：运行测试，确认失败**

运行：`pytest tests/core/test_codex_runner.py -v`
预期：FAIL

- [ ] **步骤 3：实现 `CodexRunner`**

要求：
- 使用 `subprocess.run`
- 命令固定为 `codex exec <prompt>`
- 将清洗后的聊天文本写入 stdin
- 指定工作目录，使 Codex 可以读取画像文件路径
- 非零退出码或空输出时抛出 `CodexExecutionError`

- [ ] **步骤 4：补充失败路径测试**

至少覆盖：
- `FileNotFoundError` 转换为 `CodexExecutionError`
- 非零退出码抛出 `CodexExecutionError`
- 空 stdout 抛出 `CodexExecutionError`

- [ ] **步骤 5：运行测试，确认通过**

运行：`pytest tests/core/test_codex_runner.py -v`
预期：PASS

- [ ] **步骤 6：提交**

```bash
git add app/core/codex_runner.py tests/core/test_codex_runner.py
git commit -m "feat: add codex execution wrapper"
```

## Chunk 5: 文件存储、主流程编排与 CLI 落地

### 任务 10：实现文件存储能力

**文件：**
- 新建：`app/core/file_store.py`
- 新建：`tests/core/test_file_store.py`

- [ ] **步骤 1：先编写失败测试，定义画像与清洗文本保存行为**

```python
from pathlib import Path

from app.core.file_store import FileStore


def test_save_profile_overwrites_fixed_contact_file(tmp_path: Path):
    store = FileStore(
        profile_dir=tmp_path / "profiles",
        sanitized_chat_dir=tmp_path / "sanitized",
        save_sanitized_chat=False,
    )

    first = store.save_profile("wxid_1", "# v1")
    second = store.save_profile("wxid_1", "# v2")

    assert first == second
    assert second.read_text(encoding="utf-8") == "# v2"
```

- [ ] **步骤 2：运行测试，确认失败**

运行：`pytest tests/core/test_file_store.py -v`
预期：FAIL

- [ ] **步骤 3：实现存储封装**

要求：
- 自动创建目录
- 画像固定保存为 `<profile_dir>/<wxid>.md`
- 提供 `get_profile_path(wxid)` 用于旧画像检测
- 当 `save_sanitized_chat=True` 时，将清洗文本保存为 `<sanitized_chat_dir>/<wxid>.txt`

- [ ] **步骤 4：补充保存清洗文本测试**

至少覆盖：
- 开启时落盘
- 关闭时不落盘
- 重复保存覆盖旧内容

- [ ] **步骤 5：运行测试，确认通过**

运行：`pytest tests/core/test_file_store.py -v`
预期：PASS

- [ ] **步骤 6：提交**

```bash
git add app/core/file_store.py tests/core/test_file_store.py
git commit -m "feat: add file storage for profiles and sanitized chat"
```

### 任务 11：实现聊天画像主流程编排器

**文件：**
- 新建：`app/features/chat_profile/analyzer.py`
- 新建：`tests/features/chat_profile/test_analyzer.py`

- [ ] **步骤 1：先编写失败测试，定义主流程编排**

```python
from pathlib import Path
from unittest.mock import Mock

from app.features.chat_profile.analyzer import ChatProfileAnalyzer
from app.features.chat_profile.models import ContactIdentifier, ResolvedContact, NormalizedMessage


def test_analyzer_runs_full_flow(tmp_path: Path):
    client = Mock()
    client.list_contacts.return_value = []
    client.list_messages.return_value = []

    resolver = Mock()
    resolver.resolve.return_value = ResolvedContact(
        wxid="wxid_1",
        wechat_id="alice",
        display_name="Alice",
        talker="wxid_1",
    )

    sanitizer = Mock(return_value="我：你好")
    prompt_builder = Mock(return_value="prompt")
    codex_runner = Mock()
    codex_runner.run.return_value = "# profile"
    file_store = Mock()

    analyzer = ChatProfileAnalyzer(
        weflow_client=client,
        contact_service=resolver,
        sanitizer=sanitizer,
        prompt_builder=prompt_builder,
        codex_runner=codex_runner,
        file_store=file_store,
    )

    analyzer.analyze(
        ContactIdentifier(wxid="wxid_1"),
        page_size=200,
        max_pages=10,
        start="",
        end="",
    )

    codex_runner.run.assert_called_once()
    file_store.save_profile.assert_called_once_with("wxid_1", "# profile")
```

- [ ] **步骤 2：运行测试，确认失败**

运行：`pytest tests/features/chat_profile/test_analyzer.py -v`
预期：FAIL

- [ ] **步骤 3：实现编排器**

要求：
- 解析联系人
- 拉取消息
- 转换为 `NormalizedMessage`
- 清洗文本
- 查找旧画像路径
- 构建 prompt
- 调用 Codex
- 保存画像与可选清洗文本

- [ ] **步骤 4：补充失败场景测试**

至少覆盖：
- 联系人不存在时冒泡 `ContactResolutionError`
- 清洗结果为空时冒泡 `SanitizationError`
- Codex 失败时不中断错误上下文

- [ ] **步骤 5：运行测试，确认通过**

运行：`pytest tests/features/chat_profile/test_analyzer.py -v`
预期：PASS

- [ ] **步骤 6：提交**

```bash
git add app/features/chat_profile/analyzer.py tests/features/chat_profile/test_analyzer.py
git commit -m "feat: add chat profile analyzer workflow"
```

### 任务 12：把主流程接入 CLI

**文件：**
- 修改：`app/cli.py`
- 新建：`tests/test_cli_integration.py`

- [ ] **步骤 1：先编写失败测试，定义 CLI 主行为**

```python
from unittest.mock import Mock, patch

from app.cli import main


def test_cli_uses_default_config_when_no_identifier_passed():
    with patch("app.cli.load_config") as load_config, patch("app.cli.ChatProfileAnalyzer") as analyzer_cls:
        load_config.return_value = Mock()
        analyzer = analyzer_cls.return_value

        exit_code = main(["analyze-chat-profile"])

    assert exit_code == 0
    analyzer.analyze.assert_called_once()
```

- [ ] **步骤 2：运行测试，确认失败**

运行：`pytest tests/test_cli_integration.py -v`
预期：FAIL

- [ ] **步骤 3：在 `app/cli.py` 中装配依赖并接入流程**

要求：
- 加载默认配置
- 组装 `WeFlowClient`、`FileStore`、`CodexRunner`、`ChatProfileAnalyzer`
- 打印成功路径或错误信息
- 主函数返回进程退出码

- [ ] **步骤 4：补充失败路径测试**

至少覆盖：
- 无联系人配置时报错并返回非 0
- 联系人找不到时报错并返回非 0
- `--wxid` 覆盖 TOML 中微信号配置

- [ ] **步骤 5：运行测试，确认通过**

运行：`pytest tests/test_cli_integration.py tests/test_cli_smoke.py -v`
预期：PASS

- [ ] **步骤 6：提交**

```bash
git add app/cli.py tests/test_cli_integration.py
git commit -m "feat: wire chat profile analysis into cli"
```

## Chunk 6: 全量验证与文档收尾

### 任务 13：补齐 README 与示例配置

**文件：**
- 修改：`README.md`
- 修改：`config/config.example.toml`

- [ ] **步骤 1：更新 README 运行说明**

至少包含：
- 环境要求
- 安装命令
- 默认配置文件位置
- 不传联系人参数时的行为
- 使用 `--wxid` 或 `--wechat-id` 覆盖 TOML 的示例

- [ ] **步骤 2：更新示例配置**

要求：
- 与规格字段完全一致
- 明确 `wxid` 优先于 `wechat_id`
- 给出 `start` / `end` 示例

- [ ] **步骤 3：手工检查文档与代码一致**

检查：
- README 命令与 CLI 实际行为一致
- 示例配置字段与 `app/config/models.py` 一致

- [ ] **步骤 4：提交**

```bash
git add README.md config/config.example.toml
git commit -m "docs: document chat profile analyzer usage"
```

### 任务 14：执行完整验证

**文件：**
- 无代码改动

- [ ] **步骤 1：运行单元与集成测试**

运行：`pytest -v`
预期：全部 PASS

- [ ] **步骤 2：执行一次本地命令行冒烟验证**

运行：

```bash
python -m app.cli analyze-chat-profile --wxid wxid_example
```

预期：
- 若本地 WeFlow 与 Codex 环境未准备好，得到清晰错误
- 若环境已准备好，输出画像文件路径

- [ ] **步骤 3：检查 Git 状态**

运行：`git status --short`
预期：工作区干净

- [ ] **步骤 4：最终提交**

```bash
git add .
git commit -m "feat: implement chat profile analysis workflow"
```
