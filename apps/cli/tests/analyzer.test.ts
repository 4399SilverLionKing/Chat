import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it, vi } from "vitest";

import { ContactIdentifier } from "@chat-tools/shared";

import { ChatProfileAnalyzer } from "../src/features/chat-profile/analyzer.js";

describe("ChatProfileAnalyzer", () => {
  it("runs the full analysis flow", async () => {
    const fileStore = {
      getProfilePath: vi.fn().mockReturnValue("/tmp/wxid_1.md"),
      saveProfile: vi.fn().mockResolvedValue("/tmp/wxid_1.md"),
      saveSanitizedChat: vi.fn().mockResolvedValue(null),
    };
    const codexRunner = {
      run: vi.fn().mockResolvedValue("# profile"),
    };
    const analyzer = new ChatProfileAnalyzer({
      weflowClient: {
        listContacts: vi.fn(),
        listMessages: vi.fn(),
      },
      fileStore,
      codexRunner,
      resolveContact: vi.fn().mockResolvedValue({
        wxid: "wxid_1",
        wechatId: "alice",
        displayName: "Alice",
        talker: "wxid_1",
      }),
      collectMessages: vi.fn().mockResolvedValue([
        {
          localId: 1,
          serverId: "1",
          localType: 1,
          createTime: 1,
          isSend: 1,
          senderUsername: "self",
          content: "你好",
          rawContent: "你好",
          parsedContent: "你好",
        },
      ]),
      buildPrompt: vi.fn().mockResolvedValue("prompt"),
    });

    const result = await analyzer.analyze({
      identifier: new ContactIdentifier({ wxid: "wxid_1" }),
      pageSize: 200,
      maxPages: 10,
      start: "",
      end: "",
      cwd: process.cwd(),
    });

    expect(result.profilePath).toBe("/tmp/wxid_1.md");
    expect(fileStore.saveProfile).toHaveBeenCalledWith("wxid_1", "# profile");
    expect(codexRunner.run).toHaveBeenCalledWith({
      prompt: "prompt",
      chatText: "我：你好",
      cwd: process.cwd(),
    });
  });

  it("omits old profile path when the profile file does not exist", async () => {
    const root = await mkdtemp(join(tmpdir(), "chat-tools-analyzer-"));
    const buildPrompt = vi.fn().mockResolvedValue("prompt");
    const analyzer = new ChatProfileAnalyzer({
      weflowClient: {
        listContacts: vi.fn(),
        listMessages: vi.fn(),
      },
      fileStore: {
        getProfilePath: vi.fn().mockReturnValue(join(root, "missing.md")),
        saveProfile: vi.fn().mockResolvedValue(join(root, "wxid_1.md")),
        saveSanitizedChat: vi.fn().mockResolvedValue(null),
      },
      codexRunner: {
        run: vi.fn().mockResolvedValue("# profile"),
      },
      resolveContact: vi.fn().mockResolvedValue({
        wxid: "wxid_1",
        wechatId: "alice",
        displayName: "Alice",
        talker: "wxid_1",
      }),
      collectMessages: vi.fn().mockResolvedValue([
        {
          localId: 1,
          serverId: "1",
          localType: 1,
          createTime: 1,
          isSend: 1,
          senderUsername: "self",
          content: "你好",
          rawContent: "你好",
          parsedContent: "你好",
        },
      ]),
      buildPrompt,
    });

    await analyzer.analyze({
      identifier: new ContactIdentifier({ wxid: "wxid_1" }),
      pageSize: 200,
      maxPages: 10,
      start: "",
      end: "",
      cwd: process.cwd(),
    });

    expect(buildPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        oldProfilePath: null,
      }),
    );
  });

  it("passes old profile path when the file exists", async () => {
    const root = await mkdtemp(join(tmpdir(), "chat-tools-analyzer-"));
    const existingProfilePath = join(root, "wxid_1.md");
    const buildPrompt = vi.fn().mockResolvedValue("prompt");

    await writeFile(existingProfilePath, "# old", "utf8");

    const analyzer = new ChatProfileAnalyzer({
      weflowClient: {
        listContacts: vi.fn(),
        listMessages: vi.fn(),
      },
      fileStore: {
        getProfilePath: vi.fn().mockReturnValue(existingProfilePath),
        saveProfile: vi.fn().mockResolvedValue(existingProfilePath),
        saveSanitizedChat: vi.fn().mockResolvedValue(null),
      },
      codexRunner: {
        run: vi.fn().mockResolvedValue("# profile"),
      },
      resolveContact: vi.fn().mockResolvedValue({
        wxid: "wxid_1",
        wechatId: "alice",
        displayName: "Alice",
        talker: "wxid_1",
      }),
      collectMessages: vi.fn().mockResolvedValue([
        {
          localId: 1,
          serverId: "1",
          localType: 1,
          createTime: 1,
          isSend: 1,
          senderUsername: "self",
          content: "你好",
          rawContent: "你好",
          parsedContent: "你好",
        },
      ]),
      buildPrompt,
    });

    await analyzer.analyze({
      identifier: new ContactIdentifier({ wxid: "wxid_1" }),
      pageSize: 200,
      maxPages: 10,
      start: "",
      end: "",
      cwd: process.cwd(),
    });

    expect(buildPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        oldProfilePath: existingProfilePath,
      }),
    );
  });
});
