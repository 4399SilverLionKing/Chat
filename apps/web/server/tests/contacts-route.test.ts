import { afterEach, describe, expect, it, vi } from "vitest";

import type { AddressInfo } from "node:net";

import type { WeFlowContact } from "@chat-tools/shared";

import { createApp } from "../app.js";

async function withServer<T>(
  handler: (baseUrl: string) => Promise<T>,
  options?: Parameters<typeof createApp>[0],
): Promise<T> {
  const app = createApp(options);
  const server = app.listen(0);

  try {
    const { port } = server.address() as AddressInfo;
    return await handler(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

function makeContact(overrides: Partial<WeFlowContact> = {}): WeFlowContact {
  return {
    username: "wxid_1",
    displayName: "Alice",
    remark: "",
    nickname: "Alice",
    alias: "alice",
    avatarUrl: "",
    contactType: "friend",
    ...overrides,
  };
}

describe("contacts api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns health ok", async () => {
    const response = await withServer((baseUrl) => fetch(`${baseUrl}/api/health`));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("returns only friend contacts sorted by display name", async () => {
    const response = await withServer(
      (baseUrl) => fetch(`${baseUrl}/api/contacts`),
      {
        listContacts: vi.fn().mockResolvedValue([
          makeContact({ username: "wxid_b", displayName: "Zoe", alias: "zoe" }),
          makeContact({
            username: "123456@chatroom",
            displayName: "Project Group",
            alias: null,
            nickname: "Project Group",
            contactType: "chatroom",
          }),
          makeContact({
            username: "wxid_a",
            displayName: "Alice",
            alias: "alice",
            remark: "A",
          }),
        ]),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      contacts: [
        {
          wxid: "wxid_a",
          wechatId: "alice",
          displayName: "Alice",
          remark: "A",
          nickname: "Alice",
          avatarUrl: "",
        },
        {
          wxid: "wxid_b",
          wechatId: "zoe",
          displayName: "Zoe",
          remark: "",
          nickname: "Alice",
          avatarUrl: "",
        },
      ],
    });
  });

  it("returns structured errors when loading contacts fails", async () => {
    const response = await withServer(
      (baseUrl) => fetch(`${baseUrl}/api/contacts`),
      {
        listContacts: vi.fn().mockRejectedValue(new Error("weflow offline")),
      },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "CONTACTS_LOAD_FAILED",
        message: "weflow offline",
      },
    });
  });
});
