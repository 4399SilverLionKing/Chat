import type { ApiContact } from "../types.js";

function normalize(value: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function matches(contact: ApiContact, query: string): boolean {
  if (!query) {
    return true;
  }

  const haystack = [
    contact.displayName,
    contact.remark,
    contact.nickname,
    contact.wechatId,
    contact.wxid,
  ]
    .map(normalize)
    .join("\n");

  return haystack.includes(query);
}

function compareContacts(left: ApiContact, right: ApiContact): number {
  const displayNameOrder = left.displayName.localeCompare(right.displayName, "zh-CN");
  if (displayNameOrder !== 0) {
    return displayNameOrder;
  }

  return left.wxid.localeCompare(right.wxid, "en");
}

export function filterContacts(contacts: ApiContact[], rawQuery: string): ApiContact[] {
  const query = normalize(rawQuery);

  return [...contacts]
    .filter((contact) => matches(contact, query))
    .sort(compareContacts);
}
