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
});
