"use client";

import { useRef, useState } from "react";
import { TerminalSquare, ChevronDown } from "lucide-react";
import { cx, inputClass } from "@/components/ui/primitives";
import type { RsvpStatus } from "@/lib/types";

interface TerminalPanelProps {
  guestName: string;
  eventTitle: string;
  status: RsvpStatus | null;
}

/**
 * Terminal opsional, tertutup secara default.
 *
 * Batasan yang dijaga (PRD §4.4):
 *   * Hanya perintah lokal yang sudah ditentukan: help, whoami, mission, clear.
 *   * TIDAK mengevaluasi JavaScript dari input, tidak menjalankan shell, dan
 *     tidak punya operasi admin maupun akses jaringan.
 *   * Seluruh tindakan utama (RSVP) tetap tersedia lewat tombol biasa, jadi
 *     terminal ini murni hiasan yang aman.
 */
export function TerminalPanel({ guestName, eventTitle, status }: TerminalPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<string[]>([
    "birthday://protocol — terminal tamu (opsional)",
    'Ketik "help" lalu Enter. RSVP tetap bisa dilakukan tanpa terminal.',
  ]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  function run(rawCommand: string) {
    const command = rawCommand.trim().toLowerCase();
    if (command.length === 0) return;

    if (command === "clear") {
      setLines([]);
      return;
    }

    const output = resolve(command, { guestName, eventTitle, status });
    setLines((previous) => [...previous, `$ ${rawCommand.trim()}`, ...output].slice(-60));
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }

  return (
    <div className="panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="guest-terminal"
        className="tap flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-panel-2/60 sm:px-5"
      >
        <TerminalSquare className="size-4 shrink-0 text-cyan-neon" aria-hidden="true" />
        <span className="font-mono text-[0.8125rem] text-ink">Terminal (opsional)</span>
        <span className="label-mono ml-auto hidden sm:inline">tidak wajib untuk RSVP</span>
        <ChevronDown
          className={cx("size-4 shrink-0 text-ink-faint transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      <div id="guest-terminal" hidden={!open}>
        <div className="border-t border-edge px-4 py-4 sm:px-5">
          <div
            ref={scrollRef}
            className="max-h-56 overflow-y-auto rounded-lg border border-edge-bright bg-void px-3.5 py-3 font-mono text-[0.75rem] leading-relaxed"
            aria-live="polite"
          >
            {lines.length === 0 ? (
              <p className="text-ink-faint">(kosong)</p>
            ) : (
              lines.map((line, index) => (
                <p
                  key={`${index}-${line}`}
                  className={cx("break-words", line.startsWith("$ ") ? "text-cyan-neon" : "text-ink-muted")}
                >
                  {line}
                </p>
              ))
            )}
          </div>

          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              run(input);
              setInput("");
            }}
          >
            <label htmlFor="terminal-input" className="sr-only">
              Perintah terminal
            </label>
            <span aria-hidden="true" className="caret grid place-items-center font-mono text-violet-neon">
              $
            </span>
            <input
              id="terminal-input"
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, 40))}
              autoComplete="off"
              spellCheck={false}
              placeholder="help"
              className={cx(inputClass, "font-mono text-[0.8125rem]")}
            />
            <button
              type="submit"
              className="tap rounded-lg border border-edge-bright px-3.5 font-mono text-[0.75rem] text-ink-muted hover:border-cyan-neon hover:text-cyan-neon"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/** Dispatcher allowlist. Perintah tak dikenal hanya memberi pesan ramah. */
function resolve(
  command: string,
  context: { guestName: string; eventTitle: string; status: RsvpStatus | null },
): string[] {
  switch (command) {
    case "help":
      return [
        "Perintah yang tersedia:",
        "  help     — tampilkan daftar ini",
        "  whoami   — nama tamu pada undangan ini",
        "  mission  — ringkasan acara",
        "  clear    — bersihkan layar",
      ];
    case "whoami":
      return [context.guestName, "kapasitas: 1 orang (tanpa +1)"];
    case "mission":
      return [
        `acara  : ${context.eventTitle}`,
        `rsvp   : ${
          context.status === "attending"
            ? "Hadir"
            : context.status === "maybe"
              ? "Belum pasti"
              : context.status === "declined"
                ? "Tidak hadir"
                : "belum dijawab"
        }`,
        "catatan: detail lengkap ada di kartu acara di atas.",
      ];
    default:
      return [
        `perintah tidak dikenal: ${command}`,
        'coba "help". terminal ini hanya hiasan dan tidak menjalankan apa pun di server.',
      ];
  }
}
