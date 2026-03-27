import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PROMPT_TEMPLATE_PATH = join(
  dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url))))),
  "prompts",
  "reply_strategy.md",
);

type BuildReplyStrategyPromptOptions = {
  contactName: string;
  identifierValue: string;
  profilePath: string;
  recentCount: number;
  promptTemplatePath?: string;
};

export async function buildReplyStrategyPrompt(
  options: BuildReplyStrategyPromptOptions,
): Promise<string> {
  const template = (
    await readFile(options.promptTemplatePath ?? DEFAULT_PROMPT_TEMPLATE_PATH, "utf8")
  ).trim();

  return [
    template,
    `目标联系人：${options.contactName}`,
    `联系人标识：${options.identifierValue}`,
    `画像文件路径：${options.profilePath}`,
    `最近消息条数：${options.recentCount}`,
  ].join("\n\n");
}
