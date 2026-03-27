import { access } from "node:fs/promises";

import {
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
} from "../chat-profile/contact-resolver.js";
import { sanitizeMessages } from "../chat-profile/message-sanitizer.js";
import { buildReplyStrategyPrompt as defaultBuildReplyStrategyPrompt } from "./prompt-builder.js";

type GenerateReplyStrategyOptions = {
  identifier: ContactIdentifier;
  pageSize: number;
  maxPages: number;
  start: string;
  end: string;
  recentCount: number;
  cwd: string;
};

export type ReplyStrategyResult = {
  markdown: string;
};

type ReplyStrategyAnalyzerDependencies = {
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
  };
  codexRunner: {
    run(options: { prompt: string; chatText: string; cwd: string }): Promise<string>;
  };
  resolveContact?: (
    client: ReplyStrategyAnalyzerDependencies["weflowClient"],
    identifier: ContactIdentifier,
  ) => Promise<ResolvedContact>;
  collectMessages?: (options: {
    client: ReplyStrategyAnalyzerDependencies["weflowClient"];
    talker: string;
    pageSize: number;
    maxPages: number;
    start: string;
    end: string;
  }) => Promise<WeFlowMessage[]>;
  buildPrompt?: (options: {
    contactName: string;
    identifierValue: string;
    profilePath: string;
    recentCount: number;
  }) => Promise<string>;
};

export class ReplyStrategyAnalyzer {
  private readonly weflowClient: ReplyStrategyAnalyzerDependencies["weflowClient"];
  private readonly fileStore: ReplyStrategyAnalyzerDependencies["fileStore"];
  private readonly codexRunner: ReplyStrategyAnalyzerDependencies["codexRunner"];
  private readonly resolveContactFn: NonNullable<
    ReplyStrategyAnalyzerDependencies["resolveContact"]
  >;
  private readonly collectMessagesFn: NonNullable<
    ReplyStrategyAnalyzerDependencies["collectMessages"]
  >;
  private readonly buildPromptFn: NonNullable<
    ReplyStrategyAnalyzerDependencies["buildPrompt"]
  >;

  constructor(dependencies: ReplyStrategyAnalyzerDependencies) {
    this.weflowClient = dependencies.weflowClient;
    this.fileStore = dependencies.fileStore;
    this.codexRunner = dependencies.codexRunner;
    this.resolveContactFn = dependencies.resolveContact ?? defaultResolveContact;
    this.collectMessagesFn = dependencies.collectMessages ?? defaultCollectMessages;
    this.buildPromptFn =
      dependencies.buildPrompt ?? defaultBuildReplyStrategyPrompt;
  }

  async generate(
    options: GenerateReplyStrategyOptions,
  ): Promise<ReplyStrategyResult> {
    const contact = await this.resolveContactFn(this.weflowClient, options.identifier);
    const messages = await this.collectMessagesFn({
      client: this.weflowClient,
      talker: contact.talker,
      pageSize: options.pageSize,
      maxPages: options.maxPages,
      start: options.start,
      end: options.end,
    });
    const recentMessages = [...messages]
      .sort((left, right) => left.createTime - right.createTime)
      .slice(-options.recentCount);

    if (recentMessages.length === 0) {
      throw new Error("Reply strategy requires at least one recent message.");
    }

    const profilePath = this.fileStore.getProfilePath(contact.wxid);

    try {
      await access(profilePath);
    } catch {
      throw new Error(
        `Reply strategy profile not found: ${profilePath}. Run analyze-chat-profile first.`,
      );
    }

    const prompt = await this.buildPromptFn({
      contactName: contact.displayName,
      identifierValue: contact.wxid,
      profilePath,
      recentCount: recentMessages.length,
    });
    const sanitizedChat = sanitizeMessages(this.normalizeMessages(recentMessages));
    const markdown = await this.codexRunner.run({
      prompt,
      chatText: sanitizedChat,
      cwd: options.cwd,
    });

    return { markdown };
  }

  private normalizeMessages(messages: WeFlowMessage[]): NormalizedMessage[] {
    return messages.map((message) => ({
      speaker: Number(message.isSend) === 1 ? "我" : "对方",
      text: message.content || "",
    }));
  }
}
