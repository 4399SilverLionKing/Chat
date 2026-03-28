import express from "express";
import type { Express } from "express";

import type { WeFlowContact } from "@chat-tools/shared";

import { createWeFlowClient } from "./config.js";
import { InMemoryJobStore } from "./job-store.js";
import type { ProfileJob } from "./models.js";
import { ProfileJobRunner } from "./profile-job-runner.js";
import { createContactsRouter } from "./routes/contacts.js";
import { createHealthRouter } from "./routes/health.js";
import { createProfileJobsRouter } from "./routes/profile-jobs.js";

export type AppDependencies = {
  listContacts?: () => Promise<WeFlowContact[]>;
  startProfileJob?: (wxids: string[]) => Promise<ProfileJob>;
  getProfileJob?: (jobId: string) => ProfileJob | null;
};

const defaultJobStore = new InMemoryJobStore();

async function defaultListContacts(): Promise<WeFlowContact[]> {
  const client = await createWeFlowClient();
  return client.listContacts();
}

const defaultJobRunner = new ProfileJobRunner({
  jobStore: defaultJobStore,
  listContacts: defaultListContacts,
});

export function createApp(dependencies: AppDependencies = {}): Express {
  const app = express();

  app.use(express.json());
  app.use("/api/health", createHealthRouter());
  app.use(
    "/api/contacts",
    createContactsRouter({
      listContacts: dependencies.listContacts ?? defaultListContacts,
    }),
  );
  app.use(
    "/api/profile-jobs",
    createProfileJobsRouter({
      startProfileJob: dependencies.startProfileJob ?? ((wxids) => defaultJobRunner.createJob(wxids)),
      getProfileJob: dependencies.getProfileJob ?? ((jobId) => defaultJobRunner.getJob(jobId)),
    }),
  );

  return app;
}
