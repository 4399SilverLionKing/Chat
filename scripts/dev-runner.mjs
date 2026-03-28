import { spawn } from "node:child_process";
import { EOL } from "node:os";
import { pathToFileURL } from "node:url";

const DEFAULT_COMMANDS = [
  { name: "web", command: "pnpm dev:web" },
  { name: "server", command: "pnpm dev:web-server" },
];

function prefixLines(chunk, prefix) {
  return chunk
    .toString()
    .split(/\r?\n/)
    .filter((line, index, lines) => line.length > 0 || index < lines.length - 1)
    .map((line) => `[${prefix}] ${line}`)
    .join(EOL) + EOL;
}

export function spawnShellCommand(command, options = {}) {
  return spawn(command, {
    cwd: options.cwd ?? process.cwd(),
    env: options.env ?? process.env,
    shell: true,
    stdio: ["inherit", "pipe", "pipe"],
    windowsHide: false,
  });
}

export async function killProcessTree(pid) {
  if (!pid) {
    return;
  }

  if (process.platform === "win32") {
    await new Promise((resolve, reject) => {
      const killer = spawn("taskkill", ["/pid", String(pid), "/t", "/f"], {
        stdio: "ignore",
        windowsHide: true,
      });

      killer.once("exit", (code) => {
        if (code === 0 || code === 128 || code === 255) {
          resolve();
          return;
        }

        reject(new Error(`taskkill exited with code ${code ?? "unknown"}`));
      });
      killer.once("error", reject);
    });
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ESRCH") {
      return;
    }
    throw error;
  }
}

export function runManagedCommands(commands = DEFAULT_COMMANDS, dependencies = {}) {
  const spawnCommand = dependencies.spawnCommand ?? spawnShellCommand;
  const killTree = dependencies.killProcessTree ?? killProcessTree;
  const stdout = dependencies.stdout ?? process.stdout;
  const stderr = dependencies.stderr ?? process.stderr;
  const onSignal = dependencies.onSignal ?? ((signal, handler) => process.on(signal, handler));
  const removeSignalHandler =
    dependencies.removeSignalHandler ?? ((signal, handler) => process.off(signal, handler));
  const exitProcess = dependencies.exitProcess ?? ((code) => {
    process.exitCode = code;
  });

  const children = commands.map((entry) => {
    const child = spawnCommand(entry.command, {
      cwd: process.cwd(),
      env: process.env,
    });

    child.stdout?.on("data", (chunk) => {
      stdout.write(prefixLines(chunk, entry.name));
    });
    child.stderr?.on("data", (chunk) => {
      stderr.write(prefixLines(chunk, entry.name));
    });

    return { entry, child };
  });

  let shuttingDown = false;

  async function shutdown(exitCode = 0) {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    for (const [signal, handler] of signalHandlers) {
      removeSignalHandler(signal, handler);
    }

    await Promise.all(
      children.map(async ({ child }) => {
        if (!child.pid) {
          return;
        }

        try {
          await killTree(child.pid);
        } catch (error) {
          stderr.write(`[dev] Failed to kill process ${child.pid}: ${String(error)}${EOL}`);
        }
      }),
    );

    exitProcess(exitCode);
  }

  for (const { entry, child } of children) {
    child.once("exit", (code, signal) => {
      if (shuttingDown) {
        return;
      }

      const normalizedCode = code ?? (signal ? 1 : 0);
      const message =
        normalizedCode === 0
          ? `[${entry.name}] exited cleanly${EOL}`
          : `[${entry.name}] exited with code ${normalizedCode}${signal ? ` (signal: ${signal})` : ""}${EOL}`;
      stdout.write(message);
      void shutdown(normalizedCode);
    });

    child.once("error", (error) => {
      stderr.write(`[${entry.name}] failed to start: ${String(error)}${EOL}`);
      void shutdown(1);
    });
  }

  const signalHandlers = new Map([
    [
      "SIGINT",
      async () => {
        stdout.write(`[dev] Received SIGINT, stopping child processes...${EOL}`);
        await shutdown(130);
      },
    ],
    [
      "SIGTERM",
      async () => {
        stdout.write(`[dev] Received SIGTERM, stopping child processes...${EOL}`);
        await shutdown(143);
      },
    ],
  ]);

  for (const [signal, handler] of signalHandlers) {
    onSignal(signal, handler);
  }

  return {
    children: children.map(({ child }) => child),
    shutdown,
  };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  runManagedCommands();
}
