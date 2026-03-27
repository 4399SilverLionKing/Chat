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

describe("fetch-chat-context command", () => {
  it("prints the most recent messages as sanitized text in chronological order", async () => {
    const stdout = vi.fn();
    const fetcher = {
      fetch: vi.fn().mockResolvedValue({
        contact: {
          wxid: "wxid_cfg",
          wechatId: "alice",
          displayName: "Alice",
          talker: "wxid_cfg",
        },
        messages: [
          { createTime: 3, isSend: 1, content: "第三条" },
          { createTime: 1, isSend: 1, content: "第一条" },
          { createTime: 2, isSend: 0, content: "第二条" },
        ],
      }),
    };

    const exitCode = await runCli(["fetch-chat-context", "--recent-count", "2"], {
      getDefaultConfigPath: () => "config/config.toml",
      loadConfig: vi.fn().mockResolvedValue(makeConfig()),
      createFetchChatContextFetcher: vi.fn().mockReturnValue(fetcher),
      stdout,
      stderr: vi.fn(),
    } as any);

    expect(exitCode).toBe(0);
    expect(fetcher.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        recentCount: 2,
      }),
    );
    expect(stdout).toHaveBeenCalledWith("对方：第二条\n我：第三条");
  });

  it("prints structured JSON when format=json is requested", async () => {
    const stdout = vi.fn();
    const fetcher = {
      fetch: vi.fn().mockResolvedValue({
        contact: {
          wxid: "wxid_cfg",
          wechatId: "alice",
          displayName: "Alice",
          talker: "wxid_cfg",
        },
        messages: [
          { createTime: 2, isSend: 0, content: "第二条" },
          { createTime: 1, isSend: 1, content: "第一条" },
        ],
      }),
    };

    const exitCode = await runCli(["fetch-chat-context", "--format", "json"], {
      getDefaultConfigPath: () => "config/config.toml",
      loadConfig: vi.fn().mockResolvedValue(makeConfig()),
      createFetchChatContextFetcher: vi.fn().mockReturnValue(fetcher),
      stdout,
      stderr: vi.fn(),
    } as any);

    expect(exitCode).toBe(0);
    expect(stdout).toHaveBeenCalledWith(
      JSON.stringify(
        {
          contact: {
            wxid: "wxid_cfg",
            wechatId: "alice",
            displayName: "Alice",
            talker: "wxid_cfg",
          },
          messages: [
            {
              createTime: 1,
              speaker: "我",
              text: "第一条",
            },
            {
              createTime: 2,
              speaker: "对方",
              text: "第二条",
            },
          ],
        },
        null,
        2,
      ),
    );
  });
});
