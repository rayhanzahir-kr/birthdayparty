"use client";

import { useState } from "react";
import { Settings2, Save } from "lucide-react";
import {
  Field,
  Panel,
  PanelHeader,
  Spinner,
  buttonClass,
  cx,
  inputClass,
} from "@/components/ui/primitives";
import { isoToZonedLocalInput, zonedLocalInputToIso } from "@/lib/datetime";
import type { EventRecord } from "@/lib/types";

/**
 * Event settings.
 *
 * Input tanggal memakai `datetime-local` yang ditafsirkan pada ZONA WAKTU ACARA,
 * bukan zona waktu browser — konversi dilakukan oleh zonedLocalInputToIso.
 * Teks bantuan menyebut zona waktu yang sedang berlaku agar tidak ambigu.
 */
export function EventSettingsPanel({
  event,
  onSaved,
}: {
  event: EventRecord;
  onSaved: (updated: EventRecord) => void;
}) {
  const [form, setForm] = useState({
    title: event.title,
    host_name: event.host_name,
    timezone: event.timezone,
    location_name: event.location_name,
    location_url: event.location_url ?? "",
    dress_code: event.dress_code,
    description: event.description,
    event_date_local: isoToZonedLocalInput(event.event_date, event.timezone),
    rsvp_deadline_local: isoToZonedLocalInput(event.rsvp_deadline, event.timezone),
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setNotice(null);
    setFieldError(null);
  }

  async function handleSubmit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (saving) return;
    setSaving(true);
    setNotice(null);
    setFieldError(null);

    const eventDateIso = form.event_date_local
      ? zonedLocalInputToIso(form.event_date_local, form.timezone)
      : null;
    const deadlineIso = form.rsvp_deadline_local
      ? zonedLocalInputToIso(form.rsvp_deadline_local, form.timezone)
      : null;

    if (form.event_date_local && !eventDateIso) {
      setSaving(false);
      setFieldError("Could not read the event date. Please check the value.");
      return;
    }

    try {
      const response = await fetch("/api/admin/event", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          title: form.title,
          host_name: form.host_name,
          timezone: form.timezone,
          location_name: form.location_name,
          location_url: form.location_url,
          dress_code: form.dress_code,
          description: form.description,
          event_date: eventDateIso ?? "",
          rsvp_deadline: deadlineIso ?? "",
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; event?: EventRecord }
        | null;

      if (!response.ok || !payload?.ok || !payload.event) {
        setNotice({ tone: "bad", text: payload?.error ?? "Failed to save settings." });
        setSaving(false);
        return;
      }

      onSaved(payload.event);
      setNotice({ tone: "ok", text: "Event settings saved and now visible on invitations." });
    } catch {
      setNotice({
        tone: "bad",
        text: "Network trouble — settings were not saved. Your input is still here.",
      });
    }
    setSaving(false);
  }

  return (
    <Panel>
      <PanelHeader icon={<Settings2 className="size-4" />} title="event.settings" />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-5 sm:px-5" noValidate>
        <fieldset disabled={saving} className="contents">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ev-title" label="Event title" required>
              <input
                id="ev-title"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                maxLength={120}
                required
                className={inputClass}
              />
            </Field>
            <Field id="ev-host" label="Host name" required>
              <input
                id="ev-host"
                value={form.host_name}
                onChange={(e) => update("host_name", e.target.value)}
                maxLength={120}
                required
                className={inputClass}
              />
            </Field>
          </div>

          <Field
            id="ev-tz"
            label="Event time zone (IANA)"
            hint="Example: Europe/Berlin, Asia/Jakarta. All dates below are read in this zone."
            required
          >
            <input
              id="ev-tz"
              value={form.timezone}
              onChange={(e) => update("timezone", e.target.value.trim())}
              maxLength={64}
              required
              className={cx(inputClass, "font-mono text-[0.8125rem]")}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="ev-date"
              label="Start date & time"
              hint={`Read in the ${form.timezone} zone. Leave empty if not decided yet.`}
              error={fieldError}
            >
              <input
                id="ev-date"
                type="datetime-local"
                value={form.event_date_local}
                onChange={(e) => update("event_date_local", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field
              id="ev-deadline"
              label="RSVP deadline"
              hint={`Read in the ${form.timezone} zone. Cannot be after the event start time.`}
            >
              <input
                id="ev-deadline"
                type="datetime-local"
                value={form.rsvp_deadline_local}
                onChange={(e) => update("rsvp_deadline_local", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ev-loc" label="Location name" required>
              <input
                id="ev-loc"
                value={form.location_name}
                onChange={(e) => update("location_name", e.target.value)}
                maxLength={200}
                required
                className={inputClass}
              />
            </Field>
            <Field id="ev-locurl" label="Map URL (optional)" hint="Must be http:// or https://">
              <input
                id="ev-locurl"
                type="url"
                value={form.location_url}
                onChange={(e) => update("location_url", e.target.value)}
                maxLength={2000}
                placeholder="https://maps.example.com/…"
                className={inputClass}
              />
            </Field>
          </div>

          <Field id="ev-dress" label="Dress code" required>
            <input
              id="ev-dress"
              value={form.dress_code}
              onChange={(e) => update("dress_code", e.target.value)}
              maxLength={120}
              required
              className={inputClass}
            />
          </Field>

          <Field id="ev-desc" label="Description" hint={`${form.description.length}/1200 characters`}>
            <textarea
              id="ev-desc"
              value={form.description}
              onChange={(e) => update("description", e.target.value.slice(0, 1200))}
              rows={3}
              className={cx(inputClass, "resize-y leading-relaxed")}
            />
          </Field>

          <div aria-live="polite" className="min-h-5">
            {notice ? (
              <p
                className={cx(
                  "text-[0.8125rem] leading-relaxed",
                  notice.tone === "ok" ? "text-ok" : "text-bad",
                )}
                role={notice.tone === "bad" ? "alert" : undefined}
              >
                {notice.text}
              </p>
            ) : null}
          </div>

          <button type="submit" disabled={saving} className={buttonClass("primary", "sm:self-start")}>
            {saving ? (
              <>
                <Spinner /> Saving…
              </>
            ) : (
              <>
                <Save className="size-4" aria-hidden="true" /> Save settings
              </>
            )}
          </button>
        </fieldset>
      </form>
    </Panel>
  );
}
