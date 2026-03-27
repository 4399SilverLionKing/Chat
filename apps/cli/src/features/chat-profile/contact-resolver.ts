import {
  ContactIdentifier,
  ContactResolutionError,
  type ResolvedContact,
  type WeFlowContact,
  type WeFlowMessage,
  type WeFlowMessagesResponse,
} from "@chat-tools/shared";

type ContactClient = {
  listContacts(): Promise<WeFlowContact[]>;
};

type MessagesClient = {
  listMessages(options: {
    talker: string;
    pageSize: number;
    offset: number;
    start: string;
    end: string;
  }): Promise<WeFlowMessagesResponse>;
};

type ChooseContactIdentifierOptions = {
  cliWxid?: string;
  cliWechatId?: string;
  configWxid?: string | null;
  configWechatId?: string | null;
};

type CollectMessagesOptions = {
  client: MessagesClient;
  talker: string;
  pageSize: number;
  maxPages: number;
  start: string;
  end: string;
};

export async function resolveContact(
  client: ContactClient,
  identifier: ContactIdentifier,
): Promise<ResolvedContact> {
  const matches = (await client.listContacts()).filter((contact) => {
    if (identifier.wxid) {
      return contact.username === identifier.wxid;
    }
    if (identifier.wechatId) {
      return contact.alias === identifier.wechatId;
    }
    return false;
  });

  if (matches.length === 0) {
    throw new ContactResolutionError(`Contact not found: ${identifier.preferredValue}`);
  }
  if (matches.length > 1) {
    throw new ContactResolutionError(`Contact not unique: ${identifier.preferredValue}`);
  }

  const contact = matches[0]!;
  const displayName =
    contact.displayName || contact.remark || contact.nickname || contact.username;

  return {
    wxid: contact.username,
    wechatId: contact.alias,
    displayName,
    talker: contact.username,
  };
}

export async function collectMessages(
  options: CollectMessagesOptions,
): Promise<WeFlowMessage[]> {
  const results: WeFlowMessage[] = [];

  for (let page = 0; page < options.maxPages; page += 1) {
    const response = await options.client.listMessages({
      talker: options.talker,
      pageSize: options.pageSize,
      offset: page * options.pageSize,
      start: options.start,
      end: options.end,
    });

    if (response.messages.length === 0) {
      break;
    }

    results.push(...response.messages);

    if (!response.hasMore) {
      break;
    }
  }

  return results;
}

export function chooseContactIdentifier(
  options: ChooseContactIdentifierOptions,
): ContactIdentifier {
  if (options.cliWxid) {
    return new ContactIdentifier({ wxid: options.cliWxid });
  }
  if (options.cliWechatId) {
    return new ContactIdentifier({ wechatId: options.cliWechatId });
  }
  if (options.configWxid) {
    return new ContactIdentifier({ wxid: options.configWxid });
  }
  if (options.configWechatId) {
    return new ContactIdentifier({ wechatId: options.configWechatId });
  }

  throw new ContactResolutionError("No contact identifier provided");
}
