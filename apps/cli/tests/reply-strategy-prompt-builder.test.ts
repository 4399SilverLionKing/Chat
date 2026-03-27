import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { buildReplyStrategyPrompt } from "../src/features/reply-strategy/prompt-builder.js";

describe("buildReplyStrategyPrompt", () => {
  it("uses the repo prompt template by default", async () => {
    const prompt = await buildReplyStrategyPrompt({
      contactName: "Alice",
      identifierValue: "wxid_1",
      profilePath: "/tmp/profiles/wxid_1.md",
      recentCount: 30,
    });

    expect(prompt).toContain("请基于提供的最近聊天记录");
    expect(prompt).toContain("目标联系人：Alice");
    expect(prompt).toContain("联系人标识：wxid_1");
    expect(prompt).toContain("画像文件路径：/tmp/profiles/wxid_1.md");
    expect(prompt).toContain("最近消息条数：30");
  });

  it("uses a custom prompt template path when provided", async () => {
    const root = await mkdtemp(join(tmpdir(), "chat-tools-reply-prompt-"));
    const promptsDir = join(root, "prompts");
    const templatePath = join(promptsDir, "reply_strategy.md");

    await mkdir(promptsDir, { recursive: true });
    await writeFile(templatePath, "自定义模板", "utf8");

    const prompt = await buildReplyStrategyPrompt({
      contactName: "Alice",
      identifierValue: "wxid_1",
      profilePath: "/tmp/profiles/wxid_1.md",
      recentCount: 12,
      promptTemplatePath: templatePath,
    });

    expect(prompt).toContain("自定义模板");
    expect(prompt).toContain("目标联系人：Alice");
    expect(prompt).toContain("联系人标识：wxid_1");
    expect(prompt).toContain("画像文件路径：/tmp/profiles/wxid_1.md");
    expect(prompt).toContain("最近消息条数：12");
  });
});
