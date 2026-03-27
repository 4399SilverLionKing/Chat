import type { Command } from "commander";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { AppConfig } from "@chat-tools/shared";

import { getDefaultConfigPath, loadConfig } from "../config/load-config.js";
import { CodexRunner } from "../core/codex-runner.js";
import { FileStore } from "../core/file-store.js";
import { ChatProfileAnalyzer } from "../features/chat-profile/analyzer.js";
import { chooseContactIdentifier } from "../features/shared/contact-resolver.js";
import { WeFlowClient } from "../integrations/weflow/client.js";

const WORKSPACE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../",
);

type AnalyzeChatProfileCliOptions = {
  wechatId?: string;
  wxid?: string;
};

export type AnalyzeChatProfileCommandDependencies = {
  createAnalyzer: (config: AppConfig) => {
    analyze(options: {
      identifier: ReturnType<typeof chooseContactIdentifier>;
      pageSize: number;
      maxPages: number;
      start: string;
      end: string;
      cwd: string;
    }): Promise<{ profilePath: string }>;
  };
  cwd: () => string;
  getDefaultConfigPath: () => string;
  loadConfig: (configPath: string) => Promise<AppConfig>;
  stdout: (message: string) => void;
};

export function createDefaultAnalyzer(config: AppConfig): ChatProfileAnalyzer {
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

  return new ChatProfileAnalyzer({
    weflowClient,
    fileStore,
    codexRunner: new CodexRunner(),
  });
}

export const defaultAnalyzeChatProfileCommandDependencies: AnalyzeChatProfileCommandDependencies =
  {
    createAnalyzer: createDefaultAnalyzer,
    cwd: () => process.cwd(),
    getDefaultConfigPath: () => resolve(WORKSPACE_ROOT, getDefaultConfigPath()),
    loadConfig,
    stdout: (message: string) => {
      console.log(message);
    },
  };

export async function runAnalyzeChatProfileCommand(
  options: AnalyzeChatProfileCliOptions,
  dependencies: AnalyzeChatProfileCommandDependencies,
): Promise<void> {
  const config = await dependencies.loadConfig(dependencies.getDefaultConfigPath());
  const identifier = chooseContactIdentifier({
    cliWxid: options.wxid,
    cliWechatId: options.wechatId,
    configWxid: config.weflow.wxid,
    configWechatId: config.weflow.wechatId,
  });
  const analyzer = dependencies.createAnalyzer(config);
  const result = await analyzer.analyze({
    identifier,
    pageSize: config.weflow.messages.pageSize,
    maxPages: config.weflow.messages.maxPages,
    start: config.weflow.messages.start,
    end: config.weflow.messages.end,
    cwd: dependencies.cwd(),
  });

  dependencies.stdout(`Profile saved to: ${result.profilePath}`);
}

export function registerAnalyzeChatProfileCommand(
  program: Command,
  dependencies: AnalyzeChatProfileCommandDependencies,
): void {
  program
    .command("analyze-chat-profile")
    .description("Analyze a chat profile from WeFlow messages")
    .option("--wxid <wxid>")
    .option("--wechat-id <wechatId>")
    .action(async (options: AnalyzeChatProfileCliOptions) => {
      await runAnalyzeChatProfileCommand(options, dependencies);
    });
}
