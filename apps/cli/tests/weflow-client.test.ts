import { describe, expect, it, vi } from "vitest";

import { WeFlowError } from "@chat-tools/shared";

import { WeFlowClient } from "../src/integrations/weflow/client.js";

describe("WeFlowClient", () => {
  it("uses bearer token when listing contacts", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          count: 1,
          contacts: [
            {
              username: "wxid_1",
              displayName: "Alice",
              remark: "",
              nickname: "Alice",
              alias: "alice",
              avatarUrl: "",
              type: "friend",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const client = new WeFlowClient({
      baseUrl: "http://127.0.0.1:5031",
      token: "token",
      timeoutSeconds: 30,
      fetch: fetcher,
    });

    const contacts = await client.listContacts();

    expect(contacts[0]?.username).toBe("wxid_1");
    expect(fetcher).toHaveBeenCalledWith(
      "http://127.0.0.1:5031/api/v1/contacts",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token",
        }),
      }),
    );
  });

  it("uses limit and offset when listing messages", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          talker: "wxid_1",
          count: 1,
          hasMore: false,
          messages: [
            {
              localId: 1,
              serverId: "1",
              localType: 1,
              createTime: 1738713600,
              isSend: 1,
              senderUsername: "self",
              content: "你好",
              rawContent: "你好",
              parsedContent: "你好",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const client = new WeFlowClient({
      baseUrl: "http://127.0.0.1:5031",
      token: "token",
      timeoutSeconds: 30,
      fetch: fetcher,
    });

    const result = await client.listMessages({
      talker: "wxid_1",
      pageSize: 20,
      offset: 40,
      start: "20260101",
      end: "20260131",
    });

    expect(result.messages[0]?.content).toBe("你好");
    const [url] = fetcher.mock.calls[0] ?? [];
    expect(String(url)).toContain("limit=20");
    expect(String(url)).toContain("offset=40");
  });

  it("raises on unsuccessful http response", async () => {
    const client = new WeFlowClient({
      baseUrl: "http://127.0.0.1:5031",
      token: "token",
      timeoutSeconds: 30,
      fetch: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: false }), { status: 401 }),
      ),
    });

    await expect(client.listContacts()).rejects.toBeInstanceOf(WeFlowError);
  });

  it("wraps request exceptions", async () => {
    const client = new WeFlowClient({
      baseUrl: "http://127.0.0.1:5031",
      token: "token",
      timeoutSeconds: 30,
      fetch: vi.fn().mockRejectedValue(new Error("timeout")),
    });

    await expect(client.listContacts()).rejects.toBeInstanceOf(WeFlowError);
  });
});
