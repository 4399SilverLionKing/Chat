import { describe, expect, it } from "vitest";

import type { ApiContact } from "../types.js";

import { filterContacts } from "./contact-filter.js";

const contacts: ApiContact[] = [
  {
    wxid: "wxid_zoe",
    wechatId: "zoe-id",
    displayName: "Zoe",
    remark: "Leader",
    nickname: "Zo",
    avatarUrl: "",
  },
  {
    wxid: "wxid_alice",
    wechatId: "alice-id",
    displayName: "Alice",
    remark: "Project owner",
    nickname: "Ali",
    avatarUrl: "",
  },
  {
    wxid: "wxid_bob",
    wechatId: "bob-id",
    displayName: "Bob",
    remark: "",
    nickname: "Bobby",
    avatarUrl: "",
  },
];

describe("filterContacts", () => {
  it("returns all contacts sorted by display name when query is empty", () => {
    expect(filterContacts(contacts, "").map((contact) => contact.displayName)).toEqual([
      "Alice",
      "Bob",
      "Zoe",
    ]);
  });

  it("matches display name", () => {
    expect(filterContacts(contacts, "ali").map((contact) => contact.wxid)).toEqual([
      "wxid_alice",
    ]);
  });

  it("matches remark and nickname", () => {
    expect(filterContacts(contacts, "leader").map((contact) => contact.wxid)).toEqual([
      "wxid_zoe",
    ]);
    expect(filterContacts(contacts, "bobby").map((contact) => contact.wxid)).toEqual([
      "wxid_bob",
    ]);
  });

  it("matches wechat id and wxid", () => {
    expect(filterContacts(contacts, "alice-id").map((contact) => contact.wxid)).toEqual([
      "wxid_alice",
    ]);
    expect(filterContacts(contacts, "wxid_zoe").map((contact) => contact.wxid)).toEqual([
      "wxid_zoe",
    ]);
  });
});
