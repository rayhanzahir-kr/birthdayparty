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
      setFieldError("Tanggal acara tidak bisa dibaca. Periksa kembali isinya.");
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
        setNotice({ tone: "bad", text: payload?.error ?? "Gagal menyimpan pengaturan." });
        setSaving(false);
        return;
      }

      onSaved(payload.event);
      setNotice({ tone: "ok", text: "Pengaturan acara tersimpan dan sudah terlihat di undangan." });
    } catch {
      setNotice({
        tone: "bad",
        text: "Jaringan bermasalah dan pengaturan belum tersimpan. Isianmu masih ada.",
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
            <Field id="ev-title" label="Judul acara" required>
              <input
                id="ev-title"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                maxLength={120}
                required
                className={inputClass}
              />
            </Field>
            <Field id="ev-host" label="Nama penyelenggara" required>
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
            label="Zona waktu acara (IANA)"
            hint="Contoh: Europe/Berlin, Asia/Jakarta. Semua tanggal di bawah dibaca pada zona ini."
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
              label="Tanggal & jam mulai"
              hint={`Dibaca pada zona ${form.timezone}. Kosongkan bila belum ditentukan.`}
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
              label="Batas RSVP"
              hint={`Dibaca pada zona ${form.timezone}. Tidak boleh sesudah waktu mulai acara.`}
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
            <Field id="ev-loc" label="Nama lokasi" required>
              <input
                id="ev-loc"
                value={form.location_name}
                onChange={(e) => update("location_name", e.target.value)}
                maxLength={200}
                required
                className={inputClass}
              />
            </Field>
            <Field id="ev-locurl" label="URL peta (opsional)" hint="Harus http:// atau https://">
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

          <Field id="ev-desc" label="Deskripsi" hint={`${form.description.length}/1200 karakter`}>
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
                <Spinner /> Menyimpan…
              </>
            ) : (
              <>
                <Save className="size-4" aria-hidden="true" /> Simpan pengaturan
              </>
            )}
          </button>
        </fieldset>
      </form>
    </Panel>
  );
}
