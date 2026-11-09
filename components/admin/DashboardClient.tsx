"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, LogOut, TriangleAlert, Link as LinkIcon, X } from "lucide-react";
import {
  Field,
  Panel,
  PanelHeader,
  Spinner,
  buttonClass,
  cx,
  inputClass,
} from "@/components/ui/primitives";
import { CopyField } from "./CopyField";
import { EventSettingsPanel } from "./EventSettingsPanel";
import { GuestTable } from "./GuestTable";
import { NAME_MAX_LENGTH } from "@/lib/validation";
import type { EventRecord, GuestSummaryRow } from "@/lib/types";

interface DashboardData {
  guests: GuestSummaryRow[];
  summary: {
    total: number;
    active: number;
    inactive: number;
    pending: number;
    attending: number;
    maybe: number;
    declined: number;
  };
}

interface RevealState {
  name: string;
  url: string;
  kind: "created" | "rotated";
}

export function DashboardClient({
  initialEvent,
  initialData,
  adminEmail,
}: {
  initialEvent: EventRecord;
  initialData: DashboardData;
  adminEmail: string | null;
}) {
  const router = useRouter();
  const [event, setEvent] = useState(initialEvent);
  const [data, setData] = useState(initialData);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [busyGuestId, setBusyGuestId] = useState<string | null>(null);
  const [reveal, setReveal] = useState<RevealState | null>(null);

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const response = await fetch("/api/admin/guests", { credentials: "same-origin" });
      const payload = (await response.json().catch(() => null)) as
        | ({ ok?: boolean; error?: string } & DashboardData)
        | null;
      if (!response.ok || !payload?.ok) {
        setListError(payload?.error ?? "Failed to load the guest list.");
      } else {
        setData({ guests: payload.guests, summary: payload.summary });
      }
    } catch {
      setListError("Network trouble. The guest list was not refreshed.");
    }
    setListLoading(false);
  }, []);

  async function addGuest(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (adding) return;
    const name = newName.trim();
    if (name.length === 0) {
      setAddError("Guest name is required.");
      return;
    }
    setAdding(true);
    setAddError(null);

    try {
      const response = await fetch("/api/admin/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; inviteUrl?: string; guest?: { name: string } }
        | null;

      if (!response.ok || !payload?.ok || !payload.inviteUrl) {
        setAddError(payload?.error ?? "Failed to add the guest.");
        setAdding(false);
        return;
      }

      setReveal({ name, url: payload.inviteUrl, kind: "created" });
      setNewName("");
      await refresh();
    } catch {
      setAddError("Network trouble — the guest was not added. The name is still in the form.");
    }
    setAdding(false);
  }

  async function rotate(guest: GuestSummaryRow) {
    // Konfirmasi eksplisit: rotasi mematikan link lama secara permanen.
    const confirmed = window.confirm(
      `Regenerate the link for "${guest.name}"?\n\n` +
        "The old link stops working IMMEDIATELY and cannot be restored. " +
        "Any existing RSVP answer is kept.\n\n" +
        "Make sure you are ready to send the new link to this guest.",
    );
    if (!confirmed) return;

    setBusyGuestId(guest.id);
    try {
      const response = await fetch(`/api/admin/guests/${guest.id}/rotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: "{}",
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; inviteUrl?: string }
        | null;
      if (!response.ok || !payload?.ok || !payload.inviteUrl) {
        setListError(payload?.error ?? "Failed to regenerate the link.");
      } else {
        setReveal({ name: guest.name, url: payload.inviteUrl, kind: "rotated" });
        await refresh();
      }
    } catch {
      setListError("Network trouble. The link was not regenerated.");
    }
    setBusyGuestId(null);
  }

  async function toggleActive(guest: GuestSummaryRow) {
    const next = !guest.is_active;
    if (next === false) {
      const confirmed = window.confirm(
        `Disable the link for "${guest.name}"?\n\n` +
          "It will be rejected both when opened and when saving an answer. " +
          "The RSVP history is kept and the link can be re-enabled later.",
      );
      if (!confirmed) return;
    }

    setBusyGuestId(guest.id);
    try {
      const response = await fetch(`/api/admin/guests/${guest.id}/active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ is_active: next }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!response.ok || !payload?.ok) {
        setListError(payload?.error ?? "Failed to change the invitation status.");
      } else {
        await refresh();
      }
    } catch {
      setListError("Network trouble. The invitation status did not change.");
    }
    setBusyGuestId(null);
  }

  async function logout() {
    await fetch("/api/admin/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: "{}",
    }).catch(() => null);
    router.replace("/admin/login");
    router.refresh();
  }

  const { summary } = data;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="label-mono text-violet-neon">birthday://protocol · dashboard</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {event.title}
          </h1>
          {adminEmail ? <p className="label-mono mt-1 normal-case">{adminEmail}</p> : null}
        </div>
        <button type="button" onClick={logout} className={buttonClass("ghost")}>
          <LogOut className="size-4" aria-hidden="true" /> Sign out
        </button>
      </header>

      {/* --- Ringkasan status ------------------------------------------- */}
      <section aria-label="Status summary" className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Total guests" value={summary.total} note={`${summary.active} active links`} />
        <Stat label="No answer" value={summary.pending} tone="idle" />
        <Stat label="Attending" value={summary.attending} tone="ok" />
        <Stat label="Maybe" value={summary.maybe} tone="warn" />
        <Stat label="Can't make it" value={summary.declined} tone="bad" />
        <Stat label="Disabled links" value={summary.inactive} tone="idle" />
      </section>

      <div className="mt-6 flex flex-col gap-5 sm:gap-6">
        {/* --- Tambah tamu --------------------------------------------- */}
        <Panel>
          <PanelHeader icon={<UserPlus className="size-4" />} title="guest.create" />
          <form onSubmit={addGuest} className="px-4 py-5 sm:px-5" noValidate>
            <fieldset disabled={adding} className="contents">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="grow">
                  <Field
                    id="new-guest-name"
                    label="Guest name"
                    hint={`1–${NAME_MAX_LENGTH} characters. The same name may be used for different people.`}
                    error={addError}
                    required
                  >
                    <input
                      id="new-guest-name"
                      value={newName}
                      onChange={(e) => {
                        setNewName(e.target.value);
                        setAddError(null);
                      }}
                      maxLength={NAME_MAX_LENGTH}
                      required
                      placeholder="Guest full name"
                      className={inputClass}
                    />
                  </Field>
                </div>
                <button
                  type="submit"
                  disabled={adding}
                  className={buttonClass("primary", "shrink-0 sm:mt-6")}
                >
                  {adding ? (
                    <>
                      <Spinner /> Creating…
                    </>
                  ) : (
                    <>
                      <UserPlus className="size-4" aria-hidden="true" /> Create invitation
                    </>
                  )}
                </button>
              </div>
            </fieldset>
          </form>
        </Panel>

        {/* --- Link reveal (sekali saja) -------------------------------- */}
        {reveal ? (
          <Panel className="border-cyan-neon/45">
            <div className="flex items-center gap-3 border-b border-edge px-4 py-3 sm:px-5">
              <LinkIcon className="size-4 shrink-0 text-cyan-neon" aria-hidden="true" />
              <h2 className="font-mono text-[0.8125rem] text-ink">
                {reveal.kind === "created" ? "new invitation link" : "replacement link"}
              </h2>
              <button
                type="button"
                onClick={() => setReveal(null)}
                aria-label="Close link panel"
                className="tap ml-auto grid place-items-center text-ink-faint hover:text-ink"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="px-4 py-4 sm:px-5">
              <p className="text-[0.875rem] text-ink">
                For <span className="font-medium">{reveal.name}</span>
              </p>
              <p className="mt-2 flex items-start gap-2 rounded-lg border border-warn/35 bg-warn/8 px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-warn">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  Copy it now. The server stores only its hash, so this link CANNOT be shown
                  again once this panel is closed — the only way is to regenerate it, which kills
                  this one.
                </span>
              </p>
              <div className="mt-3">
                <CopyField
                  value={reveal.url}
                  whatsappText={`${event.title} invitation for ${reveal.name}:`}
                />
              </div>
            </div>
          </Panel>
        ) : null}

        <GuestTable
          guests={data.guests}
          timezone={event.timezone}
          loading={listLoading}
          error={listError}
          busyGuestId={busyGuestId}
          onRefresh={refresh}
          onRotate={rotate}
          onToggleActive={toggleActive}
        />

        <EventSettingsPanel event={event} onSaved={setEvent} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  tone = "info",
}: {
  label: string;
  value: number;
  note?: string;
  tone?: "info" | "ok" | "warn" | "bad" | "idle";
}) {
  const tones: Record<typeof tone, string> = {
    info: "text-cyan-neon",
    ok: "text-ok",
    warn: "text-warn",
    bad: "text-bad",
    idle: "text-ink-muted",
  };
  return (
    <div className="panel px-3.5 py-3.5">
      <p className="label-mono">{label}</p>
      <p className={cx("mt-1 text-2xl font-semibold tabular-nums", tones[tone])}>{value}</p>
      {note ? <p className="label-mono mt-0.5 normal-case">{note}</p> : null}
    </div>
  );
}
