import { z } from "zod";

import type { WeFlowContactsResponse, WeFlowMessagesResponse } from "./models.js";

const weFlowContactSchema = z
  .object({
    username: z.string(),
    displayName: z.string(),
    remark: z.string(),
    nickname: z.string(),
    alias: z.string().nullable(),
    avatarUrl: z.string(),
    type: z.string(),
  })
  .transform((value) => ({
    username: value.username,
    displayName: value.displayName,
    remark: value.remark,
    nickname: value.nickname,
    alias: value.alias,
    avatarUrl: value.avatarUrl,
    contactType: value.type,
  }));

const weFlowMessageSchema = z
  .object({
    localId: z.number().int(),
    serverId: z.string(),
    localType: z.number().int(),
    createTime: z.number().int(),
    isSend: z.number().int(),
    senderUsername: z.string().nullable(),
    content: z.string(),
    rawContent: z.string().nullable(),
    parsedContent: z.string().nullable(),
  })
  .transform((value) => ({
    localId: value.localId,
    serverId: value.serverId,
    localType: value.localType,
    createTime: value.createTime,
    isSend: value.isSend,
    senderUsername: value.senderUsername,
    content: value.content,
    rawContent: value.rawContent,
    parsedContent: value.parsedContent,
  }));

const contactsResponseSchema = z.object({
  success: z.literal(true),
  count: z.number().int(),
  contacts: z.array(weFlowContactSchema),
});

const messagesResponseSchema = z.object({
  success: z.literal(true),
  talker: z.string(),
  count: z.number().int(),
  hasMore: z.boolean(),
  messages: z.array(weFlowMessageSchema),
});

export function parseWeFlowContactsResponse(input: unknown): WeFlowContactsResponse {
  return contactsResponseSchema.parse(input);
}

export function parseWeFlowMessagesResponse(input: unknown): WeFlowMessagesResponse {
  return messagesResponseSchema.parse(input);
}
