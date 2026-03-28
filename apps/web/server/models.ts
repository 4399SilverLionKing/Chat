export type ApiContact = {
  wxid: string;
  wechatId: string | null;
  displayName: string;
  remark: string;
  nickname: string;
  avatarUrl: string;
};

export type ContactsResponse = {
  contacts: ApiContact[];
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

export type ProfileJobStatus = "running" | "completed" | "failed";

export type ProfileJobItemStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed";

export type ProfileJobItem = {
  wxid: string;
  displayName: string;
  status: ProfileJobItemStatus;
  startedAt: string | null;
  finishedAt: string | null;
  stdoutSnippet: string;
  stderrSnippet: string;
  profilePath: string | null;
  errorMessage: string | null;
};

export type ProfileJob = {
  id: string;
  status: ProfileJobStatus;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  items: ProfileJobItem[];
};
