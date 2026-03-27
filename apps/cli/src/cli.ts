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

type CliDependencies = Partial<
  AnalyzeChatProfileCommandDependencies &
    GenerateReplyStrategyCommandDependencies & {
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
