import { execa } from "execa";

import { CodexExecutionError } from "@chat-tools/shared";

type ExecResult = {
  exitCode: number;
  stderr: string;
  stdout: string;
};

type ExecFunction = (
  file: string,
  args: string[],
  options: {
    cwd: string;
    input: string;
  },
) => Promise<ExecResult>;

type CodexRunnerOptions = {
  exec?: ExecFunction;
};

type RunOptions = {
  prompt: string;
  chatText: string;
  cwd: string;
};

const defaultExec: ExecFunction = async (file, args, options) => {
  const result = await execa(file, args, {
    cwd: options.cwd,
    input: options.input,
    reject: false,
  });

  return {
    exitCode: result.exitCode ?? 0,
    stderr: result.stderr,
    stdout: result.stdout,
  };
};

export class CodexRunner {
  private readonly exec: ExecFunction;

  constructor(options: CodexRunnerOptions = {}) {
    this.exec = options.exec ?? defaultExec;
  }

  async run(options: RunOptions): Promise<string> {
    let completed: ExecResult;

    try {
      completed = await this.exec("codex", ["exec", "--sandbox", "read-only", "-"], {
        cwd: options.cwd,
        input: `${options.prompt}\n\n聊天记录：\n${options.chatText}`,
      });
    } catch (error) {
      throw new CodexExecutionError("codex command not found", { cause: error });
    }

    if (completed.exitCode !== 0) {
      throw new CodexExecutionError(completed.stderr.trim() || "codex exec failed");
    }

    const output = completed.stdout.trim();
    if (output.length === 0) {
      throw new CodexExecutionError("codex exec returned empty output");
    }

    return output;
  }
}
