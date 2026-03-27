import { readFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, resolve } from "node:path";

import { ConfigError, parseAppConfig } from "@chat-tools/shared";
import { parse } from "smol-toml";

const DEFAULT_CONFIG_PATH = "config/config.toml";

function projectRootFor(configPath: string): string {
  const normalized = resolve(configPath);
  const configDir = dirname(normalized);
  const configDirName = basename(configDir);

  if (configDirName === "config") {
    return dirname(configDir);
  }

  return configDir;
}

function resolvePath(rawPath: string, projectRoot: string): string {
  if (isAbsolute(rawPath)) {
    return rawPath;
  }

  return resolve(projectRoot, rawPath);
}

export function getDefaultConfigPath(): string {
  return DEFAULT_CONFIG_PATH;
}

export async function loadConfig(configPath: string) {
  let content: string;

  try {
    content = await readFile(configPath, "utf8");
  } catch (error) {
    throw new ConfigError(`Config file not found: ${configPath}`, {
      cause: error,
    });
  }

  let parsedContent: unknown;

  try {
    parsedContent = parse(content);
  } catch (error) {
    throw new ConfigError(`Failed to load config: ${configPath}`, {
      cause: error,
    });
  }

  const config = parseAppConfig(parsedContent);
  const projectRoot = projectRootFor(configPath);

  return {
    ...config,
    storage: {
      ...config.storage,
      profileDir: resolvePath(config.storage.profileDir, projectRoot),
      sanitizedChatDir: resolvePath(config.storage.sanitizedChatDir, projectRoot),
    },
  };
}
