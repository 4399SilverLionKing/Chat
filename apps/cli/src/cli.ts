import { Command } from "commander";

import {
  defaultAnalyzeChatProfileCommandDependencies,
  registerAnalyzeChatProfileCommand,
  type AnalyzeChatProfileCommandDependencies,
} from "./commands/analyze-chat-profile.js";
import {
  defaultGenerateReplyStrategyCommandDependencies,
  registerGenerateReplyStrategyCommand,
  type GenerateReplyStrategyCommandDependencies,
} from "./commands/generate-reply-strategy.js";
import {
  defaultFetchChatContextCommandDependencies,
  registerFetchChatContextCommand,
  type FetchChatContextCommandDependencies,
} from "./commands/fetch-chat-context.js";
import {
  defaultShowContactCommandDependencies,
  registerShowContactCommand,
  type ShowContactCommandDependencies,
} from "./commands/show-contact.js";

type CliDependencies = Partial<
  AnalyzeChatProfileCommandDependencies &
    FetchChatContextCommandDependencies &
    GenerateReplyStrategyCommandDependencies &
    ShowContactCommandDependencies & {
    stderr: (message: string) => void;
  }
>;

export function createCli(dependencies: CliDependencies = {}): Command {
  const program = new Command();
  program.name("chat-tools");
  registerAnalyzeChatProfileCommand(program, {
    ...defaultAnalyzeChatProfileCommandDependencies,
    ...dependencies,
  });
  registerGenerateReplyStrategyCommand(program, {
    ...defaultGenerateReplyStrategyCommandDependencies,
    ...dependencies,
  });
  registerFetchChatContextCommand(program, {
    ...defaultFetchChatContextCommandDependencies,
    ...dependencies,
  });
  registerShowContactCommand(program, {
    ...defaultShowContactCommandDependencies,
    ...dependencies,
  });
  return program;
}

export async function runCli(
  argv: string[],
  dependencies: CliDependencies = {},
): Promise<number> {
  const stderr =
    dependencies.stderr ??
    ((message: string) => {
      console.error(message);
    });

  try {
    await createCli(dependencies).parseAsync(argv, { from: "user" });
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stderr(`Error: ${message}`);
    return 1;
  }
}
