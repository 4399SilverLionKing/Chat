export type WeFlowContact = {
  username: string;
  displayName: string;
  remark: string;
  nickname: string;
  alias: string | null;
  avatarUrl: string;
  contactType: string;
};

export type WeFlowMessage = {
  localId: number;
  serverId: string;
  localType: number;
  createTime: number;
  isSend: number;
  senderUsername: string | null;
  content: string;
  rawContent: string | null;
  parsedContent: string | null;
};

export type WeFlowContactsResponse = {
  success: true;
  count: number;
  contacts: WeFlowContact[];
};

export type WeFlowMessagesResponse = {
  success: true;
  talker: string;
  count: number;
  hasMore: boolean;
  messages: WeFlowMessage[];
};
