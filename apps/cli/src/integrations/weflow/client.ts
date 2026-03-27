import {
  WeFlowError,
  parseWeFlowContactsResponse,
  parseWeFlowMessagesResponse,
  type WeFlowContact,
  type WeFlowMessagesResponse,
} from "@chat-tools/shared";

type FetchLike = typeof fetch;

type WeFlowClientOptions = {
  baseUrl: string;
  token: string;
  timeoutSeconds: number;
  fetch?: FetchLike;
};

type ListMessagesOptions = {
  talker: string;
  pageSize: number;
  offset: number;
  start: string;
  end: string;
};

export class WeFlowClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutSeconds: number;
  private readonly fetch: FetchLike;

  constructor(options: WeFlowClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.token = options.token;
    this.timeoutSeconds = options.timeoutSeconds;
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  async listContacts(): Promise<WeFlowContact[]> {
    const payload = await this.getJson("/api/v1/contacts");
    return parseWeFlowContactsResponse(payload).contacts;
  }

  async listMessages(options: ListMessagesOptions): Promise<WeFlowMessagesResponse> {
    const params = new URLSearchParams({
      talker: options.talker,
      limit: String(options.pageSize),
      offset: String(options.offset),
    });

    if (options.start) {
      params.set("start", options.start);
    }
    if (options.end) {
      params.set("end", options.end);
    }

    const payload = await this.getJson(`/api/v1/messages?${params.toString()}`);
    return parseWeFlowMessagesResponse(payload);
  }

  private async getJson(path: string): Promise<unknown> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      response = await this.fetch(`${this.baseUrl}${path}`, {
        headers,
        signal: AbortSignal.timeout(this.timeoutSeconds * 1000),
      });
    } catch (error) {
      throw new WeFlowError(`WeFlow request failed: ${path}`, { cause: error });
    }

    if (response.status >= 400) {
      throw new WeFlowError(`WeFlow returned status ${response.status} for ${path}`);
    }

    let payloadText: string;
    try {
      payloadText = await response.text();
    } catch (error) {
      throw new WeFlowError(`WeFlow returned invalid JSON for ${path}`, {
        cause: error,
      });
    }

    let payload: unknown;
    try {
      payload = this.parseJsonPayload(payloadText);
    } catch (error) {
      throw new WeFlowError(`WeFlow returned invalid JSON for ${path}`, {
        cause: error,
      });
    }

    if (
      typeof payload !== "object" ||
      payload === null ||
      !("success" in payload) ||
      payload.success !== true
    ) {
      throw new WeFlowError(`WeFlow marked request unsuccessful for ${path}`);
    }

    return payload;
  }

  private parseJsonPayload(payloadText: string): unknown {
    // Preserve 64-bit message ids that would otherwise be rounded by JSON.parse.
    const normalized = payloadText.replace(
      /("serverId"\s*:\s*)(-?\d{16,})/g,
      '$1"$2"',
    );

    return JSON.parse(normalized);
  }
}
