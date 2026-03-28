import type { Command } from "commander";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { AppConfig, ResolvedContact } from "@chat-tools/shared";
import { WeFlowClient } from "@chat-tools/weflow-client";

import { getDefaultConfigPath, loadConfig } from "../config/load-config.js";
import { chooseContactIdentifier, resolveContact } from "../features/shared/contact-resolver.js";

const WORKSPACE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../",
);

type ShowContactCliOptions = {
  wechatId?: string;
  wxid?: string;
};

export type ShowContactCommandDependencies = {
  createShowContactLookup: (config: AppConfig) => {
    show(options: {
      identifier: ReturnType<typeof chooseContactIdentifier>;
    }): Promise<ResolvedContact>;
  };
  getDefaultConfigPath: () => string;
  loadConfig: (configPath: string) => Promise<AppConfig>;
  stdout: (message: string) => void;
};

export function createDefaultShowContactLookup(config: AppConfig) {
  const weflowClient = new WeFlowClient({
    baseUrl: config.weflow.baseUrl,
    token: config.weflow.token,
    timeoutSeconds: config.weflow.timeoutSeconds,
  });

  return {
    async show(options: {
      identifier: ReturnType<typeof chooseContactIdentifier>;
    }): Promise<ResolvedContact> {
      return resolveContact(weflowClient, options.identifier);
    },
  };
}

export const defaultShowContactCommandDependencies: ShowContactCommandDependencies = {
  createShowContactLookup: createDefaultShowContactLookup,
  getDefaultConfigPath: () => resolve(WORKSPACE_ROOT, getDefaultConfigPath()),
  loadConfig,
  stdout: (message: string) => {
    console.log(message);
  },
};

export async function runShowContactCommand(
  options: ShowContactCliOptions,
  dependencies: ShowContactCommandDependencies,
): Promise<void> {
  const config = await dependencies.loadConfig(dependencies.getDefaultConfigPath());
  const identifier = chooseContactIdentifier({
    cliWxid: options.wxid,
    cliWechatId: options.wechatId,
    configWxid: config.weflow.wxid,
    configWechatId: config.weflow.wechatId,
  });
  const lookup = dependencies.createShowContactLookup(config);
  const contact = await lookup.show({ identifier });

  dependencies.stdout(JSON.stringify(contact, null, 2));
}

export function registerShowContactCommand(
  program: Command,
  dependencies: ShowContactCommandDependencies,
): void {
  program
    .command("show-contact")
    .description("Resolve a WeFlow contact and print structured contact data")
    .option("--wxid <wxid>")
    .option("--wechat-id <wechatId>")
    .action(async (options: ShowContactCliOptions) => {
      await runShowContactCommand(options, dependencies);
    });
}
