import { afterEach, describe, expect, it, vi } from "vitest";

import type { AddressInfo } from "node:net";

import type { ProfileJob } from "../models.js";
import { createApp } from "../app.js";

async function withServer<T>(
  handler: (baseUrl: string) => Promise<T>,
  options?: Parameters<typeof createApp>[0],
): Promise<T> {
  const app = createApp(options);
  const server = app.listen(0);

  try {
    const { port } = server.address() as AddressInfo;
    return await handler(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

function makeJob(): ProfileJob {
  return {
    id: "job_1",
    status: "running",
    createdAt: "2026-03-28T10:00:00.000Z",
    startedAt: "2026-03-28T10:00:00.000Z",
    finishedAt: null,
    items: [
      {
        wxid: "wxid_1",
        displayName: "Alice",
        status: "pending",
        startedAt: null,
        finishedAt: null,
        stdoutSnippet: "",
        stderrSnippet: "",
        profilePath: null,
        errorMessage: null,
      },
    ],
  };
}

describe("profile jobs api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects empty wxid lists", async () => {
    const response = await withServer((baseUrl) =>
      fetch(`${baseUrl}/api/profile-jobs`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ wxids: [] }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INVALID_JOB_REQUEST",
        message: "wxids must be a non-empty array",
      },
    });
  });

  it("creates jobs and returns the created snapshot", async () => {
    const job = makeJob();
    const response = await withServer(
      (baseUrl) =>
        fetch(`${baseUrl}/api/profile-jobs`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ wxids: ["wxid_1"] }),
        }),
      {
        startProfileJob: vi.fn().mockResolvedValue(job),
      },
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual(job);
  });

  it("returns an existing job snapshot", async () => {
    const job = makeJob();
    const response = await withServer(
      (baseUrl) => fetch(`${baseUrl}/api/profile-jobs/job_1`),
      {
        getProfileJob: vi.fn().mockReturnValue(job),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(job);
  });
});
