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
    "birthday://protocol — guest terminal (optional)",
    'Type "help" then Enter. You can RSVP without using this terminal.',
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
        <span className="font-mono text-[0.8125rem] text-ink">Terminal (optional)</span>
        <span className="label-mono ml-auto hidden sm:inline">not required to RSVP</span>
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
              <p className="text-ink-faint">(empty)</p>
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
              Terminal command
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
        "Available commands:",
        "  help     — show this list",
        "  whoami   — the guest name on this invitation",
        "  mission  — event summary",
        "  clear    — clear the screen",
      ];
    case "whoami":
      return [context.guestName, "admits: 1 person (no +1)"];
    case "mission":
      return [
        `event  : ${context.eventTitle}`,
        `rsvp   : ${
          context.status === "attending"
            ? "Attending"
            : context.status === "maybe"
              ? "Maybe"
              : context.status === "declined"
                ? "Can\'t make it"
                : "not answered yet"
        }`,
        "note   : full details are on the event card above.",
      ];
    default:
      return [
        `unknown command: ${command}`,
        'try "help". this terminal is decorative and runs nothing on the server.',
      ];
  }
}
