import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { buildReplyStrategyPrompt } from "../src/features/reply-strategy/prompt-builder.js";

describe("buildReplyStrategyPrompt", () => {
  it("uses the repo prompt template by default", async () => {
    const root = await mkdtemp(join(tmpdir(), "chat-tools-reply-prompt-"));
    const profilePath = join(root, "wxid_1.md");

    await writeFile(
      profilePath,
      ["# 联系人画像", "- 慢热", "- 讨厌被追问", "- 更喜欢轻松自然的聊天"].join("\n"),
      "utf8",
    );

    const prompt = await buildReplyStrategyPrompt({
      contactName: "Alice",
      identifierValue: "wxid_1",
      profilePath,
      recentCount: 30,
    });

    expect(prompt).toContain("请基于提供的最近聊天记录");
    expect(prompt).toContain("温和陪练");
    expect(prompt).toContain("冷静拆局");
    expect(prompt).toContain("Chat\\.agents\\skills\\love-chat-coach\\SKILL.md");
    expect(prompt).toContain("目标联系人：Alice");
    expect(prompt).toContain("联系人标识：wxid_1");
    expect(prompt).toContain(`画像文件路径：${profilePath}`);
    expect(prompt).toContain("联系人画像内容：");
    expect(prompt).toContain("更喜欢轻松自然的聊天");
    expect(prompt).toContain("最近消息条数：30");
  });

  it("uses a custom prompt template path when provided", async () => {
    const root = await mkdtemp(join(tmpdir(), "chat-tools-reply-prompt-"));
    const promptsDir = join(root, "prompts");
    const templatePath = join(promptsDir, "reply_strategy.md");
    const profilePath = join(root, "wxid_1.md");

    await mkdir(promptsDir, { recursive: true });
    await writeFile(templatePath, "自定义模板", "utf8");
    await writeFile(profilePath, "# 画像\n不喜欢太用力", "utf8");

    const prompt = await buildReplyStrategyPrompt({
      contactName: "Alice",
      identifierValue: "wxid_1",
      profilePath,
      recentCount: 12,
      promptTemplatePath: templatePath,
    });

    expect(prompt).toContain("自定义模板");
    expect(prompt).toContain("目标联系人：Alice");
    expect(prompt).toContain("联系人标识：wxid_1");
    expect(prompt).toContain(`画像文件路径：${profilePath}`);
    expect(prompt).toContain("联系人画像内容：");
    expect(prompt).toContain("不喜欢太用力");
    expect(prompt).toContain("最近消息条数：12");
  });
});
