import { describe, expect, it, vi } from "vitest";

import { CodexExecutionError } from "@chat-tools/shared";

import { CodexRunner } from "../src/core/codex-runner.js";

describe("CodexRunner", () => {
  it("passes the full request through stdin to codex exec", async () => {
    const exec = vi.fn().mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: "# profile",
    });
    const runner = new CodexRunner({ exec });

    const output = await runner.run({
      prompt: "analyze",
      chatText: "我：你好",
      cwd: process.cwd(),
    });

    expect(output).toBe("# profile");
    expect(exec).toHaveBeenCalledWith(
      "codex",
      ["exec", "--sandbox", "read-only", "-"],
      {
      cwd: process.cwd(),
      input: "analyze\n\n聊天记录：\n我：你好",
      },
    );
  });

  it("raises on non-zero exit", async () => {
    const runner = new CodexRunner({
      exec: vi.fn().mockResolvedValue({
        exitCode: 1,
        stderr: "boom",
        stdout: "",
      }),
    });

    await expect(
      runner.run({
        prompt: "analyze",
        chatText: "我：你好",
        cwd: process.cwd(),
      }),
    ).rejects.toBeInstanceOf(CodexExecutionError);
  });

  it("raises on empty stdout", async () => {
    const runner = new CodexRunner({
      exec: vi.fn().mockResolvedValue({
        exitCode: 0,
        stderr: "",
        stdout: "   ",
      }),
    });

    await expect(
      runner.run({
        prompt: "analyze",
        chatText: "我：你好",
        cwd: process.cwd(),
      }),
    ).rejects.toBeInstanceOf(CodexExecutionError);
  });
});
