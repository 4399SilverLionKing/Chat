import { describe, expect, it } from "vitest";

import {
  getJobItemStatusLabel,
  getJobStatusLabel,
} from "./job-status.js";

describe("job status labels", () => {
  it("maps item status labels to Chinese copy", () => {
    expect(getJobItemStatusLabel("pending")).toBe("待运行");
    expect(getJobItemStatusLabel("running")).toBe("运行中");
    expect(getJobItemStatusLabel("succeeded")).toBe("成功");
    expect(getJobItemStatusLabel("failed")).toBe("失败");
  });

  it("maps job status labels to Chinese copy", () => {
    expect(getJobStatusLabel("running")).toBe("运行中");
    expect(getJobStatusLabel("completed")).toBe("已完成");
    expect(getJobStatusLabel("failed")).toBe("失败");
  });
});
