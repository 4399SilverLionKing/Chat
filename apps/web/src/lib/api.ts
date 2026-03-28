import type { ApiContact, ProfileJob } from "../types.js";

type ApiError = {
  error?: {
    code?: string;
    message?: string;
  };
};

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    let errorMessage = `${response.status} ${response.statusText}`;

    try {
      const payload = (await response.json()) as ApiError;
      if (payload.error?.message) {
        errorMessage = payload.error.message;
      }
    } catch {
      // Ignore parse errors and use the generic status fallback.
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

export async function fetchContacts(): Promise<ApiContact[]> {
  const payload = await requestJson<{ contacts: ApiContact[] }>("/api/contacts");
  return payload.contacts;
}

export async function createProfileJob(wxids: string[]): Promise<ProfileJob> {
  return requestJson<ProfileJob>("/api/profile-jobs", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ wxids }),
  });
}

export async function fetchProfileJob(jobId: string): Promise<ProfileJob> {
  return requestJson<ProfileJob>(`/api/profile-jobs/${jobId}`);
}
