import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it, vi } from "vitest";

import { ContactIdentifier } from "@chat-tools/shared";

import { ReplyStrategyAnalyzer } from "../src/features/reply-strategy/analyzer.js";

function makeMessage(
  createTime: number,
  isSend: number,
  content: string,
) {
  return {
    localId: createTime,
    serverId: String(createTime),
    localType: 1,
    createTime,
    isSend,
    senderUsername: isSend === 1 ? "self" : "other",
    content,
    rawContent: content,
    parsedContent: content,
  };
}

describe("ReplyStrategyAnalyzer", () => {
  it("uses only the most recent messages", async () => {
    const root = await mkdtemp(join(tmpdir(), "chat-tools-reply-analyzer-"));
    const profilePath = join(root, "wxid_1.md");

    await writeFile(profilePath, "# profile", "utf8");

    const codexRunner = {
      run: vi.fn().mockResolvedValue("## 当前局面判断"),
    };
    const buildPrompt = vi.fn().mockResolvedValue("prompt");
    const saveReplyStrategy = vi
      .fn()
      .mockResolvedValue("/tmp/reply/2026-03-27-wxid_1.md");
    const analyzer = new ReplyStrategyAnalyzer({
      weflowClient: {
        listContacts: vi.fn(),
        listMessages: vi.fn(),
      },
      fileStore: {
        getProfilePath: vi.fn().mockReturnValue(profilePath),
        saveReplyStrategy,
      },
      codexRunner,
      resolveContact: vi.fn().mockResolvedValue({
        wxid: "wxid_1",
        wechatId: "alice",
        displayName: "Alice",
        talker: "wxid_1",
      }),
      collectMessages: vi.fn().mockResolvedValue([
        makeMessage(3, 0, "第三条"),
        makeMessage(1, 1, "第一条"),
        makeMessage(2, 1, "第二条"),
      ]),
      buildPrompt,
    });

    const result = await analyzer.generate({
      identifier: new ContactIdentifier({ wxid: "wxid_1" }),
      pageSize: 200,
      maxPages: 10,
      start: "",
      end: "",
      recentCount: 2,
      date: "2026-03-27",
      cwd: process.cwd(),
    });

    expect(result.replyPath).toBe("/tmp/reply/2026-03-27-wxid_1.md");
    expect(saveReplyStrategy).toHaveBeenCalledWith(
      "2026-03-27",
      "wxid_1",
      "## 当前局面判断",
    );
    expect(buildPrompt).toHaveBeenCalledWith({
      contactName: "Alice",
      identifierValue: "wxid_1",
      profilePath,
      recentCount: 2,
    });
    expect(codexRunner.run).toHaveBeenCalledWith({
      prompt: "prompt",
      chatText: "我：第二条\n对方：第三条",
      cwd: process.cwd(),
    });
  });

  it("uses all messages when fewer than recent count", async () => {
    const root = await mkdtemp(join(tmpdir(), "chat-tools-reply-analyzer-"));
    const profilePath = join(root, "wxid_1.md");

    await writeFile(profilePath, "# profile", "utf8");

    const buildPrompt = vi.fn().mockResolvedValue("prompt");
    const analyzer = new ReplyStrategyAnalyzer({
      weflowClient: {
        listContacts: vi.fn(),
        listMessages: vi.fn(),
      },
      fileStore: {
        getProfilePath: vi.fn().mockReturnValue(profilePath),
        saveReplyStrategy: vi
          .fn()
          .mockResolvedValue("/tmp/reply/2026-03-27-wxid_1.md"),
      },
      codexRunner: {
        run: vi.fn().mockResolvedValue("## 当前局面判断"),
      },
      resolveContact: vi.fn().mockResolvedValue({
        wxid: "wxid_1",
        wechatId: "alice",
        displayName: "Alice",
        talker: "wxid_1",
      }),
      collectMessages: vi.fn().mockResolvedValue([
        makeMessage(1, 1, "第一条"),
      ]),
      buildPrompt,
    });

    await analyzer.generate({
      identifier: new ContactIdentifier({ wxid: "wxid_1" }),
      pageSize: 200,
      maxPages: 10,
      start: "",
      end: "",
      recentCount: 30,
      date: "2026-03-27",
      cwd: process.cwd(),
    });

    expect(buildPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        recentCount: 1,
      }),
    );
  });

  it("fails when there are no recent messages", async () => {
    const analyzer = new ReplyStrategyAnalyzer({
      weflowClient: {
        listContacts: vi.fn(),
        listMessages: vi.fn(),
      },
      fileStore: {
        getProfilePath: vi.fn(),
        saveReplyStrategy: vi.fn(),
      },
      codexRunner: {
        run: vi.fn(),
      },
      resolveContact: vi.fn().mockResolvedValue({
        wxid: "wxid_1",
        wechatId: "alice",
        displayName: "Alice",
        talker: "wxid_1",
      }),
      collectMessages: vi.fn().mockResolvedValue([]),
      buildPrompt: vi.fn(),
    });

    await expect(
      analyzer.generate({
        identifier: new ContactIdentifier({ wxid: "wxid_1" }),
        pageSize: 200,
        maxPages: 10,
        start: "",
        end: "",
        recentCount: 2,
        date: "2026-03-27",
        cwd: process.cwd(),
      }),
    ).rejects.toThrow("Reply strategy requires at least one recent message.");
  });

  it("fails when the profile file is missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "chat-tools-reply-analyzer-"));
    const missingProfilePath = join(root, "missing.md");

    const analyzer = new ReplyStrategyAnalyzer({
      weflowClient: {
        listContacts: vi.fn(),
        listMessages: vi.fn(),
      },
      fileStore: {
        getProfilePath: vi.fn().mockReturnValue(missingProfilePath),
        saveReplyStrategy: vi.fn(),
      },
      codexRunner: {
        run: vi.fn(),
      },
      resolveContact: vi.fn().mockResolvedValue({
        wxid: "wxid_1",
        wechatId: "alice",
        displayName: "Alice",
        talker: "wxid_1",
      }),
      collectMessages: vi.fn().mockResolvedValue([
        makeMessage(1, 1, "第一条"),
      ]),
      buildPrompt: vi.fn(),
    });

    await expect(
      analyzer.generate({
        identifier: new ContactIdentifier({ wxid: "wxid_1" }),
        pageSize: 200,
        maxPages: 10,
        start: "",
        end: "",
        recentCount: 2,
        date: "2026-03-27",
        cwd: process.cwd(),
      }),
    ).rejects.toThrow(/Reply strategy profile not found/);
  });
});
