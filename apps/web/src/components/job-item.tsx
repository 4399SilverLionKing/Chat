import type { ProfileJobItem } from "../types.js";

import { getJobItemStatusLabel } from "../utils/job-status.js";

type JobItemProps = {
  item: ProfileJobItem;
};

export function JobItem(props: JobItemProps) {
  return (
    <article className="rounded-[1.6rem] border border-stone-200 bg-stone-50/90 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-stone-900">
            {props.item.displayName}
          </h4>
          <p className="truncate font-mono text-xs text-stone-500">{props.item.wxid}</p>
        </div>
        <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
          {getJobItemStatusLabel(props.item.status)}
        </span>
      </div>

      {props.item.profilePath ? (
        <p className="mt-3 rounded-2xl bg-white px-3 py-2 font-mono text-xs text-stone-600 ring-1 ring-stone-200">
          {props.item.profilePath}
        </p>
      ) : null}

      {props.item.stdoutSnippet ? (
        <pre className="mt-3 overflow-x-auto rounded-2xl bg-stone-900 px-3 py-3 text-xs text-stone-100">
          {props.item.stdoutSnippet}
        </pre>
      ) : null}

      {props.item.stderrSnippet ? (
        <pre className="mt-3 overflow-x-auto rounded-2xl bg-rose-950 px-3 py-3 text-xs text-rose-100">
          {props.item.stderrSnippet}
        </pre>
      ) : null}
    </article>
  );
}
