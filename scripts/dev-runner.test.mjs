import { EventEmitter } from "node:events";
import { execFileSync } from "node:child_process";

import { describe, expect, it, vi } from "vitest";

import { runManagedCommands } from "./dev-runner.mjs";

class FakeChildProcess extends EventEmitter {
  constructor(pid) {
    super();
    this.pid = pid;
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function countProcessesByMarker(marker) {
  const command = `
$items = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*${marker}*' }
($items | Measure-Object).Count
`;

  return Number(
    execFileSync("powershell", ["-NoProfile", "-Command", command], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim(),
  );
}

describe("runManagedCommands", () => {
  it("kills all child process trees when SIGINT is received", async () => {
    const children = [new FakeChildProcess(101), new FakeChildProcess(202)];
    const spawnCommand = vi
      .fn()
      .mockReturnValueOnce(children[0])
      .mockReturnValueOnce(children[1]);
    const killProcessTree = vi.fn().mockResolvedValue(undefined);
    const handlers = new Map();
    const removeSignalHandler = vi.fn();

    runManagedCommands(
      [
        { name: "web", command: "pnpm dev:web" },
        { name: "server", command: "pnpm dev:web-server" },
      ],
      {
        spawnCommand,
        killProcessTree,
        onSignal(signal, handler) {
          handlers.set(signal, handler);
        },
        removeSignalHandler,
        stdout: { write() {} },
        stderr: { write() {} },
      },
    );

    await handlers.get("SIGINT")?.();

    expect(killProcessTree).toHaveBeenCalledTimes(2);
    expect(killProcessTree).toHaveBeenNthCalledWith(1, 101);
    expect(killProcessTree).toHaveBeenNthCalledWith(2, 202);
    expect(removeSignalHandler).toHaveBeenCalledWith("SIGINT", expect.any(Function));
    expect(removeSignalHandler).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
  });

  it("cleans up real shell child processes on SIGINT on Windows", async () => {
    if (process.platform !== "win32") {
      return;
    }

    const marker = `chat-dev-runner-${Date.now()}`;
    const handlers = new Map();

    runManagedCommands(
      [
        {
          name: "hold-a",
          command: `node -e "setInterval(() => {}, 1000)" ${marker}-a`,
        },
        {
          name: "hold-b",
          command: `node -e "setInterval(() => {}, 1000)" ${marker}-b`,
        },
      ],
      {
        onSignal(signal, handler) {
          handlers.set(signal, handler);
        },
        stdout: { write() {} },
        stderr: { write() {} },
      },
    );

    await sleep(600);
    expect(countProcessesByMarker(marker)).toBeGreaterThan(0);

    await handlers.get("SIGINT")?.();
    await sleep(1000);

    expect(countProcessesByMarker(marker)).toBe(0);
  });
});
