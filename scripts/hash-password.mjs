#!/usr/bin/env node
/**
 * Set up INVITE_PASSWORD_HASH.
 *
 * Input is read HIDDEN from the TTY (no echo), or from stdin when piped.
 * The password is NEVER accepted as a shell argument — arguments are stored in
 * shell history and visible in the process list.
 *
 * Usage:
 *   npm run hash-password                  # hidden prompt
 *   printf 'DD.MM.YYYY' | npm run hash-password --silent
 *
 * Only the HASH is printed, never the password.
 */
import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import process from "node:process";

const PLAIN = /^(\d{2})(\d{2})(\d{4})$/;
const DOT = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const DASH = /^(\d{2})-(\d{2})-(\d{4})$/;

/** Must stay identical to canonicalizeInvitePassword() in lib/password-format.ts. */
function canonicalize(raw) {
  if (typeof raw !== "string" || raw.length > 32) return null;
  const trimmed = raw.trim();
  const match = PLAIN.exec(trimmed) ?? DOT.exec(trimmed) ?? DASH.exec(trimmed);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) return null;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}

function readFromStdinPipe() {
  return new Promise((resolve) => {
    let buffer = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      buffer += chunk;
    });
    process.stdin.on("end", () => resolve(buffer));
  });
}

/** Prompt without echo: typed characters do not appear on screen. */
function readHiddenFromTty(promptText) {
  return new Promise((resolve, reject) => {
    const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: true });
    process.stderr.write(promptText);

    const onData = (char) => {
      const text = char.toString("utf8");
      if (text === "\u0003") {
        cleanup();
        reject(new Error("cancelled"));
      }
    };

    function cleanup() {
      process.stdin.removeListener("data", onData);
      if (typeof process.stdin.setRawMode === "function") process.stdin.setRawMode(false);
      rl.close();
    }

    // Disable terminal echo while input is being read.
    rl.output.write = () => true;
    process.stdin.on("data", onData);

    rl.question("", (answer) => {
      cleanup();
      process.stderr.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  if (process.argv.length > 2) {
    process.stderr.write(
      "This script does not accept the password as an argument (arguments leak into\n" +
        "shell history and the process list). Run it with no arguments, or pipe via stdin.\n",
    );
    process.exit(2);
  }

  const raw = process.stdin.isTTY
    ? await readHiddenFromTty("Enter the birthday (DDMMYYYY): ")
    : await readFromStdinPipe();

  const canonical = canonicalize(raw);
  if (canonical === null) {
    process.stderr.write(
      "\nFormat not accepted.\n" +
        "Use two-digit day, two-digit month, four-digit year, with no separator or\n" +
        "with dot OR hyphen used consistently. Shape: DDMMYYYY / DD.MM.YYYY.\n" +
        "Mixed separators and dates that do not exist are rejected.\n",
    );
    process.exit(1);
  }

  const hash = createHash("sha256").update(canonical, "utf8").digest("hex");

  // stderr for explanation, stdout for the hash only -> safe to pipe.
  process.stderr.write("\nHash created. Add this line to .env.local\n");
  process.stderr.write("(and to your Vercel Environment Variables, server scope):\n\n");
  process.stdout.write(`INVITE_PASSWORD_HASH=${hash}\n`);
  process.stderr.write(
    "\nNote: the birthday value itself is never printed, never stored, and must not\n" +
      "be placed in any NEXT_PUBLIC variable.\n",
  );
}

main().catch((error) => {
  process.stderr.write(`\nFailed: ${error.message}\n`);
  process.exit(1);
});
