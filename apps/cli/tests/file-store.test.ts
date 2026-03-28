import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { FileStore } from "../src/core/file-store.js";

describe("FileStore", () => {
  it("overwrites the fixed contact profile file", async () => {
    const root = await mkdtemp(join(tmpdir(), "chat-tools-store-"));
    const store = new FileStore({
      profileDir: join(root, "profiles"),
      sanitizedChatDir: join(root, "sanitized"),
      saveSanitizedChat: false,
    });

    const first = await store.saveProfile("wxid_1", "# v1");
    const second = await store.saveProfile("wxid_1", "# v2");

    expect(first).toBe(second);
    await expect(readFile(second, "utf8")).resolves.toBe("# v2");
  });

  it("writes sanitized chat when enabled", async () => {
    const root = await mkdtemp(join(tmpdir(), "chat-tools-store-"));
    const store = new FileStore({
      profileDir: join(root, "profiles"),
      sanitizedChatDir: join(root, "sanitized"),
      saveSanitizedChat: true,
    });

    const path = await store.saveSanitizedChat("wxid_1", "我：你好");

    expect(path).not.toBeNull();
    await expect(readFile(path!, "utf8")).resolves.toBe("我：你好");
  });
});
