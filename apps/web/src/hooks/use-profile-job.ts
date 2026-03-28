import { useEffect, useEffectEvent, useState } from "react";

import { createProfileJob, fetchProfileJob } from "../lib/api.js";
import type { ProfileJob } from "../types.js";

export function useProfileJob() {
  const [job, setJob] = useState<ProfileJob | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollJob = useEffectEvent(async () => {
    if (!activeJobId) {
      return;
    }

    try {
      const nextJob = await fetchProfileJob(activeJobId);
      setJob(nextJob);
      if (nextJob.status !== "running") {
        setActiveJobId(null);
      }
    } catch (pollError) {
      setError(pollError instanceof Error ? pollError.message : String(pollError));
      setActiveJobId(null);
    }
  });

  useEffect(() => {
    if (!activeJobId) {
      return;
    }

    void pollJob();
    const timer = window.setInterval(() => {
      void pollJob();
    }, 1500);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeJobId, pollJob]);

  async function startJob(wxids: string[]): Promise<void> {
    setIsStarting(true);
    setError(null);

    try {
      const nextJob = await createProfileJob(wxids);
      setJob(nextJob);
      setActiveJobId(nextJob.status === "running" ? nextJob.id : null);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : String(startError));
    } finally {
      setIsStarting(false);
    }
  }

  return {
    job,
    isStarting,
    isPolling: activeJobId !== null,
    error,
    startJob,
  };
}
