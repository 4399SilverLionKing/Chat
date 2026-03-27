import { describe, expect, it, vi } from "vitest";

import { runCli } from "../src/cli.js";

function makeConfig() {
  return {
    storage: {
      profileDir: "/tmp/profiles",
      replyDir: "/tmp/reply",
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
    replyStrategy: {
      recentCount: 30,
    },
  };
}

describe("generate-reply-strategy command", () => {
  it("uses the config recent count by default", async () => {
    const analyzer = {
      generate: vi
        .fn()
        .mockResolvedValue({ replyPath: "/tmp/reply/2026-03-27-wxid_cfg.md" }),
    };

    const exitCode = await runCli(["generate-reply-strategy"], {
      getDefaultConfigPath: () => "config/config.toml",
      loadConfig: vi.fn().mockResolvedValue(makeConfig()),
      createReplyStrategyAnalyzer: vi.fn().mockReturnValue(analyzer),
      today: () => "2026-03-27",
      stdout: vi.fn(),
      stderr: vi.fn(),
      cwd: () => "/workspace",
    });

    expect(exitCode).toBe(0);
    expect(analyzer.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        recentCount: 30,
      }),
    );
  });

  it("lets cli recent count override config", async () => {
    const analyzer = {
      generate: vi
        .fn()
        .mockResolvedValue({ replyPath: "/tmp/reply/2026-03-27-wxid_cfg.md" }),
    };

    await runCli(["generate-reply-strategy", "--recent-count", "50"], {
      getDefaultConfigPath: () => "config/config.toml",
      loadConfig: vi.fn().mockResolvedValue(makeConfig()),
      createReplyStrategyAnalyzer: vi.fn().mockReturnValue(analyzer),
      today: () => "2026-03-27",
      stdout: vi.fn(),
      stderr: vi.fn(),
      cwd: () => "/workspace",
    });

    expect(analyzer.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        recentCount: 50,
        date: "2026-03-27",
      }),
    );
  });

  it("writes the saved reply path to stdout when generation succeeds", async () => {
    const analyzer = {
      generate: vi
        .fn()
        .mockResolvedValue({ replyPath: "/tmp/reply/2026-03-27-wxid_cfg.md" }),
    };
    const stdout = vi.fn();

    const exitCode = await runCli(["generate-reply-strategy"], {
      getDefaultConfigPath: () => "config/config.toml",
      loadConfig: vi.fn().mockResolvedValue(makeConfig()),
      createReplyStrategyAnalyzer: vi.fn().mockReturnValue(analyzer),
      today: () => "2026-03-27",
      stdout,
      stderr: vi.fn(),
      cwd: () => "/workspace",
    });

    expect(exitCode).toBe(0);
    expect(stdout).toHaveBeenCalledWith(
      "Reply saved to: /tmp/reply/2026-03-27-wxid_cfg.md",
    );
  });

  it("returns 1 and writes the error to stderr when generation fails", async () => {
    const stderr = vi.fn();
    const analyzer = {
      generate: vi.fn().mockRejectedValue(new Error("Reply strategy profile not found")),
    };

    const exitCode = await runCli(["generate-reply-strategy"], {
      getDefaultConfigPath: () => "config/config.toml",
      loadConfig: vi.fn().mockResolvedValue(makeConfig()),
      createReplyStrategyAnalyzer: vi.fn().mockReturnValue(analyzer),
      today: () => "2026-03-27",
      stdout: vi.fn(),
      stderr,
      cwd: () => "/workspace",
    });

    expect(exitCode).toBe(1);
    expect(stderr).toHaveBeenCalledWith(
      "Error: Reply strategy profile not found",
    );
  });
});
