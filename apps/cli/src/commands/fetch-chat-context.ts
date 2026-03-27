import type { Command } from "commander";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { AppConfig, ResolvedContact, WeFlowMessage } from "@chat-tools/shared";
import { normalizeMessageText } from "@chat-tools/shared";

import { getDefaultConfigPath, loadConfig } from "../config/load-config.js";
import {
  chooseContactIdentifier,
  collectMessages,
  resolveContact,
} from "../features/shared/contact-resolver.js";
import { sanitizeMessages } from "../features/shared/message-sanitizer.js";
import { WeFlowClient } from "../integrations/weflow/client.js";

const WORKSPACE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../",
);

type FetchChatContextCliOptions = {
  format?: "json" | "text";
  recentCount?: string;
  start?: string;
  end?: string;
  wechatId?: string;
  wxid?: string;
};

type FetchChatContextResult = {
  contact: ResolvedContact;
  messages: WeFlowMessage[];
};

export type FetchChatContextCommandDependencies = {
  createFetchChatContextFetcher: (config: AppConfig) => {
    fetch(options: {
      identifier: ReturnType<typeof chooseContactIdentifier>;
      pageSize: number;
      maxPages: number;
      start: string;
      end: string;
      recentCount: number | null;
    }): Promise<FetchChatContextResult>;
  };
  getDefaultConfigPath: () => string;
  loadConfig: (configPath: string) => Promise<AppConfig>;
  stdout: (message: string) => void;
};

export function createDefaultFetchChatContextFetcher(config: AppConfig) {
  const weflowClient = new WeFlowClient({
    baseUrl: config.weflow.baseUrl,
    token: config.weflow.token,
    timeoutSeconds: config.weflow.timeoutSeconds,
  });

  return {
    async fetch(options: {
      identifier: ReturnType<typeof chooseContactIdentifier>;
      pageSize: number;
      maxPages: number;
      start: string;
      end: string;
      recentCount: number | null;
    }): Promise<FetchChatContextResult> {
      const contact = await resolveContact(weflowClient, options.identifier);
      const messages = await collectMessages({
        client: weflowClient,
        talker: contact.talker,
        pageSize: options.pageSize,
        maxPages: options.maxPages,
        start: options.start,
        end: options.end,
      });

      return { contact, messages };
    },
  };
}

export const defaultFetchChatContextCommandDependencies: FetchChatContextCommandDependencies =
  {
    createFetchChatContextFetcher: createDefaultFetchChatContextFetcher,
    getDefaultConfigPath: () => resolve(WORKSPACE_ROOT, getDefaultConfigPath()),
    loadConfig,
    stdout: (message: string) => {
      console.log(message);
    },
  };

function resolveRecentCount(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("--recent-count must be a positive integer");
  }

  return parsed;
}

function normalizeChatMessages(messages: WeFlowMessage[]) {
  return messages
    .sort((left, right) => left.createTime - right.createTime)
    .map((message) => ({
      createTime: message.createTime,
      speaker: Number(message.isSend) === 1 ? "我" : "对方",
      text: normalizeMessageText(message.content || ""),
    }))
    .filter((message) => message.text.length > 0);
}

export async function runFetchChatContextCommand(
  options: FetchChatContextCliOptions,
  dependencies: FetchChatContextCommandDependencies,
): Promise<void> {
  const config = await dependencies.loadConfig(dependencies.getDefaultConfigPath());
  const identifier = chooseContactIdentifier({
    cliWxid: options.wxid,
    cliWechatId: options.wechatId,
    configWxid: config.weflow.wxid,
    configWechatId: config.weflow.wechatId,
  });
  const recentCount = resolveRecentCount(options.recentCount);
  const fetcher = dependencies.createFetchChatContextFetcher(config);
  const result = await fetcher.fetch({
    identifier,
    pageSize: config.weflow.messages.pageSize,
    maxPages: config.weflow.messages.maxPages,
    start: options.start ?? config.weflow.messages.start,
    end: options.end ?? config.weflow.messages.end,
    recentCount,
  });
  const normalizedMessages = normalizeChatMessages(result.messages);
  const slicedMessages =
    recentCount === null ? normalizedMessages : normalizedMessages.slice(-recentCount);

  if ((options.format ?? "text") === "json") {
    dependencies.stdout(
      JSON.stringify(
        {
          contact: result.contact,
          messages: slicedMessages,
        },
        null,
        2,
      ),
    );
    return;
  }

  dependencies.stdout(
    sanitizeMessages(
      slicedMessages.map((message) => ({
        speaker: message.speaker,
        text: message.text,
      })),
    ),
  );
}

export function registerFetchChatContextCommand(
  program: Command,
  dependencies: FetchChatContextCommandDependencies,
): void {
  program
    .command("fetch-chat-context")
    .description("Fetch recent or date-scoped chat context for a WeFlow contact")
    .option("--wxid <wxid>")
    .option("--wechat-id <wechatId>")
    .option("--recent-count <number>")
    .option("--start <YYYY-MM-DD>")
    .option("--end <YYYY-MM-DD>")
    .option("--format <format>", "text or json output", "text")
    .action(async (options: FetchChatContextCliOptions) => {
      await runFetchChatContextCommand(options, dependencies);
    });
}
