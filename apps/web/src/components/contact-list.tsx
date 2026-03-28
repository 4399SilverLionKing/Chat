import type { ApiContact } from "../types.js";

import { ContactRow } from "./contact-row.js";

type ContactListProps = {
  contacts: ApiContact[];
  isLoading: boolean;
  error: string | null;
  selectedWxids: Set<string>;
  onToggle: (wxid: string) => void;
};

export function ContactList(props: ContactListProps) {
  if (props.isLoading) {
    return (
      <div className="rounded-[2rem] border border-stone-200/80 bg-white/85 p-6 text-sm text-stone-500 shadow-[0_20px_60px_-40px_rgba(31,23,12,0.45)]">
        正在加载联系人列表...
      </div>
    );
  }

  if (props.error) {
    return (
      <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
        联系人加载失败：{props.error}
      </div>
    );
  }

  if (props.contacts.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white/75 p-8 text-sm text-stone-500">
        当前没有匹配到联系人，调整搜索词后再试。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {props.contacts.map((contact) => (
        <ContactRow
          checked={props.selectedWxids.has(contact.wxid)}
          contact={contact}
          key={contact.wxid}
          onToggle={props.onToggle}
        />
      ))}
    </div>
  );
}
