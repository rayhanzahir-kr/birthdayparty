#!/usr/bin/env node
/**
 * Setup INVITE_PASSWORD_HASH.
 *
 * Input dibaca TERSEMBUNYI dari TTY (tanpa echo), atau dari stdin bila dipipa.
 * Nilai password TIDAK pernah diterima sebagai argumen shell — argumen tersimpan
 * di riwayat shell dan terlihat di daftar proses.
 *
 * Pemakaian:
 *   npm run hash-password                  # prompt tersembunyi
 *   printf '10.11.2004' | npm run hash-password --silent
 *
 * Yang dicetak hanya HASH-nya, bukan password-nya.
 */
import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import process from "node:process";

const DOT = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const DASH = /^(\d{2})-(\d{2})-(\d{4})$/;

/** Harus identik dengan canonicalizeInvitePassword() di lib/password.ts. */
function canonicalize(raw) {
  if (typeof raw !== "string" || raw.length > 32) return null;
  const trimmed = raw.trim();
  const match = DOT.exec(trimmed) ?? DASH.exec(trimmed);
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

/** Prompt tanpa echo: karakter yang diketik tidak muncul di layar. */
function readHiddenFromTty(promptText) {
  return new Promise((resolve, reject) => {
    const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: true });
    process.stderr.write(promptText);

    const onData = (char) => {
      const text = char.toString("utf8");
      if (text === "\u0003") {
        cleanup();
        reject(new Error("dibatalkan"));
      }
    };

    function cleanup() {
      process.stdin.removeListener("data", onData);
      if (typeof process.stdin.setRawMode === "function") process.stdin.setRawMode(false);
      rl.close();
    }

    // Menonaktifkan echo terminal selama input berjalan.
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
      "Skrip ini tidak menerima password sebagai argumen (argumen bocor ke riwayat shell\n" +
        "dan daftar proses). Jalankan tanpa argumen, atau pipe lewat stdin.\n",
    );
    process.exit(2);
  }

  const raw = process.stdin.isTTY
    ? await readHiddenFromTty("Masukkan tanggal lahir (DD.MM.YYYY atau DD-MM-YYYY): ")
    : await readFromStdinPipe();

  const canonical = canonicalize(raw);
  if (canonical === null) {
    process.stderr.write(
      "\nFormat tidak diterima.\n" +
        "Gunakan dua digit hari, dua digit bulan, empat digit tahun, dengan separator\n" +
        "titik ATAU tanda hubung secara konsisten. Contoh bentuk: DD.MM.YYYY / DD-MM-YYYY.\n" +
        "Separator campuran dan tanggal yang tidak ada di kalender ditolak.\n",
    );
    process.exit(1);
  }

  const hash = createHash("sha256").update(canonical, "utf8").digest("hex");

  // stderr untuk penjelasan, stdout untuk hash saja -> aman untuk dipipa.
  process.stderr.write("\nHash berhasil dibuat. Tambahkan baris ini ke .env.local\n");
  process.stderr.write("(dan ke Environment Variables Vercel, scope server):\n\n");
  process.stdout.write(`INVITE_PASSWORD_HASH=${hash}\n`);
  process.stderr.write(
    "\nCatatan: nilai tanggal lahirnya sendiri tidak dicetak, tidak disimpan, dan\n" +
      "tidak boleh diletakkan di variabel NEXT_PUBLIC apa pun.\n",
  );
}

main().catch((error) => {
  process.stderr.write(`\nGagal: ${error.message}\n`);
  process.exit(1);
});
