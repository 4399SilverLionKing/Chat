import { describe, expect, it, vi } from "vitest";

import type { WeFlowContact } from "@chat-tools/shared";

import { InMemoryJobStore } from "../job-store.js";
import {
  executeProfileAnalysisWithCli,
  ProfileJobRunner,
} from "../profile-job-runner.js";

function makeContact(overrides: Partial<WeFlowContact> = {}): WeFlowContact {
  return {
    username: "wxid_1",
    displayName: "Alice",
    remark: "",
    nickname: "Alice",
    alias: "alice",
    avatarUrl: "",
    contactType: "friend",
    ...overrides,
  };
}

describe("ProfileJobRunner", () => {
  it("runs the cli entrypoint in-process without forwarding separator arguments", async () => {
    const result = await executeProfileAnalysisWithCli("wxid_1", {
      runCli: vi.fn().mockImplementation(async (argv, dependencies) => {
        dependencies.stdout?.("Profile saved to: C:/tmp/profiles/wxid_1.md");
        return argv[0] === "analyze-chat-profile" && argv[2] === "wxid_1" ? 0 : 1;
      }),
    });

    expect(result).toEqual({
      exitCode: 0,
      stdout: "Profile saved to: C:/tmp/profiles/wxid_1.md",
      stderr: "",
    });
  });

  it("passes the expected argv to the cli runner", async () => {
    const runCli = vi.fn().mockResolvedValue(0);

    await executeProfileAnalysisWithCli("wxid_1", { runCli });

    expect(runCli).toHaveBeenCalledWith(
      [
        "analyze-chat-profile",
        "--wxid",
        "wxid_1",
      ],
      expect.objectContaining({
        stderr: expect.any(Function),
        stdout: expect.any(Function),
      }),
    );
  });

  it("creates pending items before execution and runs jobs serially", async () => {
    const store = new InMemoryJobStore();
    const runProfileCommand = vi
      .fn()
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: "Profile saved to: C:/tmp/profiles/wxid_1.md",
        stderr: "",
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: "Profile saved to: C:/tmp/profiles/wxid_2.md",
        stderr: "",
      });
    const runner = new ProfileJobRunner({
      jobStore: store,
      listContacts: vi.fn().mockResolvedValue([
        makeContact(),
        makeContact({
          username: "wxid_2",
          displayName: "Bob",
          alias: "bob",
          nickname: "Bob",
        }),
      ]),
      runProfileCommand,
    });

    const job = await runner.createJob(["wxid_1", "wxid_2"]);

    expect(job.status).toBe("running");
    expect(job.items.map((item) => item.status)).toEqual(["pending", "pending"]);

    await runner.waitForCompletion(job.id);

    const finished = store.getJob(job.id);
    expect(finished?.status).toBe("completed");
    expect(finished?.items.map((item) => item.status)).toEqual([
      "succeeded",
      "succeeded",
    ]);
    expect(finished?.items[0]?.profilePath).toBe("C:/tmp/profiles/wxid_1.md");
    expect(finished?.items[1]?.profilePath).toBe("C:/tmp/profiles/wxid_2.md");
    expect(runProfileCommand).toHaveBeenNthCalledWith(1, "wxid_1");
    expect(runProfileCommand).toHaveBeenNthCalledWith(2, "wxid_2");
  });

  it("marks failed items but continues later jobs", async () => {
    const store = new InMemoryJobStore();
    const runner = new ProfileJobRunner({
      jobStore: store,
      listContacts: vi.fn().mockResolvedValue([
        makeContact(),
        makeContact({
          username: "wxid_2",
          displayName: "Bob",
          alias: "bob",
          nickname: "Bob",
        }),
      ]),
      runProfileCommand: vi
        .fn()
        .mockResolvedValueOnce({
          exitCode: 1,
          stdout: "",
          stderr: "codex failed",
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: "Profile saved to: C:/tmp/profiles/wxid_2.md",
          stderr: "",
        }),
    });

    const job = await runner.createJob(["wxid_1", "wxid_2"]);

    await runner.waitForCompletion(job.id);

    const finished = store.getJob(job.id);
    expect(finished?.status).toBe("completed");
    expect(finished?.items[0]).toEqual(
      expect.objectContaining({
        wxid: "wxid_1",
        status: "failed",
        stderrSnippet: "codex failed",
        errorMessage: "codex failed",
      }),
    );
    expect(finished?.items[1]).toEqual(
      expect.objectContaining({
        wxid: "wxid_2",
        status: "succeeded",
        profilePath: "C:/tmp/profiles/wxid_2.md",
      }),
    );
  });
});
