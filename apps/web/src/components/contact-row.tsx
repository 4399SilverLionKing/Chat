import type { ApiContact } from "../types.js";

type ContactRowProps = {
  contact: ApiContact;
  checked: boolean;
  onToggle: (wxid: string) => void;
};

export function ContactRow(props: ContactRowProps) {
  const meta = [props.contact.remark, props.contact.nickname]
    .filter((value) => value.trim().length > 0)
    .join(" / ");

  return (
    <label className="flex cursor-pointer items-start gap-4 rounded-[1.5rem] border border-stone-200 bg-white/90 px-4 py-4 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_16px_40px_-28px_rgba(45,30,11,0.45)]">
      <input
        checked={props.checked}
        className="mt-1 h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-amber-600"
        onChange={() => props.onToggle(props.contact.wxid)}
        type="checkbox"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-stone-900">
              {props.contact.displayName}
            </div>
            <div className="truncate text-sm text-stone-500">
              {meta || "无备注 / 昵称补充"}
            </div>
          </div>
          <div className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            {props.checked ? "Selected" : "Available"}
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
          <div className="rounded-2xl bg-stone-50 px-3 py-2">
            <span className="mr-2 text-xs uppercase tracking-[0.18em] text-stone-400">
              WeChat
            </span>
            <span>{props.contact.wechatId || "未设置"}</span>
          </div>
          <div className="rounded-2xl bg-stone-50 px-3 py-2">
            <span className="mr-2 text-xs uppercase tracking-[0.18em] text-stone-400">
              WXID
            </span>
            <span className="font-mono text-[13px]">{props.contact.wxid}</span>
          </div>
        </div>
      </div>
    </label>
  );
}
