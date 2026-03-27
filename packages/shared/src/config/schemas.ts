import { z } from "zod";

import type { AppConfig } from "./models.js";

function emptyStringToNull(value: string): string | null {
  return value === "" ? null : value;
}

const optionalConfigStringSchema = z.string().transform(emptyStringToNull);

const storageSchema = z
  .object({
    profile_dir: z.string(),
    save_sanitized_chat: z.boolean(),
    sanitized_chat_dir: z.string(),
  })
  .transform((value) => ({
    profileDir: value.profile_dir,
    saveSanitizedChat: value.save_sanitized_chat,
    sanitizedChatDir: value.sanitized_chat_dir,
  }));

const weflowMessagesSchema = z
  .object({
    page_size: z.number().int(),
    max_pages: z.number().int(),
    start: z.string(),
    end: z.string(),
  })
  .transform((value) => ({
    pageSize: value.page_size,
    maxPages: value.max_pages,
    start: value.start,
    end: value.end,
  }));

const weflowSchema = z
  .object({
    base_url: z.string(),
    timeout_seconds: z.number().int(),
    token: z.string(),
    wxid: optionalConfigStringSchema,
    wechat_id: optionalConfigStringSchema,
    messages: weflowMessagesSchema,
  })
  .transform((value) => ({
    baseUrl: value.base_url,
    timeoutSeconds: value.timeout_seconds,
    token: value.token,
    wxid: value.wxid,
    wechatId: value.wechat_id,
    messages: value.messages,
  }));

const appConfigSchema = z
  .object({
    storage: storageSchema,
    weflow: weflowSchema,
  })
  .transform((value) => ({
    storage: value.storage,
    weflow: value.weflow,
  }));

export function parseAppConfig(input: unknown): AppConfig {
  return appConfigSchema.parse(input);
}
