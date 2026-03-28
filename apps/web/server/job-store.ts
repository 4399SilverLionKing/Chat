import { randomUUID } from "node:crypto";

import type { ProfileJob, ProfileJobItem } from "./models.js";

type CreateJobOptions = {
  items: Array<Pick<ProfileJobItem, "wxid" | "displayName">>;
};

export class InMemoryJobStore {
  private readonly jobs = new Map<string, ProfileJob>();

  createJob(options: CreateJobOptions): ProfileJob {
    const timestamp = new Date().toISOString();
    const job: ProfileJob = {
      id: randomUUID(),
      status: "running",
      createdAt: timestamp,
      startedAt: timestamp,
      finishedAt: null,
      items: options.items.map((item) => ({
        wxid: item.wxid,
        displayName: item.displayName,
        status: "pending",
        startedAt: null,
        finishedAt: null,
        stdoutSnippet: "",
        stderrSnippet: "",
        profilePath: null,
        errorMessage: null,
      })),
    };

    this.jobs.set(job.id, job);

    return structuredClone(job);
  }

  getJob(jobId: string): ProfileJob | null {
    const job = this.jobs.get(jobId);
    return job ? structuredClone(job) : null;
  }

  markItemRunning(jobId: string, wxid: string): void {
    const item = this.getItem(jobId, wxid);
    item.status = "running";
    item.startedAt = new Date().toISOString();
  }

  markItemSucceeded(
    jobId: string,
    wxid: string,
    result: { stdoutSnippet: string; stderrSnippet: string; profilePath: string | null },
  ): void {
    const item = this.getItem(jobId, wxid);
    item.status = "succeeded";
    item.finishedAt = new Date().toISOString();
    item.stdoutSnippet = result.stdoutSnippet;
    item.stderrSnippet = result.stderrSnippet;
    item.profilePath = result.profilePath;
    item.errorMessage = null;
  }

  markItemFailed(
    jobId: string,
    wxid: string,
    result: { stdoutSnippet: string; stderrSnippet: string; errorMessage: string },
  ): void {
    const item = this.getItem(jobId, wxid);
    item.status = "failed";
    item.finishedAt = new Date().toISOString();
    item.stdoutSnippet = result.stdoutSnippet;
    item.stderrSnippet = result.stderrSnippet;
    item.errorMessage = result.errorMessage;
  }

  markJobCompleted(jobId: string): void {
    const job = this.getRequiredJob(jobId);
    job.status = "completed";
    job.finishedAt = new Date().toISOString();
  }

  markJobFailed(jobId: string, errorMessage: string): void {
    const job = this.getRequiredJob(jobId);
    job.status = "failed";
    job.finishedAt = new Date().toISOString();

    for (const item of job.items) {
      if (item.status === "pending" || item.status === "running") {
        item.status = "failed";
        item.finishedAt = new Date().toISOString();
        item.errorMessage = errorMessage;
      }
    }
  }

  private getItem(jobId: string, wxid: string): ProfileJobItem {
    const job = this.getRequiredJob(jobId);
    const item = job.items.find((candidate) => candidate.wxid === wxid);

    if (!item) {
      throw new Error(`Job item not found: ${jobId}/${wxid}`);
    }

    return item;
  }

  private getRequiredJob(jobId: string): ProfileJob {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return job;
  }
}
