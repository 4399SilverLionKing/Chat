import { describe, expect, it } from "vitest";

import { parseWeFlowContactsResponse, parseWeFlowMessagesResponse } from "../src/weflow/schemas.js";

describe("parseWeFlowContactsResponse", () => {
  it("parses a successful contacts response", () => {
    const payload = parseWeFlowContactsResponse({
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
    });

    expect(payload.contacts[0]?.username).toBe("wxid_1");
  });

  it("fills defaults when optional contact fields are omitted", () => {
    const payload = parseWeFlowContactsResponse({
      success: true,
      count: 1,
      contacts: [
        {
          username: "wxid_2",
          displayName: "Bob",
          type: "friend",
        },
      ],
    });

    expect(payload.contacts[0]).toEqual({
      username: "wxid_2",
      displayName: "Bob",
      remark: "",
      nickname: "",
      alias: null,
      avatarUrl: "",
      contactType: "friend",
    });
  });
});

describe("parseWeFlowMessagesResponse", () => {
  it("parses a successful messages response", () => {
    const payload = parseWeFlowMessagesResponse({
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
    });

    expect(payload.messages[0]?.content).toBe("你好");
  });

  it("normalizes numeric server ids to strings", () => {
    const payload = parseWeFlowMessagesResponse({
      success: true,
      talker: "wxid_1",
      count: 1,
      hasMore: false,
      messages: [
        {
          localId: 1,
          serverId: 123456,
          localType: 1,
          createTime: 1738713600,
          isSend: 1,
          senderUsername: "self",
          content: "你好",
          rawContent: "你好",
          parsedContent: "你好",
        },
      ],
    });

    expect(payload.messages[0]?.serverId).toBe("123456");
  });

  it("fills nulls for omitted optional message payload fields", () => {
    const payload = parseWeFlowMessagesResponse({
      success: true,
      talker: "wxid_1",
      count: 1,
      hasMore: false,
      messages: [
        {
          localId: 2,
          serverId: "2",
          localType: 3,
          createTime: 1738713601,
          isSend: 0,
          content: "[image]",
        },
      ],
    });

    expect(payload.messages[0]).toEqual({
      localId: 2,
      serverId: "2",
      localType: 3,
      createTime: 1738713601,
      isSend: 0,
      senderUsername: null,
      content: "[image]",
      rawContent: null,
      parsedContent: null,
    });
  });
});
