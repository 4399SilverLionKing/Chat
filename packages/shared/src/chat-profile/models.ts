export type ContactIdentifierInput = {
  wxid?: string | null;
  wechatId?: string | null;
};

export class ContactIdentifier {
  readonly wxid: string | null;
  readonly wechatId: string | null;

  constructor(input: ContactIdentifierInput) {
    this.wxid = input.wxid ?? null;
    this.wechatId = input.wechatId ?? null;
  }

  get preferredType(): "wxid" | "wechat_id" {
    return this.wxid ? "wxid" : "wechat_id";
  }

  get preferredValue(): string {
    const value = this.wxid ?? this.wechatId;
    if (value === null) {
      throw new Error("Contact identifier has no available value");
    }
    return value;
  }
}

export type ResolvedContact = {
  wxid: string;
  wechatId: string | null;
  displayName: string;
  talker: string;
};

export type NormalizedMessage = {
  speaker: string;
  text: string;
};

export type AnalysisResult = {
  profilePath: string;
};

export function normalizeMessageText(text: string): string {
  return text.trim();
}
