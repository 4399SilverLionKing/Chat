import { describe, expect, it, vi } from "vitest";

import { runCli } from "../src/cli.js";

function makeConfig() {
  return {
    storage: {
      profileDir: "/tmp/profiles",
      saveSanitizedChat: false,
      sanitizedChatDir: "/tmp/sanitized",
    },
    weflow: {
      baseUrl: "http://127.0.0.1:5031",
      timeoutSeconds: 30,
      token: "token",
      wxid: "wxid_cfg",
      wechatId: "alice",
      messages: {
        pageSize: 200,
        maxPages: 10,
        start: "",
        end: "",
      },
    },
  };
}

describe("runCli", () => {
  it("uses the default config when no identifier is passed", async () => {
    const analyzer = {
      analyze: vi.fn().mockResolvedValue({ profilePath: "/tmp/profiles/wxid_cfg.md" }),
    };

    const exitCode = await runCli(["analyze-chat-profile"], {
      getDefaultConfigPath: () => "config/config.toml",
      loadConfig: vi.fn().mockResolvedValue(makeConfig()),
      createAnalyzer: vi.fn().mockReturnValue(analyzer),
      stdout: vi.fn(),
      stderr: vi.fn(),
      cwd: () => "/workspace",
    });

    expect(exitCode).toBe(0);
    expect(analyzer.analyze).toHaveBeenCalledOnce();
  });

  it("lets cli wxid override config wechat id", async () => {
    const analyzer = {
      analyze: vi.fn().mockResolvedValue({ profilePath: "/tmp/profiles/wxid_cli.md" }),
    };

    await runCli(["analyze-chat-profile", "--wxid", "wxid_cli"], {
      getDefaultConfigPath: () => "config/config.toml",
      loadConfig: vi.fn().mockResolvedValue(makeConfig()),
      createAnalyzer: vi.fn().mockReturnValue(analyzer),
      stdout: vi.fn(),
      stderr: vi.fn(),
      cwd: () => "/workspace",
    });

    const [args] = analyzer.analyze.mock.calls[0] ?? [];
    expect(args.identifier.wxid).toBe("wxid_cli");
  });
});
