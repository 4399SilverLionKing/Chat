import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { StorageError } from "@chat-tools/shared";

type FileStoreOptions = {
  profileDir: string;
  replyDir: string;
  sanitizedChatDir: string;
  saveSanitizedChat: boolean;
};

export class FileStore {
  private readonly profileDir: string;
  private readonly replyDir: string;
  private readonly sanitizedChatDir: string;
  private readonly saveSanitizedChatEnabled: boolean;

  constructor(options: FileStoreOptions) {
    this.profileDir = options.profileDir;
    this.replyDir = options.replyDir;
    this.sanitizedChatDir = options.sanitizedChatDir;
    this.saveSanitizedChatEnabled = options.saveSanitizedChat;
  }

  getProfilePath(wxid: string): string {
    return join(this.profileDir, `${wxid}.md`);
  }

  async saveProfile(wxid: string, content: string): Promise<string> {
    const path = this.getProfilePath(wxid);
    await this.writeText(path, content);
    return path;
  }

  async saveSanitizedChat(wxid: string, content: string): Promise<string | null> {
    if (!this.saveSanitizedChatEnabled) {
      return null;
    }

    const path = join(this.sanitizedChatDir, `${wxid}.txt`);
    await this.writeText(path, content);
    return path;
  }

  async saveReplyStrategy(
    date: string,
    wxid: string,
    content: string,
  ): Promise<string> {
    const path = join(this.replyDir, `${date}-${wxid}.md`);
    await this.writeText(path, content);
    return path;
  }

  private async writeText(path: string, content: string): Promise<void> {
    try {
      await mkdir(join(path, ".."), { recursive: true });
      await writeFile(path, content, "utf8");
    } catch (error) {
      throw new StorageError(`Failed to write file: ${path}`, { cause: error });
    }
  }
}
