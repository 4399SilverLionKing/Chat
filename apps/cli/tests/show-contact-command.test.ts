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

describe("show-contact command", () => {
  it("uses the configured identifier by default and prints structured JSON", async () => {
    const stdout = vi.fn();
    const lookup = {
      show: vi.fn().mockResolvedValue({
        wxid: "wxid_cfg",
        wechatId: "alice",
        displayName: "Alice",
        talker: "wxid_cfg",
      }),
    };

    const exitCode = await runCli(["show-contact"], {
      getDefaultConfigPath: () => "config/config.toml",
      loadConfig: vi.fn().mockResolvedValue(makeConfig()),
      createShowContactLookup: vi.fn().mockReturnValue(lookup),
      stdout,
      stderr: vi.fn(),
    } as any);

    expect(exitCode).toBe(0);
    expect(lookup.show).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: expect.objectContaining({
          wxid: "wxid_cfg",
        }),
      }),
    );
    expect(stdout).toHaveBeenCalledWith(
      JSON.stringify(
        {
          wxid: "wxid_cfg",
          wechatId: "alice",
          displayName: "Alice",
          talker: "wxid_cfg",
        },
        null,
        2,
      ),
    );
  });

  it("lets cli wxid override config wechat id", async () => {
    const lookup = {
      show: vi.fn().mockResolvedValue({
        wxid: "wxid_cli",
        wechatId: null,
        displayName: "wxid_cli",
        talker: "wxid_cli",
      }),
    };

    await runCli(["show-contact", "--wxid", "wxid_cli"], {
      getDefaultConfigPath: () => "config/config.toml",
      loadConfig: vi.fn().mockResolvedValue(makeConfig()),
      createShowContactLookup: vi.fn().mockReturnValue(lookup),
      stdout: vi.fn(),
      stderr: vi.fn(),
    } as any);

    expect(lookup.show).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: expect.objectContaining({
          wxid: "wxid_cli",
        }),
      }),
    );
  });
});
