import { access } from "node:fs/promises";

import {
  type AnalysisResult,
  type ContactIdentifier,
  type NormalizedMessage,
  type ResolvedContact,
  type WeFlowContact,
  type WeFlowMessage,
  type WeFlowMessagesResponse,
} from "@chat-tools/shared";

import {
  collectMessages as defaultCollectMessages,
  resolveContact as defaultResolveContact,
} from "../shared/contact-resolver.js";
import { sanitizeMessages } from "../shared/message-sanitizer.js";
import { buildChatProfilePrompt as defaultBuildChatProfilePrompt } from "./prompt-builder.js";

type AnalyzerOptions = {
  identifier: ContactIdentifier;
  pageSize: number;
  maxPages: number;
  start: string;
  end: string;
  cwd: string;
};

type ChatProfileAnalyzerDependencies = {
  weflowClient: {
    listContacts(): Promise<WeFlowContact[]>;
    listMessages(options: {
      talker: string;
      pageSize: number;
      offset: number;
      start: string;
      end: string;
    }): Promise<WeFlowMessagesResponse>;
  };
  fileStore: {
    getProfilePath(wxid: string): string;
    saveProfile(wxid: string, content: string): Promise<string>;
    saveSanitizedChat(wxid: string, content: string): Promise<string | null>;
  };
  codexRunner: {
    run(options: { prompt: string; chatText: string; cwd: string }): Promise<string>;
  };
  resolveContact?: (
    client: ChatProfileAnalyzerDependencies["weflowClient"],
    identifier: ContactIdentifier,
  ) => Promise<ResolvedContact>;
  collectMessages?: (options: {
    client: ChatProfileAnalyzerDependencies["weflowClient"];
    talker: string;
    pageSize: number;
    maxPages: number;
    start: string;
    end: string;
  }) => Promise<WeFlowMessage[]>;
  buildPrompt?: (options: {
    contactName: string;
    identifierValue: string;
    oldProfilePath: string | null;
  }) => Promise<string>;
};

export class ChatProfileAnalyzer {
  private readonly weflowClient: ChatProfileAnalyzerDependencies["weflowClient"];
  private readonly fileStore: ChatProfileAnalyzerDependencies["fileStore"];
  private readonly codexRunner: ChatProfileAnalyzerDependencies["codexRunner"];
  private readonly resolveContactFn: NonNullable<
    ChatProfileAnalyzerDependencies["resolveContact"]
  >;
  private readonly collectMessagesFn: NonNullable<
    ChatProfileAnalyzerDependencies["collectMessages"]
  >;
  private readonly buildPromptFn: NonNullable<
    ChatProfileAnalyzerDependencies["buildPrompt"]
  >;

  constructor(dependencies: ChatProfileAnalyzerDependencies) {
    this.weflowClient = dependencies.weflowClient;
    this.fileStore = dependencies.fileStore;
    this.codexRunner = dependencies.codexRunner;
    this.resolveContactFn = dependencies.resolveContact ?? defaultResolveContact;
    this.collectMessagesFn = dependencies.collectMessages ?? defaultCollectMessages;
    this.buildPromptFn = dependencies.buildPrompt ?? defaultBuildChatProfilePrompt;
  }

  async analyze(options: AnalyzerOptions): Promise<AnalysisResult> {
    const contact = await this.resolveContactFn(this.weflowClient, options.identifier);
    const messages = await this.collectMessagesFn({
      client: this.weflowClient,
      talker: contact.talker,
      pageSize: options.pageSize,
      maxPages: options.maxPages,
      start: options.start,
      end: options.end,
    });
    const normalizedMessages = this.normalizeMessages(messages);
    const sanitizedChat = sanitizeMessages(normalizedMessages);
    const oldProfilePath = await this.getExistingProfilePath(contact.wxid);
    const prompt = await this.buildPromptFn({
      contactName: contact.displayName,
      identifierValue: contact.wxid,
      oldProfilePath,
    });
    const profileMarkdown = await this.codexRunner.run({
      prompt,
      chatText: sanitizedChat,
      cwd: options.cwd,
    });
    const profilePath = await this.fileStore.saveProfile(contact.wxid, profileMarkdown);

    await this.fileStore.saveSanitizedChat(contact.wxid, sanitizedChat);

    return { profilePath };
  }

  private async getExistingProfilePath(wxid: string): Promise<string | null> {
    const profilePath = this.fileStore.getProfilePath(wxid);

    try {
      await access(profilePath);
      return profilePath;
    } catch {
      return null;
    }
  }

  private normalizeMessages(messages: WeFlowMessage[]): NormalizedMessage[] {
    return [...messages]
      .sort((left, right) => left.createTime - right.createTime)
      .map((message) => ({
        speaker: Number(message.isSend) === 1 ? "我" : "对方",
        text: message.content || "",
      }));
  }
}
