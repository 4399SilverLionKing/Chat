import type { Command } from "commander";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { AppConfig } from "@chat-tools/shared";

import { getDefaultConfigPath, loadConfig } from "../config/load-config.js";
import { CodexRunner } from "../core/codex-runner.js";
import { FileStore } from "../core/file-store.js";
import { chooseContactIdentifier } from "../features/shared/contact-resolver.js";
import { ReplyStrategyAnalyzer } from "../features/reply-strategy/analyzer.js";
import { WeFlowClient } from "../integrations/weflow/client.js";

const WORKSPACE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../",
);

type GenerateReplyStrategyCliOptions = {
  recentCount?: string;
  wechatId?: string;
  wxid?: string;
};

export type GenerateReplyStrategyCommandDependencies = {
  createReplyStrategyAnalyzer: (config: AppConfig) => {
    generate(options: {
      identifier: ReturnType<typeof chooseContactIdentifier>;
      pageSize: number;
      maxPages: number;
      start: string;
      end: string;
      recentCount: number;
      date: string;
      cwd: string;
    }): Promise<{ replyPath: string }>;
  };
  cwd: () => string;
  getDefaultConfigPath: () => string;
  loadConfig: (configPath: string) => Promise<AppConfig>;
  today: () => string;
  stdout: (message: string) => void;
};

export function createDefaultReplyStrategyAnalyzer(
  config: AppConfig,
): ReplyStrategyAnalyzer {
  const weflowClient = new WeFlowClient({
    baseUrl: config.weflow.baseUrl,
    token: config.weflow.token,
    timeoutSeconds: config.weflow.timeoutSeconds,
  });
  const fileStore = new FileStore({
    profileDir: config.storage.profileDir,
    replyDir: config.storage.replyDir,
    sanitizedChatDir: config.storage.sanitizedChatDir,
    saveSanitizedChat: config.storage.saveSanitizedChat,
  });

  return new ReplyStrategyAnalyzer({
    weflowClient,
    fileStore,
    codexRunner: new CodexRunner(),
  });
}

export const defaultGenerateReplyStrategyCommandDependencies: GenerateReplyStrategyCommandDependencies =
  {
    createReplyStrategyAnalyzer: createDefaultReplyStrategyAnalyzer,
    cwd: () => process.cwd(),
    getDefaultConfigPath: () => resolve(WORKSPACE_ROOT, getDefaultConfigPath()),
    loadConfig,
    today: () => new Date().toISOString().slice(0, 10),
    stdout: (message: string) => {
      console.log(message);
    },
  };

function resolveRecentCount(cliValue: string | undefined, configValue: number): number {
  if (cliValue === undefined) {
    return configValue;
  }

  const parsed = Number(cliValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("--recent-count must be a positive integer");
  }

  return parsed;
}

export async function runGenerateReplyStrategyCommand(
  options: GenerateReplyStrategyCliOptions,
  dependencies: GenerateReplyStrategyCommandDependencies,
): Promise<void> {
  const config = await dependencies.loadConfig(dependencies.getDefaultConfigPath());
  const identifier = chooseContactIdentifier({
    cliWxid: options.wxid,
    cliWechatId: options.wechatId,
    configWxid: config.weflow.wxid,
    configWechatId: config.weflow.wechatId,
  });
  const analyzer = dependencies.createReplyStrategyAnalyzer(config);
  const result = await analyzer.generate({
    identifier,
    pageSize: config.weflow.messages.pageSize,
    maxPages: config.weflow.messages.maxPages,
    start: config.weflow.messages.start,
    end: config.weflow.messages.end,
    recentCount: resolveRecentCount(
      options.recentCount,
      config.replyStrategy.recentCount,
    ),
    date: dependencies.today(),
    cwd: dependencies.cwd(),
  });

  dependencies.stdout(`Reply saved to: ${result.replyPath}`);
}

export function registerGenerateReplyStrategyCommand(
  program: Command,
  dependencies: GenerateReplyStrategyCommandDependencies,
): void {
  program
    .command("generate-reply-strategy")
    .description("Generate a reply strategy from recent WeFlow messages")
    .option("--wxid <wxid>")
    .option("--wechat-id <wechatId>")
    .option("--recent-count <number>")
    .action(async (options: GenerateReplyStrategyCliOptions) => {
      await runGenerateReplyStrategyCommand(options, dependencies);
    });
}
