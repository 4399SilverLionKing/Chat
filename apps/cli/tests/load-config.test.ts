import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { getDefaultConfigPath, loadConfig } from "../src/config/load-config.js";

describe("getDefaultConfigPath", () => {
  it("returns the workspace relative default path", () => {
    expect(getDefaultConfigPath()).toBe("config/config.toml");
  });
});

describe("loadConfig", () => {
  it("loads config from toml file and resolves storage paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "chat-tools-config-"));
    const configDir = join(root, "config");
    const configPath = join(configDir, "config.toml");

    await mkdir(configDir, { recursive: true });
    await writeFile(
      configPath,
      `
[storage]
profile_dir = "./data/profiles"
reply_dir = "./data/reply"
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

[reply_strategy]
recent_count = 30
`.trim(),
      "utf8",
    );

    const config = await loadConfig(configPath);

    expect(config.weflow.wxid).toBe("wxid_1");
    expect(config.weflow.wechatId).toBe("alice");
    expect(config.replyStrategy.recentCount).toBe(30);
    expect(config.storage.profileDir).toBe(join(root, "data/profiles"));
    expect(config.storage.replyDir).toBe(join(root, "data/reply"));
    expect(config.storage.sanitizedChatDir).toBe(join(root, "data/sanitized"));
  });
});
