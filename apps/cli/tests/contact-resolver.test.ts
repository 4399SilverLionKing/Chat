import { describe, expect, it } from "vitest";

import {
  ContactResolutionError,
  ContactIdentifier,
  type WeFlowContact,
  type WeFlowMessagesResponse,
} from "@chat-tools/shared";

import {
  chooseContactIdentifier,
  collectMessages,
  resolveContact,
} from "../src/features/shared/contact-resolver.js";

class FakeClient {
  private readonly contacts: WeFlowContact[];
  private readonly pages: WeFlowMessagesResponse[];
  readonly calls: Array<Record<string, unknown>> = [];

  constructor(options: { contacts?: WeFlowContact[]; pages?: WeFlowMessagesResponse[] }) {
    this.contacts = options.contacts ?? [];
    this.pages = options.pages ?? [];
  }

  async listContacts() {
    return this.contacts;
  }

  async listMessages(options: Record<string, unknown>) {
    this.calls.push(options);
    return (
      this.pages.shift() ?? {
        success: true as const,
        talker: "wxid_1",
        count: 0,
        hasMore: false,
        messages: [],
      }
    );
  }
}

describe("chooseContactIdentifier", () => {
  it("prefers cli wxid over config wechat id", () => {
    const chosen = chooseContactIdentifier({
      cliWxid: "wxid_cli",
      cliWechatId: undefined,
      configWxid: undefined,
      configWechatId: "alice",
    });

    expect(chosen.preferredValue).toBe("wxid_cli");
  });
});

describe("resolveContact", () => {
  it("resolves by wechat id", async () => {
    const client = new FakeClient({
      contacts: [
        {
          username: "wxid_1",
          displayName: "Alice",
          remark: "",
          nickname: "Alice",
          alias: "alice",
          avatarUrl: "",
          contactType: "friend",
        },
      ],
    });

    const resolved = await resolveContact(client, new ContactIdentifier({ wechatId: "alice" }));

    expect(resolved.wxid).toBe("wxid_1");
    expect(resolved.wechatId).toBe("alice");
  });

  it("raises when contact is not found", async () => {
    const client = new FakeClient({ contacts: [] });

    await expect(
      resolveContact(client, new ContactIdentifier({ wxid: "wxid_404" })),
    ).rejects.toBeInstanceOf(ContactResolutionError);
  });
});

describe("collectMessages", () => {
  it("stops after an empty page", async () => {
    const client = new FakeClient({
      pages: [
        {
          success: true,
          talker: "wxid_1",
          count: 1,
          hasMore: true,
          messages: [
            {
              localId: 1,
              serverId: "1",
              localType: 1,
              createTime: 2,
              isSend: 1,
              senderUsername: "self",
              content: "2",
              rawContent: "2",
              parsedContent: "2",
            },
          ],
        },
        {
          success: true,
          talker: "wxid_1",
          count: 0,
          hasMore: false,
          messages: [],
        },
      ],
    });

    const messages = await collectMessages({
      client,
      talker: "wxid_1",
      pageSize: 20,
      maxPages: 5,
      start: "",
      end: "",
    });

    expect(messages.map((message) => message.content)).toEqual(["2"]);
    expect(client.calls).toHaveLength(2);
  });
});
