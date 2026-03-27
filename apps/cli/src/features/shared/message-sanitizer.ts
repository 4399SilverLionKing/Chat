import { SanitizationError, normalizeMessageText, type NormalizedMessage } from "@chat-tools/shared";

export function sanitizeMessages(messages: NormalizedMessage[]): string {
  const lines: string[] = [];

  for (const message of messages) {
    const text = normalizeMessageText(message.text);
    if (!text) {
      continue;
    }

    lines.push(`${message.speaker}：${text}`);
  }

  if (lines.length === 0) {
    throw new SanitizationError("No usable chat messages found after sanitization");
  }

  return lines.join("\n");
}
