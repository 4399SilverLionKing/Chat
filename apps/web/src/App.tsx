import { useDeferredValue, useState } from "react";

import { ContactList } from "./components/contact-list.js";
import { ContactToolbar } from "./components/contact-toolbar.js";
import { JobPanel } from "./components/job-panel.js";
import { useContacts } from "./hooks/use-contacts.js";
import { useProfileJob } from "./hooks/use-profile-job.js";
import { filterContacts } from "./utils/contact-filter.js";

function App() {
  const { contacts, isLoading, error, refresh } = useContacts();
  const { job, isStarting, isPolling, error: jobError, startJob } = useProfileJob();
  const [search, setSearch] = useState("");
  const [selectedWxids, setSelectedWxids] = useState<Set<string>>(() => new Set());
  const deferredSearch = useDeferredValue(search);
  const filteredContacts = filterContacts(contacts, deferredSearch);

  function toggleSelection(wxid: string): void {
    setSelectedWxids((current) => {
      const next = new Set(current);
      if (next.has(wxid)) {
        next.delete(wxid);
      } else {
        next.add(wxid);
      }
      return next;
    });
  }

  function selectVisible(): void {
    setSelectedWxids((current) => {
      const next = new Set(current);
      for (const contact of filteredContacts) {
        next.add(contact.wxid);
      }
      return next;
    });
  }

  function clearSelection(): void {
    setSelectedWxids(new Set());
  }

  async function handleStart(): Promise<void> {
    await startJob([...selectedWxids]);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(252,211,77,0.20),transparent_30%),radial-gradient(circle_at_top_right,rgba(45,212,191,0.16),transparent_28%),linear-gradient(180deg,#fffdf8_0%,#f5efe3_100%)] px-4 py-8 text-stone-800 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(24rem,0.9fr)]">
          <section className="space-y-5">
            <ContactToolbar
              canStart={selectedWxids.size > 0 && !isStarting && !isPolling}
              isLoading={isLoading}
              onClearSelection={clearSelection}
              onRefresh={() => {
                void refresh();
              }}
              onSearchChange={setSearch}
              onSelectVisible={selectVisible}
              onStart={() => {
                void handleStart();
              }}
              search={search}
              selectedCount={selectedWxids.size}
              visibleCount={filteredContacts.length}
            />

            <ContactList
              contacts={filteredContacts}
              error={error}
              isLoading={isLoading}
              onToggle={toggleSelection}
              selectedWxids={selectedWxids}
            />
          </section>

          <JobPanel error={jobError} isPolling={isPolling} isStarting={isStarting} job={job} />
        </div>
      </div>
    </main>
  );
}

export default App;
