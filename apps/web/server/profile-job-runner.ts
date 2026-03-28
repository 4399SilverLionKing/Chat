import type { WeFlowContact } from "@chat-tools/shared";
import { runCli as runCliCommand } from "../../cli/src/cli.js";

import type { InMemoryJobStore } from "./job-store.js";
import type { ProfileJob } from "./models.js";

type RunCommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

type ProfileJobRunnerDependencies = {
  jobStore: InMemoryJobStore;
  listContacts: () => Promise<WeFlowContact[]>;
  runProfileCommand?: (wxid: string) => Promise<RunCommandResult>;
};

function createDisplayNameMap(contacts: WeFlowContact[]): Map<string, string> {
  return new Map(
    contacts.map((contact) => [contact.username, contact.displayName || contact.username]),
  );
}

function summarize(text: string): string {
  return text.trim().slice(0, 4000);
}

function parseProfilePath(stdout: string): string | null {
  const match = stdout.match(/Profile saved to:\s*(.+)/);
  return match ? match[1]!.trim() : null;
}

type ExecuteProfileAnalysisDependencies = {
  runCli?: typeof runCliCommand;
};

export async function executeProfileAnalysisWithCli(
  wxid: string,
  dependencies: ExecuteProfileAnalysisDependencies = {},
): Promise<RunCommandResult> {
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];
  const runCli = dependencies.runCli ?? runCliCommand;
  const exitCode = await runCli(["analyze-chat-profile", "--wxid", wxid], {
    stdout: (message: string) => {
      stdoutLines.push(message);
    },
    stderr: (message: string) => {
      stderrLines.push(message);
    },
  });

  return {
    exitCode,
    stdout: stdoutLines.join("\n"),
    stderr: stderrLines.join("\n"),
  };
}

async function defaultRunProfileCommand(wxid: string): Promise<RunCommandResult> {
  return executeProfileAnalysisWithCli(wxid);
}

export class ProfileJobRunner {
  private readonly jobStore: InMemoryJobStore;
  private readonly listContacts: () => Promise<WeFlowContact[]>;
  private readonly runProfileCommand: (wxid: string) => Promise<RunCommandResult>;
  private readonly runningJobs = new Map<string, Promise<void>>();

  constructor(dependencies: ProfileJobRunnerDependencies) {
    this.jobStore = dependencies.jobStore;
    this.listContacts = dependencies.listContacts;
    this.runProfileCommand =
      dependencies.runProfileCommand ?? defaultRunProfileCommand;
  }

  async createJob(wxids: string[]): Promise<ProfileJob> {
    const displayNameMap = await this.loadDisplayNameMap();
    const job = this.jobStore.createJob({
      items: wxids.map((wxid) => ({
        wxid,
        displayName: displayNameMap.get(wxid) ?? wxid,
      })),
    });

    const running = this.runJob(job.id).finally(() => {
      this.runningJobs.delete(job.id);
    });
    this.runningJobs.set(job.id, running);

    return job;
  }

  getJob(jobId: string): ProfileJob | null {
    return this.jobStore.getJob(jobId);
  }

  async waitForCompletion(jobId: string): Promise<void> {
    const running = this.runningJobs.get(jobId);

    if (!running) {
      return;
    }

    await running;
  }

  private async loadDisplayNameMap(): Promise<Map<string, string>> {
    try {
      return createDisplayNameMap(await this.listContacts());
    } catch {
      return new Map();
    }
  }

  private async runJob(jobId: string): Promise<void> {
    const job = this.jobStore.getJob(jobId);
    if (!job) {
      return;
    }

    try {
      for (const item of job.items) {
        this.jobStore.markItemRunning(jobId, item.wxid);
        const result = await this.runProfileCommand(item.wxid);
        const stdoutSnippet = summarize(result.stdout);
        const stderrSnippet = summarize(result.stderr);

        if (result.exitCode === 0) {
          this.jobStore.markItemSucceeded(jobId, item.wxid, {
            stdoutSnippet,
            stderrSnippet,
            profilePath: parseProfilePath(result.stdout),
          });
          continue;
        }

        this.jobStore.markItemFailed(jobId, item.wxid, {
          stdoutSnippet,
          stderrSnippet,
          errorMessage: stderrSnippet || stdoutSnippet || `Process exited with ${result.exitCode}`,
        });
      }

      this.jobStore.markJobCompleted(jobId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.jobStore.markJobFailed(jobId, message);
    }
  }
}
