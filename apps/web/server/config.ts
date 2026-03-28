import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { WeFlowClient } from "@chat-tools/weflow-client";

import { getDefaultConfigPath, loadConfig } from "../../cli/src/config/load-config.js";

const WORKSPACE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../",
);

export async function loadServerConfig() {
  return loadConfig(resolve(WORKSPACE_ROOT, getDefaultConfigPath()));
}

export async function createWeFlowClient() {
  const config = await loadServerConfig();

  return new WeFlowClient({
    baseUrl: config.weflow.baseUrl,
    token: config.weflow.token,
    timeoutSeconds: config.weflow.timeoutSeconds,
  });
}
