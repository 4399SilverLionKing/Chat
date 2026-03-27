import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { buildChatProfilePrompt } from "../src/features/chat-profile/prompt-builder.js";

describe("buildChatProfilePrompt", () => {
  it("uses the repo prompt template by default", async () => {
    const prompt = await buildChatProfilePrompt({
      contactName: "Alice",
      identifierValue: "wxid_1",
      oldProfilePath: null,
    });

    expect(prompt).toContain("请基于提供的聊天记录，生成一份偏“暧昧 / 恋爱互动分析”方向的联系人画像。");
    expect(prompt).toContain("Chat\\skills\\love_chat_summary.md");
    expect(prompt).toContain("目标联系人：Alice");
    expect(prompt).toContain("联系人标识：wxid_1");
  });

  it("mentions required sections and old profile path", async () => {
    const root = await mkdtemp(join(tmpdir(), "chat-tools-prompt-"));
    const promptsDir = join(root, "prompts");
    const profileFile = join(root, "wxid_1.md");

    await mkdir(promptsDir, { recursive: true });
    await writeFile(
      join(promptsDir, "chat_profile_analysis.md"),
      "基本信息\n性格分析\n聊天偏好",
      "utf8",
    );
    await writeFile(profileFile, "# old", "utf8");

    const prompt = await buildChatProfilePrompt({
      contactName: "Alice",
      identifierValue: "wxid_1",
      oldProfilePath: profileFile,
      promptTemplatePath: join(promptsDir, "chat_profile_analysis.md"),
    });

    expect(prompt).toContain("基本信息");
    expect(prompt).toContain("性格分析");
    expect(prompt).toContain("聊天偏好");
    expect(prompt).toContain(profileFile);
  });

  it("omits old profile section when missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "chat-tools-prompt-"));
    const promptsDir = join(root, "prompts");

    await mkdir(promptsDir, { recursive: true });
    await writeFile(
      join(promptsDir, "chat_profile_analysis.md"),
      "基本信息\n性格分析\n聊天偏好",
      "utf8",
    );

    const prompt = await buildChatProfilePrompt({
      contactName: "Alice",
      identifierValue: "wxid_1",
      oldProfilePath: null,
      promptTemplatePath: join(promptsDir, "chat_profile_analysis.md"),
    });

    expect(prompt).not.toContain("旧画像文件路径");
  });
});
