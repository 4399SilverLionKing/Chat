import type { ProfileJobItemStatus, ProfileJobStatus } from "../types.js";

export function getJobItemStatusLabel(status: ProfileJobItemStatus): string {
  switch (status) {
    case "pending":
      return "待运行";
    case "running":
      return "运行中";
    case "succeeded":
      return "成功";
    case "failed":
      return "失败";
  }
}

export function getJobStatusLabel(status: ProfileJobStatus): string {
  switch (status) {
    case "running":
      return "运行中";
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
  }
}
