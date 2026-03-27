import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PROMPT_TEMPLATE_PATH = join(
  dirname(dirname(dirname(fileURLToPath(import.meta.url)))),
  "prompts",
  "chat_profile_analysis.md",
);

type BuildChatProfilePromptOptions = {
  contactName: string;
  identifierValue: string;
  oldProfilePath: string | null;
  promptTemplatePath?: string;
};

export async function buildChatProfilePrompt(
  options: BuildChatProfilePromptOptions,
): Promise<string> {
  const template = (
    await readFile(options.promptTemplatePath ?? DEFAULT_PROMPT_TEMPLATE_PATH, "utf8")
  ).trim();

  const parts = [
    template,
    `目标联系人：${options.contactName}`,
    `联系人标识：${options.identifierValue}`,
  ];

  if (options.oldProfilePath !== null) {
    parts.push(`旧画像文件路径：${options.oldProfilePath}`);
    parts.push("请先阅读旧画像，再结合本次聊天内容生成更新后的完整画像。");
  }

  return parts.join("\n\n");
}
