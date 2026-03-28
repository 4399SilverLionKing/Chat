import { Router } from "express";

import type { ProfileJob } from "../models.js";

type ProfileJobsRouteDependencies = {
  startProfileJob: (wxids: string[]) => Promise<ProfileJob>;
  getProfileJob: (jobId: string) => ProfileJob | null;
};

function isValidWxidList(input: unknown): input is string[] {
  return (
    Array.isArray(input) &&
    input.length > 0 &&
    input.every((value) => typeof value === "string" && value.length > 0)
  );
}

export function createProfileJobsRouter(
  dependencies: ProfileJobsRouteDependencies,
): Router {
  const router = Router();

  router.post("/", async (request, response) => {
    if (!isValidWxidList(request.body?.wxids)) {
      response.status(400).json({
        error: {
          code: "INVALID_JOB_REQUEST",
          message: "wxids must be a non-empty array",
        },
      });
      return;
    }

    try {
      const job = await dependencies.startProfileJob(request.body.wxids);
      response.status(202).json(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      response.status(500).json({
        error: {
          code: "PROFILE_JOB_START_FAILED",
          message,
        },
      });
    }
  });

  router.get("/:jobId", (request, response) => {
    const job = dependencies.getProfileJob(request.params.jobId);

    if (!job) {
      response.status(404).json({
        error: {
          code: "PROFILE_JOB_NOT_FOUND",
          message: `Profile job not found: ${request.params.jobId}`,
        },
      });
      return;
    }

    response.json(job);
  });

  return router;
}
