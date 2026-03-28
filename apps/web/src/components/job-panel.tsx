import type { ProfileJob } from "../types.js";

import { getJobStatusLabel } from "../utils/job-status.js";

import { JobItem } from "./job-item.js";

type JobPanelProps = {
  job: ProfileJob | null;
  error: string | null;
  isStarting: boolean;
  isPolling: boolean;
};

export function JobPanel(props: JobPanelProps) {
  return (
    <aside className="rounded-[2rem] border border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,252,245,0.96),rgba(248,244,235,0.96))] p-5 shadow-[0_24px_80px_-40px_rgba(35,25,10,0.45)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
            Batch Runner
          </p>
          <h3 className="mt-2 text-xl font-semibold text-stone-900">执行面板</h3>
        </div>
        {props.job ? (
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
            {getJobStatusLabel(props.job.status)}
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-3 text-sm text-stone-600">
        {props.isStarting ? <p className="text-amber-700">正在创建批任务...</p> : null}
        {props.isPolling ? <p className="text-emerald-700">任务运行中，页面正在轮询状态。</p> : null}
        {props.error ? (
          <p className="rounded-2xl bg-rose-50 px-3 py-2 text-rose-700">
            任务请求失败：{props.error}
          </p>
        ) : null}
      </div>

      {!props.job ? (
        <div className="mt-6 rounded-[1.6rem] border border-dashed border-stone-300 px-4 py-6 text-sm text-stone-500">
          还没有创建批任务。先勾选联系人，再点击“开始生成画像”。
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {props.job.items.map((item) => (
            <JobItem item={item} key={`${props.job?.id}-${item.wxid}`} />
          ))}
        </div>
      )}
    </aside>
  );
}
