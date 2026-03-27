export type StorageConfig = {
  profileDir: string;
  saveSanitizedChat: boolean;
  sanitizedChatDir: string;
};

export type WeFlowMessagesConfig = {
  pageSize: number;
  maxPages: number;
  start: string;
  end: string;
};

export type WeFlowConfig = {
  baseUrl: string;
  timeoutSeconds: number;
  token: string;
  wxid: string | null;
  wechatId: string | null;
  messages: WeFlowMessagesConfig;
};

export type ReplyStrategyConfig = {
  recentCount: number;
};

export type AppConfig = {
  storage: StorageConfig;
  weflow: WeFlowConfig;
  replyStrategy: ReplyStrategyConfig;
};
