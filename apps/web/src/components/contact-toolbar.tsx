type ContactToolbarProps = {
  search: string;
  selectedCount: number;
  visibleCount: number;
  isLoading: boolean;
  canStart: boolean;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onSelectVisible: () => void;
  onClearSelection: () => void;
  onStart: () => void;
};

export function ContactToolbar(props: ContactToolbarProps) {
  return (
    <div className="rounded-[2rem] border border-stone-200/80 bg-white/90 p-5 shadow-[0_24px_80px_-36px_rgba(35,25,10,0.35)] backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
            Contact Picker
          </p>
          <p className="text-sm text-stone-600">
            筛选结果 {props.visibleCount} 人，已选择 {props.selectedCount} 人
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <button className="tool-button tool-button-muted" onClick={props.onRefresh} type="button">
            {props.isLoading ? "刷新中..." : "刷新联系人"}
          </button>
          <button className="tool-button tool-button-muted" onClick={props.onSelectVisible} type="button">
            全选当前筛选结果
          </button>
          <button className="tool-button tool-button-muted" onClick={props.onClearSelection} type="button">
            清空选择
          </button>
          <button
            className="tool-button tool-button-primary"
            disabled={!props.canStart}
            onClick={props.onStart}
            type="button"
          >
            开始生成画像
          </button>
        </div>
      </div>

      <label className="mt-5 block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
          Search
        </span>
        <input
          className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-amber-500 focus:bg-white"
          onChange={(event) => props.onSearchChange(event.target.value)}
          placeholder="搜索 displayName / remark / nickname / wechatId / wxid"
          value={props.search}
        />
      </label>
    </div>
  );
}
